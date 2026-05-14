"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProject } from "@/hooks/use-projects";
import { useIssues } from "@/hooks/use-issues";
import { useMarketingInsights, useOperationsInsights } from "@/hooks/use-insights";
import { useDeployments } from "@/hooks/use-deployments";
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

// ─── 서브 컴포넌트 ─────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">{title}</h2>
      <Link href={href} className="group flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-slate-900 transition-all">
        상세보기 <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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

  return (
    <div className="px-10 py-10 w-full min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-12"
      >
        {/* 헤더 */}
        <div className="flex items-end justify-between border-b border-slate-50 pb-6">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800">
            {project?.name ?? "Dashboard"}{" "}
            <span className="text-slate-300 font-normal ml-2 text-[20px]">Dashboard</span>
          </h1>
          {criticalCount > 0 && (
            <Link href={`/projects/${id}/issues`} className="flex items-center gap-2 text-[12px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {criticalCount} Critical Issue{criticalCount > 1 ? "s" : ""}
            </Link>
          )}
        </div>

        {/* [섹션 1] 인사이트 */}
        <section className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
          <SectionHeader title="인사이트" href={`/projects/${id}/insights`} />
          <div className="grid grid-cols-2 gap-8">
            <div className="flex gap-5 items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">Marketing Summary</p>
                <p className="text-[15px] font-bold text-slate-800 mb-2">
                  {marketingData?.best_post?.platform
                    ? `${marketingData.best_post.platform} 채널 강세`
                    : "데이터 수집 중"}
                </p>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  {marketingData
                    ? `총 ${marketingData.totals?.impressions?.toLocaleString() ?? 0} 노출, 참여율 ${marketingData.engagement_rate ?? 0}%. ${marketingData.total_posts ?? 0}개 게시물 분석 기반.`
                    : "프로모션을 게시하면 마케팅 데이터가 여기에 표시됩니다."}
                </p>
              </div>
            </div>
            <div className="flex gap-5 items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5">Operations Summary</p>
                <p className="text-[15px] font-bold text-slate-800 mb-2">
                  {opsSummary
                    ? `이슈 ${opsSummary.total}건 (해결 ${opsSummary.resolved}건)`
                    : "운영 상태 양호"}
                </p>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  {deploySuccessRate !== null
                    ? `배포 성공률 ${deploySuccessRate}%. ${deployments.length}회 배포 중 ${deployments.filter(d => d.status === "error").length}건 실패.`
                    : "배포 플랫폼을 연결하면 배포 현황이 표시됩니다."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* [섹션 2] 홍보 */}
        <section className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
          <SectionHeader title="홍보" href={`/projects/${id}/promotion`} />
          <div className="space-y-8">
            <div className="grid grid-cols-4 gap-3">
              {promoStats.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveMetric(m.id)}
                  className={cn(
                    "p-4 rounded-[20px] border transition-all text-left",
                    activeMetric === m.id
                      ? "bg-slate-50 border-slate-200 shadow-sm"
                      : "bg-white border-slate-100 hover:bg-slate-50",
                  )}
                >
                  <p className="text-[10px] font-bold uppercase mb-2 text-slate-400">{m.label}</p>
                  <p className={cn("text-[18px] font-bold leading-none", activeMetric === m.id ? "text-slate-800" : "text-slate-600")}>
                    {m.value}
                  </p>
                  <p className={cn("text-[11px] font-bold mt-2", m.up ? "text-emerald-500" : "text-rose-500")}>
                    {m.change}
                  </p>
                </button>
              ))}
            </div>
            <div className="h-40 flex items-end gap-3 px-2">
              {currentMetric.data.length > 0 ? currentMetric.data.map((h: number, i: number) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  className={cn("flex-1 rounded-t-xl transition-colors duration-500", currentMetric.color)}
                />
              )) : (
                <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">
                  SNS를 연결하고 게시물을 발행하면 여기에 성과 데이터가 표시됩니다
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-300">
              {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                <span key={d} className="flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>
        </section>

        {/* [섹션 3] 운영 이슈 */}
        <section className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
          <SectionHeader title="운영 이슈" href={`/projects/${id}/issues`} />
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-7 space-y-3">
              {issuesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                </div>
              ) : openIssues.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-slate-400">미해결 이슈가 없습니다</p>
                </div>
              ) : (
                openIssues.slice(0, 5).map((issue) => {
                  const Icon = CATEGORY_ICON[issue.category] ?? AlertTriangle;
                  return (
                    <div
                      key={issue.id}
                      className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all group cursor-pointer shadow-sm"
                    >
                      <div className={cn("p-2 rounded-xl", issue.severity === "critical" ? "bg-rose-50" : "bg-amber-50")}>
                        <Icon className={cn("w-4 h-4", issue.severity === "critical" ? "text-rose-500" : "text-amber-500")} />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-[14px] font-bold text-slate-800 truncate">{issue.title}</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase">
                          {issue.category} · {new Date(issue.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                        issue.severity === "critical" ? "text-rose-500 border-rose-100" : "text-amber-500 border-amber-100",
                      )}>
                        {issue.severity}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="col-span-5 flex flex-col justify-between border-l border-slate-100 pl-10">
              <div className="space-y-4">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest text-left">System Health</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">DEPLOY</p>
                    <p className={cn("text-[15px] font-bold", deploySuccessRate !== null && deploySuccessRate >= 90 ? "text-emerald-600" : deploySuccessRate !== null ? "text-amber-600" : "text-slate-400")}>
                      {deploySuccessRate !== null ? `${deploySuccessRate}%` : "--"}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">ISSUES</p>
                    <p className={cn("text-[15px] font-bold", criticalCount > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {criticalCount > 0 ? `${criticalCount} Critical` : "All Clear"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-[12px] font-bold">
                    {recentDeploy
                      ? `최근 배포: ${new Date(recentDeploy.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : "배포 기록 없음"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
