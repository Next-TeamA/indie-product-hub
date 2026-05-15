"use client";

import { motion } from "motion/react";
import { Check, Search, Lock, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import {
  connectAccount,
  getGitHubSettingsUrl,
  listAccounts,
  listGitHubRepos,
  type GitHubRepo,
} from "@/lib/api/accounts";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
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

interface GithubStepProps {
  onNext: (data: {
    repoUrl: string;
    github_repo_owner: string;
    github_repo_name: string;
  }) => void;
  onBack: () => void;
  onBeforeOAuth?: () => void;
}

export function GithubStep({ onNext, onBack, onBeforeOAuth }: GithubStepProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [search, setSearch] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  // Check if GitHub is already connected + load repos
  useEffect(() => {
    async function init() {
      try {
        const accounts = await listAccounts();
        const github = accounts.find((a) => a.provider === "github");
        if (github) {
          setConnected(true);
          const repoList = await listGitHubRepos();
          setRepos(repoList);
        }
      } catch {
        // not connected
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      onBeforeOAuth?.();
      const { auth_url } = await connectAccount("github", "/projects/new");
      window.location.href = auth_url;
    } catch {
      setConnecting(false);
    }
  };

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase())
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
        <p className="h-eyebrow">STEP 2</p>
      </motion.div>

      <motion.h2 variants={item} className="h-title mb-3">
        GitHub 레포지토리
      </motion.h2>

      <motion.p variants={item} className="text-lede mb-8">
        {connected
          ? "이 프로젝트에 연결할 레포지토리를 선택하세요."
          : "GitHub 계정을 연결하면 레포지토리를 선택할 수 있습니다."}
      </motion.p>

      <motion.div variants={item} className="flex flex-col gap-4">
        {!connected ? (
          <motion.button
            onClick={handleConnect}
            disabled={connecting}
            className="flex items-center justify-center gap-3 h-14 rounded-2xl border border-border bg-card text-foreground font-medium transition-colors hover:bg-accent cursor-pointer disabled:opacity-50"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
          >
            <GithubIcon className="w-5 h-5" />
            {connecting ? "연결 중..." : "GitHub 계정 연결하기"}
          </motion.button>
        ) : (
          <>
            {/* Connected badge + reconnect for org access */}
            <div className="flex items-center justify-between h-10 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-3">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600">
                  GitHub 연결됨
                </span>
              </div>
              <button
                onClick={async () => {
                  try {
                    const { url } = await getGitHubSettingsUrl();
                    window.open(url, "_blank");
                  } catch {}
                }}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                조직 권한 관리
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="레포지토리 검색..."
                className="input-hero w-full pl-11"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            </div>

            {/* Repo list */}
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-border divide-y divide-border">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  레포지토리를 찾을 수 없습니다
                </div>
              ) : (
                filtered.slice(0, 30).map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      selectedRepo?.id === repo.id
                        ? "bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedRepo?.id === repo.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {selectedRepo?.id === repo.id && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {repo.full_name}
                        </span>
                        {repo.private ? (
                          <Lock className="w-3 h-3 text-muted-foreground shrink-0" />
                        ) : (
                          <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {repo.description}
                        </p>
                      )}
                    </div>
                    {repo.language && (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
                        {repo.language}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </>
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
            if (selectedRepo) {
              onNext({
                repoUrl: `https://github.com/${selectedRepo.full_name}`,
                github_repo_owner: selectedRepo.owner,
                github_repo_name: selectedRepo.name,
              });
            } else {
              onNext({
                repoUrl: "",
                github_repo_owner: "",
                github_repo_name: "",
              });
            }
          }}
          className="btn-hero bg-primary text-primary-foreground cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {selectedRepo ? "다음 →" : "건너뛰기 →"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
