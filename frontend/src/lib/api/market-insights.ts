import { apiFetch } from "./client";

export type MarketInsight = {
  id: string;
  project_id: string;
  insight_type: "competitor" | "trend" | "news" | "opportunity" | "threat";
  title: string;
  summary: string;
  detail: string | null;
  relevance_score: number;
  is_urgent: boolean;
  urgency_reason: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
};

export async function listMarketInsights(
  projectId: string,
  params?: { is_read?: boolean }
): Promise<MarketInsight[]> {
  const p: Record<string, string> = {};
  if (params?.is_read !== undefined) p.is_read = String(params.is_read);
  return apiFetch<MarketInsight[]>(`/api/projects/${projectId}/insights/market`, { params: p });
}

export async function generateMarketInsights(projectId: string): Promise<{ status: string }> {
  return apiFetch(`/api/projects/${projectId}/insights/market/generate`, { method: "POST" });
}

export async function updateMarketInsight(
  projectId: string,
  insightId: string,
  data: { is_read?: boolean; is_dismissed?: boolean }
): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/insights/market/${insightId}`, {
    method: "PATCH",
    body: data,
  });
}
