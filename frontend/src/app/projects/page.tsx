"use client";

import { motion } from "motion/react";
import {
  Plus, ArrowRight, Settings, ChevronDown, ArrowUpRight,
  ChevronLeft, ChevronRight, Megaphone, AlertTriangle, Activity,
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";

import { useProjects } from "@/hooks/use-projects";
import { useUser } from "@/hooks/use-user";
import type { Project } from "@/lib/api/projects";
import { Logo } from "@/components/logo";
import { ProjectAvatar } from "@/components/project-avatar";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;

/* ─── Smooth curve for sparklines ─── */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    const t = 0.3;
    d += ` C ${p1.x + (p2.x - p0.x) * t} ${p1.y + (p2.y - p0.y) * t}, ${p2.x - (p3.x - p1.x) * t} ${p2.y - (p3.y - p1.y) * t}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function Sparkline({ data, color, w = 120, h = 32 }: { data: number[]; color: string; w?: number; h?: number }) {
  const id = useMemo(() => `s-${Math.random().toString(36).slice(2, 6)}`, []);
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const pts = data.map((v, i) => ({ x: 2 + (i / (data.length - 1)) * (w - 4), y: 2 + (1 - (v - min) / range) * (h - 4) }));
  const curve = smoothPath(pts);
  const area = `${curve} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={curve} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Mini calendar ─── */
function MiniCalendar() {
  const [current, setCurrent] = useState(new Date());
  const y = current.getFullYear(), m = current.getMonth();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const days = new Date(y, m + 1, 0).getDate();
  const first = new Date(y, m, 1).getDay();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold">{current.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <div className="flex gap-1">
          <button onClick={() => setCurrent(new Date(y, m - 1))} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"><ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" /></button>
          <button onClick={() => setCurrent(new Date(y, m + 1))} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"><ChevronRight className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["S","M","T","W","T","F","S"].map((d,i) => <div key={`h-${i}`} className="text-center text-[10px] text-muted-foreground/50 pb-1">{d}</div>)}
        {cells.map((day, i) => {
          const ds = day ? `${y}-${String(m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}` : "";
          return <div key={i} className={`text-center text-xs py-1 rounded-lg ${ds === todayStr ? "bg-primary text-primary-foreground font-bold" : day ? "text-muted-foreground" : ""}`}>{day ?? ""}</div>;
        })}
      </div>
    </div>
  );
}

/* ─── Project card (grid style) ─── */
function ProjectCard({ project, index }: { project: Project; index: number }) {
  const tStatus = useTranslations("status");
  const dotColor = { preparing: "#D4A84B", active: "#5FCC7D", paused: "#6B7D8F", archived: "#4A4A4A" }[project.status] ?? "#4A4A4A";
  const statusLabel = tStatus(project.status as "preparing" | "active" | "paused" | "archived");
  // Mock sparkline per project (real data in Phase 4)
  const sparkData = useMemo(() => Array.from({ length: 7 }, () => Math.random() * 100 + 20), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.35, ease: EASE_OUT }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="group block rounded-3xl bg-card p-5 transition-all duration-200 hover:bg-secondary"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <ProjectAvatar name={project.name} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{project.name}</h3>
              <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {project.description || "No description"}
            </p>
          </div>
        </div>

        {/* Sparkline */}
        <div className="mb-3">
          <Sparkline data={sparkData} color={dotColor} w={200} h={28} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: dotColor }} />
            <span className="text-xs text-muted-foreground">{statusLabel}</span>
          </div>
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ─── Skeleton ─── */
function Skeleton() {
  return (
    <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="rounded-3xl bg-card p-5">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-xl bg-secondary" /><div className="space-y-2 flex-1"><div className="h-4 w-24 bg-secondary rounded-lg" /><div className="h-3 w-36 bg-secondary rounded-lg" /></div></div>
          <div className="h-7 bg-secondary rounded-lg mb-3 w-3/4" />
          <div className="flex justify-between"><div className="h-3 w-14 bg-secondary rounded-lg" /><div className="h-3 w-10 bg-secondary rounded-lg" /></div>
        </div>
      ))}
    </div>
  );
}

