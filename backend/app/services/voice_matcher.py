"""Voice matcher -- assembles persona + RAG examples for the Content node.

기획서 §8 Stage 2 (RAG 매칭):
- persona의 voice_profile / opinion / forbidden / preferred 로드
- topic에 가장 비슷한 과거 글 top-5 retrieve (Cohere rerank)
- Content node가 이 dict를 프롬프트에 주입

supabase 클라이언트는 동기 (await 없이 .execute()).
"""

from app.core.supabase import supabase, safe_maybe_single
from app.rag.retriever import retrieve_voice_examples


async def get_voice_context(project_id: str, topic: str) -> dict:
    """Return {persona, examples} for the given topic.

    - persona: personas row (없으면 빈 dict)
    - examples: topic과 의미적으로 가까운 과거 글 top-5 (없으면 [])
    """
    persona = safe_maybe_single(
        supabase.table("personas")
        .select("voice_profile, opinion_corpus, forbidden_phrases, preferred_phrases, ft_model_id")
        .eq("project_id", project_id)
    ) or {}

    try:
        examples = await retrieve_voice_examples(project_id, topic or "", top_n=5)
    except Exception:
        examples = []

    return {"persona": persona, "examples": examples}
