import { apiFetch } from "./client";

// --- Types ---

export type PromotionMessage = {
  id: string;
  project_id: string;
  role: string;
  content: string;
  created_at: string;
};

// --- API ---

export async function getPromotionHistory(
  projectId: string
): Promise<PromotionMessage[]> {
  return apiFetch<PromotionMessage[]>(`/api/projects/${projectId}/promotion/history`);
}

export async function generatePromotion(
  projectId: string,
  message: string,
  template?: string
): Promise<PromotionMessage> {
  return apiFetch<PromotionMessage>(`/api/projects/${projectId}/promotion/generate`, {
    method: "POST",
    body: { message, template },
  });
}
