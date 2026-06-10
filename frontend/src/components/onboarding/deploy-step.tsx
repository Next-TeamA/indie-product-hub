"use client";

import { motion } from "motion/react";
import { Check, Plus, RefreshCw, Trash2, Link2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  connectAccount,
  disconnectAccount,
  listAccounts,
  listVercelProjects,
  listRailwayProjects,
  type VercelProject,
  type RailwayProject,
} from "@/lib/api/accounts";
import type {
  DeploymentRole,
  DependencyKind,
  Platform,
} from "@/lib/api/platform-deployments";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

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

const DEPENDENCY_KIND_LABEL: Record<DependencyKind, string> = {
  api_call: "API 호출",
  db: "DB 연결",
  queue: "큐 메시지",
  webhook: "Webhook",
  storage: "스토리지",
  other: "기타",
};

const PLATFORMS: { id: Platform; label: string; defaultRole: DeploymentRole }[] = [
  { id: "vercel", label: "Vercel", defaultRole: "frontend" },
  { id: "railway", label: "Railway", defaultRole: "backend" },
];

export type DraftDeployment = {
  // 클라이언트 임시 id (PR1 끝나면 backend id 로 대체)
  local_id: string;
  platform: Platform;
  external_project_id: string;
  name: string;
  role: DeploymentRole;
  framework?: string;
  external_url?: string;
};

export type DraftDependency = {
  source_local_id: string;
  target_local_id: string;
  kind: DependencyKind;
};

interface DeployStepProps {
  onNext: (data: {
    deployments: DraftDeployment[];
    dependencies: DraftDependency[];
  }) => void;
  onBack: () => void;
  onBeforeOAuth?: () => void;
}

