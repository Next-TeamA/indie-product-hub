"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import { useMarketingInsights, useOperationsInsights, useMarketInsights } from "@/hooks/use-insights";
import {
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  Users,
  Target,
  Megaphone,
  Newspaper,
  AlertCircle,
  Building2,
  ChevronRight,
  Heart,
  MessageCircle,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: EASE_OUT_EXPO },
  },
};

// ─── 데이터 ────────────────────────────────────────────────

const CHANNEL_DATA = [
  {
    channel: "Threads",
    impressions: "4.2K",
    clicks: "320",
    ctr: "7.6%",
    trend: "+12%",
    up: true,
  },
  {
    channel: "Bluesky",
    impressions: "2.8K",
    clicks: "180",
    ctr: "6.4%",
    trend: "+5%",
    up: true,
  },
  {
    channel: "Mastodon",
    impressions: "1.5K",
    clicks: "420",
    ctr: "28.0%",
    trend: "+45%",
    up: true,
  },
];

const NEWS_DATA = [
  {
    title: "인디 개발자 커뮤니티, 2025년 최대 성장세 기록",
    source: "TechCrunch",
    time: "2시간 전",
    relevance: "높음",
    tag: "트렌드",
    image: "https://picsum.photos/seed/n1/320/180",
  },
  {
    title: "Product Hunt, 새로운 알고리즘 개편 예고",
    source: "PH Blog",
    time: "5시간 전",
    relevance: "중간",
    tag: "플랫폼",
    image: "https://picsum.photos/seed/n2/320/180",
  },
  {
    title: "소규모 SaaS 구독 피로도 증가, 번들링 트렌드",
    source: "SaaStr",
    time: "1일 전",
    relevance: "중간",
    tag: "시장",
    image: "https://picsum.photos/seed/n3/320/180",
  },
  {
    title: "AI 기반 마케팅 자동화 툴 점유율 확대",
    source: "Indie Hackers",
    time: "2일 전",
    relevance: "높음",
    tag: "AI",
    image: "https://picsum.photos/seed/n4/320/180",
  },
];

const ISSUE_DATA = [
  {
    id: "1",
    title: "온보딩 완료율 하락",
    description: "이번 주 온보딩 완료율이 전주 대비 11%p 감소했습니다.",
    severity: "high",
    time: "오늘",
  },
  {
    id: "2",
    title: "모바일 유입 증가 이상 감지",
    description: "모바일 기기를 통한 유입이 갑자기 38% 급증했습니다.",
    severity: "medium",
    time: "어제",
  },
  {
    id: "3",
    title: "Mastodon 링크 트래킹 누락",
    description: "일부 포스트의 UTM 파라미터가 유실되어 분석이 제한적입니다.",
    severity: "low",
    time: "3일 전",
  },
];

const SEVERITY_CFG = {
  high: {
    border: "border-rose-100",
    text: "text-rose-600",
    bg: "bg-rose-50/50",
    label: "긴급",
  },
  medium: {
    border: "border-amber-100",
    text: "text-amber-600",
    bg: "bg-amber-50/50",
    label: "보통",
  },
  low: {
    border: "border-blue-100",
    text: "text-blue-600",
    bg: "bg-blue-50/50",
    label: "낮음",
  },
};

const TOP_POSTS = [
  {
    platform: "Threads",
    platformColor: "bg-slate-900 text-white",
    date: "5월 8일",
    image: "https://picsum.photos/seed/p1/400/220",
    content:
      "인디 개발자로 6개월 — 처음 100명의 유저를 모으기까지 했던 것들을 솔직하게 공유합니다.",
    likes: 1240,
    comments: 94,
    impressions: "42K",
    rank: 1,
  },
  {
    platform: "Mastodon",
    platformColor: "bg-indigo-600 text-white",
    date: "5월 3일",
    image: "https://picsum.photos/seed/p2/400/220",
    content:
      "TaskFlow 새 기능 출시 🎉 배포 로그부터 홍보 성과까지 한 화면에서 볼 수 있게 됐어요.",
    likes: 842,
    comments: 67,
    impressions: "28K",
    rank: 2,
  },
  {
    platform: "Bluesky",
    platformColor: "bg-blue-500 text-white",
    date: "4월 28일",
    image: "https://picsum.photos/seed/p3/400/220",
    content:
      "사이드 프로젝트를 운영하면서 가장 힘든 건 마케팅이었어요. 그래서 직접 만들었습니다.",
    likes: 634,
    comments: 45,
    impressions: "19K",
    rank: 3,
  },
  {
    platform: "Threads",
    platformColor: "bg-slate-900 text-white",
    date: "4월 22일",
    image: "https://picsum.photos/seed/p4/400/220",
    content:
      "Product Hunt 런칭 D-7. 지금까지 준비한 것들 공개합니다. 헌터 섭외, 예약 알림 등.",
    likes: 521,
    comments: 38,
    impressions: "15K",
    rank: 4,
  },
];

