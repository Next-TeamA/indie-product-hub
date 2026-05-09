"use client";

import { motion } from "motion/react";
import { Plus, Rocket, ExternalLink, Calendar } from "lucide-react";
import Link from "next/link";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// 임시 mock 데이터 — 추후 Supabase 연동
const MOCK_PROJECTS = [
  {
    id: "1",
    name: "TaskFlow",
    description: "팀 업무 관리 SaaS",
    status: "운영중",
    lastActivity: "2일 전",
    promotionCount: 12,
    issueCount: 3,
  },
  {
    id: "2",
    name: "PixelSnap",
    description: "디자인 에셋 생성기",
    status: "준비중",
    lastActivity: "5일 전",
    promotionCount: 4,
    issueCount: 0,
  },
];

function ProjectCard({
  project,
  index,
}: {
  project: (typeof MOCK_PROJECTS)[0];
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        delay: 0.1 + index * 0.06,
        duration: 0.5,
        ease: EASE_OUT_EXPO,
      }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="group block rounded-2xl border border-border bg-card p-6
                   transition-all duration-300 hover:border-foreground/15
                   hover:shadow-[0_8px_30px_-12px_oklch(from_var(--foreground)_l_c_h_/_0.12)]"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base">{project.name}</h3>
              <p className="text-sm text-muted-foreground">
                {project.description}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              project.status === "운영중"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {project.status}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" />
            홍보 {project.promotionCount}건
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {project.lastActivity}
          </span>
          {project.issueCount > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              이슈 {project.issueCount}건
            </span>
          )}
        </div>

        <div className="mt-4 h-px bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="mt-3 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          대시보드 열기 →
        </p>
      </Link>
    </motion.div>
  );
}

export default function ProjectsPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <motion.h1
            className="text-xl font-bold tracking-tight"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            Indie Product Hub
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <Link
              href="/projects/new"
              className="btn-hero bg-primary text-primary-foreground flex items-center gap-2 text-sm h-10 px-5"
            >
              <Plus className="w-4 h-4" />
              새 프로젝트
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        >
          <p className="h-eyebrow mb-2">MY PROJECTS</p>
          <p className="text-muted-foreground text-sm">
            {MOCK_PROJECTS.length}개의 프로젝트를 관리하고 있습니다
          </p>
        </motion.div>

        {MOCK_PROJECTS.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {MOCK_PROJECTS.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + MOCK_PROJECTS.length * 0.06,
                duration: 0.5,
                ease: EASE_OUT_EXPO,
              }}
            >
              <Link
                href="/projects/new"
                className="flex flex-col items-center justify-center gap-3
                           rounded-2xl border-2 border-dashed border-border p-10
                           text-muted-foreground transition-colors duration-200
                           hover:border-foreground/20 hover:text-foreground"
              >
                <Plus className="w-8 h-8" />
                <span className="text-sm font-medium">프로젝트 추가</span>
              </Link>
            </motion.div>
          </div>
        ) : (
          <motion.div
            className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Rocket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="h-title mb-2">아직 프로젝트가 없습니다</h2>
            <p className="text-lede mb-8">
              첫 프로젝트를 등록하고 관리를 시작하세요
            </p>
            <Link
              href="/projects/new"
              className="btn-hero bg-primary text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              첫 프로젝트 만들기
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
