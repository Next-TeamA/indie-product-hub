"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import { useMarketingInsights, useOperationsInsights, useMarketInsights } from "@/hooks/use-insights";
import { useThreadsMentions } from "@/hooks/use-sns-metrics";
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
  AtSign,
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

// TOP_POSTS: populated from API when best_post data is available
const TOP_POSTS: {
    platform: string;
    platformColor: string;
    date: string;
    image: string;
    content: string;
    likes: number;
    reposts: number;
    comments: number;
    impressions: string;
    rank: number;
  }[] = []; // Empty -- no mock data


type Tab = "marketing" | "operations";

export default function InsightsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("marketing");

  // API hooks
  const { data: marketingData } = useMarketingInsights(projectId);
  const { data: opsData } = useOperationsInsights(projectId);
  const { insights: marketInsights, generate: generateInsights } = useMarketInsights(projectId);
  const { mentions: threadsMentions } = useThreadsMentions(projectId);

  // Build channel data from API or fallback
  const channelData = marketingData?.by_platform
    ? Object.entries(marketingData.by_platform).map(([channel, metrics]: [string, Record<string, number>]) => {
        const imp = metrics.impressions ?? 0;
        const clicks = metrics.clicks ?? 0;
        const likes = metrics.likes ?? 0;
        const replies = metrics.replies ?? 0;
        const reposts = metrics.reposts ?? 0;
        const engagement = likes + replies + reposts;
        const engRate = imp > 0 ? ((engagement / imp) * 100).toFixed(1) : "0.0";
        return {
          channel: channel.charAt(0).toUpperCase() + channel.slice(1),
          impressions: imp.toLocaleString(),
          clicks: clicks.toLocaleString(),
          likes: likes.toLocaleString(),
          replies: replies.toLocaleString(),
          reposts: reposts.toLocaleString(),
          ctr: imp > 0 ? `${((clicks / imp) * 100).toFixed(1)}%` : "0%",
          engagementRate: `${engRate}%`,
          posts: metrics.posts ?? 0,
          trend: marketingData.changes?.impressions
            ? `${marketingData.changes.impressions > 0 ? "+" : ""}${marketingData.changes.impressions}%`
            : "--",
          up: (marketingData.changes?.impressions ?? 0) >= 0,
        };
      })
    : [];

  // Build issue data from API or fallback
  const issueList = opsData?.recent_issues?.length
    ? opsData.recent_issues.map((i) => ({
        title: i.title ?? "Issue",
        description: `Severity: ${i.severity}, Status: ${i.status}`,
        severity: i.severity === "critical" ? "high" as const : i.severity === "warning" ? "medium" as const : "low" as const,
        time: new Date(i.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        image: "",
      }))
    : [];

  // Build news from market insights or fallback
  const newsData = marketInsights.length > 0
    ? marketInsights.slice(0, 6).map(mi => ({
        title: mi.title,
        summary: mi.summary,
        action: mi.detail,
        source: mi.insight_type === "competitor" ? "경쟁사" : mi.insight_type === "trend" ? "트렌드" : mi.insight_type === "opportunity" ? "기회" : mi.insight_type === "threat" ? "위협" : "시장",
        time: new Date(mi.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        relevance: mi.is_urgent ? "높음" as const : mi.relevance_score > 0.7 ? "높음" as const : "중간" as const,
        image: "",
        tag: mi.insight_type,
      }))
    : [];

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
                    value: marketingData?.totals?.impressions ? marketingData.totals.impressions.toLocaleString() : "0",
                    change: marketingData?.changes?.impressions ? `${marketingData.changes.impressions > 0 ? "+" : ""}${marketingData.changes.impressions}%` : "0%",
                    up: (marketingData?.changes?.impressions ?? 0) >= 0,
                    icon: Eye,
                    accent: "text-indigo-500",
                    iconBg: "bg-indigo-50",
                  },
                  {
                    label: "클릭",
                    value: marketingData?.totals?.clicks ? marketingData.totals.clicks.toLocaleString() : "0",
                    change: marketingData?.changes?.clicks ? `${marketingData.changes.clicks > 0 ? "+" : ""}${marketingData.changes.clicks}%` : "0%",
                    up: (marketingData?.changes?.clicks ?? 0) >= 0,
                    icon: MousePointer,
                    accent: "text-violet-500",
                    iconBg: "bg-violet-50",
                  },
                  {
                    label: "좋아요",
                    value: marketingData?.totals?.likes ? marketingData.totals.likes.toLocaleString() : "0",
                    change: marketingData?.changes?.likes ? `${marketingData.changes.likes > 0 ? "+" : ""}${marketingData.changes.likes}%` : "0%",
                    up: (marketingData?.changes?.likes ?? 0) >= 0,
                    icon: Users,
                    accent: "text-emerald-500",
                    iconBg: "bg-emerald-50",
                  },
                  {
                    label: "참여율",
                    value: marketingData?.engagement_rate ? `${marketingData.engagement_rate}%` : "0%",
                    change: "0%",
                    up: true,
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
                    {(() => {
                      const daily = marketingData?.daily_impressions ?? [];
                      const maxVal = Math.max(...daily, 1);
                      if (daily.length > 0 && daily.some(v => v > 0)) {
                        return daily.map((val, i) => (
                          <motion.div
                            key={i}
                            className="flex-1 bg-slate-50 rounded-t-xl relative group hover:bg-slate-100 transition-colors cursor-default border border-slate-100/50"
                            initial={{ height: 0 }}
                            animate={{ height: `${(val / maxVal) * 100}%` }}
                            transition={{ delay: i * 0.05, duration: 0.5, ease: EASE_OUT_EXPO }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-white border border-slate-100 px-2 py-1 rounded-md shadow-sm">
                              {val.toLocaleString()}
                            </div>
                          </motion.div>
                        ));
                      }
                      return (
                        <div className="flex-1 flex items-center justify-center text-[13px] text-slate-400">
                          SNS 채널을 연결하고 게시물을 발행하면 데이터가 표시됩니다
                        </div>
                      );
                    })()}
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
                  {marketingData?.best_post ? [marketingData.best_post].map((post, idx) => (
                    <div key={idx} className="bg-white rounded-[16px] border border-slate-100 p-4 shadow-sm">
                      <p className="text-[11px] font-bold text-indigo-500 mb-2">{post.platform} / {post.tone}</p>
                      <p className="text-[13px] font-medium text-slate-700 line-clamp-3">{post.hook}</p>
                      <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                        <span>{post.impressions.toLocaleString()} views</span>
                        <span>{post.engagement.toLocaleString()} engagement</span>
                      </div>
                    </div>
                  )) : TOP_POSTS.length === 0 ? (
                    <div className="col-span-4 text-center py-12 text-[13px] text-slate-400">
                      게시물을 발행하면 반응이 좋았던 게시물이 여기에 표시됩니다
                    </div>
                  ) : TOP_POSTS.map((post) => (
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
                      <p className="text-[13px] font-semibold text-slate-700 leading-snug line-clamp-2 mb-1.5 group-hover:text-blue-600 transition-colors">
                        {news.title}
                      </p>
                      {news.summary && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 mb-1.5">
                          {news.summary}
                        </p>
                      )}
                      {news.action && (
                        <p className="text-[11px] font-medium text-blue-600 line-clamp-1 mb-1.5">
                          {news.action}
                        </p>
                      )}
                      <div className="flex justify-between items-center text-[11px] font-medium text-slate-400">
                        <span>{news.source}</span>
                        <span className="text-slate-200">{news.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Threads 멘션 */}
              <div className="bg-white rounded-[20px] border border-slate-100 p-6 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2 mb-6">
                  <AtSign className="w-4 h-4 text-slate-400" />
                  <p className="text-[15px] font-semibold text-slate-800">
                    Threads 멘션
                  </p>
                  <span className="text-[11px] font-bold text-slate-300 ml-auto">
                    {threadsMentions.length}건
                  </span>
                </div>
                {threadsMentions.length === 0 ? (
                  <div className="text-center py-8 text-[13px] text-slate-400">
                    아직 멘션이 없습니다. Threads에서 제품이 언급되면 여기에 표시됩니다.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {threadsMentions.slice(0, 5).map((mention, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-100 p-4 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-bold text-blue-600">
                            @{mention.username}
                          </span>
                          <span className="text-[11px] text-slate-300">
                            {mention.timestamp ? new Date(mention.timestamp).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                        <p className="text-[13px] text-slate-600 line-clamp-3">
                          {mention.text}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
