-- Migration 001: Extend schema for full feature set
-- Run in Supabase SQL Editor

-- ============================================================
-- 1. ALTER existing tables
-- ============================================================

-- projects: add deployment + logo fields, fix status to English
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS github_repo_owner text,
  ADD COLUMN IF NOT EXISTS github_repo_name text,
  ADD COLUMN IF NOT EXISTS deploy_platform text CHECK (deploy_platform IN ('vercel', 'railway')),
  ADD COLUMN IF NOT EXISTS deploy_project_id text,
  ADD COLUMN IF NOT EXISTS deploy_url text;

-- Update existing status values from Korean to English
UPDATE projects SET status = 'preparing' WHERE status = '준비중';

-- Add CHECK constraint on status (drop default first, re-add)
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'preparing';

-- events: add user_id column for RLS direct check
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- issues: add user_id, source tracking, resolved_at
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'vercel', 'railway', 'github', 'system')),
  ADD COLUMN IF NOT EXISTS source_ref text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- ============================================================
-- 2. NEW tables
-- ============================================================

-- connected_accounts: OAuth tokens for external services
CREATE TABLE IF NOT EXISTS connected_accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider          text NOT NULL CHECK (provider IN ('x', 'threads', 'github', 'vercel', 'railway')),
  provider_user_id  text NOT NULL,
  provider_username text,
  access_token      text NOT NULL,
  refresh_token     text,
  token_expires_at  timestamptz,
  scopes            text[],
  profile_data      jsonb DEFAULT '{}',
  is_active         boolean NOT NULL DEFAULT true,
  last_synced_at    timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider, provider_user_id)
);

-- project_promotion_info: per-project promotion context for AI
CREATE TABLE IF NOT EXISTS project_promotion_info (
  project_id       uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  service_name     text,
  description      text,
  target_user      text,
  key_values       text,
  site_url         text,
  default_hashtags text[] DEFAULT '{}',
  tone_preference  text DEFAULT 'friendly'
    CHECK (tone_preference IN ('friendly', 'professional', 'humorous', 'informative')),
  logo_url         text,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- promotion_posts: actual SNS posts (replaces promotion_messages for post management)
CREATE TABLE IF NOT EXISTS promotion_posts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform         text NOT NULL CHECK (platform IN ('x', 'threads', 'bluesky', 'mastodon')),
  hook             text,
  content          text NOT NULL,
  hashtags         text[] DEFAULT '{}',
  link             text,
  images           text[] DEFAULT '{}',
  ai_prompt        text,
  ai_model         text,
  tone             text CHECK (tone IN ('friendly', 'professional', 'humorous', 'informative')),
  content_type     text CHECK (content_type IN ('launch', 'update', 'retrospective', 'qa', 'tip', 'milestone')),
  status           text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at     timestamptz,
  published_at     timestamptz,
  external_post_id text,
  publish_error    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- sns_metrics_snapshots: periodic metrics from SNS APIs
CREATE TABLE IF NOT EXISTS sns_metrics_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid NOT NULL REFERENCES promotion_posts(id) ON DELETE CASCADE,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  impressions     int DEFAULT 0,
  likes           int DEFAULT 0,
  replies         int DEFAULT 0,
  reposts         int DEFAULT 0,
  quotes          int DEFAULT 0,
  bookmarks       int DEFAULT 0,
  url_clicks      int DEFAULT 0,
  profile_clicks  int DEFAULT 0,
  views           int DEFAULT 0,
  snapshot_at     timestamptz NOT NULL DEFAULT now()
);

