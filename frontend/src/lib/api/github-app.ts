import { apiFetch } from "./client";

export type GithubInstallation = {
  id: string;
  installation_id: number;
  account_login: string;
  account_type: "User" | "Organization" | string;
  account_id: number | null;
  avatar_url: string | null;
  repo_selection: "all" | "selected" | null;
  installed_at: string;
  suspended_at: string | null;
};

export type GithubAppRepo = {
  id: number;
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch: string;
  language: string | null;
  description: string | null;
  updated_at: string | null;
  pushed_at: string | null;
  html_url: string;
};

export async function getInstallUrl(): Promise<{ url: string; state: string; slug: string }> {
  return apiFetch("/api/accounts/github-app/install-url");
}

export async function installCallback(installationId: number, state?: string): Promise<{ ok: boolean }> {
  const params: Record<string, string> = { installation_id: String(installationId) };
  if (state) params.state = state;
  return apiFetch(`/api/accounts/github-app/callback`, {
    method: "POST",
    params,
  });
}

export async function listInstallations(): Promise<GithubInstallation[]> {
  return apiFetch("/api/accounts/github-app/installations");
}

export async function listInstallationRepos(installationId: number): Promise<GithubAppRepo[]> {
  return apiFetch(`/api/accounts/github-app/installations/${installationId}/repos`);
}

export async function removeInstallation(installationId: number): Promise<{ ok: boolean }> {
  return apiFetch(`/api/accounts/github-app/installations/${installationId}`, {
    method: "DELETE",
  });
}

export async function getConfigureUrl(installationId: number): Promise<{ url: string }> {
  return apiFetch(`/api/accounts/github-app/installations/${installationId}/configure-url`);
}
