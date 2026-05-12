"use client";

import { useState, useEffect, useTransition } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useTranslations, useLocale } from "next-intl";
import {
  Globe,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  User,
  Link2,
  Bell,
  Trash2,
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
  { code: "en", label: "English", flag: "EN" },
  { code: "ko", label: "한국어", flag: "KO" },
] as const;

const THEMES = [
  { value: "dark", icon: Moon },
  { value: "light", icon: Sun },
  { value: "system", icon: Monitor },
] as const;

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
      <div className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <span className="text-muted-foreground/30">/</span>
          <span className="text-sm font-medium">{t("title")}</span>
        </div>
        <Link
          href="/projects"
          className="btn-ghost flex items-center gap-1.5 text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          {tNav("allProjects")}
        </Link>
      </div>

      <main className="px-8 pb-8 max-w-2xl">
        <motion.div
          className="flex flex-col gap-1.5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          {/* Profile */}
          <section className="bg-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <User className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">{t("profile")}</h3>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                    {profile?.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">{profile?.name ?? "Loading..."}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </section>

          {/* Language */}
          <section className="bg-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">{t("language")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("languageDesc")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => {
                const isActive = locale === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLocaleChange(lang.code)}
                    disabled={isPending}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer disabled:opacity-50 ${
                      isActive
                        ? "bg-[rgba(239,255,0,0.08)] text-foreground font-medium"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-bold w-6 text-center">{lang.flag}</span>
                    {lang.label}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Theme */}
          <section className="bg-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">{t("theme")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("themeDesc")}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {THEMES.map((opt) => {
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm transition-all cursor-pointer ${
                      isActive
                        ? "bg-[rgba(239,255,0,0.08)] text-foreground font-medium"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {t(opt.value)}
                    {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Connected Accounts */}
          <section className="bg-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">{t("connectedAccounts")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("connectedAccountsDesc")}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { id: "x", name: "X (Twitter)" },
                { id: "threads", name: "Threads" },
                { id: "github", name: "GitHub" },
                { id: "vercel", name: "Vercel" },
                { id: "railway", name: "Railway" },
              ].map((svc) => {
                const connected = accounts.find(a => a.provider === svc.id);
                return (
                  <div key={svc.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-secondary">
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
                        className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
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
                        className="text-xs text-primary font-medium hover:underline cursor-pointer"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Notifications */}
          <section className="bg-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <div>
                <h3 className="text-sm font-semibold">{t("notifications")}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t("notificationsDesc")}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </section>

          {/* Danger Zone */}
          <section className="bg-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <Trash2 className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-semibold text-destructive">{t("danger")}</h3>
            </div>
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-destructive/5">
              <div>
                <p className="text-sm font-medium">{t("deleteAccount")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("deleteAccountDesc")}</p>
              </div>
              <button className="text-xs text-destructive font-medium px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-colors cursor-pointer">
                {t("deleteAccount")}
              </button>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
}
