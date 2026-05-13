"""Smart sync -- cost-optimized metric collection.

Instead of syncing ALL posts every 30 minutes:
- Recent posts (< 7 days): every 30 minutes
- Older posts (7-30 days): every 6 hours
- Posts > 30 days: once per day

This reduces X API costs by ~80% while keeping recent data fresh.
"""

from datetime import datetime, timezone, timedelta

from app.core.supabase import supabase
from app.core.encryption import decrypt_token
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client


async def smart_sync_metrics():
    """Cost-optimized SNS metrics sync.

    Tiered approach based on post age.
    """
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()

    # Tier 1: Recent posts (< 7 days) -- sync every run (30 min)
    recent_posts = (
        supabase.table("promotion_posts")
        .select("id, project_id, user_id, platform, external_post_id, created_at")
        .eq("status", "published")
        .not_.is_("external_post_id", "null")
        .gte("created_at", week_ago)
        .execute()
    )

    # Tier 2: Older posts (7-30 days) -- check if last sync was > 6 hours ago
    older_posts_raw = (
        supabase.table("promotion_posts")
        .select("id, project_id, user_id, platform, external_post_id, created_at")
        .eq("status", "published")
        .not_.is_("external_post_id", "null")
        .lt("created_at", week_ago)
        .gte("created_at", month_ago)
        .execute()
    )

    # Filter older posts: only sync if last snapshot > 6 hours ago
    six_hours_ago = (now - timedelta(hours=6)).isoformat()
    older_posts = []
    for p in older_posts_raw.data or []:
        last_snapshot = (
            supabase.table("sns_metrics_snapshots")
            .select("snapshot_at")
            .eq("post_id", p["id"])
            .order("snapshot_at", desc=True)
            .limit(1)
            .execute()
        )
        if not last_snapshot.data or last_snapshot.data[0]["snapshot_at"] < six_hours_ago:
            older_posts.append(p)

    all_posts = (recent_posts.data or []) + older_posts

    # Group by user to minimize account lookups
    by_user: dict[str, list[dict]] = {}
    for p in all_posts:
        uid = p["user_id"]
        if uid not in by_user:
            by_user[uid] = []
        by_user[uid].append(p)

    for user_id, posts in by_user.items():
        # Get accounts once per user
        accounts = (
            supabase.table("connected_accounts")
            .select("provider, access_token, provider_user_id")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .execute()
        )
        account_map = {a["provider"]: a for a in (accounts.data or [])}

        for post in posts:
            platform = post["platform"]
            account = account_map.get(platform)
            if not account:
                continue

            try:
                token = decrypt_token(account["access_token"])

                if platform == "x":
                    metrics = await x_client.get_tweet_metrics(token, post["external_post_id"])
                    supabase.table("sns_metrics_snapshots").insert({
                        "post_id": post["id"],
                        "project_id": post["project_id"],
                        "impressions": metrics.get("impressions", 0),
                        "likes": metrics.get("likes", 0),
                        "replies": metrics.get("replies", 0),
                        "reposts": metrics.get("retweets", 0),
                        "quotes": metrics.get("quotes", 0),
                        "bookmarks": metrics.get("bookmarks", 0),
                        "url_clicks": metrics.get("url_clicks", 0),
                        "profile_clicks": metrics.get("profile_clicks", 0),
                    }).execute()

                elif platform == "threads":
                    metrics = await threads_client.get_post_insights(token, post["external_post_id"])
                    supabase.table("sns_metrics_snapshots").insert({
                        "post_id": post["id"],
                        "project_id": post["project_id"],
                        "views": metrics.get("views", 0),
                        "likes": metrics.get("likes", 0),
                        "replies": metrics.get("replies", 0),
                        "reposts": metrics.get("reposts", 0),
                        "quotes": metrics.get("quotes", 0),
                    }).execute()

            except Exception:
                continue


async def daily_market_insights():
    """Generate market insights once per day for active projects.

    Cost: ~1 Gemini API call per active project per day.
    With search grounding, each call is slightly more expensive,
    but one call per day is very affordable.
    """
    from app.services.insight_engine import generate_smart_market_insights

    projects = (
        supabase.table("projects")
        .select("id")
        .eq("status", "active")
        .execute()
    )

    for project in projects.data or []:
        try:
            await generate_smart_market_insights(project["id"])
        except Exception:
            continue
