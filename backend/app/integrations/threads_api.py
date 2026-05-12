"""Threads API v1.0 wrapper (Meta)."""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class ThreadsAPIClient:
    BASE_URL = "https://graph.threads.net/v1.0"
    AUTH_URL = "https://threads.net/oauth/authorize"
    TOKEN_URL = "https://graph.threads.net/oauth/access_token"
    LONG_LIVED_URL = "https://graph.threads.net/access_token"
    SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_insights"]

    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": settings.threads_app_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/threads",
            "scope": ",".join(self.SCOPES),
            "response_type": "code",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        """Exchange auth code for short-lived token (1 hour)."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": settings.threads_app_id,
                    "client_secret": settings.threads_client_secret,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/threads",
                    "code": code,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Token exchange failed: {response.text}")
            return response.json()

    async def get_long_lived_token(self, short_token: str) -> dict:
        """Exchange short-lived for long-lived token (60 days)."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.LONG_LIVED_URL,
                params={
                    "grant_type": "th_exchange_token",
                    "client_secret": settings.threads_client_secret,
                    "access_token": short_token,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Long-lived token failed: {response.text}")
            return response.json()

    async def refresh_long_lived_token(self, token: str) -> dict:
        """Refresh long-lived token before it expires."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                self.LONG_LIVED_URL,
                params={
                    "grant_type": "th_refresh_token",
                    "access_token": token,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Token refresh failed: {response.text}")
            return response.json()

    async def get_me(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me",
                params={
                    "fields": "id,username,threads_profile_picture_url",
                    "access_token": access_token,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Get user failed: {response.text}")
            return response.json()

    async def create_post(self, access_token: str, user_id: str, text: str) -> str:
        """Two-step publish: create container -> publish. Returns media ID."""
        async with httpx.AsyncClient() as client:
            # Step 1: Create container
            r1 = await client.post(
                f"{self.BASE_URL}/{user_id}/threads",
                params={
                    "media_type": "TEXT",
                    "text": text,
                    "access_token": access_token,
                },
            )
            if r1.status_code != 200:
                raise ExternalAPIError("Threads", f"Create container failed: {r1.text}")
            container_id = r1.json()["id"]

            # Step 2: Publish
            r2 = await client.post(
                f"{self.BASE_URL}/{user_id}/threads_publish",
                params={
                    "creation_id": container_id,
                    "access_token": access_token,
                },
            )
            if r2.status_code != 200:
                raise ExternalAPIError("Threads", f"Publish failed: {r2.text}")
            return r2.json()["id"]

    async def get_post_insights(self, access_token: str, media_id: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{media_id}/insights",
                params={
                    "metric": "views,likes,replies,reposts,quotes",
                    "access_token": access_token,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Get insights failed: {response.text}")
            data = response.json().get("data", [])
            return {item["name"]: item["values"][0]["value"] for item in data}


threads_client = ThreadsAPIClient()
