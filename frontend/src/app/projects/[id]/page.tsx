"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  Eye,
  MousePointer,
  Target,
  Users,
  BarChart3,
  Megaphone,
  AlertTriangle,
  TrendingUp,
  ArrowUpRight,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProject } from "@/hooks/use-projects";
import { useIssues } from "@/hooks/use-issues";
import { useMarketingInsights, useOperationsInsights } from "@/hooks/use-insights";
import { useDeployments } from "@/hooks/use-deployments";
import { listPromotions, type Promotion } from "@/lib/api/promotion";
import { cn } from "@/lib/utils";

// ─── Empty state stats ──────────────

const EMPTY_STATS = [
  { id: "impressions", label: "총 노출", value: "0", change: "0%", up: true, data: [] as number[], color: "bg-blue-400/30", text: "text-blue-600" },
  { id: "clicks", label: "총 클릭", value: "0", change: "0%", up: true, data: [] as number[], color: "bg-indigo-400/30", text: "text-indigo-600" },
  { id: "conversion", label: "전환율", value: "0%", change: "0%", up: true, data: [] as number[], color: "bg-rose-400/30", text: "text-rose-600" },
  { id: "likes", label: "좋아요", value: "0", change: "0%", up: true, data: [] as number[], color: "bg-emerald-400/30", text: "text-emerald-600" },
];

const CATEGORY_ICON: Record<string, React.ElementType> = {
  security: Shield, performance: Zap, deployment: CheckCircle2, error: AlertTriangle, general: AlertTriangle,
};

const WEEKDAY_SHORT = ["일", "월", "화", "수", "목", "금", "토"];

const PLATFORM_DOT: Record<string, string> = {
  threads: "bg-orange-400",
  x: "bg-slate-500",
  bluesky: "bg-sky-400",
  mastodon: "bg-violet-400",
};

// ─── 서브 컴포넌트 ─────────────────────────────────────────

