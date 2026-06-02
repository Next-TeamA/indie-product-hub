"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Sparkles,
  Download,
  Loader2,
  Trash2,
  RefreshCw,
  MessageSquareText,
  Ban,
  Heart,
} from "lucide-react";
import { usePersona, usePersonaActions } from "@/hooks/use-persona";
import { useVoiceSamples, useVoiceSampleActions } from "@/hooks/use-voice-samples";
import type { VoiceSample } from "@/lib/api/voice-samples";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const PLATFORM_LABEL: Record<string, string> = {
  x: "X",
  threads: "Threads",
};

function formatKoDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function PersonaPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { persona, isLoading: personaLoading, mutate: mutatePersona } =
    usePersona(projectId);
  const { samples, isLoading: samplesLoading, mutate: mutateSamples } =
    useVoiceSamples(projectId);
  const personaActions = usePersonaActions(projectId);
  const sampleActions = useVoiceSampleActions(projectId);

  const [platform, setPlatform] = useState<"x" | "threads">("x");
  const [count, setCount] = useState(50);
  const [importing, setImporting] = useState(false);
  const [building, setBuilding] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [buildMsg, setBuildMsg] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function onImport() {
    if (importing) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await personaActions.import(platform, count);
      setImportMsg(
        `import: ${(r.imported as number) ?? 0}개 · 인덱싱: ${(r.indexed as number) ?? 0}개`,
      );
      mutateSamples();
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "가져오기 실패");
    } finally {
      setImporting(false);
    }
  }

  async function onBuild() {
    if (building) return;
    setBuilding(true);
    setBuildMsg(null);
    try {
      await personaActions.build();
      setBuildMsg("스타일 분석 완료");
      mutatePersona();
    } catch (e) {
      setBuildMsg(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setBuilding(false);
    }
  }

  async function onDelete(sample: VoiceSample) {
    if (removingId) return;
    setRemovingId(sample.id);
    try {
      await sampleActions.remove(sample.id);
      mutateSamples();
    } catch (e) {
      console.error(e);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          페르소나
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          내가 쓴 글을 학습시켜서 AI가 같은 말투로 마케팅 글을 쓰게 합니다.
        </p>
      </motion.div>

      <PersonaCard
        persona={persona}
        loading={personaLoading}
        canBuild={samples.length > 0}
        building={building}
        buildMsg={buildMsg}
        onBuild={onBuild}
      />

      <ImportCard
        platform={platform}
        setPlatform={setPlatform}
        count={count}
        setCount={setCount}
        importing={importing}
        msg={importMsg}
        onImport={onImport}
      />

      <SamplesCard
        samples={samples}
        loading={samplesLoading}
        removingId={removingId}
        onDelete={onDelete}
      />
    </div>
  );
}

// --- subcomponents ---

function PersonaCard({
  persona,
  loading,
  canBuild,
  building,
  buildMsg,
  onBuild,
}: {
  persona: ReturnType<typeof usePersona>["persona"];
  loading: boolean;
  canBuild: boolean;
  building: boolean;
  buildMsg: string | null;
  onBuild: () => void;
}) {
  return (
    <div className="mb-6 rounded-[24px] border border-border bg-card p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
            <Sparkles className="h-5 w-5 text-violet-500" />내 페르소나
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            voice_samples를 분석해서 voice_profile을 추출합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onBuild}
          disabled={!canBuild || building}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
            canBuild && !building
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground",
          )}
        >
          {building ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {persona ? "재분석" : "스타일 분석"}
        </button>
      </div>

      {buildMsg && (
        <p className="mt-3 text-sm text-muted-foreground">{buildMsg}</p>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </div>
        ) : persona ? (
          <PersonaDetail persona={persona} />
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              아직 페르소나가 없어요. 아래에서 voice 가져와서 분석을 실행하세요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PersonaDetail({
  persona,
}: {
  persona: NonNullable<ReturnType<typeof usePersona>["persona"]>;
}) {
  const voiceEntries = Object.entries(persona.voice_profile ?? {}).filter(
    ([, v]) => typeof v === "string" || typeof v === "number",
  );
  return (
    <div className="space-y-5">
      {voiceEntries.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" /> Voice profile
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {voiceEntries.map(([k, v]) => (
              <div
                key={k}
                className="rounded-2xl border border-border bg-muted px-4 py-3"
              >
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {k}
                </div>
                <div className="mt-0.5 text-sm font-medium text-foreground">
                  {String(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {persona.preferred_phrases.length > 0 && (
        <PhraseList
          icon={<Heart className="h-3.5 w-3.5 text-rose-500" />}
          title="자주 쓰는 표현"
          items={persona.preferred_phrases}
          tone="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400"
        />
      )}

      {persona.forbidden_phrases.length > 0 && (
        <PhraseList
          icon={<Ban className="h-3.5 w-3.5 text-muted-foreground" />}
          title="금지 표현"
          items={persona.forbidden_phrases}
          tone="bg-muted text-muted-foreground"
        />
      )}

      <div className="text-xs text-muted-foreground">
        마지막 분석:{" "}
        {new Date(persona.last_updated_at).toLocaleString("ko-KR")}
      </div>
    </div>
  );
}

function PhraseList({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <span
            key={p}
            className={cn("rounded-full px-3 py-1 text-xs font-medium", tone)}
          >
            {p}
          </span>
        ))}
      </div>
    </div>
  );
}

function ImportCard({
  platform,
  setPlatform,
  count,
  setCount,
  importing,
  msg,
  onImport,
}: {
  platform: "x" | "threads";
  setPlatform: (p: "x" | "threads") => void;
  count: number;
  setCount: (n: number) => void;
  importing: boolean;
  msg: string | null;
  onImport: () => void;
}) {
  return (
    <div className="mb-6 rounded-[24px] border border-border bg-card p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Download className="h-5 w-5 text-blue-500" /> Voice 가져오기
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        과거 X/Threads 글을 가져와서 voice_samples에 저장하고 RAG 인덱스를
        만듭니다.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            플랫폼
          </label>
          <div className="mt-2 inline-flex rounded-full bg-muted p-1">
            {(["x", "threads"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-bold transition-colors",
                  platform === p
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
            개수 (최대 200)
          </label>
          <input
            type="number"
            min={10}
            max={200}
            value={count}
            onChange={(e) =>
              setCount(Math.min(200, Math.max(10, Number(e.target.value) || 10)))
            }
            className="mt-2 w-full rounded-full border border-border bg-card px-4 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={onImport}
            disabled={importing}
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors",
              importing
                ? "bg-muted text-muted-foreground"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            가져오기
          </button>
        </div>
      </div>

      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
    </div>
  );
}

function SamplesCard({
  samples,
  loading,
  removingId,
  onDelete,
}: {
  samples: VoiceSample[];
  loading: boolean;
  removingId: string | null;
  onDelete: (s: VoiceSample) => void;
}) {
  return (
    <div className="rounded-[24px] border border-border bg-card p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">
          Voice 샘플{" "}
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {samples.length}개
          </span>
        </h2>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
        </div>
      ) : samples.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          샘플이 없어요. 위에서 가져오기를 실행하세요.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {samples.map((s) => (
            <li
              key={s.id}
              className="group flex items-start gap-3 rounded-2xl border border-border bg-muted p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-card px-2 py-0.5 font-bold uppercase tracking-wider text-muted-foreground">
                    {PLATFORM_LABEL[s.source_platform] ?? s.source_platform}
                  </span>
                  <span className="text-muted-foreground">
                    {formatKoDate(s.created_at)}
                  </span>
                  {s.engagement_score !== null && (
                    <span className="text-muted-foreground">
                      engagement {Number(s.engagement_score).toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
                  {s.content}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDelete(s)}
                disabled={removingId === s.id}
                aria-label="샘플 삭제"
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-rose-50 dark:bg-rose-950/40 hover:text-rose-500 disabled:opacity-30"
              >
                {removingId === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
