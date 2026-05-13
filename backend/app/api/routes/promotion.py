"""Promotion content generation and management."""

from fastapi import APIRouter, Depends, BackgroundTasks

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.exceptions import ExternalAPIError, NotFoundError, ValidationError
from app.core.encryption import decrypt_token
from app.core.supabase import supabase
from app.integrations import gemini
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client
from app.models.promotion import PromotionRequest, PromotionPostCreate, PromotionInfoUpsert

router = APIRouter(prefix="/projects/{project_id}/promotion", tags=["promotion"])

SYSTEM_PROMPT = """You are a marketing copywriter specialized in indie products and startups.

Rules:
- Write in the language the user requests. Default to Korean if not specified.
- Never use emojis. Never.
- Be authentic, not salesy. Indie hackers value honesty over hype.
- Include specific product details, not generic marketing speak.
- The hook must grab attention in the first line (it's what shows in feeds before "see more").
- Match the platform's culture and constraints.
- Avoid cliches like "game-changer", "revolutionary", "next-level".
- Sound like a real person sharing something they built, not a brand account.

Platform guidelines:
- X (Twitter): Max 280 chars. Short, punchy. Use threads for longer content. No hashtag spam (1-2 max).
- Threads: Max 500 chars. Conversational, community-oriented. Can be longer and more personal.
- Bluesky: Max 300 chars. Tech-savvy audience. Authentic, minimal.

Tone options:
- friendly: Casual, approachable, like talking to a friend at a coffee shop
- professional: Polished but not corporate. Think "founder update email"
- humorous: Witty and self-aware. Not forced jokes.
- informative: Data-driven, specific. Numbers and results.

Content type guidelines:
- launch: Focus on the problem solved, not feature lists. "I was frustrated with X, so I built Y"
- update: What changed and why users should care. Concrete improvements.
- retrospective: Honest reflection. Numbers, lessons learned, what's next.
- qa: Answer a question users actually ask. Not self-promotional FAQ.
- tip: Actionable advice related to your product's domain.
- milestone: Celebrate authentically. Share the journey, not just the number.
"""


@router.get("/history")
async def get_history(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("promotion_messages")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at")
        .execute()
    )
    return result.data


