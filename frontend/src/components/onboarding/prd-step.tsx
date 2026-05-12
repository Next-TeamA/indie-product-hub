"use client";

import { motion } from "motion/react";
import { FileText } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const item = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: EASE_OUT_EXPO } },
};

interface PrdStepProps {
  onNext: (data: { name: string; description: string; prd: string }) => void;
}

export function PrdStep({ onNext }: PrdStepProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prd, setPrd] = useState("");
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");

  const isValid = name.trim().length >= 2;

  return (
    <motion.div className="relative z-10 w-full max-w-lg mx-auto px-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-2">
        <p className="h-eyebrow">{t("step1")}</p>
      </motion.div>
      <motion.h2 variants={item} className="h-title mb-3">{t("prdTitle")}</motion.h2>
      <motion.p variants={item} className="text-lede mb-8">{t("prdDesc")}</motion.p>

      <motion.div variants={item} className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("projectName")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("projectNamePlaceholder")} className="input-hero w-full" autoFocus />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">{t("description")}</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} className="input-hero w-full" />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
            {t("prd")}
          </label>
          <div className="relative">
            <textarea value={prd} onChange={(e) => setPrd(e.target.value)} placeholder={t("prdPlaceholder")} rows={6} className="input-hero w-full !h-auto py-4 resize-none" />
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
          {tCommon("next")} →
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
