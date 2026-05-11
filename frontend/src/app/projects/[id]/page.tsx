"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Target,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  Zap,
  AlertTriangle,
  Server,
  Database,
  Globe,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProject } from "@/hooks/use-projects";

// ─── 상수 ────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

// ─── 데이터 ────────────────────────────────────────────────

const PROMO_METRICS = [
  { label: "노출", value: 1200, max: 2000, stroke: "#6366f1", weekly: [820, 950, 1100, 870, 1350, 980, 1200] },
  { label: "클릭", value: 340, max: 2000, stroke: "#8b5cf6", weekly: [210, 280, 310, 250, 390, 300, 340] },
  { label: "전환", value: 96, max: 2000, stroke: "#10b981", weekly: [58, 72, 85, 65, 110, 88, 96] },
];

const WEEKLY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const PERIOD_TABS = ["7일", "30일", "6개월", "12개월"] as const;
type Period = typeof PERIOD_TABS[number];

const PERIOD_DATA: Record<Period, number[][]> = {
  "7일":   [[820,950,1100,870,1350,980,1200], [210,280,310,250,390,300,340], [58,72,85,65,110,88,96]],
  "30일":  [[600,800,950,700,1100,900,1200,800,950,1050,870,1000,1200,1100,950,1300,1000,1150,1200,1050,980,1350,1100,1200,950,1000,1250,980,1200,1300],
            [150,200,250,180,300,240,340,200,250,280,220,270,340,300,250,360,280,310,340,290,260,390,300,340,260,270,350,260,340,370],
            [40,55,70,48,85,65,96,55,68,78,60,74,96,85,68,100,78,88,96,82,72,110,85,96,72,75,98,72,96,105]],
  "6개월": [[9000,10500,11200,9800,12000,10800],[2200,2700,3100,2600,3500,3200],[600,750,880,720,980,900]],
  "12개월":[[8000,9000,10500,11200,9800,12000,10800,9200,10500,11800,10200,12500],
            [1800,2200,2700,3100,2600,3500,3200,2800,3000,3400,2900,3700],
            [500,600,750,880,720,980,900,750,860,960,820,1050]],
};

const PERIOD_X_LABELS: Record<Period, string[]> = {
  "7일":   WEEKLY_LABELS,
  "30일":  ["1","5","10","15","20","25","30"],
  "6개월": ["11월","12월","1월","2월","3월","4월"],
  "12개월":["5월","6월","7월","8월","9월","10월","11월","12월","1월","2월","3월","4월"],
};

const SERVICES = [
  { name: "API 서버", icon: Server, status: "degraded" as const, latency: "2.3s" },
  { name: "데이터베이스", icon: Database, status: "healthy" as const, latency: "12ms" },
  { name: "CDN", icon: Globe, status: "healthy" as const, latency: "48ms" },
  { name: "인증", icon: Shield, status: "healthy" as const, latency: "130ms" },
];

const SERVICE_CFG = {
  healthy:  { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "정상" },
  degraded: { dot: "bg-amber-500 animate-pulse", text: "text-amber-600 dark:text-amber-400", label: "저하" },
  down:     { dot: "bg-red-500 animate-pulse", text: "text-red-600 dark:text-red-400", label: "중단" },
};

const DEPLOYS = [
  { commit: "f7a3b2e", msg: "feat: 결제 플로우 UX 개선", time: "14분 전", status: "running" as const },
  { commit: "c9e1d4a", msg: "fix: 세션 만료 버그 수정", time: "3시간 전", status: "success" as const },
  { commit: "a3f2d1c", msg: "refactor: 이미지 최적화", time: "12시간 전", status: "failed" as const },
  { commit: "b8c5f9d", msg: "chore: 의존성 업데이트", time: "1일 전", status: "success" as const },
  { commit: "e2a7c3f", msg: "feat: 대시보드 차트 추가", time: "2일 전", status: "success" as const },
];

