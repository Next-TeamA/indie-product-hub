"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  ChevronRight,
  Eye,
  MousePointer,
  Target,
  Users,
  BarChart3,
  Megaphone,
  AlertTriangle,
  Calendar as CalendarIcon,
  TrendingUp,
  ArrowUpRight,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── 데이터 정의 ──────────────────────────────────────────

const MOCK_PROMO_STATS = [
  {
    id: "impressions",
    label: "총 노출",
    value: "9.4K",
    change: "+18%",
    up: true,
    data: [30, 45, 35, 60, 85, 70, 90],
    color: "bg-blue-400/30",
    text: "text-blue-600",
  },
  {
    id: "clicks",
    label: "총 클릭",
    value: "987",
    change: "+12%",
    up: true,
    data: [20, 35, 40, 50, 75, 60, 80],
    color: "bg-indigo-400/30",
    text: "text-indigo-600",
  },
  {
    id: "conversion",
    label: "전환율",
    value: "28.3%",
    change: "-2%",
    up: false,
    data: [10, 25, 20, 45, 60, 55, 70],
    color: "bg-rose-400/30",
    text: "text-rose-600",
  },
  {
    id: "signups",
    label: "신규 가입",
    value: "87",
    change: "+14.5%",
    up: true,
    data: [5, 15, 30, 40, 55, 45, 65],
    color: "bg-emerald-400/30",
    text: "text-emerald-600",
  },
];

const MOCK_ISSUES = [
  {
    id: "1",
    title: "SSL 인증서 만료 예정 (5/15)",
    severity: "critical",
    category: "보안",
    icon: Shield,
    time: "2시간 전",
  },
  {
    id: "2",
    title: "API 응답 시간 2.3s 초과",
    severity: "warning",
    category: "성능",
    icon: Zap,
    time: "6시간 전",
  },
];

// ─── 서브 컴포넌트 ─────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-[22px] font-bold text-slate-800 tracking-tight">
        {title}
      </h2>
      <Link
        href={href}
        className="group flex items-center gap-1 text-[12px] font-bold text-slate-400 hover:text-slate-900 transition-all"
      >
        상세보기{" "}
        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}

// ─── 메인 대시보드 ─────────────────────────────────────────

