-- ============================================================
-- Topology + environment + SLO + cascade
-- ============================================================
-- multi-deployment 모델에 다음을 더함:
--   1. project_deployments.environment       (production/staging/preview/development)
--   2. project_deployments.slo_target        ({uptime_pct, latency_p95_ms, error_rate_pct} JSON)
--   3. project_deployments.health_check_url  (직접 ping URL -- external_url + health_endpoint 가 다를 때)
--   4. deployment_logs.platform_deployment_id (FK)
--   5. alerts.topology_context               (cascade impact 정보 JSONB)
--   6. deployment_health_history             (5분마다 ping 결과 누적, SLO 계산용)
-- ============================================================

-- ----- environment + slo + health_check_url -----
ALTER TABLE project_deployments
  ADD COLUMN IF NOT EXISTS environment   text NOT NULL DEFAULT 'production'
    CHECK (environment IN ('production', 'staging', 'preview', 'development', 'other'));

ALTER TABLE project_deployments
  ADD COLUMN IF NOT EXISTS slo_target    jsonb NOT NULL DEFAULT '{}';

ALTER TABLE project_deployments
  ADD COLUMN IF NOT EXISTS health_check_url text;

-- ----- deployment_logs <-> platform_deployments FK -----
ALTER TABLE deployment_logs
  ADD COLUMN IF NOT EXISTS platform_deployment_id uuid REFERENCES project_deployments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deployment_logs_pd
  ON deployment_logs(platform_deployment_id, created_at DESC);

-- Backfill: 기존 deployment_logs 의 platform + (deployment_url 패턴) 으로 매칭
-- 가능한 한 best-effort. project_id + platform 만으로도 매칭이 가능한 케이스가 많음.
UPDATE deployment_logs dl
SET platform_deployment_id = pd.id
FROM project_deployments pd
WHERE dl.platform_deployment_id IS NULL
  AND pd.project_id = dl.project_id
  AND pd.platform = dl.platform
  -- 같은 project + 같은 platform 의 deployment 가 유일하면 그것으로
  AND (SELECT count(*) FROM project_deployments pd2
       WHERE pd2.project_id = dl.project_id AND pd2.platform = dl.platform) = 1;

-- ----- alerts.topology_context: cascade impact 자동 첨부용 -----
ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS topology_context jsonb;

-- ----- deployment_health_history (5분마다 ping 누적) -----
CREATE TABLE IF NOT EXISTS deployment_health_history (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_deployment_id   uuid NOT NULL REFERENCES project_deployments(id) ON DELETE CASCADE,
  status                   text NOT NULL
    CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  http_status              int,
  response_time_ms         int,
  error_message            text,
  -- cascade 이유: 직접 ping 이 아니라 upstream 의존성이 down 이라 degraded 로 마킹된 경우
  cascade_from             uuid REFERENCES project_deployments(id) ON DELETE SET NULL,
  checked_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dhh_pd_time
  ON deployment_health_history(platform_deployment_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS idx_dhh_status_time
  ON deployment_health_history(status, checked_at DESC)
  WHERE status <> 'healthy';

-- ============================================================
-- Helpful: deployments 통계 view
-- 최근 24시간 health history 로 uptime 계산
-- ============================================================
CREATE OR REPLACE VIEW deployment_uptime_24h AS
SELECT
  pd.id AS deployment_id,
  pd.project_id,
  pd.name,
  pd.environment,
  pd.role,
  count(*) AS total_checks,
  count(*) FILTER (WHERE dhh.status = 'healthy') AS healthy_checks,
  count(*) FILTER (WHERE dhh.status = 'down') AS down_checks,
  count(*) FILTER (WHERE dhh.status = 'degraded') AS degraded_checks,
  CASE WHEN count(*) > 0
    THEN round(100.0 * count(*) FILTER (WHERE dhh.status = 'healthy') / count(*), 2)
    ELSE NULL END AS uptime_pct,
  avg(dhh.response_time_ms) FILTER (WHERE dhh.response_time_ms IS NOT NULL) AS avg_response_ms,
  max(dhh.checked_at) AS last_checked_at
FROM project_deployments pd
LEFT JOIN deployment_health_history dhh
  ON dhh.platform_deployment_id = pd.id
  AND dhh.checked_at > now() - interval '24 hours'
GROUP BY pd.id, pd.project_id, pd.name, pd.environment, pd.role;
