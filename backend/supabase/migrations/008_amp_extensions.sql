-- Migration 008: Autonomous Marketing Platform (AMP) — Foundation
-- 기획서 docs/specs/autonomous-marketing-platform.md §4 + 부록 C/F/G/H/I 기반
-- 2026-05-16
--
-- 적용 순서:
-- 1. pgvector + pg_trgm extension
-- 2. 기존 테이블 확장 (projects, connected_accounts, promotion_posts)
-- 3. Persona & Voice
-- 4. Media Assets & Video Pipeline
-- 5. Interactions (멘션/답글)
-- 6. Automation Rules + Workflow Runs
-- 7. Safety Layer (rate limit, cost ledger, shadowban)
-- 8. Approval Queue (HITL)
-- 9. Learning (performance, insights)
-- 10. Prompt caching / Skill / Agent traces / RAG chunks / Reflexion (부록 C-I)

-- ============================================================
-- 1. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- 2. 기존 테이블 확장
-- ============================================================

-- projects: 자율성, 백엔드 토글, 예산, 페르소나 메타
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS autonomy_level text NOT NULL DEFAULT 'assisted'
    CHECK (autonomy_level IN ('manual', 'assisted', 'autonomous')),
  ADD COLUMN IF NOT EXISTS agent_backend text NOT NULL DEFAULT 'legacy'
    CHECK (agent_backend IN ('legacy', 'langgraph', 'shadow')),
  ADD COLUMN IF NOT EXISTS daily_post_budget int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS monthly_cost_budget_usd numeric(10,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS brand_palette jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS brand_voice_traits jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS target_audience text,
  ADD COLUMN IF NOT EXISTS preferred_publish_times jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS blocked_topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS required_hashtags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Asia/Seoul',
  ADD COLUMN IF NOT EXISTS primary_languages text[] NOT NULL DEFAULT ARRAY['ko', 'en'];

-- connected_accounts: 신규 플랫폼 + AI 서비스 BYOK
ALTER TABLE connected_accounts DROP CONSTRAINT IF EXISTS connected_accounts_provider_check;
ALTER TABLE connected_accounts ADD CONSTRAINT connected_accounts_provider_check
  CHECK (provider IN (
    'x', 'threads', 'instagram', 'youtube', 'tiktok',
    'linkedin', 'bluesky', 'mastodon', 'facebook',
    'github', 'vercel', 'railway',
    'fal', 'elevenlabs', 'openai', 'anthropic', 'cohere'
  ));

-- promotion_posts: LangGraph 트레이싱 + 페르소나 점수 + 임베딩
ALTER TABLE promotion_posts
  ADD COLUMN IF NOT EXISTS workflow_run_id uuid,
  ADD COLUMN IF NOT EXISTS voice_match_score numeric,
  ADD COLUMN IF NOT EXISTS embedding vector(1024),  -- Cohere embed-v4 dimension
  ADD COLUMN IF NOT EXISTS ai_metadata jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cost_usd numeric(10,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lang text;

-- promotion_posts.status: pending_approval / approved / rejected 추가
ALTER TABLE promotion_posts DROP CONSTRAINT IF EXISTS promotion_posts_status_check;
ALTER TABLE promotion_posts ADD CONSTRAINT promotion_posts_status_check
  CHECK (status IN (
    'draft', 'pending_approval', 'approved', 'rejected',
    'scheduled', 'publishing', 'published', 'failed'
  ));

-- 임베딩 인덱스 (cosine similarity)
CREATE INDEX IF NOT EXISTS idx_promotion_embedding ON promotion_posts
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 3. Persona & Voice (§부록 G + 8.1 Voice 학습)
-- ============================================================

CREATE TABLE IF NOT EXISTS personas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid UNIQUE NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  voice_profile   jsonb NOT NULL DEFAULT '{}',
  topic_clusters  jsonb NOT NULL DEFAULT '[]',
  opinion_corpus  jsonb NOT NULL DEFAULT '[]',
  forbidden_phrases text[] NOT NULL DEFAULT '{}',
  preferred_phrases text[] NOT NULL DEFAULT '{}',
  ft_model_id     text,
  ft_training_status text NOT NULL DEFAULT 'none'
    CHECK (ft_training_status IN ('none', 'pending', 'training', 'ready', 'failed')),
  last_updated_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS voice_samples (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_platform  text NOT NULL,
  source_post_id   text,
  content          text NOT NULL,
  lang             text,
  engagement_score numeric,
  embedding        vector(1024),
  used_for_training boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_voice_samples_project ON voice_samples(project_id);
CREATE INDEX IF NOT EXISTS idx_voice_samples_embedding ON voice_samples
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 4. Media Assets & Video Pipeline (§7 영상 파이프라인)
-- ============================================================

CREATE TABLE IF NOT EXISTS media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type      text NOT NULL CHECK (asset_type IN ('image', 'video', 'audio', 'gif')),
  source          text NOT NULL CHECK (source IN ('user_upload', 'screenshot', 'ai_generated', 'stock')),
  ai_model        text,
  prompt          text,
  storage_url     text NOT NULL,
  thumbnail_url   text,
  duration_seconds numeric,
  width           int,
  height          int,
  file_size_bytes bigint,
  cost_usd        numeric(10,4) NOT NULL DEFAULT 0,
  generation_metadata jsonb NOT NULL DEFAULT '{}',
  parent_id       uuid REFERENCES media_assets(id),  -- video scene → parent video
  quality_score   numeric,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_media_project ON media_assets(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS video_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  script          jsonb NOT NULL,
  narration_text  text,
  total_duration_seconds numeric,
  aspect_ratio    text NOT NULL DEFAULT '9:16',
  model           text NOT NULL DEFAULT 'kling-3.0',
  status          text NOT NULL DEFAULT 'planning'
    CHECK (status IN (
      'planning', 'queued', 'generating_scenes', 'generating_audio',
      'compositing', 'quality_check', 'ready', 'failed', 'human_review'
    )),
  progress_percent int NOT NULL DEFAULT 0,
  final_asset_id  uuid REFERENCES media_assets(id),
  total_cost_usd  numeric(10,4) NOT NULL DEFAULT 0,
  workflow_run_id uuid,
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_video_project ON video_projects(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS video_scenes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_project_id uuid NOT NULL REFERENCES video_projects(id) ON DELETE CASCADE,
  scene_index     int NOT NULL,
  description     text NOT NULL,
  duration_seconds numeric NOT NULL,
  prompt          text,
  asset_id        uuid REFERENCES media_assets(id),
  fal_request_id  text,  -- fal.ai webhook 콜백 correlation
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'generating', 'quality_check', 'ready', 'failed')),
  retry_count     int NOT NULL DEFAULT 0,
  generation_started_at timestamptz,
  generation_completed_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_project_id, scene_index)
);
CREATE INDEX IF NOT EXISTS idx_video_scenes_status ON video_scenes(status, generation_started_at)
  WHERE status IN ('generating', 'pending');

-- ============================================================
-- 5. Interactions (멘션/답글/DM) — §8
-- ============================================================

CREATE TABLE IF NOT EXISTS interactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  interaction_type text NOT NULL
    CHECK (interaction_type IN ('mention', 'reply', 'dm', 'comment', 'quote')),
  external_id     text NOT NULL,
  parent_post_id  text,
  sender_username text NOT NULL,
  sender_profile  jsonb NOT NULL DEFAULT '{}',
  content         text NOT NULL,
  raw_data        jsonb,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  classification  text,
  priority        text NOT NULL DEFAULT 'medium',
  draft_reply     text,
  reply_status    text NOT NULL DEFAULT 'pending'
    CHECK (reply_status IN ('pending', 'draft_ready', 'approved', 'sent', 'ignored', 'human_handled')),
  reply_sent_at   timestamptz,
  reply_external_id text,
  ai_metadata     jsonb NOT NULL DEFAULT '{}',
  UNIQUE(platform, external_id)
);
CREATE INDEX IF NOT EXISTS idx_interactions_project_status
  ON interactions(project_id, reply_status, detected_at DESC);

