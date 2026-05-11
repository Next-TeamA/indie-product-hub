"use client";

import { motion } from "motion/react";
import {
  AlertTriangle, Clock, CheckCircle2, XCircle,
  Server, Shield, Zap, Database, Globe,
  GitCommit, Activity, RefreshCw, ChevronRight,
} from "lucide-react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};

// ─── 데이터 ────────────────────────────────────────────────

type IssueStatus   = "open" | "resolved" | "investigating";
type IssueSeverity = "critical" | "warning" | "info";
type DeployStatus  = "success" | "failed" | "running" | "cancelled";
type ServiceStatus = "healthy" | "degraded" | "down";

const MOCK_ISSUES = [
  { id: "1", title: "SSL 인증서 만료 예정 (5/15)", severity: "critical" as IssueSeverity, category: "보안",  icon: Shield,        time: "2시간 전",  status: "open" as IssueStatus },
  { id: "2", title: "API 응답 시간 평균 2.3s 초과",  severity: "warning"  as IssueSeverity, category: "성능",  icon: Zap,           time: "6시간 전",  status: "investigating" as IssueStatus },
  { id: "3", title: "배포 실패: main@a3f2d1c",       severity: "warning"  as IssueSeverity, category: "배포",  icon: Server,        time: "12시간 전", status: "resolved" as IssueStatus },
  { id: "4", title: "Error rate 증가: /api/checkout",severity: "critical" as IssueSeverity, category: "에러",  icon: AlertTriangle, time: "1일 전",    status: "open" as IssueStatus },
];

const MOCK_DEPLOYS = [
  { id: "d1", commit: "f7a3b2e", msg: "feat: 결제 플로우 UX 개선",       author: "박보겸", time: "14분 전",  duration: "2m 34s", status: "running"   as DeployStatus, env: "production" as const },
  { id: "d2", commit: "c9e1d4a", msg: "fix: 세션 만료 버그 수정",         author: "박보겸", time: "3시간 전",  duration: "1m 58s", status: "success"   as DeployStatus, env: "production" as const },
  { id: "d3", commit: "a3f2d1c", msg: "refactor: 이미지 최적화 파이프라인", author: "박보겸", time: "12시간 전", duration: "8m 12s", status: "failed"    as DeployStatus, env: "production" as const },
  { id: "d4", commit: "b8c5f9d", msg: "chore: 의존성 업데이트",           author: "박보겸", time: "1일 전",    duration: "2m 11s", status: "success"   as DeployStatus, env: "staging"    as const },
  { id: "d5", commit: "e2a7c3f", msg: "feat: 대시보드 차트 컴포넌트 추가",  author: "박보겸", time: "2일 전",    duration: "2m 02s", status: "success"   as DeployStatus, env: "production" as const },
];

const SERVICES = [
  { name: "API 서버",     icon: Server,   status: "degraded" as ServiceStatus, latency: "2.3s",  uptime: "99.1%" },
  { name: "데이터베이스",  icon: Database, status: "healthy"  as ServiceStatus, latency: "12ms",  uptime: "99.9%" },
  { name: "CDN / 프론트", icon: Globe,    status: "healthy"  as ServiceStatus, latency: "48ms",  uptime: "100%"  },
  { name: "인증 서비스",   icon: Shield,   status: "healthy"  as ServiceStatus, latency: "130ms", uptime: "99.8%" },
];

