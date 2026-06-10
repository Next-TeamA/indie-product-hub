"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Loader2,
  Plus,
  Trash2,
  Edit3,
  Link2,
  X,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Activity,
  ArrowRight,
} from "lucide-react";
import {
  usePlatformDeployments,
  useTopology,
} from "@/hooks/use-platform-deployments";
import {
  createPlatformDeployment,
  updatePlatformDeployment,
  deletePlatformDeployment,
  createDependency,
  deleteDependency,
  manualPing,
  type DeploymentRole,
  type DeploymentEnvironment,
  type Platform,
  type DependencyKind,
  type PlatformDeployment,
  type HealthStatus,
  type SLOTarget,
} from "@/lib/api/platform-deployments";
import { TopologyGraph } from "@/components/deployments/topology-graph";
import {
  EnvBadge,
  RoleBadge,
  StatusBadge,
} from "@/components/deployments/status-badge";
import {
  listAccounts,
  listVercelProjects,
  listRailwayProjects,
  type VercelProject,
  type RailwayProject,
} from "@/lib/api/accounts";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "vercel", label: "Vercel" },
  { id: "railway", label: "Railway" },
  { id: "cloudflare", label: "Cloudflare" },
  { id: "fly", label: "Fly.io" },
  { id: "render", label: "Render" },
  { id: "supabase", label: "Supabase" },
  { id: "aws", label: "AWS" },
  { id: "gcp", label: "GCP" },
  { id: "azure", label: "Azure" },
  { id: "other", label: "기타" },
];

