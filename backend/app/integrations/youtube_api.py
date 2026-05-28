"""YouTube Data API v3 wrapper -- Shorts 업로드 + 댓글 관리.

기획서 §6.1.
- Shorts: 9:16 + ≤60초 + #Shorts 태그
- 한도: 10 영상/24h/채널 (하드)
- 쿼터: 10,000/일 (videos.insert 100 units = 100개 가능, 채널 한도 먼저 닿음)
- OAuth scopes: youtube.upload, youtube.force-ssl

Resumable upload: 큰 영상은 chunked, 작은 건 simple multipart.
"""

import os
import tempfile
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

YT_BASE = "https://www.googleapis.com/youtube/v3"
YT_UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3"
YT_OAUTH = "https://oauth2.googleapis.com/token"
YT_AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
SCOPES = [
    "https://www.googleapis.com/auth/youtube.upload",
    "https://www.googleapis.com/auth/youtube.force-ssl",
    "https://www.googleapis.com/auth/youtube.readonly",
]


class YouTubeAPIClient:
    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": settings.youtube_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/youtube",
            "response_type": "code",
            "scope": " ".join(SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        return f"{YT_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                YT_OAUTH,
                data={
                    "code": code,
                    "client_id": settings.youtube_client_id,
                    "client_secret": settings.youtube_client_secret,
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/youtube",
                    "grant_type": "authorization_code",
                },
            )
            r.raise_for_status()
            return r.json()

    async def refresh_token(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                YT_OAUTH,
                data={
                    "refresh_token": refresh_token,
                    "client_id": settings.youtube_client_id,
                    "client_secret": settings.youtube_client_secret,
                    "grant_type": "refresh_token",
                },
            )
            r.raise_for_status()
            return r.json()

    async def get_channel(self, token: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{YT_BASE}/channels",
                headers={"Authorization": f"Bearer {token}"},
                params={"part": "snippet,statistics", "mine": "true"},
            )
            r.raise_for_status()
            items = r.json().get("items", [])
            return items[0] if items else {}

    # ============================================================
    # Video Upload (Resumable)
    # ============================================================

    async def upload_video(
        self,
        token: str,
        video_path: str,
        title: str,
        description: str,
        tags: list[str] | None = None,
        category_id: str = "22",  # People & Blogs
        privacy_status: str = "public",
        is_short: bool = True,
    ) -> str:
        """Upload video. Returns YouTube video ID.

        Shorts 자격: title 또는 description에 '#Shorts' 포함 + 9:16 + ≤60초.
        """
        if is_short:
            description = f"{description}\n\n#Shorts"

        metadata = {
            "snippet": {
                "title": title[:100],
                "description": description[:5000],
                "tags": (tags or [])[:50],
                "categoryId": category_id,
            },
            "status": {
                "privacyStatus": privacy_status,
                "selfDeclaredMadeForKids": False,
            },
        }

        file_size = os.path.getsize(video_path)

        async with httpx.AsyncClient(timeout=60) as client:
            # Step 1: resumable session 시작
            init = await client.post(
                f"{YT_UPLOAD_BASE}/videos",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Upload-Content-Length": str(file_size),
                    "X-Upload-Content-Type": "video/*",
                },
                params={"uploadType": "resumable", "part": "snippet,status"},
                json=metadata,
            )
            if init.status_code != 200:
                raise ExternalAPIError("YouTube", f"Init upload failed: {init.text}")
            upload_url = init.headers.get("Location")
            if not upload_url:
                raise ExternalAPIError("YouTube", "No upload URL in response")

        # Step 2: 파일 업로드 (별도 클라이언트 — 더 긴 timeout)
        async with httpx.AsyncClient(timeout=1800) as upload_client:
            with open(video_path, "rb") as f:
                r = await upload_client.put(
                    upload_url,
                    content=f.read(),
                    headers={
                        "Content-Type": "video/*",
                        "Content-Length": str(file_size),
                    },
                )
                if r.status_code not in (200, 201):
                    raise ExternalAPIError("YouTube", f"Upload failed: {r.status_code} {r.text}")
                return r.json()["id"]

    # ============================================================
    # Engagement
    # ============================================================

    async def list_comment_threads(self, token: str, video_id: str, max_results: int = 50) -> list[dict]:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{YT_BASE}/commentThreads",
                headers={"Authorization": f"Bearer {token}"},
                params={
                    "part": "snippet,replies",
                    "videoId": video_id,
                    "maxResults": max_results,
                },
            )
            r.raise_for_status()
            return r.json().get("items", [])

    async def reply_comment(self, token: str, parent_id: str, text: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{YT_BASE}/comments",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                params={"part": "snippet"},
                json={"snippet": {"parentId": parent_id, "textOriginal": text[:10000]}},
            )
            r.raise_for_status()
            return r.json()

    async def get_video_stats(self, token: str, video_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{YT_BASE}/videos",
                headers={"Authorization": f"Bearer {token}"},
                params={"part": "statistics,snippet", "id": video_id},
            )
            r.raise_for_status()
            items = r.json().get("items", [])
            return items[0] if items else {}


youtube_client = YouTubeAPIClient()
