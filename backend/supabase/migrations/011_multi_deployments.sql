-- ============================================================
-- Multi-deployment + dependencies
-- ============================================================
-- 한 프로젝트가 여러 배포 플랫폼(Vercel 프론트 + Railway 백엔드 + DB ...)을 동시에 가질 수 있도록.
-- 각 deployment 의 role 과 의존성도 명시.
-- 기존 projects.deploy_platform/deploy_project_id 컬럼은 호환성을 위해 유지하고 backfill.
-- ============================================================

CREATE TABLE IF NOT EXISTS project_deployments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform              text NOT NULL
    CHECK (platform IN ('vercel', 'railway', 'cloudflare', 'fly', 'render', 'aws', 'gcp', 'azure', 'supabase', 'other')),
  external_project_id   text NOT NULL,   -- 플랫폼에서의 project id (vercel project id / railway project id 등)
  external_service_id   text,            -- railway 처럼 project 안에 여러 service 있으면 그 service id
  name                  text NOT NULL,   -- 사용자에게 보일 이름 (플랫폼에서 가져온 project name 그대로 OK)
  role                  text NOT NULL DEFAULT 'other'
    CHECK (role IN ('frontend', 'backend', 'worker', 'database', 'cache', 'queue', 'cron', 'storage', 'other')),
  -- 사용자 자유 설명 (예: "백엔드 API", "Celery 워커")
  description           text,
  external_url          text,            -- 배포된 public URL (있으면)
  health_endpoint       text,            -- /api/health 같이 monitoring 용 path
  framework             text,            -- next, nestjs, fastapi 등 (참고용)
  region                text,
  status                text NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('healthy', 'degraded', 'down', 'unknown')),
  last_checked_at       timestamptz,
  metadata              jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, platform, external_project_id, COALESCE(external_service_id, ''))
);

CREATE INDEX IF NOT EXISTS idx_project_deployments_project
  ON project_deployments(project_id, role);

-- ============================================================
-- Dependencies: 한 deployment 가 다른 deployment 에 의존
-- (예: Vercel 프론트 -> Railway 백엔드 API call)
-- ============================================================

CREATE TABLE IF NOT EXISTS deployment_dependencies (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_deployment_id  uuid NOT NULL REFERENCES project_deployments(id) ON DELETE CASCADE,
  target_deployment_id  uuid NOT NULL REFERENCES project_deployments(id) ON DELETE CASCADE,
  kind                  text NOT NULL DEFAULT 'api_call'
    CHECK (kind IN ('api_call', 'db', 'queue', 'webhook', 'storage', 'other')),
  description           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_deployment_id, target_deployment_id, kind),
  CHECK (source_deployment_id <> target_deployment_id)
);

CREATE INDEX IF NOT EXISTS idx_deployment_deps_source
  ON deployment_dependencies(source_deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_deps_target
  ON deployment_dependencies(target_deployment_id);

-- ============================================================
-- Backfill: 기존 projects.deploy_platform/deploy_project_id 를
-- project_deployments 에 넣음. role 은 vercel 이면 frontend,
-- railway 이면 backend (대부분 패턴) 기본값.
-- ============================================================

INSERT INTO project_deployments (project_id, platform, external_project_id, name, role)
SELECT
  p.id,
  p.deploy_platform,
  p.deploy_project_id,
  COALESCE(p.name, p.deploy_project_id),
  CASE p.deploy_platform
    WHEN 'vercel' THEN 'frontend'
    WHEN 'railway' THEN 'backend'
    ELSE 'other'
  END
FROM projects p
WHERE p.deploy_platform IS NOT NULL
  AND p.deploy_platform <> ''
  AND p.deploy_project_id IS NOT NULL
  AND p.deploy_project_id <> ''
  AND NOT EXISTS (
    SELECT 1 FROM project_deployments pd
    WHERE pd.project_id = p.id
      AND pd.platform = p.deploy_platform
      AND pd.external_project_id = p.deploy_project_id
  )
ON CONFLICT DO NOTHING;