export default function DashboardPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeMetric, setActiveMetric] = useState("impressions");

  const currentMetric = MOCK_PROMO_STATS.find((m) => m.id === activeMetric)!;

  return (
    <div className="px-10 py-10 w-full min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-6xl mx-auto space-y-12"
      >
        {/* 헤더 */}
        <div className="flex items-end justify-between border-b border-slate-50 pb-6">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-800">
            TaskFlow{" "}
            <span className="text-slate-300 font-normal ml-2 text-[20px]">
              Dashboard
            </span>
          </h1>
          <div className="flex items-center gap-2 text-[12px] font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            2 Critical Issues
          </div>
        </div>

        {/* [섹션 1] 인사이트 */}
        <section className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
          <SectionHeader title="인사이트" href={`/projects/${id}/insights`} />
          <div className="grid grid-cols-2 gap-8">
            <div className="flex gap-5 items-start">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mb-1.5">
                  Marketing Summary
                </p>
                <p className="text-[15px] font-bold text-slate-800 mb-2">
                  Mastodon 채널 강세
                </p>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  {" "}
                  Mastodon 채널의 CTR이 전주 대비 28% 상승했습니다. 기술적 심화
                  포스팅의 반응이 매우 좋습니다.
                </p>
              </div>
            </div>
            <div className="flex gap-5 items-start">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5">
                  Operations Summary
                </p>
                <p className="text-[15px] font-bold text-slate-800 mb-2">
                  결제 퍼널 개선
                </p>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  최근 배포된 v2.0 UX 개선 이후 결제 페이지 이탈률이 5% 감소하는
                  긍정적인 지표가 확인됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* [섹션 2] 홍보 (연한 파스텔 톤 적용) */}
        <section className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
          <SectionHeader title="홍보" href={`/projects/${id}/promotion`} />

          <div className="grid grid-cols-12 gap-10">
            {/* 좌측: 연해진 지표 탭 & 차트 */}
            <div className="col-span-8 space-y-8">
              <div className="grid grid-cols-4 gap-3">
                {MOCK_PROMO_STATS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMetric(m.id)}
                    className={cn(
                      "p-4 rounded-[20px] border transition-all text-left",
                      activeMetric === m.id
                        ? "bg-slate-50 border-slate-200 shadow-sm"
                        : "bg-white border-slate-100 hover:bg-slate-50",
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase mb-2 text-slate-400">
                      {m.label}
                    </p>
                    <p
                      className={cn(
                        "text-[18px] font-bold leading-none",
                        activeMetric === m.id
                          ? "text-slate-800"
                          : "text-slate-600",
                      )}
                    >
                      {m.value}
                    </p>
                    <p
                      className={cn(
                        "text-[11px] font-bold mt-2",
                        m.up ? "text-emerald-500" : "text-rose-500",
                      )}
                    >
                      {m.change}
                    </p>
                  </button>
                ))}
              </div>
              {/* 차트 영역 (파스텔 컬러 적용) */}
              <div className="h-40 flex items-end gap-3 px-2">
                {currentMetric.data.map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    className={cn(
                      "flex-1 rounded-t-xl transition-colors duration-500",
                      currentMetric.color,
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between border-t border-slate-50 pt-3 text-[11px] font-bold text-slate-300">
                {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                  <span key={d} className="flex-1 text-center">
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* 우측: 미니 캘린더 */}
            <div className="col-span-4 border-l border-slate-100 pl-10">
              <div className="flex items-center gap-2 mb-6">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <p className="text-[14px] font-bold text-slate-800">
                  이번 주 주요 일정
                </p>
              </div>
              <div className="space-y-4">
                {[
                  {
                    date: "12 화",
                    title: "Product Hunt 런칭",
                    dot: "bg-blue-400",
                  },
                  {
                    date: "14 목",
                    title: "v2.0 보안 패치",
                    dot: "bg-indigo-400",
                  },
                  { date: "18 월", title: "SNS 캠페인", dot: "bg-rose-400" },
                ].map((ev, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-8 text-center shrink-0">
                      <p className="text-[12px] font-bold text-slate-800">
                        {ev.date.split(" ")[0]}
                      </p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">
                        {ev.date.split(" ")[1]}
                      </p>
                    </div>
                    <div className="flex-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100 flex items-center gap-3">
                      <div className={cn("w-1.5 h-1.5 rounded-full", ev.dot)} />
                      <p className="text-[12px] font-semibold text-slate-600 truncate">
                        {ev.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* [섹션 3] 운영 이슈 */}
        <section className="bg-white rounded-[24px] border border-slate-100 p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
          <SectionHeader title="운영 이슈" href={`/projects/${id}/issues`} />
          <div className="grid grid-cols-12 gap-10">
            <div className="col-span-7 space-y-3">
              {MOCK_ISSUES.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center gap-4 hover:bg-slate-50 transition-all group cursor-pointer shadow-sm"
                >
                  <div
                    className={cn(
                      "p-2 rounded-xl",
                      issue.severity === "critical"
                        ? "bg-rose-50"
                        : "bg-amber-50",
                    )}
                  >
                    <issue.icon
                      className={cn(
                        "w-4 h-4",
                        issue.severity === "critical"
                          ? "text-rose-500"
                          : "text-amber-500",
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[14px] font-bold text-slate-800 truncate">
                      {issue.title}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase">
                      {issue.category} · {issue.time}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-black uppercase border",
                      issue.severity === "critical"
                        ? "text-rose-500 border-rose-100"
                        : "text-amber-500 border-amber-100",
                    )}
                  >
                    {issue.severity}
                  </div>
                </div>
              ))}
            </div>
            <div className="col-span-5 flex flex-col justify-between border-l border-slate-100 pl-10">
              <div className="space-y-4">
                <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest text-left">
                  System Health
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">
                      API SERVER
                    </p>
                    <p className="text-[15px] font-bold text-amber-600">
                      Degraded
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl border border-slate-100 text-left">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">
                      DATABASE
                    </p>
                    <p className="text-[15px] font-bold text-emerald-600">
                      Healthy
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <RefreshCw className="w-4 h-4" />
                  <span className="text-[12px] font-bold">
                    최근 배포: 14분 전
                  </span>
                </div>
                <div className="text-[12px] font-bold text-emerald-500">
                  Uptime 99.9%
                </div>
              </div>
            </div>
          </div>
        </section>
      </motion.div>
    </div>
  );
}
