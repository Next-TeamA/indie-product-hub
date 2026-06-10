"""Project members + invitations.

- GET    /api/projects/{id}/members                    : 멤버 + pending 초대 함께
- PATCH  /api/projects/{id}/members/{member_id}        : role 변경 (admin+)
- DELETE /api/projects/{id}/members/{member_id}        : 제거 (admin+, owner 본인은 X)
- POST   /api/projects/{id}/invitations                : 이메일로 초대 발송
- DELETE /api/projects/{id}/invitations/{inv_id}       : 초대 취소

- GET    /api/invitations/me                           : 내가 받은 pending 초대
- GET    /api/invitations/lookup/{token}               : 토큰으로 초대 조회 (수락 페이지 용)
- POST   /api/invitations/{token}/accept               : 수락
- POST   /api/invitations/{token}/decline              : 거절

이메일 발송은 Resend 사용. RESEND_API_KEY 없으면 발송 skip 하고 token URL 만 응답으로.
"""

import secrets
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import require_role, verify_project_access
from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError, ValidationError
from app.core.supabase import safe_maybe_single, supabase


# ============================================================
# Routers
# ============================================================

router = APIRouter(prefix="/projects/{project_id}", tags=["project-members"])
me_router = APIRouter(prefix="/invitations", tags=["my-invitations"])


VALID_INVITE_ROLES = {"admin", "member", "viewer"}


# ============================================================
# Members
# ============================================================

@router.get("/members")
async def list_members(
    project_id: str,
    user: dict = Depends(get_current_user),
    project: dict = Depends(verify_project_access),
):
    """List all members of the project + pending invitations."""
    members = (
        supabase.table("project_members")
        .select("id, user_id, role, joined_at, invited_at, invited_by")
        .eq("project_id", project_id)
        .order("joined_at")
        .execute()
        .data
        or []
    )

    # auth.users 에서 이메일 / 메타 hydration
    user_ids = [m["user_id"] for m in members]
    user_info: dict[str, dict] = {}
    if user_ids:
        # supabase-py 는 auth.users 에 직접 접근 못 함 -> 별도 helper 사용 (있다면)
        # 일단 user_metadata 가 connected_accounts 에 있다고 보고 fallback
        try:
            # admin API 가 있으면 더 정확
            from supabase import create_client
            admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
            for uid in user_ids:
                try:
                    info = admin.auth.admin.get_user_by_id(uid)
                    if info and getattr(info, "user", None):
                        u = info.user
                        user_info[uid] = {
                            "email": getattr(u, "email", None),
                            "user_metadata": getattr(u, "user_metadata", {}) or {},
                        }
                except Exception:
                    pass
        except Exception:
            pass

    pending_invs = (
        supabase.table("project_invitations")
        .select("id, email, role, invited_by, status, created_at, expires_at")
        .eq("project_id", project_id)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )

    return {
        "viewer_role": project.get("_role"),
        "members": [
            {
                **m,
                "email": (user_info.get(m["user_id"]) or {}).get("email"),
                "user_metadata": (user_info.get(m["user_id"]) or {}).get("user_metadata") or {},
                "is_self": m["user_id"] == user["id"],
            }
            for m in members
        ],
        "pending_invitations": pending_invs,
    }


class UpdateMemberInput(BaseModel):
    role: str


