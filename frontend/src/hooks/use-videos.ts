import useSWR from "swr";
import {
  listVideos,
  getVideo,
  type VideoSummary,
  type VideoDetail,
  type VideoStatus,
} from "@/lib/api/videos";

const ACTIVE_STATUSES: VideoStatus[] = [
  "planning",
  "queued",
  "generating_scenes",
  "generating_audio",
  "compositing",
  "quality_check",
];

function isActive(v: VideoSummary | undefined | null): boolean {
  return !!v && ACTIVE_STATUSES.includes(v.status);
}

/** List videos. Polls every 5s while any video is still in progress. */
export function useVideos(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<VideoSummary[]>(
    projectId ? `videos/${projectId}` : null,
    () => listVideos(projectId!),
    {
      revalidateOnFocus: false,
      refreshInterval: (latest) => (latest?.some(isActive) ? 5000 : 0),
    },
  );
  return {
    videos: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

/** Single video + scenes. Polls while still generating. */
export function useVideo(projectId: string | null, videoId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<VideoDetail>(
    projectId && videoId ? `video/${projectId}/${videoId}` : null,
    () => getVideo(projectId!, videoId!),
    {
      revalidateOnFocus: false,
      refreshInterval: (latest) => (isActive(latest?.video) ? 3000 : 0),
    },
  );
  return {
    detail: data,
    error,
    isLoading,
    mutate,
  };
}
