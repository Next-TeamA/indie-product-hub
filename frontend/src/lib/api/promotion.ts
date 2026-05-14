import { apiFetch } from "./client";

// --- Types (matching backend promotion_posts table) ---

export type Platform = "threads" | "x" | "bluesky" | "mastodon";
export type PromotionStatus = "draft" | "scheduled" | "publishing" | "published" | "failed";

export type Promotion = {
  id: string;
  project_id: string;
  user_id: string;
  platform: Platform;
  hook: string;
  content: string;
  hashtags: string[];
  link: string | null;
  images: string[];
  ai_prompt: string | null;
  ai_model: string | null;
  tone: string | null;
  content_type: string | null;
  status: PromotionStatus;
  scheduled_at: string | null;
  published_at: string | null;
  external_post_id: string | null;
  publish_error: string | null;
  campaign_id?: string | null;
  campaign_day?: number | null;
  campaign_meta?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Computed for calendar view
  date: string;
  time: string;
};

export type PromotionCreateInput = {
  platform: Platform;
  hook?: string;
  content: string;
  hashtags?: string[];
  link?: string | null;
  images?: string[] | null;
  tone?: string;
  content_type?: string;
  scheduled_at?: string | null;
};

export type PromotionGenerateInput = {
  message: string;
  template?: string;
};

export type PromotionCampaignInput = {
  project_name: string;
  one_line_description: string;
  target_user: string;
  problem: string;
  core_value: string;
  main_features: string;
  promotion_goal: string;
  channel: "threads";
  tone_preference: string;
  additional_context: string;
};

export type PromotionCampaignResult = {
  campaign: {
    id: string;
    project_id: string;
    user_id: string;
    input: PromotionCampaignInput;
    target_analysis: Record<string, unknown>;
    campaign_strategy: Record<string, unknown>;
    final_calendar: Record<string, unknown>[];
    status: "generating" | "completed" | "failed";
    created_at: string;
    updated_at: string;
  };
  posts: Promotion[];
};

// --- Promotion Posts API ---

export async function listPromotions(projectId: string): Promise<Promotion[]> {
  const posts = await apiFetch<Promotion[]>(`/api/projects/${projectId}/promotion/posts`);
  // Use scheduled_at for calendar display when available
  return posts.map(p => {
    const ref = p.scheduled_at ?? p.created_at ?? "";
    return {
      ...p,
      date: ref.split("T")[0] ?? "",
      time: ref.split("T")[1]?.slice(0, 5) ?? "",
    };
  });
}

export async function createPromotion(projectId: string, data: PromotionCreateInput): Promise<Promotion> {
  return apiFetch<Promotion>(`/api/projects/${projectId}/promotion/posts`, {
    method: "POST",
    body: data,
  });
}

export async function updatePromotion(projectId: string, postId: string, data: Partial<PromotionCreateInput>): Promise<Promotion> {
  return apiFetch<Promotion>(`/api/projects/${projectId}/promotion/posts/${postId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePromotion(projectId: string, postId: string): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/promotion/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function publishPromotion(projectId: string, postId: string): Promise<{ status: string; post_id: string }> {
  return apiFetch(`/api/projects/${projectId}/promotion/posts/${postId}/publish`, {
    method: "POST",
  });
}

export async function activateScheduledPromotions(projectId: string): Promise<{ updated: number }> {
  return apiFetch(`/api/projects/${projectId}/promotion/posts/activate-scheduled`, {
    method: "POST",
  });
}

// --- AI Generation ---

export async function generatePromotion(projectId: string, data: PromotionGenerateInput): Promise<{
  message: { id: string; role: string; content: string; created_at: string };
  generated: { hook: string; content: string; hashtags: string[] };
}> {
  return apiFetch(`/api/projects/${projectId}/promotion/generate`, {
    method: "POST",
    body: data,
  });
}

export async function getPromotionHistory(projectId: string): Promise<{
  id: string;
  role: string;
  content: string;
  created_at: string;
}[]> {
  return apiFetch(`/api/projects/${projectId}/promotion/history`);
}

export async function createPromotionCampaign(
  projectId: string,
  data: PromotionCampaignInput,
): Promise<PromotionCampaignResult> {
  return apiFetch(`/api/projects/${projectId}/promotion/campaigns`, {
    method: "POST",
    body: data,
  });
}

// --- Project Promotion Info ---

export type ProjectPromotionInfo = {
  project_id: string;
  service_name: string;
  description: string;
  target_user: string;
  key_values: string;
  site_url: string;
  default_hashtags: string[];
  tone_preference: string;
  logo_url: string | null;
  updated_at: string;
  connected_accounts?: Platform[];
};

export type ProjectPromotionInfoUpdateInput = Partial<
  Omit<ProjectPromotionInfo, "project_id" | "updated_at">
>;

export async function getProjectPromotionInfo(projectId: string): Promise<ProjectPromotionInfo> {
  return apiFetch<ProjectPromotionInfo>(`/api/projects/${projectId}/promotion/info`);
}

export async function updateProjectPromotionInfo(
  projectId: string,
  data: ProjectPromotionInfoUpdateInput
): Promise<ProjectPromotionInfo> {
  return apiFetch<ProjectPromotionInfo>(`/api/projects/${projectId}/promotion/info`, {
    method: "PUT",
    body: data,
  });
}
