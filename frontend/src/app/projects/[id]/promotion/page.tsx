"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Send, Sparkles, Clock, Check, X as XIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const COLORS = {
  primary: "#EFFF00",
  secondary: "#6B7D8F",
  positive: "#5FCC7D",
  negative: "#D97B78",
};

const PLATFORMS = [
  { id: "x", label: "X", color: COLORS.secondary },
  { id: "threads", label: "Threads", color: COLORS.primary },
  { id: "bluesky", label: "Bluesky", color: "#5A6B7B" },
] as const;

const STATUS_CFG = {
  draft: { label: "Draft", color: COLORS.secondary },
  scheduled: { label: "Scheduled", color: COLORS.primary },
  published: { label: "Published", color: COLORS.positive },
  failed: { label: "Failed", color: COLORS.negative },
};

// Mock posts (will be replaced with real API in Phase 4)
const MOCK_POSTS = [
  {
    id: "1",
    platform: "threads",
    hook: "Just shipped the biggest update to TaskFlow yet",
    content: "After 3 weeks of heads-down building, v2.0 is live. New dashboard, real-time alerts, and AI-powered insights.",
    hashtags: ["indiedev", "buildinpublic", "saas"],
    status: "published" as const,
    published_at: "2026-05-10T10:00:00Z",
  },
  {
    id: "2",
    platform: "x",
    hook: "The indie hacker stack I wish I had 2 years ago",
    content: "Deploy monitoring + market insights + AI promotion in one dashboard. No more tab-switching between 10 tools.",
    hashtags: ["indiehacker", "devtools"],
    status: "scheduled" as const,
    scheduled_at: "2026-05-14T14:00:00Z",
  },
  {
    id: "3",
    platform: "bluesky",
    hook: "Building in public update #12",
    content: "This week: connected X and Threads APIs, added scheduled posting. Next: market intelligence with Gemini.",
    hashtags: ["buildinpublic"],
    status: "draft" as const,
  },
];

export default function PromotionPage() {
  const { id } = useParams<{ id: string }>();
  const t = useTranslations("promotion");
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? MOCK_POSTS : MOCK_POSTS.filter(p => p.status === filter);

  return (
    <div className="w-full">
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-1.5">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-2 text-sm cursor-pointer">
              <Sparkles className="w-4 h-4" />
              {t("generate")}
            </button>
            <Link
              href={`/projects/${id}/promotion/post/new`}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              {t("newPost")}
            </Link>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={fadeUp} className="grid grid-cols-4 gap-1.5">
          {[
            { label: "Total Posts", value: MOCK_POSTS.length, sub: "all time" },
            { label: "Published", value: MOCK_POSTS.filter(p => p.status === "published").length, sub: "live now" },
            { label: "Scheduled", value: MOCK_POSTS.filter(p => p.status === "scheduled").length, sub: "upcoming" },
            { label: "Drafts", value: MOCK_POSTS.filter(p => p.status === "draft").length, sub: "in progress" },
          ].map(s => (
            <div key={s.label} className="rounded-3xl bg-card p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold tabular-nums mt-1">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Filter + posts */}
        <motion.div variants={fadeUp} className="rounded-3xl bg-card p-5">
          {/* Filter tabs */}
          <div className="flex items-center gap-0.5 p-0.5 bg-secondary/30 rounded-xl w-fit mb-5">
            {[
              { id: "all", label: "All" },
              { id: "published", label: "Published" },
              { id: "scheduled", label: "Scheduled" },
              { id: "draft", label: "Drafts" },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Post list */}
          <div className="flex flex-col gap-1.5">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No posts found</p>
              </div>
            ) : (
              filtered.map((post, i) => {
                const platform = PLATFORMS.find(p => p.id === post.platform);
                const status = STATUS_CFG[post.status];
                return (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: EASE_OUT }}
                  >
                    <Link
                      href={`/projects/${id}/promotion/post/${post.id}`}
                      className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-secondary/30 transition-colors group"
                    >
                      {/* Platform badge */}
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                        style={{ background: `${platform?.color}15`, color: platform?.color }}
                      >
                        {platform?.label?.[0]}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-snug">{post.hook}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {post.hashtags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
                          ))}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: status.color }} />
                          <span className="text-xs text-muted-foreground">{status.label}</span>
                        </div>
                        {post.published_at && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(post.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {post.scheduled_at && (
                          <span className="text-[10px] tabular-nums" style={{ color: COLORS.primary }}>
                            {new Date(post.scheduled_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
