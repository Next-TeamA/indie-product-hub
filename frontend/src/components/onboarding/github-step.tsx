"use client";

import { motion } from "motion/react";
import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { connectAccount } from "@/lib/api/accounts";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

interface GithubStepProps {
  onNext: (data: { repoUrl: string }) => void;
  onBack: () => void;
}

export function GithubStep({ onNext, onBack }: GithubStepProps) {
  const [repoUrl, setRepoUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { auth_url } = await connectAccount("github");
      // OAuth redirect -- user will come back after authorization
      window.location.href = auth_url;
    } catch (e) {
      console.error("GitHub connect failed:", e);
      setConnecting(false);
    }
  };

  return (
    <motion.div className="relative z-10 w-full max-w-lg mx-auto px-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">STEP 2</p>
      </motion.div>

      <motion.h2 variants={item} className="h-title mb-3">GitHub 연동</motion.h2>

      <motion.p variants={item} className="text-lede mb-8">
        레포지토리를 연결하면 배포 로그, 이슈를 자동으로 추적합니다.
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
          <motion.div
            className="flex items-center gap-3 h-14 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-5"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Check className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">GitHub 연결됨</span>
          </motion.div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center">
            <span className="bg-background px-3 text-xs text-muted-foreground">또는 직접 입력</span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">레포지토리 URL</label>
          <div className="relative">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="input-hero w-full pl-11"
            />
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          ← 이전
        </button>
        <motion.button
          onClick={() => onNext({ repoUrl })}
          className="btn-hero bg-primary text-primary-foreground cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          다음 →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
