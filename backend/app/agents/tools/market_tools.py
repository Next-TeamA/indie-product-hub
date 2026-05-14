"""Market research tools for LaunchPad Agent."""

from app.agents.core import AgentContext
from app.agents.tools.registry import register_tool
from app.core.supabase import supabase
from app.integrations import gemini


async def _web_search(ctx: AgentContext, query: str = "") -> dict:
    """Search the web using Gemini with Google Search grounding."""
    if not query:
        return {"error": "No search query provided."}
    result = await gemini.generate_json(
        prompt=f"Search for: {query}\n\nReturn results as JSON: [{{'title': '...', 'summary': '...', 'url': '...'}}]",
        system="You are a research assistant. Use web search to find current information. Return structured results.",
        use_search=True,
    )
    return {"results": result if isinstance(result, list) else [result]}


async def _get_stored_insights(ctx: AgentContext, limit: int = 10) -> dict:
    """Get stored market insights (zero API cost)."""
    result = (
        supabase.table("market_insights")
        .select("id, insight_type, title, summary, relevance_score, is_urgent, created_at")
        .eq("project_id", ctx.project_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"insights": result.data or []}


async def _generate_market_insight(ctx: AgentContext, focus: str = "") -> dict:
    """Generate a fresh market insight using AI + web search."""
    from app.services.insight_engine import generate_smart_market_insights
    insights = await generate_smart_market_insights(ctx.project_id)
    return {"generated": len(insights), "insights": [
        {"title": i.get("title", ""), "summary": i.get("summary", ""), "type": i.get("insight_type", "")}
        for i in insights
    ]}


def register_market_tools():
    register_tool("market_web_search", "Search the web for current information (uses Google Search)",
        {"query": {"type": "string", "description": "Search query"}},
        _web_search, "market")

    register_tool("market_stored_insights", "Get stored market insights from database",
        {"limit": {"type": "integer", "description": "Max insights"}},
        _get_stored_insights, "market")

    register_tool("market_generate_insight", "Generate fresh market insights using AI + web search",
        {"focus": {"type": "string", "description": "Optional focus area"}},
        _generate_market_insight, "market")
