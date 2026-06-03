"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import {
  Workflow,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
  Inbox,
  X,
  MessageSquare,
  Film,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import {
  useAmpRuns,
  useAmpApprovals,
  useAmpActions,
} from "@/hooks/use-amp";
import { useInteractions } from "@/hooks/use-interactions";
import type {
  AmpGraph,
  Approval,
  Channel,
  WorkflowRun,
  WorkflowStatus,
} from "@/lib/api/amp";
import type { Interaction } from "@/lib/api/interactions";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const GRAPH_LABEL: Record<AmpGraph, string> = {
  content_creation: "콘텐츠 생성",
  engagement: "인게이지먼트",
  video_production: "영상 생성",
};

const GRAPH_DESC: Record<AmpGraph, string> = {
  content_creation: "주제·채널·톤을 입력하면 페르소나 적용된 카피 자동 생성",
  engagement: "받은 멘션/답글에 페르소나 적용된 답글 초안 생성",
  video_production: "영상 페이지에서 brief·길이·모델 입력 후 생성",
};

const GRAPH_CTA: Record<AmpGraph, string> = {
  content_creation: "주제 입력하고 실행",
  engagement: "답할 멘션 고르기",
  video_production: "영상 페이지로",
};

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "x", label: "X" },
  { id: "threads", label: "Threads" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
];

const RUN_STATUS_META: Record<
  WorkflowStatus,
  { label: string; bg: string; text: string; pulse?: boolean }