/* ─── User menu ─── */
function UserMenu() {
  const user = useUser();
  const tNav = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2.5 h-10 px-2 rounded-xl hover:bg-card transition-colors cursor-pointer">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-lg object-cover" /> : <div className="w-7 h-7 rounded-lg bg-card flex items-center justify-center text-xs font-semibold text-muted-foreground">{user?.name?.[0]?.toUpperCase() ?? "?"}</div>}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.15 }} className="absolute right-0 top-12 z-50 w-52 bg-card rounded-2xl p-1.5 shadow-2xl">
            {user && <div className="px-3 py-2 mb-1"><p className="text-sm font-medium truncate">{user.name}</p><p className="text-xs text-muted-foreground truncate">{user.email}</p></div>}
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Settings className="w-4 h-4" />{tNav("settings")}</Link>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* ─── Main ─── */
export default function ProjectsPage() {
  const { projects, error, isLoading } = useProjects();
  const t = useTranslations("projects");
  const tHome = useTranslations("home");
  const tCommon = useTranslations("common");

  return (
    <div className="min-h-dvh bg-background">
      <div className="px-8 py-5 flex items-center justify-between max-w-350 mx-auto">
        <Logo />
        <div className="flex items-center gap-2">
          <Link href="/projects/new" className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" />{t("newProject")}</Link>
          <UserMenu />
        </div>
      </div>

      <main className="px-8 pb-8 max-w-350 mx-auto">
        {isLoading ? <Skeleton /> : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-destructive mb-4">Failed to load</p>
            <button onClick={() => window.location.reload()} className="text-sm text-muted-foreground underline cursor-pointer">{tCommon("retry")}</button>
          </div>
        ) : projects.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {/* Overview stats row */}
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: tHome("totalImpressions"), value: "12.4K", change: "+18%", color: "#EFFF00", data: [40,52,48,61,55,72,68,80,75,89,84,96] },
                { label: tHome("totalClicks"), value: "1.2K", change: "+12%", color: "#6B7D8F", data: [20,25,22,30,28,35,32,38,36,42,40,48] },
                { label: tHome("openIssues"), value: "3", change: "-2", color: "#5FCC7D", data: [8,7,6,5,6,5,4,5,3,4,3,3] },
              ].map((s, i) => (
                <motion.div key={s.label} className="bg-card rounded-3xl p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease: EASE_OUT }}>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold tabular-nums">{s.value}</span>
                    <span className="text-xs font-medium" style={{ color: "#5FCC7D" }}>{s.change}</span>
                  </div>
                  <div className="mt-3"><Sparkline data={s.data} color={s.color} /></div>
                </motion.div>
              ))}
              <motion.div className="bg-card rounded-3xl p-5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35, ease: EASE_OUT }}>
                <MiniCalendar />
              </motion.div>
            </div>

            {/* Projects grid */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.35, ease: EASE_OUT }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-sm font-semibold">{tHome("activeProjects")}</p>
              </div>
              <div className="grid gap-1.5 grid-cols-2 lg:grid-cols-3">
                {projects.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}

                {/* Add project card */}
                <Link
                  href="/projects/new"
                  className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-muted-foreground/15 p-8 text-muted-foreground transition-all duration-200 hover:border-primary/30 hover:text-primary hover:bg-card min-h-[180px]"
                >
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-medium">{t("addProject")}</span>
                </Link>
              </div>
            </motion.div>
          </div>
        ) : (
          /* Empty state */
          <motion.div className="mt-[12vh] flex flex-col items-center text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }}>
            <Link href="/projects/new" className="group relative w-full max-w-md">
              <div className="absolute -inset-4 rounded-3xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
              <div className="relative bg-card rounded-3xl p-8 hover:bg-secondary transition-all duration-300 flex flex-col items-center gap-5">
                <div className="w-16 h-16 rounded-3xl bg-primary flex items-center justify-center"><Plus className="w-7 h-7 text-primary-foreground" /></div>
                <div>
                  <h2 className="text-xl font-bold">{t("noProjects")}</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto">{t("noProjectsDesc")}</p>
                </div>
                <span className="btn-primary inline-flex items-center gap-2 text-sm mt-2">{t("createFirst")}<ArrowRight className="w-4 h-4" /></span>
              </div>
            </Link>
          </motion.div>
        )}
      </main>
    </div>
  );
}
