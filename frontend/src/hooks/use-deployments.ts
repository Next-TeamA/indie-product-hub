import { useEffect, useRef } from "react";
import useSWR from "swr";
import { listDeployments, syncDeployments, type DeploymentLog } from "@/lib/api/deployments";

export function useDeployments(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<DeploymentLog[]>(
    `projects/${projectId}/deployments`,
    () => listDeployments(projectId),
    { revalidateOnFocus: false }
  );

  // Auto-sync from Vercel/Railway API on first mount
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    syncDeployments(projectId).then(() => mutate()).catch(() => {});
  }, [projectId, mutate]);

  return {
    deployments: data ?? [],
    error,
    isLoading,
    mutate,
    sync: async () => { await syncDeployments(projectId); mutate(); },
  };
}
