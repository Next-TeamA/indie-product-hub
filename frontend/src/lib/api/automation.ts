import { apiFetch } from "./client";

// --- Optimal Posting Time ---

export type OptimalTimeResult = {
  status: string;
  best_hours: { hour: number; avg_engagement: number }[];
  best_days: { day: string; avg_engagement: number }[];
  recommendation: string;
  total_posts_analyzed: number;
};

export async function getOptimalPostingTime(projectId: string): Promise<OptimalTimeResult> {
  return apiFetch(`/api/projects/${projectId}/automation/optimal-time`);
}

// --- Weekly Report ---

export type WeeklyReport = {
  period: { from: string; to: string };
  metrics: {
    impressions: number;
    likes: number;
    deploys: number;
    deploy_failures: number;
    new_issues: number;
    posts_published: number;
  };
  report: {
    highlights: string[];
    concerns: string[];
    recommendations: string[];
    summary: string;
  };
};

export async function generateWeeklyReport(projectId: string): Promise<WeeklyReport> {
  return apiFetch(`/api/projects/${projectId}/automation/weekly-report`, { method: "POST" });
}

// --- GitHub Issues Sync ---

export type GithubSyncResult = {
  synced: number;
  total_open: number;
  message?: string;
};

export async function syncGithubIssues(projectId: string): Promise<GithubSyncResult> {
  return apiFetch(`/api/projects/${projectId}/automation/sync-github-issues`, { method: "POST" });
}

// --- Deploy Error Analysis ---

export type DeployAnalysis = {
  error_type: string;
  summary: string;
  root_cause: string;
  fix: { file?: string; line?: number; before?: string; after?: string; description?: string };
  severity: string;
  affected_area: string;
  error_trace?: string;
  introduced_by?: { commit: string; description: string } | null;
  files_analyzed?: string[];
  commits_checked?: string[];
};

export async function analyzeDeployError(projectId: string, deployLogId: string): Promise<DeployAnalysis> {
  return apiFetch(`/api/projects/${projectId}/automation/analyze-deploy/${deployLogId}`, { method: "POST" });
}
