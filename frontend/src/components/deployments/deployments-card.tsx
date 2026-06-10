"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useTopology } from "@/hooks/use-platform-deployments";
import {
  EnvBadge,
  RoleBadge,
  StatusBadge,
} from "./status-badge";
import type { HealthStatus } from "@/lib/api/platform-deployments";
import { cn } from "@/lib/utils";

/**
 * Dashboard 에 박는 deployments 상태 카드.
 *
 * - effective status (cascade 고려) 로 정렬: down > degraded > unknown > healthy
 * - 상태별 카운트 + 가장 안 좋은 상위 5개
 * - "전체 배포" 링크
 */
export function DeploymentsHealthCard({ projectId }: { projectId: string }) {
  const { nodes, isLoading } = useTopology(projectId);

  const counts: Record<HealthStatus, number> = {
    healthy: 0,
    degraded: 0,
    down: 0,
    unknown: 0,
  };
  for (const n of nodes) counts[n.status_effective]++;

  const rank: Record<HealthStatus, number> = {
    down: 0,
    degraded: 1,
    unknown: 2,
    healthy: 3,
  };
  const worst = [...nodes]
    .sort(
      (a, b) =>
        rank[a.status_effective] - rank[b.status_effective] ||
        a.name.localeCompare(b.name),
    )
    .slice(0, 5);

  const hasIssue = counts.down > 0 || counts.degraded > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Activity className="h-4 w-4" />
            배포 상태
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            cascade 기반 effective status, 1분 polling
          </p>
        </div>
        <Link
          href={`/projects/${projectId}/deployments`}
          className="text-xs font-bold text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          전체 <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
        </div>
      ) : nodes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          등록된 배포가 없어요.{" "}
          <Link
            href={`/projects/${projectId}/deployments`}
            className="text-blue-500 hover:underline"
          >
            추가하기
          </Link>
        </p>
      ) : (
        <>
          {/* Status pills */}
          <div className="mb-4 flex flex-wrap gap-2">
            <StatusPill
              label="정상"
              count={counts.healthy}
              color="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
            />
            <StatusPill
              label="성능저하"
              count={counts.degraded}
              color="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
            />
            <StatusPill
              label="다운"
              count={counts.down}
              color="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
            />
            <StatusPill
              label="확인안됨"
              count={counts.unknown}
              color="bg-muted text-muted-foreground"
            />
          </div>

          {hasIssue ? (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 px-3 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">
              <AlertTriangle className="h-3 w-3" />
              주의 필요
            </div>
          ) : nodes.length > 0 ? (
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-3 w-3" />
              모두 정상
            </div>
          ) : null}

          {/* Top 5 (worst first) */}
          <ul className="space-y-1.5">
            {worst.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/projects/${projectId}/deployments/${n.id}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-xl border bg-background p-2.5 text-sm hover:bg-muted/40",
                    n.status_effective === "down"
                      ? "border-rose-200 dark:border-rose-900/50"
                      : n.status_effective === "degraded"
                        ? "border-amber-200 dark:border-amber-900/50"
                        : "border-border",
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="font-medium text-foreground truncate">
                      {n.name}
                    </span>
                    <RoleBadge role={n.role} />
                    <EnvBadge env={n.environment} />
                  </div>
                  <StatusBadge
                    status={n.status_effective}
                    cascadeFrom={n.cascade_from}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function StatusPill({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        color,
      )}
    >
      {label}
      <span className="opacity-70">{count}</span>
    </span>
  );
}
