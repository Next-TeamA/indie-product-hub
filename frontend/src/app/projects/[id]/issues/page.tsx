"use client";

import { motion } from "motion/react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Server,
  Shield,
  Zap,
} from "lucide-react";

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

type Issue = {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  category: string;
  icon: React.ElementType;
  time: string;
  status: "open" | "resolved" | "investigating";
};

const MOCK_ISSUES: Issue[] = [
  {
    id: "1",
    title: "SSL 인증서 만료 예정 (5/15)",
    severity: "critical",
    category: "보안",
    icon: Shield,
    time: "2시간 전",
    status: "open",
  },
  {
    id: "2",
    title: "API 응답 시간 평균 2.3s (기준: 1s 이하)",
    severity: "warning",
    category: "성능",
    icon: Zap,
    time: "6시간 전",
    status: "investigating",
  },
  {
    id: "3",
    title: "배포 실패: main@a3f2d1c (build timeout)",
    severity: "warning",
    category: "배포",
    icon: Server,
    time: "12시간 전",
    status: "resolved",
  },
  {
    id: "4",
    title: "Error rate 증가: /api/checkout (0.3% → 1.2%)",
    severity: "critical",
    category: "에러",
    icon: AlertTriangle,
    time: "1일 전",
    status: "open",
  },
];

const statusIcon = {
  open: XCircle,
  resolved: CheckCircle2,
  investigating: Clock,
};

const statusLabel = {
  open: "미해결",
  resolved: "해결됨",
  investigating: "조사 중",
};

export default function IssuesPage() {
  const openCount = MOCK_ISSUES.filter((i) => i.status !== "resolved").length;

  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-10"
      >
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div>
            <p className="h-eyebrow mb-1">ISSUES</p>
            <h1 className="text-2xl font-bold tracking-tight">운영 이슈</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              미해결 {openCount}건
            </span>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
        </motion.div>

        <div className="grid grid-cols-3 gap-0 divide-x divide-border">
          {[
            {
              label: "Critical",
              count: MOCK_ISSUES.filter((i) => i.severity === "critical" && i.status !== "resolved").length,
              color: "text-red-600 dark:text-red-400",
            },
            {
              label: "Warning",
              count: MOCK_ISSUES.filter((i) => i.severity === "warning" && i.status !== "resolved").length,
              color: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Resolved",
              count: MOCK_ISSUES.filter((i) => i.status === "resolved").length,
              color: "text-emerald-600 dark:text-emerald-400",
            },
          ].map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center py-4">
              <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <hr className="border-border" />

        <motion.div variants={fadeUp}>
          <div className="divide-y divide-border">
            {MOCK_ISSUES.map((issue) => {
              const StatusIcon = statusIcon[issue.status];
              return (
                <div
                  key={issue.id}
                  className="flex items-center gap-4 py-4 cursor-pointer hover:bg-muted/40 transition-colors -mx-2 px-2 rounded-lg"
                >
                  <issue.icon className="w-4 h-4 text-muted-foreground shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{issue.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{issue.category}</span>
                      <span className="text-xs text-muted-foreground">{issue.time}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <StatusIcon
                      className={`w-3.5 h-3.5 ${
                        issue.status === "resolved"
                          ? "text-emerald-500"
                          : issue.status === "investigating"
                            ? "text-amber-500"
                            : "text-red-500"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {statusLabel[issue.status]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
