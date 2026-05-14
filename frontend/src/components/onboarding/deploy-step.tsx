"use client";

import { motion } from "motion/react";
import { Check, Search, Rocket } from "lucide-react";
import { useState, useEffect } from "react";
import {
  connectAccount,
  listAccounts,
  listVercelProjects,
  listRailwayProjects,
  type VercelProject,
  type RailwayProject,
} from "@/lib/api/accounts";

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

type Platform = "vercel" | "railway" | null;

interface DeployStepProps {
  onNext: (data: {
    deploy_platform: string;
    deploy_project_id: string;
  }) => void;
  onBack: () => void;
  onBeforeOAuth?: () => void;
}

export function DeployStep({ onNext, onBack, onBeforeOAuth }: DeployStepProps) {
  const [platform, setPlatform] = useState<Platform>(null);
  const [connectedPlatforms, setConnectedPlatforms] = useState<
    Record<string, boolean>
  >({});
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([]);
  const [railwayProjects, setRailwayProjects] = useState<RailwayProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const accounts = await listAccounts();
        const connected: Record<string, boolean> = {};
        for (const a of accounts) {
          if (a.provider === "vercel" || a.provider === "railway") {
            connected[a.provider] = true;
          }
        }
        setConnectedPlatforms(connected);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleConnect = async (p: "vercel" | "railway") => {
    setConnecting(true);
    try {
      onBeforeOAuth?.();
      const { auth_url } = await connectAccount(p, "/projects/new");
      window.location.href = auth_url;
    } catch {
      setConnecting(false);
    }
  };

  const handleSelectPlatform = async (p: "vercel" | "railway") => {
    setPlatform(p);
    setSelectedProject(null);
    setSearch("");

    if (!connectedPlatforms[p]) return;

    try {
      if (p === "vercel") {
        const projects = await listVercelProjects();
        setVercelProjects(projects);
      } else {
        const projects = await listRailwayProjects();
        setRailwayProjects(projects);
      }
    } catch {
      // ignore
    }
  };

  const projects =
    platform === "vercel"
      ? vercelProjects.map((p) => ({ id: p.id, name: p.name, desc: p.framework }))
      : railwayProjects.map((p) => ({ id: p.id, name: p.name, desc: p.description }));

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="relative z-10 w-full max-w-lg mx-auto px-6 flex items-center justify-center min-h-50">
        <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="relative z-10 w-full max-w-lg mx-auto px-6"
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
        배포 상태를 모니터링할 플랫폼을 선택하세요.
      </motion.p>

      <motion.div variants={item} className="flex flex-col gap-4">
        {/* Platform selector */}
        <div className="grid grid-cols-2 gap-3">
          {(["vercel", "railway"] as const).map((p) => (
            <button
              key={p}
              onClick={() => handleSelectPlatform(p)}
              className={`flex items-center justify-center gap-2 h-14 rounded-2xl border font-medium transition-all cursor-pointer ${
                platform === p
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              <Rocket className="w-4 h-4" />
              {p === "vercel" ? "Vercel" : "Railway"}
              {connectedPlatforms[p] && (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              )}
            </button>
          ))}
        </div>

        {/* Connect or select */}
        {platform && !connectedPlatforms[platform] && (
          <motion.button
            onClick={() => handleConnect(platform)}
            disabled={connecting}
            className="flex items-center justify-center gap-3 h-14 rounded-2xl border border-border bg-card text-foreground font-medium transition-colors hover:bg-accent cursor-pointer disabled:opacity-50"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
          >
            {connecting
              ? "연결 중..."
              : `${platform === "vercel" ? "Vercel" : "Railway"} 계정 연결하기`}
          </motion.button>
        )}

        {platform && connectedPlatforms[platform] && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3"
          >
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="프로젝트 검색..."
                className="input-hero w-full pl-11"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            </div>

            {/* Project list */}
            <div className="max-h-52 overflow-y-auto rounded-2xl border border-border divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  프로젝트를 찾을 수 없습니다
                </div>
              ) : (
                filtered.map((proj) => (
                  <button
                    key={proj.id}
                    onClick={() =>
                      setSelectedProject({ id: proj.id, name: proj.name })
                    }
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      selectedProject?.id === proj.id
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedProject?.id === proj.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedProject?.id === proj.id && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{proj.name}</span>
                      {proj.desc && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {proj.desc}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        variants={item}
        className="mt-8 flex items-center justify-between"
      >
        <button
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          ← 이전
        </button>
        <motion.button
          onClick={() => {
            onNext({
              deploy_platform: platform || "",
              deploy_project_id: selectedProject?.id || "",
            });
          }}
          className="btn-hero bg-primary text-primary-foreground cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {selectedProject ? "다음 →" : "건너뛰기 →"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
