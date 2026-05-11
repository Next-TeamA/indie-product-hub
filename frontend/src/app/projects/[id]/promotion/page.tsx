"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Settings, ArrowRight, X, FileText } from "lucide-react";
import Link from "next/link";
import {
  listPromotions,
  getProjectPromotionInfo,
  updateProjectPromotionInfo,
  type Promotion,
  type Platform,
  type PromotionStatus,
  type ProjectPromotionInfo,
} from "@/lib/api/promotion";
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

  // Project info drawer
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [infoForm, setInfoForm] = useState<Omit<ProjectPromotionInfo, "project_id" | "updated_at">>({
    service_name: "", description: "", target_user: "", key_values: "",
    site_url: "", default_hashtags: [], logo_url: null,
  });
  const [hashtagInput, setHashtagInput] = useState("");
  const [infoSaving,   setInfoSaving]   = useState(false);

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

  const openInfoDrawer = async () => {
    setShowInfoDrawer(true);
    try {
      const info = await getProjectPromotionInfo(projectId);
      setInfoForm({
        service_name:     info.service_name,
        description:      info.description,
        target_user:      info.target_user,
        key_values:       info.key_values,
        site_url:         info.site_url,
        default_hashtags: info.default_hashtags,
        logo_url:         info.logo_url,
      });
      setHashtagInput(info.default_hashtags.join(", "));
    } catch (e) {
      console.error(e);
    }
  };

  const saveInfoDrawer = async () => {
    setInfoSaving(true);
    try {
      const tags = hashtagInput
        .split(/[,\s]+/)
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => (t.startsWith("#") ? t : `#${t}`));
      await updateProjectPromotionInfo(projectId, { ...infoForm, default_hashtags: tags });
      setShowInfoDrawer(false);
    } catch (e) {
      console.error(e);
    } finally {
      setInfoSaving(false);
    }
  };

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
          <button
            onClick={openInfoDrawer}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            <FileText className="w-4 h-4" />
            프로젝트 정보
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

      {/* Project Info Drawer */}
      {showInfoDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowInfoDrawer(false)}
          />
          {/* Drawer */}
          <motion.div
            className="relative z-10 w-[520px] h-full bg-card border-l border-border shadow-2xl flex flex-col"
            initial={{ x: 520 }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-border shrink-0">
              <div>
                <h2 className="text-lg font-bold">프로젝트 정보</h2>
                <p className="text-xs text-muted-foreground mt-0.5">홍보글 AI 생성에 사용되는 기본 정보입니다.</p>
              </div>
              <button
                onClick={() => setShowInfoDrawer(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable fields */}
            <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-5">

              <DrawerField label="서비스 이름" hint="제품/서비스의 공식 이름">
                <input
                  value={infoForm.service_name}
                  onChange={e => setInfoForm(f => ({ ...f, service_name: e.target.value }))}
                  placeholder="예) TaskFlow"
                  className="input-hero h-11 px-3.5 text-sm w-full"
                />
              </DrawerField>

              <DrawerField label="핵심 설명" hint="한 문장으로 서비스를 설명해주세요">
                <textarea
                  value={infoForm.description}
                  onChange={e => setInfoForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="예) 체크박스 하나로 시작하는 PM 도구"
                  className="input-hero px-3.5 py-3 text-sm w-full resize-none"
                  rows={3}
                />
              </DrawerField>

              <DrawerField label="타겟 사용자" hint="누구를 위한 서비스인가요?">
                <textarea
                  value={infoForm.target_user}
                  onChange={e => setInfoForm(f => ({ ...f, target_user: e.target.value }))}
                  placeholder="예) 인디 메이커, 1인 PM, 사이드 프로젝트를 운영하는 개발자"
                  className="input-hero px-3.5 py-3 text-sm w-full resize-none"
                  rows={3}
                />
              </DrawerField>

              <DrawerField label="핵심 가치" hint="서비스의 강점을 한 줄씩 입력하세요">
                <textarea
                  value={infoForm.key_values}
                  onChange={e => setInfoForm(f => ({ ...f, key_values: e.target.value }))}
                  placeholder={"예) 빈 줄에 한 줄 PRD가 됨\n예) 체크박스로 진행 관리\n예) 복잡한 설정 없이 바로 시작"}
                  className="input-hero px-3.5 py-3 text-sm w-full resize-none"
                  rows={5}
                />
              </DrawerField>

              <DrawerField label="사이트 주소">
                <input
                  value={infoForm.site_url}
                  onChange={e => setInfoForm(f => ({ ...f, site_url: e.target.value }))}
                  placeholder="https://example.com"
                  className="input-hero h-11 px-3.5 text-sm w-full"
                />
              </DrawerField>

              <DrawerField label="기본 해시태그" hint="쉼표 또는 스페이스로 구분, #은 자동 추가">
                <input
                  value={hashtagInput}
                  onChange={e => setHashtagInput(e.target.value)}
                  placeholder="예) 인디메이커, 빌드인퍼블릭, PM도구"
                  className="input-hero h-11 px-3.5 text-sm w-full"
                />
                {hashtagInput.trim() && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {hashtagInput
                      .split(/[,\s]+/)
                      .filter(t => t.trim())
                      .map(t => (t.startsWith("#") ? t : `#${t}`))
                      .map(tag => (
                        <span key={tag} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {tag}
                        </span>
                      ))}
                  </div>
                )}
              </DrawerField>

              <DrawerField label="브랜드 이미지" hint="로고 또는 대표 이미지 (홍보글에 사용)">
                <div className="w-full h-36 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
                  <span className="text-2xl">🖼</span>
                  <span>이미지를 드래그하거나 클릭해서 업로드</span>
                  <span className="text-xs text-muted-foreground/60">PNG, JPG · 최대 5MB</span>
                </div>
              </DrawerField>

            </div>

            {/* Drawer footer */}
            <div className="px-7 py-5 border-t border-border flex justify-end gap-2 shrink-0">
              <button
                onClick={() => setShowInfoDrawer(false)}
                className="h-10 px-5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveInfoDrawer}
                disabled={infoSaving}
                className="h-10 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {infoSaving ? "저장 중..." : "저장"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function DrawerField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <label className="text-sm font-semibold">{label}</label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}
