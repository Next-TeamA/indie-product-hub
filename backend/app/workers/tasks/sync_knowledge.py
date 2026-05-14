"""Sync project knowledge base -- pulls GitHub activity, deploy history,
SNS performance, and market insights into structured documents for LLM context.

Runs every 6 hours via scheduler.
"""

from datetime import datetime, timezone, timedelta
from app.core.supabase import supabase, safe_maybe_single
from app.core.encryption import decrypt_token
from app.integrations.github_api import github_client


async def sync_project_knowledge():
    """Sync knowledge base for all active projects."""
    projects = (
        supabase.table("projects")
        .select("id, user_id, name, description, github_repo_owner, github_repo_name, deploy_platform")
        .execute()
    )
    for project in projects.data or []:
        try:
            await _sync_single_project(project)
        except Exception:
            continue


async def _sync_single_project(project: dict):
    project_id = project["id"]
    user_id = project["user_id"]

    # --- GitHub activity ---
    owner = project.get("github_repo_owner")
    repo = project.get("github_repo_name")
    if owner and repo:
        account = safe_maybe_single(
            supabase.table("connected_accounts")
            .select("access_token")
            .eq("user_id", user_id)
            .eq("provider", "github")
            .eq("is_active", True)
        )
        if account:
            try:
                token = decrypt_token(account["access_token"])

                # Commits
                commits = await github_client.list_commits(token, owner, repo, per_page=15)
                commit_lines = []
                for c in commits:
                    msg = c["commit"]["message"].split("\n")[0]
                    author = c["commit"]["author"]["name"]
                    date = c["commit"]["author"]["date"][:10]
                    commit_lines.append(f"- [{date}] {msg} ({author})")
                if commit_lines:
                    _upsert_knowledge(project_id, "commit_activity",
                        f"{owner}/{repo} recent commits",
                        "\n".join(commit_lines))

                # PRs
                pulls = await github_client.list_pulls(token, owner, repo, state="all", per_page=10)
                pr_lines = []
                for p in pulls:
                    state = p["state"]
                    merged = " [merged]" if p.get("merged_at") else ""
                    pr_lines.append(f"- [{state}{merged}] #{p['number']} {p['title']}")
                if pr_lines:
                    _upsert_knowledge(project_id, "pr_activity",
                        f"{owner}/{repo} recent PRs",
                        "\n".join(pr_lines))
            except Exception:
                pass

    # --- Deploy history ---
    deploys = (
        supabase.table("deployment_logs")
        .select("platform, status, commit_message, branch, created_at, error_message")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(15)
        .execute()
    )
    if deploys.data:
        deploy_lines = []
        for d in deploys.data:
            status = d["status"]
            msg = d.get("commit_message") or d.get("branch") or "--"
            date = d["created_at"][:10]
            err = f" ERROR: {d['error_message'][:80]}" if d.get("error_message") else ""
            deploy_lines.append(f"- [{date}] {d['platform']} {status}: {msg}{err}")
        _upsert_knowledge(project_id, "deploy_history",
            "Recent deployment history",
            "\n".join(deploy_lines))

    # --- SNS performance summary ---
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()
    metrics = (
        supabase.table("sns_metrics_snapshots")
        .select("impressions, likes, replies, reposts, views")
        .eq("project_id", project_id)
        .gte("snapshot_at", week_ago)
        .execute()
    )
    if metrics.data:
        total_imp = sum(m.get("impressions", 0) + m.get("views", 0) for m in metrics.data)
        total_likes = sum(m.get("likes", 0) for m in metrics.data)
        total_replies = sum(m.get("replies", 0) for m in metrics.data)
        total_reposts = sum(m.get("reposts", 0) for m in metrics.data)
        _upsert_knowledge(project_id, "sns_performance",
            "Weekly SNS performance",
            f"Last 7 days: {total_imp} impressions, {total_likes} likes, "
            f"{total_replies} replies, {total_reposts} reposts. "
            f"Data points: {len(metrics.data)}.")

    # --- Market insights digest ---
    insights = (
        supabase.table("market_insights")
        .select("title, summary, insight_type, is_urgent")
        .eq("project_id", project_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    if insights.data:
        insight_lines = []
        for i in insights.data:
            urgent = " [URGENT]" if i.get("is_urgent") else ""
            insight_lines.append(f"- [{i['insight_type']}]{urgent} {i['title']}: {i['summary'][:150]}")
        _upsert_knowledge(project_id, "market_context",
            "Recent market insights",
            "\n".join(insight_lines))

    # --- Auto-generated project README for LLM ---
    all_knowledge = (
        supabase.table("project_knowledge")
        .select("category, title, content")
        .eq("project_id", project_id)
        .neq("category", "project_readme")
        .execute()
    )
    if all_knowledge.data:
        readme_parts = [
            f"# {project.get('name', 'Project')}",
            f"\n{project.get('description', '')}",
        ]
        for k in all_knowledge.data:
            readme_parts.append(f"\n## {k['title']}\n{k['content']}")
        _upsert_knowledge(project_id, "project_readme",
            f"{project.get('name', 'Project')} knowledge base",
            "\n".join(readme_parts))


def _upsert_knowledge(project_id: str, category: str, title: str, content: str):
    """Write to both DB (hot cache) and workspace storage (source of truth)."""
    supabase.table("project_knowledge").upsert({
        "project_id": project_id,
        "category": category,
        "title": title,
        "content": content,
    }, on_conflict="project_id,category").execute()

    # Also write to workspace storage
    try:
        from app.workspace.storage import workspace_storage
        import asyncio
        # Map category to knowledge file path
        file_map = {
            "commit_activity": "knowledge/commits.md",
            "pr_activity": "knowledge/prs.md",
            "deploy_history": "knowledge/deploy_history.md",
            "sns_performance": "knowledge/sns_metrics.md",
            "market_context": "knowledge/market_context.md",
            "project_readme": "README.md",
        }
        file_path = file_map.get(category)
        if file_path:
            loop = asyncio.get_event_loop()
            loop.create_task(workspace_storage.write_file(project_id, file_path, f"# {title}\n\n{content}"))
    except Exception:
        pass  # Storage write is non-critical
