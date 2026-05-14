"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import Link from "next/link";
import {
  User, Bell, Key, FileText, Link2,
  ChevronLeft, Save, Plus, Trash2, Copy, Check,
  Globe, RefreshCw, LogOut, Shield,
  GitBranch, MessageCircle, X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getProfile, updateProfile,
  getNotifications, updateNotifications,
  listApiKeys, createApiKey, deleteApiKey,
  type UserProfile, type NotificationPrefs, type ApiKey, type ApiKeyCreated,
} from "@/lib/api/settings";
import { listProjects, updateProject, type Project } from "@/lib/api/projects";
import { listAccounts, connectAccount, disconnectAccount, type ConnectedAccount } from "@/lib/api/accounts";

// ─── 애니메이션 ─────────────────────────────────────────────
const EASE = [0.16, 1, 0.3, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.02 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.35, ease: EASE } },
};

// ─── 탭 설정 ────────────────────────────────────────────────
type Tab = "profile" | "notifications" | "api-keys" | "project" | "accounts";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "profile",       label: "프로필",        Icon: User     },
  { id: "notifications", label: "알림 설정",     Icon: Bell     },
  { id: "api-keys",      label: "API 키 관리",   Icon: Key      },
  { id: "project",       label: "프로젝트 정보", Icon: FileText },
  { id: "accounts",      label: "연동계정 관리", Icon: Link2    },
];

