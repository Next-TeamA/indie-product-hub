"use client";

import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Eye, MousePointer, Users, Target } from "lucide-react";

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

function MetricCard({
  label,
  value,
  change,
  positive,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ElementType;
}) {
  return (
    <motion.div variants={fadeUp} className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {positive ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
        <span
          className={`text-xs font-medium ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
        >
          {change}
        </span>
        <span className="text-xs text-muted-foreground ml-1">vs 지난주</span>
      </div>
    </motion.div>
  );
}

const CHANNEL_DATA = [
  { channel: "Threads", impressions: "4.2K", clicks: "320", ctr: "7.6%", trend: "+12%" },
  { channel: "Bluesky", impressions: "2.8K", clicks: "180", ctr: "6.4%", trend: "+5%" },
  { channel: "Mastodon", impressions: "1.5K", clicks: "420", ctr: "28%", trend: "+45%" },
];

export default function InsightsPage() {
  return (
    <div className="p-8 w-full max-w-4xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-10"
      >
        <motion.div variants={fadeUp}>
          <p className="h-eyebrow mb-1">INSIGHTS</p>
          <h1 className="text-2xl font-bold tracking-tight">인사이트</h1>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-border">
          <MetricCard label="총 노출" value="9.4K" change="+18%" positive icon={Eye} />
          <MetricCard label="클릭" value="987" change="+12%" positive icon={MousePointer} />
          <MetricCard label="신규 방문자" value="342" change="+8%" positive icon={Users} />
          <MetricCard label="전환율" value="14.2%" change="-2%" positive={false} icon={Target} />
        </div>

        <hr className="border-border" />

        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold mb-4">주간 노출 추이</h3>
          <div className="h-48 flex items-end gap-2">
            {[40, 55, 35, 70, 85, 65, 90].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 bg-foreground/8 rounded-t-lg relative group"
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{
                  delay: 0.3 + i * 0.06,
                  duration: 0.6,
                  ease: EASE_OUT_EXPO,
                }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px]
                                text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                  {Math.round(h * 100)}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2">
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <span key={d} className="text-[10px] text-muted-foreground flex-1 text-center">
                {d}
              </span>
            ))}
          </div>
        </motion.div>

        <hr className="border-border" />

        <motion.div variants={fadeUp}>
          <h3 className="text-sm font-semibold mb-4">채널별 홍보 성과</h3>
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-3 font-medium">채널</th>
                <th className="pb-3 font-medium">노출</th>
                <th className="pb-3 font-medium">클릭</th>
                <th className="pb-3 font-medium">CTR</th>
                <th className="pb-3 font-medium">추이</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CHANNEL_DATA.map((row) => (
                <tr key={row.channel} className="hover:bg-muted/40 transition-colors">
                  <td className="py-3.5 text-sm font-medium">{row.channel}</td>
                  <td className="py-3.5 text-sm">{row.impressions}</td>
                  <td className="py-3.5 text-sm">{row.clicks}</td>
                  <td className="py-3.5 text-sm">{row.ctr}</td>
                  <td className="py-3.5 text-sm">
                    <span
                      className={`text-xs font-medium ${
                        row.trend.startsWith("+")
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {row.trend}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </motion.div>
    </div>
  );
}
