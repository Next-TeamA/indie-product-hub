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

export async function connectAccount(provider: string, returnTo?: string): Promise<{ auth_url: string; state: string }> {
  const params = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : "";
  return apiFetch("/api/accounts/connect/" + provider + params);
}

export async function disconnectAccount(id: string): Promise<void> {
  return apiFetch(`/api/accounts/${id}`, { method: "DELETE" });
}

export type GitHubRepo = {
  id: number;
  full_name: string;
  owner: string;
  name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  updated_at: string | null;
};

export type VercelProject = {
  id: string;
  name: string;
  framework: string | null;
  updated_at: number | null;
};

export type RailwayProject = {
  id: string;
  name: string;
  description: string | null;
};

export async function getGitHubSettingsUrl(): Promise<{ url: string }> {
  return apiFetch("/api/accounts/github/settings-url");
}

export type GitHubOrg = {
  login: string;
  avatar_url: string | null;
  is_personal: boolean;
};

export async function listGitHubOrgs(): Promise<GitHubOrg[]> {
  return apiFetch<GitHubOrg[]>("/api/accounts/github/orgs");
}

export async function listGitHubRepos(org?: string): Promise<GitHubRepo[]> {
  const params = org ? `?org=${encodeURIComponent(org)}` : "";
  return apiFetch<GitHubRepo[]>(`/api/accounts/github/repos${params}`);
}

export async function listVercelProjects(): Promise<VercelProject[]> {
  return apiFetch<VercelProject[]>("/api/accounts/vercel/projects");
}

export async function listRailwayProjects(): Promise<RailwayProject[]> {
  return apiFetch<RailwayProject[]>("/api/accounts/railway/projects");
}