// ─── 연동계정 프로바이더 설정 ─────────────────────────────────
const PROVIDERS = [
  { id: "github",   label: "GitHub",      Icon: GitBranch,      color: "text-gray-900 dark:text-white" },
  { id: "x",        label: "X (Twitter)", Icon: X,              color: "text-black dark:text-white"    },
  { id: "threads",  label: "Threads",     Icon: MessageCircle,  color: "text-purple-600"               },
  { id: "vercel",   label: "Vercel",      Icon: Globe,          color: "text-black dark:text-white"    },
  { id: "railway",  label: "Railway",     Icon: Globe,          color: "text-purple-500"               },
];

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // 인증 체크
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push("/login");
    });
  }, [router]);

  return (
    <div className="min-h-dvh bg-background">
      {/* 상단 네비 */}
      <div className="border-b border-border px-10 py-4 flex items-center gap-4">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          전체 프로젝트
        </Link>
        <span className="text-muted-foreground/30">/</span>
        <span className="text-sm font-medium">설정</span>
      </div>

      <div className="flex px-10 py-8 gap-8 max-w-5xl mx-auto">
        {/* 사이드 탭 네비 */}
        <nav className="w-48 shrink-0">
          <ul className="flex flex-col gap-1">
            {TABS.map((tab) => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left ${
                    activeTab === tab.id
                      ? "bg-foreground text-background font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <tab.Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* 콘텐츠 영역 */}
        <main className="flex-1 min-w-0">
          {activeTab === "profile"       && <ProfileTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "api-keys"      && <ApiKeysTab />}
          {activeTab === "project"       && <ProjectTab />}
          {activeTab === "accounts"      && <AccountsTab />}
        </main>
      </div>
    </div>
  );
}

// ─── 프로필 탭 ───────────────────────────────────────────────
function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile(p);
      setName(p.name);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Profile</p>
        <h2 className="text-xl font-bold">프로필</h2>
      </motion.div>

      {/* 아바타 */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {name ? name[0]?.toUpperCase() : "?"}
        </div>
        <div>
          <p className="font-semibold">{name || "—"}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{profile?.email || "로딩 중..."}</p>
        </div>
      </motion.div>

      {/* 이름 수정 */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
        <p className="text-sm font-semibold">기본 정보</p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            placeholder="이름을 입력하세요"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">이메일 (변경 불가)</label>
          <input
            value={profile?.email || ""}
            disabled
            className="w-full rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── 알림 설정 탭 ────────────────────────────────────────────
function NotificationsTab() {
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    deploy: true, issue: true, weekly_report: true, security: true, marketing: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getNotifications().then(setPrefs).catch(() => {});
  }, []);

  const toggle = (key: keyof NotificationPrefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotifications(prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const ITEMS: { key: keyof NotificationPrefs; label: string; desc: string }[] = [
    { key: "deploy",        label: "배포 알림",       desc: "배포 성공/실패 시 알림을 받습니다" },
    { key: "issue",         label: "이슈 알림",       desc: "새 이슈가 등록되거나 상태가 바뀔 때 알림을 받습니다" },
    { key: "weekly_report", label: "주간 리포트",     desc: "매주 월요일 성과 요약 리포트를 받습니다" },
    { key: "security",      label: "보안 알림",       desc: "SSL 만료, 취약점 감지 시 즉시 알림을 받습니다" },
    { key: "marketing",     label: "마케팅 알림",     desc: "새 기능 및 업데이트 소식을 받습니다" },
  ];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Notifications</p>
        <h2 className="text-xl font-bold">알림 설정</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-1">
        {ITEMS.map((item, i) => (
          <div key={item.key}>
            {i > 0 && <div className="border-t border-border my-3" />}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  prefs[item.key] ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-background transition-transform ${
                    prefs[item.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={fadeUp} className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
        </button>
      </motion.div>
    </motion.div>
  );
}

// ─── API 키 관리 탭 ──────────────────────────────────────────
function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newlyCreated, setNewlyCreated] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    listApiKeys().then(setKeys).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const created = await createApiKey(newKeyName.trim());
      setNewlyCreated(created);
      setNewKeyName("");
      setShowForm(false);
      load();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteApiKey(id);
    load();
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">API Keys</p>
          <h2 className="text-xl font-bold">API 키 관리</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          새 키 생성
        </button>
      </motion.div>

      {/* 새 키 생성 폼 */}
      {showForm && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
          <p className="text-sm font-semibold">새 API 키 생성</p>
          <input
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="키 이름 (예: CI/CD, 모니터링)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setNewKeyName(""); }}
              className="px-3 py-1.5 rounded-xl border border-border text-sm hover:bg-muted transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !newKeyName.trim()}
              className="px-3 py-1.5 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {creating ? "생성 중..." : "생성"}
            </button>
          </div>
        </motion.div>
      )}

      {/* 방금 생성된 키 (1회만 노출) */}
      {newlyCreated && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-5 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">키가 생성되었습니다 — 지금 복사하세요</p>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">이 키는 한 번만 표시됩니다. 지금 복사해서 안전한 곳에 보관하세요.</p>
          <div className="flex items-center gap-2 bg-background rounded-xl px-3 py-2 font-mono text-xs break-all border border-emerald-500/20">
            <span className="flex-1">{newlyCreated.key}</span>
            <button onClick={() => handleCopy(newlyCreated.key)} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
          <button
            onClick={() => setNewlyCreated(null)}
            className="text-xs text-muted-foreground hover:text-foreground self-end transition-colors"
          >
            확인했습니다
          </button>
        </motion.div>
      )}

      {/* 키 목록 */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5">
        {keys.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            생성된 API 키가 없습니다
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                {["이름", "키 미리보기", "생성일", ""].map((h) => (
                  <th key={h} className="pb-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((k) => (
                <tr key={k.id} className="hover:bg-muted/30 transition-colors">
                  <td className="py-3 text-sm font-medium">{k.name}</td>
                  <td className="py-3">
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {k.key_prefix}••••••••••••
                    </span>
                  </td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {new Date(k.created_at).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── 프로젝트 정보 탭 ────────────────────────────────────────
function ProjectTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", prd: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    listProjects().then((ps) => {
      setProjects(ps);
      if (ps.length > 0) {
        setSelectedId(ps[0].id);
        setForm({ name: ps[0].name, description: ps[0].description ?? "", prd: ps[0].prd ?? "" });
      }
    }).catch(() => {});
  }, []);

  const handleSelect = (id: string) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setSelectedId(id);
    setForm({ name: p.name, description: p.description ?? "", prd: p.prd ?? "" });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const updated = await updateProject(selectedId, form);
      setProjects((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Project</p>
        <h2 className="text-xl font-bold">프로젝트 정보</h2>
      </motion.div>

      {/* 프로젝트 선택 */}
      {projects.length > 0 && (
        <motion.div variants={fadeUp} className="flex gap-2 flex-wrap">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p.id)}
              className={`px-3 py-1.5 rounded-xl text-sm transition-colors border ${
                selectedId === p.id
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {p.name}
            </button>
          ))}
        </motion.div>
      )}

      {selectedId ? (
        <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">프로젝트 이름</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">설명</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="프로젝트 한 줄 설명"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">기획서 (PRD)</label>
            <textarea
              value={form.prd}
              onChange={(e) => setForm((f) => ({ ...f, prd: e.target.value }))}
              rows={14}
              placeholder="제품 기획서, 요구사항, 목표 등을 자유롭게 작성하세요..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-none font-mono leading-relaxed"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-sm font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saved ? "저장됨" : saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          프로젝트가 없습니다. 먼저 프로젝트를 생성해주세요.
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── 연동계정 탭 ─────────────────────────────────────────────
function AccountsTab() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);

  const load = useCallback(() => {
    listAccounts().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const { auth_url } = await connectAccount(provider, "/settings");
      window.location.href = auth_url;
    } catch {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    await disconnectAccount(id);
    load();
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-5">
      <motion.div variants={fadeUp}>
        <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-1">Accounts</p>
        <h2 className="text-xl font-bold">연동계정 관리</h2>
      </motion.div>

      <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-2">
        {PROVIDERS.map((provider, i) => {
          const connected = accounts.find((a) => a.provider === provider.id);
          return (
            <div key={provider.id}>
              {i > 0 && <div className="border-t border-border my-2" />}
              <div className="flex items-center gap-4 py-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center bg-muted shrink-0`}>
                  <provider.Icon className={`w-4 h-4 ${provider.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{provider.label}</p>
                  {connected ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      @{connected.provider_username || "연동됨"}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">연동되지 않음</p>
                  )}
                </div>
                {connected ? (
                  <button
                    onClick={() => handleDisconnect(connected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/30 text-red-600 dark:text-red-400 text-xs hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    연동 해제
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(provider.id)}
                    disabled={connecting === provider.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {connecting === provider.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    연동하기
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
