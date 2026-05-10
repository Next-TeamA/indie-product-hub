"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Server,
  Shield,
  Zap,
  GitCommit,
  Database,
  Globe,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

type Issue = {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  category: string;
  icon: React.ElementType;
  time: string;
  status: "open" | "resolved" | "investigating";
};

type DeployLog = {
  id: string;
  commit: string;
  message: string;
  branch: string;
  author: string;
  time: string;
  duration: string;
  status: "success" | "failed" | "running" | "cancelled";
  env: "production" | "staging";
};

type ServiceStatus = {
  name: string;
  icon: React.ElementType;
  status: "healthy" | "degraded" | "down";
  latency: string;
  uptime: string;
  trend: "up" | "down" | "stable";
};

const MOCK_ISSUES: Issue[] = [
  {
    id: "1",
    title: "SSL 인증서 만료 예정 (5/15)",
    severity: "critical",
    category: "보안",
    icon: Shield,
    time: "2시간 전",
    status: "open",
  },
  {
    id: "2",
    title: "API 응답 시간 평균 2.3s (기준: 1s 이하)",
    severity: "warning",
    category: "성능",
    icon: Zap,
    time: "6시간 전",
    status: "investigating",
  },
  {
    id: "3",
    title: "배포 실패: main@a3f2d1c (build timeout)",
    severity: "warning",
    category: "배포",
    icon: Server,
    time: "12시간 전",
    status: "resolved",
  },
  {
    id: "4",
    title: "Error rate 증가: /api/checkout (0.3% → 1.2%)",
    severity: "critical",
    category: "에러",
    icon: AlertTriangle,
    time: "1일 전",
    status: "open",
  },
];

const MOCK_DEPLOY_LOGS: DeployLog[] = [
  {
    id: "d1",
    commit: "f7a3b2e",
    message: "feat: 결제 플로우 UX 개선",
    branch: "main",
    author: "박보겸",
    time: "14분 전",
    duration: "2m 34s",
    status: "running",
    env: "production",
  },
  {
    id: "d2",
    commit: "c9e1d4a",
    message: "fix: 세션 만료 버그 수정",
    branch: "main",
    author: "박보겸",
    time: "3시간 전",
    duration: "1m 58s",
    status: "success",
    env: "production",
  },
  {
    id: "d3",
    commit: "a3f2d1c",
    message: "refactor: 이미지 최적화 파이프라인 교체",
    branch: "main",
    author: "박보겸",
    time: "12시간 전",
    duration: "8m 12s",
    status: "failed",
    env: "production",
  },
  {
    id: "d4",
    commit: "b8c5f9d",
    message: "chore: 의존성 업데이트",
    branch: "main",
    author: "박보겸",
    time: "1일 전",
    duration: "2m 11s",
    status: "success",
    env: "staging",
  },
  {
    id: "d5",
    commit: "e2a7c3f",
    message: "feat: 대시보드 차트 컴포넌트 추가",
    branch: "main",
    author: "박보겸",
    time: "2일 전",
    duration: "2m 02s",
    status: "success",
    env: "production",
  },
];

const MOCK_SERVICES: ServiceStatus[] = [
  {
    name: "API 서버",
    icon: Server,
    status: "degraded",
    latency: "2.3s",
    uptime: "99.1%",
    trend: "down",
  },
  {
    name: "데이터베이스",
    icon: Database,
    status: "healthy",
    latency: "12ms",
    uptime: "99.9%",
    trend: "stable",
  },
  {
    name: "CDN / 프론트엔드",
    icon: Globe,
    status: "healthy",
    latency: "48ms",
    uptime: "100%",
    trend: "stable",
  },
  {
    name: "인증 서비스",
    icon: Shield,
    status: "healthy",
    latency: "130ms",
    uptime: "99.8%",
    trend: "up",
  },
];

const statusIcon = {
  open: XCircle,
  resolved: CheckCircle2,
  investigating: Clock,
};

const statusLabel = {
  open: "미해결",
  resolved: "해결됨",
  investigating: "조사 중",
};

const deployStatusConfig = {
  success: {
    label: "성공",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: CheckCircle2,
  },
  failed: {
    label: "실패",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
    icon: XCircle,
  },
  running: {
    label: "배포 중",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10",
    icon: RefreshCw,
  },
  cancelled: {
    label: "취소",
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    icon: Minus,
  },
};

