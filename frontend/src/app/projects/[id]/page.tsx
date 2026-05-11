"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Server,
  Shield,
  Zap,
  Database,
  Globe,
  TrendingUp,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT_EXPO },
  },
};

// ─── 데이터 ────────────────────────────────────────────────

const WEEK_EVENTS: Record<string, { title: string; type: "promotion" | "deployment" | "marketing" | "meeting" | "issue" }[]> = {
  "2026-05-10": [],
  "2026-05-11": [{ title: "팀 주간 회의", type: "meeting" }],
  "2026-05-12": [{ title: "Product Hunt 런칭", type: "promotion" }],
  "2026-05-13": [],
  "2026-05-14": [
    { title: "v2.0 배포", type: "deployment" },
    { title: "배포 후 모니터링", type: "meeting" },
  ],
  "2026-05-15": [{ title: "SSL 인증서 만료", type: "issue" }],
  "2026-05-16": [],
};

const TYPE_COLOR: Record<string, string> = {
  promotion: "bg-blue-500",
  deployment: "bg-violet-500",
  marketing: "bg-pink-500",
  meeting: "bg-emerald-500",
  issue: "bg-red-500",
  other: "bg-amber-500",
};

const TYPE_BADGE: Record<string, string> = {
  promotion: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  deployment: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  marketing: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  meeting: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  issue: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const SERVICES = [
  { name: "API 서버", icon: Server, status: "degraded" as const, latency: "2.3s", uptime: "99.1%" },
  { name: "데이터베이스", icon: Database, status: "healthy" as const, latency: "12ms", uptime: "99.9%" },
  { name: "CDN", icon: Globe, status: "healthy" as const, latency: "48ms", uptime: "100%" },
  { name: "인증", icon: Shield, status: "healthy" as const, latency: "130ms", uptime: "99.8%" },
];

const SERVICE_CFG = {
  healthy: { dot: "bg-emerald-500", label: "정상", text: "text-emerald-600 dark:text-emerald-400" },
  degraded: { dot: "bg-amber-500 animate-pulse", label: "저하", text: "text-amber-600 dark:text-amber-400" },
  down: { dot: "bg-red-500 animate-pulse", label: "중단", text: "text-red-600 dark:text-red-400" },
};

const DEPLOYS = [
  { commit: "f7a3b2e", msg: "feat: 결제 플로우 UX 개선", time: "14분 전", status: "running" as const },
  { commit: "c9e1d4a", msg: "fix: 세션 만료 버그 수정", time: "3시간 전", status: "success" as const },
  { commit: "a3f2d1c", msg: "refactor: 이미지 최적화 파이프라인", time: "12시간 전", status: "failed" as const },
  { commit: "b8c5f9d", msg: "chore: 의존성 업데이트", time: "1일 전", status: "success" as const },
  { commit: "e2a7c3f", msg: "feat: 대시보드 차트 추가", time: "2일 전", status: "success" as const },
];

const DEPLOY_CFG = {
  success: { color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", label: "성공", Icon: CheckCircle2 },
  failed: { color: "bg-red-500", text: "text-red-600 dark:text-red-400", label: "실패", Icon: XCircle },
  running: { color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400", label: "배포중", Icon: RefreshCw },
  cancelled: { color: "bg-muted", text: "text-muted-foreground", label: "취소", Icon: XCircle },
};

const ISSUES = [
  { id: "1", title: "SSL 인증서 만료 예정 (5/15)", severity: "critical" as const, icon: Shield, status: "open" as const, category: "보안" },
  { id: "2", title: "API 응답 시간 2.3s 초과", severity: "warning" as const, icon: Zap, status: "investigating" as const, category: "성능" },
  { id: "4", title: "Error rate 증가: /api/checkout", severity: "critical" as const, icon: AlertTriangle, status: "open" as const, category: "에러" },
];

const PROMO_METRICS = [
  { label: "노출", value: 1200, max: 2000, color: "bg-blue-500", stroke: "#3b82f6", weekly: [820, 950, 1100, 870, 1350, 980, 1200] },
  { label: "클릭", value: 340, max: 2000, color: "bg-violet-500", stroke: "#8b5cf6", weekly: [210, 280, 310, 250, 390, 300, 340] },
  { label: "전환", value: 96, max: 2000, color: "bg-emerald-500", stroke: "#10b981", weekly: [58, 72, 85, 65, 110, 88, 96] },
];

const PROMO_WEEKLY_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

// ─── 헬퍼 ────────────────────────────────────────────────

const DAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

function getWeekDates(baseDate: Date) {
  const dow = baseDate.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - dow + i);
    return d;
  });
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── 컴포넌트 ────────────────────────────────────────────


function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <ChevronRight className="w-3 h-3" />
    </Link>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const id = params.id as string;

  const today = new Date(2026, 4, 10); // 2026-05-10 고정 (mock)
  const weekDates = getWeekDates(today);
  const todayStr = toDateStr(today);

  const openIssues = ISSUES;
  const deploySuccessRate = Math.round(
    (DEPLOYS.filter((d) => d.status === "success").length /
      DEPLOYS.filter((d) => d.status !== "running").length) *
      100
  );

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-8">

        {/* ── 헤더 ── */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="h-eyebrow mb-1">DASHBOARD</p>
            <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {openIssues.filter((i) => i.severity === "critical").length > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                Critical {openIssues.filter((i) => i.severity === "critical").length}건
              </span>
            )}
          </div>
        </motion.div>

        {/* ── 상단 요약 스탯 ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-0 divide-x divide-border rounded-xl border border-border overflow-hidden">
          {[
            { label: "이번 주 일정", value: Object.values(WEEK_EVENTS).flat().length, sub: "건", href: `/${id}/calendar` },
            { label: "홍보 콘텐츠", value: 24, sub: "개", href: `/${id}/promotion` },
            { label: "미해결 이슈", value: openIssues.length, sub: "건", href: `/${id}/issues` },
            { label: "배포 성공률", value: `${deploySuccessRate}%`, sub: "최근 5회", href: `/${id}/issues` },
          ].map((s) => (
            <Link key={s.label} href={`/projects${s.href}`} className="flex flex-col items-center py-5 hover:bg-muted/40 transition-colors">
              <p className="text-2xl font-bold tracking-tight">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </Link>
          ))}
        </motion.div>

        {/* ── 주간 캘린더 ── */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">이번 주 일정</h2>
            <SectionLink href={`/projects/${id}/calendar`} label="캘린더 전체" />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 border-b border-border bg-muted/20">
              {weekDates.map((d, i) => (
                <div
                  key={i}
                  className={`text-center py-2 text-xs font-medium ${
                    i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                  }`}
                >
                  {DAYS_KO[d.getDay()]}
                </div>
              ))}
            </div>

            {/* 날짜 + 이벤트 */}
            <div className="grid grid-cols-7 divide-x divide-border">
              {weekDates.map((d, i) => {
                const ds = toDateStr(d);
                const evts = WEEK_EVENTS[ds] ?? [];
                const isToday = ds === todayStr;

                return (
                  <Link
                    key={i}
                    href={`/projects/${id}/calendar`}
                    className="flex flex-col gap-1.5 p-2.5 min-h-[96px] hover:bg-muted/30 transition-colors"
                  >
                    <span
                      className={`text-xs font-semibold self-start inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : i === 0
                            ? "text-red-400"
                            : i === 6
                              ? "text-blue-400"
                              : "text-foreground/70"
                      }`}
                    >
                      {d.getDate()}
                    </span>

                    <div className="flex flex-col gap-1">
                      {evts.slice(0, 2).map((evt, ei) => (
                        <div key={ei} className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_COLOR[evt.type]}`} />
                          <span className="text-[10px] text-muted-foreground truncate leading-tight">
                            {evt.title}
                          </span>
                        </div>
                      ))}
                      {evts.length > 2 && (
                        <span className="text-[10px] text-muted-foreground pl-2.5">+{evts.length - 2}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* 이벤트 범례 */}
            <div className="flex items-center gap-4 px-3 py-2 border-t border-border bg-muted/10">
              {Object.entries(WEEK_EVENTS)
                .flatMap(([, evts]) => evts)
                .reduce<{ type: string; title: string }[]>((acc, e) => {
                  if (!acc.find((x) => x.type === e.type)) acc.push(e);
                  return acc;
                }, [])
                .map((e) => (
                  <div key={e.type} className="flex items-center gap-1">
                    <div className={`w-1.5 h-1.5 rounded-full ${TYPE_COLOR[e.type]}`} />
                    <span className={`text-[10px] px-1 rounded ${TYPE_BADGE[e.type]}`}>
                      {e.type === "promotion" ? "홍보" : e.type === "deployment" ? "배포" : e.type === "meeting" ? "미팅" : e.type === "issue" ? "이슈" : "기타"}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </motion.div>

        {/* ── 홍보 성과 ── */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">홍보 성과</h2>
            <SectionLink href={`/projects/${id}/promotion`} label="상세 보기" />
          </div>

          <div className="rounded-xl border border-border bg-muted/10 px-4 pt-4 pb-3">
            {/* 범례 + 현재값 */}
            <div className="flex items-center gap-6 mb-4">
              {PROMO_METRICS.map((m) => (
                <div key={m.label} className="flex items-center gap-2">
                  <div className="w-4 h-0.5 rounded-full" style={{ background: m.stroke }} />
                  <span className="text-xs text-muted-foreground">{m.label}</span>
                  <span className="text-xs font-semibold tabular-nums">{m.value.toLocaleString()}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-xs text-muted-foreground">전환율</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">28.3%</span>
              </div>
            </div>

            {/* 라인 차트 */}
            <svg
              viewBox="0 0 560 180"
              width="100%"
              className="block w-full"
            >
              {/* 수평 그리드 */}
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="16" x2="544"
                  y1={12 + i * 30} y2={12 + i * 30}
                  stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
                />
              ))}

              {/* 각 지표 라인 + 영역 채우기 */}
              {PROMO_METRICS.map((m) => {
                const max = Math.max(...m.weekly);
                const min = Math.min(...m.weekly);
                const range = max - min || 1;
                const n = m.weekly.length;
                const chartTop = 12, chartBottom = 152, chartH = chartBottom - chartTop;

                const coords = m.weekly.map((v, i) => ({
                  x: 16 + (i / (n - 1)) * 528,
                  y: chartTop + (1 - (v - min) / range) * chartH,
                }));

                const linePts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
                const areaPts = [
                  ...coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
                  `544,${chartBottom}`,
                  `16,${chartBottom}`,
                ].join(" ");

                const last = coords[coords.length - 1];

                return (
                  <g key={m.label}>
                    <polygon points={areaPts} fill={m.stroke} fillOpacity="0.07" />
                    <polyline
                      points={linePts}
                      fill="none"
                      stroke={m.stroke}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="3.5" fill={m.stroke} />
                  </g>
                );
              })}

              {/* X축 요일 레이블 */}
              {PROMO_WEEKLY_DAYS.map((day, i) => (
                <text
                  key={day}
                  x={16 + (i / (PROMO_WEEKLY_DAYS.length - 1)) * 528}
                  y="172"
                  textAnchor="middle"
                  fontSize="11"
                  fill="currentColor"
                  fillOpacity="0.35"
                >
                  {day}
                </text>
              ))}
            </svg>
          </div>
        </motion.div>

        {/* ── 인사이트 ── */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">인사이트</h2>
            <SectionLink href={`/projects/${id}/insights`} label="전체 보기" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "DAU", value: "1,240", change: "+8.2%", up: true },
              { label: "리텐션 (D7)", value: "42%", change: "+3.1%p", up: true },
              { label: "평균 세션", value: "4m 12s", change: "-0.3%", up: false },
              { label: "신규 가입", value: "87", change: "+14.5%", up: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-1 px-3 py-3 rounded-lg border border-border bg-muted/10"
              >
                <span className="text-[11px] text-muted-foreground">{item.label}</span>
                <span className="text-lg font-bold tabular-nums">{item.value}</span>
                <div className={`flex items-center gap-0.5 ${item.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
                  <TrendingUp className={`w-3 h-3 ${item.up ? "" : "rotate-180"}`} />
                  <span className="text-[10px] tabular-nums">{item.change}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── 서비스 상태 + 배포 로그 ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">

          {/* 서비스 상태 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">서비스 상태</h2>
              <SectionLink href={`/projects/${id}/issues`} label="이슈 전체" />
            </div>
            <div className="flex flex-col gap-2">
              {SERVICES.map((svc) => {
                const cfg = SERVICE_CFG[svc.status];
                return (
                  <div
                    key={svc.name}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
                  >
                    <svc.icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 text-sm">{svc.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{svc.latency}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 배포 로그 + 미해결 이슈 */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">최근 배포</h2>
              <SectionLink href={`/projects/${id}/issues`} label="전체 로그" />
            </div>

            <div className="flex gap-1 h-1.5">
              {[...DEPLOYS].reverse().map((d, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-full ${DEPLOY_CFG[d.status].color} ${d.status === "running" ? "animate-pulse" : ""}`}
                />
              ))}
            </div>

            <div className="flex flex-col divide-y divide-border">
              {DEPLOYS.slice(0, 4).map((d) => {
                const cfg = DEPLOY_CFG[d.status];
                return (
                  <div key={d.commit} className="flex items-center gap-2.5 py-2.5 hover:bg-muted/30 -mx-1 px-1 rounded transition-colors">
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${cfg.color.replace("bg-", "bg-").replace("500", "500/10")} ${cfg.text} shrink-0`}>
                      {d.commit}
                    </span>
                    <span className="flex-1 text-xs truncate">{d.msg}</span>
                    <cfg.Icon className={`w-3 h-3 ${cfg.text} shrink-0 ${d.status === "running" ? "animate-spin" : ""}`} />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <p className="text-xs font-semibold text-muted-foreground">미해결 이슈</p>
              {openIssues.slice(0, 2).map((issue) => {
                const StatusIcon = issue.status === "open" ? XCircle : Clock;
                return (
                  <Link
                    key={issue.id}
                    href={`/projects/${id}/issues`}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border bg-muted/10 hover:bg-muted/30 transition-colors"
                  >
                    <issue.icon className="w-3 h-3 text-muted-foreground shrink-0" />
                    <p className="flex-1 text-xs truncate">{issue.title}</p>
                    <StatusIcon
                      className={`w-3 h-3 shrink-0 ${issue.status === "open" ? "text-red-500" : "text-amber-500"}`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>

        </motion.div>
      </motion.div>
    </div>
  );
}
