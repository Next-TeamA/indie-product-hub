"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

interface CompleteStepProps {
  projectName: string;
}

export function CompleteStep({ projectName }: CompleteStepProps) {
  const router = useRouter();

  return (
    <motion.div
      className="relative z-10 flex flex-col items-center text-center px-6"
      initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
    >
      <motion.div
        className="w-20 h-20 rounded-3xl bg-primary text-primary-foreground
                    flex items-center justify-center mb-8"
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.2,
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        <Sparkles className="w-10 h-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <h2 className="h-display mb-4">준비 완료</h2>
        <p className="text-lede mx-auto mb-2">
          <span className="font-semibold text-foreground">{projectName}</span>
          이(가) 등록되었습니다.
        </p>
        <p className="text-lede mx-auto">
          대시보드에서 홍보, 인사이트, 운영 관리를 시작하세요.
        </p>
      </motion.div>

      {/* 파동 효과 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute w-40 h-40 rounded-full border border-foreground/5"
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{
              delay: 0.3 + i * 0.4,
              duration: 2,
              ease: "easeOut",
              repeat: Infinity,
              repeatDelay: 1.2,
            }}
          />
        ))}
      </div>

      <motion.button
        onClick={() => router.push("/projects/1")}
        className="btn-hero bg-primary text-primary-foreground mt-10 cursor-pointer"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5, ease: EASE_OUT_EXPO }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        대시보드로 가기
      </motion.button>
    </motion.div>
  );
}
