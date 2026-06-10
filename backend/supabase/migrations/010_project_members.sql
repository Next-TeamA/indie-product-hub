-- ============================================================
-- Project membership: multi-user 한 프로젝트 공동 관리
-- ============================================================
-- 한 프로젝트(projects)에 여러 사용자가 멤버로 참여 가능.
-- 멤버는 role 로 권한 구분: owner | admin | member | viewer.
-- 가입 안 된 사람도 이메일로 미리 초대(project_invitations) 가능.
-- ============================================================

-- ----- project_members -----
CREATE TABLE IF NOT EXISTS project_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at    timestamptz,
  joined_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ----- 기존 projects 의 owner 를 project_members 에 자동 채워넣기 -----
INSERT INTO project_members (project_id, user_id, role, joined_at)
SELECT id, user_id, 'owner', created_at
FROM projects
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm
  WHERE pm.project_id = projects.id AND pm.user_id = projects.user_id
)
ON CONFLICT (project_id, user_id) DO NOTHING;

-- 새로 만들어지는 projects 도 자동으로 owner row 들어가게
CREATE OR REPLACE FUNCTION fn_projects_add_owner_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, joined_at)
  VALUES (NEW.id, NEW.user_id, 'owner', NEW.created_at)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_add_owner_member ON projects;
CREATE TRIGGER trg_projects_add_owner_member
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION fn_projects_add_owner_member();

-- ----- project_invitations -----
-- 이메일로 초대. 받는 사람이 이미 가입돼 있어도 token 으로 처리.
-- 가입 안 됐으면 사용자가 가입한 다음 token 으로 accept 하면 멤버 등록.
CREATE TABLE IF NOT EXISTS project_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email         text NOT NULL,
  role          text NOT NULL DEFAULT 'member'
    CHECK (role IN ('admin', 'member', 'viewer')),
  token         text NOT NULL UNIQUE,
  invited_by    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked', 'expired')),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at    timestamptz NOT NULL DEFAULT now(),
  accepted_at   timestamptz,
  accepted_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_project ON project_invitations(project_id, status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email
  ON project_invitations(lower(email)) WHERE status = 'pending';
