"""Web search tool for LangGraph agents.

Searches the web using Gemini's built-in Google Search grounding.
Returns structured search results that agents can reason over.
"""

from langchain_core.tools import tool
from app.integrations.gemini import generate_json


@tool
async def web_search(query: str) -> str:
    """Search the web for current information.

    Use this tool when you need:
    - Latest news about a competitor or industry
    - Current pricing of competitor products
    - Recent product launches or feature updates
    - Market trends and statistics
    - Social media buzz about a topic

    Args:
        query: The search query. Be specific. Include company names, dates, or product names.
              Example: "Notion AI features launched 2026" not "AI features"

    Returns:
        A structured summary of search results with key findings.
    """
    prompt = f"""
Search the web for: {query}

Summarize the top findings in structured format:
- What: key facts found
- Source: where the information came from
- Date: how recent the information is
- Relevance: why this matters

Be specific. Include names, numbers, dates.
"""
    try:
        result = await generate_json(
            prompt=prompt,
            system="You are a research assistant. Search the web and report factual findings. Never fabricate information.",
            use_search=True,
        )
        import json
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return f"Search failed: {str(e)}"
