"use client";

import { motion } from "motion/react";
import { Check, Link2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");

  return (
    <motion.div className="relative z-10 w-full max-w-lg mx-auto px-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">{t("step2")}</p>
      </motion.div>
      <motion.h2 variants={item} className="h-title mb-3">{t("githubTitle")}</motion.h2>
      <motion.p variants={item} className="text-lede mb-8">{t("githubDesc")}</motion.p>

      <motion.div variants={item} className="flex flex-col gap-4">
        {!connected ? (
          <motion.button
            onClick={() => setConnected(true)}
            className="flex items-center justify-center gap-3 h-14 rounded-3xl border border-border bg-card text-foreground font-medium transition-colors hover:bg-accent cursor-pointer"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
          >
            <GithubIcon className="w-5 h-5" />
            Connect GitHub
          </motion.button>
        ) : (
          <motion.div
            className="flex items-center gap-3 h-14 rounded-3xl bg-[rgba(95,204,125,0.08)] px-5"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Check className="w-5 h-5" style={{ color: "#5FCC7D" }} />
            <span className="text-sm font-medium">GitHub Connected</span>
          </motion.div>
        )}

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("repoUrl")}</label>
          <div className="relative">
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder={t("repoUrlPlaceholder")}
              className="input-hero w-full pl-11"
            />
            <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          ← {tCommon("back")}
        </button>
        <motion.button
          onClick={() => onNext({ repoUrl })}
          className="btn-hero bg-primary text-primary-foreground cursor-pointer"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {tCommon("next")} →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
