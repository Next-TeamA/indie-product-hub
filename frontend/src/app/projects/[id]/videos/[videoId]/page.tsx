"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  Film,
  Clock,
  DollarSign,
  AlertTriangle,
  Download,
} from "lucide-react";
import { useVideo } from "@/hooks/use-videos";
import { VideoStatusBadge } from "@/components/video-status";
import type { VideoScene, SceneStatus } from "@/lib/api/videos";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const SCENE_STATUS_COLOR: Record<SceneStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  generating: "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
  quality_check: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  ready: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  failed: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
};

const SCENE_STATUS_LABEL: Record<SceneStatus, string> = {
  pending: "대기",
  generating: "생성 중",
  quality_check: "확인",
  ready: "완료",
  failed: "실패",
};

export default function VideoDetailPage() {
  const { id: projectId, videoId } = useParams<{
    id: string;
    videoId: string;
  }>();
  const { detail, isLoading, error } = useVideo(projectId, videoId);

  if (isLoading || !detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-muted-foreground">
        {error ? (
          <p className="text-rose-500">{(error as Error).message}</p>
        ) : (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </span>
        )}
      </div>
    );
  }

  const { video, scenes, final_asset } = detail;
  const totalDuration = scenes.reduce(
    (sum, s) => sum + Number(s.duration_seconds || 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <Link
          href={`/projects/${projectId}/videos`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 영상 목록
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {video.title}
          </h1>
          <VideoStatusBadge status={video.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{video.model}</span>
          <span>{video.aspect_ratio}</span>
          {totalDuration > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {totalDuration.toFixed(0)}s
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {Number(video.total_cost_usd).toFixed(3)}
          </span>
          {video.completed_at && (
            <span>
              완료 {new Date(video.completed_at).toLocaleString("ko-KR")}
            </span>
          )}
        </div>

        {video.error_message && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
            <div className="text-sm text-rose-700 dark:text-rose-400">{video.error_message}</div>
          </div>
        )}

        <div className="mt-8">
          {final_asset ? (
            <FinalAssetCard
              url={final_asset.storage_url}
              poster={final_asset.thumbnail_url}
            />
          ) : (
            <ProgressCard percent={video.progress_percent} />
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-base font-bold text-foreground">
            Scenes{" "}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {scenes.length}개
            </span>
          </h2>
          {scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">아직 scene이 없어요.</p>
          ) : (
            <div className="space-y-2">
              {scenes.map((s) => (
                <SceneRow key={s.id} scene={s} />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function FinalAssetCard({
  url,
  poster,
}: {
  url: string;
  poster: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-black shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={url}
        poster={poster ?? undefined}
        controls
        className="aspect-[9/16] w-full bg-black object-contain md:aspect-video"
      />
      <div className="flex items-center justify-between bg-white p-4">
        <span className="text-sm text-muted-foreground">최종 결과물</span>
        <a
          href={url}
          download
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" /> 다운로드
        </a>
      </div>
    </div>
  );
}

function ProgressCard({ percent }: { percent: number }) {
  return (
    <div className="rounded-[24px] border border-border bg-white p-8 text-center shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
      <Film className="mx-auto h-12 w-12 text-muted-foreground" />
      <p className="mt-4 text-sm font-bold text-foreground">생성 중</p>
      <div className="mx-auto mt-4 h-2 max-w-md overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-violet-500 transition-all"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{percent}%</p>
    </div>
  );
}

function SceneRow({ scene }: { scene: VideoScene }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
      <div className="flex items-start gap-3">
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
          #{scene.scene_index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{scene.description}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{Number(scene.duration_seconds).toFixed(0)}s</span>
            {scene.retry_count > 0 && <span>재시도 {scene.retry_count}회</span>}
            {scene.generation_completed_at && (
              <span>
                {new Date(scene.generation_completed_at).toLocaleTimeString(
                  "ko-KR",
                )}
              </span>
            )}
          </div>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-bold",
            SCENE_STATUS_COLOR[scene.status],
          )}
        >
          {SCENE_STATUS_LABEL[scene.status]}
        </span>
      </div>
    </div>
  );
}
