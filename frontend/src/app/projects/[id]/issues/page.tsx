"use client";

import { motion } from "motion/react";
import {
  AlertTriangle, Clock, CheckCircle2, XCircle,
  Server, Shield, Zap, Database, Globe,
  RefreshCw, Loader2,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIssues } from "@/hooks/use-issues";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const COLORS = {
  positive: "#5FCC7D",
  negative: "#D97B78",
  warning: "#D4A84B",
  secondary: "#6B7D8F",
  neutral: "#4A4A4A",
};

type IssueSeverity = "critical" | "warning" | "info";
type IssueStatus = "open" | "resolved" | "investigating";

const SEVERITY_COLOR: Record<IssueSeverity, string> = {
  critical: COLORS.negative,
  warning: COLORS.warning,
  info: COLORS.secondary,
};

const STATUS_ICON: Record<IssueStatus, React.ElementType> = {
  open: XCircle,
  resolved: CheckCircle2,
  investigating: Clock,
};

const STATUS_LABEL: Record<IssueStatus, string> = {
  open: "Open",
  resolved: "Resolved",
  investigating: "Investigating",
};

const CATEGORY_ICON: Record<string, React.ElementType> = {
  security: Shield,
  performance: Zap,
  deployment: Server,
  error: AlertTriangle,
  general: AlertTriangle,
};

const MOCK_DEPLOYS = [
  { commit: "f7a3b2e", msg: "feat: payment UX improvement", time: "14m", status: "running" as const },
  { commit: "c9e1d4a", msg: "fix: session expiry bug", time: "3h", status: "success" as const },
  { commit: "a3f2d1c", msg: "refactor: image optimization", time: "12h", status: "failed" as const },
  { commit: "b8c5f9d", msg: "chore: dependency update", time: "1d", status: "success" as const },
  { commit: "e2a7c3f", msg: "feat: dashboard chart", time: "2d", status: "success" as const },
];

const DEPLOY_CFG = {
  success: { text: "text-[#5FCC7D]", Icon: CheckCircle2 },
  failed: { text: "text-[#D97B78]", Icon: XCircle },
  running: { text: "text-[#6B7D8F]", Icon: RefreshCw },
  cancelled: { text: "text-[#4A4A4A]", Icon: XCircle },
};

const SERVICES = [
  { name: "API", icon: Server, status: "degraded" as const, latency: "2.3s" },
  { name: "Database", icon: Database, status: "healthy" as const, latency: "12ms" },
  { name: "CDN", icon: Globe, status: "healthy" as const, latency: "48ms" },
  { name: "Auth", icon: Shield, status: "healthy" as const, latency: "130ms" },
];

const SERVICE_CFG = {
  healthy: { color: COLORS.positive, label: "OK" },
  degraded: { color: COLORS.warning, label: "Slow" },
  down: { color: COLORS.negative, label: "Down" },
};

export default function IssuesPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { issues, isLoading } = useIssues(projectId);
  const t = useTranslations("issues");

  const criticalCount = issues.filter(i => i.severity === "critical" && i.status !== "resolved").length;
  const warningCount = issues.filter(i => i.severity === "warning" && i.status !== "resolved").length;
  const resolvedCount = issues.filter(i => i.status === "resolved").length;

  return (
    <div className="w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1.5">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          {criticalCount > 0 && (
            <span
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: "rgba(217,123,120,0.12)", color: COLORS.negative }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.negative }} />
              {criticalCount} critical
            </span>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-1.5">
          {[
            { label: t("critical"), count: criticalCount, color: COLORS.negative, sub: t("needsAction") },
            { label: t("warning"), count: warningCount, color: COLORS.warning, sub: t("monitoring") },
            { label: t("resolved"), count: resolvedCount, color: COLORS.positive, sub: t("allResolved") },
          ].map(s => (
            <div key={s.label} className="rounded-3xl bg-card p-5">
              <p className="text-xs text-muted-foreground mb-2">{s.label}</p>
              <p className="text-3xl font-bold tabular-nums" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Services */}
        <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
          <p className="text-sm font-semibold mb-4">{t("serviceStatus")}</p>
          <div className="grid grid-cols-4 gap-1.5">
            {SERVICES.map(svc => {
              const cfg = SERVICE_CFG[svc.status];
              return (
                <div key={svc.name} className="rounded-2xl bg-secondary/30 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <svc.icon className="w-4 h-4 text-muted-foreground" />
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      <span className="text-xs text-muted-foreground">{cfg.label}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{svc.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{svc.latency}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Deploys + Issues */}
        <div className="grid grid-cols-5 gap-1.5">

          {/* Deploy log */}
          <motion.div variants={fadeUp} className="col-span-3 rounded-3xl bg-card p-5">
            <p className="text-sm font-semibold mb-4">{t("deployLog")}</p>
            <div className="flex flex-col gap-1">
              {MOCK_DEPLOYS.map(d => {
                const cfg = DEPLOY_CFG[d.status];
                return (
                  <div key={d.commit} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors">
                    <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">{d.commit}</span>
                    <span className="text-xs flex-1 truncate">{d.msg}</span>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{d.time}</span>
                    <cfg.Icon className={`w-3.5 h-3.5 ${cfg.text} ${d.status === "running" ? "animate-spin" : ""} shrink-0`} />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Issue list */}
          <motion.div variants={fadeUp} className="col-span-2 rounded-3xl bg-card p-5">
            <p className="text-sm font-semibold mb-4">{t("issueList")}</p>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : issues.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">{t("noIssues")}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {issues.map(issue => {
                  const sev = (issue.severity as IssueSeverity) || "info";
                  const st = (issue.status as IssueStatus) || "open";
                  const StatusIcon = STATUS_ICON[st] ?? XCircle;
                  const CategoryIcon = CATEGORY_ICON[issue.category] ?? AlertTriangle;
                  const color = SEVERITY_COLOR[sev] ?? COLORS.secondary;

                  return (
                    <div
                      key={issue.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <div className="w-0.5 self-stretch rounded-full shrink-0" style={{ background: color }} />
                      <CategoryIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{issue.title}</p>
                        <span className="text-[10px] text-muted-foreground">{issue.category}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusIcon className="w-3 h-3" style={{ color }} />
                        <span className="text-[10px] text-muted-foreground">{STATUS_LABEL[st]}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
