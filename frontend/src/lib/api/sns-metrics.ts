import { apiFetch } from "./client";

export type SnsMetricSnapshot = {
  id: string;
  post_id: string;
  project_id: string;
  impressions: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  bookmarks: number;
  url_clicks: number;
  profile_clicks: number;
  views: number;
  snapshot_at: string;
  promotion_posts?: {
    platform: string;
    hook: string;
    content: string;
  };
};

export type XTweetMetrics = {
  tweet_id: string;
  text: string;
  created_at: string;
  impressions: number;
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  bookmarks: number;
  url_clicks: number;
  profile_clicks: number;
  engagement_rate: number;
};

export type XProfileMetrics = {
  user_id: string;
  username: string;
  name: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
};

export type ThreadsPostMetrics = {
  post_id: string;
  text: string;
  created_at: string;
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  shares: number;
  engagement_rate: number;
};

export type ThreadsProfileInsights = {
  views: number;
  likes: number;
  replies: number;
  reposts: number;
  quotes: number;
  followers_count: number;
};

// Stored metrics snapshots
export async function getSnsMetrics(projectId: string, platform?: string): Promise<SnsMetricSnapshot[]> {
  const params: Record<string, string> = {};
  if (platform) params.platform = platform;
  return apiFetch(`/api/projects/${projectId}/sns/metrics`, { params });
}

export async function syncSnsMetrics(projectId: string): Promise<{ status: string }> {
  return apiFetch(`/api/projects/${projectId}/sns/sync`, { method: "POST" });
}

// X live data
export async function getXTweets(projectId: string): Promise<XTweetMetrics[]> {
  return apiFetch(`/api/projects/${projectId}/sns/x/tweets`);
}

export async function getXProfile(projectId: string): Promise<XProfileMetrics> {
  return apiFetch(`/api/projects/${projectId}/sns/x/profile`);
}

// Threads live data
export async function getThreadsPosts(projectId: string): Promise<ThreadsPostMetrics[]> {
  return apiFetch(`/api/projects/${projectId}/sns/threads/posts`);
}

export async function getThreadsProfile(projectId: string): Promise<ThreadsProfileInsights> {
  return apiFetch(`/api/projects/${projectId}/sns/threads/profile`);
}
