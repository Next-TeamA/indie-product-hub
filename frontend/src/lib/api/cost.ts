import { apiFetch } from "./client";

export type CostByService = {
  service: string;
  cost_usd: number;
};

export type CostByDay = {
  date: string; // YYYY-MM-DD
  cost_usd: number;
};

export type CostLedgerRow = {
  id: string;
  service: string;
  operation: string;
  cost_usd: number;
  tokens_used: number | null;
  units_used: number | null;
  related_video_id: string | null;
  related_draft_id: string | null;
  occurred_at: string;
};

export type CostLedgerResponse = {
  window_days: number;
  total_usd: number;
  by_service: CostByService[];
  by_day: CostByDay[];
  recent: CostLedgerRow[];
};

export async function getCostLedger(
  projectId: string,
  days = 30,
): Promise<CostLedgerResponse> {
  return apiFetch<CostLedgerResponse>(
    `/api/projects/${projectId}/cost-ledger`,
    { params: { days: String(days) } },
  );
}
