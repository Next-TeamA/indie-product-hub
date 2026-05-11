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
    create: async (data: IssueCreateInput) => {
      return createIssue(projectId, data);
    },
    update: async (
      issueId: string,
      data: Partial<IssueCreateInput & { status: string }>
    ) => {
      return updateIssue(projectId, issueId, data);
    },
    remove: async (issueId: string) => {
      return deleteIssue(projectId, issueId);
    },
  };
}