-- ============================================================
-- 6. Automation Rules + Workflow Runs (LangGraph 통합)
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            text NOT NULL,
  enabled         boolean NOT NULL DEFAULT true,
  trigger_type    text NOT NULL,
  trigger_config  jsonb NOT NULL,
  actions         jsonb NOT NULL,
  conditions      jsonb NOT NULL DEFAULT '{}',
  last_triggered_at timestamptz,
  trigger_count   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_project ON automation_rules(project_id)
  WHERE enabled = true;

CREATE TABLE IF NOT EXISTS workflow_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id         uuid REFERENCES automation_rules(id) ON DELETE SET NULL,
  graph_name      text NOT NULL,
  thread_id       text NOT NULL UNIQUE,
  status          text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'paused_awaiting_approval', 'completed', 'failed', 'cancelled')),
  current_node    text,
  state_snapshot  jsonb,
  error_message   text,
  cost_usd        numeric(10,4) NOT NULL DEFAULT 0,
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_project ON workflow_runs(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status, started_at DESC);

-- ============================================================
-- 7. Safety Layer (§10)
-- ============================================================

CREATE TABLE IF NOT EXISTS rate_limit_tracker (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  endpoint        text NOT NULL,
  window_start    timestamptz NOT NULL,
  window_end      timestamptz NOT NULL,
  current_count   int NOT NULL DEFAULT 0,
  limit_count     int NOT NULL,
  UNIQUE(project_id, platform, endpoint, window_start)
);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON rate_limit_tracker(window_end);

