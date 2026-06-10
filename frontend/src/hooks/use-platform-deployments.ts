import useSWR from "swr";
import {
  listPlatformDeployments,
  type DeploymentsResponse,
} from "@/lib/api/platform-deployments";

export function usePlatformDeployments(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<DeploymentsResponse>(
    projectId ? `platform-deployments/${projectId}` : null,
    () => listPlatformDeployments(projectId!),
    { revalidateOnFocus: false },
  );
  return {
    deployments: data?.deployments ?? [],
    dependencies: data?.dependencies ?? [],
    error,
    isLoading,
    mutate,
  };
}
