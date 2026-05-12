"""Railway GraphQL API wrapper."""

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class RailwayAPIClient:
    URL = "https://backboard.railway.com/graphql/v2"

    async def _query(self, query: str, variables: dict | None = None, token: str | None = None) -> dict:
        t = token or settings.railway_token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.URL,
                headers={
                    "Authorization": f"Bearer {t}",
                    "Content-Type": "application/json",
                },
                json={"query": query, "variables": variables or {}},
            )
            if response.status_code != 200:
                raise ExternalAPIError("Railway", f"GraphQL request failed: {response.status_code}")
            data = response.json()
            if "errors" in data:
                raise ExternalAPIError("Railway", str(data["errors"][0].get("message", "Unknown error")))
            return data.get("data", {})

    async def list_deployments(self, service_id: str, environment_id: str | None = None, token: str | None = None) -> list[dict]:
        query = """
        query($serviceId: String!, $environmentId: String) {
          deployments(input: { serviceId: $serviceId, environmentId: $environmentId }, first: 10) {
            edges {
              node {
                id
                status
                createdAt
                staticUrl
              }
            }
          }
        }
        """
        variables = {"serviceId": service_id}
        if environment_id:
            variables["environmentId"] = environment_id
        data = await self._query(query, variables, token)
        edges = data.get("deployments", {}).get("edges", [])
        return [edge["node"] for edge in edges]

    async def get_deployment(self, deployment_id: str, token: str | None = None) -> dict:
        query = """
        query($id: String!) {
          deployment(id: $id) {
            id
            status
            createdAt
            staticUrl
          }
        }
        """
        data = await self._query(query, {"id": deployment_id}, token)
        return data.get("deployment", {})


railway_client = RailwayAPIClient()
