"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ChevronLeft, Copy, Trash2, Save, Sparkles, Send } from "lucide-react";
import {
  listPromotions,
  updatePromotion,
  deletePromotion,
  getProjectPromotionInfo,
  type Promotion,
  type Platform,
  type PromotionStatus,
  type ProjectPromotionInfo,
} from "@/lib/api/promotion";
import { cn } from "@/lib/utils";

// --- Constants ---

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

const PLATFORM_META: Record<Platform, { name: string; bg: string; text: string; maxChars: number }> = {
  threads: { name: "Threads", bg: "bg-orange-100", text: "text-orange-700", maxChars: 500 },
  x:       { name: "X",       bg: "bg-zinc-100",   text: "text-zinc-700",   maxChars: 280 },
  bluesky: { name: "Bluesky", bg: "bg-sky-100",    text: "text-sky-700",    maxChars: 300 },
  mastodon:{ name: "Mastodon",bg: "bg-violet-100", text: "text-violet-700", maxChars: 500 },
};

const STATUS_META: Record<PromotionStatus, { label: string; bg: string; text: string }> = {
  draft:     { label: "초안",   bg: "bg-amber-100",   text: "text-amber-700"   },
  scheduled: { label: "예약됨", bg: "bg-blue-100",    text: "text-blue-700"    },
  published: { label: "발행됨", bg: "bg-emerald-100", text: "text-emerald-700" },
  failed:    { label: "실패",   bg: "bg-red-100",     text: "text-red-700"     },
};

const TONES = ["친근한", "전문적", "유머"] as const;
type Tone = typeof TONES[number];

const CONTENT_TYPES = ["출시", "회고", "업데이트", "Q&A"] as const;
type ContentType = typeof CONTENT_TYPES[number];

// --- Helpers ---

function toKoDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} (${KO_DAYS[d.getDay()]})`;
}

// Mock AI generation — 실제 연동 시 이 함수를 API 호출로 교체
function mockGenerate(opts: {
  projectInfo: ProjectPromotionInfo;
  message: string;
  tone: Tone;
  contentType: ContentType;
  reference: string;
  platform: Platform;
}): { hook: string; content: string; hashtags: string[] } {
  const { projectInfo, message, tone, contentType, reference } = opts;

  const hooks: Record<Tone, string> = {
    "친근한": `${projectInfo.service_name}으로 더 가볍게 시작하세요`,
    "전문적": `${projectInfo.service_name}: ${projectInfo.description}`,
    "유머":   `복잡한 도구는 이제 그만 👋`,
  };

  const bodies: Record<ContentType, string> = {
    "출시":    `${projectInfo.service_name}이 출시되었습니다.\n\n${message || projectInfo.description}\n→ ${reference || "지금 바로 시작해보세요"}`,
    "회고":    `${projectInfo.service_name} 솔직한 회고\n\n${message || projectInfo.key_values.split("\n")[0] || "꾸준한 빌드"}\n\n다음 달엔 더 잘할 수 있을 것 같습니다.`,
    "업데이트":`새로운 업데이트가 나왔습니다!\n\n${message || projectInfo.key_values}\n\n사용해보고 피드백 남겨주세요 🙏`,
    "Q&A":     `자주 받는 질문에 답해드립니다.\n\nQ: ${reference || "왜 만들었나요?"}\nA: ${message || projectInfo.description}`,
  };

  return {
    hook: hooks[tone],
    content: bodies[contentType],
    hashtags: ["#인디메이커", `#${projectInfo.service_name.replace(/\s/g, "")}`, "#빌드인퍼블릭"],
  };
}

// --- Component ---

