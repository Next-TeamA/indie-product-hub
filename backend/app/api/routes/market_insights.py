"""Market insight generation and retrieval."""

from fastapi import APIRouter, Depends, BackgroundTasks, Request

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase
from app.integrations import gemini
from app.models.promotion import InsightUpdate
from app.core.rate_limit import limiter
from app.workspace.skill_loader import get_skill_prompt

router = APIRouter(prefix="/projects/{project_id}/insights/market", tags=["market-insights"])

MARKET_SYSTEM_PROMPT = """You are a market intelligence analyst for indie software products.
Your job is to analyze the competitive landscape and identify actionable insights.

Rules:
- Be specific and data-driven. No vague statements like "the market is growing".
- Focus on what the founder can ACT on, not just observe.
- If something is urgent (competitor launched a similar feature, market shift), flag it clearly.
- Write in the same language as the product description.
- Never use emojis.
- Each insight should be 2-3 sentences max.
"""


@router.get("")
async def list_market_insights(
    project_id: str,
    is_read: bool | None = None,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    query = (
        supabase.table("market_insights")
        .select("*")
        .eq("project_id", project_id)
        .eq("is_dismissed", False)
        .order("created_at", desc=True)
        .limit(20)
    )
    if is_read is not None:
        query = query.eq("is_read", is_read)
    result = query.execute()
    return result.data


@router.post("/generate")
@limiter.limit("3/minute")
async def generate_market_insights(
    request: Request,
    project_id: str,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    project: dict = Depends(verify_project_access),
):
    """Trigger market insight generation in background."""
    background_tasks.add_task(_generate_insights, project_id, project)
    return {"status": "generating", "message": "Insights will be available shortly"}


async def _generate_insights(project_id: str, project: dict):
    """Background task: generate market insights using Gemini."""
    prompt = f"""
Analyze the current market landscape for this product:
Product: {project.get("name", "Unknown")}
Description: {project.get("description", "N/A")}
PRD: {(project.get("prd") or "N/A")[:500]}

Tasks:
1. Identify 2-3 competitors and their recent activity
2. Find relevant industry trends
3. Spot opportunities or threats
4. Rate urgency for each finding

Return as JSON array:
[
  {{
    "insight_type": "competitor|trend|news|opportunity|threat",
    "title": "Short headline (under 60 chars)",
    "summary": "2-3 sentence analysis",
    "relevance_score": 0.0 to 1.0,
    "is_urgent": true/false,
    "urgency_reason": "Why urgent (only if is_urgent=true)"
  }}
]
"""
    try:
        insights = await gemini.generate_json(
            prompt=prompt,
            system=get_skill_prompt("market_research") or MARKET_SYSTEM_PROMPT,
            model="gemini-2.5-flash",
            use_search=True,  # Real-time web search for latest competitor/market data
        )

        if not isinstance(insights, list):
            insights = [insights]

        for insight in insights[:5]:
            supabase.table("market_insights").insert({
                "project_id": project_id,
                "insight_type": insight.get("insight_type", "trend"),
                "title": insight.get("title", "Untitled"),
                "summary": insight.get("summary", ""),
                "relevance_score": min(1.0, max(0.0, float(insight.get("relevance_score", 0.5)))),
                "is_urgent": bool(insight.get("is_urgent", False)),
                "urgency_reason": insight.get("urgency_reason"),
                "generated_by": "gemini-2.5-flash",
            }).execute()

            # Create alert for urgent insights
            if insight.get("is_urgent"):
                # Get project owner
                proj = supabase.table("projects").select("user_id").eq("id", project_id).single().execute()
                if proj.data:
                    supabase.table("alerts").insert({
                        "user_id": proj.data["user_id"],
                        "project_id": project_id,
                        "alert_type": "market_urgent",
                        "severity": "warning",
                        "title": insight.get("title", "Market Alert"),
                        "message": insight.get("summary", ""),
                        "source_table": "market_insights",
                    }).execute()
    except Exception:
        pass  # Silently fail for background tasks


@router.patch("/{insight_id}")
async def update_insight(
    project_id: str,
    insight_id: str,
    body: InsightUpdate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Mark insight as read or dismissed."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return {"ok": True}

    supabase.table("market_insights").update(updates).eq("id", insight_id).eq("project_id", project_id).execute()
    return {"ok": True}
