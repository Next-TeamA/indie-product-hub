"use client";

import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 임시 mock 이벤트
const MOCK_EVENTS: Record<string, { title: string; color: string }[]> = {
  "2026-05-12": [
    { title: "PH 런칭", color: "bg-blue-500" },
  ],
  "2026-05-14": [
    { title: "v2.0 배포", color: "bg-violet-500" },
  ],
  "2026-05-18": [
    { title: "IG 캠페인", color: "bg-pink-500" },
  ],
  "2026-05-22": [
    { title: "블로그 포스트", color: "bg-emerald-500" },
  ],
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date(2026, 4)); // 2026년 5월
  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const today = new Date();

  const prev = () => setCurrent(new Date(year, month - 1));
  const next = () => setCurrent(new Date(year, month + 1));

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="h-eyebrow mb-1">CALENDAR</p>
            <h1 className="text-2xl font-bold tracking-tight">캘린더</h1>
          </div>
          <button className="btn-hero bg-primary text-primary-foreground flex items-center gap-2 text-sm h-10 px-5 cursor-pointer">
            <Plus className="w-4 h-4" />
            일정 추가
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <button
              onClick={prev}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-semibold">
              {year}년 {month + 1}월
            </h2>
            <button
              onClick={next}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 요일 */}
          <div className="grid grid-cols-7 border-b border-border">
            {DAYS.map((day) => (
              <div
                key={day}
                className="text-center py-2 text-xs font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dateStr = day
                ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                : "";
              const events = dateStr ? MOCK_EVENTS[dateStr] || [] : [];
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

              return (
                <div
                  key={i}
                  className={`min-h-[80px] p-2 border-b border-r border-border
                              last:border-r-0 [&:nth-child(7n)]:border-r-0
                              ${!day ? "bg-muted/30" : "hover:bg-muted/40 transition-colors cursor-pointer"}`}
                >
                  {day && (
                    <>
                      <span
                        className={`text-xs font-medium inline-flex items-center justify-center
                                    ${
                                      isToday
                                        ? "w-6 h-6 rounded-full bg-primary text-primary-foreground"
                                        : "text-foreground/70"
                                    }`}
                      >
                        {day}
                      </span>
                      <div className="mt-1 flex flex-col gap-0.5">
                        {events.map((evt, j) => (
                          <div
                            key={j}
                            className="flex items-center gap-1"
                          >
                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${evt.color}`}
                            />
                            <span className="text-[10px] text-muted-foreground truncate">
                              {evt.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
