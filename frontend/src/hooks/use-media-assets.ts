import useSWR from "swr";
import {
  listMediaAssets,
  type MediaAsset,
  type MediaAssetType,
} from "@/lib/api/media";

export function useMediaAssets(
  projectId: string | null,
  opts: { assetType?: MediaAssetType; limit?: number } = {},
) {
  const key = projectId
    ? `media-assets/${projectId}/${opts.assetType ?? "all"}/${opts.limit ?? 60}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<MediaAsset[]>(
    key,
    () => listMediaAssets(projectId!, opts),
    { revalidateOnFocus: false },
  );
  return {
    assets: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
