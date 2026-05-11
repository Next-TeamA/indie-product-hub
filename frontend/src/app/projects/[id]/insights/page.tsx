"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, TrendingDown, Eye, MousePointer, Users, Target,
  Megaphone, Newspaper, AlertCircle, Building2, ExternalLink, ChevronRight,
  Heart, Repeat2, MessageCircle, Bookmark, Star,
} from "lucide-react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
};

// ─── 데이터 ────────────────────────────────────────────────

const CHANNEL_DATA = [
  { channel: "Threads",  impressions: "4.2K", clicks: "320", ctr: "7.6%",  trend: "+12%", up: true  },
  { channel: "Bluesky",  impressions: "2.8K", clicks: "180", ctr: "6.4%",  trend: "+5%",  up: true  },
  { channel: "Mastodon", impressions: "1.5K", clicks: "420", ctr: "28.0%", trend: "+45%", up: true  },
];

const NEWS_DATA = [
  {
    title: "인디 개발자 커뮤니티, 2025년 상반기 최대 성장세 기록",
    source: "TechCrunch Korea",
    time: "2시간 전",
    relevance: "높음" as const,
    // picsum - office/team
    image: "https://picsum.photos/seed/news-indie-dev/320/180",
    tag: "트렌드",
  },
  {
    title: "Product Hunt, 새로운 알고리즘으로 노출 방식 개편 예고",
    source: "Product Hunt Blog",
    time: "5시간 전",
    relevance: "중간" as const,
    // picsum - technology
    image: "https://picsum.photos/seed/news-producthunt/320/180",
    tag: "플랫폼",
  },
  {
    title: "소규모 SaaS 도구 구독 피로도 증가, 번들링 트렌드 확산",
    source: "SaaStr",
    time: "1일 전",
    relevance: "중간" as const,
    // picsum - business
    image: "https://picsum.photos/seed/news-saas/320/180",
    tag: "시장",
  },
  {
    title: "AI 기반 마케팅 자동화 툴, 인디 시장 점유율 빠르게 확대",
    source: "Indie Hackers",
    time: "2일 전",
    relevance: "높음" as const,
    image: "https://picsum.photos/seed/news-ai-marketing/320/180",
    tag: "AI",
  },
];

const COMPETITOR_DATA = [
  {
    name: "LaunchBase",
    initial: "L",
    activity: "신규 기능 출시: AI 기반 경쟁사 분석 대시보드",
    time: "3일 전",
    impact: "주의" as const,
    image: "https://picsum.photos/seed/comp-launchbase/320/160",
  },
  {
    name: "IndieKit",
    initial: "I",
    activity: "가격 정책 변경 — 무료 플랜 기능 축소",
    time: "1주 전",
    impact: "기회" as const,
    image: "https://picsum.photos/seed/comp-indiekit/320/160",
  },
  {
    name: "MakerOS",
    initial: "M",
    activity: "Product Hunt #1 달성 후 급격한 사용자 유입 중",
    time: "2일 전",
    impact: "주의" as const,
    image: "https://picsum.photos/seed/comp-makeros/320/160",
  },
];

const ISSUE_DATA = [
  {
    title: "온보딩 완료율 하락",
    description: "이번 주 온보딩 완료율이 전주 대비 11%p 감소했습니다.",
    severity: "high" as const,
    time: "오늘",
    image: "https://picsum.photos/seed/issue-onboarding/320/160",
  },
  {
    title: "모바일 유입 증가 이상 감지",
    description: "모바일 유입이 갑자기 38% 증가했습니다. 원인 파악이 필요합니다.",
    severity: "medium" as const,
    time: "어제",
    image: "https://picsum.photos/seed/issue-mobile/320/160",
  },
  {
    title: "Mastodon 링크 트래킹 누락",
    description: "UTM 파라미터가 일부 누락되어 추적이 불완전합니다.",
    severity: "low" as const,
    time: "3일 전",
    image: "https://picsum.photos/seed/issue-tracking/320/160",
  },
];

