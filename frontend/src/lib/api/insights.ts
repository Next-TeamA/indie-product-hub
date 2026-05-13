import { apiFetch } from "./client";

// --- Types (matching backend response) ---

export type MarketingInsights = {
  totals: {
    impressions: number;
    clicks: number;
    likes: number;
    ctr: number;
  };
  changes: Record<string, number>;
  engagement_rate: number;
  best_post: {
    hook: string;
    platform: string;
    tone: string;
    content_type: string;
    impressions: number;
    engagement: number;
  } | null;
  anomalies: { metric: string; change: number; type: string }[];
  by_platform: Record<string, {
    impressions: number;
    clicks: number;
    likes: number;
    replies: number;
    reposts: number;
    views: number;
  }>;
  total_posts: number;
  data_points: number;
  period: { from: string; to: string };
};

export type OperationsInsights = {
  issues: {
    critical_open: number;
    warning_open: number;
    resolved: number;
    total: number;
  };
  deployments: {
    total: number;
    success: number;
    failed: number;
    success_rate: number;
  };
  recent_deployments: {
    id: string;
    platform: string;
    deployment_id: string;
    status: string;
    created_at: string;
  }[];
  recent_issues: {
    title: string;
    severity: string;
    status: string;
    created_at: string;
  }[];
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