type Tab = "marketing" | "operations";

export default function InsightsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("marketing");

  // API hooks
  const { data: marketingData } = useMarketingInsights(projectId);
  const { data: opsData } = useOperationsInsights(projectId);
  const { insights: marketInsights, generate: generateInsights } = useMarketInsights(projectId);

  // Build channel data from API or fallback
  const channelData = marketingData?.by_platform
    ? Object.entries(marketingData.by_platform).map(([channel, metrics]) => ({
        channel: channel.charAt(0).toUpperCase() + channel.slice(1),
        impressions: (metrics.impressions ?? 0).toLocaleString(),
        clicks: (metrics.clicks ?? 0).toLocaleString(),
        ctr: metrics.impressions > 0 ? `${((metrics.clicks / metrics.impressions) * 100).toFixed(1)}%` : "0%",
        trend: "+0%",
        up: true,
      }))
    : CHANNEL_DATA;

  // Build issue data from API or fallback
  const issueList = opsData?.recent_issues?.length
    ? opsData.recent_issues.map((i) => ({
        title: i.title ?? "Issue",
        description: `Severity: ${i.severity}, Status: ${i.status}`,
        severity: i.severity === "critical" ? "high" as const : i.severity === "warning" ? "medium" as const : "low" as const,
        time: new Date(i.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        image: "",
      }))
    : ISSUE_DATA;

  // Build news from market insights or fallback
  const newsData = marketInsights.length > 0
    ? marketInsights.slice(0, 4).map(mi => ({
        title: mi.title,
        source: mi.insight_type === "competitor" ? "Competitor" : mi.insight_type === "trend" ? "Trend" : "Market",
        time: new Date(mi.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        relevance: mi.is_urgent ? "높음" as const : "중간" as const,
        image: "",
        tag: mi.insight_type,
      }))
    : NEWS_DATA;

  return (
    <div className="px-10 py-10 w-full min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6 max-w-7xl mx-auto"
      >
        {/* ── 헤더 ── */}
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between mb-2"
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1.5">
              Insights
            </p>
            <h1 className="text-[26px] font-bold tracking-tight text-slate-800">
              인사이트
            </h1>
          </div>

          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-inner">
            {[
              { id: "marketing", label: "홍보 인사이트", icon: Megaphone },
              { id: "operations", label: "운영 인사이트", icon: Newspaper },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as Tab)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer",
                  activeTab === id
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "marketing" ? (
            <motion.div
              key="marketing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="flex flex-col gap-5"
            >
              {/* 스탯 카드 */}
              <div className="grid grid-cols-4 gap-5">
                {[
                  {
                    label: "총 노출",
                    value: "9.4K",
                    change: "+18%",
                    up: true,
                    icon: Eye,
                    accent: "text-indigo-500",
                    iconBg: "bg-indigo-50",
                  },
                  {
                    label: "클릭",
                    value: "987",
                    change: "+12%",
                    up: true,
                    icon: MousePointer,
                    accent: "text-violet-500",
                    iconBg: "bg-violet-50",
                  },
                  {
                    label: "신규 방문자",
                    value: "342",
                    change: "+8%",
                    up: true,
                    icon: Users,
                    accent: "text-emerald-500",
                    iconBg: "bg-emerald-50",
                  },
                  {
                    label: "전환율",
                    value: "14.2%",
                    change: "-2%",
                    up: false,
                    icon: Target,
                    accent: "text-rose-500",
                    iconBg: "bg-rose-50",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)] transition-transform hover:-translate-y-1"
                  >
                    <div className="flex items-center justify-between mb-5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                        {card.label}
                      </p>
                      <div className={cn("p-2 rounded-xl", card.iconBg)}>
                        <card.icon className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-[26px] font-bold tracking-tight text-slate-800 mb-1 leading-none">
                      {card.value}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      {card.up ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      <span
                        className={cn(
                          "text-[12px] font-semibold",
                          card.up ? "text-emerald-600" : "text-rose-600",
                        )}
                      >
                        {card.change}
                      </span>
                      <span className="text-[11px] font-medium text-slate-400">
                        vs 지난주
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 주간 노출 & 채널 성과 */}
              <div className="grid grid-cols-5 gap-5 items-stretch">
                <div className="col-span-3 bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                  <p className="text-[15px] font-semibold text-slate-800 mb-8">
                    주간 노출 추이
                  </p>
                  <div className="flex items-end gap-3 h-40 px-2">
                    {[45, 60, 40, 75, 90, 70, 95].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-slate-50 rounded-t-xl relative group hover:bg-slate-100 transition-colors cursor-default border border-slate-100/50"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{
                          delay: i * 0.05,
                          duration: 0.5,
                          ease: EASE_OUT_EXPO,
                        }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm">
                          {Math.round(h * 112)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-4 border-t border-slate-50 pt-3">
                    {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                      <span
                        key={d}
                        className="text-[11px] font-semibold text-slate-300 flex-1 text-center"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="col-span-2 bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                  <p className="text-[15px] font-semibold text-slate-800 mb-6">
                    채널별 성과
                  </p>
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-50">
                        {["채널", "노출", "CTR", "추이"].map((h) => (
                          <th
                            key={h}
                            className="pb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {channelData.map((row) => (
                        <tr
                          key={row.channel}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        >
                          <td className="py-4 text-[13px] font-bold text-slate-700">
                            {row.channel}
                          </td>
                          <td className="py-4 text-[12px] font-medium text-slate-400">
                            {row.impressions}
                          </td>
                          <td className="py-4 text-[12px] font-semibold text-slate-700">
                            {row.ctr}
                          </td>
                          <td className="py-4">
                            <span
                              className={cn(
                                "text-[11px] font-bold px-2 py-0.5 rounded-md",
                                row.up
                                  ? "text-emerald-600 bg-emerald-50"
                                  : "text-rose-600 bg-rose-50",
                              )}
                            >
                              {row.trend}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 인기 게시물 */}
              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <p className="text-[15px] font-semibold text-slate-800">
                      반응이 좋았던 게시물
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-widest leading-none">
                    최근 30일
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-5">
                  {TOP_POSTS.map((post) => (
                    <div key={post.rank} className="group cursor-pointer">
                      <div className="relative aspect-[16/10] rounded-[16px] overflow-hidden mb-3 border border-slate-100 shadow-sm">
                        <img
                          src={post.image}
                          alt={post.platform}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span
                          className={cn(
                            "absolute top-3 left-3 text-[10px] font-bold px-2.5 py-1 rounded-full",
                            post.platformColor,
                          )}
                        >
                          {post.platform}
                        </span>
                        <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-[10px] font-black text-white">
                          #{post.rank}
                        </div>
                      </div>
                      <p className="text-[13px] font-medium text-slate-600 leading-snug line-clamp-2 mb-3 group-hover:text-slate-900 transition-colors">
                        {post.content}
                      </p>
                      <div className="flex items-center justify-between border-t border-slate-50 pt-3 text-[11px] font-semibold text-slate-400">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" />{" "}
                            {post.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-blue-400" />{" "}
                            {post.comments}
                          </span>
                        </div>
                        <span className="text-slate-300">
                          {post.impressions} Views
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="flex flex-col gap-5"
            >
              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <p className="text-[15px] font-semibold text-slate-800">
                    주요 이슈 리포트
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {issueList.map((issue, idx) => {
                    const cfg =
                      SEVERITY_CFG[issue.severity as keyof typeof SEVERITY_CFG];
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-2xl border p-4 flex items-center gap-4 transition-all hover:bg-slate-50/50",
                          cfg.border,
                        )}
                      >
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider bg-slate-50 border border-slate-100",
                            cfg.text,
                          )}
                        >
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-[14px] font-semibold",
                              cfg.text,
                            )}
                          >
                            {issue.title}
                          </p>
                          <p className="text-[12px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                            {issue.description}
                          </p>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-300 shrink-0">
                          {issue.time}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-slate-400" />
                    <p className="text-[15px] font-semibold text-slate-800">
                      시장 및 기술 동향
                    </p>
                  </div>
                  <button className="text-[11px] font-bold text-slate-300 hover:text-slate-600 transition-colors flex items-center gap-1 uppercase tracking-widest">
                    전체 보기 <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-5">
                  {newsData.map((news, i) => (
                    <div key={i} className="group cursor-pointer">
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-3 border border-slate-50">
                        <img
                          src={news.image}
                          alt={news.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <span className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-900/50 text-white backdrop-blur-sm uppercase tracking-wider">
                          {news.tag}
                        </span>
                      </div>
                      <p className="text-[13px] font-semibold text-slate-700 leading-snug line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                        {news.title}
                      </p>
                      <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
                        <span>{news.source}</span>
                        <span className="text-slate-200">{news.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