const SEVERITY_CFG = {
  high:   { bg: "bg-red-50 dark:bg-red-950/30",    text: "text-red-700 dark:text-red-400",    border: "border-l-red-500",   label: "긴급" },
  medium: { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-l-amber-500", label: "보통" },
  low:    { bg: "bg-blue-50 dark:bg-blue-950/30",   text: "text-blue-700 dark:text-blue-400",   border: "border-l-blue-500",  label: "낮음" },
};

const IMPACT_CFG = {
  주의: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  기회: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
};

const RELEVANCE_CFG = {
  높음: { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  중간: { text: "text-muted-foreground", bg: "bg-muted/60" },
};

// 주간 노출 데이터 (%)
const WEEKLY_BAR = [40, 55, 35, 70, 85, 65, 90];
const WEEK_DAYS  = ["월", "화", "수", "목", "금", "토", "일"];

const TOP_POSTS = [
  {
    platform: "Threads",
    platformColor: "bg-gray-900 text-white",
    date: "5월 8일",
    image: "https://picsum.photos/seed/post-threads-1/400/220",
    content: "인디 개발자로 6개월 — 처음 100명의 유저를 모으기까지 했던 것들을 솔직하게 공유합니다. 완벽한 제품보다 빠른 피드백 루프가 답이었어요 🧵",
    likes: 1240,
    reposts: 387,
    comments: 94,
    impressions: "42K",
    rank: 1,
  },
  {
    platform: "Mastodon",
    platformColor: "bg-violet-600 text-white",
    date: "5월 3일",
    image: "https://picsum.photos/seed/post-mastodon-1/400/220",
    content: "TaskFlow 새 기능 출시 🎉 배포 로그부터 홍보 성과까지 한 화면에서 볼 수 있게 됐어요. 인디 개발자에게 꼭 필요한 운영 대시보드를 만들고 있습니다.",
    likes: 842,
    reposts: 310,
    comments: 67,
    impressions: "28K",
    rank: 2,
  },
  {
    platform: "Bluesky",
    platformColor: "bg-sky-500 text-white",
    date: "4월 28일",
    image: "https://picsum.photos/seed/post-bluesky-1/400/220",
    content: "사이드 프로젝트를 운영하면서 가장 힘든 건 마케팅이었어요. 그래서 직접 만들었습니다. 콘텐츠 생성부터 채널 분석까지 자동화해주는 도구.",
    likes: 634,
    reposts: 198,
    comments: 45,
    impressions: "19K",
    rank: 3,
  },
  {
    platform: "Threads",
    platformColor: "bg-gray-900 text-white",
    date: "4월 22일",
    image: "https://picsum.photos/seed/post-threads-2/400/220",
    content: "Product Hunt 런칭 D-7. 지금까지 준비한 것들 공개합니다. 헌터 섭외, 예약 알림, 댓글 대응 전략까지 — 처음 도전하는 분들께 도움이 됐으면 해요.",
    likes: 521,
    reposts: 163,
    comments: 38,
    impressions: "15K",
    rank: 4,
  },
];

const PROMO_TEMPLATES = [
  {
    name: "런칭 알림",
    platform: "전채널",
    platformColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    score: 5,
    tag: "런칭",
    tagColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    content: `🚀 [제품명] 정식 출시!

[핵심 가치 한 줄 요약]

✅ [기능 1]
✅ [기능 2]
✅ [기능 3]

지금 무료로 시작하기 👉 [링크]

#인디개발 #SaaS #ProductHunt`,
  },
  {
    name: "기능 소개",
    platform: "Threads / Bluesky",
    platformColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    score: 4,
    tag: "기능",
    tagColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    content: `새 기능 출시 🎉 [기능명]

[기능이 해결하는 문제 1줄]

이제 [Before] 대신 [After] 가 가능해졌어요.

→ [구체적인 사용 시나리오]

피드백 환영합니다 🙌`,
  },
  {
    name: "성과 공유",
    platform: "Mastodon",
    platformColor: "bg-violet-600/10 text-violet-700 dark:text-violet-400",
    score: 5,
    tag: "밀스톤",
    tagColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    content: `[숫자] 달성 🎯

[제품명] 을 만든 지 [기간]이 지났습니다.

📈 [지표 1]: [수치]
👥 [지표 2]: [수치]
⭐ [지표 3]: [수치]

작은 숫자지만 저에겐 큰 의미예요.
다음 목표는 [다음 목표].

응원해주셔서 감사해요 🙏`,
  },
  {
    name: "스토리텔링",
    platform: "Threads",
    platformColor: "bg-gray-900/10 text-gray-700 dark:text-gray-300",
    score: 4,
    tag: "스토리",
    tagColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    content: `[문제 상황 - 공감 유도]

저도 그랬어요. [공통 페인포인트].

그래서 [제품명]을 만들었습니다.

처음엔 [초기 상황]. 지금은 [개선된 상황].

혹시 같은 고민 하고 계신 분 있으신가요? 🧵`,
  },
  {
    name: "커뮤니티 질문",
    platform: "전채널",
    platformColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    score: 3,
    tag: "참여유도",
    tagColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    content: `[커뮤니티에 던질 질문] 🤔

저는 [제품명]을 만들면서 [관련 인사이트]를 알게 됐어요.

여러분은 어떠세요?
→ A. [선택지 1]
→ B. [선택지 2]
→ C. [선택지 3]

댓글로 알려주세요!`,
  },
  {
    name: "비교 / Before-After",
    platform: "Bluesky / Mastodon",
    platformColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    score: 4,
    tag: "전환",
    tagColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    content: `[제품명] 쓰기 전 vs 후 📊

❌ Before
• [불편했던 점 1]
• [불편했던 점 2]
• [불편했던 점 3]

✅ After
• [개선된 점 1]
• [개선된 점 2]
• [개선된 점 3]

무료로 경험해보세요 👉 [링크]`,
  },
];

type Tab = "marketing" | "operations";

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("marketing");

  return (
    <div className="px-10 py-8 w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-6">

        {/* ── 헤더 ── */}
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Insights</p>
            <h1 className="text-2xl font-bold tracking-tight">인사이트</h1>
          </div>
          {/* 탭 */}
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
            {([
              { id: "marketing", label: "홍보 인사이트", icon: Megaphone },
              { id: "operations", label: "운영 인사이트", icon: Newspaper },
            ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === id ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── 홍보 인사이트 ── */}
          {activeTab === "marketing" && (
            <motion.div
              key="marketing"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className="flex flex-col gap-5"
            >
              {/* 스탯 카드 4개 */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: "총 노출",    value: "9.4K",  change: "+18%", up: true,  icon: Eye,          bg: "bg-indigo-50 dark:bg-indigo-950/30",  accent: "text-indigo-500"  },
                  { label: "클릭",       value: "987",   change: "+12%", up: true,  icon: MousePointer, bg: "bg-violet-50 dark:bg-violet-950/30",  accent: "text-violet-500"  },
                  { label: "신규 방문자", value: "342",   change: "+8%",  up: true,  icon: Users,        bg: "bg-emerald-50 dark:bg-emerald-950/30", accent: "text-emerald-500" },
                  { label: "전환율",     value: "14.2%", change: "-2%",  up: false, icon: Target,       bg: "bg-rose-50 dark:bg-rose-950/30",       accent: "text-rose-500"    },
                ].map(card => (
                  <div key={card.label} className={`rounded-2xl ${card.bg} p-5`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs text-muted-foreground">{card.label}</p>
                      <card.icon className={`w-4 h-4 ${card.accent}`} />
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                    <div className="flex items-center gap-1 mt-2">
                      {card.up
                        ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                        : <TrendingDown className="w-3 h-3 text-red-500" />
                      }
                      <span className={`text-xs font-semibold ${card.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {card.change}
                      </span>
                      <span className="text-xs text-muted-foreground">vs 지난주</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 차트 + 채널 테이블 */}
              <div className="grid grid-cols-5 gap-4">
                {/* 주간 노출 바 차트 */}
                <div className="col-span-3 rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold mb-4">주간 노출 추이</p>
                  <div className="flex items-end gap-2 h-40">
                    {WEEKLY_BAR.map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-indigo-500/20 rounded-t-lg relative group hover:bg-indigo-500/40 transition-colors cursor-default"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.1 + i * 0.06, duration: 0.5, ease: EASE_OUT_EXPO }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {Math.round(h * 94)}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-2">
                    {WEEK_DAYS.map(d => (
                      <span key={d} className="text-[10px] text-muted-foreground flex-1 text-center">{d}</span>
                    ))}
                  </div>
                </div>

                {/* 채널별 성과 */}
                <div className="col-span-2 rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-semibold mb-4">채널별 성과</p>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border text-left">
                        {["채널", "노출", "CTR", "추이"].map(h => (
                          <th key={h} className="pb-3 text-xs font-medium text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {CHANNEL_DATA.map(row => (
                        <tr key={row.channel} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 text-sm font-medium">{row.channel}</td>
                          <td className="py-3 text-xs text-muted-foreground">{row.impressions}</td>
                          <td className="py-3 text-xs">{row.ctr}</td>
                          <td className="py-3">
                            <span className={`text-xs font-semibold ${row.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
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
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <p className="text-sm font-semibold">반응이 좋았던 게시물</p>
                  </div>
                  <span className="text-xs text-muted-foreground">최근 30일</span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {TOP_POSTS.map((post) => (
                    <div key={post.rank} className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer group">
                      <div className="relative h-32 bg-muted overflow-hidden">
                        <img src={post.image} alt={post.platform} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className={`absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${post.platformColor}`}>
                          {post.platform}
                        </span>
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center">
                          <span className="text-[9px] font-bold text-white">#{post.rank}</span>
                        </div>
                        <span className="absolute bottom-2 right-2 text-[10px] text-white/70">{post.date}</span>
                      </div>
                      <div className="p-3 flex flex-col gap-2.5">
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{post.content}</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 border-t border-border">
                          <div className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-rose-400" />
                            <span className="text-[10px] font-semibold tabular-nums">{post.likes.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Repeat2 className="w-3 h-3 text-emerald-500" />
                            <span className="text-[10px] font-semibold tabular-nums">{post.reposts.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] font-semibold tabular-nums">{post.comments}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-violet-400" />
                            <span className="text-[10px] font-semibold tabular-nums">{post.impressions}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 홍보 템플릿 */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bookmark className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">홍보 템플릿</p>
                  </div>
                  <span className="text-xs text-muted-foreground">효과 검증된 형식 {PROMO_TEMPLATES.length}개</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {PROMO_TEMPLATES.map((tpl) => (
                    <div key={tpl.name} className="rounded-xl border border-border bg-muted/10 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group flex flex-col">
                      <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tpl.tagColor}`}>{tpl.tag}</span>
                          <p className="text-xs font-semibold">{tpl.name}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-2.5 h-2.5 ${i < tpl.score ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                          ))}
                        </div>
                      </div>
                      <div className="px-4 pb-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tpl.platformColor}`}>{tpl.platform}</span>
                      </div>
                      <div className="flex-1 mx-4 mb-4 rounded-lg bg-background border border-border p-3">
                        <pre className="text-[10px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans line-clamp-[10]">
                          {tpl.content}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── 운영 인사이트 ── */}
          {activeTab === "operations" && (
            <motion.div
              key="operations"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
              className="flex flex-col gap-5"
            >
              {/* 주요 이슈 */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">주요 이슈</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {ISSUE_DATA.map((issue, i) => {
                    const cfg = SEVERITY_CFG[issue.severity];
                    return (
                      <div key={i} className={`rounded-xl border-l-4 ${cfg.border} ${cfg.bg} px-4 py-3 flex items-start gap-4 hover:brightness-95 dark:hover:brightness-110 transition-all cursor-pointer`}>
                        <span className={`mt-0.5 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border border-current/20`}>
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{issue.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{issue.description}</p>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{issue.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 관련 뉴스 */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Newspaper className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">관련 뉴스</p>
                  </div>
                  <button className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    전체 보기 <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  {NEWS_DATA.map((news, i) => {
                    const rcfg = RELEVANCE_CFG[news.relevance];
                    return (
                      <div key={i} className="rounded-xl overflow-hidden border border-border group cursor-pointer hover:shadow-md transition-shadow">
                        {/* 썸네일 */}
                        <div className="relative h-36 bg-muted overflow-hidden">
                          <img
                            src={news.image}
                            alt={news.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                            {news.tag}
                          </span>
                          <ExternalLink className="absolute top-2 right-2 w-3.5 h-3.5 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {/* 내용 */}
                        <div className="p-3 flex flex-col gap-2">
                          <p className="text-xs font-semibold leading-snug line-clamp-2">{news.title}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">{news.source}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${rcfg.bg} ${rcfg.text}`}>
                              {news.relevance}
                            </span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{news.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 경쟁사 동향 */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">경쟁사 동향</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {COMPETITOR_DATA.map((comp, i) => {
                    const icfg = IMPACT_CFG[comp.impact];
                    return (
                      <div key={i} className="rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow cursor-pointer">
                        {/* 이미지 */}
                        <div className="relative h-28 bg-muted overflow-hidden">
                          <img
                            src={comp.image}
                            alt={comp.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          <span className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${icfg.bg} ${icfg.text}`}>
                            {comp.impact}
                          </span>
                          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white">{comp.initial}</span>
                            </div>
                            <span className="text-xs font-semibold text-white">{comp.name}</span>
                          </div>
                        </div>
                        {/* 내용 */}
                        <div className="p-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{comp.activity}</p>
                          <p className="text-[10px] text-muted-foreground mt-2">{comp.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}
