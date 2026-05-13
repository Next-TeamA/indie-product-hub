-- Migration 002: OAuth states table + deployment_logs unique constraint

-- OAuth states (temporary, TTL-based)
CREATE TABLE IF NOT EXISTS oauth_states (
  state text PRIMARY KEY,
  data jsonb NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-cleanup expired states (optional: run periodically)
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- Fix: deployment_logs needs unique constraint for upsert
ALTER TABLE deployment_logs ADD CONSTRAINT uq_deployment_logs_project_deployment
  UNIQUE (project_id, deployment_id);

-- Pydantic model fields: add length constraints at DB level too
-- (defense in depth -- app validates first, DB catches anything that slips through)
