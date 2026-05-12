"""Periodic task: publish scheduled promotion posts."""

from datetime import datetime, timezone

from app.core.supabase import supabase
from app.core.encryption import decrypt_token
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client


async def publish_scheduled_posts():
    """Check for posts scheduled to be published now.
    Run every 5 minutes via scheduler.
    """
    now = datetime.now(timezone.utc).isoformat()

    # Get posts that are scheduled and past their scheduled time
    posts = (
        supabase.table("promotion_posts")
        .select("*")
        .eq("status", "scheduled")
        .lte("scheduled_at", now)
        .limit(20)
        .execute()
    )

    for post in posts.data or []:
        post_id = post["id"]

        # Atomically set to publishing (prevents double-publish)
        result = (
            supabase.table("promotion_posts")
            .update({"status": "publishing"})
            .eq("id", post_id)
            .eq("status", "scheduled")  # Only if still scheduled
            .execute()
        )
        if not result.data:
            continue  # Already picked up by another worker

        try:
            # Get connected account
            account = (
                supabase.table("connected_accounts")
                .select("access_token, provider_user_id")
                .eq("user_id", post["user_id"])
                .eq("provider", post["platform"])
                .eq("is_active", True)
                .single()
                .execute()
            )
            if not account.data:
                raise Exception(f"No connected {post['platform']} account")

            token = decrypt_token(account.data["access_token"])
            text = (post.get("hook") or "") + "\n\n" + post["content"]
            if post.get("hashtags"):
                text += "\n\n" + " ".join(f"#{tag}" for tag in post["hashtags"])

            external_id = ""
            if post["platform"] == "x":
                result = await x_client.post_tweet(token, text[:280])
                external_id = result["id"]
            elif post["platform"] == "threads":
                external_id = await threads_client.create_post(
                    token, account.data["provider_user_id"], text[:500]
                )

            supabase.table("promotion_posts").update({
                "status": "published",
                "published_at": "now()",
                "external_post_id": str(external_id),
            }).eq("id", post_id).execute()

        except Exception as e:
            supabase.table("promotion_posts").update({
                "status": "failed",
                "publish_error": str(e)[:500],
            }).eq("id", post_id).execute()

            # Alert user
            supabase.table("alerts").insert({
                "user_id": post["user_id"],
                "project_id": post["project_id"],
                "alert_type": "scheduled_post_failed",
                "severity": "warning",
                "title": "Scheduled post failed",
                "message": f"Failed to publish to {post['platform']}: {str(e)[:200]}",
                "source_table": "promotion_posts",
                "source_id": post_id,
            }).execute()
