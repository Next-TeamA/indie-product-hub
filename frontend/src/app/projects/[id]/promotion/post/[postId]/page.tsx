"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Copy,
  Trash2,
  Save,
  Sparkles,
  Send,
  X,
  Image as ImageIcon,
  RefreshCw,
  Bookmark,
  Star,
} from "lucide-react";
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

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 캘린더 색상과 동일하게 브랜드 컬러 복구
const PLATFORM_META: Record<
  Platform,
  { name: string; bg: string; text: string; maxChars: number }
> = {
  threads: {
    name: "Threads",
    bg: "bg-orange-50",
    text: "text-orange-600",
    maxChars: 500,
  },
  x: {
    name: "X",
    bg: "bg-slate-100",
    text: "text-slate-700",
    maxChars: 280,
  },
  bluesky: {
    name: "Bluesky",
    bg: "bg-sky-50",
    text: "text-sky-600",
    maxChars: 300,
  },
  mastodon: {
    name: "Mastodon",
    bg: "bg-violet-50",
    text: "text-violet-600",
    maxChars: 500,
  },
};

const STATUS_META: Record<
  PromotionStatus,
  { label: string; bg: string; text: string }
> = {
  draft: { label: "초안", bg: "bg-slate-100", text: "text-slate-500" },
  scheduled: { label: "예약됨", bg: "bg-blue-50", text: "text-blue-600" },
  published: { label: "발행됨", bg: "bg-emerald-50", text: "text-emerald-600" },
  failed: { label: "실패", bg: "bg-rose-50", text: "text-rose-600" },
};

const TONES = ["친근한", "전문적", "유머"] as const;
type Tone = (typeof TONES)[number];

const CONTENT_TYPES = ["출시", "회고", "업데이트", "Q&A"] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const PROMO_TEMPLATES = [
  {
    name: "런칭 알림",
    platform: "전채널",
    score: 5,
    tag: "런칭",
    content:
      "🚀 [제품명] 정식 출시!\n\n[핵심 가치 요약]\n✅ [기능 1]\n✅ [기능 2]\n\n지금 시작하기 👉 [링크]",
  },
  {
    name: "기능 소개",
    platform: "Threads / Bluesky",
    score: 4,
    tag: "기능",
    content:
      "새 기능 출시 🎉 [기능명]\n\n이제 [Before] 대신 [After]가 가능해요.\n\n피드백 환영합니다 🙌",
  },
  {
    name: "성과 공유",
    platform: "Mastodon",
    score: 5,
    tag: "마일스톤",
    content:
      "[숫자] 달성 🎯\n📈 지표 1: [수치]\n📈 지표 2: [수치]\n\n응원해주셔서 감사합니다!",
  },
];

// --- Helpers ---

function toKoDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} (${KO_DAYS[d.getDay()]})`;
}

// Mock AI generation
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
    친근한: `${projectInfo.service_name}으로 더 가볍게 시작하세요`,
    전문적: `${projectInfo.service_name}: ${projectInfo.description}`,
    유머: `복잡한 도구는 이제 그만 👋`,
  };
  const bodies: Record<ContentType, string> = {
    출시: `${projectInfo.service_name}이 출시되었습니다.\n\n${message || projectInfo.description}\n→ ${reference || "지금 바로 시작해보세요"}`,
    회고: `${projectInfo.service_name} 솔직한 회고\n\n${message || projectInfo.key_values.split("\n")[0] || "꾸준한 빌드"}\n\n다음 달엔 더 잘할 수 있을 것 같습니다.`,
    업데이트: `새로운 업데이트가 나왔습니다!\n\n${message || projectInfo.key_values}\n\n사용해보고 피드백 남겨주세요 🙏`,
    "Q&A": `자주 받는 질문에 답해드립니다.\n\nQ: ${reference || "왜 만들었나요?"}\nA: ${message || projectInfo.description}`,
  };
  return {
    hook: hooks[tone],
    content: bodies[contentType],
    hashtags: [
      "#인디메이커",
      `#${projectInfo.service_name.replace(/\s/g, "")}`,
      "#빌드인퍼블릭",
    ],
  };
}

// --- Component ---

