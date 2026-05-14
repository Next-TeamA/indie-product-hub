"""Knowledge base tools for LaunchPad Agent."""

from app.agents.context import AgentContext
from app.agents.tools.registry import register_tool
from app.core.supabase import supabase, safe_maybe_single


async def _get_category(ctx: AgentContext, category: str = "") -> dict:
    """Get a specific knowledge base category."""
    if not category:
        return {"error": "No category specified. Options: commit_activity, pr_activity, deploy_history, sns_performance, market_context, project_readme"}
    content = ctx.knowledge.get(category)
    if content:
        return {"category": category, "content": content}
    # Fallback: query DB
    data = safe_maybe_single(
        supabase.table("project_knowledge")
        .select("title, content")
        .eq("project_id", ctx.project_id)
        .eq("category", category)
    )
    if data:
        return {"category": category, "content": data["content"]}
    return {"error": f"No knowledge found for category: {category}"}


async def _get_full_readme(ctx: AgentContext) -> dict:
    """Get the auto-generated project README (comprehensive context)."""
    readme = ctx.knowledge.get("project_readme", "")
    if readme:
        return {"readme": readme}
    return {"message": "Knowledge base not yet built. It syncs every 6 hours."}


async def _list_categories(ctx: AgentContext) -> dict:
    """List all available knowledge base categories for this project."""
    result = (
        supabase.table("project_knowledge")
        .select("category, title, updated_at")
        .eq("project_id", ctx.project_id)
        .execute()
    )
    return {"categories": [
        {"category": r["category"], "title": r["title"], "updated_at": r["updated_at"][:16]}
        for r in (result.data or [])
    ]}


def register_knowledge_tools():
    register_tool("knowledge_get_category", "Get a specific knowledge base category content",
        {"category": {"type": "string", "description": "Category: commit_activity, pr_activity, deploy_history, sns_performance, market_context, project_readme, sns_templates"}},
        _get_category, "knowledge")

    register_tool("knowledge_get_readme", "Get the full auto-generated project README",
        {}, _get_full_readme, "knowledge")

    register_tool("knowledge_list_categories", "List all available knowledge base categories",
        {}, _list_categories, "knowledge")
