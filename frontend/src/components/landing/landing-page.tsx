"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, MessageSquare } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EASE = [0.22, 0.03, 0.26, 1] as const;

const DEMO_RESPONSES: Record<string, { hook: string; content: string; hashtags: string[] }> = {
  Threads: {
    hook: "3개월 동안 만든 걸 드디어 출시합니다.",
    content:
      "인디 해커를 위한 올인원 대시보드를 만들었습니다.\n\n프로모션 자동 생성, 배포 모니터링, 경쟁사 분석까지.\n\n탭 10개 열 필요 없이 하나로 끝.",
    hashtags: ["buildinpublic", "indiehacker", "saas"],
  },
  X: {
    hook: "Just shipped something I've been building for 3 months.",
    content:
      "An all-in-one dashboard for indie hackers.\n\nAuto-generate promotions, monitor deploys, track competitors.\n\nNo more 10 tabs open. One dashboard.",
    hashtags: ["buildinpublic", "indiehacker", "saas"],
  },
};

function useStreamText(text: string, speed: number, active: boolean) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setDisplayed("");
      setDone(false);
      return;
    }
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, active]);

  return { displayed, done };
}

export function LandingPage() {
  const [input, setInput] = useState("");
  const [platform, setPlatform] = useState<"Threads" | "X">("Threads");
  const [phase, setPhase] = useState<"idle" | "generating" | "done">("idle");
  const [result, setResult] = useState<(typeof DEMO_RESPONSES)["X"] | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { displayed: streamedHook, done: hookDone } = useStreamText(
    result?.hook ?? "",
    30,
    phase !== "idle" && !!result
  );
  const { displayed: streamedContent, done: contentDone } = useStreamText(
    result?.content ?? "",
    18,
    hookDone
  );

  useEffect(() => {
    if (contentDone && result) setPhase("done");
  }, [contentDone, result]);

  const handleGenerate = () => {
    if (!input.trim() || phase !== "idle") return;
    setPhase("generating");
    setTimeout(() => setResult(DEMO_RESPONSES[platform]), 500);
  };

  const handleReset = () => {
    setPhase("idle");
    setResult(null);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const expanded = phase !== "idle";

  return (
    <div className="min-h-dvh bg-white overflow-hidden selection:bg-slate-900 selection:text-white flex flex-col">
      {/* Nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto w-full"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <span className="logo-text text-[18px] text-slate-900">
          Launch<span className="text-blue-500">.</span>Pad
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
          >
            로그인
          </Link>
          <button
            onClick={handleGoogleLogin}
            className="text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-full transition-colors"
          >
            시작하기
          </button>
        </div>
      </motion.nav>

      {/* Main content -- vertically centered */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-5xl mx-auto px-6 sm:px-10">
          {/* Headline -- fades out on generate */}
          <AnimatePresence>
            {!expanded && (
              <motion.div
                className="text-center mb-10"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
                transition={{ duration: 0.6, ease: EASE }}
              >
                <h1 className="text-[32px] sm:text-[44px] font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-4">
                  인디 제품의 모든 것을
                  <br />
                  <span className="text-blue-500">한 곳에서 관리하세요</span>
                </h1>
                <p className="text-[15px] sm:text-[16px] text-slate-400 max-w-md mx-auto">
                  프로젝트 관리, 배포 모니터링, AI 홍보까지
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Interactive area */}
          <motion.div
            className="flex flex-col lg:flex-row gap-6 items-start"
            layout
            transition={{ duration: 0.6, ease: EASE }}
          >
            {/* Input card */}
            <motion.div
              layout
              className={`${
                expanded ? "w-full lg:w-1/2" : "w-full max-w-xl mx-auto"
              } shrink-0`}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <motion.div
                layout
                className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] p-5"
              >
                {/* Platform toggle */}
                <div className="flex gap-1.5 mb-3">
                  {(["Threads", "X"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => !expanded && setPlatform(p)}
                      className={`text-[12px] font-semibold px-3 py-1 rounded-full transition-all ${
                        platform === p
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-400 hover:text-slate-600"
                      } ${expanded ? "cursor-default" : ""}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="제품을 한 줄로 설명해 보세요"
                  rows={3}
                  className="w-full resize-none bg-transparent text-[15px] text-slate-800 placeholder:text-slate-300 focus:outline-none leading-relaxed"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleGenerate();
                    }
                  }}
                  disabled={expanded}
                />
                <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100">
                  {expanded ? (
                    <button
                      onClick={handleReset}
                      className="text-[13px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      다시 해보기
                    </button>
                  ) : (
                    <motion.button
                      onClick={handleGenerate}
                      disabled={!input.trim()}
                      className="flex items-center gap-2 bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full disabled:opacity-20 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Sparkles className="w-4 h-4" />
                      생성하기
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Result card -- slides in from right */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  className="w-full lg:w-1/2 shrink-0"
                  initial={{ opacity: 0, x: 60, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 60, scale: 0.95 }}
                  transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                >
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-[0_2px_20px_-6px_rgba(0,0,0,0.06)] overflow-hidden">
                    {/* Post header */}
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white">
                          {platform === "X" ? "X" : "TH"}
                        </span>
                      </div>
                      <span className="text-[12px] font-bold text-slate-700">
                        @your_product
                      </span>
                      <span className="text-[11px] text-slate-300 ml-auto">
                        방금 전
                      </span>
                    </div>

                    {/* Post body */}
                    <div className="p-5 min-h-40">
                      <p className="text-[15px] font-bold text-slate-800 leading-snug mb-2">
                        {streamedHook}
                      </p>
                      <p className="text-[14px] text-slate-600 leading-relaxed whitespace-pre-line">
                        {streamedContent}
                      </p>
                      {phase === "generating" && !contentDone && (
                        <motion.span
                          className="inline-block w-0.5 h-4 bg-slate-800 ml-0.5 align-middle"
                          animate={{ opacity: [1, 0] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        />
                      )}
                      {contentDone && result && (
                        <motion.div
                          className="flex flex-wrap gap-2 mt-3"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          {result.hashtags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[12px] font-medium text-blue-500"
                            >
                              #{tag}
                            </span>
                          ))}
                        </motion.div>
                      )}
                    </div>

                    {/* Engagement bar */}
                    <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-6 text-slate-300">
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                          />
                        </svg>
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px]">
                        <MessageSquare className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  {/* CTA after done */}
                  <AnimatePresence>
                    {phase === "done" && (
                      <motion.div
                        className="mt-5 flex items-center justify-end"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, ease: EASE }}
                      >
                        <motion.button
                          onClick={handleGoogleLogin}
                          className="flex items-center gap-2 bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors"
                          whileHover={{ scale: 1.03, x: 2 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          지금 시작하기
                          <ArrowRight className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
