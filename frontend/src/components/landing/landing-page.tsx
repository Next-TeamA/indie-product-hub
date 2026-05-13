"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { ArrowRight, Sparkles, Send, X as XIcon, MessageSquare } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const EASE = [0.2, 0, 0, 1] as const;
const EASE_OUT = [0, 0, 0.2, 1] as const;
const SPRING = { type: "spring" as const, stiffness: 300, damping: 30 };

// Simulated AI generation (streams character by character)
const DEMO_RESPONSES: Record<string, { platform: string; hook: string; content: string; hashtags: string[] }> = {
  default: {
    platform: "X",
    hook: "Just shipped something I've been working on for 3 months.",
    content: "Built a tool that helps indie hackers manage promotions, track deployments, and get market insights -- all in one dashboard.\n\nNo more switching between 10 tabs.\n\nEarly access is open.",
    hashtags: ["buildinpublic", "indiehacker", "saas"],
  },
};

function useStreamText(text: string, speed: number = 20, active: boolean = false) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) { setDisplayed(""); setDone(false); return; }
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

// X post preview card
function PostPreview({
  platform,
  hook,
  content,
  hashtags,
  streaming,
}: {
  platform: string;
  hook: string;
  content: string;
  hashtags: string[];
  streaming: boolean;
}) {
  return (
    <motion.div
      className="bg-white rounded-[20px] border border-slate-100 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] overflow-hidden"
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* Platform header */}
      <div className="px-5 py-3 border-b border-slate-50 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">{platform === "X" ? "X" : "TH"}</span>
        </div>
        <span className="text-[12px] font-bold text-slate-800">@your_product</span>
        <span className="text-[11px] text-slate-400 ml-auto">just now</span>
      </div>

      {/* Content */}
      <div className="p-5">
        <p className="text-[15px] font-bold text-slate-800 leading-snug mb-2">{hook}</p>
        <p className="text-[14px] text-slate-600 leading-relaxed whitespace-pre-line">{content}</p>
        {streaming && (
          <motion.span
            className="inline-block w-0.5 h-4 bg-slate-800 ml-0.5"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
        {hashtags.length > 0 && (
          <motion.div
            className="flex flex-wrap gap-2 mt-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {hashtags.map(tag => (
              <span key={tag} className="text-[12px] font-medium text-blue-500">#{tag}</span>
            ))}
          </motion.div>
        )}
      </div>

      {/* Engagement bar */}
      <div className="px-5 py-3 border-t border-slate-50 flex items-center gap-6 text-slate-400">
        <button className="flex items-center gap-1.5 text-[12px] hover:text-rose-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
        <button className="flex items-center gap-1.5 text-[12px] hover:text-blue-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
          </svg>
        </button>
        <button className="flex items-center gap-1.5 text-[12px] hover:text-emerald-500 transition-colors">
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export function LandingPage() {
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<typeof DEMO_RESPONSES.default | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Stream hook + content
  const { displayed: streamedHook, done: hookDone } = useStreamText(
    result?.hook ?? "", 25, generating || !!result
  );
  const { displayed: streamedContent, done: contentDone } = useStreamText(
    result?.content ?? "", 15, hookDone
  );

  const handleGenerate = () => {
    if (!input.trim()) return;
    setGenerating(true);
    setResult(null);

    // Simulate AI response delay
    setTimeout(() => {
      setResult(DEMO_RESPONSES.default);
    }, 600);
  };

  const handleGoogleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const isStreaming = generating && result && !contentDone;

  return (
    <div className="min-h-dvh bg-white overflow-hidden selection:bg-slate-800 selection:text-white">
      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-50/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-50/30 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-6xl mx-auto"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <span className="text-[18px] font-black tracking-tight text-slate-900 uppercase">
          Launch<span className="text-blue-500">.</span>Pad
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-[13px] font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            Log in
          </Link>
          <button
            onClick={handleGoogleLogin}
            className="text-[13px] font-semibold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-full transition-colors"
          >
            Get started
          </button>
        </div>
      </motion.nav>

      {/* Hero */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-10 pt-8 sm:pt-16 pb-20">
        {/* Tagline */}
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
        >
          <h1 className="text-[36px] sm:text-[52px] font-extrabold tracking-tight text-slate-900 leading-[1.1] mb-4">
            Your indie product<br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
              deserves better marketing.
            </span>
          </h1>
          <p className="text-[16px] sm:text-[18px] text-slate-500 max-w-lg mx-auto leading-relaxed">
            Describe your product. Get a ready-to-post promotion in seconds. Track everything from one dashboard.
          </p>
        </motion.div>

        {/* Interactive demo area */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: EASE }}
        >
          {/* Left: Input */}
          <div className="space-y-4">
            <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] p-5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                Describe your product
              </label>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. A task management SaaS for remote teams with AI-powered prioritization"
                className="w-full h-28 resize-none bg-transparent text-[15px] text-slate-800 placeholder:text-slate-300 focus:outline-none leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <div className="flex items-center gap-2">
                  {["X", "Threads"].map(p => (
                    <span key={p} className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                      {p}
                    </span>
                  ))}
                </div>
                <motion.button
                  onClick={handleGenerate}
                  disabled={!input.trim() || generating}
                  className="flex items-center gap-2 bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Generate
                </motion.button>
              </div>
            </div>

            {/* Feature hints */}
            <motion.div
              className="grid grid-cols-3 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {[
                { label: "AI Promotion", desc: "Generate posts for X, Threads" },
                { label: "Deploy Monitor", desc: "Error detection + AI fix" },
                { label: "Market Intel", desc: "Competitor analysis daily" },
              ].map((feat, i) => (
                <motion.div
                  key={feat.label}
                  className="p-3 rounded-[14px] border border-slate-100 bg-white/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1, ease: EASE }}
                >
                  <p className="text-[11px] font-bold text-slate-800 mb-0.5">{feat.label}</p>
                  <p className="text-[10px] text-slate-400">{feat.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right: Preview */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {result ? (
                <PostPreview
                  key="result"
                  platform={result.platform}
                  hook={streamedHook}
                  content={streamedContent}
                  hashtags={contentDone ? result.hashtags : []}
                  streaming={!!isStreaming}
                />
              ) : (
                <motion.div
                  key="placeholder"
                  className="bg-slate-50/50 rounded-[20px] border border-dashed border-slate-200 p-10 flex flex-col items-center justify-center min-h-[300px] text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Send className="w-5 h-5 text-slate-400" />
                  </motion.div>
                  <p className="text-[14px] font-semibold text-slate-400 mb-1">
                    Your post preview will appear here
                  </p>
                  <p className="text-[12px] text-slate-300">
                    Type a product description and hit Generate
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA after generation */}
            <AnimatePresence>
              {contentDone && result && (
                <motion.div
                  className="mt-4 flex items-center justify-between"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, ease: EASE }}
                >
                  <p className="text-[12px] text-slate-400">
                    Sign up to publish, schedule, and track performance
                  </p>
                  <motion.button
                    onClick={handleGoogleLogin}
                    className="flex items-center gap-2 bg-slate-900 text-white text-[13px] font-semibold px-5 py-2.5 rounded-full hover:bg-slate-800 transition-colors"
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get started free
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Bottom social proof / stats */}
      <motion.div
        className="relative z-10 border-t border-slate-100 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <div className="max-w-6xl mx-auto px-6 sm:px-10 flex items-center justify-center gap-10 text-center">
          {[
            { value: "40+", label: "API endpoints" },
            { value: "5", label: "Platform integrations" },
            { value: "24/7", label: "Deploy monitoring" },
            { value: "AI", label: "Powered insights" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[20px] font-black text-slate-800">{stat.value}</p>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
