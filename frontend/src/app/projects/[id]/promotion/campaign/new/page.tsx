"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  createPromotionCampaign,
  getLatestPromotionCampaign,
  getProjectPromotionInfo,
  type PromotionCampaignInput,
} from "@/lib/api/promotion";
import { getProject } from "@/lib/api/projects";

const initialForm: PromotionCampaignInput = {
  project_name: "",
  one_line_description: "",
  target_user: "",
  problem: "",
  core_value: "",
  main_features: "",
  promotion_goal: "초기 관심과 가입 유도",
  channel: "threads",
  tone_preference: "친근하지만 너무 가볍지 않게",
  additional_context: "",
};

const storageKey = (projectId: string) =>
  `promotion-campaign-form:${projectId}`;

function readSavedForm(projectId: string): Partial<PromotionCampaignInput> {
  try {
    const saved = window.localStorage.getItem(storageKey(projectId));
    if (!saved) return {};
    const parsed = JSON.parse(saved) as Partial<PromotionCampaignInput>;
    return {
      project_name: parsed.project_name,
      one_line_description: parsed.one_line_description,
      target_user: parsed.target_user,
      problem: parsed.problem,
      core_value: parsed.core_value,
      main_features: parsed.main_features,
      promotion_goal: parsed.promotion_goal,
      channel: "threads",
      tone_preference: parsed.tone_preference,
      additional_context: parsed.additional_context,
    };
  } catch {
    return {};
  }
}

type FieldProps = {
  label: string;
  helper?: string;
  children: ReactNode;
};

function Field({ label, helper, children }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] font-bold text-slate-700">{label}</span>
      {helper && (
        <span className="ml-2 text-[11px] font-medium text-slate-400">
          {helper}
        </span>
      )}
      <div className="mt-2">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-slate-400";

const generationSteps = [
  {
    title: "제품 정보 분석",
    description:
      "프로젝트 설명과 PRD에서 홍보에 쓸 수 있는 핵심 맥락을 고르고 있어요.",
  },
  {
    title: "타겟과 메시지 정리",
    description:
      "누가 왜 관심을 가질지 기준을 세우고 첫 반응을 만들 문장을 찾는 중입니다.",
  },
  {
    title: "2주 운영 리듬 구성",
    description:
      "인지, 공감, 기능 소개, 피드백 요청이 자연스럽게 이어지도록 날짜를 배치하고 있어요.",
  },
  {
    title: "14일 콘텐츠 초안 작성",
    description:
      "Threads에 바로 다듬어 올릴 수 있는 훅, 본문, 해시태그를 만들고 있습니다.",
  },
  {
    title: "최종 검수와 저장",
    description:
      "반복되는 표현을 줄이고 캘린더에 날짜별 초안으로 저장하는 중이에요.",
  },
];

const estimateSeconds = 180;

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

type GenerationProgressProps = {
  projectName: string;
  elapsedSeconds: number;
};

