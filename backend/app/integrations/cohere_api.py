"""Cohere API wrapper -- embed-v4 (multilingual) + rerank-3.5.

용도 (기획서 §부록 F):
- Embeddings: 한국어+영어 최강 multilingual embedding (1024d)
- Rerank: top-50 retrieve → rerank → top-5 (150ms, $2/1k searches)
"""

import cohere

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

_client: cohere.AsyncClientV2 | None = None


def _get_client() -> cohere.AsyncClientV2:
    global _client
    if _client is None:
        if not settings.cohere_api_key:
            raise ExternalAPIError("Cohere", "COHERE_API_KEY not configured")
        _client = cohere.AsyncClientV2(api_key=settings.cohere_api_key)
    return _client


# ============================================================
# Embeddings (embed-v4 1024-dim multilingual)
# ============================================================

async def embed_texts(
    texts: list[str],
    input_type: str = "search_document",
    model: str = "embed-v4.0",
) -> list[list[float]]:
    """Batch embed. `input_type`: 'search_document' (store) | 'search_query' (query).

    Returns list of 1024-dim vectors.
    """
    try:
        client = _get_client()
        resp = await client.embed(
            texts=texts,
            model=model,
            input_type=input_type,
            embedding_types=["float"],
        )
        return resp.embeddings.float_
    except Exception as e:
        raise ExternalAPIError("Cohere", f"Embed failed: {e}")


# ============================================================
# Rerank
# ============================================================

async def rerank(
    query: str,
    documents: list[str],
    top_n: int = 5,
    model: str = "rerank-v3.5",
) -> list[dict]:
    """Rerank documents by relevance to query.

    Returns list of {index, relevance_score} sorted by relevance descending.
    """
    try:
        client = _get_client()
        resp = await client.rerank(
            query=query,
            documents=documents,
            top_n=top_n,
            model=model,
        )
        return [
            {"index": r.index, "relevance_score": r.relevance_score}
            for r in resp.results
        ]
    except Exception as e:
        raise ExternalAPIError("Cohere", f"Rerank failed: {e}")
