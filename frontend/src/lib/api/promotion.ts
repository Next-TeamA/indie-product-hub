import { apiFetch } from "./client";

// --- Types ---

export type Platform = "threads" | "x" | "bluesky" | "mastodon";
export type PromotionStatus = "draft" | "scheduled" | "published" | "failed";

export type Promotion = {
  id: string;
  project_id: string;
  date: string;         // "YYYY-MM-DD"
  time: string;         // "HH:mm"
  platform: Platform;
  hook: string;
  content: string;
  hashtags: string[];
  link: string | null;
  images: string[];
  status: PromotionStatus;
  created_at: string;
  updated_at: string;
};

export type PromotionCreateInput = {
  project_id: string;
  date: string;
  time: string;
  platform: Platform;
  hook: string;
  content: string;
  hashtags?: string[];
  link?: string | null;
  images?: string[];
  status?: PromotionStatus;
};

export type PromotionUpdateInput = Partial<
  Pick<Promotion, "date" | "time" | "platform" | "hook" | "content" | "hashtags" | "link" | "images" | "status">
>;

// --- API ---

export async function listPromotions(projectId: string): Promise<Promotion[]> {
  return apiFetch<Promotion[]>("/api/promotions", {
    params: { project_id: projectId },
  });
}

export async function createPromotion(data: PromotionCreateInput): Promise<Promotion> {
  return apiFetch<Promotion>("/api/promotions", {
    method: "POST",
    body: data,
  });
}

export async function updatePromotion(id: string, data: PromotionUpdateInput): Promise<Promotion> {
  return apiFetch<Promotion>(`/api/promotions/${id}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deletePromotion(id: string): Promise<void> {
  return apiFetch(`/api/promotions/${id}`, { method: "DELETE" });
}

// --- Project Promotion Info ---

export type ProjectPromotionInfo = {
  project_id: string;
  service_name: string;
  description: string;
  target_user: string;
  key_values: string;
  site_url: string;
  updated_at: string;
};

export type ProjectPromotionInfoUpdateInput = Partial<
  Omit<ProjectPromotionInfo, "project_id" | "updated_at">
>;

export async function getProjectPromotionInfo(projectId: string): Promise<ProjectPromotionInfo> {
  return apiFetch<ProjectPromotionInfo>(`/api/projects/${projectId}/promotion-info`);
}

export async function updateProjectPromotionInfo(
  projectId: string,
  data: ProjectPromotionInfoUpdateInput
): Promise<ProjectPromotionInfo> {
  return apiFetch<ProjectPromotionInfo>(`/api/projects/${projectId}/promotion-info`, {
    method: "PATCH",
    body: data,
  });
}
