import { apiFetch } from "./client";

export type ConnectedAccount = {
  id: string;
  provider: string;
  provider_username: string | null;
  provider_user_id: string;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
};

export async function listAccounts(): Promise<ConnectedAccount[]> {
  return apiFetch<ConnectedAccount[]>("/api/accounts");
}

export async function connectAccount(provider: string): Promise<{ auth_url: string; state: string }> {
  return apiFetch("/api/accounts/connect/" + provider);
}

export async function disconnectAccount(id: string): Promise<void> {
  return apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
}