const DEPLOY_CFG = {
  success:   { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "성공",  Icon: CheckCircle2 },
  failed:    { bar: "bg-red-500",     text: "text-red-600 dark:text-red-400",         label: "실패",  Icon: XCircle },
  running:   { bar: "bg-blue-500",    text: "text-blue-600 dark:text-blue-400",       label: "배포중", Icon: RefreshCw },
  cancelled: { bar: "bg-muted",       text: "text-muted-foreground",                 label: "취소",  Icon: XCircle },
};

const ISSUES = [
  { id: "1", title: "SSL 인증서 만료 예정 (5/15)", severity: "critical" as const, icon: Shield,        status: "open" as const,          category: "보안" },
  { id: "2", title: "API 응답 시간 2.3s 초과",      severity: "warning" as const,  icon: Zap,           status: "investigating" as const, category: "성능" },
  { id: "4", title: "Error rate 증가 /api/checkout",severity: "critical" as const, icon: AlertTriangle, status: "open" as const,          category: "에러" },
];

const WEEK_EVENTS: Record<string, { title: string; color: string }[]> = {
  "2026-05-10": [],
  "2026-05-11": [{ title: "팀 주간 회의", color: "bg-emerald-500" }],
  "2026-05-12": [{ title: "Product Hunt 런칭", color: "bg-blue-500" }],
  "2026-05-13": [],
  "2026-05-14": [{ title: "v2.0 배포", color: "bg-violet-500" }, { title: "배포 후 모니터링", color: "bg-emerald-500" }],
  "2026-05-15": [{ title: "SSL 인증서 만료", color: "bg-red-500" }],
  "2026-05-16": [],
};

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// ─── 헬퍼 ────────────────────────────────────────────────

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {label}<ChevronRight className="w-3 h-3" />
    </Link>
  );
}

// ─── 메인 ────────────────────────────────────────────────

