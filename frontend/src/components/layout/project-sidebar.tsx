"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  AlertTriangle,
  ChevronLeft,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/logo";

const NAV_ITEMS = [
  { href: "", label: "대시보드", icon: LayoutDashboard },
  { href: "/promotion", label: "홍보", icon: Megaphone },
  { href: "/insights", label: "인사이트", icon: BarChart3 },
  { href: "/issues", label: "운영 이슈", icon: AlertTriangle },
];

interface ProjectSidebarProps {
  projectId: string;
  projectName?: string;
}

export function ProjectSidebar({
  projectId,
  projectName = "프로젝트",
}: ProjectSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/projects/${projectId}`;
  const user = useUser();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="w-60 shrink-0 border-r border-sidebar-border bg-sidebar h-dvh sticky top-0 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          전체 프로젝트
        </Link>
        <h2 className="font-semibold text-sm truncate">{projectName}</h2>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 flex flex-col gap-1">
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer: User + Settings + Sign out */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          설정
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors w-full text-left cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          로그아웃
        </button>
        <div className="flex items-center gap-2 px-3 pt-2">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
              {user?.name?.[0]?.toUpperCase() ?? "U"}
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {user?.email ?? "loading..."}
          </span>
        </div>
      </div>
    </aside>
  );
}
