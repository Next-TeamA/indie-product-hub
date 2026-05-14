import useSWR from "swr";
import {
  listIssues,
  createIssue,
  updateIssue,
  deleteIssue,
  type Issue,
  type IssueCreateInput,
} from "@/lib/api/issues";

export function useIssues(projectId: string, status?: string) {
  const key = status
    ? `projects/${projectId}/issues?status=${status}`
    : `projects/${projectId}/issues`;

  const { data, error, isLoading, mutate } = useSWR<Issue[]>(
    key,
    () => listIssues(projectId, status),
    { revalidateOnFocus: false }
  );
  return { issues: data ?? [], error, isLoading, mutate };
}

export function useIssueActions(projectId: string) {
  return {
    create: (data: IssueCreateInput) => createIssue(projectId, data),
    update: (issueId: string, data: Partial<IssueCreateInput & { status: string }>) =>
      updateIssue(projectId, issueId, data),
    remove: (issueId: string) => deleteIssue(projectId, issueId),
  };
}
