from google import genai
from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.config import settings
from app.core.exceptions import ExternalAPIError
from app.core.supabase import supabase
from app.models.promotion import PromotionRequest

router = APIRouter(prefix="/projects/{project_id}/promotion", tags=["promotion"])

# Lazy init: Gemini client is created on first use, not at import time.
_client: genai.Client | None = None


def _get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


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
async def generate_promotion(
    project_id: str,
    body: PromotionRequest,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    # 사용자 메시지 저장
    user_msg = {
        "project_id": project_id,
        "role": "user",
        "content": body.message,
    }
    supabase.table("promotion_messages").insert(user_msg).execute()

    # Gemini 호출
    template_hint = f" 형식: {body.template} 스타일로 작성해줘." if body.template else ""
    prompt = (
        "너는 인디 프로덕트 홍보 전문가야. "
        "다음 요청에 맞는 홍보 콘텐츠를 한국어로 작성해줘."
        f"{template_hint}\n\n요청: {body.message}"
    )
    try:
        client = _get_gemini_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash", contents=prompt
        )
        ai_content = response.text
    except Exception as e:
        raise ExternalAPIError("Gemini", str(e))

    # AI 응답 저장
    ai_msg = {
        "project_id": project_id,
        "role": "assistant",
        "content": ai_content,
    }
    result = supabase.table("promotion_messages").insert(ai_msg).execute()
    return result.data[0]
