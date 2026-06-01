import { apiFetch } from "./client";

export type AmpGraph = "content_creation" | "engagement" | "video_production";

export type WorkflowStatus =
  | "running"
  | "paused_awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkflowRun = {
  id: string;
  project_id: string;
  graph_name: AmpGraph | string;
  thread_id: string;
  status: WorkflowStatus;
  current_node: string | null;
  state_snapshot: unknown;
  error_message: string | null;
  cost_usd: number;
  started_at: string;
  completed_at: string | null;
};

export type Approval = {
  id: string;
  project_id: string;
  workflow_run_id: string;
  status: "pending" | "approved" | "rejected";
  approval_type: string;
  payload: unknown;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
};

export type RunInput = {
  graph: AmpGraph;
  trigger_type?: string;
  payload?: Record<string, unknown>;
};

export type RunResult = {
  status: string;
  thread_id?: string;
  workflow_run_id?: string;
  [k: string]: unknown;
};

export async function runAmp(
  projectId: string,
  input: RunInput,
): Promise<RunResult> {
  return apiFetch<RunResult>(`/api/projects/${projectId}/amp/run`, {
    method: "POST",
    body: {
      graph: input.graph,
      trigger_type: input.trigger_type ?? "manual",
      payload: input.payload ?? {},
    },
  });
}

export async function listAmpRuns(projectId: string): Promise<WorkflowRun[]> {
  return apiFetch<WorkflowRun[]>(`/api/projects/${projectId}/amp/runs`);
}

export async function getAmpRun(
  projectId: string,
  runId: string,
): Promise<{ run: WorkflowRun; approvals: Approval[] }> {
  return apiFetch<{ run: WorkflowRun; approvals: Approval[] }>(
    `/api/projects/${projectId}/amp/runs/${runId}`,
  );
}

export async function listApprovals(projectId: string): Promise<Approval[]> {
  return apiFetch<Approval[]>(`/api/projects/${projectId}/amp/approvals`);
}

export async function decideApproval(
  projectId: string,
  approvalId: string,
  decision: "approved" | "rejected",
): Promise<{ decision: string; resume: unknown }> {
  return apiFetch<{ decision: string; resume: unknown }>(
    `/api/projects/${projectId}/amp/approvals/${approvalId}/decide`,
    { method: "POST", body: { decision } },
  );
}
