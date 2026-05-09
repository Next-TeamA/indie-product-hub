import { apiFetch } from "./client";

// --- Types ---

export type Issue = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type IssueCreateInput = {
  title: string;
  description?: string;
  severity?: string;
  category?: string;
};

// --- API ---

export async function listIssues(
  projectId: string,
  status?: string
): Promise<Issue[]> {
  const params = status ? { status } : undefined;
  return apiFetch<Issue[]>(`/api/projects/${projectId}/issues`, { params });
}

export async function createIssue(
  projectId: string,
  data: IssueCreateInput
): Promise<Issue> {
  return apiFetch<Issue>(`/api/projects/${projectId}/issues`, {
    method: "POST",
    body: data,
  });
}

export async function updateIssue(
  projectId: string,
  issueId: string,
  data: Partial<IssueCreateInput & { status: string }>
): Promise<Issue> {
  return apiFetch<Issue>(`/api/projects/${projectId}/issues/${issueId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteIssue(
  projectId: string,
  issueId: string
): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/issues/${issueId}`, {
    method: "DELETE",
  });
}
