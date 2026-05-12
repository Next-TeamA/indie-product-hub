"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  BarChart3,
  AlertTriangle,
  ChevronLeft,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectAvatar } from "@/components/project-avatar";

interface ProjectSidebarProps {
  projectId: string;
  projectName?: string;
}

export function ProjectSidebar({
  projectId,
  projectName = "Project",
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;
  const t = useTranslations("nav");
  const [collapsed, setCollapsed] = useState(false);

  const NAV_ITEMS = [
    { href: "", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/calendar", label: t("calendar"), icon: Calendar },
    { href: "/promotion", label: t("promotion"), icon: Megaphone },
    { href: "/insights", label: t("insights"), icon: BarChart3 },
    { href: "/issues", label: t("issues"), icon: AlertTriangle },
  ];

  return (
    <motion.aside
      className="shrink-0 bg-card h-dvh sticky top-0 flex flex-col overflow-hidden"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className={cn("pt-4 pb-3", collapsed ? "px-2" : "px-4")}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setCollapsed(false)}
              className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4 text-muted-foreground" />
            </button>
            <Link href="/projects">
              <ProjectAvatar name={projectName} size={40} />
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <Link
                href="/projects"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {t("allProjects")}
              </Link>
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <ProjectAvatar name={projectName} size={32} />
              <h2 className="font-semibold text-sm truncate">{projectName}</h2>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 flex flex-col gap-0.5", collapsed ? "px-2 pt-2" : "px-3")}>
        {NAV_ITEMS.map((item) => {
          const fullHref = `${basePath}${item.href}`;
          const isActive =
            item.href === ""
              ? pathname === basePath
              : pathname.startsWith(fullHref);

          return (
            <Link
              key={item.href}
              href={fullHref}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl transition-all duration-150",
                collapsed ? "w-10 h-10 justify-center mx-auto" : "h-10 px-3",
                isActive
                  ? "bg-[rgba(239,255,0,0.08)] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn(
                "w-4.5 h-4.5 shrink-0",
                isActive ? "text-primary" : ""
              )} />
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("pb-3", collapsed ? "px-2" : "px-3")}>
        <Link
          href="/settings"
          title={collapsed ? t("settings") : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all",
            collapsed ? "w-10 h-10 justify-center mx-auto" : "h-10 px-3"
          )}
        >
          <Settings className="w-4.5 h-4.5" />
          {!collapsed && t("settings")}
        </Link>
      </div>
    </motion.aside>
  );
}
