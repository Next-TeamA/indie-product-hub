import useSWR from "swr";
import {
  getDownstreamImpact,
  getHealthHistory,
  getSloProgress,
  getTopology,
  getUpstreamImpact,
  listPlatformDeployments,
  type DeploymentsResponse,
  type HealthHistoryResponse,
  type ImpactResponse,
  type SLOProgressResponse,
  type TopologyResponse,
} from "@/lib/api/platform-deployments";

export function usePlatformDeployments(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<DeploymentsResponse>(
    projectId ? `platform-deployments/${projectId}` : null,
    () => listPlatformDeployments(projectId!),
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );
  return {
    deployments: data?.deployments ?? [],
    dependencies: data?.dependencies ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useTopology(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<TopologyResponse>(
    projectId ? `topology/${projectId}` : null,
    () => getTopology(projectId!),
    { revalidateOnFocus: true, refreshInterval: 60000 },
  );
  return {
    nodes: data?.nodes ?? [],
    edges: data?.edges ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useDownstreamImpact(
  projectId: string | null,
  deploymentId: string | null,
) {
  const { data, error, isLoading } = useSWR<ImpactResponse>(
    projectId && deploymentId
      ? `impact-down/${projectId}/${deploymentId}`
      : null,
    () => getDownstreamImpact(projectId!, deploymentId!),
    { revalidateOnFocus: false },
  );
  return { impact: data, error, isLoading };
}

export function useUpstreamImpact(
  projectId: string | null,
  deploymentId: string | null,
) {
  const { data, error, isLoading } = useSWR<ImpactResponse>(
    projectId && deploymentId ? `impact-up/${projectId}/${deploymentId}` : null,
    () => getUpstreamImpact(projectId!, deploymentId!),
    { revalidateOnFocus: false },
  );
  return { impact: data, error, isLoading };
}

export function useHealthHistory(
  projectId: string | null,
  deploymentId: string | null,
  hours = 24,
) {
  const { data, error, isLoading, mutate } = useSWR<HealthHistoryResponse>(
    projectId && deploymentId
      ? `health-history/${projectId}/${deploymentId}/${hours}`
      : null,
    () => getHealthHistory(projectId!, deploymentId!, hours),
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );
  return {
    checks: data?.checks ?? [],
    windowHours: data?.window_hours ?? hours,
    error,
    isLoading,
    mutate,
  };
}

export function useSloProgress(
  projectId: string | null,
  deploymentId: string | null,
) {
  const { data, error, isLoading, mutate } = useSWR<SLOProgressResponse>(
    projectId && deploymentId ? `slo/${projectId}/${deploymentId}` : null,
    () => getSloProgress(projectId!, deploymentId!),
    { revalidateOnFocus: false, refreshInterval: 60000 },
  );
  return { slo: data, error, isLoading, mutate };
}
