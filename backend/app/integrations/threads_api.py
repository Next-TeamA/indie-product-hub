"""Threads API v1.0 wrapper -- full metrics support."""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class ThreadsAPIClient:
    BASE_URL = "https://graph.threads.net/v1.0"
    AUTH_URL = "https://threads.net/oauth/authorize"
    TOKEN_URL = "https://graph.threads.net/oauth/access_token"
    LONG_LIVED_URL = "https://graph.threads.net/access_token"
    SCOPES = ["threads_basic", "threads_content_publish", "threads_manage_insights", "threads_manage_replies"]

    # Available media-level metrics
    MEDIA_METRICS = "views,likes,replies,reposts,quotes,shares"
    # Available profile-level metrics
    PROFILE_METRICS = "views,likes,replies,reposts,quotes,followers_count"

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
        """Get all available metrics for a single post."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{media_id}/insights",
                params={
                    "metric": self.MEDIA_METRICS,
                    "access_token": access_token,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Get insights failed: {response.text}")
            data = response.json().get("data", [])
            metrics = {}
            for item in data:
                name = item.get("name")
                values = item.get("values", [])
                metrics[name] = values[0]["value"] if values else 0

            # Calculate engagement rate
            total_engagement = sum(metrics.get(k, 0) for k in ("likes", "replies", "reposts", "quotes"))
            views = max(metrics.get("views", 1), 1)
            metrics["engagement_rate"] = round(total_engagement / views * 100, 2)

            return metrics

    async def get_user_posts_with_insights(
        self, access_token: str, user_id: str, limit: int = 20
    ) -> list[dict]:
        """Get user's recent posts with metrics for each."""
        async with httpx.AsyncClient() as client:
            # Get posts
            response = await client.get(
                f"{self.BASE_URL}/{user_id}/threads",
                params={
                    "fields": "id,text,timestamp,media_type",
                    "limit": min(limit, 50),
                    "access_token": access_token,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Get posts failed: {response.text}")

            posts = response.json().get("data", [])
            results = []

            for post in posts:
                try:
                    metrics = await self.get_post_insights(access_token, post["id"])
                    results.append({
                        "post_id": post["id"],
                        "text": post.get("text", ""),
                        "created_at": post.get("timestamp"),
                        **metrics,
                    })
                except Exception:
                    # Skip posts where insights fail (e.g. REPOST_FACADE)
                    continue

            return results

    async def get_profile_insights(
        self, access_token: str, user_id: str, since: int | None = None, until: int | None = None
    ) -> dict:
        """Get profile-level insights (followers, views, engagement).

        Note: follower_demographics requires 100+ followers and ignores date range.
        """
        params: dict = {
            "metric": self.PROFILE_METRICS,
            "access_token": access_token,
        }
        if since:
            params["since"] = since
        if until:
            params["until"] = until

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{user_id}/threads_insights",
                params=params,
            )
            if response.status_code != 200:
                raise ExternalAPIError("Threads", f"Get profile insights failed: {response.text}")

            data = response.json().get("data", [])
            result = {}
            for item in data:
                name = item.get("name")
                values = item.get("values", [])
                if name == "followers_count":
                    # followers_count returns a single value, not time series
                    result[name] = values[0]["value"] if values else 0
                else:
                    # Other metrics return daily values
                    result[name] = sum(v.get("value", 0) for v in values)

            return result


threads_client = ThreadsAPIClient()
