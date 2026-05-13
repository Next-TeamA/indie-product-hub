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
  Database,
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

const MOCK_ISSUES = [
  {
    id: "1",
    title: "SSL 인증서 만료 예정 (5/15)",
    severity: "critical" as IssueSeverity,
    category: "보안",
    icon: Shield,
    time: "2시간 전",
    status: "open" as IssueStatus,
  },
  {
    id: "2",
    title: "API 응답 시간 평균 2.3s 초과",
    severity: "warning" as IssueSeverity,
    category: "성능",
    icon: Zap,
    time: "6시간 전",
    status: "investigating" as IssueStatus,
  },
  {
    id: "3",
    title: "배포 실패: main@a3f2d1c",
    severity: "warning" as IssueSeverity,
    category: "배포",
    icon: Server,
    time: "12시간 전",
    status: "resolved" as IssueStatus,
  },
  {
    id: "4",
    title: "Error rate 증가: /api/checkout",
    severity: "critical" as IssueSeverity,
    category: "에러",
    icon: AlertTriangle,
    time: "1일 전",
    status: "open" as IssueStatus,
  },
];

const MOCK_DEPLOYS = [
  {
    id: "d1",
    commit: "f7a3b2e",
    msg: "feat: 결제 플로우 UX 개선",
    author: "박보겸",
    time: "14분 전",
    status: "running" as DeployStatus,
    env: "production",
  },
  {
    id: "d2",
    commit: "c9e1d4a",
    msg: "fix: 세션 만료 버그 수정",
    author: "박보겸",
    time: "3시간 전",
    status: "success" as DeployStatus,
    env: "production",
  },
  {
    id: "d3",
    commit: "a3f2d1c",
    msg: "refactor: 이미지 최적화 파이프라인",
    author: "박보겸",
    time: "12시간 전",
    status: "failed" as DeployStatus,
    env: "production",
  },
  {
    id: "d4",
    commit: "b8c5f9d",
    msg: "chore: 의존성 업데이트",
    author: "박보겸",
    time: "1일 전",
    status: "success" as DeployStatus,
    env: "staging",
  },
  {
    id: "d5",
    commit: "e2a7c3f",
    msg: "feat: 대시보드 차트 컴포넌트 추가",
    author: "박보겸",
    time: "2일 전",
    status: "success" as DeployStatus,
    env: "production",
  },
];

const SERVICES = [
  {
    name: "API 서버",
    icon: Server,
    status: "degraded" as ServiceStatus,
    latency: "2.3s",
    uptime: "99.1%",
  },
  {
    name: "데이터베이스",
    icon: Database,
    status: "healthy" as ServiceStatus,
    latency: "12ms",
    uptime: "99.9%",
  },
  {
    name: "CDN / 프론트",
    icon: Globe,
    status: "healthy" as ServiceStatus,
    latency: "48ms",
    uptime: "100%",
  },
  {
    name: "인증 서비스",
    icon: Shield,
    status: "healthy" as ServiceStatus,
    latency: "130ms",
    uptime: "99.8%",
  },
];

const SERVICE_CFG: Record<
  ServiceStatus,
  { bg: string; dot: string; text: string; label: string }
> = {
  healthy: {
    bg: "bg-white",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
    label: "정상",
  },
  degraded: {
    bg: "bg-white",
    dot: "bg-amber-500 animate-pulse",
    text: "text-amber-600",
    label: "저하",
  },
  down: {
    bg: "bg-white",
    dot: "bg-rose-500 animate-pulse",
    text: "text-rose-600",
    label: "중단",
  },
};

const DEPLOY_CFG: Record<
  DeployStatus,
  { bar: string; text: string; label: string; Icon: React.ElementType }
> = {
  success: {
    bar: "bg-emerald-500",
    text: "text-emerald-600",
    label: "성공",
    Icon: CheckCircle2,
  },
  failed: {
    bar: "bg-rose-500",
    text: "text-rose-600",
    label: "실패",
    Icon: XCircle,
  },
  running: {
    bar: "bg-blue-500",
    text: "text-blue-600",
    label: "배포중",
    Icon: RefreshCw,
  },
  cancelled: {
    bar: "bg-slate-300",
    text: "text-slate-400",
    label: "취소",
    Icon: XCircle,
  },
};