export default function DashboardPage() {
  const params = useParams();
  const id = params.id as string;
  const { project } = useProject(id);
  const [period, setPeriod] = useState<Period>("7일");

  const today = new Date(2026, 4, 10);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - today.getDay() + i); return d;
  });

  const deploySuccessRate = Math.round(
    DEPLOYS.filter(d => d.status === "success").length /
    DEPLOYS.filter(d => d.status !== "running").length * 100
  );

  // 차트 계산
  const periodData = PERIOD_DATA[period];
  const xLabels = PERIOD_X_LABELS[period];
  const n = periodData[0].length;

  const chartLines = PROMO_METRICS.map((m, mi) => {
    const data = periodData[mi];
    const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
    const coords = data.map((v, i) => ({
      x: 16 + (i / (n - 1)) * 528,
      y: 12 + (1 - (v - min) / range) * 140,
    }));
    const linePts = coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const areaPts = [
      ...coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
      `544,152`, `16,152`,
    ].join(" ");
    const last = coords[coords.length - 1];
    return { ...m, linePts, areaPts, last };
  });

  // x축 레이블 위치 (균등 분배)
  const xLabelPositions = xLabels.map((label, i) =>
    ({ label, x: 16 + (i / (xLabels.length - 1)) * 528 })
  );

  return (
    <div className="px-10 py-8 w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">

        {/* ── 헤더 ── */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Dashboard</p>
            <h1 className="text-2xl font-bold tracking-tight">{project?.name ?? "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-2">
            {ISSUES.filter(i => i.severity === "critical").length > 0 && (
              <Link href={`/projects/${id}/issues`} className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-3 py-1.5 rounded-full hover:bg-red-500/20 transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                Critical {ISSUES.filter(i => i.severity === "critical").length}건
              </Link>
            )}
          </div>
        </motion.div>

        {/* ── 상단 스탯 카드 4개 ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
          {[
            {
              label: "총 노출", value: "9.4K", change: "+18%", up: true,
              icon: Eye, bg: "bg-indigo-50 dark:bg-indigo-950/30", accent: "text-indigo-600 dark:text-indigo-400",
              sparkData: PROMO_METRICS[0].weekly, stroke: "#6366f1",
              href: `/projects/${id}/insights`,
            },
            {
              label: "총 클릭", value: "987", change: "+12%", up: true,
              icon: MousePointer, bg: "bg-violet-50 dark:bg-violet-950/30", accent: "text-violet-600 dark:text-violet-400",
              sparkData: PROMO_METRICS[1].weekly, stroke: "#8b5cf6",
              href: `/projects/${id}/insights`,
            },
            {
              label: "전환율", value: "28.3%", change: "-2%", up: false,
              icon: Target, bg: "bg-rose-50 dark:bg-rose-950/30", accent: "text-rose-600 dark:text-rose-400",
              sparkData: [22, 25, 30, 26, 28, 27, 28], stroke: "#f43f5e",
              href: `/projects/${id}/promotion`,
            },
            {
              label: "신규 가입", value: "87", change: "+14.5%", up: true,
              icon: Users, bg: "bg-emerald-50 dark:bg-emerald-950/30", accent: "text-emerald-600 dark:text-emerald-400",
              sparkData: [50, 60, 72, 55, 80, 70, 87], stroke: "#10b981",
              href: `/projects/${id}/insights`,
            },
          ].map((card) => {
            const max = Math.max(...card.sparkData), min = Math.min(...card.sparkData), range = max - min || 1;
            const pts = card.sparkData.map((v, i) => {
              const x = (i / (card.sparkData.length - 1)) * 80;
              const y = 24 - ((v - min) / range) * 20;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            }).join(" ");

            return (
              <Link key={card.label} href={card.href} className={`rounded-2xl p-5 ${card.bg} hover:brightness-95 dark:hover:brightness-110 transition-all`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{card.label}</p>
                    <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  </div>
                  <card.icon className={`w-4 h-4 mt-1 ${card.accent}`} />
                </div>
                <div className="flex items-end justify-between">
                  <div className="flex items-center gap-1">
                    {card.up
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : <TrendingDown className="w-3 h-3 text-red-500" />
                    }
                    <span className={`text-xs font-semibold ${card.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {card.change}
                    </span>
                    <span className="text-xs text-muted-foreground">vs 지난주</span>
                  </div>
                  <svg width="80" height="28" viewBox="0 0 80 28" className="shrink-0 overflow-visible">
                    <polyline points={pts} fill="none" stroke={card.stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </motion.div>

        {/* ── 메인 그리드: 좌(차트+테이블) / 우(캘린더+서비스+이슈) ── */}
        <div className="grid grid-cols-5 gap-4">

          {/* ── 좌측 영역 ── */}
          <div className="col-span-3 flex flex-col gap-4">

            {/* 홍보 성과 라인 차트 */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">홍보 성과</p>
                  <div className="flex items-center gap-4 mt-2">
                    {PROMO_METRICS.map(m => (
                      <div key={m.label} className="flex items-center gap-1.5">
                        <div className="w-3 h-0.5 rounded-full" style={{ background: m.stroke }} />
                        <span className="text-xs text-muted-foreground">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                  {PERIOD_TABS.map(p => (
                    <button
                      key={p}
                      onClick={() => setPeriod(p)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        period === p ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <svg viewBox="0 0 560 172" width="100%" className="block w-full">
                {[0,1,2,3,4].map(i => (
                  <line key={i} x1="16" x2="544" y1={12 + i * 35} y2={12 + i * 35}
                    stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
                ))}
                {chartLines.map(m => (
                  <g key={m.label}>
                    <polygon points={m.areaPts} fill={m.stroke} fillOpacity="0.06" />
                    <polyline points={m.linePts} fill="none" stroke={m.stroke} strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={m.last.x.toFixed(1)} cy={m.last.y.toFixed(1)} r="3.5" fill={m.stroke} />
                  </g>
                ))}
                {xLabelPositions.map(({ label, x }) => (
                  <text key={label} x={x} y="168" textAnchor="middle" fontSize="10"
                    fill="currentColor" fillOpacity="0.35">{label}</text>
                ))}
              </svg>
            </motion.div>

            {/* 최근 배포 테이블 */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">최근 배포</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    성공률 <span className={deploySuccessRate >= 80 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-red-500 font-semibold"}>{deploySuccessRate}%</span>
                  </p>
                </div>
                <div className="flex gap-1 h-1.5 w-24">
                  {[...DEPLOYS].reverse().map((d, i) => (
                    <div key={i} className={`flex-1 rounded-full ${DEPLOY_CFG[d.status].bar} ${d.status === "running" ? "animate-pulse" : ""}`} />
                  ))}
                </div>
              </div>

              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-border">
                    {["커밋", "메시지", "시간", "상태"].map(h => (
                      <th key={h} className="pb-3 text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DEPLOYS.map(d => {
                    const cfg = DEPLOY_CFG[d.status];
                    return (
                      <tr key={d.commit} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3">
                          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${cfg.bar.replace("bg-","bg-").replace("500","500/10")} ${cfg.text}`}>
                            {d.commit}
                          </span>
                        </td>
                        <td className="py-3 text-xs text-foreground max-w-[180px] truncate">{d.msg}</td>
                        <td className="py-3 text-xs text-muted-foreground whitespace-nowrap">{d.time}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            <cfg.Icon className={`w-3.5 h-3.5 ${cfg.text} ${d.status === "running" ? "animate-spin" : ""}`} />
                            <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </motion.div>
          </div>

          {/* ── 우측 사이드바 ── */}
          <div className="col-span-2 flex flex-col gap-4">

            {/* 이번 주 캘린더 */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">이번 주</p>
                <SectionLink href={`/projects/${id}/calendar`} label="캘린더" />
              </div>
              <div className="grid grid-cols-7 gap-1">
                {weekDates.map((d, i) => {
                  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                  const evts = WEEK_EVENTS[ds] ?? [];
                  const isToday = ds === todayStr;
                  return (
                    <Link key={i} href={`/projects/${id}/calendar`} className="flex flex-col items-center gap-1 hover:bg-muted/30 rounded-xl p-1.5 transition-colors">
                      <span className="text-[10px] text-muted-foreground">{WEEK_DAYS[d.getDay()]}</span>
                      <span className={`text-xs font-semibold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground/70"
                      }`}>{d.getDate()}</span>
                      <div className="flex flex-col gap-0.5 w-full">
                        {evts.slice(0,2).map((e, ei) => (
                          <div key={ei} className={`h-1 rounded-full ${e.color} opacity-80`} />
                        ))}
                        {evts.length === 0 && <div className="h-1" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {/* 이번 주 이벤트 목록 */}
              <div className="mt-3 flex flex-col gap-1.5">
                {Object.entries(WEEK_EVENTS).flatMap(([, evts]) => evts).slice(0, 3).map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full ${e.color} shrink-0`} />
                    <span className="text-muted-foreground truncate">{e.title}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 미해결 이슈 */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">미해결 이슈</p>
                <SectionLink href={`/projects/${id}/issues`} label="전체" />
              </div>
              <div className="flex flex-col gap-2">
                {ISSUES.map(issue => {
                  const StatusIcon = issue.status === "open" ? XCircle : Clock;
                  return (
                    <Link key={issue.id} href={`/projects/${id}/issues`}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/20 hover:bg-muted/50 transition-colors"
                    >
                      <issue.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{issue.title}</p>
                        <span className={`text-[10px] font-medium ${
                          issue.severity === "critical" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                        }`}>{issue.category}</span>
                      </div>
                      <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${issue.status === "open" ? "text-red-500" : "text-amber-500"}`} />
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* 서비스 상태 */}
            <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">서비스 상태</p>
                <SectionLink href={`/projects/${id}/issues`} label="상세" />
              </div>
              <div className="flex flex-col gap-2">
                {SERVICES.map(svc => {
                  const cfg = SERVICE_CFG[svc.status];
                  return (
                    <div key={svc.name} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/20">
                      <svc.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 text-xs">{svc.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{svc.latency}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}
