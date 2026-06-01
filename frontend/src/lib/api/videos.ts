import { apiFetch } from "./client";

export type VideoStatus =
  | "planning"
  | "queued"
  | "generating_scenes"
  | "generating_audio"
  | "compositing"
  | "quality_check"
  | "ready"
  | "failed"
  | "human_review";

export type VideoSummary = {
  id: string;
  title: string;
  status: VideoStatus;
  progress_percent: number;
  model: string;
  aspect_ratio: string;
  total_duration_seconds: number | null;
  total_cost_usd: number;
  final_asset_id: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type SceneStatus = "pending" | "generating" | "quality_check" | "ready" | "failed";

export type VideoScene = {
  id: string;
  scene_index: number;
  description: string;
  duration_seconds: number;
  prompt: string | null;
  asset_id: string | null;
  status: SceneStatus;
  retry_count: number;
  generation_started_at: string | null;
  generation_completed_at: string | null;
};

export type FinalAsset = {
  id: string;
  storage_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
} | null;

export type VideoDetail = {
  video: VideoSummary & {
    script: unknown;
    narration_text: string | null;
    workflow_run_id: string | null;
  };
  scenes: VideoScene[];
  final_asset: FinalAsset;
};

export async function listVideos(
  projectId: string,
  opts: { status?: VideoStatus; limit?: number } = {},
): Promise<VideoSummary[]> {
  const params: Record<string, string> = {};
  if (opts.status) params.status = opts.status;
  if (opts.limit) params.limit = String(opts.limit);
  return apiFetch<VideoSummary[]>(
    `/api/projects/${projectId}/videos`,
    { params },
  );
}

export async function getVideo(
  projectId: string,
  videoId: string,
): Promise<VideoDetail> {
  return apiFetch<VideoDetail>(
    `/api/projects/${projectId}/videos/${videoId}`,
  );
}
