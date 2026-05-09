"use client";

import { motion } from "motion/react";
import {
  Calendar,
  Megaphone,
  BarChart3,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.45, ease: EASE_OUT_EXPO },
  },
};

function StatCard({
  title,
  value,
  change,
  icon: Icon,
  href,
}: {
  title: string;
  value: string;
  change?: string;
  icon: React.ElementType;
  href: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <Link
        href={href}
        className="group block p-5 hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {change && (
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              {change}
            </span>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

function UpcomingItem({
  date,
  title,
  type,
}: {
  date: string;
  title: string;
  type: "promotion" | "calendar" | "issue";
}) {
  const labelMap = {
    promotion: "홍보",
    calendar: "일정",
    issue: "이슈",
  };

  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-xs text-muted-foreground w-10 shrink-0">
        {date}
      </span>
      <span className="text-xs text-muted-foreground">{labelMap[type]}</span>
      <span className="flex-1 text-sm">{title}</span>
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-10"
      >
        <motion.div variants={fadeUp}>
          <p className="h-eyebrow mb-1">DASHBOARD</p>
          <h1 className="text-2xl font-bold tracking-tight">TaskFlow</h1>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border">
          <StatCard
            title="예정 일정"
            value="8"
            icon={Calendar}
            href={`/projects/${id}/calendar`}
          />
          <StatCard
            title="홍보 콘텐츠"
            value="24"
            change="+3"
            icon={Megaphone}
            href={`/projects/${id}/promotion`}
          />
          <StatCard
            title="인사이트"
            value="5"
            icon={BarChart3}
            href={`/projects/${id}/insights`}
          />
          <StatCard
            title="운영 이슈"
            value="3"
            icon={AlertTriangle}
            href={`/projects/${id}/issues`}
          />
        </div>

        <hr className="border-border" />

        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold mb-2">다가오는 일정</h3>
          <div className="divide-y divide-border">
            <UpcomingItem date="5/12" title="Product Hunt 런칭" type="promotion" />
            <UpcomingItem date="5/14" title="v2.0 배포" type="calendar" />
            <UpcomingItem date="5/15" title="SSL 인증서 만료" type="issue" />
            <UpcomingItem date="5/18" title="인스타그램 캠페인 시작" type="promotion" />
          </div>
        </motion.div>

        <hr className="border-border" />

        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold mb-4">최근 홍보 성과</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold">1.2K</p>
              <p className="text-xs text-muted-foreground mt-1">총 노출</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">340</p>
              <p className="text-xs text-muted-foreground mt-1">클릭</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">28.3%</p>
              <p className="text-xs text-muted-foreground mt-1">전환율</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
