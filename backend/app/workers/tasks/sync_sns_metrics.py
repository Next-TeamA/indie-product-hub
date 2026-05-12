"""Periodic task: sync SNS metrics for published posts."""

from app.core.supabase import supabase
from app.core.encryption import decrypt_token
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client


async def sync_sns_metrics():
    """Pull latest metrics for all published posts with external IDs.
    Run every 30 minutes via scheduler.
    """
    # Get all published posts with external_post_id
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
            # Get user's account for this platform
            account = (
                supabase.table("connected_accounts")
                .select("access_token, provider_user_id")
                .eq("user_id", post["user_id"])
                .eq("provider", post["platform"])
                .eq("is_active", True)
                .maybe_single()
                .execute()
            )
            if not account.data:
                continue

            token = decrypt_token(account.data["access_token"])
            metrics = {}

            if post["platform"] == "x":
                data = await x_client.get_tweet_metrics(token, post["external_post_id"])
                pm = data.get("public_metrics", {})
                npm = data.get("non_public_metrics", {})
                metrics = {
                    "impressions": npm.get("impression_count", pm.get("impression_count", 0)),
                    "likes": pm.get("like_count", 0),
                    "replies": pm.get("reply_count", 0),
                    "reposts": pm.get("retweet_count", 0),
                    "quotes": pm.get("quote_count", 0),
                    "bookmarks": pm.get("bookmark_count", 0),
                    "url_clicks": npm.get("url_link_clicks", 0),
                    "profile_clicks": npm.get("user_profile_clicks", 0),
                }

            elif post["platform"] == "threads":
                data = await threads_client.get_post_insights(token, post["external_post_id"])
                metrics = {
                    "views": data.get("views", 0),
                    "likes": data.get("likes", 0),
                    "replies": data.get("replies", 0),
                    "reposts": data.get("reposts", 0),
                    "quotes": data.get("quotes", 0),
                }

            if metrics:
                supabase.table("sns_metrics_snapshots").insert({
                    "post_id": post["id"],
                    "project_id": post["project_id"],
                    **metrics,
                }).execute()

        except Exception:
            continue  # Skip failed posts, continue with others
