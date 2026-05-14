"""Periodic task: sync SNS metrics for published posts."""

from app.core.supabase import supabase, safe_maybe_single
from app.core.encryption import decrypt_token
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client


async def sync_sns_metrics():
    """Pull latest metrics for all published posts with external IDs.
    Run every 30 minutes via scheduler.
    """
    posts = (
        supabase.table("promotion_posts")
        .select("id, project_id, user_id, platform, external_post_id")
        .eq("status", "published")
        .not_.is_("external_post_id", "null")
        .limit(100)
        .execute()
    )

    for post in posts.data or []:
        try:
            account = safe_maybe_single(
                supabase.table("connected_accounts")
                .select("access_token, provider_user_id")
                .eq("user_id", post["user_id"])
                .eq("provider", post["platform"])
                .eq("is_active", True)
            )
            if not account:
                continue

            token = decrypt_token(account["access_token"])

            if post["platform"] == "x":
                # get_tweet_metrics returns flat dict with impressions, likes, etc.
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

            elif post["platform"] == "threads":
                # get_post_insights returns flat dict with views, likes, etc.
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
            continue  # Skip failed posts, continue with others
