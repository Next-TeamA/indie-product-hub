"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Loader2, DollarSign } from "lucide-react";
import { useCostLedger } from "@/hooks/use-cost";
import type { CostByService, CostByDay, CostLedgerRow } from "@/lib/api/cost";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const WINDOWS = [
  { days: 7, label: "7일" },
  { days: 30, label: "30일" },
  { days: 90, label: "90일" },
] as const;

const SERVICE_LABEL: Record<string, string> = {
  fal: "fal.ai (영상)",
  elevenlabs: "ElevenLabs (TTS)",
  openai: "OpenAI (자막)",
  gemini: "Gemini (LLM)",
  anthropic: "Anthropic (LLM)",
  cohere: "Cohere (RAG)",
  x_api: "X API",
  r2: "R2 저장",
};

const SERVICE_COLORS: Record<string, string> = {
  fal: "bg-violet-500",
  elevenlabs: "bg-rose-500",
  openai: "bg-emerald-500",
  gemini: "bg-blue-500",
  anthropic: "bg-amber-500",
  cohere: "bg-pink-500",
  x_api: "bg-slate-700",
  r2: "bg-cyan-500",
};

function svcColor(s: string): string {
  return SERVICE_COLORS[s] ?? "bg-slate-400";
}

export default function CostPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const { cost, isLoading } = useCostLedger(projectId, days);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
            비용
          </h1>
          <p className="mt-2 text-sm text-slate-500 md:text-base">
            AI · 영상 · 저장 비용을 한눈에. cost_ledger 기반.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDays(w.days)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                days === w.days
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700",
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </motion.div>

      {isLoading || !cost ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
        </div>
      ) : (
        <>
          <TotalCard total={cost.total_usd} days={cost.window_days} />

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ServiceCard items={cost.by_service} total={cost.total_usd} />
            <DayChart items={cost.by_day} />
          </div>

          <RecentCard rows={cost.recent} />
        </>
      )}
    </div>
  );
}

function TotalCard({ total, days }: { total: number; days: number }) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <DollarSign className="h-3.5 w-3.5" /> 최근 {days}일 합계
      </div>
      <div className="mt-2 text-4xl font-bold text-slate-900 md:text-5xl">
        ${total.toFixed(2)}
        <span className="ml-2 text-base font-medium text-slate-400">USD</span>
      </div>
    </div>
  );
}

function ServiceCard({
  items,
  total,
}: {
  items: CostByService[];
  total: number;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <h2 className="text-base font-bold text-slate-900">서비스별</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">데이터가 없어요.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((it) => {
            const pct = total > 0 ? (it.cost_usd / total) * 100 : 0;
            return (
              <li key={it.service}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {SERVICE_LABEL[it.service] ?? it.service}
                  </span>
                  <span className="text-slate-500">
                    ${it.cost_usd.toFixed(3)}
                    <span className="ml-1 text-xs text-slate-400">
                      ({pct.toFixed(0)}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      svcColor(it.service),
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DayChart({ items }: { items: CostByDay[] }) {
  const max = Math.max(0.001, ...items.map((d) => d.cost_usd));
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <h2 className="text-base font-bold text-slate-900">일별 추이</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">데이터가 없어요.</p>
      ) : (
        <div className="mt-4 flex h-40 items-end gap-1">
          {items.map((d) => {
            const h = (d.cost_usd / max) * 100;
            return (
              <div key={d.date} className="group relative flex-1">
                <div
                  className="rounded-t-sm bg-slate-200 transition-colors group-hover:bg-violet-500"
                  style={{ height: `${Math.max(2, h)}%` }}
                  title={`${d.date}: $${d.cost_usd.toFixed(3)}`}
                />
              </div>
            );
          })}
        </div>
      )}
      {items.length > 0 && (
        <div className="mt-2 flex justify-between text-[10px] text-slate-400">
          <span>{items[0].date.slice(5)}</span>
          <span>{items[items.length - 1].date.slice(5)}</span>
        </div>
      )}
    </div>
  );
}

function RecentCard({ rows }: { rows: CostLedgerRow[] }) {
  return (
    <div className="mt-8 rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <h2 className="text-base font-bold text-slate-900">최근 항목</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">기록이 없어요.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      svcColor(r.service),
                    )}
                  />
                  <span className="font-medium text-slate-700">
                    {SERVICE_LABEL[r.service] ?? r.service}
                  </span>
                  <span className="truncate text-xs text-slate-400">
                    {r.operation}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  {new Date(r.occurred_at).toLocaleString("ko-KR")}
                </div>
              </div>
              <span className="font-bold text-slate-900">
                ${Number(r.cost_usd).toFixed(4)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
