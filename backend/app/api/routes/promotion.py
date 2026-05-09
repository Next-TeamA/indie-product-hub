from fastapi import APIRouter, Depends
from app.core.auth import get_current_user
from app.core.supabase import supabase
from app.models.promotion import PromotionRequest

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
    """홍보 콘텐츠 생성 요청.

    TODO: LLM API 연동 (Claude API 등)
    현재는 사용자 메시지를 저장하고 placeholder 응답을 반환합니다.
    """
    # 사용자 메시지 저장
    user_msg = {
        "project_id": project_id,
        "role": "user",
        "content": body.message,
    }
    supabase.table("promotion_messages").insert(user_msg).execute()

    # TODO: LLM 호출로 교체
    ai_content = f"'{body.message}'에 대한 홍보 콘텐츠를 생성 중입니다. LLM 연동 후 실제 콘텐츠가 생성됩니다."
    if body.template:
        ai_content = f"[{body.template}] {ai_content}"

    # AI 응답 저장
    ai_msg = {
        "project_id": project_id,
        "role": "assistant",
        "content": ai_content,
    }
    result = supabase.table("promotion_messages").insert(ai_msg).execute()
    return result.data[0]
