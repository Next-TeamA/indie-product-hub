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

export type DeploymentEnvironment =
  | "production"
  | "staging"
  | "preview"
  | "development"
  | "other";

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type SLOTarget = {
  uptime_pct?: number;
  latency_p95_ms?: number;
  error_rate_pct?: number;
};

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
  environment: DeploymentEnvironment;
  description: string | null;
  external_url: string | null;
  health_endpoint: string | null;
  health_check_url: string | null;
  framework: string | null;
  region: string | null;
  status: HealthStatus;
  slo_target: SLOTarget;
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
  environment?: DeploymentEnvironment;
  external_service_id?: string;
  description?: string;
  external_url?: string;
  health_endpoint?: string;
  health_check_url?: string;
  framework?: string;
  region?: string;
  slo_target?: SLOTarget;
};

// ============================================================
// Topology + cascade
// ============================================================

export type TopologyNode = {
  id: string;
  name: string;
  platform: Platform;
  role: DeploymentRole;
  environment: DeploymentEnvironment;
  status_direct: HealthStatus;
  status_effective: HealthStatus;
  cascade_from: string | null;
  external_url: string | null;
  framework: string | null;
  last_checked_at: string | null;
};

export type TopologyEdge = {
  id: string;
  source: string;
  target: string;
  kind: DependencyKind;
  description: string | null;
};

export type TopologyResponse = {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
};

export type ImpactNode = {
  id: string;
  name: string;
  platform: Platform;
  role: DeploymentRole;
  environment: DeploymentEnvironment;
  depth: number;
  current_status: HealthStatus;
};

export type ImpactResponse = {
  deployment_id: string;
  deployment_name: string;
  affected?: ImpactNode[];
  upstream?: ImpactNode[];
  max_depth: number;
};

export type HealthCheckRow = {
  status: HealthStatus;
  http_status: number | null;
  response_time_ms: number | null;
  error_message: string | null;
  cascade_from: string | null;
  checked_at: string;
};

export type HealthHistoryResponse = {
  window_hours: number;
  checks: HealthCheckRow[];
};

export type SLOProgressResponse = {
  has_data: boolean;
  deployment_id?: string;
  uptime_pct_24h?: number | null;
  avg_response_ms_24h?: number | null;
  total_checks_24h?: number | null;
  down_checks_24h?: number | null;
  degraded_checks_24h?: number | null;
  slo_target?: SLOTarget;
  uptime_violation?: boolean;
  latency_violation?: boolean;
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

// ============================================================
// Topology / impact / health / SLO / manual ping
// ============================================================

export async function getTopology(projectId: string): Promise<TopologyResponse> {
  return apiFetch(`${base(projectId)}/topology`);
}

export async function getDownstreamImpact(
  projectId: string,
  deploymentId: string,
): Promise<ImpactResponse> {
  return apiFetch(`${base(projectId)}/${deploymentId}/impact-downstream`);
}

export async function getUpstreamImpact(
  projectId: string,
  deploymentId: string,
): Promise<ImpactResponse> {
  return apiFetch(`${base(projectId)}/${deploymentId}/impact-upstream`);
}

export async function getHealthHistory(
  projectId: string,
  deploymentId: string,
  hours = 24,
): Promise<HealthHistoryResponse> {
  return apiFetch(`${base(projectId)}/${deploymentId}/health-history`, {
    params: { hours: String(hours) },
  });
}

export async function getSloProgress(
  projectId: string,
  deploymentId: string,
): Promise<SLOProgressResponse> {
  return apiFetch(`${base(projectId)}/${deploymentId}/slo`);
}

export async function manualPing(
  projectId: string,
  deploymentId: string,
): Promise<{ checked: number; state_changes: unknown[] }> {
  return apiFetch(`${base(projectId)}/${deploymentId}/ping`, {
    method: "POST",
  });
}
