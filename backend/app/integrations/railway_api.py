"""Railway API wrapper -- OAuth for per-user access."""

import base64
from urllib.parse import quote, urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class RailwayAPIClient:
    GRAPHQL_URL = "https://backboard.railway.com/graphql/v2"
    AUTH_URL = "https://backboard.railway.com/oauth/auth"
    TOKEN_URL = "https://backboard.railway.com/oauth/token"

    def get_auth_url(self, state: str) -> str:
        """Get Railway OAuth URL for user to authorize.

        project:viewer lets us list projects via externalWorkspaces in the
        Public API. Without it, the projects query returns an empty array
        even with a valid OIDC token.
        """
        params = {
            "client_id": settings.railway_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/railway",
            "response_type": "code",
            "scope": "openid email profile offline_access project:viewer",
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    def _basic_auth_header(self) -> str:
        """Build RFC 6749 §2.3.1 compliant Basic auth header.

        client_id and client_secret must be form-urlencoded BEFORE base64.
        httpx auth=(id, secret) skips the urlencode step and Railway rejects it
        with 'not properly encoded'.
        """
        cid = (settings.railway_client_id or "").strip()
        csec = (settings.railway_client_secret or "").strip()
        if not cid or not csec:
            raise ExternalAPIError(
                "Railway",
                f"OAuth client credentials missing (id_len={len(cid)} secret_len={len(csec)})",
            )
        encoded_id = quote(cid, safe="")
        encoded_secret = quote(csec, safe="")
        token = base64.b64encode(f"{encoded_id}:{encoded_secret}".encode("ascii")).decode("ascii")
        return f"Basic {token}"

    async def exchange_code(self, code: str) -> dict:
        """Exchange auth code for access token."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                headers={
                    "Authorization": self._basic_auth_header(),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": code,
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
        """Get user info via the OIDC userinfo endpoint.

        OAuth access tokens cannot hit the GraphQL `me` query directly --
        Railway exposes user claims through /oauth/me instead.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://backboard.railway.com/oauth/me",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Railway", f"User info failed: {response.text}")
            data = response.json()
            return {
                "id": data.get("sub"),
                "name": data.get("name") or data.get("preferred_username"),
                "email": data.get("email"),
                "avatar": data.get("picture"),
            }

    async def list_projects(self, token: str) -> list[dict]:
        """List projects via externalWorkspaces -- the OAuth-flow-compatible query.

        Generic `projects { edges { node ... } }` returns empty for OAuth tokens;
        Railway exposes user-granted projects through externalWorkspaces.
        """
        data = await self._query(token, """
            query {
                externalWorkspaces {
                    id
                    name
                    projects {
                        id
                        name
                    }
                }
            }
        """)
        workspaces = data.get("externalWorkspaces") or []
        projects: list[dict] = []
        for ws in workspaces:
            ws_name = ws.get("name") or ""
            for p in (ws.get("projects") or []):
                projects.append({
                    "id": p["id"],
                    "name": p["name"],
                    "description": f"Workspace: {ws_name}" if ws_name else "",
                })
        return projects

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
