import { apiFetch } from "./client";

export type Alert = {
  id: string;
  user_id: string;
  project_id: string | null;
  alert_type: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

export async function listAlerts(params?: { is_read?: boolean; severity?: string }): Promise<Alert[]> {
  const p: Record<string, string> = {};
  if (params?.is_read !== undefined) p.is_read = String(params.is_read);
  if (params?.severity) p.severity = params.severity;
  return apiFetch<Alert[]>("/api/alerts", { params: p });
}

export async function markAlertRead(id: string): Promise<void> {
  return apiFetch(`/api/alerts/${id}/read`, { method: "PATCH" });
}

export async function markAllAlertsRead(): Promise<void> {
  return apiFetch("/api/alerts/read-all", { method: "POST" });
}
