"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  Users,
  Loader2,
  UserPlus,
  Trash2,
  Mail,
  Shield,
} from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import {
  cancelInvitation,
  createInvitation,
  removeMember,
  updateMemberRole,
  type InviteRole,
  type ProjectRole,
} from "@/lib/api/members";
import { cn } from "@/lib/utils";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const ROLE_LABEL: Record<ProjectRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

const ROLE_DESC: Record<ProjectRole, string> = {
  owner: "모든 권한. 다른 owner 임명 가능.",
  admin: "멤버 초대/제거/role 변경. owner 제외.",
  member: "프로젝트 데이터 읽기/쓰기.",
  viewer: "읽기 전용.",
};

const RANK: Record<ProjectRole, number> = { viewer: 1, member: 2, admin: 3, owner: 4 };

export default function MembersPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data, isLoading, mutate } = useMembers(projectId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("member");
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const viewerRole = data?.viewer_role ?? "viewer";
  const canManage = RANK[viewerRole] >= RANK.admin;

  async function onInvite() {
    if (!email.trim() || inviting) return;
    setInviting(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await createInvitation(projectId, email.trim(), role);
      if (r.delivery === "email") {
        setMsg(
          `${email} 으로 초대 메일을 보냈어요. 가입 후 자동으로 수락 페이지로 이동합니다. (14일 내)`,
        );
      } else if (r.delivery === "in_app") {
        setMsg(
          `${email} 은 이미 LaunchPad 사용자라 메일 대신 in-app 으로 전달돼요. /invitations/me 에서 본인이 확인 가능.`,
        );
        try {
          await navigator.clipboard.writeText(r.accept_url);
          setCopied(r.id);
          setTimeout(() => setCopied(null), 2000);
        } catch {}
      } else {
        setMsg(
          `자동 발송 실패. 아래 링크를 복사해서 직접 공유해주세요: ${r.accept_url}`,
        );
        try {
          await navigator.clipboard.writeText(r.accept_url);
          setCopied(r.id);
          setTimeout(() => setCopied(null), 2000);
        } catch {}
      }
      setEmail("");
      mutate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "초대 실패");
    } finally {
      setInviting(false);
    }
  }

  async function onCancelInvite(invitationId: string) {
    setBusyId(invitationId);
    try {
      await cancelInvitation(projectId, invitationId);
      mutate();
    } finally {
      setBusyId(null);
    }
  }

  async function onChangeRole(memberId: string, newRole: ProjectRole) {
    setBusyId(memberId);
    try {
      await updateMemberRole(projectId, memberId, newRole);
      mutate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "권한 변경 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove(memberId: string) {
    if (!window.confirm("이 멤버를 프로젝트에서 제거할까요?")) return;
    setBusyId(memberId);
    try {
      await removeMember(projectId, memberId);
      mutate();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "제거 실패");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:px-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="mb-8"
      >
        <h1 className="flex items-center gap-2 text-3xl font-bold text-foreground md:text-4xl">
          <Users className="h-7 w-7" /> 멤버
        </h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          프로젝트를 함께 관리할 멤버를 이메일로 초대하세요.
        </p>
      </motion.div>

      {canManage && (
        <section className="mb-8 rounded-[24px] border border-border bg-card p-6 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] md:p-8">
          <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
            <UserPlus className="h-4 w-4" /> 초대 보내기
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as InviteRole)}
              className="rounded-2xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-foreground/40 focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="button"
              onClick={onInvite}
              disabled={inviting || !email.trim()}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
                inviting || !email.trim()
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              초대 보내기
            </button>
          </div>
          {(msg || err) && (
            <p className={cn("mt-3 text-sm", err ? "text-rose-500" : "text-muted-foreground")}>
              {err || msg}
            </p>
          )}
        </section>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-base font-bold text-foreground">
          멤버
          <span className="ml-1 text-sm font-medium text-muted-foreground">
            {data?.members.length ?? 0}명
          </span>
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중
          </div>
        ) : (
          <ul className="space-y-2">
            {data?.members.map((m) => {
              const isOwner = m.role === "owner";
              return (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {m.user_metadata?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.user_metadata.avatar_url as string}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        {(m.email?.[0] || "?").toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold text-foreground">
                        {(m.user_metadata?.name as string) || m.email || m.user_id.slice(0, 8)}
                      </span>
                      {m.is_self && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          나
                        </span>
                      )}
                    </div>
                    {m.email && (
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    )}
                  </div>
                  {canManage && !m.is_self && !isOwner ? (
                    <select
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) =>
                        onChangeRole(m.id, e.target.value as ProjectRole)
                      }
                      className="rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-foreground focus:outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Member</option>
                      <option value="viewer">Viewer</option>
                      {viewerRole === "owner" && <option value="owner">Owner</option>}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                        isOwner
                          ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <Shield className="h-3 w-3" />
                      {ROLE_LABEL[m.role]}
                    </span>
                  )}
                  {canManage && !m.is_self && !isOwner && (
                    <button
                      type="button"
                      onClick={() => onRemove(m.id)}
                      disabled={busyId === m.id}
                      aria-label="멤버 제거"
                      className="rounded-full p-2 text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-500 disabled:opacity-30"
                    >
                      {busyId === m.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {(data?.pending_invitations.length ?? 0) > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-foreground">
            대기 중인 초대{" "}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {data?.pending_invitations.length}개
            </span>
          </h2>
          <ul className="space-y-2">
            {data?.pending_invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/40 p-3"
              >
                <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium text-foreground">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABEL[inv.role as ProjectRole]} · {new Date(inv.created_at).toLocaleString("ko-KR")}
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => onCancelInvite(inv.id)}
                    disabled={busyId === inv.id}
                    className="rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    {busyId === inv.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "취소"
                    )}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p className="mb-2 font-bold text-foreground">권한 안내</p>
        {(["owner", "admin", "member", "viewer"] as ProjectRole[]).map((r) => (
          <p key={r} className="mt-1">
            <span className="font-bold text-foreground">{ROLE_LABEL[r]}</span>: {ROLE_DESC[r]}
          </p>
        ))}
      </section>

      {copied && <span className="sr-only">{copied}</span>}
    </div>
  );
}
