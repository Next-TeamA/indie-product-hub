"""GitHub REST API wrapper."""

from urllib.parse import urlencode

import httpx

from app.core.config import settings
from app.core.exceptions import ExternalAPIError


class GitHubAPIClient:
    BASE_URL = "https://api.github.com"
    AUTH_URL = "https://github.com/login/oauth/authorize"
    TOKEN_URL = "https://github.com/login/oauth/access_token"
    SCOPES = ["repo", "read:org", "admin:repo_hook"]

    def get_auth_url(self, state: str) -> str:
        params = {
            "client_id": settings.github_client_id,
            "redirect_uri": f"{settings.backend_url}/api/accounts/callback/github",
            "scope": " ".join(self.SCOPES),
            "state": state,
        }
        return f"{self.AUTH_URL}?{urlencode(params)}"

    async def exchange_code(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                self.TOKEN_URL,
                headers={"Accept": "application/json"},
                data={
                    "client_id": settings.github_client_id,
                    "client_secret": settings.github_client_secret,
                    "code": code,
                },
            )
            if response.status_code != 200:
                raise ExternalAPIError("GitHub", f"Token exchange failed: {response.text}")
            data = response.json()
            if "error" in data:
                raise ExternalAPIError("GitHub", data.get("error_description", data["error"]))
            return data

    async def _request(self, token: str, method: str, path: str, **kwargs) -> dict | list:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.request(
                method,
                f"{self.BASE_URL}{path}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                },
                **kwargs,
            )
            if response.status_code >= 400:
                raise ExternalAPIError("GitHub", f"{method} {path} failed: {response.status_code}")
            return response.json()

    async def get_user(self, token: str) -> dict:
        return await self._request(token, "GET", "/user")

    async def get_repo(self, token: str, owner: str, repo: str) -> dict:
        return await self._request(token, "GET", f"/repos/{owner}/{repo}")

    async def list_commits(self, token: str, owner: str, repo: str, per_page: int = 10) -> list:
        return await self._request(token, "GET", f"/repos/{owner}/{repo}/commits", params={"per_page": per_page})

    async def list_issues(self, token: str, owner: str, repo: str, state: str = "open", per_page: int = 10) -> list:
        return await self._request(token, "GET", f"/repos/{owner}/{repo}/issues", params={"state": state, "per_page": per_page})

    async def list_pulls(self, token: str, owner: str, repo: str, state: str = "open", per_page: int = 10) -> list:
        return await self._request(token, "GET", f"/repos/{owner}/{repo}/pulls", params={"state": state, "per_page": per_page})

    async def get_workflow_runs(self, token: str, owner: str, repo: str, status: str = "failure", per_page: int = 5) -> list:
        """Get recent workflow runs (CI/CD)."""
        return await self._request(
            token, "GET", f"/repos/{owner}/{repo}/actions/runs",
            params={"status": status, "per_page": per_page},
        )

    async def get_workflow_run_logs_url(self, token: str, owner: str, repo: str, run_id: int) -> str:
        """Get download URL for workflow run logs (zip)."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/logs",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github+json",
                },
                follow_redirects=False,
            )
            if response.status_code == 302:
                return response.headers.get("location", "")
            raise ExternalAPIError("GitHub", f"Get logs failed: {response.status_code}")

    async def get_workflow_run_jobs(self, token: str, owner: str, repo: str, run_id: int) -> list:
        """Get jobs for a workflow run -- includes step-level status and conclusions."""
        data = await self._request(token, "GET", f"/repos/{owner}/{repo}/actions/runs/{run_id}/jobs")
        return data.get("jobs", []) if isinstance(data, dict) else []

    async def get_file_content(self, token: str, owner: str, repo: str, path: str, ref: str | None = None) -> str:
        """Get raw file content at a specific commit/branch."""
        params = {}
        if ref:
            params["ref"] = ref
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.BASE_URL}/repos/{owner}/{repo}/contents/{path}",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/vnd.github.raw+json",
                },
                params=params,
            )
            if response.status_code != 200:
                raise ExternalAPIError("GitHub", f"Get file failed: {response.status_code} {path}")
            return response.text

    async def get_commit_diff(self, token: str, owner: str, repo: str, sha: str) -> dict:
        """Get commit details including file patches (diffs)."""
        data = await self._request(token, "GET", f"/repos/{owner}/{repo}/commits/{sha}")
        return {
            "sha": data.get("sha", ""),
            "message": data.get("commit", {}).get("message", ""),
            "author": data.get("commit", {}).get("author", {}).get("name", ""),
            "date": data.get("commit", {}).get("author", {}).get("date", ""),
            "files": [
                {
                    "filename": f.get("filename", ""),
                    "status": f.get("status", ""),  # added, modified, removed
                    "additions": f.get("additions", 0),
                    "deletions": f.get("deletions", 0),
                    "patch": f.get("patch", "")[:2000],  # Truncate large diffs
                }
                for f in data.get("files", [])
            ],
        }

    async def get_recent_commits_with_diffs(self, token: str, owner: str, repo: str, per_page: int = 3) -> list[dict]:
        """Get recent commits with their file changes."""
        commits = await self.list_commits(token, owner, repo, per_page=per_page)
        results = []
        for c in commits:
            sha = c.get("sha", "")
            if not sha:
                continue
            try:
                diff = await self.get_commit_diff(token, owner, repo, sha)
                results.append(diff)
            except Exception:
                continue
        return results

    async def create_webhook(self, token: str, owner: str, repo: str, webhook_url: str, events: list[str] | None = None) -> dict:
        return await self._request(
            token, "POST", f"/repos/{owner}/{repo}/hooks",
            json={
                "name": "web",
                "active": True,
                "events": events or ["push", "pull_request", "issues", "deployment_status"],
                "config": {
                    "url": webhook_url,
                    "content_type": "json",
                    "secret": settings.github_webhook_secret,
                    "insecure_ssl": "0",
                },
            },
        )


github_client = GitHubAPIClient()
