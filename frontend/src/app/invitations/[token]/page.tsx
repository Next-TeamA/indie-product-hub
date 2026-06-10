"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, AlertTriangle, LogIn } from "lucide-react";
import {
  acceptInvitation,
  declineInvitation,
  lookupInvitation,
  type InvitationLookup,
} from "@/lib/api/members";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

export default function InvitationPage() {
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
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [inv, setInv] = useState<InvitationLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await lookupInvitation(token);
        setInv(data);
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setLoggedInEmail(user?.email ?? null);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "초대를 찾을 수 없어요");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function onAccept() {
    if (!inv || busy) return;
    if (!loggedInEmail) {
      // 로그인 안 됨 → 로그인 후 돌아오기
      router.push(`/login?next=/invitations/${token}`);
      return;
    }
    if (loggedInEmail.toLowerCase() !== inv.email.toLowerCase()) {
      setErr(`현재 로그인된 이메일(${loggedInEmail})이 초대 대상(${inv.email})과 달라요. 로그아웃 후 ${inv.email} 로 다시 로그인해 주세요.`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await acceptInvitation(token);
      setDone("accepted");
      setTimeout(() => router.replace(`/projects/${r.project_id}`), 1200);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "수락 실패");
    } finally {
      setBusy(false);
    }
  }

  async function onDecline() {
    if (!inv || busy) return;
    if (!loggedInEmail) {
      router.push(`/login?next=/invitations/${token}`);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await declineInvitation(token);
      setDone("declined");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "거절 실패");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (err && !inv) {
    return (
      <Frame>
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-500" />
        <p className="mt-4 text-sm font-bold text-foreground">초대 조회 실패</p>
        <p className="mt-1 text-xs text-rose-500">{err}</p>
      </Frame>
    );
  }

  if (!inv) return null;

  if (done === "accepted") {
    return (
      <Frame>
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-4 text-sm font-bold text-foreground">초대 수락 완료</p>
        <p className="mt-1 text-xs text-muted-foreground">
          잠시 후 프로젝트로 이동합니다.
        </p>
      </Frame>
    );
  }
  if (done === "declined") {
    return (
      <Frame>
        <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-sm font-bold text-foreground">초대 거절됨</p>
      </Frame>
    );
  }

  return (
    <Frame>
      <div className="text-left">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          프로젝트 초대
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">
          {inv.project_name ?? "프로젝트"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <b className="text-foreground">{inv.email}</b> 으로 <b>{inv.role}</b> 권한 초대가 도착했어요.
        </p>
        {!loggedInEmail && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs text-amber-700 dark:text-amber-400">
            <LogIn className="h-3 w-3" /> 수락하려면 먼저 로그인해야 해요
          </p>
        )}
        {loggedInEmail && loggedInEmail.toLowerCase() !== inv.email.toLowerCase() && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 px-3 py-1 text-xs text-rose-700 dark:text-rose-400">
            <AlertTriangle className="h-3 w-3" />
            현재 로그인: {loggedInEmail} -- 초대 대상과 달라요
          </p>
        )}
        {err && <p className="mt-3 text-xs text-rose-500">{err}</p>}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDecline}
          disabled={busy}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
        >
          거절
        </button>
        <button
          type="button"
          onClick={onAccept}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          수락
        </button>
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full rounded-[24px] border border-border bg-card p-8 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] text-center">
        {children}
      </div>
    </div>
  );
}
