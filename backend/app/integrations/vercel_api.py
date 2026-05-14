"""Vercel API wrapper -- OAuth Integration for per-user access."""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class VercelAPIClient:
    BASE_URL = "https://api.vercel.com"
    AUTH_URL = "https://vercel.com/integrations/launchpad/new"
    TOKEN_URL = "https://api.vercel.com/v2/oauth/access_token"

    def get_auth_url(self, state: str) -> str:
        """Get Vercel OAuth URL for user to authorize."""
        params = {
            "client_id": settings.vercel_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/vercel",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        """Exchange auth code for access token."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": settings.vercel_client_id,
                    "client_secret": settings.vercel_client_secret,
                    "code": code,
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/vercel",
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"Token exchange failed: {response.text}")
            return response.json()

    async def get_user(self, token: str) -> dict:
        """Get authenticated user info."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/v2/user",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"Get user failed: {response.status_code}")
            return response.json().get("user", {})

    async def list_projects(self, token: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/v9/projects",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"List projects failed: {response.status_code}")
            return response.json().get("projects", [])

    async def list_deployments(self, token: str, project_id: str, limit: int = 10) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/v6/deployments",
                headers={"Authorization": f"Bearer {token}"},
                params={"projectId": project_id, "limit": limit},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"List deployments failed: {response.status_code}")
            return response.json().get("deployments", [])

    async def get_deployment(self, token: str, deployment_id: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/v13/deployments/{deployment_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"Get deployment failed: {response.status_code}")
            return response.json()

    async def get_deployment_events(self, token: str, deployment_id: str) -> list[dict]:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/v3/deployments/{deployment_id}/events",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"Get events failed: {response.status_code}")
            return response.json()


vercel_client = VercelAPIClient()
