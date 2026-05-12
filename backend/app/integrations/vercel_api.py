"""Vercel REST API wrapper."""

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class VercelAPIClient:
    BASE_URL = "https://api.vercel.com"

    def _headers(self, token: str | None = None) -> dict:
        t = token or settings.vercel_token
        return {"Authorization": f"Bearer {t}"}

    async def list_deployments(self, project_id: str, token: str | None = None, limit: int = 10) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/v6/deployments",
                headers=self._headers(token),
                params={"projectId": project_id, "limit": limit},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"List deployments failed: {response.status_code}")
            return response.json().get("deployments", [])

    async def get_deployment(self, deployment_id: str, token: str | None = None) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/v13/deployments/{deployment_id}",
                headers=self._headers(token),
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"Get deployment failed: {response.status_code}")
            return response.json()

    async def get_deployment_events(self, deployment_id: str, token: str | None = None) -> list[dict]:
        """Get build logs for a deployment."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/v3/deployments/{deployment_id}/events",
                headers=self._headers(token),
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"Get events failed: {response.status_code}")
            return response.json()

    async def list_projects(self, token: str | None = None) -> list[dict]:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/v9/projects",
                headers=self._headers(token),
            )
            if response.status_code != 200:
                raise ExternalAPIError("Vercel", f"List projects failed: {response.status_code}")
            return response.json().get("projects", [])


vercel_client = VercelAPIClient()