CREATE TABLE IF NOT EXISTS cost_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service         text NOT NULL,  -- 'gemini', 'openai', 'anthropic', 'cohere', 'fal', 'elevenlabs', 'x_api', 'r2'
  operation       text NOT NULL,
  cost_usd        numeric(10,6) NOT NULL,
  tokens_used     int,
  units_used      numeric,   -- 영상 seconds, TTS chars, embedding tokens
  related_draft_id uuid REFERENCES promotion_posts(id) ON DELETE SET NULL,
  related_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  related_video_id uuid REFERENCES video_projects(id) ON DELETE SET NULL,
  workflow_run_id uuid REFERENCES workflow_runs(id) ON DELETE SET NULL,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cost_project_date ON cost_ledger(project_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cost_service ON cost_ledger(service, occurred_at DESC);

CREATE TABLE IF NOT EXISTS shadowban_checks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform        text NOT NULL,
  checked_at      timestamptz NOT NULL DEFAULT now(),
  recent_avg_impressions numeric,
  baseline_avg_impressions numeric,
  ratio           numeric,
  is_suspicious   boolean NOT NULL DEFAULT false,
  consecutive_suspicious_days int NOT NULL DEFAULT 0,
  action_taken    text
);
CREATE INDEX IF NOT EXISTS idx_shadowban_project_time ON shadowban_checks(project_id, checked_at DESC);

-- ============================================================
-- 8. Approval Queue (Human-in-the-Loop) — §부록 I.7
-- ============================================================

CREATE TABLE IF NOT EXISTS approval_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type       text NOT NULL,  -- 'content_draft', 'interaction_reply', 'video_publish'
  item_id         uuid NOT NULL,
  workflow_run_id uuid REFERENCES workflow_runs(id) ON DELETE CASCADE,
  thread_id       text,
  priority        text NOT NULL DEFAULT 'normal',
  context         jsonb,
  ai_recommendation text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
  notified_via    text[] NOT NULL DEFAULT '{}',
  notified_at     timestamptz,
  decided_at      timestamptz,
  decided_by      uuid REFERENCES auth.users(id),
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_approval_user_status ON approval_queue(user_id, status, created_at DESC)
  WHERE status = 'pending';

-- ============================================================
-- 9. Learning (§11 + §부록 I.6)
-- ============================================================

CREATE TABLE IF NOT EXISTS content_performance (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES promotion_posts(id) ON DELETE CASCADE,
  measured_at     timestamptz NOT NULL,
  hours_since_publish int NOT NULL,
  impressions     int NOT NULL DEFAULT 0,
  likes           int NOT NULL DEFAULT 0,
  replies         int NOT NULL DEFAULT 0,
  shares          int NOT NULL DEFAULT 0,
  saves           int NOT NULL DEFAULT 0,
  link_clicks     int NOT NULL DEFAULT 0,
  profile_visits  int NOT NULL DEFAULT 0,
  watch_time_sec  numeric,
  completion_rate numeric,
  engagement_rate numeric,
  raw_data        jsonb
);
CREATE INDEX IF NOT EXISTS idx_perf_post_time ON content_performance(post_id, hours_since_publish);

CREATE TABLE IF NOT EXISTS learning_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_type    text NOT NULL,   -- time | content_style | topic | format | channel
  finding         text NOT NULL,
  confidence      numeric NOT NULL,
  sample_size     int NOT NULL,
  recommendation  text,
  applies_to      text[] NOT NULL DEFAULT '{}',
  is_applied      boolean NOT NULL DEFAULT false,
  applied_at      timestamptz,
  generated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learning_project ON learning_insights(project_id, generated_at DESC);

-- ============================================================
-- 10. Prompt Caching + LLM Call Log (§부록 C)
-- ============================================================

