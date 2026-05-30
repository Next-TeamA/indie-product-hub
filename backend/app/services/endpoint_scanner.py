"""Scan user's GitHub repo to discover API endpoints.

Supports Next.js App Router and Pages Router patterns.
Discovered endpoints are stored in project_knowledge for reuse.
"""

import re
from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
from app.integrations.github_api import github_client

# Next.js App Router: src/app/api/**/route.ts
APP_ROUTER_RE = re.compile(r"^(?:src/)?app/api/(.+)/route\.(ts|js)$")
# Next.js Pages Router: src/pages/api/**/*.ts
PAGES_ROUTER_RE = re.compile(r"^(?:src/)?pages/api/(.+)\.(ts|js)$")
# Dynamic segments: [id] -> :id (for display), but use a real value for testing
DYNAMIC_SEG_RE = re.compile(r"\[([^\]]+)\]")


def _tree_path_to_api_route(file_path: str) -> str | None:
    """Convert a file path to its API route.

    src/app/api/checkout/route.ts       -> /api/checkout
    src/app/api/users/[id]/route.ts     -> /api/users/[id]
    src/pages/api/auth/login.ts         -> /api/auth/login
    src/pages/api/users/[id].ts         -> /api/users/[id]
    """
    # App Router
    m = APP_ROUTER_RE.match(file_path)
    if m:
        route = m.group(1)
        return f"/api/{route}"

    # Pages Router
    m = PAGES_ROUTER_RE.match(file_path)
    if m:
        route = m.group(1)
        if route.endswith("/index"):
            route = route[:-6] or ""
        return f"/api/{route}" if route else "/api"

    return None


async def scan_project_endpoints(project_id: str) -> list[dict]:
    """Scan a project's GitHub repo for API endpoints.

    Returns list of {"route": "/api/checkout", "file": "src/app/api/checkout/route.ts", "has_dynamic": bool}
    """
    project = (
        supabase.table("projects")
        .select("github_repo_owner, github_repo_name, user_id")
        .eq("id", project_id)
        .single()
        .execute()
    )
    if not project.data or not project.data.get("github_repo_owner"):
        return []

    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", project.data["user_id"])
        .eq("provider", "github")
        .eq("is_active", True)
    )
    if not account:
        return []

    token = decrypt_token(account["access_token"])
    owner = project.data["github_repo_owner"]
    repo = project.data["github_repo_name"]

    try:
        tree = await github_client.get_tree(token, owner, repo)
    except Exception:
        return []

    endpoints = []
    for item in tree:
        if item.get("type") != "blob":
            continue
        path = item.get("path", "")
        route = _tree_path_to_api_route(path)
        if route:
            has_dynamic = bool(DYNAMIC_SEG_RE.search(route))
            endpoints.append({
                "route": route,
                "file": path,
                "has_dynamic": has_dynamic,
            })

    # Cache in project_knowledge
    if endpoints:
        route_list = "\n".join(f"- {e['route']} ({e['file']})" for e in endpoints)
        supabase.table("project_knowledge").upsert({
            "project_id": project_id,
            "category": "api_endpoints",
            "content": route_list,
        }, on_conflict="project_id,category").execute()

    return endpoints
