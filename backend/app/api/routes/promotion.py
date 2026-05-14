"""Promotion content generation and management."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, BackgroundTasks, Request

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.rate_limit import limiter
from app.core.exceptions import ExternalAPIError, NotFoundError, ValidationError
from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
from app.integrations import gemini
from app.integrations.x_api import x_client
from app.integrations.threads_api import threads_client
from app.integrations.github_api import github_client
from app.models.promotion import (
    PromotionRequest,
    PromotionPostCreate,
    PromotionInfoUpsert,
    PromotionCampaignRequest,
    PromotionCampaignResponse,
)
from app.services.promotion_campaign import create_campaign
from app.workspace.skill_loader import get_skill_prompt

router = APIRouter(prefix="/projects/{project_id}/promotion", tags=["promotion"])


def _get_promotion_system_prompt() -> str:
    """Load promotion system prompt from skill file."""
    skill_content = get_skill_prompt("promotion")
    return f"You are a marketing copywriter specialized in indie products.\n\n{skill_content}" if skill_content else "You are a marketing copywriter. Write authentic, non-salesy promotional content."


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
@limiter.limit("10/minute")
async def generate_promotion(
    request: Request,
    project_id: str,
    body: PromotionRequest,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Generate promotion content with rich project context."""
    # Load project promotion info for context
    info = safe_maybe_single(
        supabase.table("project_promotion_info")
        .select("*")
        .eq("project_id", project_id)
    ) or {}

    # Load project details
    project = (
        supabase.table("projects")
        .select("name, description, prd, github_repo_owner, github_repo_name")
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

    # Pull knowledge base for richer context
    knowledge = (
        supabase.table("project_knowledge")
        .select("category, content")
        .eq("project_id", project_id)
        .execute()
    )
    if knowledge.data:
        kb_parts = []
        for k in knowledge.data:
            if k["category"] != "project_readme":
                kb_parts.append(k["content"][:500])
        if kb_parts:
            context_parts.append(f"\nProject Knowledge Base:\n{chr(10).join(kb_parts)}")
    else:
        # Fallback: pull GitHub context directly if no knowledge base yet
        github_context = await _get_github_context(user["id"], proj)
        if github_context:
            context_parts.append(f"\nRecent Development Activity:\n{github_context}")

    platform_hint = ""
    if body.template:
        platform_hint = f"\nPlatform: {body.template}"

    # Fetch reference examples matching the content type
    ref_examples = ""
    try:
        # Infer slot type from message
        slot_type = None
        msg_lower = body.message.lower()
        if any(w in msg_lower for w in ["출시", "launch", "런칭"]):
            slot_type = "launch"
        elif any(w in msg_lower for w in ["피드백", "feedback", "의견"]):
            slot_type = "feedback_request"
        elif any(w in msg_lower for w in ["업데이트", "update", "개선"]):
            slot_type = "update_share"
        elif any(w in msg_lower for w in ["문제", "problem", "고민", "힘든"]):
            slot_type = "problem_raising"
        else:
            slot_type = "feature_intro"

        refs = (
            supabase.table("promotion_references")
            .select("hook_text, body_text, cta_text, good_points")
            .eq("slot_type", slot_type)
            .limit(3)
            .execute()
        )
        if refs.data:
            ref_lines = []
            for r in refs.data:
                ref_lines.append(f"- Hook: {r['hook_text']} | Structure: {r['body_text']} | CTA: {r.get('cta_text', 'N/A')} | Good: {', '.join(r.get('good_points', []))}")
            ref_examples = f"\n\nReference patterns for this post type ({slot_type}):\n" + "\n".join(ref_lines)
    except Exception:
        pass

    prompt = f"""
{chr(10).join(context_parts)}
{platform_hint}
{ref_examples}

User request: {body.message}

Generate promotional content following the Playbook rules and reference patterns above.
Use the 5-Part Arc: Hook -> Context -> Solution -> Proof -> CTA.
Match the slot type and voice persona to the request.

Return as JSON:
{{
  "hook": "Opening line that grabs attention (1 sentence, follow hook formulas from playbook)",
  "content": "Main body following the 5-part arc structure",
  "hashtags": ["tag1", "tag2"]
}}
"""

    result = await gemini.generate_json(prompt=prompt, system=_get_promotion_system_prompt())

    # Save AI response
    import json
    ai_content = json.dumps(result, ensure_ascii=False) if isinstance(result, dict) else str(result)
    saved = supabase.table("promotion_messages").insert({
        "project_id": project_id,
        "role": "assistant",
        "content": ai_content,
    }).execute()

    return {"message": saved.data[0], "generated": result}


@router.post("/campaigns", response_model=PromotionCampaignResponse)
@limiter.limit("3/hour")
async def create_promotion_campaign(
    request: Request,
    project_id: str,
    body: PromotionCampaignRequest,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Generate a two-week Threads campaign and save 14 dated drafts."""
    return await create_campaign(project_id, user["id"], body)


@router.post("/posts")
async def create_post(
    project_id: str,
    body: PromotionPostCreate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Create a promotion post (draft or scheduled)."""
    now = datetime.now(timezone.utc)
    is_future = body.scheduled_at is not None and body.scheduled_at > now
    status = "scheduled" if is_future else "draft"
    data = {
        "project_id": project_id,
        "user_id": user["id"],
        "platform": body.platform,
        "hook": body.hook,
        "content": body.content,
        "hashtags": body.hashtags,
        "link": body.link,
        "images": body.images or [],
        "tone": body.tone,
        "content_type": body.content_type,
        "status": status,
        "scheduled_at": body.scheduled_at.isoformat() if body.scheduled_at else None,
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


@router.post("/posts/activate-scheduled")
async def activate_scheduled_posts(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Turn all future dated drafts into scheduled posts in one action."""
    now = datetime.now(timezone.utc).isoformat()
    result = (
        supabase.table("promotion_posts")
        .update({"status": "scheduled"})
        .eq("project_id", project_id)
        .eq("user_id", user["id"])
        .eq("status", "draft")
        .not_.is_("scheduled_at", "null")
        .gt("scheduled_at", now)
        .execute()
    )
    return {"updated": len(result.data or [])}


@router.patch("/posts/{post_id}")
async def update_post(
    project_id: str,
    post_id: str,
    body: PromotionPostCreate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Update a draft/scheduled promotion post."""
    updates = body.model_dump(exclude_none=True)
    # Re-evaluate status if scheduled_at changed
    if "scheduled_at" in updates:
        now = datetime.now(timezone.utc)
        sa = body.scheduled_at
        if sa and sa > now:
            updates["status"] = "scheduled"
        elif sa is None:
            updates["status"] = "draft"
        # Convert datetime to isoformat string for Supabase
        updates["scheduled_at"] = sa.isoformat() if sa else None
    if not updates:
        raise ValidationError("No fields to update")
    result = (
        supabase.table("promotion_posts")
        .update(updates)
        .eq("id", post_id)
        .eq("project_id", project_id)
        .in_("status", ["draft", "scheduled"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Post", post_id)
    return result.data[0]


@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(
    project_id: str,
    post_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Delete a draft/scheduled promotion post."""
    result = (
        supabase.table("promotion_posts")
        .delete()
        .eq("id", post_id)
        .eq("project_id", project_id)
        .in_("status", ["draft", "scheduled", "failed"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Post", post_id)


@router.post("/posts/{post_id}/publish")
@limiter.limit("5/minute")
async def publish_post(
    request: Request,
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
            "published_at": datetime.now(timezone.utc).isoformat(),
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
    data = safe_maybe_single(
        supabase.table("project_promotion_info")
        .select("*")
        .eq("project_id", project_id)
    )
    if not data:
        return {}
    return data


async def _get_github_context(user_id: str, project: dict) -> str | None:
    """Pull recent commits and PRs from the project's linked GitHub repo."""
    owner = project.get("github_repo_owner")
    repo = project.get("github_repo_name")
    if not owner or not repo:
        return None

    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user_id)
        .eq("provider", "github")
        .eq("is_active", True)
    )
    if not account:
        return None

    try:
        token = decrypt_token(account["access_token"])
        commits = await github_client.list_commits(token, owner, repo, per_page=5)
        pulls = await github_client.list_pulls(token, owner, repo, state="all", per_page=5)

        parts = []
        if commits:
            commit_lines = [
                f"- {c['commit']['message'].split(chr(10))[0]}" for c in commits
            ]
            parts.append("Recent commits:\n" + "\n".join(commit_lines))
        if pulls:
            pr_lines = [
                f"- [{p['state']}] {p['title']}" for p in pulls
            ]
            parts.append("Recent PRs:\n" + "\n".join(pr_lines))
        return "\n".join(parts) if parts else None
    except Exception:
        return None


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
