"""TikTok Content Posting API wrapper.

기획서 §6.1.
- Direct post: 영상 직접 발행
- Inbox post: 사용자에게 draft 전송 후 본인 앱에서 편집/발행
- OAuth scopes: video.upload, video.publish, user.info.basic
"""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

TT_BASE = "https://open.tiktokapis.com/v2"
TT_AUTH = "https://www.tiktok.com/v2/auth/authorize/"
SCOPES = [
    "user.info.basic",
    "video.upload",
    "video.publish",
]


class TikTokAPIClient:
    def get_auth_url(self, state: str) -> str:
        params = {
            "client_key": settings.tiktok_client_key,
            "response_type": "code",
            "scope": ",".join(SCOPES),
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/tiktok",
            "state": state,
        }
        return f"{TT_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{TT_BASE}/oauth/token/",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={
                    "client_key": settings.tiktok_client_key,
                    "client_secret": settings.tiktok_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/tiktok",
                },
            )
            r.raise_for_status()
            return r.json()

    async def get_user_info(self, token: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{TT_BASE}/user/info/",
                headers={"Authorization": f"Bearer {token}"},
                params={"fields": "open_id,union_id,avatar_url,display_name"},
            )
            r.raise_for_status()
            return r.json().get("data", {}).get("user", {})

    # ============================================================
    # Direct Post (자동 발행)
    # ============================================================

    async def init_video_upload(
        self,
        token: str,
        title: str,
        privacy_level: str = "PUBLIC_TO_EVERYONE",
        video_size: int = 0,
        chunk_size: int = 10_000_000,
    ) -> dict:
        """Step 1: upload session 초기화. Returns {publish_id, upload_url}."""
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                f"{TT_BASE}/post/publish/video/init/",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "post_info": {
                        "title": title[:150],
                        "privacy_level": privacy_level,
                        "disable_duet": False,
                        "disable_comment": False,
                        "disable_stitch": False,
                        "video_cover_timestamp_ms": 1000,
                    },
                    "source_info": {
                        "source": "FILE_UPLOAD",
                        "video_size": video_size,
                        "chunk_size": chunk_size,
                        "total_chunk_count": (video_size + chunk_size - 1) // chunk_size if chunk_size else 1,
                    },
                },
            )
            r.raise_for_status()
            data = r.json().get("data", {})
            return {
                "publish_id": data.get("publish_id"),
                "upload_url": data.get("upload_url"),
            }

    async def upload_video_chunk(self, upload_url: str, data: bytes, content_range: str) -> None:
        """Step 2: chunked PUT to upload_url."""
        async with httpx.AsyncClient(timeout=300) as client:
            r = await client.put(
                upload_url,
                content=data,
                headers={"Content-Type": "video/mp4", "Content-Range": content_range},
            )
            if r.status_code not in (200, 201, 206):
                raise ExternalAPIError("TikTok", f"Chunk upload failed: {r.status_code} {r.text}")

    async def get_publish_status(self, token: str, publish_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{TT_BASE}/post/publish/status/fetch/",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={"publish_id": publish_id},
            )
            r.raise_for_status()
            return r.json().get("data", {})


tiktok_client = TikTokAPIClient()
