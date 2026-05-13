import useSWR from "swr";
import { listDeployments, syncDeployments, type DeploymentLog } from "@/lib/api/deployments";

export function useDeployments(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<DeploymentLog[]>(
    `projects/${projectId}/deployments`,
    () => listDeployments(projectId),
    { revalidateOnFocus: false }
  );
  return {
    deployments: data ?? [],
    error,
    isLoading,
    mutate,
    sync: async () => { await syncDeployments(projectId); mutate(); },
  };
}