const ROLE_LABEL: Record<DeploymentRole, string> = {
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

const ENV_LIST: DeploymentEnvironment[] = [
  "production",
  "staging",
  "preview",
  "development",
  "other",
];

const KIND_LABEL: Record<DependencyKind, string> = {
  api_call: "API 호출",
  db: "DB 연결",
  queue: "큐 메시지",
  webhook: "Webhook",
  storage: "스토리지",
  other: "기타",
};

export default function DeploymentsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { deployments, dependencies, isLoading, mutate } =
    usePlatformDeployments(projectId);
  const {
    nodes: topoNodes,
    edges: topoEdges,
    mutate: mutateTopo,
  } = useTopology(projectId);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<PlatformDeployment | null>(null);
  const [showDepForm, setShowDepForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [envFilter, setEnvFilter] = useState<DeploymentEnvironment | "all">(
    "all",
  );

  // topology 의 effective status 를 deployment 에 머지
  const statusByDeployment = useMemo(() => {
    const m: Record<
      string,
      { effective: HealthStatus; direct: HealthStatus; cascade_from: string | null }
    > = {};
    for (const n of topoNodes) {
      m[n.id] = {
        effective: n.status_effective,
        direct: n.status_direct,
        cascade_from: n.cascade_from,
      };
    }
    return m;
  }, [topoNodes]);

  const filtered = useMemo(
    () =>
      envFilter === "all"
        ? deployments
        : deployments.filter((d) => d.environment === envFilter),
    [deployments, envFilter],
  );

  async function onDelete(d: PlatformDeployment) {
    if (!window.confirm(`${d.name} 을 삭제할까요?`)) return;
    setBusyId(d.id);
    try {
      await deletePlatformDeployment(projectId, d.id);
      mutate();
      mutateTopo();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function onDeleteDep(depId: string) {
    setBusyId(depId);
    try {
      await deleteDependency(projectId, depId);
      mutate();
      mutateTopo();
    } finally {
      setBusyId(null);
    }
  }

  async function onPing(d: PlatformDeployment) {
    setPingingId(d.id);
    try {
      await manualPing(projectId, d.id);
      mutate();
      mutateTopo();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ping 실패");
    } finally {
      setPingingId(null);
    }
  }

  const labelFor = (id: string): string => {
    const d = deployments.find((x) => x.id === id);
    return d ? `${d.name} (${ROLE_LABEL[d.role]})` : "?";
  };

  // 환경별 카운트
  const envCounts = useMemo(() => {
    const c: Record<string, number> = { all: deployments.length };
    for (const d of deployments) c[d.environment] = (c[d.environment] || 0) + 1;
    return c;
  }, [deployments]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8 flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">배포</h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            플랫폼별 배포 + 의존성 + 토폴로지 + cascade 기반 상태를 한 곳에서.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              mutate();
              mutateTopo();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> 새로고침
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> 배포 추가
          </button>
        </div>
      </motion.div>

      {err && (
        <div className="mb-4 flex gap-2 rounded-2xl border border-rose-100 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-sm text-rose-700 dark:text-rose-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {err}
        </div>
      )}

      {/* Topology */}
      {topoNodes.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-base font-bold text-foreground">토폴로지</h2>
          <TopologyGraph
            nodes={topoNodes}
            edges={topoEdges}
            projectId={projectId}
            height={420}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            노드를 클릭하면 상세. 빨강 = down, 노랑 = degraded(또는 upstream 영향), 초록 = healthy.
            화살표 = 의존성 (점선 = queue / webhook).
          </p>
        </section>
      )}

      {/* Environment filter */}
      {deployments.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            환경:
          </span>
          {(["all", ...ENV_LIST] as const).map((e) => {
            const count = envCounts[e] ?? 0;
            if (e !== "all" && count === 0) return null;
            return (
              <button
                key={e}
                onClick={() => setEnvFilter(e as DeploymentEnvironment | "all")}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold",
                  envFilter === e
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {e === "all" ? "전체" : e}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Deployment list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {deployments.length === 0
            ? "등록된 배포가 없어요."
            : "이 환경에 등록된 배포가 없어요."}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => {
            const eff = statusByDeployment[d.id]?.effective ?? d.status;
            const cascadeFrom = statusByDeployment[d.id]?.cascade_from ?? null;
            return (
              <li
                key={d.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {d.platform}
                  </span>
                  <RoleBadge role={d.role} />
                  <EnvBadge env={d.environment} />
                  <StatusBadge status={eff} cascadeFrom={cascadeFrom} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${projectId}/deployments/${d.id}`}
                      className="text-sm font-bold text-foreground hover:underline truncate inline-flex items-center gap-1"
                    >
                      {d.name}
                      <ArrowRight className="h-3 w-3 opacity-50" />
                    </Link>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {d.framework && <span>{d.framework}</span>}
                      {d.external_url && (
                        <a
                          href={d.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-500 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          URL
                        </a>
                      )}
                      {d.last_checked_at && (
                        <span>
                          마지막 체크 {new Date(d.last_checked_at).toLocaleTimeString("ko-KR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPing(d)}
                    disabled={pingingId === d.id}
                    title="지금 health check"
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                    aria-label="health check"
                  >
                    {pingingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(d)}
                    className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="수정"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(d)}
                    disabled={busyId === d.id}
                    className="rounded-full p-2 text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 disabled:opacity-30"
                    aria-label="삭제"
                  >
                    {busyId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {deployments.length >= 2 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">의존성</h2>
            <button
              type="button"
              onClick={() => setShowDepForm(true)}
              className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
            >
              <Link2 className="h-3 w-3" /> 추가
            </button>
          </div>
          {dependencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 의존성이 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {dependencies.map((dep) => (
                <li
                  key={dep.id}
                  className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {labelFor(dep.source_deployment_id)}
                  </span>
                  <span className="text-muted-foreground">
                    → {KIND_LABEL[dep.kind]} →
                  </span>
                  <span className="font-medium text-foreground flex-1">
                    {labelFor(dep.target_deployment_id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteDep(dep.id)}
                    disabled={busyId === dep.id}
                    className="rounded-full p-1.5 text-muted-foreground hover:text-rose-500 disabled:opacity-30"
                  >
                    {busyId === dep.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(adding || editing) && (
        <DeploymentFormModal
          projectId={projectId}
          existing={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            mutate();
            mutateTopo();
            setAdding(false);
            setEditing(null);
          }}
        />
      )}

      {showDepForm && (
        <DependencyFormModal
          projectId={projectId}
          deployments={deployments}
          onClose={() => setShowDepForm(false)}
          onSaved={() => {
            mutate();
            mutateTopo();
            setShowDepForm(false);
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// Add / Edit modal
// ============================================================

function DeploymentFormModal({
  projectId,
  existing,
  onClose,
  onSaved,
}: {
  projectId: string;
  existing: PlatformDeployment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [platform, setPlatform] = useState<Platform>(existing?.platform ?? "vercel");
  const [externalId, setExternalId] = useState(existing?.external_project_id ?? "");
  const [name, setName] = useState(existing?.name ?? "");
  const [role, setRole] = useState<DeploymentRole>(existing?.role ?? "other");
  const [environment, setEnvironment] = useState<DeploymentEnvironment>(
    existing?.environment ?? "production",
  );
  const [externalUrl, setExternalUrl] = useState(existing?.external_url ?? "");
  const [healthCheckUrl, setHealthCheckUrl] = useState(existing?.health_check_url ?? "");
  const [framework, setFramework] = useState(existing?.framework ?? "");
  const [healthEndpoint, setHealthEndpoint] = useState(existing?.health_endpoint ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");

  const sloTarget: SLOTarget = existing?.slo_target ?? {};
  const [sloUptime, setSloUptime] = useState<string>(
    sloTarget.uptime_pct != null ? String(sloTarget.uptime_pct) : "",
  );
  const [sloLatency, setSloLatency] = useState<string>(
    sloTarget.latency_p95_ms != null ? String(sloTarget.latency_p95_ms) : "",
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [picker, setPicker] = useState<VercelProject[] | RailwayProject[] | null>(null);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  async function loadConnected() {
    try {
      const accs = await listAccounts();
      const c: Record<string, boolean> = {};
      for (const a of accs) c[a.provider] = true;
      setConnected(c);
    } catch {}
  }

  async function openPicker() {
    setPickerLoading(true);
    try {
      if (platform === "vercel") setPicker(await listVercelProjects());
      else if (platform === "railway") setPicker(await listRailwayProjects());
    } catch {
      setPicker([]);
    } finally {
      setPickerLoading(false);
    }
  }

  async function onSubmit() {
    setErr(null);
    if (!externalId.trim() || !name.trim()) {
      setErr("플랫폼 프로젝트 ID 와 이름은 필수예요");
      return;
    }
    setBusy(true);
    try {
      const slo: SLOTarget = {};
      const u = parseFloat(sloUptime);
      if (Number.isFinite(u)) slo.uptime_pct = u;
      const l = parseInt(sloLatency, 10);
      if (Number.isFinite(l)) slo.latency_p95_ms = l;

      const payload = {
        platform,
        external_project_id: externalId.trim(),
        name: name.trim(),
        role,
        environment,
        external_url: externalUrl.trim() || undefined,
        framework: framework.trim() || undefined,
        health_endpoint: healthEndpoint.trim() || undefined,
        health_check_url: healthCheckUrl.trim() || undefined,
        description: description.trim() || undefined,
        slo_target: Object.keys(slo).length > 0 ? slo : undefined,
      };
      if (existing) {
        await updatePlatformDeployment(projectId, existing.id, payload);
      } else {
        await createPlatformDeployment(projectId, payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 dark:bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-[24px] bg-card border border-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">
            {existing ? "배포 수정" : "배포 추가"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="플랫폼">
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                onFocus={() => loadConnected()}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="역할">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as DeploymentRole)}
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              >
                {(Object.keys(ROLE_LABEL) as DeploymentRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="환경">
              <select
                value={environment}
                onChange={(e) =>
                  setEnvironment(e.target.value as DeploymentEnvironment)
                }
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              >
                {ENV_LIST.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label={
              <span>
                플랫폼 프로젝트 ID
                {(platform === "vercel" || platform === "railway") &&
                  connected[platform] && (
                    <button
                      type="button"
                      onClick={openPicker}
                      className="ml-2 inline-flex items-center gap-1 text-xs text-blue-500 hover:underline"
                    >
                      목록에서 선택
                    </button>
                  )}
              </span>
            }
          >
            <input
              type="text"
              value={externalId}
              onChange={(e) => setExternalId(e.target.value)}
              placeholder="prj_xxx / vercel project id 또는 railway project id"
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>

          <Field label="표시 이름">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 백엔드 API"
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="공개 URL (선택)">
              <input
                type="text"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Health endpoint (선택)">
              <input
                type="text"
                value={healthEndpoint}
                onChange={(e) => setHealthEndpoint(e.target.value)}
                placeholder="/api/health"
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <Field label="Health check URL (override, 선택)">
            <input
              type="text"
              value={healthCheckUrl}
              onChange={(e) => setHealthCheckUrl(e.target.value)}
              placeholder="external_url + endpoint 가 아닌 별도 URL 사용 시"
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="프레임워크 (선택)">
              <input
                type="text"
                value={framework}
                onChange={(e) => setFramework(e.target.value)}
                placeholder="next, fastapi, ..."
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
            <Field label="설명 (선택)">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="자유 메모"
                className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
              />
            </Field>
          </div>

          <div className="rounded-2xl border border-dashed border-border p-3">
            <p className="text-xs font-bold text-foreground mb-2">SLO 목표 (선택)</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Uptime % (예: 99.9)">
                <input
                  type="number"
                  step="0.01"
                  value={sloUptime}
                  onChange={(e) => setSloUptime(e.target.value)}
                  placeholder="99.9"
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
              <Field label="응답시간 p95 ms (예: 500)">
                <input
                  type="number"
                  value={sloLatency}
                  onChange={(e) => setSloLatency(e.target.value)}
                  placeholder="500"
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </div>

          {picker !== null && (
            <div className="mt-2 rounded-2xl border border-border p-2 max-h-40 overflow-y-auto">
              {pickerLoading ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                </div>
              ) : picker.length === 0 ? (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  연결된 계정에서 프로젝트를 찾지 못했어요
                </div>
              ) : (
                picker.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setExternalId(p.id);
                      setName((prev) => prev || p.name);
                      setPicker(null);
                    }}
                    className="w-full text-left p-2 hover:bg-muted/50 rounded-xl text-sm"
                  >
                    <p className="font-medium">{p.name}</p>
                  </button>
                ))
              )}
            </div>
          )}

          {err && <p className="text-sm text-rose-500">{err}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Dependency form modal
// ============================================================

function DependencyFormModal({
  projectId,
  deployments,
  onClose,
  onSaved,
}: {
  projectId: string;
  deployments: PlatformDeployment[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<DependencyKind>("api_call");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit() {
    setErr(null);
    if (!source || !target || source === target) {
      setErr("출발지와 도착지를 선택하고, 서로 달라야 해요");
      return;
    }
    setBusy(true);
    try {
      await createDependency(projectId, source, target, kind);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "추가 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 dark:bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[24px] bg-card border border-border p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">의존성 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="출발지">
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">선택...</option>
              {deployments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({ROLE_LABEL[d.role]})
                </option>
              ))}
            </select>
          </Field>
          <Field label="종류">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as DependencyKind)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            >
              {(Object.keys(KIND_LABEL) as DependencyKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="도착지">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">선택...</option>
              {deployments
                .filter((d) => d.id !== source)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({ROLE_LABEL[d.role]})
                  </option>
                ))}
            </select>
          </Field>
          {err && <p className="text-sm text-rose-500">{err}</p>}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
