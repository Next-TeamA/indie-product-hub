import useSWR from "swr";
import {
  listAmpRuns,
  getAmpRun,
  listApprovals,
  runAmp,
  decideApproval,
  type WorkflowRun,
  type Approval,
  type RunInput,
} from "@/lib/api/amp";

function hasRunning(runs: WorkflowRun[] | undefined): boolean {
  return !!runs?.some((r) => r.status === "running");
}

/** Workflow run list. Polls every 5s while any run is in `running` state. */
export function useAmpRuns(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<WorkflowRun[]>(
    projectId ? `amp-runs/${projectId}` : null,
    () => listAmpRuns(projectId!),
    {
      revalidateOnFocus: false,
      refreshInterval: (latest) => (hasRunning(latest) ? 5000 : 0),
    },
  );
  return { runs: data ?? [], error, isLoading, mutate };
}

export function useAmpRun(projectId: string | null, runId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    projectId && runId ? `amp-run/${projectId}/${runId}` : null,
    () => getAmpRun(projectId!, runId!),
    {
      revalidateOnFocus: false,
      refreshInterval: (latest) =>
        latest?.run.status === "running" ? 3000 : 0,
    },
  );
  return {
    run: data?.run,
    approvals: data?.approvals ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useAmpApprovals(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Approval[]>(
    projectId ? `amp-approvals/${projectId}` : null,
    () => listApprovals(projectId!),
    { revalidateOnFocus: true, refreshInterval: 10000 },
  );
  return { approvals: data ?? [], error, isLoading, mutate };
}

export function useAmpActions(projectId: string) {
  return {
    run: (input: RunInput) => runAmp(projectId, input),
    decide: (approvalId: string, decision: "approved" | "rejected") =>
      decideApproval(projectId, approvalId, decision),
  };
}