export function DeployStep({ onNext, onBack, onBeforeOAuth }: DeployStepProps) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, { accountId: string }>>({});
  const [picker, setPicker] = useState<Platform | null>(null);

  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
  const [railwayProjects, setRailwayProjects] = useState<RailwayProject[]>([]);
  const [loadingPicker, setLoadingPicker] = useState(false);

  const [deployments, setDeployments] = useState<DraftDeployment[]>([]);
  const [dependencies, setDependencies] = useState<DraftDependency[]>([]);

  const [showDepForm, setShowDepForm] = useState(false);
  const [newDep, setNewDep] = useState<DraftDependency>({
    source_local_id: "",
    target_local_id: "",
    kind: "api_call",
  });

  const refresh = useCallback(async () => {
    try {
      const accounts = await listAccounts();
      const connected: Record<string, { accountId: string }> = {};
      for (const a of accounts) {
        if (a.provider === "vercel" || a.provider === "railway") {
          connected[a.provider] = { accountId: a.id };
        }
      }
      setConnectedPlatforms(connected);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refresh();
      setLoading(false);
    })();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const handleConnect = async (p: Platform) => {
    setConnecting(p);
    try {
      onBeforeOAuth?.();
      const { auth_url } = await connectAccount(p, "/projects/new");
      window.location.href = auth_url;
    } catch {
      setConnecting(null);
    }
  };

  const handleReconnect = async (p: Platform) => {
    const accountId = connectedPlatforms[p]?.accountId;
    if (!accountId) return;
    setConnecting(p);
    try {
      await disconnectAccount(accountId);
      onBeforeOAuth?.();
      const { auth_url } = await connectAccount(p, "/projects/new");
      window.location.href = auth_url;
    } catch {
      setConnecting(null);
    }
  };

  const openPicker = async (p: Platform) => {
    setPicker(p);
    setLoadingPicker(true);
    try {
      if (p === "vercel") {
        setVercelProjects(await listVercelProjects());
      } else if (p === "railway") {
        setRailwayProjects(await listRailwayProjects());
      }
    } catch {
      // ignore
    } finally {
      setLoadingPicker(false);
    }
  };

  const addDeployment = (p: Platform, project: { id: string; name: string; framework?: string }) => {
    const defaultRole = PLATFORMS.find((x) => x.id === p)?.defaultRole ?? "other";
    // 같은 platform + external_project_id 이미 있으면 무시
    if (deployments.some((d) => d.platform === p && d.external_project_id === project.id)) {
      setPicker(null);
      return;
    }
    setDeployments((prev) => [
      ...prev,
      {
        local_id: `${p}-${project.id}-${Date.now()}`,
        platform: p,
        external_project_id: project.id,
        name: project.name,
        role: defaultRole,
        framework: project.framework,
      },
    ]);
    setPicker(null);
  };

  const removeDeployment = (localId: string) => {
    setDeployments((prev) => prev.filter((d) => d.local_id !== localId));
    setDependencies((prev) =>
      prev.filter(
        (dep) =>
          dep.source_local_id !== localId && dep.target_local_id !== localId,
      ),
    );
  };

  const updateRole = (localId: string, role: DeploymentRole) => {
    setDeployments((prev) =>
      prev.map((d) => (d.local_id === localId ? { ...d, role } : d)),
    );
  };

  const addDependency = () => {
    if (!newDep.source_local_id || !newDep.target_local_id) return;
    if (newDep.source_local_id === newDep.target_local_id) return;
    if (
      dependencies.some(
        (d) =>
          d.source_local_id === newDep.source_local_id &&
          d.target_local_id === newDep.target_local_id &&
          d.kind === newDep.kind,
      )
    ) {
      setShowDepForm(false);
      return;
    }
    setDependencies((prev) => [...prev, newDep]);
    setNewDep({ source_local_id: "", target_local_id: "", kind: "api_call" });
    setShowDepForm(false);
  };

  const removeDependency = (idx: number) => {
    setDependencies((prev) => prev.filter((_, i) => i !== idx));
  };

  const labelFor = (localId: string): string => {
    const d = deployments.find((x) => x.local_id === localId);
    return d ? `${d.name} (${ROLE_LABEL[d.role]})` : "?";
  };

  if (loading) {
    return (
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 flex items-center justify-center min-h-50">
        <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="relative z-10 w-full max-w-2xl mx-auto px-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">STEP 3</p>
      </motion.div>

      <motion.h2 variants={item} className="h-title mb-3">
        배포 플랫폼
      </motion.h2>

      <motion.p variants={item} className="text-lede mb-8">
        프론트엔드 / 백엔드 / 워커 등 이 프로젝트의 모든 배포를 등록하세요. 여러 플랫폼을 동시에 쓸 수 있어요.
      </motion.p>

      {/* Platform cards */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {PLATFORMS.map((p) => {
          const connected = !!connectedPlatforms[p.id];
          const count = deployments.filter((d) => d.platform === p.id).length;
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-foreground">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {connected ? `${count}개 등록됨` : "연결 안 됨"}
                  </p>
                </div>
                {connected && <Check className="w-4 h-4 text-emerald-500" />}
              </div>
              {!connected ? (
                <button
                  type="button"
                  onClick={() => handleConnect(p.id)}
                  disabled={connecting !== null}
                  className="w-full h-9 rounded-xl border border-border bg-background text-sm font-medium hover:bg-accent transition disabled:opacity-50"
                >
                  {connecting === p.id ? "연결 중..." : "계정 연결"}
                </button>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => openPicker(p.id)}
                    className="w-full h-9 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> 프로젝트 추가
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReconnect(p.id)}
                    disabled={connecting !== null}
                    className="self-end text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 px-1 py-0.5 disabled:opacity-50"
                    title="권한 갱신을 위해 disconnect 후 다시 연결합니다"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {connecting === p.id ? "재연결 중..." : "재연결"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Deployment list */}
      {deployments.length > 0 && (
        <motion.div variants={item} className="mb-6">
          <p className="text-sm font-bold mb-2">등록된 배포</p>
          <div className="rounded-2xl border border-border divide-y divide-border bg-card">
            {deployments.map((d) => (
              <div key={d.local_id} className="flex items-center gap-3 p-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {d.platform}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  {d.framework && (
                    <p className="text-xs text-muted-foreground truncate">{d.framework}</p>
                  )}
                </div>
                <select
                  value={d.role}
                  onChange={(e) => updateRole(d.local_id, e.target.value as DeploymentRole)}
                  className="text-xs rounded-full border border-border bg-background px-2 py-1 focus:outline-none"
                >
                  {(Object.keys(ROLE_LABEL) as DeploymentRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeDeployment(d.local_id)}
                  className="p-1.5 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  aria-label="제거"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Dependencies */}
      {deployments.length >= 2 && (
        <motion.div variants={item} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold">의존성 (선택)</p>
            <button
              type="button"
              onClick={() => setShowDepForm((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Link2 className="w-3.5 h-3.5" /> {showDepForm ? "취소" : "추가"}
            </button>
          </div>

          {showDepForm && (
            <div className="rounded-2xl border border-border bg-card p-3 flex flex-col gap-2 mb-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <select
                  value={newDep.source_local_id}
                  onChange={(e) =>
                    setNewDep({ ...newDep, source_local_id: e.target.value })
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">출발지...</option>
                  {deployments.map((d) => (
                    <option key={d.local_id} value={d.local_id}>
                      {d.name} ({ROLE_LABEL[d.role]})
                    </option>
                  ))}
                </select>
                <select
                  value={newDep.kind}
                  onChange={(e) =>
                    setNewDep({ ...newDep, kind: e.target.value as DependencyKind })
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(DEPENDENCY_KIND_LABEL) as DependencyKind[]).map((k) => (
                    <option key={k} value={k}>
                      {DEPENDENCY_KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
                <select
                  value={newDep.target_local_id}
                  onChange={(e) =>
                    setNewDep({ ...newDep, target_local_id: e.target.value })
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">도착지...</option>
                  {deployments
                    .filter((d) => d.local_id !== newDep.source_local_id)
                    .map((d) => (
                      <option key={d.local_id} value={d.local_id}>
                        {d.name} ({ROLE_LABEL[d.role]})
                      </option>
                    ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addDependency}
                disabled={!newDep.source_local_id || !newDep.target_local_id}
                className="self-end rounded-full bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
              >
                의존성 추가
              </button>
            </div>
          )}

          {dependencies.length > 0 && (
            <div className="rounded-2xl border border-border bg-card divide-y divide-border">
              {dependencies.map((dep, i) => (
                <div key={i} className="flex items-center gap-2 p-3 text-sm">
                  <span className="text-foreground font-medium">
                    {labelFor(dep.source_local_id)}
                  </span>
                  <span className="text-muted-foreground">
                    → {DEPENDENCY_KIND_LABEL[dep.kind]} →
                  </span>
                  <span className="text-foreground font-medium flex-1">
                    {labelFor(dep.target_local_id)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDependency(i)}
                    className="p-1.5 rounded-full text-muted-foreground hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Project picker modal */}
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 dark:bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setPicker(null)}
        >
          <div
            className="w-full max-w-md rounded-[24px] bg-card border border-border shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold mb-3">
              {PLATFORMS.find((x) => x.id === picker)?.label} 프로젝트 선택
            </p>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {loadingPicker ? (
                <div className="p-6 text-center text-sm text-muted-foreground">불러오는 중...</div>
              ) : picker === "vercel" ? (
                vercelProjects.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">프로젝트 없음</div>
                ) : (
                  vercelProjects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() =>
                        addDeployment("vercel", { id: p.id, name: p.name, framework: p.framework ?? undefined })
                      }
                      className="w-full text-left p-3 hover:bg-muted/50 text-sm"
                    >
                      <p className="font-medium">{p.name}</p>
                      {p.framework && <p className="text-xs text-muted-foreground">{p.framework}</p>}
                    </button>
                  ))
                )
              ) : railwayProjects.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">프로젝트 없음</div>
              ) : (
                railwayProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      addDeployment("railway", { id: p.id, name: p.name })
                    }
                    className="w-full text-left p-3 hover:bg-muted/50 text-sm"
                  >
                    <p className="font-medium">{p.name}</p>
                    {p.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                    )}
                  </button>
                ))
              )}
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      <motion.div variants={item} className="mt-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          ← 이전
        </button>
        <motion.button
          onClick={() => onNext({ deployments, dependencies })}
          className="btn-hero bg-primary text-primary-foreground cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {deployments.length > 0 ? "다음 →" : "건너뛰기 →"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
