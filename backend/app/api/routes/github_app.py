"""GitHub App routes -- install URL, callback, list installations + repos.

OAuth App (accounts.py 의 /github/orgs, /github/repos) 은 그대로 유지.
이 라우트는 App-installation 기반 흐름 전용. 둘은 병행 사용 가능.
"""

import secrets

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse

from app.api.dependencies.auth import get_current_user
from app.core.config import settings
from app.core.exceptions import AppError, NotFoundError
from app.core.supabase import safe_maybe_single, supabase
from app.integrations import github_app

router = APIRouter(prefix="/accounts/github-app", tags=["github-app"])


# ============================================================
# 1. install URL -- 프론트가 이 URL 로 사용자를 redirect
# ============================================================

@router.get("/install-url")
async def get_install_url(user: dict = Depends(get_current_user)):
    """GitHub App install URL with a CSRF state token saved in oauth_states."""
    if not github_app.is_configured():
        raise AppError("GitHub App is not configured on the server", 500)

    state = secrets.token_urlsafe(24)
    # oauth_states 테이블 재사용 (provider="github_app" 으로 구분)
    try:
        supabase.table("oauth_states").insert({
            "state": state,
            "user_id": user["id"],
            "provider": "github_app",
        }).execute()
    except Exception:
        # oauth_states 가 다른 스키마면 무시 -- CSRF 보호 없는 셈, 일단 진행
        pass

    return {
        "url": github_app.install_url(state=state),
        "state": state,
        "slug": settings.github_app_slug,
    }


# ============================================================
# 2. callback -- GitHub 가 install 끝나면 이 URL 로 보냄
#    실제로는 setup_url 이 프론트로 가도록 설정 (App 설정의 Setup URL),
#    프론트가 installation_id + state 로 이 endpoint 호출해서 row 저장.
# ============================================================

@router.post("/callback")
async def install_callback(
    installation_id: int,
    state: str | None = None,
    user: dict = Depends(get_current_user),
):
    """Frontend hits this after the user returns from the GitHub install page.

    Validates the CSRF state, fetches the installation metadata from GitHub,
    and upserts a row in github_installations.
    """
    # CSRF state 검증 (oauth_states 에 있고 user 가 일치하면 통과)
    if state:
        try:
            row = safe_maybe_single(
                supabase.table("oauth_states")
                .select("user_id, provider")
                .eq("state", state)
            )
            if row and (row.get("user_id") != user["id"] or row.get("provider") != "github_app"):
                raise AppError("Invalid state", 400)
            # state 일회용 -- 삭제
            try:
                supabase.table("oauth_states").delete().eq("state", state).execute()
            except Exception:
                pass
        except AppError:
            raise
        except Exception:
            pass

    # GitHub 에서 installation 메타데이터 조회
    try:
        meta = await github_app.get_installation(installation_id)
    except Exception as e:
        raise AppError(f"Failed to fetch installation from GitHub: {e}", 502)

    account = meta.get("account") or {}
    payload = {
        "user_id": user["id"],
        "installation_id": installation_id,
        "account_login": account.get("login") or "",
        "account_type": account.get("type") or "User",
        "account_id": account.get("id"),
        "avatar_url": account.get("avatar_url"),
        "repo_selection": meta.get("repository_selection"),
        "permissions": meta.get("permissions") or {},
        "events": meta.get("events") or [],
    }

    # upsert (installation_id 가 unique key)
    existing = safe_maybe_single(
        supabase.table("github_installations")
        .select("id")
        .eq("installation_id", installation_id)
    )
    if existing:
        supabase.table("github_installations").update(payload).eq(
            "installation_id", installation_id
        ).execute()
    else:
        supabase.table("github_installations").insert(payload).execute()

    return {"ok": True, "installation_id": installation_id, "account": account.get("login")}


# ============================================================
# 3. list installations of the current user
# ============================================================

@router.get("/installations")
async def list_installations(user: dict = Depends(get_current_user)):
    """Installations the user has set up via this LaunchPad GitHub App."""
    rows = (
        supabase.table("github_installations")
        .select(
            "id, installation_id, account_login, account_type, account_id, "
            "avatar_url, repo_selection, installed_at, suspended_at"
        )
        .eq("user_id", user["id"])
        .order("installed_at", desc=True)
        .execute()
        .data
    )
    return rows


# ============================================================
# 4. list repos in one installation
# ============================================================

@router.get("/installations/{installation_id}/repos")
async def list_installation_repos(
    installation_id: int,
    user: dict = Depends(get_current_user),
):
    """All repos that this installation has access to."""
    # 본인 installation 인지 검증
    row = safe_maybe_single(
        supabase.table("github_installations")
        .select("installation_id")
        .eq("installation_id", installation_id)
        .eq("user_id", user["id"])
    )
    if not row:
        raise NotFoundError("Installation", str(installation_id))

    try:
        repos = await github_app.list_installation_repos(installation_id)
    except Exception as e:
        raise AppError(f"Failed to list repos: {e}", 502)

    return [
        {
            "id": r.get("id"),
            "full_name": r.get("full_name"),
            "name": r.get("name"),
            "owner": (r.get("owner") or {}).get("login"),
            "private": r.get("private"),
            "default_branch": r.get("default_branch"),
            "language": r.get("language"),
            "description": r.get("description"),
            "updated_at": r.get("updated_at"),
            "pushed_at": r.get("pushed_at"),
            "html_url": r.get("html_url"),
        }
        for r in repos
    ]


# ============================================================
# 5. uninstall (LaunchPad 쪽 row 만 삭제 -- 실제 install 제거는 GitHub 콘솔)
# ============================================================

@router.delete("/installations/{installation_id}")
async def remove_installation(
    installation_id: int,
    user: dict = Depends(get_current_user),
):
    result = (
        supabase.table("github_installations")
        .delete()
        .eq("installation_id", installation_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise NotFoundError("Installation", str(installation_id))
    return {"ok": True}


# ============================================================
# 6. configure URL helper (그 installation 의 repo 선택 변경)
# ============================================================

@router.get("/installations/{installation_id}/configure-url")
async def get_configure_url(
    installation_id: int,
    user: dict = Depends(get_current_user),
):
    row = safe_maybe_single(
        supabase.table("github_installations")
        .select("installation_id")
        .eq("installation_id", installation_id)
        .eq("user_id", user["id"])
    )
    if not row:
        raise NotFoundError("Installation", str(installation_id))
    return {"url": github_app.configure_url(installation_id)}
