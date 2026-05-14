"""SNS management tools for LaunchPad Agent."""

from app.agents.context import AgentContext
from app.agents.tools.registry import register_tool
from app.core.supabase import supabase, safe_maybe_single
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client


async def _get_stored_metrics(ctx: AgentContext, limit: int = 20) -> dict:
    """Get stored SNS metrics (zero API cost)."""
    result = (
        supabase.table("sns_metrics_snapshots")
        .select("post_id, impressions, likes, replies, reposts, views, snapshot_at")
        .eq("project_id", ctx.project_id)
        .order("snapshot_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"metrics": result.data or []}


async def _get_published_posts(ctx: AgentContext, limit: int = 20) -> dict:
    """Get published promotion posts from DB."""
    result = (
        supabase.table("promotion_posts")
        .select("id, platform, hook, content, hashtags, tone, content_type, status, published_at, external_post_id")
        .eq("project_id", ctx.project_id)
        .eq("status", "published")
        .order("published_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"posts": result.data or []}


async def _get_x_tweets(ctx: AgentContext, max_results: int = 20) -> dict:
    token = ctx.tokens.get("x")
    if not token:
        return {"error": "X (Twitter) not connected."}
    tweets = await x_client.get_user_tweets_with_metrics(token, max_results=max_results)
    return {"tweets": tweets}


async def _get_x_profile(ctx: AgentContext) -> dict:
    token = ctx.tokens.get("x")
    if not token:
        return {"error": "X (Twitter) not connected."}
    profile = await x_client.get_me(token)
    return profile


async def _get_threads_posts(ctx: AgentContext, limit: int = 20) -> dict:
    token = ctx.tokens.get("threads")
    if not token:
        return {"error": "Threads not connected."}
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("provider_user_id")
        .eq("user_id", ctx.user_id)
        .eq("provider", "threads")
        .eq("is_active", True)
    )
    if not account:
        return {"error": "Threads account not found."}
    posts = await threads_client.get_user_posts_with_insights(token, account["provider_user_id"], limit=limit)
    return {"posts": posts}


async def _get_threads_profile(ctx: AgentContext) -> dict:
    token = ctx.tokens.get("threads")
    if not token:
        return {"error": "Threads not connected."}
    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("provider_user_id")
        .eq("user_id", ctx.user_id)
        .eq("provider", "threads")
        .eq("is_active", True)
    )
    if not account:
        return {"error": "Threads account not found."}
    profile = await threads_client.get_profile_insights(token, account["provider_user_id"])
    return profile


async def _create_post_draft(
    ctx: AgentContext, platform: str = "threads", hook: str = "", content: str = "", hashtags: str = ""
) -> dict:
    """Create a draft promotion post in DB."""
    tag_list = [t.strip().lstrip("#") for t in hashtags.split(",") if t.strip()] if hashtags else []
    result = supabase.table("promotion_posts").insert({
        "project_id": ctx.project_id,
        "user_id": ctx.user_id,
        "platform": platform,
        "hook": hook,
        "content": content,
        "hashtags": tag_list,
        "status": "draft",
    }).execute()
    if result.data:
        return {"created": result.data[0]["id"], "status": "draft"}
    return {"error": "Failed to create post draft."}


async def _get_performance_summary(ctx: AgentContext) -> dict:
    """Aggregate SNS performance from stored data."""
    metrics = (
        supabase.table("sns_metrics_snapshots")
        .select("impressions, likes, replies, reposts, views")
        .eq("project_id", ctx.project_id)
        .execute()
    )
    data = metrics.data or []
    if not data:
        return {"message": "No SNS metrics data available. Publish posts and wait for metric sync."}
    return {
        "total_impressions": sum(m.get("impressions", 0) + m.get("views", 0) for m in data),
        "total_likes": sum(m.get("likes", 0) for m in data),
        "total_replies": sum(m.get("replies", 0) for m in data),
        "total_reposts": sum(m.get("reposts", 0) for m in data),
        "data_points": len(data),
    }


def register_sns_tools():
    register_tool("sns_stored_metrics", "Get stored SNS metrics snapshots (zero API cost)",
        {"limit": {"type": "integer", "description": "Max snapshots"}},
        _get_stored_metrics, "sns")

    register_tool("sns_published_posts", "Get published promotion posts from database",
        {"limit": {"type": "integer", "description": "Max posts"}},
        _get_published_posts, "sns")

    register_tool("sns_x_tweets", "Get recent tweets from connected X account (live API)",
        {"max_results": {"type": "integer", "description": "Max tweets"}},
        _get_x_tweets, "sns")

    register_tool("sns_x_profile", "Get X profile info (followers, etc)",
        {}, _get_x_profile, "sns")

    register_tool("sns_threads_posts", "Get recent Threads posts (live API)",
        {"limit": {"type": "integer", "description": "Max posts"}},
        _get_threads_posts, "sns")

    register_tool("sns_threads_profile", "Get Threads profile insights",
        {}, _get_threads_profile, "sns")

    register_tool("sns_create_draft", "Create a draft promotion post",
        {"platform": {"type": "string", "description": "Platform: threads or x"},
         "hook": {"type": "string", "description": "Opening hook line"},
         "content": {"type": "string", "description": "Post body"},
         "hashtags": {"type": "string", "description": "Comma-separated hashtags"}},
        _create_post_draft, "sns")

    register_tool("sns_performance_summary", "Get aggregated SNS performance stats",
        {}, _get_performance_summary, "sns")
