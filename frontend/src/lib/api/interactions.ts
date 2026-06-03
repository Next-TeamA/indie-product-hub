import { apiFetch } from "./client";

export type InteractionType = "mention" | "reply" | "dm" | "comment" | "quote";
export type ReplyStatus =
  | "pending"
  | "draft_ready"
  | "approved"
  | "sent"
  | "ignored"
  | "human_handled";

export type Interaction = {
  id: string;
  platform: string;
  interaction_type: InteractionType | string;
  external_id: string;
  sender_username: string;
  sender_profile: Record<string, unknown>;
  content: string;
  classification: string | null;
  priority: "low" | "medium" | "high" | string;
  reply_status: ReplyStatus | string;
  reply_sent_at: string | null;
  draft_reply: string | null;
  detected_at: string;
};

export async function listInteractions(
  projectId: string,
  opts: { replyStatus?: ReplyStatus; limit?: number } = {},
): Promise<Interaction[]> {
  const params: Record<string, string> = {};
  if (opts.replyStatus) params.reply_status = opts.replyStatus;
  if (opts.limit) params.limit = String(opts.limit);
  return apiFetch<Interaction[]>(
    `/api/projects/${projectId}/interactions`,
    { params },
  );
}
