"use client";

import { motion } from "motion/react";
import {
  Send,
  Paperclip,
  Image,
  Video,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "어떤 홍보 콘텐츠를 만들어볼까요? 레퍼런스 링크나 이미지를 공유하면 더 정확한 결과물을 만들 수 있어요.",
  },
];

const TEMPLATES = [
  { label: "Threads 런칭 포스트", emoji: "TH" },
  { label: "Bluesky 소개글", emoji: "BS" },
  { label: "Mastodon 공유 글", emoji: "MT" },
  { label: "블로그 포스트 초안", emoji: "B" },
];

export default function PromotionPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Mock AI 응답
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `"${input}"에 맞는 홍보 콘텐츠를 준비하고 있어요. 잠시만 기다려주세요...`,
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 800);
  };

  return (
    <div className="flex flex-col h-dvh">
      {/* 헤더 */}
      <motion.div
        className="border-b border-border px-8 py-5"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      >
        <p className="h-eyebrow mb-1">PROMOTION</p>
        <h1 className="text-2xl font-bold tracking-tight">홍보</h1>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        {/* 채팅 영역 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <motion.div
              className="max-w-2xl mx-auto flex flex-col gap-4"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={fadeUp}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <Sparkles className="w-3.5 h-3.5 inline-block mr-1.5 opacity-50" />
                    )}
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              <div ref={bottomRef} />
            </motion.div>
          </div>

          {/* 입력 영역 */}
          <div className="border-t border-border px-8 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="홍보 콘텐츠에 대해 설명해주세요..."
                    rows={1}
                    className="input-hero w-full h-auto! min-h-13 py-3.5 pr-24 resize-none"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                      <Image className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                      <Video className="w-4 h-4" />
                    </button>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors cursor-pointer">
                      <Paperclip className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <motion.button
                  onClick={handleSend}
                  className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 cursor-pointer"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-4.5 h-4.5" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* 템플릿 사이드 패널 */}
        <motion.div
          className="w-64 p-5 hidden lg:block"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.45, ease: EASE_OUT_EXPO }}
        >
          <h3 className="text-xs font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
            빠른 템플릿
          </h3>
          <div className="flex flex-col gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                onClick={() => setInput(`${t.label} 작성해줘`)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl
                           text-sm text-left hover:bg-muted transition-colors cursor-pointer"
              >
                <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                  {t.emoji}
                </span>
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-6 pt-5">
            <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              레퍼런스
            </h3>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <ExternalLink className="w-3.5 h-3.5" />
              레퍼런스 추가하기
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
