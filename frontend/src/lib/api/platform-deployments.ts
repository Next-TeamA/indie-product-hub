import { apiFetch } from "./client";

export type Platform =
  | "vercel"
  | "railway"
  | "cloudflare"
  | "fly"
  | "render"
  | "aws"
  | "gcp"
  | "azure"
  | "supabase"
  | "other";

export type DeploymentRole =
  | "frontend"
  | "backend"
  | "worker"
  | "database"
  | "cache"
  | "queue"
  | "cron"
  | "storage"
  | "other";

export type DependencyKind =
  | "api_call"
  | "db"
  | "queue"
  | "webhook"
  | "storage"
  | "other";

export type PlatformDeployment = {
  id: string;
  project_id: string;
  platform: Platform;
  external_project_id: string;
  external_service_id: string | null;
  name: string;
  role: DeploymentRole;
  description: string | null;
  external_url: string | null;
  health_endpoint: string | null;
  framework: string | null;
  region: string | null;
  status: "healthy" | "degraded" | "down" | "unknown";
  last_checked_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type DeploymentDependency = {
  id: string;
  source_deployment_id: string;
  target_deployment_id: string;
  kind: DependencyKind;
  description: string | null;
  created_at: string;
};

export type DeploymentsResponse = {
  deployments: PlatformDeployment[];
  dependencies: DeploymentDependency[];
};

export type DeploymentInput = {
  platform: Platform;
  external_project_id: string;
  name: string;
  role: DeploymentRole;
  external_service_id?: string;
  description?: string;
  external_url?: string;
  health_endpoint?: string;
  framework?: string;
  region?: string;
};

const base = (projectId: string) =>
  `/api/projects/${projectId}/platform-deployments`;

export async function listPlatformDeployments(
  projectId: string,
): Promise<DeploymentsResponse> {
  return apiFetch(base(projectId));
}

export async function createPlatformDeployment(
  projectId: string,
  input: DeploymentInput,
): Promise<PlatformDeployment> {
  return apiFetch(base(projectId), { method: "POST", body: input });
}

export async function updatePlatformDeployment(
  projectId: string,
  deploymentId: string,
  input: DeploymentInput,
): Promise<{ ok: boolean }> {
  return apiFetch(`${base(projectId)}/${deploymentId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deletePlatformDeployment(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  await apiFetch(`${base(projectId)}/${deploymentId}`, { method: "DELETE" });
}

export async function createDependency(
  projectId: string,
  sourceId: string,
  targetId: string,
  kind: DependencyKind = "api_call",
  description?: string,
): Promise<DeploymentDependency> {
  return apiFetch(`${base(projectId)}/dependencies`, {
    method: "POST",
    body: {
      source_deployment_id: sourceId,
      target_deployment_id: targetId,
      kind,
      description,
    },
  });
}

export async function deleteDependency(
  projectId: string,
  depId: string,
): Promise<void> {
  await apiFetch(`${base(projectId)}/dependencies/${depId}`, {
    method: "DELETE",
  });
}