const SEVERITY_CFG: Record<
  IssueSeverity,
  { bg: string; text: string; border: string; label: string }
> = {
  critical: {
    bg: "bg-white",
    text: "text-rose-600",
    border: "border-rose-100",
    label: "Critical",
  },
  warning: {
    bg: "bg-white",
    text: "text-amber-600",
    border: "border-amber-100",
    label: "Warning",
  },
  info: {
    bg: "bg-white",
    text: "text-blue-600",
    border: "border-blue-100",
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
  const deploySuccessRate = Math.round(
    (deployData.filter((d) => d.status === "success").length /
      deployData.filter((d) => d.status !== "running").length) *
      100,
  );

  return (
    <div className="px-10 py-10 w-full min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
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
            <h1 className="text-[26px] font-bold tracking-tight text-slate-800">
              운영 현황
            </h1>
          </div>
          {openCount > 0 && (
            <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600 bg-rose-50 px-4 py-2 rounded-full">
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
              colorClass: "text-rose-600",
              sub: "즉시 조치 필요",
            },
            {
              label: "Warning",
              count: issueData.filter(
                (i) => i.severity === "warning" && i.status !== "resolved",
              ).length,
              colorClass: "text-amber-600",
              sub: "모니터링 필요",
            },
            {
              label: "Resolved",
              count: issueData.filter((i) => i.status === "resolved").length,
              colorClass: "text-emerald-600",
              sub: "24h 내 해결됨",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-[20px] p-6 border border-slate-100 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]"
            >
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 leading-none">
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
              <p className="text-[11px] font-medium text-slate-400">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── 서비스 상태 (4컬럼 그리드) ── */}
        <motion.div
          variants={fadeUp}
          className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]"
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-4 h-4 text-slate-400" />
            <p className="text-[15px] font-semibold text-slate-800">
              서비스 상태
            </p>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {SERVICES.map((svc) => {
              const cfg = SERVICE_CFG[svc.status];
              return (
                <div
                  key={svc.name}
                  className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-4 transition-all hover:bg-slate-50/50 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <svc.icon className="w-4 h-4 text-slate-400" />
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
                    <p className="text-[14px] font-bold text-slate-700">
                      {svc.name}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">
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
            className="col-span-3 bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-slate-400" />
                <p className="text-[15px] font-semibold text-slate-800">
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
                <span className="text-[11px] font-bold text-slate-400">
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
                <tr className="border-b border-slate-50">
                  {["커밋", "메시지", "환경", "시간", "상태"].map((h) => (
                    <th
                      key={h}
                      className="pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"
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
                      className="hover:bg-slate-50/30 transition-colors group cursor-pointer"
                    >
                      <td className="py-4">
                        <span
                          className={cn(
                            "font-mono text-[10px] px-2 py-0.5 rounded font-semibold bg-white border border-slate-100",
                            cfg.text,
                          )}
                        >
                          {d.commit}
                        </span>
                      </td>
                      <td className="py-4 text-[13px] font-normal text-slate-600 max-w-[140px] truncate group-hover:text-slate-900 transition-colors">
                        {d.msg}
                      </td>
                      <td className="py-4">
                        <span
                          className={cn(
                            "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest bg-white border-slate-100",
                            d.env === "production"
                              ? "text-violet-500"
                              : "text-slate-400",
                          )}
                        >
                          {d.env}
                        </span>
                      </td>
                      <td className="py-4 text-[12px] font-normal text-slate-400 whitespace-nowrap">
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
            className="col-span-2 bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <p className="text-[15px] font-semibold text-slate-800">
                  이슈 목록
                </p>
              </div>
              <button className="text-[11px] font-bold text-slate-300 hover:text-slate-500 transition-colors uppercase tracking-widest leading-none">
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
                      "bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all hover:bg-slate-50/50 group cursor-pointer shadow-sm border-slate-100",
                    )}
                  >
                    <issue.icon className="w-4 h-4 text-slate-400 shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-slate-700 truncate leading-snug">
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
                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                          {issue.time}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div
                        className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-100",
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

            <div className="mt-6 pt-4 border-t border-slate-50">
              <button className="flex items-center justify-center gap-1 w-full text-[12px] font-bold text-slate-400 hover:text-slate-700 transition-colors">
                전체 히스토리 보기 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
