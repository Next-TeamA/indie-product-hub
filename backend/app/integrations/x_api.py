"""X (Twitter) API v2 wrapper."""

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

    @staticmethod
    def generate_pkce() -> tuple[str, str]:
        """Generate PKCE code_verifier and code_challenge."""
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
        async with httpx.AsyncClient() as client:
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
        async with httpx.AsyncClient() as client:
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
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"user.fields": "id,name,username,profile_image_url"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Get user failed: {response.text}")
            return response.json()["data"]

    async def post_tweet(self, access_token: str, text: str) -> dict:
        async with httpx.AsyncClient() as client:
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
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/tweets/{tweet_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"tweet.fields": "public_metrics,non_public_metrics,organic_metrics"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Get metrics failed: {response.text}")
            return response.json()["data"]

    async def get_user_tweets(self, access_token: str, user_id: str, max_results: int = 10) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/{user_id}/tweets",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "max_results": max_results,
                    "tweet.fields": "public_metrics,created_at",
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("X", f"Get tweets failed: {response.text}")
            return response.json().get("data", [])


x_client = XAPIClient()
