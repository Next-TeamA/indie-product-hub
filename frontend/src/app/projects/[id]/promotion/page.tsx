"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
  Trash2,
  Loader2,
  Sparkles,
  MessagesSquare,
} from "lucide-react";
import Link from "next/link";
import {
  activateScheduledPromotions,
  listPromotions,
  deleteAllPromotions,
  deletePromotion,
  type Promotion,
  type Platform,
  type PromotionStatus,
} from "@/lib/api/promotion";
import { cn } from "@/lib/utils";

// --- Constants ---

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const KO_MONTHS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const PLATFORM: Record<
  Platform,
  { label: string; chipBg: string; chipText: string }
> = {
  threads: { label: "Th", chipBg: "bg-orange-50", chipText: "text-orange-600" },
  x: { label: "X", chipBg: "bg-slate-100", chipText: "text-slate-700" },
  bluesky: { label: "Bs", chipBg: "bg-sky-50", chipText: "text-sky-600" },
  mastodon: {
    label: "Mt",
    chipBg: "bg-violet-50",
    chipText: "text-violet-600",
  },
};

const STATUS: Record<
  PromotionStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "초안", bg: "bg-amber-50", text: "text-amber-600" },
  scheduled: { label: "예약됨", bg: "bg-blue-50", text: "text-blue-600" },
  publishing: { label: "게시 중", bg: "bg-blue-50", text: "text-blue-600" },
  published: { label: "발행됨", bg: "bg-emerald-50", text: "text-emerald-600" },
  failed: { label: "실패", bg: "bg-rose-50", text: "text-rose-600" },
};

