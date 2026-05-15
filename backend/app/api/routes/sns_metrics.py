"""SNS metrics collection and retrieval endpoints."""

from fastapi import APIRouter, Depends, BackgroundTasks

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.encryption import decrypt_token
from app.core.exceptions import ExternalAPIError, NotFoundError
from app.core.supabase import supabase, safe_maybe_single
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client

router = APIRouter(prefix="/projects/{project_id}/sns", tags=["sns-metrics"])


@router.get("/threads/search")
async def threads_keyword_search(
    project_id: str,
    q: str = "",
    limit: int = 20,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Search public Threads posts by keyword."""
    if not q:
        return {"results": [], "count": 0}
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token, provider_user_id")
        .eq("user_id", user["id"])
        .eq("provider", "threads")
        .eq("is_active", True)
    )
    if not account:
        return {"error": "Threads not connected"}
    token = decrypt_token(account["access_token"])
    posts = await threads_client.keyword_search(token, account["provider_user_id"], q, limit=limit)
    return {"results": posts, "count": len(posts)}


@router.get("/threads/mentions")
async def threads_mentions(
    project_id: str,
    limit: int = 20,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Get posts where the user is mentioned on Threads."""
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token, provider_user_id")
        .eq("user_id", user["id"])
        .eq("provider", "threads")
        .eq("is_active", True)
    )
    if not account:
        return {"mentions": [], "count": 0}
    token = decrypt_token(account["access_token"])
    try:
        mentions = await threads_client.get_mentions(token, account["provider_user_id"], limit=limit)
        return {"mentions": mentions, "count": len(mentions)}
    except ExternalAPIError:
        return {"mentions": [], "count": 0}


@router.get("/metrics")
async def get_sns_metrics(
    project_id: str,
    platform: str | None = None,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Get stored SNS metrics snapshots for this project."""
    query = (
        supabase.table("sns_metrics_snapshots")
        .select("*, promotion_posts!inner(platform, hook, content)")
        .eq("project_id", project_id)
        .order("snapshot_at", desc=True)
        .limit(50)
    )
    result = query.execute()
    data = result.data or []

    if platform:
        data = [d for d in data if d.get("promotion_posts", {}).get("platform") == platform]

    return data


@router.post("/sync")
async def sync_sns_metrics_now(
    project_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Manually trigger SNS metrics sync for this project."""
    background_tasks.add_task(_sync_project_metrics, project_id, user["id"])
    return {"status": "syncing"}


@router.get("/x/tweets")
async def get_x_tweets_with_metrics(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Get user's recent X tweets with full metrics (live from API)."""
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token, provider_user_id")
        .eq("user_id", user["id"])
        .eq("provider", "x")
        .eq("is_active", True)
    )
    if not account:
        raise NotFoundError("Connected X account")

    token = decrypt_token(account["access_token"])
    tweets = await x_client.get_user_tweets_with_metrics(
        token, account["provider_user_id"], max_results=20
    )
    return tweets


@router.get("/x/profile")
async def get_x_profile_metrics(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Get X profile-level metrics (followers, tweet count, etc)."""
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user["id"])
        .eq("provider", "x")
        .eq("is_active", True)
    )
    if not account:
        raise NotFoundError("Connected X account")

    token = decrypt_token(account["access_token"])
    return await x_client.get_user_profile_metrics(token)


@router.get("/threads/posts")
async def get_threads_posts_with_metrics(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Get user's recent Threads posts with insights (live from API)."""
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token, provider_user_id")
        .eq("user_id", user["id"])
        .eq("provider", "threads")
        .eq("is_active", True)
    )
    if not account:
        raise NotFoundError("Connected Threads account")

    token = decrypt_token(account["access_token"])
    posts = await threads_client.get_user_posts_with_insights(
        token, account["provider_user_id"], limit=20
    )
    return posts


@router.get("/threads/profile")
async def get_threads_profile_insights(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Get Threads profile-level insights (followers, views, engagement)."""
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token, provider_user_id")
        .eq("user_id", user["id"])
        .eq("provider", "threads")
        .eq("is_active", True)
    )
    if not account:
        raise NotFoundError("Connected Threads account")

    token = decrypt_token(account["access_token"])
    return await threads_client.get_profile_insights(
        token, account["provider_user_id"]
    )


async def _sync_project_metrics(project_id: str, user_id: str):
    """Background: pull latest metrics for all published posts in this project."""
    posts = (
        supabase.table("promotion_posts")
        .select("id, platform, external_post_id")
        .eq("project_id", project_id)
        .eq("status", "published")
        .not_.is_("external_post_id", "null")
        .execute()
    )

    for post in posts.data or []:
        try:
            account = safe_maybe_single(
                supabase.table("connected_accounts")
                .select("access_token, provider_user_id")
                .eq("user_id", user_id)
                .eq("provider", post["platform"])
                .eq("is_active", True)
            )
            if not account:
                continue

            token = decrypt_token(account["access_token"])

            if post["platform"] == "x":
                metrics = await x_client.get_tweet_metrics(token, post["external_post_id"])
                supabase.table("sns_metrics_snapshots").insert({
                    "post_id": post["id"],
                    "project_id": project_id,
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
                metrics = await threads_client.get_post_insights(token, post["external_post_id"])
                supabase.table("sns_metrics_snapshots").insert({
                    "post_id": post["id"],
                    "project_id": project_id,
                    "views": metrics.get("views", 0),
                    "likes": metrics.get("likes", 0),
                    "replies": metrics.get("replies", 0),
                    "reposts": metrics.get("reposts", 0),
                    "quotes": metrics.get("quotes", 0),
                }).execute()

        except Exception:
            continue
