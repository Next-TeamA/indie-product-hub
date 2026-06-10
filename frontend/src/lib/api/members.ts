import { apiFetch } from "./client";

export type ProjectRole = "owner" | "admin" | "member" | "viewer";
export type InviteRole = "admin" | "member" | "viewer";

export type ProjectMember = {
  id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  invited_at: string | null;
  invited_by: string | null;
  email: string | null;
  user_metadata: { name?: string; avatar_url?: string; [k: string]: unknown };
  is_self: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: InviteRole;
  invited_by: string;
  status: string;
  created_at: string;
  expires_at: string;
};

export type MembersResponse = {
  viewer_role: ProjectRole;
  members: ProjectMember[];
  pending_invitations: PendingInvitation[];
};

export type MyInvitation = {
  id: string;
  project_id: string;
  project_name: string;
  email: string;
  role: InviteRole;
  token: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
};

export type InvitationLookup = {
  id: string;
  project_id: string;
  email: string;
  role: InviteRole;
  invited_by: string;
  status: string;
  expires_at: string;
  project_name: string | null;
};

// ----- members -----

export async function listMembers(projectId: string): Promise<MembersResponse> {
  return apiFetch(`/api/projects/${projectId}/members`);
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: ProjectRole,
): Promise<{ ok: boolean }> {
  return apiFetch(`/api/projects/${projectId}/members/${memberId}`, {
    method: "PATCH",
    body: { role },
  });
}

export async function removeMember(
  projectId: string,
  memberId: string,
): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/members/${memberId}`, {
    method: "DELETE",
  });
}

// ----- invitations -----

export type InvitationCreated = {
  id: string;
  token: string;
  accept_url: string;
  delivery: "email" | "in_app" | "manual";
  email_sent: boolean;
  invitee_registered: boolean;
};

export async function createInvitation(
  projectId: string,
  email: string,
  role: InviteRole,
): Promise<InvitationCreated> {
  return apiFetch(`/api/projects/${projectId}/invitations`, {
    method: "POST",
    body: { email, role },
  });
}

export async function cancelInvitation(
  projectId: string,
  invitationId: string,
): Promise<void> {
  await apiFetch(`/api/projects/${projectId}/invitations/${invitationId}`, {
    method: "DELETE",
  });
}

// ----- my invitations -----

export async function listMyInvitations(): Promise<MyInvitation[]> {
  return apiFetch(`/api/invitations/me`);
}

export async function lookupInvitation(token: string): Promise<InvitationLookup> {
  return apiFetch(`/api/invitations/lookup/${token}`);
}

export async function acceptInvitation(
  token: string,
): Promise<{ ok: boolean; project_id: string }> {
  return apiFetch(`/api/invitations/${token}/accept`, { method: "POST" });
}

export async function declineInvitation(token: string): Promise<{ ok: boolean }> {
  return apiFetch(`/api/invitations/${token}/decline`, { method: "POST" });
}
