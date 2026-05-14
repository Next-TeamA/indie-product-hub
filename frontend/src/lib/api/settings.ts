import { apiFetch } from "./client";

// ─── Profile ───────────────────────────────────────────────

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
};

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/api/settings/profile");
}

export async function updateProfile(data: { name?: string }): Promise<void> {
  await apiFetch("/api/settings/profile", { method: "PATCH", body: data });
}

// ─── Notifications ─────────────────────────────────────────

export type NotificationPrefs = {
  deploy: boolean;
  issue: boolean;
  weekly_report: boolean;
  security: boolean;
  marketing: boolean;
};

export async function getNotifications(): Promise<NotificationPrefs> {
  return apiFetch<NotificationPrefs>("/api/settings/notifications");
}

export async function updateNotifications(data: NotificationPrefs): Promise<void> {
  await apiFetch("/api/settings/notifications", { method: "PATCH", body: data });
}

// ─── API Keys ──────────────────────────────────────────────

export type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
};

export type ApiKeyCreated = ApiKey & { key: string };

export async function listApiKeys(): Promise<ApiKey[]> {
  return apiFetch<ApiKey[]>("/api/settings/api-keys");
}

export async function createApiKey(name: string): Promise<ApiKeyCreated> {
  return apiFetch<ApiKeyCreated>("/api/settings/api-keys", {
    method: "POST",
    body: { name },
  });
}

export async function deleteApiKey(id: string): Promise<void> {
  await apiFetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
}
