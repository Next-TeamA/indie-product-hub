import useSWR from "swr";
import { getMarketingInsights, getOperationsInsights } from "@/lib/api/insights";
import { listMarketInsights, generateMarketInsights, type MarketInsight } from "@/lib/api/market-insights";

export function useMarketingInsights(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `projects/${projectId}/insights/marketing`,
    () => getMarketingInsights(projectId),
    { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}

export function useOperationsInsights(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    `projects/${projectId}/insights/operations`,
    () => getOperationsInsights(projectId),
    { revalidateOnFocus: false }
  );
  return { data, error, isLoading, mutate };
}

export function useMarketInsights(projectId: string) {
  const { data, error, isLoading, mutate } = useSWR<MarketInsight[]>(
    `projects/${projectId}/insights/market`,
    () => listMarketInsights(projectId),
    { revalidateOnFocus: false }
  );
  return { insights: data ?? [], error, isLoading, mutate, generate: () => generateMarketInsights(projectId) };
}