// --- Helpers ---

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toKoDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} (${KO_DAYS[d.getDay()]})`;
}

// --- Component ---

export default function PromotionPage() {
  const { id: projectId } = useParams<{ id: string }>();

  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<string>(todayStr);
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [activatingSchedule, setActivatingSchedule] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "feed">("calendar");

  const refreshPromos = useCallback(() => {
    listPromotions(projectId).then(setPromos).catch(console.error);
  }, [projectId]);

  useEffect(() => {
    refreshPromos();
  }, [refreshPromos, viewYear, viewMonth]);

  // Build calendar cells
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const byDate = useMemo(() => {
    const map: Record<string, Promotion[]> = {};
    for (const p of promos) {
      (map[p.date] ??= []).push(p);
    }
    return map;
  }, [promos]);

  const feedPosts = useMemo(() => {
    return [...promos].sort((a, b) => {
      if (a.campaign_id && b.campaign_id && a.campaign_id === b.campaign_id) {
        return (a.campaign_day ?? 999) - (b.campaign_day ?? 999);
      }
      return (
        a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time) ||
        (a.campaign_day ?? 999) - (b.campaign_day ?? 999)
      );
    });
  }, [promos]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePromotion(projectId, postId);
      setPromos((prev) => prev.filter((p) => p.id !== postId));
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleActivateScheduled = async () => {
    setActivatingSchedule(true);
    try {
      await activateScheduledPromotions(projectId);
      refreshPromos();
    } catch (e) {
      console.error("Activate scheduled posts failed:", e);
    } finally {
      setActivatingSchedule(false);
    }
  };

  const handleDeleteAllPosts = async () => {
    const deletableCount = promos.filter((p) => p.status !== "publishing").length;
    if (deletableCount === 0) return;

    const confirmed = window.confirm(
      `홍보 캘린더의 게시물 ${deletableCount}개를 모두 삭제할까요?\n이미 SNS에 올라간 게시물은 외부 플랫폼에서는 삭제되지 않고, 캘린더 기록만 삭제됩니다.`,
    );
    if (!confirmed) return;

    setClearingAll(true);
    try {
      await deleteAllPromotions(projectId);
      setPromos((prev) => prev.filter((p) => p.status === "publishing"));
    } catch (e) {
      console.error("Delete all promotion posts failed:", e);
    } finally {
      setClearingAll(false);
    }
  };

  // Stats
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekCount = promos.filter((p) => {
    const d = new Date(p.date + "T00:00:00");
    return d >= weekStart && d <= weekEnd;
  }).length;
  const lastPub = [...promos]
    .filter((p) => p.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextSched = [...promos]
    .filter((p) => p.status === "scheduled" && p.date >= todayStr)
    .sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    )[0];
  const futureDraftCount = promos.filter(
    (p) => p.status === "draft" && p.scheduled_at && p.date >= todayStr,
  ).length;

  // Selected day
  const selectedPosts = byDate[selected] ?? [];
  const primaryPost = selectedPosts[0];
  const selectedIsPast = selected < todayStr;

  return (
    <div className="w-full flex flex-col h-dvh bg-white selection:bg-slate-800 selection:text-white">
      {/* Header */}
      <motion.div
        className="px-8 py-6 flex items-center justify-between shrink-0"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-blue-500 mb-1.5">
            PROMOTION
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-bold tracking-tight text-slate-800">
              홍보 캘린더
            </h1>
            <span className="text-[15px] font-semibold text-slate-400">
              {viewYear}년 {KO_MONTHS[viewMonth]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Link
            href={`/projects/${projectId}/promotion/campaign/new`}
            className="flex items-center gap-2 h-9 px-4 rounded-full border border-blue-100 bg-blue-50 text-blue-600 text-[13px] font-semibold hover:bg-blue-100 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            2주 홍보 콘텐츠 전략 생성
          </Link>
          <Link
            href={`/projects/${projectId}/promotion/post/new`}
            className="flex items-center gap-2 h-9 px-4 rounded-full bg-slate-900 text-white text-[13px] font-semibold hover:bg-slate-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            홍보 등록
          </Link>
          <button
            onClick={handleDeleteAllPosts}
            disabled={promos.length === 0 || promos.every((p) => p.status === "publishing") || clearingAll}
            className="flex items-center gap-2 h-9 px-4 rounded-full border border-rose-100 bg-white text-rose-500 text-[13px] font-semibold hover:bg-rose-50 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          >
            {clearingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            전체 삭제{promos.length > 0 ? ` (${promos.length})` : ""}
          </button>
        </div>
      </motion.div>

      <div className="px-8 pb-4 shrink-0">
        <div className="inline-flex rounded-full border border-slate-100 bg-slate-50 p-1">
          <button
            onClick={() => setViewMode("calendar")}
            className={cn(
              "flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-bold transition-colors",
              viewMode === "calendar"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            캘린더 보기
          </button>
          <button
            onClick={() => setViewMode("feed")}
            className={cn(
              "flex h-8 items-center gap-2 rounded-full px-3 text-[12px] font-bold transition-colors",
              viewMode === "feed"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 hover:text-slate-600",
            )}
          >
            <MessagesSquare className="h-3.5 w-3.5" />
            피드 보기
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-y border-slate-50 px-8 py-3 flex items-center gap-8 text-[12px] font-semibold shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          이번 주 <span className="text-slate-800">{weekCount} posts</span>
        </div>
        {lastPub && (
          <div className="flex items-center gap-2 text-slate-400">
            마지막 발행{" "}
            <span className="text-slate-800">{toKoDate(lastPub.date)}</span>
          </div>
        )}
        {nextSched && (
          <div className="flex items-center gap-2 text-slate-400">
            다음 예정{" "}
            <span className="text-slate-800">
              {toKoDate(nextSched.date)} {nextSched.time}
            </span>
          </div>
        )}
        <button
          onClick={handleActivateScheduled}
          disabled={futureDraftCount === 0 || activatingSchedule}
          className="ml-auto flex items-center gap-1.5 text-slate-300 hover:text-slate-500 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
        >
          {activatingSchedule ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span className="text-[11px] uppercase tracking-wider">
            예약 발행 켜기{futureDraftCount > 0 ? ` (${futureDraftCount})` : ""}
          </span>
        </button>
      </div>

      {/* Body */}
      {viewMode === "calendar" ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar */}
          <div className="flex-1 flex flex-col overflow-y-auto px-6 py-4">
          {/* Weekday row */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-bold text-slate-400 py-2 uppercase tracking-widest"
              >
                {d}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-7 border-l border-t border-slate-50 flex-1">
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="border-r border-b border-slate-50 bg-slate-50/20"
                  />
                );
              }
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isToday = dateStr === todayStr;
              const isSel = dateStr === selected;
              const isPast = dateStr < todayStr;
              const dayPosts = byDate[dateStr] ?? [];

              return (
                <div
                  key={dateStr}
                  onClick={() => !isPast && setSelected(dateStr)}
                  className={cn(
                    "border-r border-b border-slate-50 min-h-[100px] p-2 transition-all duration-200",
                    isPast
                      ? "opacity-40 cursor-default bg-slate-50/20"
                      : isSel
                        ? "bg-blue-50/30 cursor-pointer"
                        : "hover:bg-slate-50/50 cursor-pointer",
                  )}
                >
                  <div className="mb-2">
                    <span
                      className={cn(
                        "w-7 h-7 inline-flex items-center justify-center rounded-full text-[13px] font-bold",
                        isToday
                          ? "bg-slate-800 text-white shadow-sm"
                          : isSel
                            ? "text-blue-600"
                            : "text-slate-400",
                      )}
                    >
                      {day}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayPosts.map((post) => {
                      const pm = PLATFORM[post.platform];
                      return (
                        <div
                          key={post.id}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] font-semibold leading-none",
                            pm.chipBg,
                            pm.chipText,
                          )}
                        >
                          <span className="opacity-70">{pm.label}</span>
                          <span className="truncate">{post.hook}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </div>

          {/* Right panel (Selected Day Info) */}
          <motion.aside
            className="w-80 shrink-0 border-l border-slate-50 flex flex-col overflow-y-auto bg-slate-50/30"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: EASE_OUT_EXPO }}
          >
          <div className="p-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1.5">
              선택한 날
            </p>
            <p className="text-[20px] font-bold text-slate-800 mb-6">
              {toKoDate(selected)}
            </p>

            {/* Primary post card */}
            {primaryPost ? (
              <div className="bg-white rounded-[20px] border border-slate-100 p-5 mb-5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.04)]">
                {/* Meta row */}
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0",
                      PLATFORM[primaryPost.platform].chipBg,
                      PLATFORM[primaryPost.platform].chipText,
                    )}
                  >
                    {PLATFORM[primaryPost.platform].label}
                  </span>
                  <span className="text-[12px] font-semibold text-slate-400">
                    {primaryPost.time}
                  </span>
                  <span
                    className={cn(
                      "ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full",
                      STATUS[primaryPost.status].bg,
                      STATUS[primaryPost.status].text,
                    )}
                  >
                    {STATUS[primaryPost.status].label}
                  </span>
                </div>
                {/* Content preview */}
                <p className="text-[14px] font-semibold text-slate-800 leading-snug mb-1 truncate">
                  {primaryPost.hook}
                </p>
                <p className="text-[13px] font-medium text-slate-500 line-clamp-3 mb-4 whitespace-pre-line leading-relaxed">
                  {primaryPost.content}
                </p>
                {/* Image placeholder */}
                <div className="w-full aspect-video rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                    hero shot
                  </span>
                </div>
                {/* Detail Link + Delete */}
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${projectId}/promotion/post/${primaryPost.id}`}
                    className="flex items-center justify-center gap-2 flex-1 py-2.5 rounded-xl border border-slate-100 text-[12px] font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    상세 보기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => handleDeletePost(primaryPost.id)}
                    className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/50 border border-dashed border-slate-200 rounded-[20px] p-8 mb-5 text-center">
                <p className="text-[13px] font-medium text-slate-400">
                  예정된 게시물이 없습니다.
                </p>
                {!selectedIsPast && (
                  <Link
                    href={`/projects/${projectId}/promotion/post/new?date=${selected}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-blue-500 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />첫 홍보글 만들기
                  </Link>
                )}
              </div>
            )}

            {/* Additional posts */}
            {selectedPosts.length > 1 && (
              <div className="flex flex-col gap-2 mb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-1">
                  그 외 게시물
                </p>
                {selectedPosts.slice(1).map((post) => {
                  const pm = PLATFORM[post.platform];
                  return (
                    <div key={post.id} className="flex items-center gap-1">
                      <Link
                        href={`/projects/${projectId}/promotion/post/${post.id}`}
                        className="flex items-center gap-3 rounded-xl p-3 border border-slate-100 bg-white hover:bg-slate-50 transition-colors group flex-1 min-w-0"
                      >
                        <span
                          className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0",
                            pm.chipBg,
                            pm.chipText,
                          )}
                        >
                          {pm.label}
                        </span>
                        <span className="text-[12px] font-semibold text-slate-600 truncate flex-1">
                          {post.hook}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                      </Link>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tags / Category Divider */}
            <div className="pt-6 border-t border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mb-3">
                자주 사용하는 태그
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["런칭", "업데이트", "회고", "Q&A", "개발일지"].map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white border border-slate-100 text-slate-500 cursor-pointer hover:border-slate-300 hover:text-slate-800 transition-all shadow-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          </motion.aside>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-white px-4">
          <div className="mx-auto w-full max-w-[720px] border-x border-slate-100">
            {feedPosts.length > 0 ? (
              feedPosts.map((post) => {
                const pm = PLATFORM[post.platform];
                const textLength = [post.hook, post.content].filter(Boolean).join("\n\n").length;
                return (
                  <article
                    key={post.id}
                    className="border-b border-slate-100 bg-white px-6 py-5"
                  >
                    <div className="flex gap-3">
                      <div className="relative flex shrink-0 flex-col items-center">
                        <div className="z-10 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-[16px] font-bold text-white ring-4 ring-white">
                          리
                        </div>
                        <div className="mt-2 w-px flex-1 bg-slate-200" />
                      </div>

                      <div className="min-w-0 flex-1 pb-1">
                        <div className="mb-1 flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-[14px] font-bold text-slate-900">
                                @리갈약속
                              </span>
                              <span className="text-[12px] font-semibold text-slate-400">
                                {toKoDate(post.date)} {post.time}
                              </span>
                              {post.campaign_day && (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                  Day {post.campaign_day}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-slate-400">
                                Threads
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  STATUS[post.status].bg,
                                  STATUS[post.status].text,
                                )}
                              >
                                {STATUS[post.status].label}
                              </span>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                  pm.chipBg,
                                  pm.chipText,
                                )}
                              >
                                {pm.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Link
                              href={`/projects/${projectId}/promotion/post/${post.id}`}
                              className="flex h-8 items-center gap-1.5 rounded-full border border-slate-100 px-3 text-[12px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              상세 보기
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-rose-100 text-rose-500 transition-colors hover:bg-rose-50"
                              aria-label="홍보글 삭제"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="pt-1">
                          <p className="text-[17px] font-bold leading-7 text-slate-900">
                            {post.hook}
                          </p>
                          <p className="mt-3 whitespace-pre-line text-[15px] font-medium leading-7 text-slate-700">
                            {post.content}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center gap-5 text-slate-400">
                          <button className="text-[13px] font-semibold hover:text-slate-600">
                            좋아요
                          </button>
                          <button className="text-[13px] font-semibold hover:text-slate-600">
                            댓글
                          </button>
                          <button className="text-[13px] font-semibold hover:text-slate-600">
                            공유
                          </button>
                          <span className="ml-auto text-[12px] font-bold text-slate-300">
                            {textLength} / 500
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="px-8 py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <MessagesSquare className="h-5 w-5" />
                </div>
                <p className="text-[14px] font-bold text-slate-500">
                  아직 표시할 홍보글이 없습니다.
                </p>
                <Link
                  href={`/projects/${projectId}/promotion/campaign/new`}
                  className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-slate-900 px-4 text-[13px] font-bold text-white transition-colors hover:bg-slate-800"
                >
                  <Sparkles className="h-4 w-4" />
                  2주 전략 생성
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
