"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, Search, Lock, Globe, Rocket, RefreshCw } from "lucide-react";
import { useProject } from "@/hooks/use-projects";
import { updateProject } from "@/lib/api/projects";
import {
  listAccounts,
  connectAccount,
  disconnectAccount,
  getGitHubSettingsUrl,
  listGitHubOrgs,
  listGitHubRepos,
  listVercelProjects,
  listRailwayProjects,
  type GitHubOrg,
  type GitHubRepo,
  type VercelProject,
  type RailwayProject,
} from "@/lib/api/accounts";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

export default function ProjectSettingsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { project, mutate } = useProject(projectId);

  // Connected accounts
  const [connectedProviders, setConnectedProviders] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<string | null>(null);

  // GitHub
  const [orgs, setOrgs] = useState<GitHubOrg[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);

  // Deploy
  const [deployPlatform, setDeployPlatform] = useState<string>("");
  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
  const [railwayProjects, setRailwayProjects] = useState<RailwayProject[]>([]);
  const [selectedDeployProject, setSelectedDeployProject] = useState<string>("");

  // Save
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Init: load connected accounts + current project config
  useEffect(() => {
    async function init() {
      try {
        const accounts = await listAccounts();
        const connected: Record<string, boolean> = {};
        for (const a of accounts) connected[a.provider] = true;
        setConnectedProviders(connected);

        // Load orgs if GitHub connected
        if (connected.github) {
          setLoadingOrgs(true);
          try {
            const orgList = await listGitHubOrgs();
            setOrgs(orgList);
            // Auto-select the personal account (first entry)
            if (orgList.length > 0) {
              const personal = orgList[0];
              setSelectedOrg(personal.login);
              setLoadingRepos(true);
              const r = await listGitHubRepos(personal.login);
              setRepos(r);
              setLoadingRepos(false);
            }
          } finally {
            setLoadingOrgs(false);
          }
        }
        // Load deploy projects
        if (connected.vercel) {
          const p = await listVercelProjects();
          setVercelProjects(p);
        }
        if (connected.railway) {
          const p = await listRailwayProjects();
          setRailwayProjects(p);
        }
      } catch {
        // ignore
      }
    }
    init();
  }, []);

  // Set current values from project
  useEffect(() => {
    if (!project) return;
    const owner = project.github_repo_owner || "";
    const name = project.github_repo_name || "";
    if (owner && name) setSelectedRepo(`${owner}/${name}`);
    setDeployPlatform(project.deploy_platform || "");
    setSelectedDeployProject(project.deploy_project_id || "");
  }, [project]);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const { auth_url } = await connectAccount(provider, `/projects/${projectId}/settings`);
      window.location.href = auth_url;
    } catch {
      setConnecting(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const repo = repos.find((r) => r.full_name === selectedRepo);
      await updateProject(projectId, {
        github_repo_owner: repo?.owner || undefined,
        github_repo_name: repo?.name || undefined,
        github_repo_url: repo ? `https://github.com/${repo.full_name}` : undefined,
        deploy_platform: deployPlatform || undefined,
        deploy_project_id: selectedDeployProject || undefined,
      });
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleOrgSelect = async (orgLogin: string) => {
    setSelectedOrg(orgLogin);
    setSelectedRepo("");
    setRepoSearch("");
    setLoadingRepos(true);
    try {
      const r = await listGitHubRepos(orgLogin);
      setRepos(r);
    } finally {
      setLoadingRepos(false);
    }
  };

  const filteredRepos = repos.filter((r) =>
    r.full_name.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const deployProjects =
    deployPlatform === "vercel"
      ? vercelProjects.map((p) => ({ id: p.id, name: p.name }))
      : deployPlatform === "railway"
        ? railwayProjects.map((p) => ({ id: p.id, name: p.name }))
        : [];

  return (
    <div className="px-10 py-10 w-full min-h-dvh bg-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto space-y-10"
      >
        <div>
          <h1 className="text-[24px] font-bold text-slate-800">프로젝트 설정</h1>
          <p className="text-[14px] text-slate-400 mt-1">
            이 프로젝트에 연결된 서비스를 관리합니다.
          </p>
        </div>

        {/* GitHub Repository */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-bold text-slate-800">GitHub 레포지토리</h2>
            {connectedProviders.github ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-600 font-medium">연결됨</span>
                <button
                  onClick={async () => {
                    setConnecting("github");
                    try {
                      const accounts = await listAccounts();
                      const github = accounts.find((a) => a.provider === "github");
                      if (github) await disconnectAccount(github.id);
                    } catch {}
                    handleConnect("github");
                  }}
                  disabled={connecting === "github"}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                >
                  {connecting === "github" ? "연결 중..." : "재연결"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect("github")}
                disabled={connecting === "github"}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {connecting === "github" ? "연결 중..." : "GitHub 연결하기"}
              </button>
            )}
          </div>

          {connectedProviders.github && (
            <>
              {/* Organization selector */}
              {loadingOrgs ? (
                <div className="flex items-center justify-center h-10">
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-300" />
                </div>
              ) : orgs.length > 1 && (
                <div className="flex gap-2 flex-wrap mb-1">
                  {orgs.map((org) => (
                    <button
                      key={org.login}
                      onClick={() => handleOrgSelect(org.login)}
                      className={cn(
                        "flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                        selectedOrg === org.login
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-slate-200 text-slate-500 hover:bg-slate-50",
                      )}
                    >
                      {org.avatar_url && (
                        <img src={org.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                      )}
                      {org.login}
                      {org.is_personal && <span className="text-[10px] text-slate-400">(개인)</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Repo search + list */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={repoSearch}
                  onChange={(e) => setRepoSearch(e.target.value)}
                  placeholder="레포지토리 검색..."
                  className="w-full h-10 pl-10 pr-4 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                {loadingRepos ? (
                  <div className="p-4 text-center">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-300 mx-auto" />
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-400">레포지토리 없음</div>
                ) : (
                  filteredRepos.slice(0, 30).map((repo) => (
                    <button
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo.full_name)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer",
                        selectedRepo === repo.full_name ? "bg-blue-50/50" : "hover:bg-slate-50",
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        selectedRepo === repo.full_name ? "border-blue-500 bg-blue-500" : "border-slate-200",
                      )}>
                        {selectedRepo === repo.full_name && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className="text-sm font-medium text-slate-700 truncate">{repo.name}</span>
                      {repo.private ? <Lock className="w-3 h-3 text-slate-300 shrink-0" /> : <Globe className="w-3 h-3 text-slate-300 shrink-0" />}
                      {repo.language && (
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{repo.language}</span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        {/* Deploy Platform */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-bold text-slate-800 mb-4">배포 플랫폼</h2>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {(["vercel", "railway"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setDeployPlatform(p)}
                className={cn(
                  "flex items-center justify-center gap-2 h-12 rounded-xl border font-medium transition-all cursor-pointer text-sm",
                  deployPlatform === p
                    ? "border-blue-200 bg-blue-50/50 text-blue-700"
                    : "border-slate-200 text-slate-500 hover:bg-slate-50",
                )}
              >
                <Rocket className="w-4 h-4" />
                {p === "vercel" ? "Vercel" : "Railway"}
                {connectedProviders[p] && <Check className="w-3.5 h-3.5 text-emerald-500" />}
              </button>
            ))}
          </div>

          {deployPlatform && !connectedProviders[deployPlatform] && (
            <button
              onClick={() => handleConnect(deployPlatform)}
              disabled={connecting === deployPlatform}
              className="w-full h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-50"
            >
              {connecting === deployPlatform ? "연결 중..." : `${deployPlatform === "vercel" ? "Vercel" : "Railway"} 연결하기`}
            </button>
          )}

          {deployPlatform && connectedProviders[deployPlatform] && deployProjects.length > 0 && (
            <>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50">
                {deployProjects.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedDeployProject(proj.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer",
                      selectedDeployProject === proj.id ? "bg-blue-50/50" : "hover:bg-slate-50",
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                      selectedDeployProject === proj.id ? "border-blue-500 bg-blue-500" : "border-slate-200",
                    )}>
                      {selectedDeployProject === proj.id && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className="text-sm font-medium text-slate-700">{proj.name}</span>
                  </button>
                ))}
              </div>
              {deployPlatform === "vercel" && (
                <p className="text-xs text-slate-400 mt-2">
                  프로젝트가 안 보이나요?{" "}
                  <a href="https://vercel.com/~/integrations" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    Vercel Integration 설정에서 "All Projects" 허용
                  </a>
                </p>
              )}
            </>
          )}
        </section>

        {/* SNS Accounts */}
        <section className="bg-white rounded-2xl border border-slate-100 p-6 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
          <h2 className="text-[16px] font-bold text-slate-800 mb-4">SNS 계정</h2>
          <div className="space-y-3">
            {[
              { id: "x", label: "X (Twitter)", icon: "X" },
              { id: "threads", label: "Threads", icon: "TH" },
            ].map((sns) => (
              <div
                key={sns.id}
                className="flex items-center justify-between h-12 px-4 rounded-xl border border-slate-200"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                    {sns.icon}
                  </span>
                  <span className="text-sm font-medium text-slate-700">{sns.label}</span>
                </div>
                {connectedProviders[sns.id] ? (
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-emerald-600">연결됨</span>
                    <button
                      onClick={() => handleConnect(sns.id)}
                      className="text-xs text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                    >
                      재연결
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(sns.id)}
                    disabled={connecting === sns.id}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {connecting === sns.id ? "연결 중..." : "연결하기"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-6 h-11 rounded-xl text-sm font-bold transition-all",
              saved
                ? "bg-emerald-500 text-white"
                : "bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50",
            )}
          >
            {saved ? (
              <><Check className="w-4 h-4" /> 저장됨</>
            ) : saving ? (
              "저장 중..."
            ) : (
              "저장하기"
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
