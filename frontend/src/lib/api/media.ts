import { apiFetch } from "./client";

export type MediaAssetType = "image" | "video" | "audio" | "gif";

export type MediaAsset = {
  id: string;
  asset_type: MediaAssetType;
  source: "user_upload" | "screenshot" | "ai_generated" | "stock";
  ai_model: string | null;
  storage_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  cost_usd: number;
  quality_score: number | null;
  created_at: string;
};

export async function listMediaAssets(
  projectId: string,
  opts: { assetType?: MediaAssetType; limit?: number } = {},
): Promise<MediaAsset[]> {
  const params: Record<string, string> = {};
  if (opts.assetType) params.asset_type = opts.assetType;
  if (opts.limit) params.limit = String(opts.limit);
  return apiFetch<MediaAsset[]>(
    `/api/projects/${projectId}/media-assets`,
    { params },
  );
}