@router.post("/generate")
async def generate_promotion(
    project_id: str,
    body: PromotionRequest,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Generate promotion content with rich project context."""
    # Load project promotion info for context
    promo_info = (
        supabase.table("project_promotion_info")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
    )
    info = promo_info.data or {}

    # Load project details
    project = (
        supabase.table("projects")
        .select("name, description, prd")
        .eq("id", project_id)
        .single()
        .execute()
    )
    proj = project.data

    # Save user message
    supabase.table("promotion_messages").insert({
        "project_id": project_id,
        "role": "user",
        "content": body.message,
    }).execute()

    # Build context-rich prompt
    context_parts = [
        f"Product: {proj.get('name', 'Unknown')}",
        f"Description: {proj.get('description', info.get('description', 'N/A'))}",
    ]
    if info.get("target_user"):
        context_parts.append(f"Target User: {info['target_user']}")
    if info.get("key_values"):
        context_parts.append(f"Key Values: {info['key_values']}")
    if proj.get("prd"):
        context_parts.append(f"PRD Summary: {proj['prd'][:500]}")

    platform_hint = ""
    if body.template:
        platform_hint = f"\nPlatform: {body.template}"

    prompt = f"""
{chr(10).join(context_parts)}
{platform_hint}

User request: {body.message}

Generate promotional content. Return as JSON:
{{
  "hook": "Opening line that grabs attention (1 sentence)",
  "content": "Main body of the post",
  "hashtags": ["tag1", "tag2"]
}}
"""

    result = await gemini.generate_json(prompt=prompt, system=SYSTEM_PROMPT)

    # Save AI response
    import json
    ai_content = json.dumps(result, ensure_ascii=False) if isinstance(result, dict) else str(result)
    saved = supabase.table("promotion_messages").insert({
        "project_id": project_id,
        "role": "assistant",
        "content": ai_content,
    }).execute()

    return {"message": saved.data[0], "generated": result}


@router.post("/posts")
async def create_post(
    project_id: str,
    body: PromotionPostCreate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Create a promotion post (draft)."""
    data = {
        "project_id": project_id,
        "user_id": user["id"],
        "platform": body.platform,
        "hook": body.hook,
        "content": body.content,
        "hashtags": body.hashtags,
        "link": body.link,
        "tone": body.tone,
        "content_type": body.content_type,
        "status": "draft",
    }
    result = supabase.table("promotion_posts").insert(data).execute()
    return result.data[0]


@router.get("/posts")
async def list_posts(
    project_id: str,
    status: str | None = None,
    platform: str | None = None,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    query = (
        supabase.table("promotion_posts")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
    )
    if status:
        query = query.eq("status", status)
    if platform:
        query = query.eq("platform", platform)
    result = query.execute()
    return result.data


@router.post("/posts/{post_id}/publish")
async def publish_post(
    project_id: str,
    post_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Publish a post to the connected SNS platform."""
    # Get post
    post = (
        supabase.table("promotion_posts")
        .select("*")
        .eq("id", post_id)
        .eq("project_id", project_id)
        .single()
        .execute()
    )
    if not post.data:
        raise NotFoundError("Post", post_id)

    post_data = post.data
    if post_data["status"] in ("published", "publishing"):
        raise ValidationError("Post is already published or publishing")

    # Atomically set to publishing -- only if still draft/scheduled (prevents double-publish)
    update_result = (
        supabase.table("promotion_posts")
        .update({"status": "publishing"})
        .eq("id", post_id)
        .in_("status", ["draft", "scheduled"])
        .execute()
    )
    if not update_result.data:
        raise ValidationError("Post is already being published")

    # Publish in background
    background_tasks.add_task(_do_publish, user["id"], post_data)
    return {"status": "publishing", "post_id": post_id}


async def _do_publish(user_id: str, post_data: dict):
    """Background task to publish to SNS platform."""
    post_id = post_data["id"]
    platform = post_data["platform"]
    text = post_data.get("hook", "") + "\n\n" + post_data["content"]
    if post_data.get("hashtags"):
        text += "\n\n" + " ".join(f"#{tag}" for tag in post_data["hashtags"])

    try:
        # Get user's connected account for this platform
        account = (
            supabase.table("connected_accounts")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", platform)
            .eq("is_active", True)
            .single()
            .execute()
        )
        if not account.data:
            raise ExternalAPIError(platform, "No connected account found")

        token = decrypt_token(account.data["access_token"])

        if platform == "x":
            result = await x_client.post_tweet(token, text[:280])
            external_id = result["id"]
        elif platform == "threads":
            external_id = await threads_client.create_post(
                token, account.data["provider_user_id"], text[:500]
            )
        else:
            raise ExternalAPIError(platform, "Publishing not supported for this platform")

        # Update post as published
        supabase.table("promotion_posts").update({
            "status": "published",
            "published_at": "now()",
            "external_post_id": str(external_id),
        }).eq("id", post_id).execute()

    except Exception as e:
        # Mark as failed with error
        supabase.table("promotion_posts").update({
            "status": "failed",
            "publish_error": str(e)[:500],
        }).eq("id", post_id).execute()


@router.get("/info")
async def get_promotion_info(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("project_promotion_info")
        .select("*")
        .eq("project_id", project_id)
        .maybe_single()
        .execute()
    )
    return result.data or {}


@router.put("/info")
async def upsert_promotion_info(
    project_id: str,
    body: PromotionInfoUpsert,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    data = {"project_id": project_id, **body.model_dump(exclude_none=True)}
    result = supabase.table("project_promotion_info").upsert(data).execute()
    return result.data[0]
