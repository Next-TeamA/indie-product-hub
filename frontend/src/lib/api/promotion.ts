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
  tone?: string;
  content_type?: string;
};

export type PromotionGenerateInput = {
  message: string;
  template?: string;
};

// --- Promotion Posts API ---

export async function listPromotions(projectId: string): Promise<Promotion[]> {
  const posts = await apiFetch<Promotion[]>(`/api/projects/${projectId}/promotion/posts`);
  // Add date/time fields for calendar compatibility
  return posts.map(p => ({
    ...p,
    date: p.created_at?.split("T")[0] ?? "",
    time: p.created_at?.split("T")[1]?.slice(0, 5) ?? "",
  }));
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
