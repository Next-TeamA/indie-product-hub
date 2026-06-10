"""GitHub App webhook handler.

수신 이벤트:
- installation       : created / deleted / suspend / unsuspend / new_permissions_accepted
- installation_repositories : added / removed
- push, pull_request, workflow_run, issues, release : AMP github.push 트리거 등으로 forward
"""

import json

from fastapi import APIRouter, HTTPException, Request

from app.core.supabase import safe_maybe_single, supabase
from app.integrations import github_app

router = APIRouter(prefix="/webhooks/github-app", tags=["github-app-webhook"])


@router.post("")
async def receive(request: Request):
    body = await request.body()
    signature = request.headers.get("x-hub-signature-256")
    event = request.headers.get("x-github-event") or ""

    if not github_app.verify_webhook(body, signature):
        raise HTTPException(status_code=401, detail="Bad signature")

    try:
        payload = json.loads(body)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    if event == "installation":
        return await _handle_installation(payload)
    if event == "installation_repositories":
        return await _handle_installation_repos(payload)

    # push / pull_request / workflow_run / issues / release 등
    # 기존 webhook 처리 흐름과 통합 (AMP github.push 트리거 등)
    return await _handle_repo_event(event, payload)


# ============================================================
# installation lifecycle
# ============================================================

async def _handle_installation(payload: dict):
    action = payload.get("action")
    inst = payload.get("installation") or {}
    installation_id = inst.get("id")
    account = inst.get("account") or {}

    if action == "created":
        # 사용자가 install 한 직후. 보통 콜백에서 row 가 이미 만들어졌을 수 있음.
        # row 가 없으면 user_id 를 알 수 없어 무시 -- 콜백 라우트가 처리.
        return {"ok": True, "action": action}

    if action in ("deleted", "suspend"):
        update = {"suspended_at": "now()"} if action == "suspend" else None
        if action == "deleted":
            supabase.table("github_installations").delete().eq(
                "installation_id", installation_id
            ).execute()
        else:
            supabase.table("github_installations").update(update).eq(
                "installation_id", installation_id
            ).execute()
        return {"ok": True, "action": action}

    if action == "unsuspend":
        supabase.table("github_installations").update({"suspended_at": None}).eq(
            "installation_id", installation_id
        ).execute()
        return {"ok": True, "action": action}

    if action == "new_permissions_accepted":
        supabase.table("github_installations").update({
            "permissions": inst.get("permissions") or {},
            "events": inst.get("events") or [],
        }).eq("installation_id", installation_id).execute()
        return {"ok": True, "action": action}

    return {"ok": True, "action": action, "account": account.get("login")}


# ============================================================
# installation_repositories: repo selection 변경
# ============================================================

async def _handle_installation_repos(payload: dict):
    inst = payload.get("installation") or {}
    installation_id = inst.get("id")
    selection = inst.get("repository_selection")
    if installation_id and selection:
        supabase.table("github_installations").update({
            "repo_selection": selection,
        }).eq("installation_id", installation_id).execute()
    return {"ok": True}


# ============================================================
# repo events: AMP 트리거로 보낼 자리
# ============================================================

async def _handle_repo_event(event: str, payload: dict):
    """Forward to existing AMP / events pipeline.

    PR1 단계에서는 logging 만. Wave: events 테이블에 insert 또는 AMP graph run 트리거.
    """
    installation_id = (payload.get("installation") or {}).get("id")
    # installation_id 로 user_id 찾아서 project 매핑은 events 라우터 또는 별도 매핑 테이블
    # 일단 events 테이블에 raw 저장 (있으면)
    try:
        repo = (payload.get("repository") or {}).get("full_name")
        supabase.table("events").insert({
            "source": "github_app",
            "event_type": event,
            "raw_payload": payload,
            "installation_id": installation_id,
            "repo": repo,
        }).execute()
    except Exception:
        pass
    return {"ok": True, "event": event}
