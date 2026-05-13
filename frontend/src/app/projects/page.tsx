"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useProjects } from "@/hooks/use-projects";
import {
  Plus,
  ChevronDown,
  ArrowRight,
  Pencil,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Lightbulb,
  AlertCircle,
  ShieldCheck,
  Calendar as CalendarIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── 상수 및 Mock 데이터 ───────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 1. 전체 프로젝트 유의 사항 (Global Guidelines)
const GLOBAL_GUIDELINES = [
  {
    id: "g1",
    title: "런칭 전략",
    desc: "완벽한 제품보다 빠른 피드백 루프가 중요합니다. MVP 단위로 쪼개어 배포하세요.",
    icon: Lightbulb,
    color: "text-blue-500",
    bg: "bg-blue-50/50",
  },
  {
    id: "g2",
    title: "보안 체크리스트",
    desc: "모든 프로젝트의 SSL 인증서 만료일과 환경변수 보안 노출 여부를 주 단위로 점검하세요.",
    icon: ShieldCheck,
    color: "text-emerald-500",
    bg: "bg-emerald-50/50",
  },
  {
    id: "g3",
    title: "운영 주의사항",
    desc: "커뮤니티 홍보 시 직접적인 광고보다 가치 있는 인사이트 공유를 우선시하세요.",
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-50/50",
  },
];


const EVENT_TYPES = [
  {
    value: "promotion",
    label: "홍보",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-600",
  },
  {
    value: "deployment",
    label: "배포",
    dot: "bg-violet-500",
    badge: "bg-violet-50 text-violet-600",
  },
  {
    value: "meeting",
    label: "미팅",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-600",
  },
  {
    value: "other",
    label: "기타",
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-500",
  },
] as const;

const INITIAL_EVENTS = {
  "2026-05-12": [
    {
      id: "1",
      title: "Product Hunt 런칭",
      type: "promotion",
      time: "10:00",
      description: "전체 프로젝트 통합 런칭데이",
    },
  ],
  "2026-05-14": [
    {
      id: "2",
      title: "보안 패치 업데이트",
      type: "deployment",
      time: "14:00",
      description: "전체 서버 SSL 갱신",
    },
  ],
};

// ─── 헬퍼 함수 ───────────────────────────────────────────

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function ProjectsPage() {
  // --- API 연결 ---
  const { projects: apiProjects, isLoading } = useProjects();

  // API 데이터 있으면 사용, 없으면 mock fallback
  const projectList = apiProjects.map(p => ({
    id: p.id,
    name: p.name,
    handle: "",
    description: p.description ?? "",
    status: p.status === "active" ? "운영중" : "준비중",
    lastActivity: new Date(p.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    promotionCount: 0,
    issueCount: 0,
  }));

  // --- 상태 관리 ---
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [infoForm, setInfoForm] = useState({
    service_name: "",
    description: "",
  });

  // 캘린더 상태
  const today = new Date();
  const todayStr = toDateStr(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const [current, setCurrent] = useState(
    new Date(today.getFullYear(), today.getMonth()),
  );
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [events] = useState<any>(INITIAL_EVENTS);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
      {/* 1. Header */}
      <header className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between">
        <div className="text-lg font-bold tracking-tighter text-slate-900 uppercase">
          Indie Product Hub
        </div>
        <Link
          href="/projects/new"
          className="bg-slate-900 text-white flex items-center gap-2 text-[13px] font-semibold h-10 px-5 rounded-full hover:bg-slate-800 transition-all"
        >
          <Plus className="w-4 h-4" /> 새 프로젝트 등록
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20 space-y-12">
        {/* 2. Global Guidelines Section (유의 사항) */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-500 mb-4">
            Master Guidelines
          </p>
          <div className="grid grid-cols-3 gap-5">
            {GLOBAL_GUIDELINES.map((guide) => (
              <div
                key={guide.id}
                className={cn(
                  "rounded-[20px] p-6 border border-slate-100 shadow-sm",
                  guide.bg,
                )}
              >
                <guide.icon className={cn("w-5 h-5 mb-4", guide.color)} />
                <h3 className="text-[15px] font-bold text-slate-800 mb-2">
                  {guide.title}
                </h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  {guide.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Project List Section */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-[24px] font-bold tracking-tight text-slate-800">
              현재{" "}
              <span className="text-blue-600">{projectList.length}개</span>의
              프로젝트를 관리 중입니다
            </h2>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="grid grid-cols-[80px_1fr_80px_80px_80px_24px] gap-6 px-8 py-4 border-b border-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div>상태</div>
              <div>계정</div>
              <div>홍보</div>
              <div className="text-center">현황</div>
              <div className="text-center">이슈</div>
              <div></div>
            </div>

            <div className="divide-y divide-slate-50">
              {projectList.map((project) => (
                <div
                  key={project.id}
                  className="transition-colors hover:bg-slate-50/30"
                >
                  <div
                    className="grid grid-cols-[80px_1fr_80px_80px_80px_24px] gap-6 px-8 py-6 items-center cursor-pointer"
                    onClick={() =>
                      setExpandedId(
                        expandedId === project.id ? null : project.id,
                      )
                    }
                  >
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2 py-0.5 rounded-md",
                        project.status === "운영중"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-amber-50 text-amber-600",
                      )}
                    >
                      {project.status}
                    </span>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-900" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">
                            {project.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setInfoForm({
                                service_name: project.name,
                                description: project.description,
                              });
                              setShowInfoDrawer(true);
                            }}
                            className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[12px] font-medium text-slate-400">
                          {project.handle}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-slate-700">
                      {project.promotionCount}건
                    </div>
                    <div className="text-[13px] font-medium text-slate-400 text-center">
                      {project.lastActivity}
                    </div>
                    <div
                      className={cn(
                        "text-[13px] font-bold text-center",
                        project.issueCount > 0
                          ? "text-rose-500"
                          : "text-slate-200",
                      )}
                    >
                      {project.issueCount > 0 ? `${project.issueCount}건` : "-"}
                    </div>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 text-slate-300 transition-transform",
                        expandedId === project.id && "rotate-180",
                      )}
                    />
                  </div>
                  <AnimatePresence>
                    {expandedId === project.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-slate-50/30"
                      >
                        <div className="px-8 pb-8 pt-2 grid grid-cols-[80px_1fr_120px] gap-6">
                          <div />
                          <div className="border-t border-slate-100 pt-6">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                              Description
                            </p>
                            <p className="text-[14px] font-medium text-slate-600 mb-6">
                              {project.description}
                            </p>
                            <Link
                              href={`/projects/${project.id}`}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-slate-200 bg-white text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                            >
                              대시보드 입장 <ArrowRight className="w-4 h-4" />
                            </Link>
                          </div>
                          <div />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Global Calendar Section (통합 일정) */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-500 mb-1">
                Global Roadmap
              </p>
              <h2 className="text-[22px] font-bold text-slate-800">
                통합 운영 일정
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrent(new Date(year, month - 1))}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-[13px] font-bold text-slate-700 px-2">
                {year}년 {month + 1}월
              </span>
              <button
                onClick={() => setCurrent(new Date(year, month + 1))}
                className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 달력 그리드 */}
            <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-50">
                {DAYS.map((d, i) => (
                  <div
                    key={d}
                    className={cn(
                      "py-3 text-center text-[11px] font-bold uppercase tracking-widest",
                      i === 0
                        ? "text-rose-400"
                        : i === 6
                          ? "text-blue-400"
                          : "text-slate-400",
                    )}
                  >
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-50 border-l border-t border-transparent">
                {cells.map((day, i) => {
                  const dStr = day ? toDateStr(year, month, day) : "";
                  const hasEvents = events[dStr];
                  return (
                    <div
                      key={i}
                      onClick={() => day && setSelectedDate(dStr)}
                      className={cn(
                        "min-h-[90px] p-2 transition-all cursor-pointer",
                        !day && "bg-slate-50/30",
                        selectedDate === dStr
                          ? "bg-blue-50/30"
                          : "hover:bg-slate-50/50",
                      )}
                    >
                      {day && (
                        <>
                          <span
                            className={cn(
                              "text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1",
                              dStr === todayStr
                                ? "bg-slate-900 text-white shadow-md"
                                : "text-slate-400",
                            )}
                          >
                            {day}
                          </span>
                          <div className="space-y-1">
                            {hasEvents?.slice(0, 2).map((e: any) => (
                              <div
                                key={e.id}
                                className={cn(
                                  "h-1.5 w-full rounded-full opacity-60",
                                  EVENT_TYPES.find((t) => t.value === e.type)
                                    ?.dot,
                                )}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 선택 날짜 상세 */}
            <div className="bg-slate-50/50 rounded-[24px] border border-slate-100 p-6">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Selected Day
              </p>
              <h3 className="text-[18px] font-bold text-slate-800 mb-6">
                {selectedDate}
              </h3>
              <div className="space-y-4">
                {events[selectedDate] ? (
                  events[selectedDate].map((e: any) => {
                    const type = EVENT_TYPES.find((t) => t.value === e.type);
                    return (
                      <div
                        key={e.id}
                        className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm border-l-4 border-l-slate-800"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                              type?.badge,
                            )}
                          >
                            {type?.label}
                          </span>
                          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {e.time}
                          </span>
                        </div>
                        <p className="text-[14px] font-bold text-slate-800 mb-1">
                          {e.title}
                        </p>
                        <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                          {e.description}
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-12 text-center">
                    <CalendarIcon className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-[13px] font-medium text-slate-400">
                      등록된 일정이 없습니다
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Project Info Edit Drawer */}
      <AnimatePresence>
        {showInfoDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
              onClick={() => setShowInfoDrawer(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
            >
              <div className="px-8 py-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-slate-800">
                    프로젝트 편집
                  </h2>
                  <p className="text-[12px] font-medium text-slate-400">
                    기본 정보를 업데이트합니다.
                  </p>
                </div>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Service Name
                  </label>
                  <input
                    value={infoForm.service_name}
                    onChange={(e) =>
                      setInfoForm({ ...infoForm, service_name: e.target.value })
                    }
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    value={infoForm.description}
                    onChange={(e) =>
                      setInfoForm({ ...infoForm, description: e.target.value })
                    }
                    rows={4}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>
              <div className="p-8 border-t border-slate-50 flex gap-3">
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600"
                >
                  취소
                </button>
                <button
                  onClick={() => setShowInfoDrawer(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800"
                >
                  저장하기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