function SectionHeader({
  title,
  href,
  extra,
}: {
  title: string;
  href: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-[20px] font-bold text-slate-800 tracking-tight">{title}</h2>
        {extra}
      </div>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all"
      >
        상세보기
        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

// ─── 메인 대시보드 ─────────────────────────────────────────

export default function DashboardPage() {
  const params = useParams();
  const id = params.id as string;
  const { project } = useProject(id);
  const { issues, isLoading: issuesLoading } = useIssues(id);
  const { data: marketingData } = useMarketingInsights(id);
  const { data: opsData } = useOperationsInsights(id);
  const { deployments } = useDeployments(id);
  const [activeMetric, setActiveMetric] = useState("impressions");
  const [weekPromos, setWeekPromos] = useState<Promotion[]>([]);

  useEffect(() => {
    if (!id) return;
    listPromotions(id).then(setWeekPromos).catch(console.error);
  }, [id]);

  // This week's scheduled promotions (Sun ~ Sat)
  const _today = new Date();
  const _weekStart = new Date(_today);
  _weekStart.setHours(0, 0, 0, 0);
  _weekStart.setDate(_today.getDate() - _today.getDay());
  const _weekEnd = new Date(_weekStart);
  _weekEnd.setDate(_weekStart.getDate() + 6);
  _weekEnd.setHours(23, 59, 59, 999);

  const weekEvents = weekPromos
    .filter((p) => {
      const d = new Date(p.date + "T00:00:00");
      return d >= _weekStart && d <= _weekEnd;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );

  // Build stats from API data
  const promoStats = marketingData ? [
    {
      id: "impressions", label: "총 노출",
      value: (marketingData.totals?.impressions ?? 0).toLocaleString(),
      change: marketingData.changes?.impressions ? `${marketingData.changes.impressions > 0 ? "+" : ""}${marketingData.changes.impressions}%` : "--",
      up: (marketingData.changes?.impressions ?? 0) >= 0,
      data: [] as number[], // time-series from API when available
      color: "bg-blue-400/30", text: "text-blue-600",
    },
    {
      id: "clicks", label: "총 클릭",
      value: (marketingData.totals?.clicks ?? 0).toLocaleString(),
      change: marketingData.changes?.clicks ? `${marketingData.changes.clicks > 0 ? "+" : ""}${marketingData.changes.clicks}%` : "--",
      up: (marketingData.changes?.clicks ?? 0) >= 0,
      data: [] as number[],
      color: "bg-indigo-400/30", text: "text-indigo-600",
    },
    {
      id: "conversion", label: "전환율",
      value: `${marketingData.engagement_rate ?? 0}%`,
      change: "--",
      up: true,
      data: [] as number[],
      color: "bg-rose-400/30", text: "text-rose-600",
    },
    {
      id: "likes", label: "좋아요",
      value: (marketingData.totals?.likes ?? 0).toLocaleString(),
      change: marketingData.changes?.likes ? `${marketingData.changes.likes > 0 ? "+" : ""}${marketingData.changes.likes}%` : "--",
      up: (marketingData.changes?.likes ?? 0) >= 0,
      data: [] as number[],
      color: "bg-emerald-400/30", text: "text-emerald-600",
    },
  ] : EMPTY_STATS;

  const currentMetric = promoStats.find((m) => m.id === activeMetric) ?? promoStats[0];

  // Issues from API
  const openIssues = issues.filter(i => i.status !== "resolved");
  const criticalCount = issues.filter(i => i.severity === "critical" && i.status !== "resolved").length;

  // Deployments from API
  const recentDeploy = deployments.length > 0 ? deployments[0] : null;
  const deploySuccessRate = deployments.length > 0
    ? Math.round(deployments.filter(d => d.status === "ready").length / deployments.length * 100)
    : null;

  // Operations summary from API
  const opsSummary = opsData?.issues;

  // ── Insights summaries (derived from API data, one-liners) ──
  const marketingHeadline = marketingData?.best_post?.platform
    ? `${marketingData.best_post.platform} 채널 강세`
    : marketingData && (marketingData.total_posts ?? 0) > 0
      ? "홍보 활동 진행 중"
      : "데이터 수집 중";

  const marketingDetail = marketingData?.best_post
    ? `${marketingData.best_post.platform} 채널에서 노출 ${marketingData.best_post.impressions.toLocaleString()}회, 참여 ${marketingData.best_post.engagement.toLocaleString()}건으로 가장 좋은 반응을 얻었습니다.`
    : marketingData
      ? `${marketingData.total_posts ?? 0}개 게시물 분석 중. 평균 참여율 ${marketingData.engagement_rate ?? 0}%.`
      : "SNS 채널을 연결하고 게시물을 발행하면 분석 결과가 표시됩니다.";

  const operationsHeadline =
    criticalCount > 0
      ? `Critical 이슈 ${criticalCount}건`
      : openIssues.length > 0
        ? `미해결 이슈 ${openIssues.length}건`
        : deploySuccessRate !== null && deploySuccessRate >= 90
          ? "운영 상태 양호"
          : "운영 모니터링 중";

  const operationsDetail =
    criticalCount > 0
      ? `즉시 확인이 필요한 critical 이슈가 ${criticalCount}건 있습니다. 빠른 대응을 권장합니다.`
      : openIssues.length > 0
        ? `${opsSummary?.total ?? issues.length}건 중 ${opsSummary?.resolved ?? issues.length - openIssues.length}건이 해결되었습니다.`
        : deployments.length > 0
          ? `최근 배포 성공률 ${deploySuccessRate ?? 0}%, 미해결 이슈 없이 안정적으로 운영되고 있습니다.`
          : "배포 플랫폼을 연결하면 운영 상태가 분석됩니다.";

  const CARD_CLASS =
    "bg-white rounded-[24px] border border-slate-100 p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]";

  return (
    <div className="px-10 py-6 w-full min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-4"
      >
        {/* 헤더 */}
        <div className="border-b border-slate-50 pb-4">
          <h1 className="text-[26px] font-bold tracking-tight text-slate-800">
            {project?.name ?? "Dashboard"}{" "}
            <span className="text-slate-300 font-normal ml-2 text-[18px]">Dashboard</span>
          </h1>
        </div>

        {/* 2-column grid: 좌측 홍보, 우측 인사이트+운영 이슈 */}
        <div className="grid grid-cols-2 gap-5 items-start">

          {/* ─── 좌측: 홍보 ─── */}
          <section className={CARD_CLASS}>
            <SectionHeader title="홍보" href={`/projects/${id}/promotion`} />

            {/* 2x2 stat cards */}
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {promoStats.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all text-left",
                    activeMetric === m.id
                      ? "bg-slate-50 border-slate-200 shadow-sm"
                      : "bg-white border-slate-100 hover:bg-slate-50",
                  )}
                >
                  <p className="text-[10px] font-bold uppercase mb-1.5 text-slate-400">{m.label}</p>
                  <p className={cn("text-[20px] font-bold leading-none", activeMetric === m.id ? "text-slate-800" : "text-slate-600")}>
                    {m.value}
                  </p>
                  <p className={cn("text-[11px] font-bold mt-2", m.change === "--" ? "text-slate-400" : m.up ? "text-emerald-500" : "text-rose-500")}>
                    {m.change}
                  </p>
                </button>
              ))}
            </div>

            {/* Chart area */}
            {currentMetric.data.length > 0 ? (
              <div className="h-28 flex items-end gap-3 px-2">
                {currentMetric.data.map((h: number, i: number) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className={cn("flex-1 rounded-t-xl transition-colors duration-500", currentMetric.color)}
                  />
                ))}
              </div>
            ) : (
              <div className="h-28 flex flex-col items-center justify-center gap-2.5 px-2">
                <p className="text-[13px] text-slate-400">
                  SNS를 연결하면 성과 데이터가 표시됩니다
                </p>
                <Link
                  href={`/projects/${id}/settings`}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-900 text-white text-[12px] font-bold hover:bg-slate-800 transition-colors"
                >
                  SNS 연결하기
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-50 pt-2.5 text-[11px] font-bold text-slate-300 mb-5">
              {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                <span key={d} className="flex-1 text-center">{d}</span>
              ))}
            </div>

            {/* 이번 주 주요 일정 */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h3 className="text-[13px] font-bold text-slate-800">이번 주 주요 일정</h3>
              </div>
              <div className="space-y-2">
                {weekEvents.length === 0 ? (
                  <p className="text-[13px] text-slate-400 py-2">
                    이번 주 예정된 일정이 없습니다
                  </p>
                ) : (
                  weekEvents.slice(0, 5).map((ev) => {
                    const d = new Date(ev.date + "T00:00:00");
                    const day = d.getDate();
                    const weekday = WEEKDAY_SHORT[d.getDay()];
                    const dotColor = PLATFORM_DOT[ev.platform] ?? "bg-slate-400";
                    return (
                      <Link
                        key={ev.id}
                        href={`/projects/${id}/promotion/post/${ev.id}`}
                        className="flex items-center gap-4 group"
                      >
                        <div className="flex flex-col items-center w-7 shrink-0">
                          <span className="text-[15px] font-bold text-slate-700 leading-none">{day}</span>
                          <span className="text-[10px] font-bold text-slate-400 mt-1.5">{weekday}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 group-hover:bg-slate-100 transition-colors min-w-0">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
                          <span className="text-[13px] font-semibold text-slate-700 truncate">{ev.hook}</span>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* ─── 우측: 인사이트 + 운영 이슈 스택 ─── */}
          <div className="flex flex-col gap-5">

            {/* [우측 상단] 인사이트 */}
            <section className={CARD_CLASS}>
              <SectionHeader title="인사이트" href={`/projects/${id}/insights`} />
              <div className="space-y-5">

                {/* Marketing Summary */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                      Marketing Summary
                    </p>
                    <p className="text-[15px] font-bold text-slate-800 leading-snug mb-1.5">
                      {marketingHeadline}
                    </p>
                    <p className="text-[12px] text-slate-500 leading-relaxed">
                      {marketingDetail}
                    </p>
                  </div>
                </div>

                {/* Operations Summary */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-1">
                      Operations Summary
                    </p>
                    <p className="text-[15px] font-bold text-slate-800 leading-snug mb-1.5">
                      {operationsHeadline}
                    </p>
                    <p className="text-[12px] text-slate-500 leading-relaxed">
                      {operationsDetail}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* [우측 하단] 운영 이슈 */}
            <section className={CARD_CLASS}>
              <SectionHeader
                title="운영 이슈"
                href={`/projects/${id}/issues`}
                extra={
                  criticalCount > 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      {criticalCount} Critical
                    </span>
                  ) : undefined
                }
              />

              {/* Issue list */}
              <div className="space-y-2 mb-4">
                {issuesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                  </div>
                ) : openIssues.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[13px] text-slate-400">미해결 이슈가 없습니다</p>
                  </div>
                ) : (
                  openIssues.slice(0, 3).map((issue) => {
                    const Icon = CATEGORY_ICON[issue.category] ?? AlertTriangle;
                    return (
                      <Link
                        key={issue.id}
                        href={`/projects/${id}/issues`}
                        className="p-3.5 rounded-2xl bg-white border border-slate-100 flex items-center gap-3 hover:bg-slate-50 transition-all group cursor-pointer shadow-sm"
                      >
                        <div className={cn("p-2 rounded-xl", issue.severity === "critical" ? "bg-rose-50" : "bg-amber-50")}>
                          <Icon className={cn("w-4 h-4", issue.severity === "critical" ? "text-rose-500" : "text-amber-500")} />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-bold text-slate-800 truncate">{issue.title}</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase">
                            {issue.category} · {new Date(issue.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                        <div className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase border shrink-0",
                          issue.severity === "critical" ? "text-rose-500 border-rose-100" : "text-amber-500 border-amber-100",
                        )}>
                          {issue.severity}
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>

              {/* System Health */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  System Health
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">DEPLOY</p>
                    <p className={cn(
                      "text-[15px] font-bold",
                      deploySuccessRate !== null && deploySuccessRate >= 90
                        ? "text-emerald-600"
                        : deploySuccessRate !== null
                          ? "text-amber-600"
                          : "text-slate-400",
                    )}>
                      {deploySuccessRate !== null ? `${deploySuccessRate}%` : "--"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">ISSUES</p>
                    <p className={cn(
                      "text-[15px] font-bold",
                      criticalCount > 0 ? "text-rose-600" : "text-emerald-600",
                    )}>
                      {criticalCount > 0 ? `${criticalCount} Critical` : "All Clear"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 mt-3">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">
                    {recentDeploy
                      ? `최근 배포: ${new Date(recentDeploy.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : "배포 기록 없음"}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
