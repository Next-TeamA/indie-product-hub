"use client";

import { motion } from "motion/react";
import { Plus, Rocket, ExternalLink, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";

import { useProjects } from "@/hooks/use-projects";
import type { Project } from "@/lib/api/projects";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const STATUS_LABELS: Record<string, string> = {
  preparing: "Preparing",
  active: "Active",
  paused: "Paused",
  archived: "Archived",
};

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const statusLabel = STATUS_LABELS[project.status] ?? project.status;
  const isActive = project.status === "active";

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
                {project.description || "No description"}
              </p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isActive
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {project.sns_channels.length > 0 && (
            <span className="flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              {project.sns_channels.length} channels
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(project.created_at).toLocaleDateString("ko-KR")}
          </span>
        </div>

        <div className="mt-4 h-px bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
        <p className="mt-3 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
          Open dashboard
        </p>
      </Link>
    </motion.div>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card p-6 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-48 bg-muted rounded" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProjectsPage() {
  const { projects, error, isLoading } = useProjects();

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
              New Project
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
          {!isLoading && !error && (
            <p className="text-muted-foreground text-sm">
              {projects.length > 0
                ? `Managing ${projects.length} project${projects.length > 1 ? "s" : ""}`
                : ""}
            </p>
          )}
        </motion.div>

        {isLoading ? (
          <ProjectsSkeleton />
        ) : error ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p className="text-destructive mb-4">Failed to load projects</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-muted-foreground underline"
            >
              Retry
            </button>
          </motion.div>
        ) : projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project, i) => (
              <ProjectCard key={project.id} project={project} index={i} />
            ))}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + projects.length * 0.06,
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
                <span className="text-sm font-medium">Add Project</span>
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
            <h2 className="h-title mb-2">No projects yet</h2>
            <p className="text-lede mb-8">
              Create your first project to get started
            </p>
            <Link
              href="/projects/new"
              className="btn-hero bg-primary text-primary-foreground flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Project
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
