"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, MousePointer, Users, Target } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const COLORS = {
  primary: "#EFFF00",
  secondary: "#6B7D8F",
  tertiary: "#5A6B7B",
  positive: "#5FCC7D",
  negative: "#D97B78",
};

const TABS = ["Marketing", "Operations"] as const;
type Tab = typeof TABS[number];

/* ─── Bar chart ─── */
function BarChart({ data, labels, color, height = 140 }: { data: number[]; labels: string[]; color: string; height?: number }) {
  const max = Math.max(...data);
  const barW = 24;
  const gap = 8;
  const width = data.length * (barW + gap);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <svg viewBox={`0 0 ${width} ${height + 20}`} width="100%" className="block">
      {data.map((v, i) => {
        const barH = (v / max) * height;
        const x = i * (barW + gap);
        const isHover = hoverIdx === i;
        return (
          <g key={i} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} className="cursor-pointer">
            <motion.rect
              x={x} y={height - barH}
              width={barW} height={barH}
              rx={barW / 2}
              fill={color}
              fillOpacity={isHover ? 0.9 : 0.5}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.03, duration: 0.5, ease: EASE_OUT }}
              style={{ transformOrigin: `${x + barW / 2}px ${height}px` }}
            />
            {isHover && (
              <text x={x + barW / 2} y={height - barH - 8} textAnchor="middle" fontSize="10" fill={color} fontWeight="600">
                {v.toLocaleString()}
              </text>
            )}
            <text x={x + barW / 2} y={height + 14} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.3">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ─── Channel data ─── */
const CHANNELS = [
  { name: "Threads", impressions: "4.2K", clicks: "320", ctr: "7.6%", change: "+12%", up: true },
  { name: "X", impressions: "3.1K", clicks: "245", ctr: "7.9%", change: "+8%", up: true },
  { name: "Bluesky", impressions: "1.5K", clicks: "180", ctr: "12.0%", change: "+45%", up: true },
];

const WEEKLY_DATA = [820, 950, 1100, 870, 1350, 980, 1200];
const WEEKLY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const ISSUES_SUMMARY = [
  { label: "Security", count: 1, color: COLORS.negative },
  { label: "Performance", count: 2, color: COLORS.secondary },
  { label: "Deployment", count: 1, color: COLORS.tertiary },
];

export default function InsightsPage() {
  useParams<{ id: string }>();
  const t = useTranslations("insights");
  const tDash = useTranslations("dashboard");
  const [tab, setTab] = useState<Tab>("Marketing");

  const stats = [
    { label: tDash("impressions"), value: "12.4K", change: "+18%", up: true, icon: Eye },
    { label: tDash("clicks"), value: "1.2K", change: "+12%", up: true, icon: MousePointer },
    { label: tDash("newUsers"), value: "487", change: "+24%", up: true, icon: Users },
    { label: tDash("ctr"), value: "9.7%", change: "-1.2%", up: false, icon: Target },
  ];

  return (
    <div className="w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1.5">

        {/* Header + tabs */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-0.5 p-0.5 bg-card rounded-xl">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {tab === "Marketing" ? (
            <motion.div
              key="marketing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="flex flex-col gap-1.5"
            >
              {/* Stats */}
              <div className="grid grid-cols-4 gap-1.5">
                {stats.map(s => (
                  <div key={s.label} className="rounded-3xl bg-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                      <s.icon className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                    <p className="text-xs mt-1.5">
                      <span style={{ color: s.up ? COLORS.positive : COLORS.negative }} className="font-medium">{s.change}</span>
                      <span className="text-muted-foreground ml-1">vs last week</span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Chart + Channels */}
              <div className="grid grid-cols-5 gap-1.5">
                <div className="col-span-3 rounded-3xl bg-card p-5">
                  <p className="text-sm font-semibold mb-4">Weekly Performance</p>
                  <BarChart data={WEEKLY_DATA} labels={WEEKLY_LABELS} color={COLORS.primary} />
                </div>

                <div className="col-span-2 rounded-3xl bg-card p-5">
                  <p className="text-sm font-semibold mb-4">Channel Breakdown</p>
                  <div className="flex flex-col gap-1.5">
                    {CHANNELS.map(ch => (
                      <div key={ch.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/30 transition-colors">
                        <span className="text-xs font-medium w-16 shrink-0">{ch.name}</span>
                        <span className="text-xs text-muted-foreground flex-1 tabular-nums">{ch.impressions}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{ch.clicks}</span>
                        <span className="text-xs font-medium tabular-nums w-12 text-right">{ch.ctr}</span>
                        <span className="text-xs font-medium w-10 text-right" style={{ color: ch.up ? COLORS.positive : COLORS.negative }}>
                          {ch.change}
                        </span>
                      </div>
                    ))}
                    {/* Column headers */}
                    <div className="flex items-center gap-3 px-3 pt-2 text-[10px] text-muted-foreground/50">
                      <span className="w-16 shrink-0">Channel</span>
                      <span className="flex-1">Views</span>
                      <span>Clicks</span>
                      <span className="w-12 text-right">CTR</span>
                      <span className="w-10 text-right">Change</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="flex flex-col gap-1.5"
            >
              {/* Issue breakdown */}
              <div className="grid grid-cols-3 gap-1.5">
                {ISSUES_SUMMARY.map(cat => (
                  <div key={cat.label} className="rounded-3xl bg-card p-5">
                    <p className="text-xs text-muted-foreground mb-2">{cat.label}</p>
                    <p className="text-3xl font-bold tabular-nums" style={{ color: cat.color }}>{cat.count}</p>
                  </div>
                ))}
              </div>

              {/* Donut chart placeholder + details */}
              <div className="grid grid-cols-2 gap-1.5">
                <div className="rounded-3xl bg-card p-5 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold mb-4">Issue Distribution</p>
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {/* Donut arcs */}
                    {(() => {
                      const total = ISSUES_SUMMARY.reduce((a, b) => a + b.count, 0);
                      let cumAngle = -90;
                      return ISSUES_SUMMARY.map((cat, i) => {
                        const angle = (cat.count / total) * 360;
                        const startRad = (cumAngle * Math.PI) / 180;
                        const endRad = ((cumAngle + angle) * Math.PI) / 180;
                        const r = 60;
                        const cx = 80, cy = 80;
                        const x1 = cx + r * Math.cos(startRad);
                        const y1 = cy + r * Math.sin(startRad);
                        const x2 = cx + r * Math.cos(endRad);
                        const y2 = cy + r * Math.sin(endRad);
                        const large = angle > 180 ? 1 : 0;
                        cumAngle += angle;
                        return (
                          <motion.path
                            key={i}
                            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                            fill={cat.color}
                            fillOpacity={0.7}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: i * 0.1, duration: 0.4, ease: EASE_OUT }}
                            style={{ transformOrigin: "80px 80px" }}
                          />
                        );
                      });
                    })()}
                    {/* Center hole */}
                    <circle cx="80" cy="80" r="35" fill="var(--card)" />
                    <text x="80" y="76" textAnchor="middle" fontSize="20" fontWeight="700" fill="currentColor">
                      {ISSUES_SUMMARY.reduce((a, b) => a + b.count, 0)}
                    </text>
                    <text x="80" y="92" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.4">
                      total
                    </text>
                  </svg>
                  <div className="flex gap-4 mt-4">
                    {ISSUES_SUMMARY.map(cat => (
                      <div key={cat.label} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        <span className="text-xs text-muted-foreground">{cat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl bg-card p-5">
                  <p className="text-sm font-semibold mb-4">Recent Activity</p>
                  <div className="flex flex-col gap-2">
                    {[
                      { text: "SSL cert expiring soon", time: "2h ago", color: COLORS.negative },
                      { text: "API latency resolved", time: "6h ago", color: COLORS.positive },
                      { text: "Deploy failed: main@a3f2d1c", time: "12h ago", color: COLORS.negative },
                      { text: "Dependency update complete", time: "1d ago", color: COLORS.positive },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-secondary/30 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: item.color }} />
                        <span className="text-xs flex-1">{item.text}</span>
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{item.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
