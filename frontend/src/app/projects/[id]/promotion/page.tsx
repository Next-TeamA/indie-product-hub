"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Settings, ArrowRight } from "lucide-react";
import Link from "next/link";
import { listPromotions, type Promotion, type Platform, type PromotionStatus } from "@/lib/api/promotion";
import { cn } from "@/lib/utils";

// --- Constants ---

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const KO_MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
const KO_DAYS   = ["일","월","화","수","목","금","토"];

const PLATFORM: Record<Platform, { label: string; chipBg: string; chipText: string }> = {
  threads: { label: "Th", chipBg: "bg-orange-100", chipText: "text-orange-700" },
  x:       { label: "X",  chipBg: "bg-zinc-100",   chipText: "text-zinc-700"   },
  bluesky: { label: "Bs", chipBg: "bg-sky-100",    chipText: "text-sky-700"    },
  mastodon:{ label: "Mt", chipBg: "bg-violet-100", chipText: "text-violet-700" },
};

const STATUS: Record<PromotionStatus, { label: string; bg: string; text: string }> = {
  draft:     { label: "초안",   bg: "bg-amber-100",   text: "text-amber-700"   },
  scheduled: { label: "예약됨", bg: "bg-blue-100",    text: "text-blue-700"    },
  published: { label: "발행됨", bg: "bg-emerald-100", text: "text-emerald-700" },
  failed:    { label: "실패",   bg: "bg-red-100",     text: "text-red-700"     },
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

  const today     = new Date();
  const todayStr  = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selected,  setSelected]  = useState<string>(todayStr);
  const [promos,    setPromos]    = useState<Promotion[]>([]);

  useEffect(() => {
    listPromotions(projectId).then(setPromos).catch(console.error);
  }, [projectId, viewYear, viewMonth]);

  // Build calendar cells
  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Stats
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekCount = promos.filter(p => {
    const d = new Date(p.date + "T00:00:00");
    return d >= weekStart && d <= weekEnd;
  }).length;
  const lastPub = [...promos]
    .filter(p => p.status === "published")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextSched = [...promos]
    .filter(p => p.status === "scheduled" && p.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];

  // Selected day
  const selectedPosts = byDate[selected] ?? [];
  const primaryPost   = selectedPosts[0];

  return (
    <div className="w-full flex flex-col h-dvh">
      {/* Header */}
      <motion.div
        className="border-b border-border px-8 py-5 flex items-center justify-between shrink-0"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <div>
          <p className="h-eyebrow mb-1">PROMOTION</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">홍보 캘린더</h1>
            <span className="text-base font-medium text-muted-foreground">
              {viewYear}년 {KO_MONTHS[viewMonth]}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <Link
            href={`/projects/${projectId}/promotion/post/new`}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            홍보 등록
          </Link>
        </div>
      </motion.div>

      {/* Stats bar */}
      <div className="border-b border-border px-8 py-2.5 flex items-center gap-6 text-sm shrink-0">
        <span className="text-muted-foreground">
          이번 주 <span className="font-semibold text-foreground tabular-nums">{weekCount} posts</span>
        </span>
        {lastPub && (
          <span className="text-muted-foreground">
            마지막 발행 <span className="font-medium text-foreground">{toKoDate(lastPub.date)}</span>
          </span>
        )}
        {nextSched && (
          <span className="text-muted-foreground">
            다음 예정 <span className="font-medium text-foreground">{toKoDate(nextSched.date)} {nextSched.time}</span>
          </span>
        )}
        <button className="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-xs">
          <Settings className="w-3.5 h-3.5" />
          설정
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Calendar */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5">
          {/* Weekday row */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                {d}
              </div>
            ))}
          </div>
          {/* Grid */}
          <div className="grid grid-cols-7 border-l border-t border-border flex-1">
            {cells.map((day, i) => {
              if (day === null) {
                return (
                  <div
                    key={`empty-${i}`}
                    className="border-r border-b border-border bg-muted/20"
                  />
                );
              }
              const dateStr  = toDateStr(viewYear, viewMonth, day);
              const isToday  = dateStr === todayStr;
              const isSel    = dateStr === selected;
              const dayPosts = byDate[dateStr] ?? [];

              return (
                <div
                  key={dateStr}
                  onClick={() => setSelected(dateStr)}
                  className={cn(
                    "border-r border-b border-border min-h-24 p-1.5 cursor-pointer transition-colors",
                    isSel ? "bg-primary/5" : "hover:bg-muted/40"
                  )}
                >
                  <div className="mb-1">
                    <span className={cn(
                      "w-6 h-6 inline-flex items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-foreground"
                    )}>
                      {day}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {dayPosts.map(post => {
                      const pm = PLATFORM[post.platform];
                      return (
                        <div
                          key={post.id}
                          className={cn(
                            "flex items-center gap-1 rounded px-1 py-0.5 text-xs leading-snug",
                            pm.chipBg, pm.chipText
                          )}
                        >
                          <span className="font-bold shrink-0 text-[10px]">{pm.label}</span>
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

        {/* Right panel */}
        <motion.aside
          className="w-72 shrink-0 border-l border-border flex flex-col overflow-y-auto"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
        >
          <div className="p-5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              선택한 날
            </p>
            <p className="text-lg font-bold mb-4">{toKoDate(selected)}</p>

            {/* Primary post card */}
            {primaryPost ? (
              <div className="bg-card border border-border rounded-xl p-4 mb-4 shadow-sm">
                {/* Meta row */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0",
                    PLATFORM[primaryPost.platform].chipBg,
                    PLATFORM[primaryPost.platform].chipText
                  )}>
                    {PLATFORM[primaryPost.platform].label}
                  </span>
                  <span className="text-xs text-muted-foreground">{primaryPost.time}</span>
                  <span className="text-xs font-medium truncate flex-1">{primaryPost.hook}</span>
                </div>
                {/* Content preview */}
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3 whitespace-pre-line">
                  {primaryPost.content}
                </p>
                {/* Image placeholder */}
                <div className="w-full h-20 rounded-lg bg-muted flex items-center justify-center mb-3">
                  <span className="text-[11px] text-muted-foreground/60">hero shot</span>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-[11px] font-medium px-2 py-0.5 rounded-full",
                    STATUS[primaryPost.status].bg,
                    STATUS[primaryPost.status].text
                  )}>
                    {STATUS[primaryPost.status].label}
                  </span>
                  <Link
                    href={`/projects/${projectId}/promotion/post/${primaryPost.id}`}
                    className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    상세
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-muted/40 rounded-xl p-4 mb-4 text-center">
                <p className="text-xs text-muted-foreground">예정된 게시물이 없습니다.</p>
                <Link
                  href={`/projects/${projectId}/promotion/post/new`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="w-3 h-3" />
                  추가하기
                </Link>
              </div>
            )}

            {/* Additional posts */}
            {selectedPosts.length > 1 && (
              <div className="flex flex-col gap-2 mb-4">
                {selectedPosts.slice(1).map(post => {
                  const pm = PLATFORM[post.platform];
                  return (
                    <Link
                      key={post.id}
                      href={`/projects/${projectId}/promotion/post/${post.id}`}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 border border-border hover:bg-muted/40 transition-colors"
                    >
                      <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0", pm.chipBg, pm.chipText)}>
                        {pm.label}
                      </span>
                      <span className="text-xs truncate">{post.hook}</span>
                      <span className={cn("ml-auto text-[10px] px-1.5 py-0.5 rounded-full shrink-0", STATUS[post.status].bg, STATUS[post.status].text)}>
                        {STATUS[post.status].label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-dashed border-border pt-4 mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                업종류
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["런칭", "업데이트", "회고", "Q&A"].map(tag => (
                  <span
                    key={tag}
                    className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground cursor-pointer hover:bg-muted/70 transition-colors"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
