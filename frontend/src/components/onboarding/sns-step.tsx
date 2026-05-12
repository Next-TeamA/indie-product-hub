"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useState } from "react";

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

const SNS_OPTIONS = [
  {
    id: "threads",
    label: "Threads",
    icon: "TH",
    desc: "Meta OAuth 연동",
  },
  {
    id: "bluesky",
    label: "Bluesky",
    icon: "BS",
    desc: "앱 비밀번호로 즉시 연동",
  },
  {
    id: "mastodon",
    label: "Mastodon",
    icon: "MT",
    desc: "인스턴스별 OAuth 연동",
  },
] as const;

interface SnsStepProps {
  onNext: (data: { selectedSns: string[] }) => void;
  onBack: () => void;
}

export function SnsStep({ onNext, onBack }: SnsStepProps) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );

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
        SNS 채널 연동
      </motion.h2>

      <motion.p variants={item} className="text-lede mb-8">
        홍보 콘텐츠를 자동으로 배포할 채널을 선택하세요.
        나중에 추가할 수도 있습니다.
      </motion.p>

      <motion.div variants={item} className="grid grid-cols-1 gap-3">
        {SNS_OPTIONS.map((sns) => {
          const isSelected = selected.includes(sns.id);
          return (
            <motion.button
              key={sns.id}
              onClick={() => toggle(sns.id)}
              className={`flex items-center gap-4 h-14 rounded-2xl px-5
                         border transition-all duration-200 cursor-pointer text-left
                         ${
                           isSelected
                             ? "border-foreground/20 bg-foreground/[0.04]"
                             : "border-border bg-card hover:border-foreground/10"
                         }`}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.985 }}
            >
              <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
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
                  transition={{
                    type: "spring",
                    stiffness: 420,
                    damping: 24,
                  }}
                >
                  <Check className="w-4 h-4 text-foreground" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNext({ selectedSns: [] })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            건너뛰기
          </button>
          <motion.button
            onClick={() => onNext({ selectedSns: selected })}
            className="btn-hero bg-primary text-primary-foreground cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            다음 →
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
