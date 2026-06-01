"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Loader2,
  Film,
  X,
  Clock,
  DollarSign,
} from "lucide-react";
import { useVideos } from "@/hooks/use-videos";
import { useAmpActions } from "@/hooks/use-amp";
import { VideoStatusBadge } from "@/components/video-status";
import type { VideoSummary } from "@/lib/api/videos";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

type NewVideoForm = {
  title: string;
  brief: string;
  duration: number;
  aspect: "9:16" | "16:9" | "1:1";
  model: "kling-3.0" | "kling-1.6-pro" | "veo-3";
};

const DEFAULT_FORM: NewVideoForm = {
  title: "",
  brief: "",
  duration: 5,
  aspect: "9:16",
  model: "kling-3.0",
};

export default function VideosPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { videos, isLoading, mutate } = useVideos(projectId);
  const ampActions = useAmpActions(projectId);

  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<NewVideoForm>(DEFAULT_FORM);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  async function onCreate() {
    if (submitting) return;
    if (!form.title.trim() || !form.brief.trim()) {
      setSubmitErr("제목과 brief를 입력하세요");
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    try {
      await ampActions.run({
        graph: "video_production",
        trigger_type: "manual",
        payload: {
          title: form.title.trim(),
          brief: form.brief.trim(),
          duration_seconds: form.duration,
          aspect_ratio: form.aspect,
          model: form.model,
        },
      });
      setForm(DEFAULT_FORM);
      setCreating(false);
      mutate();
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : "영상 생성 트리거 실패");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8 flex items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">
            영상
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            AI가 만든 마케팅 영상 모음. AMP 워크플로우가 자동으로 만들거나,
            여기서 직접 트리거할 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> 새 영상
        </button>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
        </div>
      ) : videos.length === 0 ? (
        <EmptyState onCreate={() => setCreating(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard key={v.id} projectId={projectId} video={v} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {creating && (
          <NewVideoModal
            form={form}
            setForm={setForm}
            submitting={submitting}
            err={submitErr}
            onCancel={() => {
              setCreating(false);
              setSubmitErr(null);
            }}
            onSubmit={onCreate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function VideoCard({
  projectId,
  video,
}: {
  projectId: string;
  video: VideoSummary;
}) {
  return (
    <Link
      href={`/projects/${projectId}/videos/${video.id}`}
      className="group block overflow-hidden rounded-[24px] border border-border bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-0.5"
    >
      <div className="relative flex aspect-[9/16] items-center justify-center bg-gradient-to-br from-muted to-muted sm:aspect-video">
        <Film className="h-10 w-10 text-muted-foreground transition-transform group-hover:scale-110" />
        {video.status !== "ready" && (
          <div className="absolute inset-0 flex items-end p-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/60">
              <div
                className="h-full rounded-full bg-violet-500 transition-all"
                style={{ width: `${video.progress_percent}%` }}
              />
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold text-foreground">
            {video.title}
          </h3>
          <VideoStatusBadge status={video.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{video.model}</span>
          <span>{video.aspect_ratio}</span>
          {video.total_duration_seconds && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {Number(video.total_duration_seconds).toFixed(0)}s
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {Number(video.total_cost_usd).toFixed(2)}
          </span>
        </div>
        {video.error_message && (
          <p className="line-clamp-2 text-xs text-rose-500">
            {video.error_message}
          </p>
        )}
      </div>
    </Link>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-[24px] border border-dashed border-border bg-white p-12 text-center">
      <Film className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-4 text-base font-bold text-foreground">
        아직 영상이 없어요
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        새 영상을 만들거나 AMP 워크플로우가 자동으로 만들 때까지 기다리세요.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4" /> 새 영상 만들기
      </button>
    </div>
  );
}

function NewVideoModal({
  form,
  setForm,
  submitting,
  err,
  onCancel,
  onSubmit,
}: {
  form: NewVideoForm;
  setForm: (f: NewVideoForm) => void;
  submitting: boolean;
  err: string | null;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 dark:bg-black/60 p-4 backdrop-blur-sm md:items-center"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
        className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">새 영상 만들기</h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Field label="제목">
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 새 기능 출시 알림"
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
            />
          </Field>

          <Field label="Brief (AI가 시나리오 만들 때 참고)">
            <textarea
              value={form.brief}
              onChange={(e) => setForm({ ...form, brief: e.target.value })}
              rows={3}
              placeholder="예: 우리 제품의 자동 배포 기능을 강조하는 짧은 홍보 영상"
              className="w-full resize-none rounded-2xl border border-border px-4 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="길이(초)">
              <input
                type="number"
                min={3}
                max={30}
                value={form.duration}
                onChange={(e) =>
                  setForm({
                    ...form,
                    duration: Math.max(
                      3,
                      Math.min(30, Number(e.target.value) || 5),
                    ),
                  })
                }
                className="w-full rounded-2xl border border-border px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              />
            </Field>
            <Field label="비율">
              <select
                value={form.aspect}
                onChange={(e) =>
                  setForm({
                    ...form,
                    aspect: e.target.value as NewVideoForm["aspect"],
                  })
                }
                className="w-full rounded-2xl border border-border px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
              </select>
            </Field>
            <Field label="모델">
              <select
                value={form.model}
                onChange={(e) =>
                  setForm({
                    ...form,
                    model: e.target.value as NewVideoForm["model"],
                  })
                }
                className="w-full rounded-2xl border border-border px-3 py-2.5 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="kling-3.0">kling-3.0</option>
                <option value="kling-1.6-pro">kling-1.6-pro</option>
                <option value="veo-3">veo-3</option>
              </select>
            </Field>
          </div>

          {err && <p className="text-sm text-rose-500">{err}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors",
              submitting
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            만들기
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
