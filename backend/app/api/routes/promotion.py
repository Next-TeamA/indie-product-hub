from google import genai
from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.supabase import supabase
from app.models.promotion import PromotionRequest

_client = genai.Client(api_key=settings.gemini_api_key)

router = APIRouter(prefix="/projects/{project_id}/promotion", tags=["promotion"])


@router.get("/history")
async def get_history(
    project_id: str, user: dict = Depends(get_current_user)
):
    """프로젝트의 홍보 대화 히스토리 조회."""
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
):
    """홍보 콘텐츠 생성 — Gemini로 콘텐츠를 생성하고 대화 히스토리에 저장합니다."""
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
        response = _client.models.generate_content(
            model="gemini-2.0-flash", contents=prompt
        )
        ai_content = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini 호출 실패: {e}")

    # AI 응답 저장
    ai_msg = {
        "project_id": project_id,
        "role": "assistant",
        "content": ai_content,
    }
    result = supabase.table("promotion_messages").insert(ai_msg).execute()
    return result.data[0]
