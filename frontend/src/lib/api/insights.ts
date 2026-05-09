import { apiFetch } from "./client";

// --- Types ---

export type MarketingInsights = {
  metrics: {
    id: string;
    channel: string;
    impressions: number;
    clicks: number;
    recorded_at: string;
  }[];
};

export type OperationsInsights = {
  summary: {
    critical_open: number;
    warning_open: number;
    resolved: number;
    total: number;
  };
  issues: { severity: string; status: string }[];
};

// --- API ---

export async function getMarketingInsights(
  projectId: string
): Promise<MarketingInsights> {
  return apiFetch<MarketingInsights>(
    `/api/projects/${projectId}/insights/marketing`
  );
}

export async function getOperationsInsights(
  projectId: string
): Promise<OperationsInsights> {
  return apiFetch<OperationsInsights>(
    `/api/projects/${projectId}/insights/operations`
  );
}
