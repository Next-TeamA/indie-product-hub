"""Instagram Graph API wrapper -- Business/Creator account 발행.

기획서 §6.1 + §부록 J.
- Reels: 3단계 비동기 업로드 (container 생성 → 상태 폴링 → publish)
- Posts: feed_media + carousel
- Comments: 자율 답글 가능 (한도 내)
- 한도: 100 posts/24h, Business/Creator + Facebook Page 연결 필수
"""

import asyncio
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

IG_BASE = "https://graph.instagram.com/v22.0"
IG_OAUTH_BASE = "https://api.instagram.com/oauth"
SCOPES = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
]


class InstagramAPIClient:
    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": settings.instagram_app_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/instagram",
            "response_type": "code",
            "scope": ",".join(SCOPES),
            "state": state,
        }
        return f"{IG_OAUTH_BASE}/authorize?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        """Exchange OAuth code for short-lived token, then upgrade to long-lived."""
        async with httpx.AsyncClient(timeout=30) as client:
            short = await client.post(
                f"{IG_OAUTH_BASE}/access_token",
                data={
                    "client_id": settings.instagram_app_id,
                    "client_secret": settings.instagram_app_secret,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/instagram",
                    "code": code,
                },
            )
            if short.status_code != 200:
                raise ExternalAPIError("Instagram", f"Token exchange failed: {short.text}")
            short_data = short.json()

            # 단기 토큰 → 장기 토큰 (60일)
            long_resp = await client.get(
                f"{IG_BASE}/access_token",
                params={
                    "grant_type": "ig_exchange_token",
                    "client_secret": settings.instagram_app_secret,
                    "access_token": short_data["access_token"],
                },
            )
            if long_resp.status_code != 200:
                raise ExternalAPIError("Instagram", f"Long token exchange failed: {long_resp.text}")
            return {**short_data, **long_resp.json()}

    async def get_user(self, token: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{IG_BASE}/me",
                params={"fields": "id,username,account_type", "access_token": token},
            )
            r.raise_for_status()
            return r.json()

    # ============================================================
    # Publishing (3-step async)
    # ============================================================

    async def create_image_container(
        self, token: str, ig_user_id: str, image_url: str, caption: str = ""
    ) -> str:
        """Step 1: container 생성. Returns container_id."""
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{IG_BASE}/{ig_user_id}/media",
                params={
                    "image_url": image_url,
                    "caption": caption[:2200],
                    "access_token": token,
                },
            )
            r.raise_for_status()
            return r.json()["id"]

    async def create_reel_container(
        self, token: str, ig_user_id: str, video_url: str, caption: str = "",
        share_to_feed: bool = True,
    ) -> str:
        """Step 1 (Reel): container 생성."""
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{IG_BASE}/{ig_user_id}/media",
                params={
                    "media_type": "REELS",
                    "video_url": video_url,
                    "caption": caption[:2200],
                    "share_to_feed": str(share_to_feed).lower(),
                    "access_token": token,
                },
            )
            r.raise_for_status()
            return r.json()["id"]

    async def wait_for_container(
        self, token: str, container_id: str, max_wait_sec: int = 300
    ) -> bool:
        """Step 2: container 상태 폴링. Returns True if FINISHED."""
        elapsed = 0
        async with httpx.AsyncClient(timeout=30) as client:
            while elapsed < max_wait_sec:
                r = await client.get(
                    f"{IG_BASE}/{container_id}",
                    params={"fields": "status_code", "access_token": token},
                )
                r.raise_for_status()
                status = r.json().get("status_code")
                if status == "FINISHED":
                    return True
                if status in ("ERROR", "EXPIRED"):
                    raise ExternalAPIError("Instagram", f"Container {container_id} status={status}")
                await asyncio.sleep(3)
                elapsed += 3
        raise ExternalAPIError("Instagram", f"Container {container_id} timeout after {max_wait_sec}s")

    async def publish_container(
        self, token: str, ig_user_id: str, container_id: str
    ) -> str:
        """Step 3: 발행. Returns IG post ID."""
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{IG_BASE}/{ig_user_id}/media_publish",
                params={"creation_id": container_id, "access_token": token},
            )
            r.raise_for_status()
            return r.json()["id"]

    async def publish_image(
        self, token: str, ig_user_id: str, image_url: str, caption: str = ""
    ) -> str:
        """High-level: 3-step 통합."""
        container_id = await self.create_image_container(token, ig_user_id, image_url, caption)
        await self.wait_for_container(token, container_id)
        return await self.publish_container(token, ig_user_id, container_id)

    async def publish_reel(
        self, token: str, ig_user_id: str, video_url: str, caption: str = "",
        share_to_feed: bool = True,
    ) -> str:
        container_id = await self.create_reel_container(token, ig_user_id, video_url, caption, share_to_feed)
        await self.wait_for_container(token, container_id, max_wait_sec=600)  # 영상은 더 오래
        return await self.publish_container(token, ig_user_id, container_id)

    # ============================================================
    # Insights & Engagement
    # ============================================================

    async def get_post_insights(self, token: str, post_id: str) -> dict:
        metrics = "impressions,reach,likes,comments,shares,saved,video_views"
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{IG_BASE}/{post_id}/insights",
                params={"metric": metrics, "access_token": token},
            )
            r.raise_for_status()
            return r.json()

    async def list_comments(self, token: str, post_id: str, limit: int = 50) -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{IG_BASE}/{post_id}/comments",
                params={"access_token": token, "limit": limit},
            )
            r.raise_for_status()
            return r.json().get("data", [])

    async def reply_comment(self, token: str, comment_id: str, text: str) -> str:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{IG_BASE}/{comment_id}/replies",
                params={"message": text[:2200], "access_token": token},
            )
            r.raise_for_status()
            return r.json()["id"]

    async def get_publishing_limit(self, token: str, ig_user_id: str) -> dict:
        """100 posts/24h 한도 실시간 확인."""
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{IG_BASE}/{ig_user_id}/content_publishing_limit",
                params={"access_token": token},
            )
            r.raise_for_status()
            return r.json()


instagram_client = InstagramAPIClient()