const serviceStatusConfig = {
  healthy: {
    label: "정상",
    color: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  degraded: {
    label: "저하",
    color: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500 animate-pulse",
  },
  down: {
    label: "중단",
    color: "text-red-600 dark:text-red-400",
    dot: "bg-red-500 animate-pulse",
  },
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
  if (trend === "up") return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (trend === "down") return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
};

export default function IssuesPage() {
  const openCount = MOCK_ISSUES.filter((i) => i.status !== "resolved").length;
  const deploySuccessRate = Math.round(
    (MOCK_DEPLOY_LOGS.filter((d) => d.status === "success").length /
      MOCK_DEPLOY_LOGS.filter((d) => d.status !== "running").length) *
      100
  );

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-10"
      >
        {/* 헤더 */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="h-eyebrow mb-1">ISSUES</p>
            <h1 className="text-2xl font-bold tracking-tight">운영 현황</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">미해결 {openCount}건</span>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        </motion.div>

        {/* 이슈 요약 스탯 */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-0 divide-x divide-border">
          {[
            {
              label: "Critical",
              count: MOCK_ISSUES.filter(
                (i) => i.severity === "critical" && i.status !== "resolved"
              ).length,
              color: "text-red-600 dark:text-red-400",
            },
            {
              label: "Warning",
              count: MOCK_ISSUES.filter(
                (i) => i.severity === "warning" && i.status !== "resolved"
              ).length,
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Resolved",
              count: MOCK_ISSUES.filter((i) => i.status === "resolved").length,
              color: "text-emerald-600 dark:text-emerald-400",
            },
          ].map((s) => (
            <div key={s.label} className="text-center py-4">
              <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>

        <hr className="border-border" />

        {/* 서비스 상태 */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">서비스 상태</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {MOCK_SERVICES.map((svc) => {
              const cfg = serviceStatusConfig[svc.status];
              return (
                <div
                  key={svc.name}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20"
                >
                  <svc.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{svc.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-muted-foreground">{svc.latency}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={svc.trend} />
                      <span className="text-xs text-muted-foreground">{svc.uptime}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <hr className="border-border" />

        {/* 배포 로그 분석 */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">배포 로그</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              성공률{" "}
              <span
                className={
                  deploySuccessRate >= 80
                    ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                    : "text-red-600 dark:text-red-400 font-semibold"
                }
              >
                {deploySuccessRate}%
              </span>
            </span>
          </div>

          {/* 배포 타임라인 바 */}
          <div className="flex gap-1 h-2">
            {MOCK_DEPLOY_LOGS.slice()
              .reverse()
              .map((log) => (
                <div
                  key={log.id}
                  title={`${log.message} — ${deployStatusConfig[log.status].label}`}
                  className={`flex-1 rounded-full ${
                    log.status === "success"
                      ? "bg-emerald-500"
                      : log.status === "failed"
                        ? "bg-red-500"
                        : log.status === "running"
                          ? "bg-blue-500 animate-pulse"
                          : "bg-muted"
                  }`}
                />
              ))}
          </div>

          <div className="divide-y divide-border">
            {MOCK_DEPLOY_LOGS.map((log) => {
              const cfg = deployStatusConfig[log.status];
              const StatusIcon = cfg.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-center gap-3 py-3.5 -mx-2 px-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <span
                    className={`font-mono text-xs px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} shrink-0`}
                  >
                    {log.commit}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{log.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{log.author}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">{log.duration}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full border ${
                        log.env === "production"
                          ? "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10"
                          : "border-border text-muted-foreground bg-muted/40"
                      }`}
                    >
                      {log.env}
                    </span>
                    <div className="flex items-center gap-1">
                      <StatusIcon
                        className={`w-3.5 h-3.5 ${cfg.color} ${log.status === "running" ? "animate-spin" : ""}`}
                      />
                      <span className={`text-xs ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <hr className="border-border" />

        {/* 이슈 목록 */}
        <motion.div variants={fadeUp} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">이슈 목록</h2>
          </div>
          <div className="divide-y divide-border">
            {MOCK_ISSUES.map((issue) => {
              const StatusIcon = statusIcon[issue.status];
              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-4 py-4 cursor-pointer hover:bg-muted/40 transition-colors -mx-2 px-2 rounded-lg"
                >
                  <issue.icon className="w-4 h-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${
                          issue.severity === "critical"
                            ? "bg-red-500/10 text-red-600 dark:text-red-400"
                            : issue.severity === "warning"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {issue.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{issue.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <StatusIcon
                      className={`w-3.5 h-3.5 ${
                        issue.status === "resolved"
                          ? "text-emerald-500"
                          : issue.status === "investigating"
                            ? "text-amber-500"
                            : "text-red-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {statusLabel[issue.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