-- market_insights: AI-generated market analysis
CREATE TABLE IF NOT EXISTS market_insights (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  insight_type    text NOT NULL
    CHECK (insight_type IN ('competitor', 'trend', 'news', 'opportunity', 'threat')),
  title           text NOT NULL,
  summary         text NOT NULL,
  detail          text,
  source_urls     text[] DEFAULT '{}',
  relevance_score float DEFAULT 0.5
    CHECK (relevance_score >= 0 AND relevance_score <= 1),
  is_urgent       boolean NOT NULL DEFAULT false,
  urgency_reason  text,
  is_read         boolean NOT NULL DEFAULT false,
  is_dismissed    boolean NOT NULL DEFAULT false,
  generated_by    text DEFAULT 'gemini',
  raw_data        jsonb DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- deployment_logs: from Vercel/Railway
CREATE TABLE IF NOT EXISTS deployment_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  platform          text NOT NULL CHECK (platform IN ('vercel', 'railway', 'github')),
  deployment_id     text NOT NULL,
  deployment_url    text,
  commit_sha        text,
  commit_message    text,
  branch            text,
  status            text NOT NULL
    CHECK (status IN ('building', 'deploying', 'ready', 'error', 'cancelled')),
  error_message     text,
  error_logs        text,
  build_duration_ms int,
  started_at        timestamptz,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- alerts: unified notification system
CREATE TABLE IF NOT EXISTS alerts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  alert_type      text NOT NULL
    CHECK (alert_type IN (
      'deploy_error', 'deploy_success',
      'traffic_spike', 'traffic_drop',
      'error_rate_high',
      'sns_viral', 'sns_mention',
      'market_urgent',
      'scheduled_post_failed',
      'token_expiring',
      'system'
    )),
  severity        text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('critical', 'warning', 'info', 'success')),
  title           text NOT NULL,
  message         text NOT NULL,
  action_url      text,
  source_table    text,
  source_id       uuid,
  is_read         boolean NOT NULL DEFAULT false,
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. INDEXES
-- ============================================================

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(user_id, status);

-- connected_accounts
CREATE INDEX IF NOT EXISTS idx_connected_accounts_user ON connected_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_connected_accounts_provider ON connected_accounts(user_id, provider);

-- events
CREATE INDEX IF NOT EXISTS idx_events_project_date ON events(project_id, date);

-- issues
CREATE INDEX IF NOT EXISTS idx_issues_project_status ON issues(project_id, status);

-- promotion_posts
CREATE INDEX IF NOT EXISTS idx_promotion_posts_project ON promotion_posts(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_promotion_posts_status ON promotion_posts(status)
  WHERE status IN ('scheduled', 'publishing');
CREATE INDEX IF NOT EXISTS idx_promotion_posts_scheduled ON promotion_posts(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- sns_metrics_snapshots
CREATE INDEX IF NOT EXISTS idx_sns_metrics_post ON sns_metrics_snapshots(post_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_sns_metrics_project ON sns_metrics_snapshots(project_id, snapshot_at DESC);

-- market_insights
CREATE INDEX IF NOT EXISTS idx_market_insights_project ON market_insights(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_insights_urgent ON market_insights(project_id, is_urgent)
  WHERE is_urgent = true AND is_dismissed = false;

-- deployment_logs
CREATE INDEX IF NOT EXISTS idx_deployment_logs_project ON deployment_logs(project_id, created_at DESC);

-- alerts
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(user_id, is_read)
  WHERE is_read = false;

-- ============================================================
-- 4. TRIGGERS (updated_at auto-update)
-- ============================================================

DROP TRIGGER IF EXISTS connected_accounts_updated_at ON connected_accounts;
CREATE TRIGGER connected_accounts_updated_at
  BEFORE UPDATE ON connected_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS promotion_posts_updated_at ON promotion_posts;
CREATE TRIGGER promotion_posts_updated_at
  BEFORE UPDATE ON promotion_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS project_promotion_info_updated_at ON project_promotion_info;
CREATE TRIGGER project_promotion_info_updated_at
  BEFORE UPDATE ON project_promotion_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE connected_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_promotion_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sns_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- connected_accounts: users own their accounts
CREATE POLICY "users_own_accounts" ON connected_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- project_promotion_info: via project ownership
CREATE POLICY "users_own_promo_info" ON project_promotion_info
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_promotion_info.project_id AND projects.user_id = auth.uid())
  );

-- promotion_posts: direct user_id check
CREATE POLICY "users_own_promotion_posts" ON promotion_posts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- sns_metrics_snapshots: via project ownership
CREATE POLICY "users_own_metrics" ON sns_metrics_snapshots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = sns_metrics_snapshots.project_id AND projects.user_id = auth.uid())
  );

-- market_insights: via project ownership
CREATE POLICY "users_own_insights" ON market_insights
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = market_insights.project_id AND projects.user_id = auth.uid())
  );

-- deployment_logs: via project ownership
CREATE POLICY "users_own_deploys" ON deployment_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = deployment_logs.project_id AND projects.user_id = auth.uid())
  );

-- alerts: direct user_id check
CREATE POLICY "users_own_alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
