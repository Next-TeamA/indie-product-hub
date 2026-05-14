"""Cross-service automations -- the core value of LaunchPad.

These functions connect different services together to create
automations that users would otherwise do manually.
"""

from datetime import datetime, timezone

from app.core.supabase import supabase, safe_maybe_single
from app.integrations import gemini


# ─── 1. GitHub push -> Promotion draft ───

async def create_promo_draft_from_push(project_id: str, user_id: str, push_data: dict):
    """When a significant GitHub push happens, auto-generate a promotion draft.

    Heuristic for "significant":
    - Has at least 1 commit with a message starting with "feat:" or "fix:" or "release"
    - Or has 5+ changed files across all commits
    """
    commits = push_data.get("commits", [])
    if not commits:
        return

    # Check significance
    significant_prefixes = ("feat:", "fix:", "release", "launch", "ship")
    has_significant_commit = any(
        c.get("message", "").lower().startswith(significant_prefixes)
        for c in commits
    )
    total_changes = sum(
        len(c.get("added", [])) + len(c.get("modified", [])) + len(c.get("removed", []))
        for c in commits
    )
    if not has_significant_commit and total_changes < 5:
        return

    # Get project info for context
    project = supabase.table("projects").select("name, description").eq("id", project_id).single().execute()
    if not project.data:
        return

    # Build commit summary
    commit_summary = "\n".join(
        f"- {c.get('message', '').split(chr(10))[0]}"
        for c in commits[:5]
    )
    branch = push_data.get("ref", "").replace("refs/heads/", "")

    prompt = f"""
Product: {project.data['name']}
Description: {project.data.get('description', 'N/A')}

This product just pushed the following updates to {branch}:
{commit_summary}

Generate a promotional social media post about this update.
Tone: authentic, builder-voice, not salesy.
Return JSON: {{"hook": "...", "content": "...", "hashtags": ["..."]}}
"""

    try:
        result = await gemini.generate_json(
            prompt=prompt,
            system="You write social media posts for indie developers sharing their build progress. Never use emojis. Be specific about what changed. Sound like a real person, not a brand.",
        )

        # Save as draft
        supabase.table("promotion_posts").insert({
            "project_id": project_id,
            "user_id": user_id,
            "platform": "x",  # Default to X, user can change
            "hook": result.get("hook", ""),
            "content": result.get("content", ""),
            "hashtags": result.get("hashtags", []),
            "ai_prompt": f"Auto-generated from GitHub push: {commit_summary[:200]}",
            "ai_model": "gemini-2.5-flash",
            "tone": "friendly",
            "content_type": "update",
            "status": "draft",
        }).execute()

        # Alert user
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "system",
            "severity": "info",
            "title": "Promotion draft created",
            "message": f"AI generated a post draft from your latest push to {branch}",
            "action_url": f"/projects/{project_id}/promotion",
        }).execute()

    except Exception:
        pass  # Don't fail silently in production -- log this


# ─── 2. Deploy failure -> Auto-create issue ───

async def create_issue_from_deploy_failure(
    project_id: str, user_id: str, platform: str, deployment_id: str, error_detail: str
):
    """When a deployment fails, auto-create a tracked issue."""
    supabase.table("issues").insert({
        "project_id": project_id,
        "user_id": user_id,
        "title": f"Deploy failed: {platform} #{deployment_id[:8]}",
        "description": error_detail[:500] if error_detail else f"Deployment {deployment_id} failed on {platform}",
        "severity": "critical",
        "category": "deployment",
        "status": "open",
        "source": platform,
        "source_ref": deployment_id,
    }).execute()


# ─── 3. Optimal posting time analysis ───

async def analyze_optimal_posting_time(project_id: str, user_id: str) -> dict:
    """Analyze user's past X posts to find the best time to post.

    Logic: group posts by hour-of-day, calculate average engagement rate per hour.
    Returns best hours and days.
    """
    # Get all published posts with metrics
    snapshots = (
        supabase.table("sns_metrics_snapshots")
        .select("*, promotion_posts!inner(created_at, platform)")
        .eq("project_id", project_id)
        .order("snapshot_at", desc=True)
        .limit(200)
        .execute()
    )

    if not snapshots.data or len(snapshots.data) < 5:
        return {"status": "insufficient_data", "message": "Need at least 5 published posts with metrics"}

    # Group by hour of day
    hour_engagement: dict[int, list[float]] = {}
    day_engagement: dict[int, list[float]] = {}

    for s in snapshots.data:
        post_data = s.get("promotion_posts", {})
        created = post_data.get("created_at", "")
        if not created:
            continue

        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue

        impressions = max(s.get("impressions", 0) + s.get("views", 0), 1)
        engagement = s.get("likes", 0) + s.get("replies", 0) + s.get("reposts", 0)
        rate = engagement / impressions * 100

        hour = dt.hour
        day = dt.weekday()  # 0=Mon, 6=Sun

        if hour not in hour_engagement:
            hour_engagement[hour] = []
        hour_engagement[hour].append(rate)

        if day not in day_engagement:
            day_engagement[day] = []
        day_engagement[day].append(rate)

    # Calculate averages
    hour_avg = {h: sum(rates) / len(rates) for h, rates in hour_engagement.items()}
    day_avg = {d: sum(rates) / len(rates) for d, rates in day_engagement.items()}

    # Find best
    best_hours = sorted(hour_avg.items(), key=lambda x: x[1], reverse=True)[:3]
    best_days = sorted(day_avg.items(), key=lambda x: x[1], reverse=True)[:3]

    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    return {
        "status": "ok",
        "best_hours": [{"hour": h, "avg_engagement": round(r, 2)} for h, r in best_hours],
        "best_days": [{"day": day_names[d], "avg_engagement": round(r, 2)} for d, r in best_days],
        "recommendation": f"Best time: {best_days[0][0]}day at {best_hours[0][0]:02d}:00" if best_hours and best_days else "Not enough data",
        "total_posts_analyzed": len(snapshots.data),
    }


