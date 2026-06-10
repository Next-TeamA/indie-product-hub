import type {
  DeploymentEnvironment,
  DeploymentRole,
  HealthStatus,
} from "@/lib/api/platform-deployments";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<HealthStatus, string> = {
  healthy: "정상",
  degraded: "성능 저하",
  down: "다운",
  unknown: "확인 안 됨",
};

export const STATUS_COLOR: Record<HealthStatus, string> = {
  healthy:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  degraded:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  down: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
  unknown: "bg-muted text-muted-foreground",
};

export const STATUS_DOT: Record<HealthStatus, string> = {
  healthy: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-rose-500",
  unknown: "bg-muted-foreground/40",
};

export const ROLE_LABEL: Record<DeploymentRole, string> = {
  frontend: "프론트엔드",
  backend: "백엔드",
  worker: "워커",
  database: "DB",
  cache: "캐시",
  queue: "큐",
  cron: "크론",
  storage: "스토리지",
  other: "기타",
};

export const ROLE_COLOR: Record<DeploymentRole, string> = {
  frontend: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
  backend:
    "bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400",
  worker:
    "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
  database:
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
  cache: "bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400",
  queue: "bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400",
  cron: "bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400",
  storage: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
  other: "bg-muted text-muted-foreground",
};

export const ENV_LABEL: Record<DeploymentEnvironment, string> = {
  production: "PROD",
  staging: "STAGING",
  preview: "PREVIEW",
  development: "DEV",
  other: "OTHER",
};

export const ENV_COLOR: Record<DeploymentEnvironment, string> = {
  production:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  staging:
    "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  preview:
    "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300",
  development:
    "bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300",
  other: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  cascadeFrom,
}: {
  status: HealthStatus;
  cascadeFrom?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
        STATUS_COLOR[status],
      )}
      title={cascadeFrom ? "Cascade: upstream 의존성 down" : undefined}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          STATUS_DOT[status],
          status === "down" || status === "degraded" ? "animate-pulse" : "",
        )}
      />
      {STATUS_LABEL[status]}
      {cascadeFrom && <span className="ml-0.5 opacity-70">↑</span>}
    </span>
  );
}

export function RoleBadge({ role }: { role: DeploymentRole }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        ROLE_COLOR[role],
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

export function EnvBadge({ env }: { env: DeploymentEnvironment }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        ENV_COLOR[env],
      )}
    >
      {ENV_LABEL[env]}
    </span>
  );
}
