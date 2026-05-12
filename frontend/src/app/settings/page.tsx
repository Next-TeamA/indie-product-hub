"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import {
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  Check,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { setLocale } from "@/i18n/actions";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { listAccounts, connectAccount, disconnectAccount, type ConnectedAccount } from "@/lib/api/accounts";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
] as const;

const THEMES = [
  { value: "dark", icon: Moon, label: "Dark" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
] as const;

const SERVICES = [
  { id: "x", name: "X (Twitter)" },
  { id: "threads", name: "Threads" },
  { id: "github", name: "GitHub" },
  { id: "vercel", name: "Vercel" },
  { id: "railway", name: "Railway" },
];

type UserProfile = {
  email: string;
  name: string;
  avatarUrl: string | null;
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tNav = useTranslations("nav");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setProfile({
          email: data.user.email ?? "",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "",
          avatarUrl: data.user.user_metadata?.avatar_url ?? null,
        });
      }
    });
    listAccounts().then(setAccounts).catch(() => {});
  }, []);

  function handleLocaleChange(newLocale: string) {
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header -- matches home style */}
      <div className="px-8 py-5 flex items-center justify-between max-w-350 mx-auto">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm font-medium">{t("title")}</span>
        </div>
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          <ChevronLeft className="w-4 h-4" />
          {tNav("allProjects")}
        </Link>
      </div>

      <main className="px-8 pb-8 max-w-350 mx-auto">
        <motion.div
          className="grid grid-cols-2 gap-1.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          {/* Left column */}
          <div className="flex flex-col gap-1.5">
            {/* Profile */}
            <div className="bg-card rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {profile?.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {profile?.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{profile?.name ?? "..."}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </button>
              </div>
            </div>

            {/* Language + Theme side by side */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-card rounded-3xl p-5">
                <p className="text-xs text-muted-foreground mb-3">{t("language")}</p>
                <div className="flex flex-col gap-1.5">
                  {LANGUAGES.map((lang) => {
                    const isActive = locale === lang.code;
                    return (
                      <button
                        key={lang.code}
                        onClick={() => handleLocaleChange(lang.code)}
                        disabled={isPending}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 ${
                          isActive ? "bg-[rgba(239,255,0,0.08)] text-foreground" : "hover:bg-secondary text-muted-foreground"
                        }`}
                      >
                        {lang.label}
                        {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-card rounded-3xl p-5">
                <p className="text-xs text-muted-foreground mb-3">{t("theme")}</p>
                <div className="flex flex-col gap-1.5">
                  {THEMES.map((opt) => {
                    const isActive = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setTheme(opt.value)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                          isActive ? "bg-[rgba(239,255,0,0.08)] text-foreground" : "hover:bg-secondary text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <opt.icon className="w-4 h-4" />
                          {opt.label}
                        </div>
                        {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Danger */}
            <div className="bg-card rounded-3xl p-5">
              <div className="flex items-center justify-between px-3 py-3 rounded-xl bg-[rgba(217,123,120,0.06)]">
                <div>
                  <p className="text-sm font-medium">{t("deleteAccount")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("deleteAccountDesc")}</p>
                </div>
                <button className="text-xs font-medium px-3 py-1.5 rounded-xl transition-colors cursor-pointer" style={{ color: "#D97B78", background: "rgba(217,123,120,0.1)" }}>
                  {t("deleteAccount")}
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-1.5">
            {/* Connected Accounts */}
            <div className="bg-card rounded-3xl p-6">
              <p className="text-sm font-semibold mb-4">{t("connectedAccounts")}</p>
              <div className="flex flex-col gap-1.5">
                {SERVICES.map((svc) => {
                  const connected = accounts.find(a => a.provider === svc.id);
                  return (
                    <div key={svc.id} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-sm">{svc.name}</span>
                        {connected && (
                          <span className="text-xs text-muted-foreground">@{connected.provider_username}</span>
                        )}
                      </div>
                      {connected ? (
                        <button
                          onClick={async () => {
                            await disconnectAccount(connected.id);
                            setAccounts(prev => prev.filter(a => a.id !== connected.id));
                          }}
                          className="text-xs text-muted-foreground hover:text-[#D97B78] cursor-pointer transition-colors"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            try {
                              const { auth_url } = await connectAccount(svc.id);
                              window.location.href = auth_url;
                            } catch {}
                          }}
                          className="text-xs text-primary font-medium cursor-pointer"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notifications placeholder */}
            <div className="bg-card rounded-3xl p-5">
              <p className="text-sm font-semibold mb-2">{t("notifications")}</p>
              <p className="text-xs text-muted-foreground">{t("notificationsDesc")}</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
