"""Embedding service -- chunk + embed + persist into project_knowledge_chunks.

기획서 §부록 F:
- 일반 문서: chunk_text → embed → insert (chunk_index 부여)
- SNS 포스트: chunk_post (1 post = 1 chunk)
- voice_samples reindex: voice_samples 테이블 → past_post chunk로 동기화

supabase 클라이언트는 동기 (await 없이 .execute()).
"""

from app.core.supabase import supabase
from app.rag.chunker import chunk_post, chunk_text
from app.rag.embedder import embed_documents

_EMBED_MODEL = "cohere-embed-v4"
# 포스트류는 분할 금지 (1 post = 1 chunk)
_POST_TYPES = {"past_post", "voice_sample"}


async def index_text(
    project_id: str,
    source_type: str,
    content: str,
    source_doc_id: str | None = None,
    engagement_score: float | None = None,
    metadata: dict | None = None,
) -> int:
    """Chunk + embed + insert into project_knowledge_chunks.

    Returns the number of chunks inserted.
    """
    content = (content or "").strip()
    if not content:
        return 0

    if source_type in _POST_TYPES:
        chunks = [chunk_post(content)]
    else:
        chunks = chunk_text(content)
    chunks = [c for c in chunks if c.strip()]
    if not chunks:
        return 0

    embeddings = await embed_documents(chunks)
    base_meta = dict(metadata or {})
    base_meta["source_type"] = source_type

    rows = []
    for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
        rows.append({
            "project_id": project_id,
            "source_doc_id": source_doc_id,
            "source_type": source_type,
            "chunk_index": idx,
            "content": chunk,
            "embedding": embedding,
            "embedding_model": _EMBED_MODEL,
            "engagement_score": engagement_score,
            "metadata": base_meta,
        })

    if not rows:
        return 0
    supabase.table("project_knowledge_chunks").insert(rows).execute()
    return len(rows)


async def reindex_voice_samples(project_id: str) -> int:
    """Pull voice_samples rows, embed, store as past_post chunks.

    기존 past_post chunk를 비우고 voice_samples 기준으로 다시 인덱싱한다
    (stale embedding 방지). Returns number of chunks indexed.
    """
    samples = (
        supabase.table("voice_samples")
        .select("id, content, engagement_score, source_platform, lang, source_post_id")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .execute()
    )
    rows = samples.data or []
    if not rows:
        return 0

    # 기존 past_post chunk 제거 후 재인덱싱
    (
        supabase.table("project_knowledge_chunks")
        .delete()
        .eq("project_id", project_id)
        .eq("source_type", "past_post")
        .execute()
    )

    contents = [chunk_post(r.get("content", "")) for r in rows]
    keep = [(r, c) for r, c in zip(rows, contents) if c.strip()]
    if not keep:
        return 0

    embeddings = await embed_documents([c for _, c in keep])

    chunk_rows = []
    for idx, ((sample, content), embedding) in enumerate(zip(keep, embeddings)):
        chunk_rows.append({
            "project_id": project_id,
            "source_doc_id": sample.get("id"),
            "source_type": "past_post",
            "chunk_index": idx,
            "content": content,
            "embedding": embedding,
            "embedding_model": _EMBED_MODEL,
            "engagement_score": sample.get("engagement_score"),
            "metadata": {
                "source_type": "past_post",
                "platform": sample.get("source_platform"),
                "lang": sample.get("lang"),
                "source_post_id": sample.get("source_post_id"),
            },
        })

    if not chunk_rows:
        return 0
    supabase.table("project_knowledge_chunks").insert(chunk_rows).execute()
    return len(chunk_rows)
