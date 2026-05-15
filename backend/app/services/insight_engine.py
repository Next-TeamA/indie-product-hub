"""Insight engine -- smart data analysis without extra API calls.

Uses STORED data (sns_metrics_snapshots, promotion_posts, deployment_logs, issues)
to detect trends, anomalies, and generate actionable insights.
Zero external API cost -- all computation is on our own data.
"""

from datetime import datetime, timezone, timedelta
from app.core.supabase import supabase
from app.integrations import gemini
from app.workspace.skill_loader import get_skill_prompt


async def generate_marketing_insights(project_id: str) -> dict:
    """Analyze stored SNS data to find patterns and recommendations.

    This runs on OUR data, not live API calls. Free computation.
    """
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    two_weeks_ago = (now - timedelta(days=14)).isoformat()

    # This week's metrics
    this_week = (
        supabase.table("sns_metrics_snapshots")
        .select("impressions, likes, replies, reposts, views, url_clicks, snapshot_at, post_id")
        .eq("project_id", project_id)
        .gte("snapshot_at", week_ago)
        .order("snapshot_at", desc=True)
        .execute()
    )

    # Last week's metrics (for comparison)
    last_week = (
        supabase.table("sns_metrics_snapshots")
        .select("impressions, likes, replies, reposts, views, url_clicks")
        .eq("project_id", project_id)
        .gte("snapshot_at", two_weeks_ago)
        .lt("snapshot_at", week_ago)
        .execute()
    )

    # Posts with their performance
    posts = (
        supabase.table("promotion_posts")
        .select("id, platform, hook, content, hashtags, tone, content_type, status, published_at, created_at")
        .eq("project_id", project_id)
        .eq("status", "published")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    # Aggregate this week
    tw = this_week.data or []
    lw = last_week.data or []

    tw_totals = {
        "impressions": sum(m.get("impressions", 0) + m.get("views", 0) for m in tw),
        "likes": sum(m.get("likes", 0) for m in tw),
        "replies": sum(m.get("replies", 0) for m in tw),
        "reposts": sum(m.get("reposts", 0) for m in tw),
        "clicks": sum(m.get("url_clicks", 0) for m in tw),
    }
    lw_totals = {
        "impressions": sum(m.get("impressions", 0) + m.get("views", 0) for m in lw),
        "likes": sum(m.get("likes", 0) for m in lw),
        "replies": sum(m.get("replies", 0) for m in lw),
        "reposts": sum(m.get("reposts", 0) for m in lw),
        "clicks": sum(m.get("url_clicks", 0) for m in lw),
    }

    # Calculate week-over-week changes
    changes = {}
    for key in tw_totals:
        prev = lw_totals.get(key, 0)
        curr = tw_totals[key]
        if prev == 0 and curr == 0:
            changes[key] = 0.0
        elif prev == 0:
            changes[key] = 100.0  # new data where there was none
        else:
            changes[key] = round((curr - prev) / prev * 100, 1)

    # Engagement rate
    total_impressions = max(tw_totals["impressions"], 1)
    engagement_rate = round(
        (tw_totals["likes"] + tw_totals["replies"] + tw_totals["reposts"]) / total_impressions * 100, 2
    )

    # Find best performing post
    post_metrics = {}
    for m in tw:
        pid = m.get("post_id")
        if pid:
            if pid not in post_metrics:
                post_metrics[pid] = {"impressions": 0, "engagement": 0}
            post_metrics[pid]["impressions"] += m.get("impressions", 0) + m.get("views", 0)
            post_metrics[pid]["engagement"] += m.get("likes", 0) + m.get("replies", 0) + m.get("reposts", 0)

    best_post_id = max(post_metrics, key=lambda p: post_metrics[p]["engagement"]) if post_metrics else None
    best_post = None
    if best_post_id:
        for p in posts.data or []:
            if p["id"] == best_post_id:
                best_post = {
                    "hook": p.get("hook", ""),
                    "platform": p.get("platform"),
                    "tone": p.get("tone"),
                    "content_type": p.get("content_type"),
                    **post_metrics[best_post_id],
                }
                break

    # Detect anomalies
    anomalies = []
    for key, change in changes.items():
        if change > 100:
            anomalies.append({"metric": key, "change": change, "type": "spike"})
        elif change < -50:
            anomalies.append({"metric": key, "change": change, "type": "drop"})

    # Daily impressions for chart (last 7 days)
    daily_impressions = []
    for days_ago in range(6, -1, -1):
        day_start = (now - timedelta(days=days_ago)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        day_total = sum(
            m.get("impressions", 0) + m.get("views", 0)
            for m in tw
            if day_start.isoformat() <= m.get("snapshot_at", "") < day_end.isoformat()
        )
        daily_impressions.append(day_total)

    # Platform breakdown with detailed metrics
    platform_data = {}
    for p in posts.data or []:
        plat = p.get("platform", "unknown")
        if plat not in platform_data:
            platform_data[plat] = {
                "posts": 0, "impressions": 0, "engagement": 0,
                "likes": 0, "replies": 0, "reposts": 0, "clicks": 0, "views": 0,
            }
        platform_data[plat]["posts"] += 1
        if p["id"] in post_metrics:
            platform_data[plat]["impressions"] += post_metrics[p["id"]]["impressions"]
            platform_data[plat]["engagement"] += post_metrics[p["id"]]["engagement"]

    # Aggregate per-platform metrics from snapshots
    for m in tw:
        pid = m.get("post_id")
        if not pid:
            continue
        # Find which platform this post belongs to
        for p in posts.data or []:
            if p["id"] == pid:
                plat = p.get("platform", "unknown")
                if plat in platform_data:
                    platform_data[plat]["likes"] += m.get("likes", 0)
                    platform_data[plat]["replies"] += m.get("replies", 0)
                    platform_data[plat]["reposts"] += m.get("reposts", 0)
                    platform_data[plat]["clicks"] += m.get("url_clicks", 0)
                    platform_data[plat]["views"] += m.get("views", 0)
                break

    return {
        "period": {"from": week_ago, "to": now.isoformat()},
        "totals": tw_totals,
        "changes": changes,
        "engagement_rate": engagement_rate,
        "best_post": best_post,
        "anomalies": anomalies,
        "by_platform": platform_data,
        "total_posts": len(posts.data or []),
        "data_points": len(tw),
        "daily_impressions": daily_impressions,
    }


async def generate_smart_market_insights(project_id: str) -> list[dict]:
    """Generate market insights using Gemini with search grounding.

    Cost optimization:
    - Uses gemini-2.5-flash (cheapest model)
    - Single API call generates 3-5 insights
    - Includes project context to avoid generic results
    - Search grounding = real-time data without separate crawling
    """
    project = (
        supabase.table("projects")
        .select("name, description, prd, sns_channels")
        .eq("id", project_id)
        .single()
        .execute()
    )
    if not project.data:
        return []

    p = project.data

    # Get existing insights to avoid duplicates + build history context
    recent = (
        supabase.table("market_insights")
        .select("title, summary, insight_type")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(15)
        .execute()
    )
    recent_titles = [r["title"] for r in (recent.data or [])]

    # Build accumulated knowledge context
    history_context = ""
    if recent.data:
        history_lines = [f"- [{r['insight_type']}] {r['title']}: {r['summary'][:100]}" for r in recent.data[:8]]
        history_context = f"\n\nPrevious insights (accumulated knowledge -- build on this, don't repeat):\n" + "\n".join(history_lines)

    # Get knowledge base for deeper project understanding
    kb = supabase.table("project_knowledge").select("category, content").eq("project_id", project_id).execute()
    kb_context = ""
    for k in (kb.data or []):
        if k["category"] in ("commit_activity", "sns_performance", "deploy_history"):
            kb_context += f"\n{k['content'][:300]}"

    prompt = f"""
Product: {p.get('name', 'Unknown')}
Description: {p.get('description', 'N/A')}
PRD/Category: {(p.get('prd') or 'N/A')[:500]}
Active channels: {', '.join(p.get('sns_channels', []))}
{history_context}
{f"Recent project activity:{kb_context}" if kb_context else ""}

Already covered (don't repeat these exact topics): {', '.join(recent_titles[:5])}

You are analyzing the market for THIS SPECIFIC product. Do NOT give generic industry news.

Search the web and analyze:
1. What are DIRECT COMPETITORS doing RIGHT NOW? Name them, quote specifics.
2. Where is THIS product WEAK compared to competitors? Be honest and specific.
3. What OPPORTUNITY can this product capitalize on that competitors are missing?
4. Is there a THREAT that could hurt this product's growth?

For each insight, explain:
- What it means for THIS product specifically (not the industry in general)
- What action the founder should take

Return 3-5 insights as JSON array:
[{{
  "insight_type": "competitor|trend|opportunity|threat",
  "title": "Specific headline (under 60 chars)",
  "summary": "2-3 sentences. MUST reference this product by name and explain impact. Include competitor names, dates, numbers.",
  "action_item": "One specific thing the founder should do about this",
  "relevance_score": 0.0 to 1.0,
  "is_urgent": true/false,
  "urgency_reason": "only if is_urgent=true"
}}]
"""

    try:
        insights = await gemini.generate_json(
            prompt=prompt,
            system=get_skill_prompt("market_research") or "You are a market analyst for indie software products. Be specific. Never use emojis.",
            model="gemini-2.5-flash",
            use_search=True,
        )

        if not isinstance(insights, list):
            insights = [insights]

        saved = []
        for insight in insights[:5]:
            detail = insight.get("action_item", "")
            if insight.get("urgency_reason"):
                detail = f"{detail}\n\nUrgency: {insight['urgency_reason']}" if detail else insight["urgency_reason"]
            result = supabase.table("market_insights").insert({
                "project_id": project_id,
                "insight_type": insight.get("insight_type", "trend"),
                "title": insight.get("title", "Untitled")[:200],
                "summary": insight.get("summary", "")[:1000],
                "detail": detail[:1000] if detail else None,
                "relevance_score": min(1.0, max(0.0, float(insight.get("relevance_score", 0.5)))),
                "is_urgent": bool(insight.get("is_urgent", False)),
                "urgency_reason": insight.get("urgency_reason"),
                "generated_by": "gemini-2.5-flash",
            }).execute()
            if result.data:
                saved.append(result.data[0])

        return saved

    except Exception:
        return []