function GenerationProgress({
  projectName,
  elapsedSeconds,
}: GenerationProgressProps) {
  const activeStep = Math.min(
    generationSteps.length - 1,
    Math.floor((elapsedSeconds / estimateSeconds) * generationSteps.length),
  );
  const progress = Math.min(
    92,
    Math.max(8, Math.round((elapsedSeconds / estimateSeconds) * 100)),
  );
  const remaining = Math.max(0, estimateSeconds - elapsedSeconds);

  return (
    <section className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-5 shadow-sm md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-500">
            Campaign Agent Working
          </p>
          <h2 className="text-[26px] font-bold tracking-tight text-slate-900">
            {projectName
              ? `${projectName}의 2주 홍보 계획을 만들고 있어요`
              : "2주 홍보 계획을 만들고 있어요"}
          </h2>
          <p className="mt-3 max-w-xl text-[14px] font-medium leading-7 text-slate-500">
            보통 2-3분 정도 걸립니다. 지금은 홍보 전략, 14일 콘텐츠 흐름, 날짜별
            Threads 초안을 한 번에 구성하고 있어요.
          </p>
        </div>

        <div className="grid min-w-[220px] grid-cols-2 gap-3 rounded-2xl border border-white bg-white/70 p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Elapsed
            </p>
            <p className="mt-1 text-[22px] font-black tabular-nums text-slate-900">
              {formatElapsed(elapsedSeconds)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Estimate
            </p>
            <p className="mt-1 text-[22px] font-black tabular-nums text-slate-900">
              {remaining > 0 ? `~${Math.ceil(remaining / 60)}분` : "마무리"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between text-[12px] font-bold text-slate-500">
          <span>{generationSteps[activeStep].title}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-slate-900 transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-7 grid gap-3">
        {generationSteps.map((step, index) => {
          const isDone = index < activeStep;
          const isActive = index === activeStep;
          return (
            <div
              key={step.title}
              className={`flex gap-4 rounded-2xl border px-4 py-4 transition-colors ${
                isActive
                  ? "border-slate-200 bg-white"
                  : isDone
                    ? "border-emerald-100 bg-white/70"
                    : "border-transparent bg-white/40"
              }`}
            >
              <div
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  isDone
                    ? "bg-emerald-50 text-emerald-600"
                    : isActive
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-400"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock3 className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="text-[14px] font-bold text-slate-900">
                  {step.title}
                </p>
                <p className="mt-1 text-[13px] font-medium leading-6 text-slate-500">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function NewPromotionCampaignPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<PromotionCampaignInput>(initialForm);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDefaults() {
      try {
        const savedForm = readSavedForm(projectId);
        const [project, info, latestCampaign] = await Promise.all([
          getProject(projectId),
          getProjectPromotionInfo(projectId).catch(() => null),
          getLatestPromotionCampaign(projectId).catch(() => null),
        ]);

        setForm({
          ...initialForm,
          project_name: info?.service_name || project.name || "",
          one_line_description: info?.description || project.description || "",
          target_user: info?.target_user || "",
          core_value: info?.key_values || "",
          additional_context: project.prd || "",
          ...(latestCampaign?.input ?? {}),
          ...savedForm,
          channel: "threads",
        });
      } catch (e) {
        console.error(e);
        setError("프로젝트 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    }

    loadDefaults();
  }, [projectId]);

  useEffect(() => {
    if (loading) return;
    window.localStorage.setItem(storageKey(projectId), JSON.stringify(form));
  }, [form, loading, projectId]);

  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [generating]);

  const generationProjectName = useMemo(
    () => form.project_name.trim() || form.one_line_description.trim(),
    [form.one_line_description, form.project_name],
  );

  const setValue = (key: keyof PromotionCampaignInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setElapsedSeconds(0);
    setGenerating(true);
    try {
      await createPromotionCampaign(projectId, form);
      router.push(`/projects/${projectId}/promotion`);
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : "홍보 전략 생성에 실패했습니다.",
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white px-6 py-6 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <Link
              href={`/projects/${projectId}/promotion`}
              className="mb-4 inline-flex items-center gap-2 text-[13px] font-bold text-slate-400 transition-colors hover:text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              홍보 캘린더
            </Link>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-500">
              Campaign Agent
            </p>
            <h1 className="text-[28px] font-bold tracking-tight text-slate-900">
              2주 홍보 콘텐츠 전략 생성
            </h1>
          </div>
          <div className="hidden rounded-2xl border border-slate-100 px-5 py-4 text-right md:block">
            <p className="text-[12px] font-bold text-slate-500">Threads 기준</p>
            <p className="mt-1 text-[12px] font-medium text-slate-400">
              내일부터 14일간 오후 7시 초안 배치
            </p>
          </div>
        </header>

        {generating ? (
          <GenerationProgress
            projectName={generationProjectName}
            elapsedSeconds={elapsedSeconds}
          />
        ) : (
          <form
            onSubmit={handleSubmit}
            className="grid gap-6 lg:grid-cols-[1fr_320px]"
          >
            <section className="grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="프로젝트 이름">
                  <input
                    className={inputClass}
                    value={form.project_name}
                    onChange={(e) => setValue("project_name", e.target.value)}
                    placeholder="LaunchPad"
                    required
                  />
                </Field>
                <Field label="게시 채널">
                  <input className={inputClass} value="Threads" disabled />
                </Field>
              </div>

              <Field label="한 줄 소개">
                <input
                  className={inputClass}
                  value={form.one_line_description}
                  onChange={(e) =>
                    setValue("one_line_description", e.target.value)
                  }
                  placeholder="서비스를 한 문장으로 설명해주세요"
                  required
                />
              </Field>

              <Field label="예상 타겟 사용자">
                <textarea
                  className={`${inputClass} min-h-24 resize-none`}
                  value={form.target_user}
                  onChange={(e) => setValue("target_user", e.target.value)}
                  placeholder="누가 이 서비스를 가장 절실하게 필요로 하나요?"
                  required
                />
              </Field>

              <Field label="해결하려는 문제">
                <textarea
                  className={`${inputClass} min-h-28 resize-none`}
                  value={form.problem}
                  onChange={(e) => setValue("problem", e.target.value)}
                  placeholder="타겟 사용자가 실제로 겪는 불편함을 적어주세요"
                  required
                />
              </Field>

              <Field label="핵심 가치">
                <textarea
                  className={`${inputClass} min-h-24 resize-none`}
                  value={form.core_value}
                  onChange={(e) => setValue("core_value", e.target.value)}
                  placeholder="이 서비스가 사용자의 삶이나 업무를 어떻게 바꾸나요?"
                  required
                />
              </Field>

              <Field label="주요 기능">
                <textarea
                  className={`${inputClass} min-h-28 resize-none`}
                  value={form.main_features}
                  onChange={(e) => setValue("main_features", e.target.value)}
                  placeholder="쉼표나 줄바꿈으로 주요 기능을 적어주세요"
                  required
                />
              </Field>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="홍보 목적">
                  <input
                    className={inputClass}
                    value={form.promotion_goal}
                    onChange={(e) => setValue("promotion_goal", e.target.value)}
                    placeholder="가입 유도, 대기자 모집, 피드백 확보 등"
                    required
                  />
                </Field>
                <Field label="원하는 톤">
                  <input
                    className={inputClass}
                    value={form.tone_preference}
                    onChange={(e) =>
                      setValue("tone_preference", e.target.value)
                    }
                    placeholder="친근함, 전문적, 진지함 등"
                  />
                </Field>
              </div>

              <Field label="추가 설명" helper="선택">
                <textarea
                  className={`${inputClass} min-h-32 resize-none`}
                  value={form.additional_context}
                  onChange={(e) =>
                    setValue("additional_context", e.target.value)
                  }
                  placeholder="강조하고 싶은 맥락, 피해야 할 표현, 경쟁 제품과 다른 점 등을 적어주세요"
                />
              </Field>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-[16px] font-bold text-slate-900">
                생성 결과
              </h2>
              <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                홍보 에이전트가 타겟 분석, 2주 캠페인 전략, Threads 운영 리듬,
                14일 콘텐츠 캘린더, Threads 초안, 최종 검수를 순서대로
                실행합니다.
              </p>
              <div className="mt-5 space-y-2 text-[12px] font-semibold text-slate-500">
                <p>Day 1은 내일 오후 7시로 배치됩니다.</p>
                <p>생성된 글은 날짜가 지정된 초안으로 저장됩니다.</p>
                <p>예약 발행은 캘린더 우상단에서 한 번에 켤 수 있습니다.</p>
              </div>

              {error && (
                <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-[13px] font-semibold text-rose-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || generating}
                className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[13px] font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    생성 중
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    홍보 계획 생성하기
                  </>
                )}
              </button>
            </aside>
          </form>
        )}
      </div>
    </div>
  );
}
