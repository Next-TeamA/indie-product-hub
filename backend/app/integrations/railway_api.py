"""Railway API wrapper -- OAuth for per-user access."""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class RailwayAPIClient:
    GRAPHQL_URL = "https://backboard.railway.com/graphql/v2"
    AUTH_URL = "https://railway.com/oauth/authorize"
    TOKEN_URL = "https://railway.com/oauth/token"

    def get_auth_url(self, state: str) -> str:
        """Get Railway OAuth URL for user to authorize."""
        params = {
            "client_id": settings.railway_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/railway",
            "response_type": "code",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        """Exchange auth code for access token."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                data={
                    "client_id": settings.railway_client_id,
                    "client_secret": settings.railway_client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": f"{settings.backend_url}/api/accounts/callback/railway",
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("Railway", f"Token exchange failed: {response.text}")
            return response.json()

    async def _query(self, token: str, query: str, variables: dict | None = None) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.GRAPHQL_URL,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
                json={"query": query, "variables": variables or {}},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Railway", f"GraphQL failed: {response.status_code}")
            data = response.json()
            if "errors" in data:
                raise ExternalAPIError("Railway", str(data["errors"][0].get("message", "Unknown")))
            return data.get("data", {})

    async def get_user(self, token: str) -> dict:
        data = await self._query(token, "query { me { id name email avatar } }")
        return data.get("me", {})

    async def list_projects(self, token: str) -> list[dict]:
        data = await self._query(token, """
            query {
                projects { edges { node { id name description } } }
            }
        """)
        edges = data.get("projects", {}).get("edges", [])
        return [e["node"] for e in edges]

    async def list_deployments(self, token: str, service_id: str, environment_id: str | None = None) -> list[dict]:
        query = """
        query($serviceId: String!, $environmentId: String) {
            deployments(input: { serviceId: $serviceId, environmentId: $environmentId }, first: 10) {
                edges { node { id status createdAt staticUrl } }
            }
        }
        """
        variables = {"serviceId": service_id}
        if environment_id:
            variables["environmentId"] = environment_id
        data = await self._query(token, query, variables)
        edges = data.get("deployments", {}).get("edges", [])
        return [e["node"] for e in edges]


railway_client = RailwayAPIClient()
