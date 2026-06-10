-- ============================================================
-- GitHub App installations (Railway/Vercel 패턴)
-- ============================================================
-- 한 사용자가 여러 organization 에 launch-pad GitHub App 을 install 할 수 있음.
-- 각 installation 은 그 org 내에서 선택된 repo 들만 접근 가능.
-- ============================================================

CREATE TABLE IF NOT EXISTS github_installations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  installation_id   bigint NOT NULL,
  account_login     text NOT NULL,
  account_type      text NOT NULL,   -- 'User' | 'Organization'
  account_id        bigint,
  avatar_url        text,
  repo_selection    text,            -- 'all' | 'selected'
  permissions       jsonb NOT NULL DEFAULT '{}',
  events            text[] NOT NULL DEFAULT '{}',
  installed_at      timestamptz NOT NULL DEFAULT now(),
  suspended_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(installation_id)
);

CREATE INDEX IF NOT EXISTS idx_github_installations_user
  ON github_installations(user_id, installed_at DESC);

CREATE INDEX IF NOT EXISTS idx_github_installations_active
  ON github_installations(installation_id)
  WHERE suspended_at IS NULL;