CREATE TABLE IF NOT EXISTS llm_call_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  workflow_run_id uuid REFERENCES workflow_runs(id) ON DELETE SET NULL,
  agent_name      text NOT NULL,
  node_name       text,
  model           text NOT NULL,
  prompt_version  text,
  prompt_tokens   int NOT NULL,
  cached_tokens   int NOT NULL DEFAULT 0,
  completion_tokens int NOT NULL,
  cost_usd        numeric(10,6) NOT NULL,
  latency_ms      int,
  outcome_id      uuid,   -- 24h 후 engagement와 join
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_llm_call_agent_time ON llm_call_log(agent_name, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_call_project_time ON llm_call_log(project_id, occurred_at DESC);

-- ============================================================
-- 11. RAG: Global + Per-Project Knowledge Chunks (§부록 F)
-- ============================================================

CREATE TABLE IF NOT EXISTS project_knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_doc_id   uuid,
  source_type     text NOT NULL,  -- readme | past_post | voice_sample | prd | brand_guide | skill
  chunk_index     int,
  content         text NOT NULL,
  contextualized_content text,  -- Anthropic Contextual Retrieval (Haiku 컨텍스트 prepend)
  embedding       vector(1024),  -- Cohere embed-v4
  tsv             tsvector GENERATED ALWAYS AS (
                      to_tsvector('simple', coalesce(content, ''))
                  ) STORED,
  embedding_model text NOT NULL DEFAULT 'cohere-embed-v4',
  engagement_score numeric,
  metadata        jsonb NOT NULL DEFAULT '{}',
  embedded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pkc_project ON project_knowledge_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_pkc_embedding ON project_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_pkc_tsv ON project_knowledge_chunks USING gin (tsv);

CREATE TABLE IF NOT EXISTS global_knowledge_chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source          text NOT NULL,
  category        text NOT NULL,
  content         text NOT NULL,
  contextualized_content text,
  embedding       vector(1024),
  tsv             tsvector GENERATED ALWAYS AS (
                      to_tsvector('simple', coalesce(content, ''))
                  ) STORED,
  embedding_model text NOT NULL DEFAULT 'cohere-embed-v4',
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gkc_embedding ON global_knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_gkc_tsv ON global_knowledge_chunks USING gin (tsv);

-- ============================================================
-- 12. Skill 효과 측정 (§부록 G.3)
-- ============================================================

CREATE TABLE IF NOT EXISTS skill_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_run_id uuid REFERENCES workflow_runs(id) ON DELETE SET NULL,
  skill_id        text NOT NULL,
  skill_version   text NOT NULL,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  selected        boolean NOT NULL,
  completion_status text,
  outcome_id      uuid,
  outcome_score   numeric
);
CREATE INDEX IF NOT EXISTS idx_skill_runs_skill ON skill_runs(skill_id, triggered_at DESC);