# ─── 4. Weekly report generation ───

async def generate_weekly_report(project_id: str) -> dict:
    """Generate a comprehensive weekly report using Gemini.

    Aggregates: SNS metrics, deployment logs, issues, promotion activity.
    """
    # Gather data from last 7 days
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    # SNS metrics
    metrics = (
        supabase.table("sns_metrics_snapshots")
        .select("impressions, likes, replies, reposts, views, snapshot_at")
        .eq("project_id", project_id)
        .gte("snapshot_at", week_ago)
        .execute()
    )

    # Deployments
    deploys = (
        supabase.table("deployment_logs")
        .select("status, platform, created_at")
        .eq("project_id", project_id)
        .gte("created_at", week_ago)
        .execute()
    )

    # Issues
    issues = (
        supabase.table("issues")
        .select("title, severity, status, created_at")
        .eq("project_id", project_id)
        .gte("created_at", week_ago)
        .execute()
    )

    # Posts
    posts = (
        supabase.table("promotion_posts")
        .select("platform, status, created_at")
        .eq("project_id", project_id)
        .gte("created_at", week_ago)
        .execute()
    )

    # Project info
    project = supabase.table("projects").select("name, description").eq("id", project_id).single().execute()
    proj = project.data or {}

    # Aggregate
    total_impressions = sum(m.get("impressions", 0) + m.get("views", 0) for m in metrics.data or [])
    total_likes = sum(m.get("likes", 0) for m in metrics.data or [])
    deploy_count = len(deploys.data or [])
    deploy_failures = len([d for d in (deploys.data or []) if d["status"] == "error"])
    new_issues = len(issues.data or [])
    posts_published = len([p for p in (posts.data or []) if p["status"] == "published"])

    data_summary = f"""
Product: {proj.get('name', 'Unknown')}
Week Summary:
- SNS: {total_impressions} impressions, {total_likes} likes across {len(metrics.data or [])} data points
- Deployments: {deploy_count} total, {deploy_failures} failures
- Issues: {new_issues} new this week
- Posts: {posts_published} published
"""

    prompt = f"""
{data_summary}

Generate a weekly report for this indie product. Be specific with numbers.
Include:
1. Performance highlights (what went well)
2. Areas of concern (what needs attention)
3. Actionable recommendations (what to do next week)

Keep it concise, 3-5 bullet points per section. No fluff.
Return JSON: {{"highlights": ["..."], "concerns": ["..."], "recommendations": ["..."], "summary": "one sentence overall"}}
"""

    report = await gemini.generate_json(
        prompt=prompt,
        system="You write weekly product reports for indie developers. Be direct, data-driven, actionable. Never use emojis.",
    )

    return {
        "period": {"from": week_ago, "to": datetime.now(timezone.utc).isoformat()},
        "metrics": {
            "impressions": total_impressions,
            "likes": total_likes,
            "deploys": deploy_count,
            "deploy_failures": deploy_failures,
            "new_issues": new_issues,
            "posts_published": posts_published,
        },
        "report": report,
    }


# ─── 5. GitHub issues sync ───

async def sync_github_issues(project_id: str, user_id: str):
    """Pull open issues from GitHub and create corresponding issues in LaunchPad."""
    from app.core.encryption import decrypt_token
    from app.integrations.github_api import github_client

    project = (
        supabase.table("projects")
        .select("github_repo_owner, github_repo_name")
        .eq("id", project_id)
        .single()
        .execute()
    )
    if not project.data or not project.data.get("github_repo_owner"):
        return {"synced": 0, "message": "No GitHub repo configured"}

    account = safe_maybe_single(
        supabase.table("connected_accounts")
        .select("access_token")
        .eq("user_id", user_id)
        .eq("provider", "github")
        .eq("is_active", True)
    )
    if not account:
        return {"synced": 0, "message": "No connected GitHub account"}

    token = decrypt_token(account["access_token"])
    owner = project.data["github_repo_owner"]
    repo = project.data["github_repo_name"]

    gh_issues = await github_client.list_issues(token, owner, repo, state="open", per_page=20)

    synced = 0
    for gi in gh_issues:
        # Skip pull requests (GitHub API returns PRs in issues endpoint)
        if "pull_request" in gi:
            continue

        # Check if already synced (by source_ref)
        existing = safe_maybe_single(
            supabase.table("issues")
            .select("id")
            .eq("project_id", project_id)
            .eq("source", "github")
            .eq("source_ref", str(gi["number"]))
        )
        if existing:
            continue

        # Map GitHub labels to severity
        labels = [l.get("name", "").lower() for l in gi.get("labels", [])]
        severity = "info"
        if any(l in labels for l in ("bug", "critical", "urgent", "p0")):
            severity = "critical"
        elif any(l in labels for l in ("warning", "p1", "important")):
            severity = "warning"

        supabase.table("issues").insert({
            "project_id": project_id,
            "user_id": user_id,
            "title": gi.get("title", "Untitled")[:200],
            "description": (gi.get("body") or "")[:1000],
            "severity": severity,
            "category": "error" if "bug" in labels else "general",
            "status": "open",
            "source": "github",
            "source_ref": str(gi["number"]),
        }).execute()
        synced += 1

    return {"synced": synced, "total_open": len([g for g in gh_issues if "pull_request" not in g])}
