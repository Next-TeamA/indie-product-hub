"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Workflow,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import {
  useAmpRuns,
  useAmpApprovals,
  useAmpActions,
} from "@/hooks/use-amp";
import type {
  AmpGraph,
  Approval,
  WorkflowRun,
  WorkflowStatus,
} from "@/lib/api/amp";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const GRAPH_LABEL: Record<AmpGraph, string> = {
  content_creation: "콘텐츠 생성",
  engagement: "인게이지먼트",
  video_production: "영상 생성",
};

const GRAPH_DESC: Record<AmpGraph, string> = {
  content_creation: "X/Threads 등 SNS 카피 자동 생성",
  engagement: "멘션/답글 자동 응답 초안",
  video_production: "영상 + 자막 + 보이스까지 풀 영상 만들기",
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
  completed: { label: "완료", bg: "bg-emerald-50 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400" },
  failed: { label: "실패", bg: "bg-rose-50 dark:bg-rose-950/40", text: "text-rose-600 dark:text-rose-400" },
  cancelled: { label: "취소", bg: "bg-muted", text: "text-muted-foreground" },
};

export default function AmpPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { runs, isLoading: runsLoading, mutate: mutateRuns } =
    useAmpRuns(projectId);
  const {
    approvals,
    isLoading: approvalsLoading,
    mutate: mutateApprovals,
  } = useAmpApprovals(projectId);
  const ampActions = useAmpActions(projectId);

  const [running, setRunning] = useState<AmpGraph | null>(null);
  const [runMsg, setRunMsg] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decideMsg, setDecideMsg] = useState<string | null>(null);

  async function onRun(graph: AmpGraph) {
    if (running) return;
    setRunning(graph);
    setRunMsg(null);
    try {
      const r = await ampActions.run({ graph, trigger_type: "manual" });
      setRunMsg(`${GRAPH_LABEL[graph]} 실행: ${r.status}`);
      mutateRuns();
      mutateApprovals();
    } catch (e) {
      setRunMsg(e instanceof Error ? e.message : "실행 실패");
    } finally {
      setRunning(null);
    }
  }

  async function onDecide(approvalId: string, decision: "approved" | "rejected") {
    if (decidingId) return;
    setDecidingId(approvalId);
    setDecideMsg(null);
    try {
      const r = await ampActions.decide(approvalId, decision);
      const resume = r.resume as { status?: string; reason?: string; error?: string } | null;
      const resumeStatus = resume?.status ?? "?";
      const detail = resume?.reason || resume?.error || "";
      setDecideMsg(
        `${decision === "approved" ? "승인" : "거절"} 완료. 그래프 재개 상태: ${resumeStatus}${
          detail ? ` (${detail})` : ""
        }. 결과는 위 "최근 실행"에서 확인하세요.`,
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
          LangGraph 워크플로우를 수동으로 실행하고, 승인이 필요한 항목을
          처리합니다.
        </p>
      </motion.div>

      {/* 그래프 실행 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-foreground">
          워크플로우 실행
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(Object.keys(GRAPH_LABEL) as AmpGraph[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onRun(g)}
              disabled={!!running}
              className={cn(
                "rounded-[24px] border border-border bg-card p-5 text-left shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] transition-all",
                running === g
                  ? "ring-2 ring-violet-300"
                  : !running && "hover:-translate-y-0.5 hover:border-border",
                running && running !== g && "opacity-50",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <Workflow className="h-5 w-5 text-violet-500" />
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
                  running === g
                    ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {running === g ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" /> 실행 중
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" /> 실행
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
        {runMsg && <p className="mt-3 text-sm text-muted-foreground">{runMsg}</p>}
      </section>

      {/* 승인 대기 */}
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

      {/* Run 히스토리 */}
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
              <RunRow key={r.id} run={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

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

type DraftLike = { channel?: string; hook?: string; content?: string; text?: string };

function ApprovalBody({ approval }: { approval: Approval }) {
  const ctx = (approval.context ?? approval.payload) as
    | { drafts?: DraftLike[]; strategy?: { channels?: string[]; reasoning?: string }; risk?: { level?: string; reasons?: string[] } }
    | null
    | undefined;

  if (!ctx || (typeof ctx === "object" && Object.keys(ctx).length === 0)) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        백엔드가 보낸 컨텍스트가 비어 있어요. 그래프가 빈 입력으로 돌았을
        가능성이 큽니다 (예: AMP 페이지에서 수동 실행 시 트리거 payload 없음).
      </p>
    );
  }

  const drafts = Array.isArray(ctx.drafts) ? ctx.drafts : [];
  const strategy = ctx.strategy;
  const risk = ctx.risk;

  return (
    <div className="mt-2 space-y-2">
      {strategy && (strategy.channels?.length || strategy.reasoning) && (
        <div className="rounded-xl bg-card px-3 py-2 text-xs">
          <div className="font-bold text-foreground">전략</div>
          {strategy.channels?.length ? (
            <div className="text-muted-foreground">채널: {strategy.channels.join(", ")}</div>
          ) : null}
          {strategy.reasoning ? (
            <div className="text-muted-foreground">{strategy.reasoning}</div>
          ) : null}
        </div>
      )}
      {risk && (risk.level || risk.reasons?.length) && (
        <div className="rounded-xl bg-card px-3 py-2 text-xs">
          <div className="font-bold text-foreground">리스크: {risk.level ?? "?"}</div>
          {risk.reasons?.length ? (
            <ul className="ml-4 list-disc text-muted-foreground">
              {risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
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
              <pre className="whitespace-pre-wrap text-foreground">{d.content ?? d.text ?? ""}</pre>
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

function RunRow({ run }: { run: WorkflowRun }) {
  const meta = RUN_STATUS_META[run.status];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
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
    </div>
  );
}