-- ============================================================
-- 13. Reflexion (§부록 I.3)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  workflow_run_id uuid REFERENCES workflow_runs(id) ON DELETE SET NULL,
  task_type       text NOT NULL,
  failure_class   text,
  lesson          text NOT NULL,
  embedding       vector(1024),
  applied_count   int NOT NULL DEFAULT 0,
  helpful_count   int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lessons_project ON agent_lessons(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lessons_embedding ON agent_lessons
  USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 14. Agent Traces (§부록 I.8 — What-if replay 가능)
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_traces (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_name       text NOT NULL,
  inputs_hash     text NOT NULL,
  reasoning       text,
  outputs         jsonb,
  cost_usd        numeric(10,6),
  duration_ms     int,
  occurred_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_traces_run ON agent_traces(workflow_run_id, occurred_at);

-- ============================================================
-- 15. RLS (Row-Level Security) — 모든 신규 테이블
-- ============================================================

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY personas_owner ON personas FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE voice_samples ENABLE ROW LEVEL SECURITY;
CREATE POLICY voice_samples_owner ON voice_samples FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_assets_owner ON media_assets FOR ALL USING (user_id = auth.uid());

ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_projects_owner ON video_projects FOR ALL USING (user_id = auth.uid());

ALTER TABLE video_scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY video_scenes_owner ON video_scenes FOR ALL USING (
  video_project_id IN (SELECT id FROM video_projects WHERE user_id = auth.uid())
);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY interactions_owner ON interactions FOR ALL USING (user_id = auth.uid());

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY automation_rules_owner ON automation_rules FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_runs_owner ON workflow_runs FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE rate_limit_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY rate_limit_owner ON rate_limit_tracker FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE cost_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY cost_ledger_owner ON cost_ledger FOR ALL USING (user_id = auth.uid());

ALTER TABLE shadowban_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY shadowban_owner ON shadowban_checks FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY approval_queue_owner ON approval_queue FOR ALL USING (user_id = auth.uid());

ALTER TABLE content_performance ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_perf_owner ON content_performance FOR ALL USING (
  post_id IN (SELECT id FROM promotion_posts WHERE user_id = auth.uid())
);

ALTER TABLE learning_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_owner ON learning_insights FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE llm_call_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY llm_call_owner ON llm_call_log FOR ALL USING (
  project_id IS NULL OR project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE project_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY pkc_owner ON project_knowledge_chunks FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

-- global_knowledge_chunks: read-only 공개 (RLS 없음 — 모든 인증 사용자 read)
ALTER TABLE global_knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY gkc_read ON global_knowledge_chunks FOR SELECT USING (true);

ALTER TABLE skill_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY skill_runs_owner ON skill_runs FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE agent_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY lessons_owner ON agent_lessons FOR ALL USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

ALTER TABLE agent_traces ENABLE ROW LEVEL SECURITY;
CREATE POLICY traces_owner ON agent_traces FOR ALL USING (
  workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN projects p ON p.id = wr.project_id
    WHERE p.user_id = auth.uid()
  )
);

-- ============================================================
-- 16. Helper Functions (RAG hybrid search 등)
-- ============================================================

-- 하이브리드 검색: vector + BM25 + RRF (§부록 F.3)
-- 사용: SELECT * FROM match_project_chunks('{embedding}', 'project_id', 'query_text', 20);
CREATE OR REPLACE FUNCTION match_project_chunks(
  query_embedding vector(1024),
  filter_project_id uuid,
  query_text text,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  contextualized_content text,
  score float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vec AS (
    SELECT pkc.id,
           pkc.content,
           pkc.contextualized_content,
           pkc.metadata,
           row_number() OVER (ORDER BY pkc.embedding <=> query_embedding) AS rank
    FROM project_knowledge_chunks pkc
    WHERE pkc.project_id = filter_project_id
      AND pkc.embedding <=> query_embedding < 0.7
    ORDER BY pkc.embedding <=> query_embedding
    LIMIT 50
  ),
  kw AS (
    SELECT pkc.id,
           pkc.content,
           pkc.contextualized_content,
           pkc.metadata,
           row_number() OVER (ORDER BY ts_rank_cd(pkc.tsv, plainto_tsquery('simple', query_text)) DESC) AS rank
    FROM project_knowledge_chunks pkc
    WHERE pkc.project_id = filter_project_id
      AND pkc.tsv @@ plainto_tsquery('simple', query_text)
    LIMIT 50
  )
  SELECT u.id,
         u.content,
         u.contextualized_content,
         (SUM(1.0 / (60 + u.rank)))::float AS score,
         u.metadata
  FROM (SELECT * FROM vec UNION ALL SELECT * FROM kw) u
  GROUP BY u.id, u.content, u.contextualized_content, u.metadata
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- 글로벌 RAG hybrid 검색
CREATE OR REPLACE FUNCTION match_global_chunks(
  query_embedding vector(1024),
  query_text text,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  content text,
  contextualized_content text,
  score float,
  category text,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vec AS (
    SELECT gkc.id, gkc.content, gkc.contextualized_content, gkc.category, gkc.metadata,
           row_number() OVER (ORDER BY gkc.embedding <=> query_embedding) AS rank
    FROM global_knowledge_chunks gkc
    WHERE gkc.embedding <=> query_embedding < 0.7
    ORDER BY gkc.embedding <=> query_embedding
    LIMIT 50
  ),
  kw AS (
    SELECT gkc.id, gkc.content, gkc.contextualized_content, gkc.category, gkc.metadata,
           row_number() OVER (ORDER BY ts_rank_cd(gkc.tsv, plainto_tsquery('simple', query_text)) DESC) AS rank
    FROM global_knowledge_chunks gkc
    WHERE gkc.tsv @@ plainto_tsquery('simple', query_text)
    LIMIT 50
  )
  SELECT u.id, u.content, u.contextualized_content,
         (SUM(1.0 / (60 + u.rank)))::float AS score,
         u.category, u.metadata
  FROM (SELECT * FROM vec UNION ALL SELECT * FROM kw) u
  GROUP BY u.id, u.content, u.contextualized_content, u.category, u.metadata
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- ============================================================
-- Migration 008 끝.
-- ============================================================
-- LangGraph Postgres Checkpointer 테이블은 별도 마이그레이션 009에서
-- (langgraph-checkpoint-postgres가 자체 setup() 실행하지만 race condition
-- 방지를 위해 명시적 SQL로 분리)
