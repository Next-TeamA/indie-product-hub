"""GitHub App integration (Railway/Vercel 패턴).

기존 OAuth App (github_api.py) 과 별개. App 은 installation 단위로 권한 부여
받음. 사용자가 직접 install 했거나, 그 사용자가 install 권한을 가진 org 에
install 한 repo 만 접근 가능.

흐름:
1. github_app.list_user_installations(user_access_token)
   사용자의 OAuth 토큰으로 그 사용자가 access 가능한 installation 목록 조회
2. github_app.installation_token(installation_id)
   App private key 로 JWT 만들어서 GitHub 에 보내 installation access token 받음
3. installation token 으로 그 installation 의 repo / commits / PRs 조회
"""

import base64
import time
from typing import Any

import httpx
import jwt

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


BASE_URL = "https://api.github.com"
ACCEPT = "application/vnd.github+json"
GH_VERSION = "2022-11-28"


def is_configured() -> bool:
    """Return True if the GitHub App env is populated."""
    return bool(settings.github_app_id and _private_key_pem())


# ============================================================
# Private key + JWT
# ============================================================

def _private_key_pem() -> str:
    """Return the App private key as PEM text.

    Supports both raw multiline PEM (\\n preserved) and base64-encoded single
    line (for env editors that don't support newlines).
    """
    raw = settings.github_app_private_key.strip()
    if raw:
        return raw
    b64 = settings.github_app_private_key_base64.strip()
    if b64:
        try:
            return base64.b64decode(b64).decode("utf-8")
        except Exception as e:
            raise ExternalAPIError("github_app", f"private key base64 decode failed: {e}")
    return ""


def _app_jwt() -> str:
    """Create the short-lived (10 min) JWT used to authenticate as the App."""
    pem = _private_key_pem()
    if not pem:
        raise ExternalAPIError("github_app", "GITHUB_APP_PRIVATE_KEY not configured")
    now = int(time.time())
    payload = {
        "iat": now - 60,        # 60s 시계 오차 대비
        "exp": now + 9 * 60,    # 10분 max -- 9분으로 안전 마진
        "iss": settings.github_app_id,
    }
    return jwt.encode(payload, pem, algorithm="RS256")


def _app_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_app_jwt()}",
        "Accept": ACCEPT,
        "X-GitHub-Api-Version": GH_VERSION,
    }


def _user_headers(user_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {user_token}",
        "Accept": ACCEPT,
        "X-GitHub-Api-Version": GH_VERSION,
    }


def _installation_headers(installation_token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {installation_token}",
        "Accept": ACCEPT,
        "X-GitHub-Api-Version": GH_VERSION,
    }


# ============================================================
# Installation token (60 min TTL)
# ============================================================

_token_cache: dict[int, dict[str, Any]] = {}


async def installation_token(installation_id: int) -> str:
    """Exchange the App JWT for a short-lived installation access token.

    GitHub returns a token valid for 60 minutes. We cache by installation_id
    until ~5 min before expiry.
    """
    cached = _token_cache.get(installation_id)
    now = time.time()
    if cached and cached["expires_at"] > now + 300:
        return cached["token"]

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.post(
                f"{BASE_URL}/app/installations/{installation_id}/access_tokens",
                headers=_app_headers(),
            )
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("github_app", f"installation_token: {e}")

    # ISO timestamp -> epoch
    from datetime import datetime, timezone
    expires_at = (
        datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
        .astimezone(timezone.utc)
        .timestamp()
    )
    _token_cache[installation_id] = {"token": data["token"], "expires_at": expires_at}
    return data["token"]


# ============================================================
# App-level: list installations / fetch installation
# ============================================================

async def get_installation(installation_id: int) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                f"{BASE_URL}/app/installations/{installation_id}",
                headers=_app_headers(),
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("github_app", f"get_installation: {e}")


# ============================================================
# User-level: which installations does this user have access to
# ============================================================

async def list_user_installations(user_access_token: str) -> list[dict]:
    """Installations that the authenticated user can access.

    Requires the user OAuth token from the GitHub App's user-auth flow
    (or the legacy OAuth App token works if scopes overlap). Returns up to
    100 installations.
    """
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                f"{BASE_URL}/user/installations",
                headers=_user_headers(user_access_token),
                params={"per_page": 100},
            )
            r.raise_for_status()
            return (r.json() or {}).get("installations", [])
        except httpx.HTTPError as e:
            raise ExternalAPIError("github_app", f"list_user_installations: {e}")


# ============================================================
# Installation-level: list repos in a specific installation
# ============================================================

async def list_installation_repos(installation_id: int) -> list[dict]:
    """All repos that this installation has access to (App JWT path)."""
    token = await installation_token(installation_id)
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                f"{BASE_URL}/installation/repositories",
                headers=_installation_headers(token),
                params={"per_page": 100},
            )
            r.raise_for_status()
            return (r.json() or {}).get("repositories", [])
        except httpx.HTTPError as e:
            raise ExternalAPIError("github_app", f"list_installation_repos: {e}")


async def get_repo(installation_id: int, owner: str, repo: str) -> dict:
    token = await installation_token(installation_id)
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                f"{BASE_URL}/repos/{owner}/{repo}",
                headers=_installation_headers(token),
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("github_app", f"get_repo: {e}")


async def list_commits(installation_id: int, owner: str, repo: str, per_page: int = 10) -> list[dict]:
    token = await installation_token(installation_id)
    async with httpx.AsyncClient(timeout=20) as client:
        try:
            r = await client.get(
                f"{BASE_URL}/repos/{owner}/{repo}/commits",
                headers=_installation_headers(token),
                params={"per_page": per_page},
            )
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise ExternalAPIError("github_app", f"list_commits: {e}")


# ============================================================
# Install URL helpers
# ============================================================

def install_url(state: str | None = None) -> str:
    """Public install URL. Optional state for CSRF + linking back to user."""
    base = f"https://github.com/apps/{settings.github_app_slug}/installations/new"
    if state:
        return f"{base}?state={state}"
    return base


def configure_url(installation_id: int) -> str:
    """URL for the user to edit which repos are exposed to this installation."""
    return f"https://github.com/settings/installations/{installation_id}"


# ============================================================
# Webhook verification
# ============================================================

import hashlib
import hmac


def verify_webhook(payload: bytes, signature_header: str | None) -> bool:
    """Verify x-hub-signature-256 header against payload + webhook secret."""
    if not settings.github_app_webhook_secret:
        # secret 미설정 시 dev only skip
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = (
        "sha256="
        + hmac.new(
            settings.github_app_webhook_secret.encode("utf-8"),
            payload,
            hashlib.sha256,
        ).hexdigest()
    )
    return hmac.compare_digest(expected, signature_header)