export default function PostEditorPage() {
  const { id: projectId, postId } = useParams<{ id: string; postId: string }>();
  const router = useRouter();
  const isNew = postId === "new";

  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectPromotionInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(!isNew);

  const [editHook, setEditHook] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editHashtags, setEditHashtags] = useState<string[]>([]);
  const [editStatus, setEditStatus] = useState<PromotionStatus>("draft");
  const [activePlatform, setActivePlatform] = useState<Platform>("threads");

  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("친근한");
  const [contentType, setContentType] = useState<ContentType>("출시");
  const [reference, setReference] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    "threads",
  ]);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showTemplateModal, setShowTemplateModal] = useState(false);

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
          const found = (list as Promotion[]).find((p) => p.id === postId);
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
        projectInfo,
        message,
        tone,
        contentType,
        reference,
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
      if (!isNew) {
        await updatePromotion(promotion!.id, {
          hook: editHook,
          content: editContent,
          hashtags: editHashtags,
          status: editStatus,
          platform: activePlatform,
        });
      }
      router.push(`/projects/${projectId}/promotion`);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!promotion) return;
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
    navigator.clipboard.writeText(text);
  };

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const pm = PLATFORM_META[activePlatform];
  const charCount = editContent.length;

  if (loading) return null;

  return (
    <div className="w-full flex flex-col h-dvh bg-white selection:bg-slate-800 selection:text-white relative">
      {/* Header */}
      <motion.div
        className="px-8 py-5 flex items-center justify-between shrink-0 border-b border-slate-50"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${projectId}/promotion`)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 mb-0.5">
              PROMOTION &rsaquo; POST
            </p>
            <div className="flex items-center gap-2">
              <h1 className="text-[20px] font-bold tracking-tight text-slate-800">
                홍보글 만들기
              </h1>
              <span
                className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-md",
                  STATUS_META[editStatus].bg,
                  STATUS_META[editStatus].text,
                )}
              >
                {STATUS_META[editStatus].label}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="w-9 h-9 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
            title="복사"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={!promotion}
            className="w-9 h-9 rounded-xl border border-slate-100 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-30"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 h-10 px-5 rounded-full bg-slate-800 text-white text-[13px] font-semibold hover:bg-slate-700 transition-colors"
          >
            <Save className="w-4 h-4" /> {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </motion.div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Form: Input */}
        <div className="w-[400px] shrink-0 border-r border-slate-50 overflow-y-auto bg-slate-50/20">
          <div className="p-8 flex flex-col gap-8">
            <Field
              label="이번 포스트 핵심 메시지"
              action={
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md"
                >
                  <Bookmark className="w-3 h-3" />
                  템플릿 보기
                </button>
              }
            >
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 text-[14px] font-medium rounded-2xl bg-white border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-sm placeholder:text-slate-300"
                placeholder={"전달하고 싶은 내용을 입력하세요."}
                rows={4}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="말투">
                <div className="flex flex-wrap gap-2">
                  {TONES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTone(t)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                        tone === t
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-white border border-slate-100 text-slate-400 hover:text-slate-600",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="유형">
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct}
                      onClick={() => setContentType(ct)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                        contentType === ct
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-white border border-slate-100 text-slate-400 hover:text-slate-600",
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
                onChange={(e) => setReference(e.target.value)}
                className="w-full h-11 px-4 text-[14px] font-medium rounded-xl bg-white border border-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all shadow-sm placeholder:text-slate-300"
                placeholder="링크나 참고 내용을 입력하세요"
              />
            </Field>

            <Field label="플랫폼 선택">
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                  const meta = PLATFORM_META[p];
                  const on = selectedPlatforms.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[12px] font-bold transition-all shadow-sm border",
                        on
                          ? `${meta.bg} ${meta.text} border-transparent`
                          : "bg-white border-slate-100 text-slate-300",
                      )}
                    >
                      {meta.name}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="스크린샷">
              <div className="w-full h-32 rounded-2xl border-2 border-dashed border-slate-100 bg-white flex flex-col items-center justify-center gap-2 text-slate-300 cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                <ImageIcon className="w-6 h-6 opacity-30" />
                <span className="text-[12px] font-medium">이미지 업로드</span>
              </div>
            </Field>

            <div className="mt-4 p-6 rounded-[24px] bg-blue-50/50 border border-blue-100/50 shadow-inner">
              <p className="text-[14px] font-bold text-blue-900 mb-1">
                AI 홍보글 생성
              </p>
              <p className="text-[12px] font-medium text-blue-600/70 mb-4">
                프로젝트 정보를 분석해 글을 작성합니다
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2.5 h-12 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}{" "}
                생성하기
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
          <div className="px-8 py-4 border-b border-slate-100 flex items-center justify-between bg-white/60 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                Preview
              </span>
              <span
                className={cn(
                  "text-[11px] font-bold px-3 py-1 rounded-full uppercase",
                  pm.bg,
                  pm.text,
                )}
              >
                {activePlatform}
              </span>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {(Object.keys(PLATFORM_META) as Platform[])
                .filter((p) => selectedPlatforms.includes(p))
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => setActivePlatform(p)}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                      activePlatform === p
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-400",
                    )}
                  >
                    {PLATFORM_META[p].name}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 flex flex-col items-center">
            <motion.div
              className="w-full max-w-lg bg-white border border-slate-100 rounded-[32px] shadow-[0_12px_48px_-16px_rgba(0,0,0,0.06)] overflow-hidden"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
            >
              <div className="p-8 flex flex-col gap-5">
                <div className="flex items-center gap-3.5 mb-2.5">
                  <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-[16px]">
                    {projectInfo?.service_name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-[16px] font-bold text-slate-900">
                      @
                      {projectInfo?.service_name
                        .toLowerCase()
                        .replace(/\s/g, "")}
                    </p>
                    <p className="text-[13px] font-medium text-slate-400 uppercase tracking-wider">
                      {activePlatform}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-slate-50 text-slate-400 border border-slate-100">
                    AI ASSISTED
                  </span>
                </div>

                <textarea
                  value={editHook}
                  onChange={(e) => setEditHook(e.target.value)}
                  className="w-full text-[20px] font-extrabold leading-snug text-slate-900 bg-transparent border-none outline-none resize-none placeholder:text-slate-200"
                  rows={2}
                  placeholder="훅 문구를 입력하세요..."
                />
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full text-[15px] font-medium text-slate-700 leading-relaxed bg-transparent border-none outline-none resize-none placeholder:text-slate-200"
                  rows={7}
                  placeholder="본문 내용을 입력하세요..."
                />

                <div className="aspect-[1.91/1] w-full rounded-2xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-2.5">
                  <ImageIcon className="w-7 h-7 text-slate-200" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                    Media Placeholder
                  </span>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {editHashtags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[14px] font-bold text-slate-400"
                    >
                      #{tag.replace("#", "")}
                    </span>
                  ))}
                </div>

                <div className="pt-5 border-t border-slate-50 flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-slate-400 underline underline-offset-4">
                    ↗ {projectInfo?.site_url.replace("https://", "")}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-bold",
                      charCount > pm.maxChars
                        ? "text-rose-500"
                        : "text-slate-300",
                    )}
                  >
                    {charCount} / {pm.maxChars}
                  </p>
                </div>
              </div>
            </motion.div>
            <p className="mt-6 text-[12px] font-semibold text-slate-300 uppercase tracking-widest">
              Direct Edit Mode
            </p>
          </div>

          {/* Bottom Bar */}
          <div className="px-8 py-5 border-t border-slate-50 bg-white flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              {(["draft", "scheduled", "published"] as PromotionStatus[]).map(
                (s) => (
                  <button
                    key={s}
                    onClick={() => setEditStatus(s)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[12px] font-bold transition-all",
                      editStatus === s
                        ? `${STATUS_META[s].bg} ${STATUS_META[s].text}`
                        : "bg-slate-50 text-slate-400 hover:bg-slate-100",
                    )}
                  >
                    {STATUS_META[s].label}
                  </button>
                ),
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setEditStatus("scheduled");
                  handleSave();
                }}
                className="px-5 h-11 rounded-xl text-[13px] font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                예약하기
              </button>
              <button
                onClick={() => {
                  setEditStatus("published");
                  handleSave();
                }}
                className="flex items-center gap-2 px-6 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
              >
                <Send className="w-4 h-4" /> 지금 발행
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 템플릿 모달 창 ── */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
              onClick={() => setShowTemplateModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="relative z-10 w-full max-w-4xl bg-white rounded-[24px] shadow-[0_12px_48px_-16px_rgba(0,0,0,0.12)] border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <Bookmark className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold text-slate-800">
                      효과적인 홍보 템플릿
                    </h2>
                    <p className="text-[12px] font-medium text-slate-400 mt-0.5">
                      원하는 템플릿을 클릭하면 자동으로 내용이 입력됩니다.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {PROMO_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.name}
                      className="bg-white rounded-[20px] p-5 border border-slate-100 shadow-sm flex flex-col gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => {
                        setMessage(tpl.content);
                        setShowTemplateModal(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-slate-500 uppercase tracking-widest">
                          {tpl.tag}
                        </span>
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "w-2.5 h-2.5",
                                i < tpl.score
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-slate-100",
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-slate-800 mb-0.5 group-hover:text-blue-600 transition-colors">
                          {tpl.name}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {tpl.platform}
                        </p>
                      </div>
                      <div className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-50 text-[11px] text-slate-500 leading-relaxed font-mono whitespace-pre-wrap line-clamp-[8]">
                        {tpl.content}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  action,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}
