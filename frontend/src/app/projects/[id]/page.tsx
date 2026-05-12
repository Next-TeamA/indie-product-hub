"use client";

import { useState, useRef } from "react";
import { motion } from "motion/react";
import {
  Eye, MousePointer, Target, Users,
  CheckCircle2, XCircle, Clock, Shield, Zap, AlertTriangle,
  Server, Database, Globe, RefreshCw, ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useProject } from "@/hooks/use-projects";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/* ─── Color palette (cohesive, muted) ─── */
const COLORS = {
  primary: "#EFFF00",
  secondary: "#6B7D8F",
  tertiary: "#5A6B7B",
  positive: "#5FCC7D",
  negative: "#D97B78",
  neutral: "#4A4A4A",
};

/* ─── Smooth curve ─── */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const t = 0.3;
    d += ` C ${p1.x + (p2.x - p0.x) * t} ${p1.y + (p2.y - p0.y) * t}, ${p2.x - (p3.x - p1.x) * t} ${p2.y - (p3.y - p1.y) * t}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/* ─── Interactive chart with hover tooltip ─── */
function InteractiveChart({
  datasets,
  labels,
  height = 180,
}: {
  datasets: { data: number[]; color: string; label: string }[];
  labels: string[];
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const width = 560;
  const padX = 20;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const allValues = datasets.flatMap((d) => d.data);
  const globalMax = Math.max(...allValues);
  const globalMin = Math.min(...allValues);
  const range = globalMax - globalMin || 1;

  const n = datasets[0].data.length;

  const lines = datasets.map((ds) => {
    const points = ds.data.map((v, i) => ({
      x: padX + (i / (n - 1)) * chartW,
      y: padY + (1 - (v - globalMin) / range) * chartH,
    }));
    const curve = smoothPath(points);
    const area = `${curve} L ${points[n - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;
    return { ...ds, points, curve, area };
  });

  const gradIds = datasets.map((_, i) => `chart-grad-${i}`);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * width;
    const idx = Math.round(((x - padX) / chartW) * (n - 1));
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      className="block cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      <defs>
        {datasets.map((ds, i) => (
          <linearGradient key={i} id={gradIds[i]} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ds.color} stopOpacity="0.15" />
            <stop offset="100%" stopColor={ds.color} stopOpacity="0" />
          </linearGradient>
        ))}
      </defs>

      {/* Grid lines -- extremely subtle */}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={i}
          x1={padX} x2={padX + chartW}
          y1={padY + (i / 3) * chartH} y2={padY + (i / 3) * chartH}
          stroke="currentColor" strokeOpacity="0.04"
        />
      ))}

      {/* Area fills */}
      {lines.map((l, i) => (
        <path key={`area-${i}`} d={l.area} fill={`url(#${gradIds[i]})`} />
      ))}

      {/* Curve lines */}
      {lines.map((l, i) => (
        <motion.path
          key={`line-${i}`}
          d={l.curve}
          fill="none"
          stroke={l.color}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.2, delay: i * 0.15, ease: EASE_OUT }}
        />
      ))}

      {/* End dots */}
      {lines.map((l, i) => {
        const last = l.points[l.points.length - 1];
        return (
          <motion.circle
            key={`dot-${i}`}
            cx={last.x} cy={last.y} r="3.5"
            fill={l.color}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.0 + i * 0.15, type: "spring", stiffness: 300, damping: 20 }}
          />
        );
      })}

      {/* Hover line + dots */}
      {hoverIdx !== null && (
        <>
          <line
            x1={padX + (hoverIdx / (n - 1)) * chartW}
            x2={padX + (hoverIdx / (n - 1)) * chartW}
            y1={padY} y2={padY + chartH}
            stroke="currentColor" strokeOpacity="0.1" strokeDasharray="3 3"
          />
          {lines.map((l, i) => (
            <circle
              key={`h-${i}`}
              cx={l.points[hoverIdx].x}
              cy={l.points[hoverIdx].y}
              r="4" fill={l.color} stroke="#1C1C1C" strokeWidth="2"
            />
          ))}
          {/* Tooltip */}
          <foreignObject
            x={Math.min(padX + (hoverIdx / (n - 1)) * chartW - 60, width - 140)}
            y={0}
            width="130" height={padY + chartH}
          >
            <div className="bg-card/90 backdrop-blur-sm rounded-xl p-2 mt-1 text-[10px] space-y-0.5 shadow-lg">
              <p className="text-muted-foreground font-medium">{labels[hoverIdx] ?? ""}</p>
              {datasets.map((ds, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: ds.color }} />
                  <span className="text-muted-foreground">{ds.label}</span>
                  <span className="font-semibold text-foreground ml-auto tabular-nums">
                    {ds.data[hoverIdx]?.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </foreignObject>
        </>
      )}

      {/* X labels */}
      {labels.filter((_l, i) => i % Math.ceil(n / 7) === 0 || i === n - 1).map((label) => {
        const origIdx = labels.indexOf(label);
        return (
          <text
            key={label}
            x={padX + (origIdx / (n - 1)) * chartW}
            y={height - 2}
            textAnchor="middle" fontSize="10"
            fill="currentColor" fillOpacity="0.3"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

/* ─── Data ─── */
const PERIOD_TABS = ["7D", "30D", "6M", "12M"] as const;
type Period = typeof PERIOD_TABS[number];

const PERIOD_DATA: Record<Period, { impressions: number[]; clicks: number[]; conversions: number[] }> = {
  "7D": {
    impressions: [820, 950, 1100, 870, 1350, 980, 1200],
    clicks: [210, 280, 310, 250, 390, 300, 340],
    conversions: [58, 72, 85, 65, 110, 88, 96],
  },
  "30D": {
    impressions: [600, 800, 950, 700, 1100, 900, 1200, 800, 950, 1050, 870, 1000, 1200, 1100, 950, 1300, 1000, 1150, 1200, 1050, 980, 1350, 1100, 1200, 950, 1000, 1250, 980, 1200, 1300],
    clicks: [150, 200, 250, 180, 300, 240, 340, 200, 250, 280, 220, 270, 340, 300, 250, 360, 280, 310, 340, 290, 260, 390, 300, 340, 260, 270, 350, 260, 340, 370],
    conversions: [40, 55, 70, 48, 85, 65, 96, 55, 68, 78, 60, 74, 96, 85, 68, 100, 78, 88, 96, 82, 72, 110, 85, 96, 72, 75, 98, 72, 96, 105],
  },
  "6M": {
    impressions: [9000, 10500, 11200, 9800, 12000, 10800],
    clicks: [2200, 2700, 3100, 2600, 3500, 3200],
    conversions: [600, 750, 880, 720, 980, 900],
  },
  "12M": {
    impressions: [8000, 9000, 10500, 11200, 9800, 12000, 10800, 9200, 10500, 11800, 10200, 12500],
    clicks: [1800, 2200, 2700, 3100, 2600, 3500, 3200, 2800, 3000, 3400, 2900, 3700],
    conversions: [500, 600, 750, 880, 720, 980, 900, 750, 860, 960, 820, 1050],
  },
};

const PERIOD_LABELS: Record<Period, string[]> = {
  "7D": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30D": Array.from({ length: 30 }, (_, i) => `${i + 1}`),
  "6M": ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
  "12M": ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
};

const SERVICES = [
  { name: "API", icon: Server, status: "degraded" as const, latency: "2.3s" },
  { name: "Database", icon: Database, status: "healthy" as const, latency: "12ms" },
  { name: "CDN", icon: Globe, status: "healthy" as const, latency: "48ms" },
  { name: "Auth", icon: Shield, status: "healthy" as const, latency: "130ms" },
];

const SERVICE_CFG = {
  healthy: { dot: "bg-[#5FCC7D]", label: "OK" },
  degraded: { dot: "bg-[#D97B78] animate-pulse", label: "Slow" },
  down: { dot: "bg-[#D97B78] animate-pulse", label: "Down" },
};

const DEPLOYS = [
  { commit: "f7a3b2e", msg: "feat: payment UX improvement", time: "14m", status: "running" as const },
  { commit: "c9e1d4a", msg: "fix: session expiry bug", time: "3h", status: "success" as const },
  { commit: "a3f2d1c", msg: "refactor: image optimization", time: "12h", status: "failed" as const },
  { commit: "b8c5f9d", msg: "chore: dependency update", time: "1d", status: "success" as const },
];

const DEPLOY_CFG = {
  success: { dot: "bg-[#5FCC7D]", text: "text-[#5FCC7D]", label: "OK", Icon: CheckCircle2 },
  failed: { dot: "bg-[#D97B78]", text: "text-[#D97B78]", label: "Fail", Icon: XCircle },
  running: { dot: "bg-[#6B7D8F]", text: "text-[#6B7D8F]", label: "Running", Icon: RefreshCw },
  cancelled: { dot: "bg-[#4A4A4A]", text: "text-[#4A4A4A]", label: "Cancel", Icon: XCircle },
};

const ISSUES = [
  { id: "1", title: "SSL cert expiring (5/15)", severity: "critical" as const, icon: Shield, status: "open" as const },
  { id: "2", title: "API response > 2.3s avg", severity: "warning" as const, icon: Zap, status: "investigating" as const },
  { id: "4", title: "Error rate spike /api/checkout", severity: "critical" as const, icon: AlertTriangle, status: "open" as const },
];

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {label}<ChevronRight className="w-3 h-3" />
    </Link>
  );
}

/* ─── Main ─── */
export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const { project } = useProject(id);
  const [period, setPeriod] = useState<Period>("7D");
  const t = useTranslations("dashboard");

  const pData = PERIOD_DATA[period];

  const stats = [
    { label: t("impressions"), value: "9.4K", change: "+18%", up: true, icon: Eye },
    { label: t("clicks"), value: "987", change: "+12%", up: true, icon: MousePointer },
    { label: t("ctr"), value: "28.3%", change: "-2%", up: false, icon: Target },
    { label: t("newUsers"), value: "87", change: "+14.5%", up: true, icon: Users },
  ];

  return (
    <div className="w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1.5">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{project?.name ?? "Dashboard"}</h1>
          {ISSUES.filter(i => i.severity === "critical").length > 0 && (
            <Link
              href={`/projects/${id}/issues`}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              style={{ background: "rgba(217,123,120,0.12)", color: COLORS.negative }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: COLORS.negative }} />
              {ISSUES.filter(i => i.severity === "critical").length} critical
            </Link>
          )}
        </motion.div>

        {/* Stat cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-1.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-3xl bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className="w-4 h-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{s.value}</p>
              <p className="text-xs mt-1.5">
                <span style={{ color: s.up ? COLORS.positive : COLORS.negative }} className="font-medium">
                  {s.change}
                </span>
                <span className="text-muted-foreground ml-1">{t("vsLastWeek")}</span>
              </p>
            </div>
          ))}
        </motion.div>

        {/* Main grid */}
        <div className="grid grid-cols-5 gap-1.5">

          {/* Left: Chart + deploys */}
          <div className="col-span-3 flex flex-col gap-1.5">

            {/* Performance chart */}
            <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  {[
                    { label: "Impressions", color: COLORS.primary },
                    { label: "Clicks", color: COLORS.secondary },
                    { label: "Conversions", color: COLORS.tertiary },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-1 rounded-full" style={{ background: l.color }} />
                      <span className="text-xs text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-0.5 p-0.5 bg-secondary/30 rounded-xl">
                  {PERIOD_TABS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        period === p
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <InteractiveChart
                key={period}
                datasets={[
                  { data: pData.impressions, color: COLORS.primary, label: "Impressions" },
                  { data: pData.clicks, color: COLORS.secondary, label: "Clicks" },
                  { data: pData.conversions, color: COLORS.tertiary, label: "Conversions" },
                ]}
                labels={PERIOD_LABELS[period]}
              />
            </motion.div>

            {/* Recent deploys */}
            <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
              <p className="text-sm font-semibold mb-4">{t("recentDeploys")}</p>
              <div className="flex flex-col gap-1">
                {DEPLOYS.map((d) => {
                  const cfg = DEPLOY_CFG[d.status];
                  return (
                    <div key={d.commit} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors">
                      <span className="font-mono text-[11px] text-muted-foreground w-16 shrink-0">{d.commit}</span>
                      <span className="text-xs flex-1 truncate">{d.msg}</span>
                      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{d.time}</span>
                      <div className="flex items-center gap-1.5 w-20 shrink-0">
                        <cfg.Icon className={`w-3.5 h-3.5 ${cfg.text} ${d.status === "running" ? "animate-spin" : ""}`} />
                        <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div className="col-span-2 flex flex-col gap-1.5">

            {/* Open issues */}
            <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{t("openIssues")}</p>
                <SectionLink href={`/projects/${id}/issues`} label={t("viewAll")} />
              </div>
              <div className="flex flex-col gap-1.5">
                {ISSUES.map((issue) => {
                  const isCritical = issue.severity === "critical";
                  return (
                    <Link
                      key={issue.id}
                      href={`/projects/${id}/issues`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors"
                    >
                      <issue.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs flex-1 truncate">{issue.title}</p>
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: isCritical ? COLORS.negative : COLORS.secondary }}
                      />
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* Service status */}
            <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">{t("serviceStatus")}</p>
                <SectionLink href={`/projects/${id}/issues`} label="Details" />
              </div>
              <div className="flex flex-col gap-1.5">
                {SERVICES.map((svc) => {
                  const cfg = SERVICE_CFG[svc.status];
                  return (
                    <div key={svc.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors">
                      <svc.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-xs">{svc.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{svc.latency}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className="text-xs text-muted-foreground">{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Quick links */}
            <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
              <p className="text-sm font-semibold mb-3">Quick Links</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Calendar", href: `/projects/${id}/calendar`, icon: Clock },
                  { label: "Promotion", href: `/projects/${id}/promotion`, icon: Target },
                  { label: "Insights", href: `/projects/${id}/insights`, icon: Eye },
                  { label: "Issues", href: `/projects/${id}/issues`, icon: AlertTriangle },
                ].map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors group"
                  >
                    <link.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs">{link.label}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
