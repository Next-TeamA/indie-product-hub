"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { installCallback } from "@/lib/api/github-app";

export const dynamic = "force-dynamic";

export default function GithubAppCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      }
    >
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState<string>("");

  useEffect(() => {
    const installationIdStr = params.get("installation_id");
    const state = params.get("state") ?? undefined;
    if (!installationIdStr) {
      setStatus("error");
      setMsg("installation_id 가 없습니다");
      return;
    }
    const installationId = Number(installationIdStr);
    if (!Number.isFinite(installationId)) {
      setStatus("error");
      setMsg("installation_id 가 숫자가 아닙니다");
      return;
    }

    (async () => {
      try {
        await installCallback(installationId, state);
        setStatus("ok");
        setTimeout(() => {
          router.replace("/projects/new?github_installed=true");
        }, 1200);
      } catch (e) {
        setStatus("error");
        setMsg(e instanceof Error ? e.message : "callback 처리 실패");
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-[24px] border border-border bg-card p-8 text-center shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-500" />
            <p className="mt-4 text-sm text-muted-foreground">
              GitHub App 설치를 처리하고 있어요...
            </p>
          </>
        )}
        {status === "ok" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <p className="mt-4 text-sm font-bold text-foreground">설치 완료</p>
            <p className="mt-1 text-xs text-muted-foreground">
              잠시 후 프로젝트 생성 화면으로 돌아갑니다.
            </p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
            <p className="mt-4 text-sm font-bold text-foreground">설치 처리 실패</p>
            <p className="mt-1 text-xs text-rose-500">{msg}</p>
            <button
              type="button"
              onClick={() => router.replace("/projects/new")}
              className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90"
            >
              돌아가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
