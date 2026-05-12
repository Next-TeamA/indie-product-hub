"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

const SNS_OPTIONS = [
  { id: "threads", label: "Threads", icon: "TH", desc: "Meta OAuth" },
  { id: "x", label: "X (Twitter)", icon: "X", desc: "OAuth 2.0 + PKCE" },
  { id: "bluesky", label: "Bluesky", icon: "BS", desc: "App password" },
] as const;

interface SnsStepProps {
  onNext: (data: { selectedSns: string[] }) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function SnsStep({ onNext, onBack, isLoading }: SnsStepProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  return (
    <motion.div className="relative z-10 w-full max-w-lg mx-auto px-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">{t("step3")}</p>
      </motion.div>
      <motion.h2 variants={item} className="h-title mb-3">{t("snsTitle")}</motion.h2>
      <motion.p variants={item} className="text-lede mb-8">{t("snsDesc")}</motion.p>

      <motion.div variants={item} className="grid grid-cols-1 gap-3">
        {SNS_OPTIONS.map((sns) => {
          const isSelected = selected.includes(sns.id);
          return (
            <motion.button
              key={sns.id}
              onClick={() => toggle(sns.id)}
              className={`flex items-center gap-4 h-14 rounded-3xl px-5 transition-all duration-200 cursor-pointer text-left ${
                isSelected
                  ? "bg-[rgba(239,255,0,0.06)] text-foreground"
                  : "bg-card hover:bg-secondary"
              }`}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-xs font-bold">
                {sns.icon}
              </span>
              <div className="flex-1">
                <span className="text-sm font-medium block">{sns.label}</span>
                <span className="text-xs text-muted-foreground">{sns.desc}</span>
              </div>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 24 }}
                >
                  <Check className="w-4 h-4 text-primary" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          ← {tCommon("back")}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNext({ selectedSns: [] })}
            disabled={isLoading}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
          >
            {tCommon("skip")}
          </button>
          <motion.button
            onClick={() => onNext({ selectedSns: selected })}
            disabled={isLoading}
            className="btn-hero bg-primary text-primary-foreground cursor-pointer disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? t("creating") : `${tCommon("next")} →`}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