export default function PostEditorPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>();
  const router = useRouter();

  const isNew = postId === "new";

  // Loaded data
  const [promotion,    setPromotion]    = useState<Promotion | null>(null);
  const [projectInfo,  setProjectInfo]  = useState<ProjectPromotionInfo | null>(null);
  const [loading,      setLoading]      = useState(!isNew);

  // Editable right-side state
  const [editHook,       setEditHook]       = useState("");
  const [editContent,    setEditContent]    = useState("");
  const [editHashtags,   setEditHashtags]   = useState<string[]>([]);
  const [editStatus,     setEditStatus]     = useState<PromotionStatus>("draft");
  const [activePlatform, setActivePlatform] = useState<Platform>("threads");

  // Left-side: 홍보 방향 입력
  const [message,           setMessage]           = useState("");   // 이번 포스트 핵심 메시지
  const [tone,              setTone]              = useState<Tone>("친근한");
  const [contentType,       setContentType]       = useState<ContentType>("출시");
  const [reference,         setReference]         = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(["threads"]);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  // Fetch promotion post + project info
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [info, list] = await Promise.all([
          getProjectPromotionInfo(projectId),
          isNew ? Promise.resolve([]) : listPromotions(projectId),
        ]);
        setProjectInfo(info);
        if (!isNew) {
          const found = (list as Promotion[]).find(p => p.id === postId);
          if (found) {
            setPromotion(found);
            setEditHook(found.hook);
            setEditContent(found.content);
            setEditHashtags(found.hashtags);
            setEditStatus(found.status);
            setActivePlatform(found.platform);
            setSelectedPlatforms([found.platform]);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [projectId, postId, isNew]);

  const handleGenerate = useCallback(() => {
    if (!projectInfo) return;
    setGenerating(true);
    setTimeout(() => {
      const result = mockGenerate({
        projectInfo, message, tone, contentType, reference,
        platform: activePlatform,
      });
      setEditHook(result.hook);
      setEditContent(result.content);
      setEditHashtags(result.hashtags);
      setGenerating(false);
    }, 900);
  }, [projectInfo, message, tone, contentType, reference, activePlatform]);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isNew) {
        router.push(`/projects/${projectId}/promotion`);
        return;
      }
      await updatePromotion(promotion!.id, {
        hook: editHook,
        content: editContent,
        hashtags: editHashtags,
        status: editStatus,
        platform: activePlatform,
      });
      router.push(`/projects/${projectId}/promotion`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!promotion) return;
    if (!confirm("이 홍보 글을 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await deletePromotion(promotion.id);
      router.push(`/projects/${projectId}/promotion`);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const handleCopy = () => {
    const siteUrl = projectInfo?.site_url ?? "";
    const text = `${editHook}\n\n${editContent}\n\n${editHashtags.join(" ")}${siteUrl ? `\n↗ ${siteUrl}` : ""}`;
    navigator.clipboard.writeText(text).catch(console.error);
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const pm         = PLATFORM_META[activePlatform];
  const charCount  = editContent.length;
  const charLimit  = pm.maxChars;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center h-dvh">
        <div className="text-sm text-muted-foreground">불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col h-dvh">
      {/* Header */}
      <motion.div
        className="border-b border-border px-8 py-4 flex items-center justify-between shrink-0"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <div>
          <p className="h-eyebrow mb-0.5">PROMOTION &rsaquo; POST</p>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight">홍보글 만들기</h1>
            {promotion && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                {toKoDate(promotion.date)} 대상
              </span>
            )}
            <span className={cn(
              "text-xs font-medium px-2.5 py-1 rounded-full",
              STATUS_META[editStatus].bg, STATUS_META[editStatus].text
            )}>
              {STATUS_META[editStatus].label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/projects/${projectId}/promotion`)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            목록
          </button>
          <button
            onClick={handleCopy}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
            title="복사"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !promotion}
            className="h-8 w-8 rounded-lg border border-border flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors disabled:opacity-40"
            title="삭제"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </motion.div>

      {/* Split editor */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: 홍보 방향 입력 ── */}
        <div className="w-[400px] shrink-0 border-r border-border overflow-y-auto">
          <div className="p-6 flex flex-col gap-4">

            {/* 프로젝트 정보 요약 (읽기 전용) */}
            {projectInfo && (
              <div className="rounded-xl bg-muted/50 border border-border px-4 py-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  프로젝트 정보 (자동 반영)
                </p>
                <p className="text-sm font-semibold">{projectInfo.service_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{projectInfo.description}</p>
              </div>
            )}

            <Field label="이번 포스트 핵심 메시지">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="input-hero w-full px-3 py-2.5 text-sm resize-none"
                placeholder={"이번 글에서 무엇을 전달하고 싶으신가요?\n예) v0.3 출시, 반복 일정 기능 추가됨"}
                rows={3}
              />
            </Field>

            <div className="flex gap-4">
              <Field label="말투" className="flex-1">
                <div className="flex gap-1.5 flex-wrap">
                  {TONES.map(t => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                        tone === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="콘텐츠 유형" className="flex-1">
                <div className="flex gap-1.5 flex-wrap">
                  {CONTENT_TYPES.map(ct => (
                    <button
                      key={ct}
                      onClick={() => setContentType(ct)}
                      className={cn(
                        "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                        contentType === ct
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <Field label="레퍼런스">
              <input
                value={reference}
                onChange={e => setReference(e.target.value)}
                className="input-hero w-full h-10 px-3 text-sm"
                placeholder="참고할 링크나 내용을 입력해주세요"
              />
            </Field>

            <Field label="플랫폼">
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(PLATFORM_META) as Platform[]).map(p => {
                  const meta = PLATFORM_META[p];
                  const on   = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "h-8 px-3 rounded-full text-xs font-semibold transition-colors",
                        on ? `${meta.bg} ${meta.text}` : "bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {meta.name}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="스크린샷">
              <div className="w-full h-28 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-sm text-muted-foreground cursor-pointer hover:bg-muted/30 transition-colors">
                이미지를 드래그하거나 클릭해서 업로드
              </div>
            </Field>

            {/* Generate CTA */}
            <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">입력한 내용으로 홍보글 만들기</p>
                <p className="text-xs text-muted-foreground mt-0.5">AI가 프로젝트 정보를 참고해 생성합니다 →</p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !projectInfo}
                className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
              >
                {generating ? (
                  <>
                    <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                    생성 중
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    생성하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: Editable preview ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
          {/* Preview header */}
          <div className="border-b border-border px-6 py-3 flex items-center justify-between shrink-0 bg-card">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                AI 생성 결과
              </span>
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", pm.bg, pm.text)}>
                {pm.name.toUpperCase()}
              </span>
            </div>
            {/* Platform tabs */}
            <div className="flex items-center gap-1">
              {(Object.keys(PLATFORM_META) as Platform[])
                .filter(p => selectedPlatforms.includes(p))
                .map(p => {
                  const meta = PLATFORM_META[p];
                  return (
                    <button
                      key={p}
                      onClick={() => setActivePlatform(p)}
                      className={cn(
                        "h-7 px-3 rounded-md text-xs font-medium transition-colors",
                        activePlatform === p
                          ? `${meta.bg} ${meta.text}`
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {meta.name}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Preview card */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            <div className="max-w-lg mx-auto w-full bg-card border border-border rounded-3xl shadow-sm p-5 flex flex-col gap-4">
              {/* Profile row */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {projectInfo?.service_name.charAt(0) ?? "A"}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    @{(projectInfo?.service_name ?? "app").toLowerCase().replace(/\s/g, "")}_app
                  </p>
                  <p className="text-xs text-muted-foreground">{pm.name}</p>
                </div>
                <span className={cn("ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full", pm.bg, pm.text)}>
                  AI
                </span>
              </div>

              {/* Hook (editable) */}
              <textarea
                value={editHook}
                onChange={e => setEditHook(e.target.value)}
                className="w-full text-sm font-semibold leading-snug bg-transparent border-none outline-none resize-none"
                rows={2}
                placeholder="훅 문구를 입력하거나 생성하기를 눌러보세요..."
              />

              {/* Content (editable) */}
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none text-muted-foreground"
                rows={6}
                placeholder="본문을 입력하거나 생성하기를 눌러보세요..."
              />

              {/* Image placeholder */}
              <div className="w-full h-36 rounded-xl bg-muted flex items-center justify-center">
                <span className="text-xs text-muted-foreground/60">hero shot · 1280×630</span>
              </div>

              {/* Hashtags */}
              {editHashtags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {editHashtags.map(tag => (
                    <span key={tag} className="text-xs text-primary font-medium">{tag}</span>
                  ))}
                </div>
              )}

              {/* Link */}
              {projectInfo?.site_url && (
                <p className="text-xs text-muted-foreground">
                  ↗ {projectInfo.site_url.replace("https://", "")}
                </p>
              )}

              {/* Char count */}
              <p className={cn(
                "text-[11px] text-right",
                charCount > charLimit ? "text-red-500 font-medium" : "text-muted-foreground"
              )}>
                {charCount} / {charLimit}자
              </p>
            </div>

            <p className="text-center text-xs text-muted-foreground/60">
              직접 수정 — 위에서 바로 글을 수정할 수 있습니다.
            </p>
          </div>

          {/* Action bar */}
          <div className="border-t border-border px-6 py-4 flex items-center gap-3 bg-card shrink-0">
            <div className="flex gap-2 mr-auto">
              {(["draft", "scheduled", "published"] as PromotionStatus[]).map(s => (
                <button
                  key={s}
                  onClick={() => setEditStatus(s)}
                  className={cn(
                    "h-7 px-3 rounded-full text-xs font-medium transition-colors",
                    editStatus === s
                      ? `${STATUS_META[s].bg} ${STATUS_META[s].text}`
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setEditStatus("scheduled"); handleSave(); }}
              className="h-8 px-4 rounded-lg bg-muted text-sm font-medium hover:bg-muted/70 transition-colors"
            >
              예약하기
            </button>
            <button
              onClick={() => { setEditStatus("published"); handleSave(); }}
              className="flex items-center gap-1.5 h-8 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              지금 발행
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Small helper component
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-semibold text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
