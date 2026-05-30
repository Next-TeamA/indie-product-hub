"""Embedding helpers -- Cohere embed-v4 with OpenAI fallback, normalized to 1024d.

기획서 §부록 F.2:
- default: Cohere embed-v4 (한국어+영어 최강 multilingual)
- fallback: OpenAI text-embedding-3-small (Cohere 실패 시)

중요: DB의 embedding 컬럼은 vector(1024). 그런데
- Cohere embed-v4.0의 *기본* 출력은 1536d (현 SDK 5.13.x는 output_dimension
  kwarg 미지원 — TypeError).
- OpenAI text-embedding-3-small도 1536d.
→ 두 경우 모두 앞 1024차원으로 truncate. embed-v4 / OpenAI-3 모두 Matryoshka
  학습이라 prefix truncate가 의미를 보존한다. 컬럼 제약(1024)도 충족.

input_type 구분 (Cohere): 'search_document'(저장) | 'search_query'(검색).
"""

from app.integrations import cohere_api, openai_api

# Cohere embed API는 호출당 최대 96개 텍스트 → 그 단위로 batch
_BATCH_SIZE = 96
EMBED_DIM = 1024


async def embed_documents(texts: list[str]) -> list[list[float]]:
    """Embed a list of documents (for indexing). Returns 1024-dim vectors."""
    if not texts:
        return []
    return await _embed_batched(texts, input_type="search_document")


async def embed_query(text: str) -> list[float]:
    """Embed a single query string. Returns one 1024-dim vector."""
    vectors = await _embed_batched([text], input_type="search_query")
    return vectors[0] if vectors else []


async def _embed_batched(texts: list[str], input_type: str) -> list[list[float]]:
    """Batch in groups of 96, Cohere primary, OpenAI fallback. All → 1024d."""
    results: list[list[float]] = []
    for start in range(0, len(texts), _BATCH_SIZE):
        batch = texts[start : start + _BATCH_SIZE]
        try:
            raw = await cohere_api.embed_texts(batch, input_type=input_type)
        except Exception:
            # Cohere 실패 → OpenAI fallback (input_type 개념 없음)
            raw = await openai_api.embed_texts(batch)
        results.extend(_to_1024(v) for v in raw)
    return results


def _to_1024(vec: list[float]) -> list[float]:
    """Normalize a vector to exactly 1024 dims (truncate longer, pad shorter)."""
    if len(vec) == EMBED_DIM:
        return list(vec)
    if len(vec) > EMBED_DIM:
        return list(vec[:EMBED_DIM])
    return list(vec) + [0.0] * (EMBED_DIM - len(vec))
