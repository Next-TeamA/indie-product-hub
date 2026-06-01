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
    bg: "bg-violet-50",
    text: "text-violet-600",
    pulse: true,
  },
  paused_awaiting_approval: {
    label: "승인 대기",
    bg: "bg-amber-50",
    text: "text-amber-600",
  },
  completed: { label: "완료", bg: "bg-emerald-50", text: "text-emerald-600" },
  failed: { label: "실패", bg: "bg-rose-50", text: "text-rose-600" },
  cancelled: { label: "취소", bg: "bg-slate-100", text: "text-slate-500" },
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
    try {
      await ampActions.decide(approvalId, decision);
      mutateApprovals();
      mutateRuns();
    } catch (e) {
      console.error(e);
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
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          AMP 자율 마케팅
        </h1>
        <p className="mt-2 text-sm text-slate-500 md:text-base">
          LangGraph 워크플로우를 수동으로 실행하고, 승인이 필요한 항목을
          처리합니다.
        </p>
      </motion.div>

      {/* 그래프 실행 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-slate-900">
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
                "rounded-[24px] border border-slate-100 bg-white p-5 text-left shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] transition-all",
                running === g
                  ? "ring-2 ring-violet-300"
                  : !running && "hover:-translate-y-0.5 hover:border-slate-200",
                running && running !== g && "opacity-50",
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                <Workflow className="h-5 w-5 text-violet-500" />
                <span className="text-sm font-bold text-slate-900">
                  {GRAPH_LABEL[g]}
                </span>
              </div>
              <p className="mb-4 text-xs leading-relaxed text-slate-500">
                {GRAPH_DESC[g]}
              </p>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                  running === g
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-900 text-white",
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
        {runMsg && <p className="mt-3 text-sm text-slate-600">{runMsg}</p>}
      </section>

      {/* 승인 대기 */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
          <Inbox className="h-4 w-4" /> 승인 대기
          <span className="ml-1 text-sm font-medium text-slate-400">
            {approvals.length}개
          </span>
        </h2>
        {approvalsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </div>
        ) : approvals.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
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
        <h2 className="mb-3 text-base font-bold text-slate-900">
          최근 실행 (최대 30)
        </h2>
        {runsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-500">실행 이력이 없어요.</p>
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
    <li className="rounded-[24px] border border-amber-100 bg-amber-50/40 p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            {approval.approval_type}
          </div>
          <pre className="mt-2 max-h-40 overflow-auto rounded-2xl bg-white p-3 text-xs text-slate-700">
            {JSON.stringify(approval.payload, null, 2)}
          </pre>
          <div className="mt-2 text-xs text-slate-400">
            {new Date(approval.created_at).toLocaleString("ko-KR")}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onDecide(approval.id, "rejected")}
            disabled={deciding}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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

function RunRow({ run }: { run: WorkflowRun }) {
  const meta = RUN_STATUS_META[run.status];
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">
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
            <span className="text-xs text-slate-400">
              · {run.current_node}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
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