> = {
  running: {
    label: "실행 중",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-600 dark:text-violet-400",
    pulse: true,
  },
  paused_awaiting_approval: {
    label: "승인 대기",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-600 dark:text-amber-400",
  },
  completed: {
    label: "완료",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  failed: {
    label: "실패",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-600 dark:text-rose-400",
  },
  cancelled: { label: "취소", bg: "bg-muted", text: "text-muted-foreground" },
};

export default function AmpPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const { runs, isLoading: runsLoading, mutate: mutateRuns } =
    useAmpRuns(projectId);
  const {
    approvals,
    isLoading: approvalsLoading,
    mutate: mutateApprovals,
  } = useAmpActionsHook(projectId);
  const ampActions = useAmpActions(projectId);

  const [contentOpen, setContentOpen] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [running, setRunning] = useState<AmpGraph | null>(null);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideMsg, setDecideMsg] = useState<string | null>(null);

  function onCardClick(graph: AmpGraph) {
    if (running) return;
    setRunMsg(null);
    if (graph === "content_creation") {
      setContentOpen(true);
    } else if (graph === "engagement") {
      setMentionOpen(true);
    } else if (graph === "video_production") {
      router.push(`/projects/${projectId}/videos`);
    }
  }

  async function runContent(payload: {
    topic: string;
    channels: Channel[];
    audience?: string;
    tone?: string;
    image_needed?: boolean;
  }) {
    setRunning("content_creation");
    setRunMsg(null);
    try {
      const r = await ampActions.run({
        graph: "content_creation",
        trigger_type: "manual",
        payload,
      });
      reportRun("content_creation", r.status, asRunDetail(r));
    } catch (e) {
      setRunMsg(e instanceof Error ? `실행 실패: ${e.message}` : "실행 실패");
    } finally {
      setRunning(null);
      setContentOpen(false);
    }
  }

  async function runEngagement(interaction: Interaction) {
    setRunning("engagement");
    setRunMsg(null);
    try {
      const r = await ampActions.run({
        graph: "engagement",
        trigger_type: "manual",
        payload: { interaction_id: interaction.id },
      });
      reportRun("engagement", r.status, asRunDetail(r));
    } catch (e) {
      setRunMsg(e instanceof Error ? `실행 실패: ${e.message}` : "실행 실패");
    } finally {
      setRunning(null);
      setMentionOpen(false);
    }
  }

  function reportRun(graph: AmpGraph, status: string, detail: string | null) {
    setRunMsg(
      `${GRAPH_LABEL[graph]} 실행: ${status}${detail ? ` -- ${detail}` : ""}`,
    );
    mutateRuns();
    mutateApprovals();
  }

  async function onDecide(approvalId: string, decision: "approved" | "rejected") {
    if (decidingId) return;
    setDecidingId(approvalId);
    setDecideMsg(null);
    try {
      const r = await ampActions.decide(approvalId, decision);
      const resume = r.resume as
        | { status?: string; reason?: string; error?: string }
        | null;
      const resumeStatus = resume?.status ?? "?";
      const detail = resume?.reason || resume?.error || "";
      setDecideMsg(
        `${decision === "approved" ? "승인" : "거절"} 완료. 그래프 재개 상태: ${resumeStatus}${
          detail ? ` (${detail})` : ""
        }. 결과는 아래 "최근 실행"에서 확인하세요.`,
      );
      mutateApprovals();
      mutateRuns();
    } catch (e) {
      setDecideMsg(e instanceof Error ? `실패: ${e.message}` : "처리 실패");
    } finally {
      setDecidingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          AMP 자율 마케팅
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          페르소나 적용된 LangGraph 워크플로우. 콘텐츠는 주제만 입력하면 채널별
          카피, 인게이지먼트는 받은 멘션에 답글 초안.
        </p>
      </motion.div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-foreground">
          워크플로우 실행
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(Object.keys(GRAPH_LABEL) as AmpGraph[]).map((g) => {
            const Icon =
              g === "video_production"
                ? Film
                : g === "engagement"
                  ? MessageSquare
                  : Sparkles;
            const isRunning = running === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => onCardClick(g)}
                disabled={!!running}
                className={cn(
                  "rounded-[24px] border border-border bg-card p-5 text-left shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] transition-all",
                  isRunning
                    ? "ring-2 ring-violet-300"
                    : !running && "hover:-translate-y-0.5 hover:border-foreground/30",
                  running && !isRunning && "opacity-50",
                )}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-violet-500" />
                  <span className="text-sm font-bold text-foreground">
                    {GRAPH_LABEL[g]}
                  </span>
                </div>
                <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
                  {GRAPH_DESC[g]}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                    isRunning
                      ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> 실행 중
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3" /> {GRAPH_CTA[g]}
                    </>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {runMsg && (
          <p className="mt-3 text-sm text-muted-foreground">{runMsg}</p>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
          <Inbox className="h-4 w-4" /> 승인 대기
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {approvals.length}개
          </span>
        </h2>
        {decideMsg && (
          <p className="mb-3 text-sm text-muted-foreground">{decideMsg}</p>
        )}
        {approvalsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </div>
        ) : approvals.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            처리할 승인이 없어요.
          </div>
        ) : (
          <ul className="space-y-3">
            {approvals.map((a) => (
              <ApprovalRow
                key={a.id}
                approval={a}
                deciding={decidingId === a.id}
                onDecide={onDecide}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-foreground">
          최근 실행 (최대 30)
        </h2>
        {runsLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">실행 이력이 없어요.</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => (
              <RunRow key={r.id} projectId={projectId} run={r} />
            ))}
          </div>
        )}
      </section>

      <AnimatePresence>
        {contentOpen && (
          <ContentCreationModal
            onCancel={() => setContentOpen(false)}
            onSubmit={runContent}
            submitting={running === "content_creation"}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mentionOpen && (
          <MentionPickerDrawer
            projectId={projectId}
            onCancel={() => setMentionOpen(false)}
            onPick={runEngagement}
            submitting={running === "engagement"}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function asRunDetail(r: { workflow_run_id?: string; paused_at?: string; error?: string }): string | null {
  if (r.error) return r.error;
  if (r.paused_at) return `paused at ${r.paused_at}`;
  if (r.workflow_run_id) return `run ${r.workflow_run_id.slice(0, 8)}`;
  return null;
}

// ============================================================
// Approval card
// ============================================================

type DraftLike = {
  channel?: string;
  hook?: string;
  content?: string;
  text?: string;
};

function ApprovalRow({
  approval,
  deciding,
  onDecide,
}: {
  approval: Approval;
  deciding: boolean;
  onDecide: (id: string, d: "approved" | "rejected") => void;
}) {
  return (
    <li className="rounded-[24px] border border-amber-100 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/40 p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" />
            {approval.item_type ?? approval.approval_type ?? "approval"}
            {approval.ai_recommendation && (
              <span className="ml-1 normal-case tracking-normal text-muted-foreground">
                · AI: {approval.ai_recommendation}
              </span>
            )}
          </div>
          <ApprovalBody approval={approval} />
          <div className="mt-2 text-xs text-muted-foreground">
            {new Date(approval.created_at).toLocaleString("ko-KR")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDecide(approval.id, "rejected")}
            disabled={deciding}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" /> 거절
          </button>
          <button
            type="button"
            onClick={() => onDecide(approval.id, "approved")}
            disabled={deciding}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {deciding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}{" "}
            승인
          </button>
        </div>
      </div>
    </li>
  );
}

function ApprovalBody({ approval }: { approval: Approval }) {
  const ctx = (approval.context ?? approval.payload) as
    | {
        drafts?: DraftLike[];
        strategy?: { channels?: string[]; reasoning?: string; topic?: string; tone_hint?: string };
        risk?: { level?: string; reasons?: string[] };
      }
    | null
    | undefined;

  if (!ctx || (typeof ctx === "object" && Object.keys(ctx).length === 0)) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        백엔드가 보낸 컨텍스트가 비어 있어요.
      </p>
    );
  }

  const drafts = Array.isArray(ctx.drafts) ? ctx.drafts : [];
  const strategy = ctx.strategy;
  const risk = ctx.risk;

  return (
    <div className="mt-2 space-y-2">
      {strategy && (strategy.channels?.length || strategy.reasoning || strategy.topic) && (
        <div className="rounded-xl bg-card px-3 py-2 text-xs">
          <div className="font-bold text-foreground">전략</div>
          {strategy.topic && (
            <div className="text-muted-foreground">주제: {strategy.topic}</div>
          )}
          {strategy.channels?.length ? (
            <div className="text-muted-foreground">
              채널: {strategy.channels.join(", ")}
            </div>
          ) : null}
          {strategy.tone_hint && (
            <div className="text-muted-foreground">톤: {strategy.tone_hint}</div>
          )}
          {strategy.reasoning && (
            <div className="text-muted-foreground">{strategy.reasoning}</div>
          )}
        </div>
      )}
      {risk && (risk.level || risk.reasons?.length) && (
        <div className="rounded-xl bg-card px-3 py-2 text-xs">
          <div className="font-bold text-foreground">리스크: {risk.level ?? "?"}</div>
          {risk.reasons?.length ? (
            <ul className="ml-4 list-disc text-muted-foreground">
              {risk.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
      {drafts.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs font-bold text-foreground">초안 {drafts.length}개</div>
          {drafts.map((d, i) => (
            <div key={i} className="rounded-xl bg-card px-3 py-2 text-xs">
              {d.channel && (
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {d.channel}
                </div>
              )}
              {d.hook && <div className="font-bold text-foreground">{d.hook}</div>}
              <pre className="whitespace-pre-wrap text-foreground">
                {d.content ?? d.text ?? ""}
              </pre>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          생성된 초안이 없어요. 그래프가 strategy 단계까지만 가서 멈춘 것 같습니다.
        </p>
      )}
    </div>
  );
}

function RunRow({ projectId, run }: { projectId: string; run: WorkflowRun }) {
  const meta = RUN_STATUS_META[run.status];
  return (
    <Link
      href={`/projects/${projectId}/amp/runs/${run.id}`}
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] transition-colors hover:border-foreground/30"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            {GRAPH_LABEL[run.graph_name as AmpGraph] ?? run.graph_name}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              meta.bg,
              meta.text,
            )}
          >
            {meta.pulse && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {meta.label}
          </span>
          {run.current_node && (
            <span className="text-xs text-muted-foreground">
              · {run.current_node}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{new Date(run.started_at).toLocaleString("ko-KR")}</span>
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {Number(run.cost_usd).toFixed(3)}
          </span>
        </div>
        {run.error_message && (
          <p className="mt-1 text-xs text-rose-500">{run.error_message}</p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}

// ============================================================
// Content creation modal
// ============================================================

function ContentCreationModal({
  onCancel,
  onSubmit,
  submitting,
}: {
  onCancel: () => void;
  onSubmit: (payload: {
    topic: string;
    channels: Channel[];
    audience?: string;
    tone?: string;
    image_needed?: boolean;
  }) => void;
  submitting: boolean;
}) {
  const [topic, setTopic] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["x", "threads"]);
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [imageNeeded, setImageNeeded] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggleChannel(c: Channel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  }

  function submit() {
    setErr(null);
    if (!topic.trim()) {
      setErr("주제를 입력하세요");
      return;
    }
    if (channels.length === 0) {
      setErr("채널을 1개 이상 선택하세요");
      return;
    }
    onSubmit({
      topic: topic.trim(),
      channels,
      audience: audience.trim() || undefined,
      tone: tone.trim() || undefined,
      image_needed: imageNeeded,
    });
  }

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
        className="w-full max-w-xl rounded-[24px] bg-card p-6 shadow-2xl md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">콘텐츠 생성</h2>
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
          <Field label="주제 (필수)">
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={2}
              placeholder="예: v2 출시 알림 -- 자동 배포가 핵심 변경점"
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
            />
          </Field>

          <Field label="채널 (1개 이상)">
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const active = channels.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleChannel(c.id)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="타겟 (선택)">
              <input
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="예: 1인 SaaS 개발자"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
              />
            </Field>
            <Field label="톤 힌트 (선택)">
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="예: 차분하고 솔직하게"
                className="w-full rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={imageNeeded}
              onChange={(e) => setImageNeeded(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            이미지 자동 생성 (asset_gen)
          </label>

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
            onClick={submit}
            disabled={submitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-colors",
              submitting
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            실행
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Mention picker drawer
// ============================================================

function MentionPickerDrawer({
  projectId,
  onCancel,
  onPick,
  submitting,
}: {
  projectId: string;
  onCancel: () => void;
  onPick: (interaction: Interaction) => void;
  submitting: boolean;
}) {
  const { interactions, isLoading } = useInteractions(projectId, {
    replyStatus: "pending",
    limit: 50,
  });

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
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-[24px] bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="text-lg font-bold text-foreground">답할 멘션 고르기</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              reply_status = pending 인터랙션만 표시
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
            </div>
          ) : interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              처리 대기 중인 인터랙션이 없어요. webhook으로 새 멘션이 들어오면
              여기에 표시됩니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {interactions.map((it) => (
                <li
                  key={it.id}
                  className="rounded-2xl border border-border bg-background p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2 py-0.5 font-bold uppercase tracking-wider text-muted-foreground">
                        {it.platform}
                      </span>
                      <span className="font-medium text-foreground">
                        @{it.sender_username}
                      </span>
                      <span className="text-muted-foreground">
                        · {it.interaction_type}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onPick(it)}
                      disabled={submitting}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {submitting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      답글 생성
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-3 text-sm text-foreground">
                    {it.content}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Small bits
// ============================================================

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

// useAmpApprovals를 useAmpActionsHook로 wrap (이름 충돌 회피용)
function useAmpActionsHook(projectId: string | null) {
  return useAmpApprovals(projectId);
}
