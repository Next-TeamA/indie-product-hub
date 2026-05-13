"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Clock, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useEvents, useEventActions } from "@/hooks/use-events";
import type { CalendarEvent } from "@/lib/api/events";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const EVENT_TYPES = [
  { value: "promotion",  label: "홍보",  dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400"    },
  { value: "deployment", label: "배포",  dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400" },
  { value: "marketing",  label: "마케팅", dot: "bg-pink-500",   badge: "bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-400"    },
  { value: "meeting",    label: "미팅",  dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  { value: "other",      label: "기타",  dot: "bg-amber-500",   badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"   },
] as const;

type EventType = typeof EVENT_TYPES[number]["value"];

type EventItem = {
  id: string;
  title: string;
  type: EventType;
  time: string;
  description: string;
};

type EventMap = Record<string, EventItem[]>;

const INITIAL_EVENTS: EventMap = {
  "2026-05-12": [
    { id: "1", title: "Product Hunt 런칭", type: "promotion",  time: "10:00", description: "Product Hunt 공식 런칭 및 커뮤니티 홍보" },
  ],
  "2026-05-14": [
    { id: "2", title: "v2.0 배포",         type: "deployment", time: "14:00", description: "주요 기능 업데이트 프로덕션 배포" },
    { id: "3", title: "배포 후 모니터링",   type: "meeting",    time: "16:00", description: "배포 안정화 확인 회의" },
  ],
  "2026-05-18": [
    { id: "4", title: "인스타그램 캠페인", type: "marketing",  time: "09:00", description: "신규 기능 소개 인스타그램 릴스 업로드" },
  ],
  "2026-05-22": [
    { id: "5", title: "블로그 포스트",     type: "promotion",  time: "11:00", description: "새 기능 소개 블로그 게시 및 SNS 배포" },
  ],
};

function getTypeInfo(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[4];
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}

const EMPTY_FORM = { title: "", type: "other" as EventType, time: "", description: "" };

export default function CalendarPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [current, setCurrent] = useState(() => new Date(today.getFullYear(), today.getMonth()));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  const { events: rawEvents, isLoading, mutate } = useEvents(projectId, monthStr);
  const { create, remove } = useEventActions(projectId);

  // Group API events by date (adapting CalendarEvent to local EventMap structure)
  const events = useMemo(() => {
    const map: Record<string, { id: string; title: string; type: EventType; time: string; description: string }[]> = {};
    for (const evt of rawEvents) {
      const d = evt.date;
      if (!map[d]) map[d] = [];
      map[d].push({
        id: evt.id,
        title: evt.title,
        type: (evt.event_type as EventType) || "other",
        time: evt.time ?? "",
        description: evt.description ?? "",
      });
    }
    return map;
  }, [rawEvents]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = (events[selectedDate] || []).slice().sort((a, b) => a.time.localeCompare(b.time));

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  const addEvent = async () => {
    if (!form.title.trim()) { setFormError("제목을 입력해 주세요."); return; }
    setIsSaving(true);
    try {
      await create({
        title: form.title.trim(),
        event_type: form.type,
        date: selectedDate,
        time: form.time || undefined,
        description: form.description.trim() || undefined,
      });
      await mutate();
      setIsModalOpen(false);
    } catch {
      setFormError("일정 추가에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await remove(id);
      await mutate();
    } catch {}
  };

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
        className="flex flex-col gap-6"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="h-eyebrow mb-1">CALENDAR</p>
            <h1 className="text-2xl font-bold tracking-tight">캘린더</h1>
          </div>
          <button
            onClick={openModal}
            className="flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            일정 추가
          </button>
        </div>

        {/* 달력 */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button
              onClick={() => setCurrent(new Date(year, month - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold">{year}년 {month + 1}월</h2>
            <button
              onClick={() => setCurrent(new Date(year, month + 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className={`text-center py-2 text-xs font-medium ${
                  i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dateStr = day ? toDateStr(year, month, day) : "";
              const dayEvents = dateStr ? events[dateStr] || [] : [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const isWeekend = i % 7 === 0 || i % 7 === 6;

              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDate(dateStr)}
                  className={[
                    "min-h-[84px] p-2 border-b border-r border-border last:border-r-0 [&:nth-child(7n)]:border-r-0 transition-colors",
                    !day ? "bg-muted/20" : "cursor-pointer",
                    isSelected && day ? "bg-primary/5" : day ? "hover:bg-muted/40" : "",
                  ].join(" ")}
                >
                  {day && (
                    <>
                      <span
                        className={[
                          "text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors",
                          isToday ? "bg-primary text-primary-foreground" :
                          isSelected ? "ring-2 ring-primary text-primary" :
                          isWeekend ? (i % 7 === 0 ? "text-red-400" : "text-blue-400") :
                          "text-foreground/70",
                        ].join(" ")}
                      >
                        {day}
                      </span>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {dayEvents.slice(0, 3).map(evt => {
                          const ti = getTypeInfo(evt.type);
                          return (
                            <div key={evt.id} className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ti.dot}`} />
                              <span className="text-[10px] text-muted-foreground truncate leading-tight">
                                {evt.time && <span className="mr-0.5 opacity-70">{evt.time}</span>}
                                {evt.title}
                              </span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground pl-2.5">+{dayEvents.length - 3}개</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 일별 상세 패널 */}
        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
              className="rounded-2xl border border-border bg-card overflow-hidden"
            >
              {/* 패널 헤더 */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm">{formatDateLabel(selectedDate)}</h3>
                  {selectedEvents.length > 0 && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {selectedEvents.length}개
                    </span>
                  )}
                </div>
                <button
                  onClick={openModal}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  추가
                </button>
              </div>

              {/* 일정 없음 */}
              {selectedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">이 날 일정이 없어요</p>
                  <button
                    onClick={openModal}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    + 일정 추가하기
                  </button>
                </div>
              ) : (
                /* 일정 목록 */
                <div className="divide-y divide-border">
                  {selectedEvents.map(evt => {
                    const ti = getTypeInfo(evt.type);
                    return (
                      <motion.div
                        key={evt.id}
                        layout
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-4 px-5 py-4 hover:bg-muted/30 transition-colors group"
                      >
                        {/* 컬러 세로 바 */}
                        <div className={`w-0.5 self-stretch rounded-full ${ti.dot} shrink-0 mt-0.5`} />

                        {/* 내용 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {evt.time && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                                <Clock className="w-3 h-3" />
                                {evt.time}
                              </span>
                            )}
                            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${ti.badge}`}>
                              {ti.label}
                            </span>
                          </div>
                          <p className="text-sm font-medium leading-snug">{evt.title}</p>
                          {evt.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{evt.description}</p>
                          )}
                        </div>

                        {/* 삭제 버튼 */}
                        <button
                          onClick={() => deleteEvent(evt.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 cursor-pointer shrink-0"
                          aria-label="일정 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* 일정 추가 모달 */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            {/* 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            {/* 모달 카드 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border p-6"
            >
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold">일정 추가</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateLabel(selectedDate)}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                {/* 제목 */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="일정 제목을 입력하세요"
                    value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(""); }}
                    onKeyDown={e => e.key === "Enter" && addEvent()}
                    autoFocus
                    className={[
                      "w-full h-10 px-3 rounded-lg border bg-background text-sm transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
                      formError ? "border-red-400" : "border-border",
                    ].join(" ")}
                  />
                  {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
                </div>

                {/* 시간 + 유형 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">시간</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">유형</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors cursor-pointer"
                    >
                      {EVENT_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 메모 */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">메모</label>
                  <textarea
                    placeholder="추가 메모 (선택 사항)"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>

                {/* 유형 미리보기 */}
                <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full ${getTypeInfo(form.type).dot}`} />
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${getTypeInfo(form.type).badge}`}>
                    {getTypeInfo(form.type).label}
                  </span>
                  {form.time && (
                    <span className="text-xs text-muted-foreground ml-1 tabular-nums">{form.time}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-1 truncate">
                    {form.title || "제목 없음"}
                  </span>
                </div>

                {/* 버튼 */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={addEvent}
                    className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    추가하기
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