@router.patch("/members/{member_id}")
async def update_member_role(
    project_id: str,
    member_id: str,
    body: UpdateMemberInput,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    if body.role not in VALID_INVITE_ROLES.union({"owner"}):
        raise ValidationError(f"Invalid role: {body.role}")

    target = safe_maybe_single(
        supabase.table("project_members")
        .select("user_id, role")
        .eq("id", member_id)
        .eq("project_id", project_id)
    )
    if not target:
        raise NotFoundError("Member", member_id)

    # owner 의 role 은 owner 만 바꿀 수 있음 (자기 자신 외)
    if target["role"] == "owner" and _admin.get("_role") != "owner":
        raise AppError("Only owner can demote another owner", 403, "FORBIDDEN")
    # 자기 자신을 owner 에서 강등하려는 경우 -> 다른 owner 가 있어야 함
    if target["role"] == "owner" and body.role != "owner":
        owner_count = (
            supabase.table("project_members")
            .select("id", count="exact")
            .eq("project_id", project_id)
            .eq("role", "owner")
            .execute()
            .count
            or 0
        )
        if owner_count <= 1:
            raise AppError("Cannot demote the last owner", 400, "BAD_REQUEST")

    supabase.table("project_members").update({"role": body.role}).eq("id", member_id).execute()
    return {"ok": True}


@router.delete("/members/{member_id}", status_code=204)
async def remove_member(
    project_id: str,
    member_id: str,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    target = safe_maybe_single(
        supabase.table("project_members")
        .select("user_id, role")
        .eq("id", member_id)
        .eq("project_id", project_id)
    )
    if not target:
        raise NotFoundError("Member", member_id)

    # owner 본인은 제거 불가 -- 다른 owner 가 강등시킨 후에 제거
    if target["role"] == "owner":
        owner_count = (
            supabase.table("project_members")
            .select("id", count="exact")
            .eq("project_id", project_id)
            .eq("role", "owner")
            .execute()
            .count
            or 0
        )
        if owner_count <= 1:
            raise AppError("Cannot remove the last owner", 400, "BAD_REQUEST")

    supabase.table("project_members").delete().eq("id", member_id).execute()


# ============================================================
# Invitations -- create / cancel
# ============================================================

class InviteInput(BaseModel):
    email: EmailStr
    role: str = "member"


@router.post("/invitations", status_code=201)
async def create_invitation(
    project_id: str,
    body: InviteInput,
    user: dict = Depends(get_current_user),
    project: dict = Depends(require_role("admin")),
):
    if body.role not in VALID_INVITE_ROLES:
        raise ValidationError(f"Invalid role: {body.role}")

    email = body.email.lower().strip()

    # 이미 멤버인지 (email -> user_id 찾기) -- admin auth API 로 조회
    existing_user_id = await _find_user_id_by_email(email)
    if existing_user_id:
        already = safe_maybe_single(
            supabase.table("project_members")
            .select("id")
            .eq("project_id", project_id)
            .eq("user_id", existing_user_id)
        )
        if already:
            raise AppError("이미 프로젝트 멤버입니다", 400, "BAD_REQUEST")

    # 같은 이메일로 pending 초대 있으면 재사용
    pending = safe_maybe_single(
        supabase.table("project_invitations")
        .select("id, token")
        .eq("project_id", project_id)
        .ilike("email", email)
        .eq("status", "pending")
    )
    if pending:
        token = pending["token"]
        invitation_id = pending["id"]
    else:
        token = secrets.token_urlsafe(32)
        row = supabase.table("project_invitations").insert({
            "project_id": project_id,
            "email": email,
            "role": body.role,
            "token": token,
            "invited_by": user["id"],
        }).execute()
        invitation_id = row.data[0]["id"]

    accept_url = f"{settings.frontend_url.rstrip('/')}/invitations/{token}"

    sent = await _send_invite_email(
        to_email=email,
        project_name=project.get("name", "프로젝트"),
        inviter_email=user.get("email") or "",
        accept_url=accept_url,
        role=body.role,
    )

    return {
        "id": invitation_id,
        "token": token,
        "accept_url": accept_url,
        "email_sent": sent,
    }


@router.delete("/invitations/{invitation_id}", status_code=204)
async def cancel_invitation(
    project_id: str,
    invitation_id: str,
    _admin: dict = Depends(require_role("admin")),
):
    result = (
        supabase.table("project_invitations")
        .update({"status": "revoked"})
        .eq("id", invitation_id)
        .eq("project_id", project_id)
        .eq("status", "pending")
        .execute()
    )
    if not result.data:
        raise NotFoundError("Invitation", invitation_id)


# ============================================================
# My invitations
# ============================================================

@me_router.get("/me")
async def list_my_invitations(user: dict = Depends(get_current_user)):
    """내 이메일로 온 pending 초대."""
    email = (user.get("email") or "").lower()
    if not email:
        return []

    rows = (
        supabase.table("project_invitations")
        .select("id, project_id, email, role, token, invited_by, created_at, expires_at")
        .ilike("email", email)
        .eq("status", "pending")
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )

    # 프로젝트 이름 hydration
    pids = list({r["project_id"] for r in rows})
    proj_names: dict[str, str] = {}
    if pids:
        plist = (
            supabase.table("projects").select("id, name").in_("id", pids).execute().data
            or []
        )
        proj_names = {p["id"]: p["name"] for p in plist}

    return [{**r, "project_name": proj_names.get(r["project_id"], "(unknown)")} for r in rows]


@me_router.get("/lookup/{token}")
async def lookup_invitation(token: str):
    """수락 페이지에서 초대 정보 미리 보여줄 때. 비로그인 OK."""
    inv = safe_maybe_single(
        supabase.table("project_invitations")
        .select("id, project_id, email, role, invited_by, status, expires_at")
        .eq("token", token)
    )
    if not inv:
        raise NotFoundError("Invitation", token[:8] + "...")

    project = safe_maybe_single(
        supabase.table("projects").select("name").eq("id", inv["project_id"])
    )
    return {**inv, "project_name": (project or {}).get("name")}


@me_router.post("/{token}/accept")
async def accept_invitation(token: str, user: dict = Depends(get_current_user)):
    inv = safe_maybe_single(
        supabase.table("project_invitations").select("*").eq("token", token)
    )
    if not inv:
        raise NotFoundError("Invitation", token[:8] + "...")

    if inv["status"] != "pending":
        raise AppError(f"Invitation is {inv['status']}, cannot accept", 400, "BAD_REQUEST")

    # 만료 확인
    try:
        expires = datetime.fromisoformat(inv["expires_at"].replace("Z", "+00:00"))
        if expires < datetime.now(timezone.utc):
            supabase.table("project_invitations").update({"status": "expired"}).eq(
                "token", token
            ).execute()
            raise AppError("Invitation expired", 400, "BAD_REQUEST")
    except AppError:
        raise
    except Exception:
        pass

    # 이메일이 user 의 것과 일치하는지 (대소문자 무시)
    if (user.get("email") or "").lower() != (inv["email"] or "").lower():
        raise AppError("이메일이 초대 대상과 일치하지 않습니다", 403, "FORBIDDEN")

    # 이미 멤버면 idempotent 처리
    existing = safe_maybe_single(
        supabase.table("project_members")
        .select("id")
        .eq("project_id", inv["project_id"])
        .eq("user_id", user["id"])
    )
    if not existing:
        supabase.table("project_members").insert({
            "project_id": inv["project_id"],
            "user_id": user["id"],
            "role": inv["role"],
            "invited_by": inv["invited_by"],
            "invited_at": inv["created_at"],
        }).execute()

    supabase.table("project_invitations").update({
        "status": "accepted",
        "accepted_at": datetime.now(timezone.utc).isoformat(),
        "accepted_by": user["id"],
    }).eq("token", token).execute()

    return {"ok": True, "project_id": inv["project_id"]}


@me_router.post("/{token}/decline")
async def decline_invitation(token: str, user: dict = Depends(get_current_user)):
    inv = safe_maybe_single(
        supabase.table("project_invitations").select("email, status").eq("token", token)
    )
    if not inv:
        raise NotFoundError("Invitation", token[:8] + "...")
    if inv["status"] != "pending":
        return {"ok": True, "already": inv["status"]}
    if (user.get("email") or "").lower() != (inv["email"] or "").lower():
        raise AppError("이메일이 초대 대상과 일치하지 않습니다", 403, "FORBIDDEN")

    supabase.table("project_invitations").update({"status": "declined"}).eq(
        "token", token
    ).execute()
    return {"ok": True}


# ============================================================
# Helpers
# ============================================================

async def _find_user_id_by_email(email: str) -> str | None:
    """auth.users 에서 이메일로 user_id 조회. supabase admin API 사용."""
    try:
        from supabase import create_client
        admin = create_client(settings.supabase_url, settings.supabase_service_role_key)
        # admin.auth.admin.list_users 는 페이지네이션. 100명 이내 가정.
        page = 1
        while page <= 5:
            res = admin.auth.admin.list_users(page=page, per_page=200)
            users = getattr(res, "users", None) or res
            if not users:
                break
            for u in users:
                if (getattr(u, "email", None) or "").lower() == email:
                    return getattr(u, "id", None)
            if len(users) < 200:
                break
            page += 1
    except Exception:
        return None
    return None


async def _send_invite_email(
    to_email: str,
    project_name: str,
    inviter_email: str,
    accept_url: str,
    role: str,
) -> bool:
    """Resend 로 초대 이메일 발송. RESEND_API_KEY 미설정 시 skip."""
    if not settings.resend_api_key:
        return False

    subject = f"[LaunchPad] {project_name} 프로젝트에 초대됐어요"
    body = f"""
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #111;">프로젝트 초대</h2>
  <p style="color: #444; line-height: 1.6;">
    <b>{inviter_email}</b> 님이 <b>{project_name}</b> 프로젝트에 <b>{role}</b> 권한으로 초대했어요.
  </p>
  <p style="margin: 32px 0;">
    <a href="{accept_url}" style="background:#111; color:#fff; padding:12px 20px; border-radius:12px; text-decoration:none; font-weight:bold;">
      초대 수락하기
    </a>
  </p>
  <p style="color:#888; font-size: 12px;">
    링크가 동작하지 않으면 이 주소를 복사해서 브라우저에 붙여넣으세요:<br/>
    <span style="word-break:break-all;">{accept_url}</span>
  </p>
  <p style="color:#aaa; font-size: 11px; margin-top: 32px;">
    이 초대는 14일 후 만료됩니다. 본인이 요청하지 않은 초대면 무시해도 안전합니다.
  </p>
</div>
"""

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            r = await client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {settings.resend_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": "LaunchPad <onboarding@resend.dev>",
                    "to": [to_email],
                    "subject": subject,
                    "html": body,
                },
            )
            return r.status_code in (200, 201, 202)
        except Exception:
            return False
