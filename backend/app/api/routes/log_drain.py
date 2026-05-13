"""Vercel Log Drain receiver -- real-time runtime log analysis.

Vercel pushes runtime logs (function invocations, edge errors, etc.)
to this endpoint. We detect error patterns and trigger AI analysis.

Setup: Vercel Dashboard > Project > Settings > Log Drains > Add
URL: https://your-backend/api/log-drain/vercel
Format: JSON
"""

from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request, HTTPException

from app.core.supabase import supabase
from app.services.deep_analysis import deep_analyze_error

router = APIRouter(prefix="/log-drain", tags=["log-drain"])

# In-memory error buffer to batch errors before analysis
# Key: project_id, Value: list of error lines
_error_buffer: dict[str, list[dict]] = {}
_last_analysis: dict[str, datetime] = {}

# Minimum interval between AI analyses per project (prevent spam)
ANALYSIS_COOLDOWN = timedelta(minutes=5)

ERROR_PATTERNS = [
    "error", "Error", "ERROR",
    "FATAL", "fatal",
    "unhandledRejection", "UnhandledPromiseRejection",
    "TypeError", "ReferenceError", "SyntaxError",
    "ECONNREFUSED", "ETIMEOUT", "ENOTFOUND",
    "500", "502", "503",
    "OOM", "out of memory",
    "SIGKILL", "SIGTERM",
    "crash", "Crash",
]


def _is_error_log(text: str) -> bool:
    return any(pattern in text for pattern in ERROR_PATTERNS)


@router.post("/vercel")
async def vercel_log_drain(request: Request):
    """Receive Vercel runtime logs in real-time.

    Vercel sends logs as NDJSON (newline-delimited JSON).
    Each line: {"id", "message", "timestamp", "source", "projectId", "deploymentId", ...}
    """
    try:
        body = await request.body()
        lines = body.decode("utf-8").strip().split("\n")
    except Exception:
        raise HTTPException(400, "Invalid log data")

    import json

    for line in lines:
        try:
            log = json.loads(line)
        except json.JSONDecodeError:
            continue

        message = log.get("message", "")
        vercel_project_id = log.get("projectId", "")
        source = log.get("source", "")  # "lambda", "edge", "static", "build"

        if not message or not vercel_project_id:
            continue

        # Only process runtime errors (not build -- those are handled by deploy analysis)
        if source == "build":
            continue

        if not _is_error_log(message):
            continue

        # Find our project
        project = (
            supabase.table("projects")
            .select("id, user_id, name")
            .eq("deploy_project_id", vercel_project_id)
            .maybe_single()
            .execute()
        )
        if not project.data:
            continue

        pid = project.data["id"]
        uid = project.data["user_id"]

        # Buffer errors
        if pid not in _error_buffer:
            _error_buffer[pid] = []
        _error_buffer[pid].append({
            "message": message[:500],
            "source": source,
            "timestamp": log.get("timestamp"),
            "path": log.get("path", ""),
            "statusCode": log.get("statusCode"),
        })

        # Check cooldown -- don't analyze too frequently
        last = _last_analysis.get(pid)
        if last and datetime.now(timezone.utc) - last < ANALYSIS_COOLDOWN:
            continue

        # If we have enough errors buffered (3+), trigger analysis
        if len(_error_buffer[pid]) >= 3:
            errors = _error_buffer.pop(pid)
            _last_analysis[pid] = datetime.now(timezone.utc)

            # Run analysis in background (don't block the log drain)
            import asyncio
            asyncio.create_task(_analyze_runtime_errors(pid, uid, project.data["name"], errors))

    return {"ok": True}


async def _analyze_runtime_errors(project_id: str, user_id: str, project_name: str, errors: list[dict]):
    """Deep AI analysis: error -> source code -> commit diff -> root cause + fix."""
    try:
        analysis = await deep_analyze_error(project_id, user_id, project_name, errors)

        severity_map = {"critical": "critical", "warning": "warning", "info": "info"}
        severity = severity_map.get(analysis.get("severity", "warning"), "warning")

        # Build rich alert message
        root_cause = analysis.get("root_cause", "Unknown")
        fix_info = analysis.get("fix", {})
        fix_desc = fix_info.get("description", "") if isinstance(fix_info, dict) else str(fix_info)
        if isinstance(fix_info, dict) and fix_info.get("before"):
            fix_desc = f"In {fix_info.get('file', '?')} line {fix_info.get('line', '?')}:\n" \
                       f"  Before: {fix_info['before'][:100]}\n" \
                       f"  After: {fix_info.get('after', '?')[:100]}"

        user_impact = analysis.get("user_impact", "Check logs")
        files_checked = analysis.get("files_analyzed", [])
        commits_checked = analysis.get("commits_checked", [])
        introduced = analysis.get("introduced_by")

        message_parts = [f"Root cause: {root_cause[:200]}"]
        if introduced and isinstance(introduced, dict) and introduced.get("commit"):
            message_parts.append(f"Introduced in commit {introduced['commit']}: {introduced.get('description', '')[:100]}")
        message_parts.append(f"Fix: {fix_desc[:200]}")
        message_parts.append(f"User impact: {user_impact[:100]}")
        if files_checked:
            message_parts.append(f"Files analyzed: {', '.join(files_checked[:3])}")

        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "error_rate_high",
            "severity": severity,
            "title": analysis.get("error_trace", "Runtime errors detected")[:200],
            "message": "\n".join(message_parts)[:1000],
            "action_url": f"/projects/{project_id}/issues",
        }).execute()

        # Auto-create issue with full analysis
        error_text = "\n".join(e["message"][:200] for e in errors[:5])
        issue_desc = f"**Error trace:** {analysis.get('error_trace', 'Unknown')[:300]}\n\n" \
                     f"**Root cause:** {root_cause[:300]}\n\n"
        if isinstance(fix_info, dict) and fix_info.get("file"):
            issue_desc += f"**Fix:** `{fix_info['file']}` line {fix_info.get('line', '?')}\n" \
                          f"```diff\n- {fix_info.get('before', '')[:200]}\n+ {fix_info.get('after', '')[:200]}\n```\n\n"
        else:
            issue_desc += f"**Fix:** {fix_desc[:300]}\n\n"
        if introduced and isinstance(introduced, dict) and introduced.get("commit"):
            issue_desc += f"**Introduced by:** commit `{introduced['commit']}` -- {introduced.get('description', '')[:200]}\n\n"
        issue_desc += f"**User impact:** {user_impact[:200]}\n\n" \
                      f"**Error log:**\n```\n{error_text[:500]}\n```"

        supabase.table("issues").insert({
            "project_id": project_id,
            "user_id": user_id,
            "title": f"Runtime: {analysis.get('error_trace', 'Error detected')[:80]}",
            "description": issue_desc[:2000],
            "severity": "critical" if severity == "critical" else "warning",
            "category": "error",
            "status": "open",
            "source": "vercel",
        }).execute()

    except Exception:
        # Fallback
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "error_rate_high",
            "severity": "warning",
            "title": f"{len(errors)} runtime errors detected",
            "message": errors[0]["message"][:300] if errors else "Check Vercel logs",
            "action_url": f"/projects/{project_id}/issues",
        }).execute()
