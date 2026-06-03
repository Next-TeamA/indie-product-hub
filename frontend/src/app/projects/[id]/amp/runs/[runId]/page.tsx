"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  DollarSign,
  Clock,
  Workflow,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAmpRun, useAmpActions } from "@/hooks/use-amp";
import type { WorkflowStatus, AmpGraph } from "@/lib/api/amp";
import { useState } from "react";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const GRAPH_LABEL: Record<AmpGraph, string> = {
  content_creation: "콘텐츠 생성",
  engagement: "인게이지먼트",
  video_production: "영상 생성",
};

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

type DraftLike = {
  channel?: string;
  hook?: string;
  content?: string;
  text?: string;
  hashtags?: string[];
};

export default function RunDetailPage() {
  const { id: projectId, runId } = useParams<{ id: string; runId: string }>();
  const { run, approvals, isLoading, error, mutate } = useAmpRun(projectId, runId);
  const ampActions = useAmpActions(projectId);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideMsg, setDecideMsg] = useState<string | null>(null);

  async function decide(approvalId: string, decision: "approved" | "rejected") {
    if (decidingId) return;
    setDecidingId(approvalId);
    setDecideMsg(null);
    try {
      const r = await ampActions.decide(approvalId, decision);
      const resume = r.resume as { status?: string; reason?: string } | null;
      setDecideMsg(
        `${decision === "approved" ? "승인" : "거절"} 완료. 그래프 재개: ${resume?.status ?? "?"}${
          resume?.reason ? ` (${resume.reason})` : ""
        }`,
      );
      mutate();
    } catch (e) {
      setDecideMsg(e instanceof Error ? `실패: ${e.message}` : "처리 실패");
    } finally {
      setDecidingId(null);
    }
  }

  if (isLoading || !run) {
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

  const meta = RUN_STATUS_META[run.status];
  const state = (run.state_snapshot ?? {}) as {
    strategy?: {
      should_publish?: boolean;
      channels?: string[];
      format?: string;
      topic?: string;
      tone_hint?: string;
      reasoning?: string;
    };
    drafts?: DraftLike[];
    risk?: { level?: string; reasons?: string[] };
    publish_results?: { channel?: string; status?: string; url?: string; error?: string }[];
    requires_approval?: boolean;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <Link
          href={`/projects/${projectId}/amp`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> AMP
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <Workflow className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {GRAPH_LABEL[run.graph_name as AmpGraph] ?? run.graph_name}
          </h1>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
              meta.bg,
              meta.text,
            )}
          >
            {meta.pulse && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {meta.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {run.current_node && <span>현재 노드: {run.current_node}</span>}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(run.started_at).toLocaleString("ko-KR")}
          </span>
          <span className="inline-flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {Number(run.cost_usd).toFixed(4)} USD
          </span>
        </div>

        {run.error_message && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-500" />
            <div className="text-sm text-rose-700 dark:text-rose-400">
              {run.error_message}
            </div>
          </div>
        )}

        {/* 전략 */}
        {state.strategy && (
          <Section title="전략">
            <KV k="발행 여부" v={state.strategy.should_publish ? "예" : "아니오"} />
            {state.strategy.topic && <KV k="주제" v={state.strategy.topic} />}
            {state.strategy.channels?.length ? (
              <KV k="채널" v={state.strategy.channels.join(", ")} />
            ) : null}
            {state.strategy.format && <KV k="포맷" v={state.strategy.format} />}
            {state.strategy.tone_hint && (
              <KV k="톤" v={state.strategy.tone_hint} />
            )}
            {state.strategy.reasoning && (
              <KV k="판단 근거" v={state.strategy.reasoning} />
            )}
          </Section>
        )}

        {/* 리스크 */}
        {state.risk && (state.risk.level || state.risk.reasons?.length) && (
          <Section title="리스크">
            <KV k="레벨" v={state.risk.level ?? "?"} />
            {state.risk.reasons?.length ? (
              <div className="text-sm">
                <span className="text-muted-foreground">이유:</span>
                <ul className="ml-4 mt-1 list-disc text-foreground">
                  {state.risk.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Section>
        )}

        {/* 초안 */}
        {state.drafts && state.drafts.length > 0 && (
          <Section title={`초안 (${state.drafts.length}개)`}>
            <div className="space-y-3">
              {state.drafts.map((d, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  {d.channel && (
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {d.channel}
                    </div>
                  )}
                  {d.hook && (
                    <div className="font-bold text-foreground">{d.hook}</div>
                  )}
                  <pre className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                    {d.content ?? d.text ?? ""}
                  </pre>
                  {d.hashtags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.hashtags.map((h) => (
                        <span
                          key={h}
                          className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                        >
                          #{h.replace(/^#/, "")}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* 발행 결과 */}
        {state.publish_results && state.publish_results.length > 0 && (
          <Section title="발행 결과">
            <ul className="space-y-2">
              {state.publish_results.map((p, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-border bg-card p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{p.channel}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        p.status === "sent"
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {p.status}
                    </span>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-muted-foreground underline"
                      >
                        보러가기
                      </a>
                    )}
                  </div>
                  {p.error && (
                    <p className="mt-1 text-xs text-rose-500">{p.error}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* 승인 대기 */}
        {approvals.length > 0 && (
          <Section title={`승인 대기 (${approvals.length}개)`}>
            {decideMsg && (
              <p className="mb-3 text-sm text-muted-foreground">{decideMsg}</p>
            )}
            <div className="space-y-2">
              {approvals.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/40 p-3"
                >
                  <div className="text-sm">
                    <span className="font-bold text-foreground">
                      {a.item_type ?? a.approval_type ?? "approval"}
                    </span>
                    {a.status !== "pending" && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {a.status}
                      </span>
                    )}
                  </div>
                  {a.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => decide(a.id, "rejected")}
                        disabled={!!decidingId}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5" /> 거절
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(a.id, "approved")}
                        disabled={!!decidingId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {decidingId === a.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}{" "}
                        승인
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}
      </motion.div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-base font-bold text-foreground">{title}</h2>
      <div className="space-y-2 rounded-[24px] border border-border bg-card p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
        {children}
      </div>
    </section>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap gap-x-2 text-sm">
      <span className="font-bold text-foreground">{k}:</span>
      <span className="text-muted-foreground">{v}</span>
    </div>
  );
}
