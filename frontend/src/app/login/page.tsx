"use client";

import { createClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import { Rocket } from "lucide-react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="onboard-shell">
      <div className="onboard-mesh" />
      <div className="onboard-grain" />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-8 px-6 text-center"
        initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
      >
        <motion.div
          className="flex items-center justify-center w-16 h-16 rounded-3xl bg-primary text-primary-foreground"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.6, ease: EASE_OUT_EXPO }}
        >
          <Rocket className="w-8 h-8" />
        </motion.div>

        <div className="flex flex-col gap-3">
          <h1 className="h-display">Indie Product Hub</h1>
          <p className="text-lede mx-auto">
            만든 프로덕트, 한곳에서 관리하고 홍보하세요
          </p>
        </div>

        <motion.button
          onClick={handleGoogleLogin}
          className="btn-hero bg-primary text-primary-foreground flex items-center gap-3 cursor-pointer"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: EASE_OUT_EXPO }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 시작하기
        </motion.button>

        <motion.p
          className="text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          가입 시 서비스 이용약관에 동의합니다
        </motion.p>
      </motion.div>
    </div>
  );
}
