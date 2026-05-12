"use client";

import { motion } from "motion/react";
import { FileText } from "lucide-react";
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

interface PrdStepProps {
  onNext: (data: { name: string; description: string; prd: string }) => void;
}

export function PrdStep({ onNext }: PrdStepProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prd, setPrd] = useState("");

  const isValid = name.trim().length >= 2;

  return (
    <motion.div
      className="relative z-10 w-full max-w-lg mx-auto px-6"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">STEP 1</p>
      </motion.div>

      <motion.h2 variants={item} className="h-title mb-3">
        프로젝트를 알려주세요
      </motion.h2>

      <motion.p variants={item} className="text-lede mb-8">
        기획서가 있다면 붙여넣기 해도 좋아요.
        없어도 이름과 한 줄 설명이면 충분합니다.
      </motion.p>

      <motion.div variants={item} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            프로젝트 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: TaskFlow"
            className="input-hero w-full"
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            한 줄 설명
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 팀 업무 관리 SaaS"
            className="input-hero w-full"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            기획서 (PRD)
            <span className="ml-1.5 text-xs text-muted-foreground/60">
              선택
            </span>
          </label>
          <div className="relative">
            <textarea
              value={prd}
              onChange={(e) => setPrd(e.target.value)}
              placeholder="기획서 내용을 붙여넣거나, 프로젝트에 대해 자유롭게 설명해주세요..."
              rows={6}
              className="input-hero w-full !h-auto py-4 resize-none"
            />
            <FileText className="absolute right-4 top-4 w-4 h-4 text-muted-foreground/30" />
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-8 flex justify-end">
        <motion.button
          onClick={() => onNext({ name, description, prd })}
          disabled={!isValid}
          className="btn-hero bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          whileHover={isValid ? { scale: 1.02 } : undefined}
          whileTap={isValid ? { scale: 0.98 } : undefined}
        >
          다음 →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
