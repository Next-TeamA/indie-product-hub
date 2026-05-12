import { apiFetch } from "./client";

export type DeploymentLog = {
  id: string;
  project_id: string;
  platform: "vercel" | "railway";
  deployment_id: string;
  deployment_url: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  branch: string | null;
  status: "building" | "deploying" | "ready" | "error" | "cancelled";
  error_message: string | null;
  build_duration_ms: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export async function listDeployments(projectId: string): Promise<DeploymentLog[]> {
  return apiFetch<DeploymentLog[]>(`/api/projects/${projectId}/deployments`);
}

export async function syncDeployments(projectId: string): Promise<{ status: string }> {
  return apiFetch(`/api/projects/${projectId}/deployments/sync`, { method: "POST" });
}
