import { apiFetch } from "./client";

// --- Types ---

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  prd: string | null;
  logo_url: string | null;
  github_repo_url: string | null;
  github_repo_owner: string | null;
  github_repo_name: string | null;
  deploy_platform: string | null;
  deploy_project_id: string | null;
  sns_channels: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type ProjectCreateInput = {
  name: string;
  description?: string;
  prd?: string;
  logo_url?: string;
  github_repo_url?: string;
  github_repo_owner?: string;
  github_repo_name?: string;
  deploy_platform?: string;
  deploy_project_id?: string;
  sns_channels?: string[];
};

// --- API ---

export async function listProjects(): Promise<Project[]> {
  return apiFetch<Project[]>("/api/projects");
}

export async function getProject(id: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`);
}

export async function createProject(data: ProjectCreateInput): Promise<Project> {
  return apiFetch<Project>("/api/projects", { method: "POST", body: data });
}

export async function updateProject(
  id: string,
  data: Partial<ProjectCreateInput>
): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${id}`, { method: "PATCH", body: data });
}

export async function deleteProject(id: string): Promise<void> {
  return apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}
