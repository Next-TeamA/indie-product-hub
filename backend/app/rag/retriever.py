"""Retrieval -- pgvector hybrid search (vector + BM25 + RRF) via Supabase RPC.

기획서 §부록 F.3/F.4/F.6:
- match_project_chunks / match_global_chunks RPC가 DB에서 hybrid search 수행
- voice few-shot: source_type='past_post' chunk를 retrieve → 선택적 Cohere rerank
- supabase 클라이언트는 동기 — await 없이 .execute()
"""

from app.core.supabase import supabase
from app.integrations import cohere_api
from app.rag.embedder import embed_query


async def search_project(project_id: str, query: str, match_count: int = 20) -> list[dict]:
    """Per-project hybrid search.

    Returns list of {id, content, contextualized_content, score, metadata}.
    """
    query_embedding = await embed_query(query)
    if not query_embedding:
        return []
    resp = supabase.rpc(
        "match_project_chunks",
        {
            "query_embedding": query_embedding,
            "filter_project_id": project_id,
            "query_text": query,
            "match_count": match_count,
        },
    ).execute()
    return resp.data or []


async def search_global(query: str, match_count: int = 20) -> list[dict]:
    """Global (cross-tenant) hybrid search.

    Returns list of {id, content, contextualized_content, score, category, metadata}.
    """
    query_embedding = await embed_query(query)
    if not query_embedding:
        return []
    resp = supabase.rpc(
        "match_global_chunks",
        {
            "query_embedding": query_embedding,
            "query_text": query,
            "match_count": match_count,
        },
    ).execute()
    return resp.data or []


async def retrieve_voice_examples(project_id: str, query: str, top_n: int = 5) -> list[str]:
    """Retrieve the most relevant past_post chunks for voice matching.

    1. project chunk hybrid search (over-fetch)
    2. source_type='past_post' 만 필터
    3. 후보가 충분하면 Cohere rerank로 top_n 정제 (실패 시 score 순 fallback)
    Returns content strings only.
    """
    candidates = await search_project(project_id, query, match_count=max(top_n * 4, 20))
    posts = [
        c for c in candidates
        if (c.get("metadata") or {}).get("source_type") == "past_post"
    ]
    # metadata에 source_type이 없을 수 있으니, 전무하면 전체 후보로 fallback
    if not posts:
        posts = candidates
    if not posts:
        return []

    documents = [c.get("content", "") for c in posts if c.get("content")]
    if len(documents) <= top_n:
        return documents

    try:
        ranked = await cohere_api.rerank(query=query, documents=documents, top_n=top_n)
        return [documents[r["index"]] for r in ranked]
    except Exception:
        # rerank 실패 → RRF score 순 (이미 score DESC 정렬되어 옴)
        return documents[:top_n]
