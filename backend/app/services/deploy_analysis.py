"""Deploy error analysis -- AI-powered root cause detection.

Pulls error logs from Vercel/GitHub Actions, feeds them to Gemini
to identify what went wrong, why, and how to fix it.
"""

from app.core.encryption import decrypt_token
from app.core.supabase import supabase, safe_maybe_single
from app.integrations import gemini
from app.integrations.vercel_api import vercel_client
from app.integrations.github_api import github_client

ANALYSIS_SYSTEM = """You are a senior DevOps engineer analyzing deployment failures.

Rules:
- Be specific. Quote exact error lines from the logs.
- Identify the root cause, not just the symptom.
- Provide a concrete fix (exact command, config change, or code change).
- If the error is common (dependency issue, build timeout, OOM), say so.
- If you're unsure, say so -- don't guess.
- Write in the same language as the project description.
- Never use emojis.

Output format: JSON with these fields:
{
  "error_type": "build_error|runtime_error|config_error|dependency_error|timeout|unknown",
  "summary": "One sentence: what happened",
  "root_cause": "Why it happened (2-3 sentences max)",
  "fix": "How to fix it (specific steps)",
  "severity": "critical|warning|info",
  "affected_area": "Which part of the codebase is affected"
}
"""


async def analyze_deployment_error(
    project_id: str,
    user_id: str,
    deployment_log_id: str,
) -> dict:
    """Analyze a failed deployment by pulling logs and running AI analysis.

    Supports: Vercel (build logs), GitHub Actions (full job logs).
    """
    # Get deployment log
    deploy = (
        supabase.table("deployment_logs")
        .select("*")
        .eq("id", deployment_log_id)
        .eq("project_id", project_id)
        .single()
        .execute()
    )
    if not deploy.data:
        return {"error": "Deployment not found"}

    d = deploy.data
    platform = d["platform"]
    error_logs = ""
    context = ""

    # Get project info for context
    project = supabase.table("projects").select("name, description, github_repo_owner, github_repo_name").eq("id", project_id).single().execute()
    proj = project.data or {}

    if platform == "vercel":
        # Pull build events from Vercel
        account = safe_maybe_single(
            supabase.table("connected_accounts")
            .select("access_token")
            .eq("user_id", user_id)
            .eq("provider", "vercel")
            .eq("is_active", True)
        )
        if account and d.get("deployment_id"):
            token = decrypt_token(account["access_token"])
            try:
                events = await vercel_client.get_deployment_events(token, d["deployment_id"])
                # Extract error lines from build events
                error_lines = []
                for event in events if isinstance(events, list) else []:
                    text = event.get("text", "") if isinstance(event, dict) else str(event)
                    if text:
                        error_lines.append(text)
                error_logs = "\n".join(error_lines[-50:])  # Last 50 lines
            except Exception:
                pass

        # Also use error_message from deployment object
        if d.get("error_message"):
            error_logs = f"Error: {d['error_message']}\n\n{error_logs}"

    elif platform == "github":
        # Pull GitHub Actions job logs
        account = safe_maybe_single(
            supabase.table("connected_accounts")
            .select("access_token")
            .eq("user_id", user_id)
            .eq("provider", "github")
            .eq("is_active", True)
        )
        if account and proj.get("github_repo_owner"):
            token = decrypt_token(account["access_token"])
            owner = proj["github_repo_owner"]
            repo = proj["github_repo_name"]
            try:
                # Get recent failed workflow runs
                runs_data = await github_client.get_workflow_runs(token, owner, repo, status="failure", per_page=1)
                runs = runs_data.get("workflow_runs", []) if isinstance(runs_data, dict) else []
                if runs:
                    run_id = runs[0]["id"]
                    jobs = await github_client.get_workflow_run_jobs(token, owner, repo, run_id)
                    for job in jobs:
                        if job.get("conclusion") == "failure":
                            error_logs += f"\nJob: {job.get('name', 'unknown')}\n"
                            for step in job.get("steps", []):
                                if step.get("conclusion") == "failure":
                                    error_logs += f"  Failed step: {step.get('name', 'unknown')}\n"
                            break
            except Exception:
                pass

    elif platform == "railway":
        # Railway has limited log access -- use what we have
        if d.get("error_message"):
            error_logs = d["error_message"]
        if d.get("error_logs"):
            error_logs += "\n" + d["error_logs"]

    if not error_logs:
        error_logs = f"Deployment {d['deployment_id']} failed on {platform}. Status: {d['status']}."
        if d.get("commit_sha"):
            error_logs += f" Commit: {d['commit_sha'][:7]}"

    context = f"""
Product: {proj.get('name', 'Unknown')}
Platform: {platform}
Branch: {d.get('branch', 'unknown')}
Commit: {d.get('commit_sha', 'unknown')[:7]} - {d.get('commit_message', 'N/A')[:100]}
"""

    # AI analysis
    prompt = f"""
{context}

Deployment error logs:
```
{error_logs[:3000]}
```

Analyze this deployment failure. What went wrong, why, and how to fix it.
"""

    try:
        analysis = await gemini.generate_json(
            prompt=prompt,
            system=ANALYSIS_SYSTEM,
        )

        # Save analysis to deployment log
        supabase.table("deployment_logs").update({
            "error_logs": error_logs[:2000],
        }).eq("id", deployment_log_id).execute()

        # If critical, create detailed alert
        if analysis.get("severity") == "critical":
            supabase.table("alerts").insert({
                "user_id": user_id,
                "project_id": project_id,
                "alert_type": "deploy_error",
                "severity": "critical",
                "title": analysis.get("summary", "Deploy error analyzed")[:200],
                "message": f"Root cause: {analysis.get('root_cause', 'Unknown')[:300]}\nFix: {analysis.get('fix', 'Unknown')[:200]}",
                "action_url": f"/projects/{project_id}/issues",
            }).execute()

        return analysis

    except Exception as e:
        return {
            "error_type": "unknown",
            "summary": "AI analysis failed",
            "root_cause": str(e)[:200],
            "fix": "Check deployment logs manually",
            "severity": "warning",
            "affected_area": "unknown",
        }
