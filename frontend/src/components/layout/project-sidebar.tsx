"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Calendar,
  Megaphone,
  BarChart3,
  AlertTriangle,
  ChevronLeft,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  const NAV_ITEMS = [
    { href: "", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/calendar", label: t("calendar"), icon: Calendar },
    { href: "/promotion", label: t("promotion"), icon: Megaphone },
    { href: "/insights", label: t("insights"), icon: BarChart3 },
    { href: "/issues", label: t("issues"), icon: AlertTriangle },
  ];

  return (
    <aside className="w-60 shrink-0 bg-card h-dvh sticky top-0 flex flex-col">
      <div className="px-4 pt-5 pb-4">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {t("allProjects")}
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
            {projectName[0]?.toUpperCase()}
          </div>
          <h2 className="font-semibold text-sm truncate">{projectName}</h2>
        </div>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1">
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
              className={cn(
                "flex items-center gap-3 h-10 px-3 rounded-xl text-sm transition-all duration-150",
                isActive
                  ? "bg-[rgba(239,255,0,0.08)] text-foreground font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              {isActive && (
                <div className="w-0.75 h-4 rounded-full bg-primary -ml-3 mr-2 shrink-0" />
              )}
              <item.icon className={cn(
                "w-4.5 h-4.5 shrink-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <Link
          href="/settings"
          className="flex items-center gap-3 h-10 px-3 rounded-xl text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
        >
          <Settings className="w-4.5 h-4.5" />
          {t("settings")}
        </Link>
      </div>
    </aside>
  );
}
