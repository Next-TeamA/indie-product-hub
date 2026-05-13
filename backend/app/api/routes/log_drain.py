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
from app.integrations import gemini

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
    """AI analysis of accumulated runtime errors."""
    error_text = "\n".join(
        f"[{e.get('source','?')}] {e.get('path','')} -> {e.get('statusCode','')} {e['message']}"
        for e in errors[:20]
    )

    prompt = f"""
Product: {project_name}
Platform: Vercel (runtime)

The following runtime errors were detected in the last few minutes:
```
{error_text[:3000]}
```

{len(errors)} error(s) detected. Analyze:
1. What's happening? (pattern -- same error repeating? different errors?)
2. Root cause
3. Impact on users
4. Immediate fix

Return JSON:
{{
  "pattern": "single_error|cascading|intermittent",
  "summary": "...",
  "root_cause": "...",
  "user_impact": "high|medium|low",
  "fix": "...",
  "error_count": {len(errors)}
}}
"""

    try:
        analysis = await gemini.generate_json(
            prompt=prompt,
            system="You are a production incident responder. Be concise and actionable. Never use emojis.",
        )

        # Determine alert severity based on impact
        impact = analysis.get("user_impact", "medium")
        severity = "critical" if impact == "high" else "warning"

        # Create alert
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "error_rate_high",
            "severity": severity,
            "title": analysis.get("summary", "Runtime errors detected")[:200],
            "message": f"Pattern: {analysis.get('pattern', 'unknown')}\n"
                       f"Root cause: {analysis.get('root_cause', 'Unknown')[:200]}\n"
                       f"Fix: {analysis.get('fix', 'Check logs')[:200]}",
            "action_url": f"/projects/{project_id}/issues",
        }).execute()

        # Auto-create issue if high impact
        if impact == "high":
            supabase.table("issues").insert({
                "project_id": project_id,
                "user_id": user_id,
                "title": f"Runtime error: {analysis.get('summary', 'Error detected')[:100]}",
                "description": f"**Root cause:** {analysis.get('root_cause', 'Unknown')}\n\n"
                               f"**Fix:** {analysis.get('fix', 'Unknown')}\n\n"
                               f"**Error count:** {len(errors)}\n\n"
                               f"```\n{error_text[:500]}\n```",
                "severity": "critical",
                "category": "error",
                "status": "open",
                "source": "vercel",
            }).execute()

    except Exception:
        # Fallback: create basic alert without AI analysis
        supabase.table("alerts").insert({
            "user_id": user_id,
            "project_id": project_id,
            "alert_type": "error_rate_high",
            "severity": "warning",
            "title": f"{len(errors)} runtime errors detected",
            "message": errors[0]["message"][:300] if errors else "Check Vercel logs",
            "action_url": f"/projects/{project_id}/issues",
        }).execute()
