-- Migration 003: Fix deployment_logs platform CHECK to include 'github'
ALTER TABLE deployment_logs DROP CONSTRAINT IF EXISTS deployment_logs_platform_check;
ALTER TABLE deployment_logs ADD CONSTRAINT deployment_logs_platform_check
  CHECK (platform IN ('vercel', 'railway', 'github'));
