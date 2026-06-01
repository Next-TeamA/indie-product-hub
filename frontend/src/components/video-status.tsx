import { cn } from "@/lib/utils";
import type { VideoStatus } from "@/lib/api/videos";

const STATUS_META: Record<
  VideoStatus,
  { label: string; bg: string; text: string; pulse?: boolean }
> = {
  planning: { label: "기획 중", bg: "bg-slate-100", text: "text-slate-600" },
  queued: { label: "대기 중", bg: "bg-slate-100", text: "text-slate-600" },
  generating_scenes: {
    label: "장면 생성",
    bg: "bg-violet-50",
    text: "text-violet-600",
    pulse: true,
  },
  generating_audio: {
    label: "오디오 생성",
    bg: "bg-violet-50",
    text: "text-violet-600",
    pulse: true,
  },
  compositing: {
    label: "합성 중",
    bg: "bg-blue-50",
    text: "text-blue-600",
    pulse: true,
  },
  quality_check: {
    label: "품질 확인",
    bg: "bg-blue-50",
    text: "text-blue-600",
    pulse: true,
  },
  ready: { label: "완료", bg: "bg-emerald-50", text: "text-emerald-600" },
  failed: { label: "실패", bg: "bg-rose-50", text: "text-rose-600" },
  human_review: {
    label: "사람 확인 필요",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
};

export function VideoStatusBadge({ status }: { status: VideoStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
        meta.bg,
        meta.text,
      )}
    >
      {meta.pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
              meta.text.replace("text-", "bg-"),
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-full",
              meta.text.replace("text-", "bg-"),
            )}
          />
        </span>
      )}
      {meta.label}
    </span>
  );
}
