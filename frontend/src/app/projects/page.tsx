"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useProjects } from "@/hooks/use-projects";
import {
  Plus, ArrowRight, Pencil, X, ChevronLeft, ChevronRight,
  Clock, Lightbulb, AlertCircle, ShieldCheck, Calendar as CalendarIcon,
  Settings, Trash2, ImagePlus, Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { updateProject, deleteProject } from "@/lib/api/projects";
import { listAllEvents, createEvent, deleteEvent, type CalendarEvent } from "@/lib/api/events";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/use-user";

// ─── 상수 ────────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const GLOBAL_GUIDELINES = [
  { id: "g1", title: "런칭 전략", desc: "완벽한 제품보다 빠른 피드백 루프가 중요합니다. MVP 단위로 쪼개어 배포하세요.", icon: Lightbulb, color: "text-blue-500", bg: "bg-blue-50/50" },
  { id: "g2", title: "보안 체크리스트", desc: "모든 프로젝트의 SSL 인증서 만료일과 환경변수 보안 노출 여부를 주 단위로 점검하세요.", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50/50" },
  { id: "g3", title: "운영 주의사항", desc: "커뮤니티 홍보 시 직접적인 광고보다 가치 있는 인사이트 공유를 우선시하세요.", icon: AlertCircle, color: "text-amber-500", bg: "bg-amber-50/50" },
];

const EVENT_TYPES = [
  { value: "promotion",  label: "홍보", dot: "bg-blue-500",    badge: "bg-blue-50 text-blue-600"       },
  { value: "deployment", label: "배포", dot: "bg-violet-500",  badge: "bg-violet-50 text-violet-600"   },
  { value: "meeting",    label: "미팅", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-600" },
  { value: "other",      label: "기타", dot: "bg-slate-400",   badge: "bg-slate-50 text-slate-500"     },
] as const;

const toDateStr = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const toMonthStr = (y: number, m: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}`;

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const user = useUser();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { projects: apiProjects, mutate } = useProjects();

  const projectList = apiProjects.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    logo_url: p.logo_url,
    lastActivity: new Date(p.updated_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
    promotionCount: 0,
    issueCount: 0,
  }));

  // ── 프로젝트 편집 ──
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoForm, setInfoForm] = useState({ service_name: "", description: "", logo_url: "" });
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // ── 프로젝트 삭제 ──
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // ── 캘린더 ──
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth()));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [calEvents, setCalEvents] = useState<Record<string, CalendarEvent[]>>({});
  const [calLoading, setCalLoading] = useState(false);

  // ── 일정 추가 모달 ──
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "", event_type: "other", time: "", description: "", project_id: "",
  });
  const [eventSaving, setEventSaving] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  // ── 캘린더 이벤트 로드 ──
  const loadCalEvents = useCallback(async (y: number, m: number) => {
    setCalLoading(true);
    try {
      const data = await listAllEvents(toMonthStr(y, m));
      const grouped: Record<string, CalendarEvent[]> = {};
      data.forEach(e => {
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e);
      });
      setCalEvents(grouped);
    } catch {
      // 조용히 실패 (프로젝트 없을 때 등)
    } finally {
      setCalLoading(false);
    }
  }, []);

  useEffect(() => { loadCalEvents(year, month); }, [year, month, loadCalEvents]);

  // ── 이미지 업로드 ──
  const handleImageUpload = async (file: File) => {
    if (!editingId) return;
    setUploading(true);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${editingId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("project-images").upload(path, file, { upsert: true });
      if (!error) {
        const { data: urlData } = supabase.storage.from("project-images").getPublicUrl(path);
        setInfoForm(f => ({ ...f, logo_url: urlData.publicUrl }));
      }
    } finally {
      setUploading(false);
    }
  };

  // ── 프로젝트 저장 ──
  const handleSaveProject = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updateProject(editingId, {
        name: infoForm.service_name,
        description: infoForm.description,
        ...(infoForm.logo_url ? { logo_url: infoForm.logo_url } : {}),
      });
      await mutate();
      setShowInfoDrawer(false);
    } finally {
      setSaving(false);
    }
  };

  // ── 프로젝트 삭제 ──
  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await deleteProject(deleteTarget.id);
      await mutate();
      setDeleteTarget(null);
    } finally {
      setDeletingId(null);
    }
  };

  // ── 일정 추가 ──
  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.project_id) return;
    setEventSaving(true);
    try {
      await createEvent(eventForm.project_id, {
        title: eventForm.title,
        event_type: eventForm.event_type,
        date: selectedDate,
        time: eventForm.time || undefined,
        description: eventForm.description || undefined,
      });
      setShowEventModal(false);
      setEventForm({ title: "", event_type: "other", time: "", description: "", project_id: "" });
      await loadCalEvents(year, month);
    } finally {
      setEventSaving(false);
    }
  };

  // ── 일정 삭제 ──
  const handleDeleteEvent = async (projectId: string, eventId: string) => {
    await deleteEvent(projectId, eventId);
    await loadCalEvents(year, month);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-dvh bg-white selection:bg-slate-800 selection:text-white">
      {/* 헤더 */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <span className="logo-text text-[17px] text-slate-900">
          Launch<span className="text-blue-500">.</span>Pad
        </span>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="설정">
            <Settings className="w-5 h-5" />
          </Link>
          <Link href="/projects/new" className="bg-slate-900 text-white flex items-center gap-2 text-[13px] font-semibold h-9 px-4 rounded-full hover:bg-slate-800 transition-all">
            <Plus className="w-4 h-4" /> 새 프로젝트
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 hover:bg-slate-300 transition-colors cursor-pointer overflow-hidden"
            >
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                : user?.name?.[0]?.toUpperCase() ?? "U"}
            </button>
            {showUserMenu && (
              <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-800 truncate">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
                </div>
                <Link href="/settings" className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setShowUserMenu(false)}>계정 설정</Link>
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">로그아웃</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-20 space-y-12">
        {/* Master Guidelines */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-500 mb-4">Master Guidelines</p>
          <div className="grid grid-cols-3 gap-5">
            {GLOBAL_GUIDELINES.map(guide => (
              <div key={guide.id} className={cn("rounded-[20px] p-6 border border-slate-100 shadow-sm", guide.bg)}>
                <guide.icon className={cn("w-5 h-5 mb-4", guide.color)} />
                <h3 className="text-[15px] font-bold text-slate-800 mb-2">{guide.title}</h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">{guide.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 프로젝트 목록 */}
        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-[24px] font-bold tracking-tight text-slate-800">
              현재 <span className="text-blue-600">{projectList.length}개</span>의 프로젝트를 관리 중입니다
            </h2>
          </div>

          <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="grid grid-cols-[1fr_80px_80px_80px_72px] gap-6 px-8 py-4 border-b border-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div>프로젝트 이름</div>
              <div>홍보</div>
              <div className="text-center">현황</div>
              <div className="text-center">이슈</div>
              <div></div>
            </div>

            <div className="divide-y divide-slate-50">
              {projectList.map(project => (
                <div key={project.id} className="transition-colors hover:bg-slate-50/30">
                  <div className="grid grid-cols-[1fr_80px_80px_80px_72px] gap-6 px-8 py-5 items-center">
                    {/* 이름 + 편집 버튼 */}
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0 overflow-hidden">
                        {project.logo_url
                          ? <img src={project.logo_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-slate-900 rounded-full" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800">{project.name}</span>
                          <button
                            onClick={() => {
                              setEditingId(project.id);
                              setInfoForm({ service_name: project.name, description: project.description, logo_url: project.logo_url ?? "" });
                              setImagePreview(project.logo_url ?? null);
                              setShowInfoDrawer(true);
                            }}
                            className="p-1 text-slate-300 hover:text-blue-500 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-[12px] font-medium text-slate-400 truncate max-w-[280px]">{project.description}</p>
                      </div>
                    </div>

                    <div className="font-bold text-slate-700">{project.promotionCount}건</div>
                    <div className="text-[13px] font-medium text-slate-400 text-center">{project.lastActivity}</div>
                    <div className={cn("text-[13px] font-bold text-center", project.issueCount > 0 ? "text-rose-500" : "text-slate-200")}>
                      {project.issueCount > 0 ? `${project.issueCount}건` : "-"}
                    </div>

                    {/* 액션 버튼: 삭제 + 대시보드 입장 */}
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => setDeleteTarget({ id: project.id, name: project.name })}
                        className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:border-rose-300 transition-all"
                        title="프로젝트 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <Link
                        href={`/projects/${project.id}`}
                        className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                        title="대시보드 입장"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 통합 운영 일정 */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-500 mb-1">Global Roadmap</p>
              <h2 className="text-[22px] font-bold text-slate-800">통합 운영 일정</h2>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setCurrent(new Date(year, month - 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <span className="text-[13px] font-bold text-slate-700 px-2">{year}년 {month + 1}월</span>
              <button onClick={() => setCurrent(new Date(year, month + 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all">
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 달력 그리드 */}
            <div className="lg:col-span-2 bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-slate-50">
                {DAYS.map((d, i) => (
                  <div key={d} className={cn("py-3 text-center text-[11px] font-bold uppercase tracking-widest", i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-slate-400")}>
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-50 border-l border-t border-transparent">
                {cells.map((day, i) => {
                  const dStr = day ? toDateStr(year, month, day) : "";
                  const dayEvents = calEvents[dStr] ?? [];
                  return (
                    <div
                      key={i}
                      onClick={() => day && setSelectedDate(dStr)}
                      className={cn("min-h-[90px] p-2 transition-all cursor-pointer", !day && "bg-slate-50/30", selectedDate === dStr ? "bg-blue-50/30" : "hover:bg-slate-50/50")}
                    >
                      {day && (
                        <>
                          <span className={cn("text-[13px] font-bold w-7 h-7 flex items-center justify-center rounded-full mb-1", dStr === todayStr ? "bg-slate-900 text-white shadow-md" : "text-slate-400")}>
                            {day}
                          </span>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 2).map(e => (
                              <div key={e.id} className={cn("h-1.5 w-full rounded-full opacity-60", EVENT_TYPES.find(t => t.value === e.event_type)?.dot ?? "bg-slate-300")} />
                            ))}
                            {dayEvents.length > 2 && <div className="text-[9px] text-slate-400 pl-0.5">+{dayEvents.length - 2}</div>}
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
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Selected Day</p>
                <button
                  onClick={() => {
                    setEventForm(f => ({ ...f, project_id: apiProjects[0]?.id ?? "" }));
                    setShowEventModal(true);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> 일정 추가
                </button>
              </div>
              <h3 className="text-[18px] font-bold text-slate-800 mb-5">{selectedDate}</h3>

              <div className="space-y-3">
                {(calEvents[selectedDate] ?? []).length > 0 ? (
                  (calEvents[selectedDate] ?? []).map(e => {
                    const type = EVENT_TYPES.find(t => t.value === e.event_type);
                    return (
                      <div key={e.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm border-l-4 border-l-slate-800 group relative">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", type?.badge)}>{type?.label}</span>
                          {e.time && <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{e.time}</span>}
                          {e.project_name && <span className="text-[10px] text-slate-300 ml-auto">{e.project_name}</span>}
                        </div>
                        <p className="text-[14px] font-bold text-slate-800">{e.title}</p>
                        {e.description && <p className="text-[12px] font-medium text-slate-500 mt-1 leading-relaxed">{e.description}</p>}
                        <button
                          onClick={() => handleDeleteEvent(e.project_id, e.id)}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center">
                    <CalendarIcon className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-[13px] font-medium text-slate-400">등록된 일정이 없습니다</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── 프로젝트 편집 드로어 ── */}
      <AnimatePresence>
        {showInfoDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowInfoDrawer(false)} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col"
            >
              <div className="px-8 py-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-[18px] font-bold text-slate-800">프로젝트 편집</h2>
                  <p className="text-[12px] font-medium text-slate-400">기본 정보를 업데이트합니다.</p>
                </div>
                <button onClick={() => setShowInfoDrawer(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6 flex-1 overflow-y-auto">
                {/* 이미지 업로드 */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">프로젝트 이미지</label>
                  <div className="flex items-center gap-4">
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all overflow-hidden group"
                    >
                      {imagePreview ? (
                        <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-7 h-7 text-slate-300 group-hover:text-blue-400 transition-colors" />
                      )}
                    </div>
                    <div>
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 hover:text-blue-500 transition-colors disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading ? "업로드 중..." : "이미지 선택"}
                      </button>
                      <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, WebP 권장</p>
                    </div>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Service Name</label>
                  <input
                    value={infoForm.service_name}
                    onChange={e => setInfoForm({ ...infoForm, service_name: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
                  <textarea
                    value={infoForm.description}
                    onChange={e => setInfoForm({ ...infoForm, description: e.target.value })}
                    rows={4}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="p-8 border-t border-slate-50 flex gap-3">
                <button onClick={() => setShowInfoDrawer(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600">
                  취소
                </button>
                <button onClick={handleSaveProject} disabled={saving || uploading} className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 disabled:opacity-50">
                  {saving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 프로젝트 삭제 확인 팝업 ── */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
              onClick={() => !deletingId && setDeleteTarget(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="relative z-10 w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-8 flex flex-col gap-5"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto">
                <Trash2 className="w-5 h-5 text-rose-500" />
              </div>
              <div className="text-center">
                <h2 className="text-[18px] font-bold text-slate-800 mb-2">정말 삭제하시겠습니까?</h2>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                  <span className="font-bold text-slate-700">"{deleteTarget.name}"</span> 프로젝트와<br />
                  모든 관련 데이터가 영구적으로 삭제됩니다.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!deletingId}
                  className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={!!deletingId}
                  className="flex-1 h-11 rounded-xl bg-rose-500 text-white text-[13px] font-bold hover:bg-rose-600 disabled:opacity-50"
                >
                  {deletingId ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 일정 추가 모달 ── */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowEventModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative z-10 w-full max-w-md bg-white rounded-[24px] shadow-2xl p-8 flex flex-col gap-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-bold text-slate-800">일정 추가</h2>
                <button onClick={() => setShowEventModal(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2.5">
                <CalendarIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] font-semibold text-slate-700">{selectedDate}</span>
              </div>

              <div className="space-y-4">
                {/* 프로젝트 선택 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">프로젝트</label>
                  <select
                    value={eventForm.project_id}
                    onChange={e => setEventForm(f => ({ ...f, project_id: e.target.value }))}
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                  >
                    <option value="">선택하세요</option>
                    {apiProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* 제목 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">일정 제목</label>
                  <input
                    value={eventForm.title}
                    onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="어떤 일정인가요?"
                    className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {/* 유형 + 시간 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">유형</label>
                    <select
                      value={eventForm.event_type}
                      onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                      {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">시간 (선택)</label>
                    <input
                      type="time"
                      value={eventForm.time}
                      onChange={e => setEventForm(f => ({ ...f, time: e.target.value }))}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 메모 */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">메모 (선택)</label>
                  <textarea
                    value={eventForm.description}
                    onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-[14px] focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowEventModal(false)} className="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold text-slate-600">
                  취소
                </button>
                <button
                  onClick={handleCreateEvent}
                  disabled={eventSaving || !eventForm.title || !eventForm.project_id}
                  className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 disabled:opacity-50"
                >
                  {eventSaving ? "추가 중..." : "일정 추가"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
