"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, Eye, MousePointer, Users, Target,
  Megaphone, Newspaper, AlertCircle, Building2, ExternalLink,
} from "lucide-react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

function MetricCard({
  label, value, change, positive, icon: Icon,
}: {
  label: string; value: string; change: string; positive: boolean; icon: React.ElementType;
}) {
  return (
    <motion.div variants={fadeUp} className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {positive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
        <span className={`text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {change}
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs 지난주</span>
      </div>
    </motion.div>
  );
}

const CHANNEL_DATA = [
  { channel: "Threads", impressions: "4.2K", clicks: "320", ctr: "7.6%", trend: "+12%" },
  { channel: "Bluesky", impressions: "2.8K", clicks: "180", ctr: "6.4%", trend: "+5%" },
  { channel: "Mastodon", impressions: "1.5K", clicks: "420", ctr: "28%", trend: "+45%" },
];

const NEWS_DATA = [
  {
    category: "뉴스",
    title: "인디 개발자 커뮤니티, 2025년 상반기 최대 성장세 기록",
    source: "TechCrunch Korea",
    time: "2시간 전",
    relevance: "높음",
  },
  {
    category: "뉴스",
    title: "Product Hunt, 새로운 알고리즘으로 노출 방식 개편 예고",
    source: "Product Hunt Blog",
    time: "5시간 전",
    relevance: "중간",
  },
  {
    category: "뉴스",
    title: "소규모 SaaS 도구 구독 피로도 증가, 번들링 트렌드 확산",
    source: "SaaStr",
    time: "1일 전",
    relevance: "중간",
  },
];

const COMPETITOR_DATA = [
  {
    name: "LaunchBase",
    activity: "신규 기능 출시: AI 기반 경쟁사 분석 대시보드",
    time: "3일 전",
    impact: "주의",
  },
  {
    name: "IndieKit",
    activity: "가격 정책 변경 — 무료 플랜 기능 축소",
    time: "1주 전",
    impact: "기회",
  },
  {
    name: "MakerOS",
    activity: "Product Hunt #1 달성 후 급격한 사용자 유입 중",
    time: "2일 전",
    impact: "주의",
  },
];

const ISSUE_DATA = [
  {
    title: "온보딩 완료율 하락",
    description: "이번 주 온보딩 완료율이 전주 대비 11%p 감소했습니다.",
    severity: "high",
    time: "오늘",
  },
  {
    title: "모바일 유입 증가 이상 감지",
    description: "모바일 유입이 갑자기 38% 증가했습니다. 원인 파악이 필요합니다.",
    severity: "medium",
    time: "어제",
  },
  {
    title: "특정 채널 링크 트래킹 누락",
    description: "Mastodon 링크의 UTM 파라미터가 일부 누락되어 추적이 불완전합니다.",
    severity: "low",
    time: "3일 전",
  },
];

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  medium: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  low: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
};

const SEVERITY_LABEL: Record<string, string> = { high: "긴급", medium: "보통", low: "낮음" };

const IMPACT_STYLE: Record<string, string> = {
  주의: "text-yellow-600 dark:text-yellow-400",
  기회: "text-emerald-600 dark:text-emerald-400",
};

type Tab = "marketing" | "operations";

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("marketing");

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-8">
        <motion.div variants={fadeUp}>
          <p className="h-eyebrow mb-1">INSIGHTS</p>
          <h1 className="text-2xl font-bold tracking-tight">인사이트</h1>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp} className="flex gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          {([
            { id: "marketing", label: "홍보 인사이트", icon: Megaphone },
            { id: "operations", label: "운영 인사이트", icon: Newspaper },
          ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "marketing" ? (
            <motion.div
              key="marketing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className="flex flex-col gap-10"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border border border-border rounded-xl overflow-hidden">
                <MetricCard label="총 노출" value="9.4K" change="+18%" positive icon={Eye} />
                <MetricCard label="클릭" value="987" change="+12%" positive icon={MousePointer} />
                <MetricCard label="신규 방문자" value="342" change="+8%" positive icon={Users} />
                <MetricCard label="전환율" value="14.2%" change="-2%" positive={false} icon={Target} />
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-sm font-semibold mb-4">주간 노출 추이</h3>
                <div className="h-48 flex items-end gap-2">
                  {[40, 55, 35, 70, 85, 65, 90].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 bg-foreground/8 rounded-t-lg relative group"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: EASE_OUT_EXPO }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {Math.round(h * 100)}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="flex justify-between mt-2">
                  {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                    <span key={d} className="text-[10px] text-muted-foreground flex-1 text-center">{d}</span>
                  ))}
                </div>
              </div>

              <hr className="border-border" />

              <div>
                <h3 className="text-sm font-semibold mb-4">채널별 홍보 성과</h3>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-3 font-medium">채널</th>
                      <th className="pb-3 font-medium">노출</th>
                      <th className="pb-3 font-medium">클릭</th>
                      <th className="pb-3 font-medium">CTR</th>
                      <th className="pb-3 font-medium">추이</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {CHANNEL_DATA.map((row) => (
                      <tr key={row.channel} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 text-sm font-medium">{row.channel}</td>
                        <td className="py-3.5 text-sm">{row.impressions}</td>
                        <td className="py-3.5 text-sm">{row.clicks}</td>
                        <td className="py-3.5 text-sm">{row.ctr}</td>
                        <td className="py-3.5 text-sm">
                          <span className={`text-xs font-medium ${row.trend.startsWith("+") ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {row.trend}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className="flex flex-col gap-10"
            >
              {/* 이슈 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">주요 이슈</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {ISSUE_DATA.map((issue, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                      <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${SEVERITY_STYLE[issue.severity]}`}>
                        {SEVERITY_LABEL[issue.severity]}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{issue.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{issue.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-border" />

              {/* 경쟁사 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">경쟁사 동향</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {COMPETITOR_DATA.map((comp, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold">{comp.name[0]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium">{comp.name}</p>
                          <span className={`text-xs font-medium ${IMPACT_STYLE[comp.impact]}`}>{comp.impact}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{comp.activity}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{comp.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <hr className="border-border" />

              {/* 뉴스 */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">관련 뉴스</h3>
                </div>
                <div className="flex flex-col gap-3">
                  {NEWS_DATA.map((news, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-xl hover:bg-muted/30 transition-colors group cursor-pointer">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground">{news.source}</span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{news.time}</span>
                          <span className={`ml-auto text-xs font-medium ${news.relevance === "높음" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            관련도 {news.relevance}
                          </span>
                        </div>
                        <p className="text-sm font-medium leading-snug">{news.title}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
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
