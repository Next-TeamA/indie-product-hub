import useSWR from "swr";
import {
  listInstallations,
  listInstallationRepos,
  type GithubInstallation,
  type GithubAppRepo,
} from "@/lib/api/github-app";

export function useGithubInstallations(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<GithubInstallation[]>(
    enabled ? "github-app/installations" : null,
    () => listInstallations(),
    { revalidateOnFocus: true },
  );
  return { installations: data ?? [], error, isLoading, mutate };
}

export function useInstallationRepos(installationId: number | null) {
  const { data, error, isLoading, mutate } = useSWR<GithubAppRepo[]>(
    installationId ? `github-app/installations/${installationId}/repos` : null,
    () => listInstallationRepos(installationId!),
    { revalidateOnFocus: false },
  );
  return { repos: data ?? [], error, isLoading, mutate };
}
