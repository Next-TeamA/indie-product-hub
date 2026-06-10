"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Loader2,
  ExternalLink,
  Activity,
  Clock,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  useDownstreamImpact,
  useHealthHistory,
  usePlatformDeployments,
  useSloProgress,
  useTopology,
  useUpstreamImpact,
} from "@/hooks/use-platform-deployments";
import { manualPing } from "@/lib/api/platform-deployments";
import {
  EnvBadge,
  RoleBadge,
  StatusBadge,
  STATUS_COLOR,
  STATUS_LABEL,
} from "@/components/deployments/status-badge";
import type {
  HealthCheckRow,
  HealthStatus,
  ImpactNode,
} from "@/lib/api/platform-deployments";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function DeploymentDetailPage() {
  const { id: projectId, deploymentId } = useParams<{
    id: string;
    deploymentId: string;
  }>();
  const { deployments, isLoading: depsLoading, mutate: mutateDeployments } =
    usePlatformDeployments(projectId);
  const { mutate: mutateTopo } = useTopology(projectId);
  const { impact: down } = useDownstreamImpact(projectId, deploymentId);
  const { impact: up } = useUpstreamImpact(projectId, deploymentId);
  const { slo } = useSloProgress(projectId, deploymentId);

  const [historyHours, setHistoryHours] = useState(24);
  const {
    checks,
    isLoading: historyLoading,
    mutate: mutateHistory,
  } = useHealthHistory(projectId, deploymentId, historyHours);

  const [pinging, setPinging] = useState(false);
  const [pingErr, setPingErr] = useState<string | null>(null);

  const deployment = useMemo(
    () => deployments.find((d) => d.id === deploymentId),
    [deployments, deploymentId],
  );

  async function ping() {
    setPinging(true);
    setPingErr(null);
    try {
      await manualPing(projectId, deploymentId);
      mutateDeployments();
      mutateTopo();
      mutateHistory();
    } catch (e) {
      setPingErr(e instanceof Error ? e.message : "ping 실패");
    } finally {
      setPinging(false);
    }
  }

  if (depsLoading || !deployment) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
        불러오는 중
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <Link
          href={`/projects/${projectId}/deployments`}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 모든 배포
        </Link>

        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">
            {deployment.name}
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {deployment.platform}
          </span>
          <RoleBadge role={deployment.role} />
          <EnvBadge env={deployment.environment} />
          <StatusBadge status={deployment.status} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {deployment.framework && <span>{deployment.framework}</span>}
          {deployment.external_url && (
            <a
              href={deployment.external_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-blue-500 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {deployment.external_url}
            </a>
          )}
          {deployment.last_checked_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              마지막 체크 {new Date(deployment.last_checked_at).toLocaleString("ko-KR")}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={ping}
            disabled={pinging}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {pinging ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Activity className="h-4 w-4" />
            )}
            지금 health check
          </button>
        </div>
        {pingErr && <p className="mt-2 text-sm text-rose-500">{pingErr}</p>}

        {/* SLO */}
        {slo?.has_data && (
          <Section title="SLO (최근 24시간)">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Metric
                label="Uptime"
                value={
                  slo.uptime_pct_24h != null
                    ? `${slo.uptime_pct_24h.toFixed(2)}%`
                    : "--"
                }
                target={
                  slo.slo_target?.uptime_pct != null
                    ? `목표 ${slo.slo_target.uptime_pct}%`
                    : undefined
                }
                violated={slo.uptime_violation}
              />
              <Metric
                label="평균 응답시간"
                value={
                  slo.avg_response_ms_24h != null
                    ? `${Math.round(slo.avg_response_ms_24h)}ms`
                    : "--"
                }
                target={
                  slo.slo_target?.latency_p95_ms != null
                    ? `목표 p95 ${slo.slo_target.latency_p95_ms}ms`
                    : undefined
                }
                violated={slo.latency_violation}
              />
              <Metric
                label="체크 횟수"
                value={`${slo.total_checks_24h ?? 0}회`}
                target={
                  (slo.down_checks_24h ?? 0) + (slo.degraded_checks_24h ?? 0) > 0
                    ? `down ${slo.down_checks_24h ?? 0} · degraded ${slo.degraded_checks_24h ?? 0}`
                    : "이슈 없음"
                }
              />
            </div>
          </Section>
        )}

        {/* Impact analysis */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ImpactCard
            title="이 배포가 down 되면 영향"
            description="다운스트림 -- 이 배포에 의존하는 deployments"
            icon={<TrendingDown className="h-4 w-4" />}
            nodes={down?.affected ?? []}
            projectId={projectId}
          />
          <ImpactCard
            title="이 배포가 의존하는 곳"
            description="업스트림 -- 이 배포가 호출/조회하는 deployments"
            icon={<AlertTriangle className="h-4 w-4" />}
            nodes={up?.upstream ?? []}
            projectId={projectId}
          />
        </div>

        {/* Health history chart */}
        <Section
          title={`Health 기록 (최근 ${historyHours}시간)`}
          right={
            <div className="inline-flex rounded-full bg-muted p-1">
              {[6, 24, 72].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setHistoryHours(h)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-bold",
                    historyHours === h
                      ? "bg-card text-foreground shadow"
                      : "text-muted-foreground",
                  )}
                >
                  {h}h
                </button>
              ))}
            </div>
          }
        >
          {historyLoading ? (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
            </div>
          ) : checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 없어요.</p>
          ) : (
            <HealthHistoryChart checks={checks} />
          )}
        </Section>
      </motion.div>
    </div>
  );
}

