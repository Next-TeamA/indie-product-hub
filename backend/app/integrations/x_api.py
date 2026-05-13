"""X (Twitter) API v2 wrapper -- full metrics support."""

import hashlib
import secrets
import base64
from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class XAPIClient:
    BASE_URL = "https://api.x.com/2"
    AUTH_URL = "https://twitter.com/i/oauth2/authorize"
    TOKEN_URL = "https://api.x.com/2/oauth2/token"
    SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"]

    # All available metric fields
    PUBLIC_FIELDS = "public_metrics"  # retweet_count, reply_count, like_count, quote_count, bookmark_count, impression_count
    NON_PUBLIC_FIELDS = "non_public_metrics"  # url_link_clicks, user_profile_clicks (own tweets only, last 30 days)
    ORGANIC_FIELDS = "organic_metrics"  # same as public but organic-only (own tweets only, last 30 days)

    @staticmethod
    def generate_pkce() -> tuple[str, str]:
        verifier = secrets.token_urlsafe(64)[:128]
        digest = hashlib.sha256(verifier.encode()).digest()
        challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode()
        return verifier, challenge

    def get_auth_url(self, state: str, code_challenge: str) -> str:
        params = {
            "response_type": "code",
            "client_id": settings.x_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/x",
            "scope": " ".join(self.SCOPES),
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str, code_verifier: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/x",
                    "code_verifier": code_verifier,
                    "client_id": settings.x_client_id,
                },
                auth=(settings.x_client_id, settings.x_client_secret),
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Token exchange failed: {response.text}")
            return response.json()

    async def refresh_token(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.x_client_id,
                },
                auth=(settings.x_client_id, settings.x_client_secret),
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Token refresh failed: {response.text}")
            return response.json()

    async def get_me(self, access_token: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"user.fields": "id,name,username,profile_image_url,public_metrics"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Get user failed: {response.text}")
            return response.json()["data"]

    async def post_tweet(self, access_token: str, text: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.BASE_URL}/tweets",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={"text": text},
            )
            if response.status_code not in (200, 201):
                raise ExternalAPIError("X", f"Post tweet failed: {response.text}")
            return response.json()["data"]

    async def get_tweet_metrics(self, access_token: str, tweet_id: str) -> dict:
        """Get full metrics for a single tweet (own tweets get non_public + organic too)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/tweets/{tweet_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "tweet.fields": f"{self.PUBLIC_FIELDS},{self.NON_PUBLIC_FIELDS},{self.ORGANIC_FIELDS},created_at",
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Get metrics failed: {response.text}")
            data = response.json()["data"]

            # Merge all metric sources into flat dict
            pm = data.get("public_metrics", {})
            npm = data.get("non_public_metrics", {})
            return {
                "tweet_id": data["id"],
                "created_at": data.get("created_at"),
                # Public (available for any tweet)
                "impressions": pm.get("impression_count", 0),
                "likes": pm.get("like_count", 0),
                "retweets": pm.get("retweet_count", 0),
                "replies": pm.get("reply_count", 0),
                "quotes": pm.get("quote_count", 0),
                "bookmarks": pm.get("bookmark_count", 0),
                # Non-public (own tweets only, last 30 days)
                "url_clicks": npm.get("url_link_clicks", 0),
                "profile_clicks": npm.get("user_profile_clicks", 0),
            }

    async def get_user_tweets_with_metrics(
        self, access_token: str, user_id: str, max_results: int = 20
    ) -> list[dict]:
        """Get user's recent tweets with all available metrics."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{user_id}/tweets",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "max_results": min(max_results, 100),
                    "tweet.fields": f"{self.PUBLIC_FIELDS},{self.NON_PUBLIC_FIELDS},created_at",
                    "exclude": "retweets,replies",  # Only original tweets
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Get tweets failed: {response.text}")

            tweets = response.json().get("data", [])
            results = []
            for t in tweets:
                pm = t.get("public_metrics", {})
                npm = t.get("non_public_metrics", {})
                results.append({
                    "tweet_id": t["id"],
                    "text": t.get("text", ""),
                    "created_at": t.get("created_at"),
                    "impressions": pm.get("impression_count", 0),
                    "likes": pm.get("like_count", 0),
                    "retweets": pm.get("retweet_count", 0),
                    "replies": pm.get("reply_count", 0),
                    "quotes": pm.get("quote_count", 0),
                    "bookmarks": pm.get("bookmark_count", 0),
                    "url_clicks": npm.get("url_link_clicks", 0),
                    "profile_clicks": npm.get("user_profile_clicks", 0),
                    # Engagement rate = (likes + retweets + replies + quotes) / impressions
                    "engagement_rate": round(
                        (pm.get("like_count", 0) + pm.get("retweet_count", 0) +
                         pm.get("reply_count", 0) + pm.get("quote_count", 0)) /
                        max(pm.get("impression_count", 1), 1) * 100, 2
                    ),
                })
            return results

    async def get_user_profile_metrics(self, access_token: str) -> dict:
        """Get authenticated user's profile-level metrics."""
        data = await self.get_me(access_token)
        pm = data.get("public_metrics", {})
        return {
            "user_id": data["id"],
            "username": data.get("username"),
            "name": data.get("name"),
            "followers_count": pm.get("followers_count", 0),
            "following_count": pm.get("following_count", 0),
            "tweet_count": pm.get("tweet_count", 0),
            "listed_count": pm.get("listed_count", 0),
        }


x_client = XAPIClient()
