-- Migration 006: Promotion reference templates for LLM knowledge base
-- Stores categorized reference posts that the AI agent uses when generating promotions.

CREATE TABLE IF NOT EXISTS promotion_references (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_type       text NOT NULL CHECK (slot_type IN (
    'feature_intro', 'problem_raising', 'feedback_request',
    'update_share', 'dev_insights', 'launch',
    'use_case', 'metrics_share', 'retrospective'
  )),
  title           text NOT NULL,
  hook_text       text NOT NULL,
  body_text       text NOT NULL,
  cta_text        text,
  platform        text NOT NULL DEFAULT 'threads' CHECK (platform IN ('threads', 'x', 'bluesky')),
  voice_persona   text DEFAULT 'vulnerable' CHECK (voice_persona IN ('vulnerable', 'expert', 'community_first')),
  source          text,
  good_points     text[],
  applicable_to   text[],
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_refs_slot ON promotion_references(slot_type);
CREATE INDEX IF NOT EXISTS idx_promo_refs_platform ON promotion_references(platform);

-- Seed with reference data extracted from docs/promotion/*.md

INSERT INTO promotion_references (slot_type, title, hook_text, body_text, cta_text, platform, voice_persona, good_points, applicable_to) VALUES
('problem_raising', 'Re-promotion: solve real pain', 'I built X to solve Y', 'Background context -> specific problem -> how this helps -> casual tone throughout', 'Feedback request or question', 'threads', 'vulnerable', ARRAY['problem-first', 'no hard sell', 'authentic voice'], ARRAY['early-stage', 'side-project', 'B2C']),

('feature_intro', 'Self-deprecating feature showcase', 'Hook with humor or self-awareness', 'Numbered benefit list -> credibility signal (user count, time) -> concrete use case', 'Soft CTA: try it / feedback', 'threads', 'community_first', ARRAY['numbered benefits', 'social proof', 'light tone'], ARRAY['product-with-users', 'feature-launch']),

('feedback_request', 'Work-in-progress honesty', 'Self-intro -> situation honestly', 'Show unfinished state -> what you are trying -> what is hard', 'Ask for specific advice', 'threads', 'vulnerable', ARRAY['radical honesty', 'specific question', 'shows humility'], ARRAY['early-stage', 'pre-launch', 'pivoting']),

('launch', 'Build-in-public countdown', 'Real process + failures shared', 'Transparent costs -> timeline -> what went wrong -> what worked', 'D-day announcement + link', 'threads', 'vulnerable', ARRAY['cost transparency', 'failure sharing', 'countdown tension'], ARRAY['launch-day', 'early-access']),

('dev_insights', 'Make tools visible', 'Result-first -> how I did it', 'Step-by-step method -> screenshot proof -> philosophical close', 'Question: how do you do this?', 'threads', 'expert', ARRAY['process transparency', 'proof included', 'teaches something'], ARRAY['established-creator', 'tool-maker']),

('problem_raising', 'Philosophy-driven brand post', 'Lead with values, not features', 'Why this matters to you personally -> how the product reflects this -> who this is for specifically', 'Community join CTA', 'threads', 'expert', ARRAY['values-first', 'specific targeting', 'brand building'], ARRAY['brand-positioning', 'differentiation']),

('use_case', 'Narrative product reveal', 'Customer feedback opens the post', 'Personal solution story -> service reveal midway -> targeted use case', 'Specific audience CTA', 'threads', 'community_first', ARRAY['customer-centric', 'story-driven', 'delayed reveal'], ARRAY['product-with-testimonial', 'B2B']),

('update_share', 'Casual daily update', 'Ultra-short single sentence', 'Brief what happened today with the product -> personal touch', 'No CTA or just emoji', 'threads', 'vulnerable', ARRAY['ultra-low-effort', 'consistency', 'character-driven'], ARRAY['daily-posting', 'build-in-public']),

('feedback_request', 'Vulnerability + aspiration', 'Share doubts openly', 'Introduce work alongside doubts -> ask for belief/support', 'Believe in me? / Follow my journey', 'threads', 'vulnerable', ARRAY['emotional resonance', 'aspiration sharing', 'parasocial connection'], ARRAY['early-stage', 'personal-brand']),

('feature_intro', 'Expert reframe', 'Challenge common wisdom', 'New angle on familiar topic -> concrete daily examples -> your product fits here', 'Question-based close', 'x', 'expert', ARRAY['thought leadership', 'contrarian take', 'actionable insight'], ARRAY['established-product', 'B2B', 'professional-audience']);
