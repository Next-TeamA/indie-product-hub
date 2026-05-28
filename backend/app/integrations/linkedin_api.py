"""LinkedIn Marketing API wrapper.

기획서 §6.1.
- ugcPosts: 텍스트 + 이미지 + 영상 발행
- OAuth scopes: r_liteprofile, w_member_social
- 자동 답글: 정책 모호 → LaunchPad 강제 OFF (휴먼 게이트)
"""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError

LI_BASE = "https://api.linkedin.com/v2"
LI_AUTH = "https://www.linkedin.com/oauth/v2/authorization"
LI_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken"
SCOPES = ["r_liteprofile", "r_emailaddress", "w_member_social"]


class LinkedInAPIClient:
    def get_auth_url(self, state: str) -> str:
        params = {
            "response_type": "code",
            "client_id": settings.linkedin_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/linkedin",
            "state": state,
            "scope": " ".join(SCOPES),
        }
        return f"{LI_AUTH}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                LI_TOKEN,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/linkedin",
                    "client_id": settings.linkedin_client_id,
                    "client_secret": settings.linkedin_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            r.raise_for_status()
            return r.json()

    async def get_me(self, token: str) -> dict:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(
                f"{LI_BASE}/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            r.raise_for_status()
            return r.json()

    # ============================================================
    # Posting
    # ============================================================

    async def create_text_post(self, token: str, author_urn: str, text: str) -> str:
        """Simple text post. Returns post URN (e.g. 'urn:li:share:123')."""
        payload = {
            "author": author_urn,
            "lifecycleState": "PUBLISHED",
            "specificContent": {
                "com.linkedin.ugc.ShareContent": {
                    "shareCommentary": {"text": text[:3000]},
                    "shareMediaCategory": "NONE",
                }
            },
            "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{LI_BASE}/ugcPosts",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                json=payload,
            )
            r.raise_for_status()
            return r.headers.get("X-RestLi-Id") or r.json().get("id", "")

    async def upload_image(self, token: str, author_urn: str, image_bytes: bytes) -> str:
        """Register + upload image. Returns asset URN to use in post."""
        async with httpx.AsyncClient(timeout=60) as client:
            # Step 1: register
            reg = await client.post(
                f"{LI_BASE}/assets?action=registerUpload",
                headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
                json={
                    "registerUploadRequest": {
                        "recipes": ["urn:li:digitalmediaRecipe:feedshare-image"],
                        "owner": author_urn,
                        "serviceRelationships": [
                            {"relationshipType": "OWNER", "identifier": "urn:li:userGeneratedContent"}
                        ],
                    }
                },
            )
            reg.raise_for_status()
            reg_data = reg.json().get("value", {})
            upload_url = reg_data["uploadMechanism"]["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]["uploadUrl"]
            asset_urn = reg_data["asset"]

            # Step 2: upload bytes
            up = await client.put(
                upload_url,
                content=image_bytes,
                headers={"Authorization": f"Bearer {token}"},
            )
            if up.status_code not in (200, 201):
                raise ExternalAPIError("LinkedIn", f"Image upload failed: {up.status_code}")
            return asset_urn


linkedin_client = LinkedInAPIClient()