const SERVICE_CFG: Record<ServiceStatus, { bg: string; dot: string; text: string; label: string }> = {
  healthy:  { bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500",             text: "text-emerald-600 dark:text-emerald-400", label: "정상" },
  degraded: { bg: "bg-amber-50 dark:bg-amber-950/30",     dot: "bg-amber-500 animate-pulse", text: "text-amber-600 dark:text-amber-400",     label: "저하" },
  down:     { bg: "bg-red-50 dark:bg-red-950/30",         dot: "bg-red-500 animate-pulse",   text: "text-red-600 dark:text-red-400",         label: "중단" },
};

const DEPLOY_CFG: Record<DeployStatus, { bar: string; text: string; label: string; Icon: React.ElementType }> = {
  success:   { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "성공",  Icon: CheckCircle2 },
  failed:    { bar: "bg-red-500",     text: "text-red-600 dark:text-red-400",         label: "실패",  Icon: XCircle      },
  running:   { bar: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400",       label: "배포중", Icon: RefreshCw    },
  cancelled: { bar: "bg-muted",       text: "text-muted-foreground",                 label: "취소",  Icon: XCircle      },
};

const STATUS_ICON: Record<IssueStatus, React.ElementType> = { open: XCircle, resolved: CheckCircle2, investigating: Clock };
const STATUS_LABEL: Record<IssueStatus, string> = { open: "미해결", resolved: "해결됨", investigating: "조사 중" };

const SEVERITY_CFG: Record<IssueSeverity, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50 dark:bg-red-950/30",    text: "text-red-600 dark:text-red-400",    border: "border-l-red-500"    },
  warning:  { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400", border: "border-l-amber-500"  },
  info:     { bg: "bg-blue-50 dark:bg-blue-950/30",  text: "text-blue-600 dark:text-blue-400",  border: "border-l-blue-500"  },
};

export default function IssuesPage() {
  const openCount    = MOCK_ISSUES.filter(i => i.status !== "resolved").length;
  const criticalCount = MOCK_ISSUES.filter(i => i.severity === "critical" && i.status !== "resolved").length;
  const warningCount  = MOCK_ISSUES.filter(i => i.severity === "warning"  && i.status !== "resolved").length;
  const resolvedCount = MOCK_ISSUES.filter(i => i.status === "resolved").length;
  const deploySuccessRate = Math.round(
    MOCK_DEPLOYS.filter(d => d.status === "success").length /
    MOCK_DEPLOYS.filter(d => d.status !== "running").length * 100
  );

  return (
    <div className="px-10 py-8 w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">

        {/* ── 헤더 ── */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Issues</p>
            <h1 className="text-2xl font-bold tracking-tight">운영 현황</h1>
          </div>
          {openCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
              미해결 {openCount}건
            </span>
          )}
        </motion.div>

        {/* ── 요약 스탯 3개 ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-4">
          {[
            { label: "Critical", count: criticalCount, bg: "bg-red-50 dark:bg-red-950/30",      text: "text-red-600 dark:text-red-400",    sub: "즉시 조치 필요" },
            { label: "Warning",  count: warningCount,  bg: "bg-amber-50 dark:bg-amber-950/30",  text: "text-amber-600 dark:text-amber-400", sub: "모니터링 필요"  },
            { label: "Resolved", count: resolvedCount, bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-600 dark:text-emerald-400", sub: "해결 완료"   },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl ${s.bg} p-5`}>
              <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
              <p className={`text-3xl font-bold ${s.text}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* ── 서비스 상태 ── */}
        <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">서비스 상태</p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {SERVICES.map(svc => {
              const cfg = SERVICE_CFG[svc.status];
              return (
                <div key={svc.name} className={`rounded-xl ${cfg.bg} p-4 flex flex-col gap-3`}>
                  <div className="flex items-center justify-between">
                    <svc.icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{svc.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">응답 {svc.latency} · 가용성 {svc.uptime}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── 배포 로그 + 이슈 목록 ── */}
        <div className="grid grid-cols-5 gap-4">

          {/* 배포 로그 */}
          <motion.div variants={fadeUp} className="col-span-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold">배포 로그</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 h-1.5 w-20">
                  {[...MOCK_DEPLOYS].reverse().map((d, i) => (
                    <div key={i} className={`flex-1 rounded-full ${DEPLOY_CFG[d.status].bar} ${d.status === "running" ? "animate-pulse" : ""}`} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  성공률 <span className={`font-semibold ${deploySuccessRate >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>{deploySuccessRate}%</span>
                </span>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left">
                  {["커밋", "메시지", "환경", "시간", "상태"].map(h => (
                    <th key={h} className="pb-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {MOCK_DEPLOYS.map(d => {
                  const cfg = DEPLOY_CFG[d.status];
                  return (
                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${cfg.bar.replace("500","500/10")} ${cfg.text}`}>
                          {d.commit}
                        </span>
                      </td>
                      <td className="py-3 text-xs max-w-[160px] truncate">{d.msg}</td>
                      <td className="py-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                          d.env === "production"
                            ? "border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10"
                            : "border-border text-muted-foreground"
                        }`}>{d.env}</span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{d.time}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <cfg.Icon className={`w-3.5 h-3.5 ${cfg.text} ${d.status === "running" ? "animate-spin" : ""}`} />
                          <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          {/* 이슈 목록 */}
          <motion.div variants={fadeUp} className="col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-semibold">이슈 목록</p>
            </div>
            <div className="flex flex-col gap-2.5">
              {MOCK_ISSUES.map(issue => {
                const cfg = SEVERITY_CFG[issue.severity];
                const StatusIcon = STATUS_ICON[issue.status];
                return (
                  <div
                    key={issue.id}
                    className={`rounded-xl border-l-4 ${cfg.border} ${cfg.bg} px-4 py-3 flex items-center gap-3 cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all`}
                  >
                    <issue.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{issue.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] font-medium ${cfg.text}`}>{issue.category}</span>
                        <span className="text-[10px] text-muted-foreground">{issue.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusIcon className={`w-3.5 h-3.5 ${
                        issue.status === "resolved" ? "text-emerald-500" :
                        issue.status === "investigating" ? "text-amber-500" : "text-red-500"
                      }`} />
                      <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[issue.status]}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                전체 이슈 보기 <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>

        </div>
      </motion.div>
    </div>
  );
}
