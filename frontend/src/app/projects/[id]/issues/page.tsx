"use client";

import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useIssues } from "@/hooks/use-issues";
import { useDeployments } from "@/hooks/use-deployments";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Server,
  Shield,
  Zap,
  Globe,
  GitCommit,
  Activity,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT_EXPO },
  },
};

// ─── 데이터 및 설정 (디자인 시스템 반영) ──────────────────

type IssueStatus = "open" | "resolved" | "investigating";
type IssueSeverity = "critical" | "warning" | "info";
type DeployStatus = "success" | "failed" | "running" | "cancelled";
type ServiceStatus = "healthy" | "degraded" | "down";



function deriveServices(deploys: { status: string; platform: string }[]) {
  if (deploys.length === 0) return [];
  const platforms = [...new Set(deploys.map(d => d.platform || "unknown"))];
  const ICONS: Record<string, typeof Server> = { vercel: Globe, railway: Server, github: Shield };
  const NAMES: Record<string, string> = { vercel: "Vercel", railway: "Railway", github: "GitHub Actions" };
  return platforms.map(p => {
    const platDeploys = deploys.filter(d => d.platform === p);
    const recent = platDeploys[0];
    const successCount = platDeploys.filter(d => d.status === "ready").length;
    const uptime = platDeploys.length > 0 ? Math.round(successCount / platDeploys.length * 100) : 100;
    let status: ServiceStatus = "healthy";
    if (recent?.status === "error") status = "down";
    else if (uptime < 90) status = "degraded";
    return {
      name: NAMES[p] || p,
      icon: ICONS[p] || Server,
      status,
      latency: "--",
      uptime: `${uptime}%`,
    };
  });
}

const SERVICE_CFG: Record<
  ServiceStatus,
  { bg: string; dot: string; text: string; label: string }
> = {
  healthy: {
    bg: "bg-card",
    dot: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "정상",
  },
  degraded: {
    bg: "bg-card",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-600 dark:text-amber-400",
    label: "저하",
  },
  down: {
    bg: "bg-card",
    dot: "bg-rose-500 animate-pulse",
    text: "text-rose-600 dark:text-rose-400",
    label: "중단",
  },
};

const DEPLOY_CFG: Record<
  DeployStatus,
  { bar: string; text: string; label: string; Icon: React.ElementType }
> = {
  success: {
    bar: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "성공",
    Icon: CheckCircle2,
  },
  failed: {
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    label: "실패",
    Icon: XCircle,
  },
  running: {
    bar: "bg-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    label: "배포중",
    Icon: RefreshCw,
  },
  cancelled: {
    bar: "bg-slate-300",
    text: "text-muted-foreground",
    label: "취소",
    Icon: XCircle,
  },
};

const SEVERITY_CFG: Record<
  IssueSeverity,
  { bg: string; text: string; border: string; label: string }
> = {
  critical: {
    bg: "bg-card",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-100 dark:border-rose-900/50",
    label: "Critical",
  },
  warning: {
    bg: "bg-card",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-100 dark:border-amber-900/50",
    label: "Warning",
  },
  info: {
    bg: "bg-card",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900/50",
    label: "Info",
  },
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "미해결",
  resolved: "해결됨",
  investigating: "조사 중",
};

// ─── 메인 컴포넌트 ────────────────────────────────────────

