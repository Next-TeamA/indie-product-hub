-- Migration 004: Knowledge base for LLM context
-- Stores structured project knowledge for AI-powered features

CREATE TABLE IF NOT EXISTS project_knowledge (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category        text NOT NULL CHECK (category IN (
    'commit_activity',    -- recent commits summary
    'pr_activity',        -- recent PRs summary
    'deploy_history',     -- deploy success/failure patterns
    'sns_performance',    -- SNS metrics summary
    'market_context',     -- market insights digest
    'project_readme'      -- auto-generated project context doc
  )),
  title           text NOT NULL,
  content         text NOT NULL,
  metadata        jsonb DEFAULT '{}',
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Only keep latest per category per project (upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_project_category
  ON project_knowledge(project_id, category);

CREATE INDEX IF NOT EXISTS idx_knowledge_project
  ON project_knowledge(project_id);

ALTER TABLE project_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_knowledge" ON project_knowledge
  FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = project_knowledge.project_id AND projects.user_id = auth.uid())
  );

DROP TRIGGER IF EXISTS project_knowledge_updated_at ON project_knowledge;
CREATE TRIGGER project_knowledge_updated_at
  BEFORE UPDATE ON project_knowledge
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
