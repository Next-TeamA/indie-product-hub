"use client";

import { motion } from "motion/react";
import { Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { connectAccount } from "@/lib/api/accounts";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

const SNS_OPTIONS = [
  { id: "x", label: "X (Twitter)", icon: "X", desc: "OAuth 2.0으로 연동" },
  { id: "threads", label: "Threads", icon: "TH", desc: "Meta OAuth로 연동" },
] as const;

interface SnsStepProps {
  onNext: (data: { selectedSns: string[] }) => void;
  onBack: () => void;
}

export function SnsStep({ onNext, onBack }: SnsStepProps) {
  const [connected, setConnected] = useState<Record<string, boolean>>({});
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const { auth_url } = await connectAccount(provider);
      window.location.href = auth_url;
    } catch (e) {
      console.error(`${provider} connect failed:`, e);
      setConnecting(null);
    }
  };

  const connectedList = Object.keys(connected).filter(k => connected[k]);

  return (
    <motion.div className="relative z-10 w-full max-w-lg mx-auto px-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">STEP 3</p>
      </motion.div>

      <motion.h2 variants={item} className="h-title mb-3">SNS 채널 연동</motion.h2>

      <motion.p variants={item} className="text-lede mb-8">
        홍보 콘텐츠를 자동으로 배포할 채널을 연결하세요. 나중에 설정에서 추가할 수도 있습니다.
      </motion.p>

      <motion.div variants={item} className="grid grid-cols-1 gap-3">
        {SNS_OPTIONS.map((sns) => {
          const isConnected = connected[sns.id];
          const isConnecting = connecting === sns.id;
          return (
            <motion.button
              key={sns.id}
              onClick={() => !isConnected && handleConnect(sns.id)}
              disabled={isConnecting}
              className={`flex items-center gap-4 h-14 rounded-2xl px-5 border transition-all duration-200 cursor-pointer text-left disabled:opacity-50 ${
                isConnected
                  ? "border-emerald-500/30 bg-emerald-500/5"
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
                <span className="text-xs text-muted-foreground">
                  {isConnecting ? "연결 중..." : isConnected ? "연결됨" : sns.desc}
                </span>
              </div>
              {isConnected ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </motion.button>
          );
        })}
      </motion.div>

      <motion.div variants={item} className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
          ← 이전
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNext({ selectedSns: [] })}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            나중에 하기
          </button>
          <motion.button
            onClick={() => onNext({ selectedSns: connectedList })}
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