// ============================================================
// Subcomponents
// ============================================================

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  target,
  violated,
}: {
  label: string;
  value: string;
  target?: string;
  violated?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        violated
          ? "border-rose-300 dark:border-rose-900"
          : "border-border",
      )}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-2xl font-bold",
          violated ? "text-rose-600 dark:text-rose-400" : "text-foreground",
        )}
      >
        {value}
      </p>
      {target && <p className="mt-1 text-xs text-muted-foreground">{target}</p>}
    </div>
  );
}

function ImpactCard({
  title,
  description,
  icon,
  nodes,
  projectId,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  nodes: ImpactNode[];
  projectId: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-sm font-bold text-foreground">{title}</p>
        <span className="ml-1 text-xs text-muted-foreground">{nodes.length}개</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{description}</p>
      {nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">없음</p>
      ) : (
        <ul className="space-y-1">
          {nodes.map((n) => (
            <li key={n.id}>
              <Link
                href={`/projects/${projectId}/deployments/${n.id}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background p-2 text-sm hover:bg-muted/40"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground">
                    {"·".repeat(n.depth)} L{n.depth}
                  </span>
                  <span className="font-medium text-foreground truncate">
                    {n.name}
                  </span>
                  <RoleBadge role={n.role} />
                  <EnvBadge env={n.environment} />
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={n.current_status} />
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function HealthHistoryChart({ checks }: { checks: HealthCheckRow[] }) {
  // 단순 status bar chart + 평균 응답시간 라인.
  const maxBars = 200;
  const sampled =
    checks.length <= maxBars
      ? checks
      : checks.filter((_, i) => i % Math.ceil(checks.length / maxBars) === 0);

  const responseTimes = sampled.map((c) => c.response_time_ms ?? 0);
  const maxResp = Math.max(1, ...responseTimes);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {/* status bars */}
      <div className="flex h-12 items-end gap-[2px]">
        {sampled.map((c, i) => (
          <div
            key={i}
            className={cn("flex-1 min-w-[3px] rounded-sm", barColor(c.status))}
            style={{ height: "100%" }}
            title={`${new Date(c.checked_at).toLocaleTimeString("ko-KR")} · ${STATUS_LABEL[c.status]}${
              c.response_time_ms ? ` · ${c.response_time_ms}ms` : ""
            }${c.cascade_from ? " · cascade" : ""}`}
          />
        ))}
      </div>
      {/* response time mini chart */}
      {responseTimes.some((r) => r > 0) && (
        <div className="mt-3 flex h-10 items-end gap-[2px]">
          {sampled.map((c, i) => {
            const r = c.response_time_ms ?? 0;
            const h = r === 0 ? 0 : Math.max(2, (r / maxResp) * 100);
            return (
              <div
                key={i}
                className="flex-1 min-w-[3px] rounded-sm bg-blue-200 dark:bg-blue-900/40"
                style={{ height: `${h}%` }}
                title={r ? `${r}ms` : "no data"}
              />
            );
          })}
        </div>
      )}
      <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
        <span>
          {sampled[0] && new Date(sampled[0].checked_at).toLocaleString("ko-KR")}
        </span>
        <span>
          {sampled[sampled.length - 1] &&
            new Date(sampled[sampled.length - 1].checked_at).toLocaleString("ko-KR")}
        </span>
      </div>
      {/* recent rows */}
      <div className="mt-3 max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-muted-foreground">
            <tr>
              <th className="text-left py-1">시간</th>
              <th className="text-left">상태</th>
              <th className="text-left">HTTP</th>
              <th className="text-right">응답시간</th>
              <th className="text-left">에러</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {checks.slice(-20).reverse().map((c, i) => (
              <tr key={i}>
                <td className="py-1 text-muted-foreground">
                  {new Date(c.checked_at).toLocaleTimeString("ko-KR")}
                </td>
                <td>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", STATUS_COLOR[c.status])}>
                    {c.status}
                  </span>
                </td>
                <td className="text-muted-foreground">{c.http_status ?? "--"}</td>
                <td className="text-right text-foreground">
                  {c.response_time_ms ? `${c.response_time_ms}ms` : "--"}
                </td>
                <td className="text-rose-500 truncate max-w-[120px]">
                  {c.cascade_from ? "cascade" : c.error_message ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function barColor(s: HealthStatus): string {
  if (s === "healthy") return "bg-emerald-400";
  if (s === "degraded") return "bg-amber-400";
  if (s === "down") return "bg-rose-500";
  return "bg-muted-foreground/30";
}