export default function IssuesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { issues: apiIssues, isLoading } = useIssues(projectId);
  const { deployments: apiDeploys } = useDeployments(projectId);

  // Map API deploys to local format, fallback to mock
  const deployData = apiDeploys.map(d => ({
    id: d.id,
    commit: (d.commit_sha ?? "").slice(0, 7) || "---",
    msg: d.commit_message ?? d.deployment_id?.slice(0, 12) ?? "Deploy",
    author: "",
    time: new Date(d.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    duration: "",
    status: (d.status === "ready" ? "success" : d.status === "error" ? "failed" : d.status === "building" ? "running" : "success") as DeployStatus,
    env: "production" as const,
  }));

  // Use API data if available, fallback to mock
  const CATEGORY_TO_ICON: Record<string, React.ElementType> = {
    security: Shield, performance: Zap, deployment: Server, error: AlertTriangle, general: AlertTriangle,
  };
  const issueData = apiIssues.map(i => ({
    id: i.id,
    title: i.title,
    severity: (i.severity as IssueSeverity) || "warning",
    category: i.category,
    icon: CATEGORY_TO_ICON[i.category] ?? AlertTriangle,
    time: new Date(i.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    status: (i.status as IssueStatus) || "open",
  }));

  const openCount = issueData.filter((i) => i.status !== "resolved").length;
  const completedDeploys = deployData.filter((d) => d.status !== "running").length;
  const deploySuccessRate = completedDeploys > 0
    ? Math.round((deployData.filter((d) => d.status === "success").length / completedDeploys) * 100)
    : 0;

  return (
    <div className="px-10 py-10 w-full min-h-dvh bg-card selection:bg-slate-800 selection:text-white">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 max-w-7xl mx-auto"
      >
        {/* ── 헤더 ── */}
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between mb-2"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1.5">
              Operations
            </p>
            <h1 className="text-[26px] font-bold tracking-tight text-foreground">
              운영 현황
            </h1>
          </div>
          {openCount > 0 && (
            <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-4 py-2 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              미해결 이슈 {openCount}건
            </div>
          )}
        </motion.div>

        {/* ── 요약 스탯 (3컬럼) ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-5">
          {[
            {
              label: "Critical",
              count: issueData.filter(
                (i) => i.severity === "critical" && i.status !== "resolved",
              ).length,
              colorClass: "text-rose-600 dark:text-rose-400",
              sub: "즉시 조치 필요",
            },
            {
              label: "Warning",
              count: issueData.filter(
                (i) => i.severity === "warning" && i.status !== "resolved",
              ).length,
              colorClass: "text-amber-600 dark:text-amber-400",
              sub: "모니터링 필요",
            },
            {
              label: "Resolved",
              count: issueData.filter((i) => i.status === "resolved").length,
              colorClass: "text-emerald-600 dark:text-emerald-400",
              sub: "24h 내 해결됨",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card rounded-[20px] p-6 border border-border shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4 leading-none">
                {s.label}
              </p>
              <p
                className={cn(
                  "text-[32px] font-bold tracking-tight leading-none mb-2",
                  s.colorClass,
                )}
              >
                {s.count}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── 서비스 상태 (4컬럼 그리드) ── */}
        <motion.div
          variants={fadeUp}
          className="bg-card rounded-[20px] border border-border p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-[15px] font-semibold text-foreground">
              서비스 상태
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {deriveServices(apiDeploys).map((svc) => {
              const cfg = SERVICE_CFG[svc.status];
              return (
                <div
                  key={svc.name}
                  className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-4 transition-all hover:bg-muted/50 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <svc.icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <div
                        className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)}
                      />
                      <span
                        className={cn(
                          "text-[11px] font-bold uppercase tracking-wider",
                          cfg.text,
                        )}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-foreground">
                      {svc.name}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-tighter">
                      응답 {svc.latency} · 가용성 {svc.uptime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── 하단 섹션: 배포 로그(3) + 이슈 목록(2) ── */}
        <div className="grid grid-cols-5 gap-5 items-stretch">
          {/* 배포 로그 */}
          <motion.div
            variants={fadeUp}
            className="col-span-3 bg-card rounded-[20px] border border-border p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-muted-foreground" />
                <p className="text-[15px] font-semibold text-foreground">
                  배포 로그
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 h-1.5 w-24">
                  {[...deployData].reverse().map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex-1 rounded-full",
                        DEPLOY_CFG[d.status].bar,
                        d.status === "running" && "animate-pulse",
                      )}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-bold text-muted-foreground">
                  성공률{" "}
                  <span
                    className={cn(
                      deploySuccessRate >= 80
                        ? "text-emerald-500"
                        : "text-rose-500",
                    )}
                  >
                    {deploySuccessRate}%
                  </span>
                </span>
              </div>
            </div>

            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  {["커밋", "메시지", "환경", "시간", "상태"].map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deployData.map((d) => {
                  const cfg = DEPLOY_CFG[d.status];
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-muted/30 transition-colors group cursor-pointer"
                    >
                      <td className="py-4">
                        <span
                          className={cn(
                            "font-mono text-[10px] px-2 py-0.5 rounded font-semibold bg-card border border-border",
                            cfg.text,
                          )}
                        >
                          {d.commit}
                        </span>
                      </td>
                      <td className="py-4 text-[13px] font-normal text-muted-foreground max-w-[140px] truncate group-hover:text-foreground transition-colors">
                        {d.msg}
                      </td>
                      <td className="py-4">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest bg-card border-border",
                            d.env === "production"
                              ? "text-violet-500"
                              : "text-muted-foreground",
                          )}
                        >
                          {d.env}
                        </span>
                      </td>
                      <td className="py-4 text-[12px] font-normal text-muted-foreground whitespace-nowrap">
                        {d.time}
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5">
                          <cfg.Icon
                            className={cn(
                              "w-3.5 h-3.5",
                              cfg.text,
                              d.status === "running" && "animate-spin",
                            )}
                          />
                          <span
                            className={cn(
                              "text-[12px] font-semibold",
                              cfg.text,
                            )}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* 이슈 목록 리스트 */}
          <motion.div
            variants={fadeUp}
            className="col-span-2 bg-card rounded-[20px] border border-border p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <p className="text-[15px] font-semibold text-foreground">
                  이슈 목록
                </p>
              </div>
              <button className="text-[11px] font-bold text-muted-foreground hover:text-muted-foreground transition-colors uppercase tracking-widest leading-none">
                전체
              </button>
            </div>

            <div className="flex flex-col gap-3 flex-1">
              {issueData.map((issue) => {
                const scfg = SEVERITY_CFG[issue.severity];
                return (
                  <div
                    key={issue.id}
                    className={cn(
                      "bg-card rounded-2xl border p-4 flex items-center gap-4 transition-all hover:bg-muted/50 group cursor-pointer shadow-sm border-border",
                    )}
                  >
                    <issue.icon className="w-4 h-4 text-muted-foreground shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate leading-snug">
                        {issue.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase tracking-wider",
                            scfg.text,
                          )}
                        >
                          {issue.category}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {issue.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-card border border-border",
                          issue.status === "open"
                            ? "text-rose-500"
                            : issue.status === "investigating"
                              ? "text-amber-500"
                              : "text-emerald-500",
                        )}
                      >
                        {STATUS_LABEL[issue.status]}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <button className="flex items-center justify-center gap-1 w-full text-[12px] font-bold text-muted-foreground hover:text-foreground transition-colors">
                전체 히스토리 보기 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
