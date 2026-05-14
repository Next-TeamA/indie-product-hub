"""GitHub tools for LaunchPad Agent."""

from app.agents.context import AgentContext
from app.agents.tools.registry import register_tool
from app.integrations.github_api import github_client


def _get_repo(ctx: AgentContext) -> tuple[str, str, str]:
    token = ctx.tokens.get("github", "")
    owner = ctx.project.get("github_repo_owner", "")
    repo = ctx.project.get("github_repo_name", "")
    return token, owner, repo


async def _list_commits(ctx: AgentContext, per_page: int = 10) -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token:
        return {"error": "GitHub not connected. Connect GitHub in project settings."}
    if not owner or not repo:
        return {"error": "No GitHub repo linked to this project."}
    commits = await github_client.list_commits(token, owner, repo, per_page=per_page)
    return {"commits": [
        {"sha": c["sha"][:7], "message": c["commit"]["message"].split("\n")[0],
         "author": c["commit"]["author"]["name"], "date": c["commit"]["author"]["date"][:10]}
        for c in commits
    ]}


async def _list_pulls(ctx: AgentContext, state: str = "open", per_page: int = 10) -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token or not owner:
        return {"error": "GitHub not connected or no repo linked."}
    pulls = await github_client.list_pulls(token, owner, repo, state=state, per_page=per_page)
    return {"pulls": [
        {"number": p["number"], "title": p["title"], "state": p["state"],
         "user": p["user"]["login"], "created_at": p["created_at"][:10],
         "merged": bool(p.get("merged_at"))}
        for p in pulls
    ]}


async def _list_issues(ctx: AgentContext, state: str = "open", per_page: int = 10) -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token or not owner:
        return {"error": "GitHub not connected or no repo linked."}
    issues = await github_client.list_issues(token, owner, repo, state=state, per_page=per_page)
    return {"issues": [
        {"number": i["number"], "title": i["title"], "state": i["state"],
         "labels": [l["name"] for l in i.get("labels", [])], "created_at": i["created_at"][:10]}
        for i in issues if "pull_request" not in i  # exclude PRs
    ]}


async def _get_commit_diff(ctx: AgentContext, sha: str = "") -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token or not owner or not sha:
        return {"error": "GitHub not connected, no repo, or no SHA provided."}
    diff = await github_client.get_commit_diff(token, owner, repo, sha)
    return diff


async def _get_file_content(ctx: AgentContext, path: str = "", ref: str = "") -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token or not owner or not path:
        return {"error": "Missing GitHub connection, repo, or file path."}
    content = await github_client.get_file_content(token, owner, repo, path, ref or None)
    return {"path": path, "content": content[:3000]}


async def _get_workflow_runs(ctx: AgentContext, status: str = "failure", per_page: int = 5) -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token or not owner:
        return {"error": "GitHub not connected or no repo linked."}
    data = await github_client.get_workflow_runs(token, owner, repo, status=status, per_page=per_page)
    runs = data.get("workflow_runs", []) if isinstance(data, dict) else data
    return {"runs": [
        {"id": r["id"], "name": r.get("name", ""), "status": r["status"],
         "conclusion": r.get("conclusion"), "created_at": r["created_at"][:10],
         "head_sha": r.get("head_sha", "")[:7]}
        for r in (runs if isinstance(runs, list) else [])
    ]}


async def _get_workflow_jobs(ctx: AgentContext, run_id: int = 0) -> dict:
    token, owner, repo = _get_repo(ctx)
    if not token or not owner or not run_id:
        return {"error": "Missing connection, repo, or run_id."}
    jobs = await github_client.get_workflow_run_jobs(token, owner, repo, run_id)
    return {"jobs": [
        {"name": j.get("name", ""), "status": j["status"], "conclusion": j.get("conclusion"),
         "steps": [{"name": s["name"], "conclusion": s.get("conclusion")} for s in j.get("steps", [])]}
        for j in jobs
    ]}


def register_github_tools():
    register_tool("github_list_commits", "List recent commits from the project's GitHub repository",
        {"per_page": {"type": "integer", "description": "Number of commits to fetch (default 10)"}},
        _list_commits, "github")

    register_tool("github_list_pulls", "List pull requests from the project's GitHub repository",
        {"state": {"type": "string", "description": "PR state: open, closed, or all"},
         "per_page": {"type": "integer", "description": "Number of PRs to fetch"}},
        _list_pulls, "github")

    register_tool("github_list_issues", "List issues from the project's GitHub repository",
        {"state": {"type": "string", "description": "Issue state: open, closed, or all"},
         "per_page": {"type": "integer", "description": "Number of issues to fetch"}},
        _list_issues, "github")

    register_tool("github_get_commit_diff", "Get detailed diff for a specific commit",
        {"sha": {"type": "string", "description": "Commit SHA (full or short)"}},
        _get_commit_diff, "github")

    register_tool("github_get_file_content", "Read a file from the GitHub repository",
        {"path": {"type": "string", "description": "File path relative to repo root"},
         "ref": {"type": "string", "description": "Branch or commit SHA (optional)"}},
        _get_file_content, "github")

    register_tool("github_get_workflow_runs", "Get CI/CD workflow runs (e.g. failed builds)",
        {"status": {"type": "string", "description": "Filter by status: failure, success, etc"},
         "per_page": {"type": "integer", "description": "Number of runs"}},
        _get_workflow_runs, "github")

    register_tool("github_get_workflow_jobs", "Get jobs and steps for a specific workflow run",
        {"run_id": {"type": "integer", "description": "Workflow run ID"}},
        _get_workflow_jobs, "github")
