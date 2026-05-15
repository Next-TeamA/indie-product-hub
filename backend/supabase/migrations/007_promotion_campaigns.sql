-- Migration 007: two-week promotion campaign generation

CREATE TABLE IF NOT EXISTS promotion_campaigns (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input             jsonb NOT NULL DEFAULT '{}',
  target_analysis   jsonb NOT NULL DEFAULT '{}',
  campaign_strategy jsonb NOT NULL DEFAULT '{}',
  final_calendar    jsonb NOT NULL DEFAULT '[]',
  post_ids          uuid[] NOT NULL DEFAULT '{}',
  status            text NOT NULL DEFAULT 'generating'
    CHECK (status IN (
      'awaiting_persona_selection',
      'awaiting_strategy_selection',
      'generating',
      'completed',
      'failed'
    )),
  error_message     text,
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotion_campaign_steps (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  uuid NOT NULL REFERENCES promotion_campaigns(id) ON DELETE CASCADE,
  step_name    text NOT NULL CHECK (step_name IN (
    'target_analysis',
    'persona_option_evaluation',
    'user_persona_selection',
    'strategy_option_evaluation',
    'user_strategy_selection',
    'campaign_strategy',
    'threads_operating_rhythm',
    'calendar_planning',
    'draft_writing',
    'review'
  )),
  output       jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE promotion_posts
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES promotion_campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS campaign_day int CHECK (campaign_day BETWEEN 1 AND 14),
  ADD COLUMN IF NOT EXISTS campaign_meta jsonb NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_project
  ON promotion_campaigns(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_promotion_campaign_steps_campaign
  ON promotion_campaign_steps(campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_promotion_posts_campaign
  ON promotion_posts(campaign_id, campaign_day)
  WHERE campaign_id IS NOT NULL;

DROP TRIGGER IF EXISTS promotion_campaigns_updated_at ON promotion_campaigns;
CREATE TRIGGER promotion_campaigns_updated_at
  BEFORE UPDATE ON promotion_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE promotion_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_campaign_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_promotion_campaigns" ON promotion_campaigns
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_promotion_campaign_steps" ON promotion_campaign_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM promotion_campaigns
      WHERE promotion_campaigns.id = promotion_campaign_steps.campaign_id
        AND promotion_campaigns.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM promotion_campaigns
      WHERE promotion_campaigns.id = promotion_campaign_steps.campaign_id
        AND promotion_campaigns.user_id = auth.uid()
    )
  );
