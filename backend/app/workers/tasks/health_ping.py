"""Endpoint health monitor -- Log Drain alternative that works on any Vercel plan.

Every 5 minutes:
1. For each project with a deploy URL, scan GitHub for API routes (cached)
2. GET each non-dynamic route on the live deploy URL
3. Collect status code + response body + response time
4. Detect anomalies: 5xx, error JSON, slow responses, unexpected HTML
5. On anomaly -> trigger deep_analysis pipeline -> auto-create Issue

No Vercel Pro required. Uses GitHub API (free) + HTTP requests (free).
"""

import asyncio
import json
import logging
from datetime import datetime, timezone, timedelta

import httpx

from app.core.supabase import supabase, safe_maybe_single
from app.services.endpoint_scanner import scan_project_endpoints
from app.services.deep_analysis import deep_analyze_error

logger = logging.getLogger(__name__)

# Cache scanned endpoints per project (refresh daily)
_endpoint_cache: dict[str, dict] = {}
CACHE_TTL = timedelta(hours=24)

# Cooldown per project to avoid spamming analysis
_last_alert: dict[str, datetime] = {}
ALERT_COOLDOWN = timedelta(minutes=30)

# Thresholds
SLOW_RESPONSE_MS = 5000  # 5 seconds
ERROR_JSON_KEYS = {"error", "message", "detail", "statusCode", "code"}


def _analyze_response(route: str, resp: httpx.Response, elapsed_ms: int) -> dict | None:
    """Analyze a single response for anomalies. Returns error dict or None."""
    status = resp.status_code
    body = resp.text[:1000]
    content_type = resp.headers.get("content-type", "")

    # 1) Server error
    if status >= 500:
        return {
            "message": f"HTTP {status} at {route}\nResponse: {body[:500]}",
            "path": route,
            "statusCode": status,
            "response_time_ms": elapsed_ms,
            "source": "health_monitor",
            "anomaly": "server_error",
        }

    # 2) Slow response
    if elapsed_ms > SLOW_RESPONSE_MS:
        return {
            "message": f"Slow response at {route}: {elapsed_ms}ms (threshold: {SLOW_RESPONSE_MS}ms)\nStatus: {status}",
            "path": route,
            "statusCode": status,
            "response_time_ms": elapsed_ms,
            "source": "health_monitor",
            "anomaly": "slow_response",
        }

    # 3) Error in JSON body (e.g. {"error": "...", "statusCode": 500})
    if "application/json" in content_type:
        try:
            data = resp.json()
            if isinstance(data, dict):
                # Check for error indicators in response body
                has_error_key = bool(ERROR_JSON_KEYS & set(data.keys()))
                error_value = data.get("error") or data.get("detail")
                if has_error_key and error_value and status < 500:
                    return {
                        "message": f"Error response at {route} (HTTP {status})\nBody: {json.dumps(data, ensure_ascii=False)[:500]}",
                        "path": route,
                        "statusCode": status,
                        "response_time_ms": elapsed_ms,
                        "source": "health_monitor",
                        "anomaly": "error_in_body",
                    }
        except (json.JSONDecodeError, ValueError):
            pass

    # 4) API route returning HTML (likely Next.js error page instead of JSON)
    if route.startswith("/api/") and "text/html" in content_type and status != 405:
        return {
            "message": f"API route {route} returned HTML instead of JSON (HTTP {status})\nThis usually means an unhandled error showing the Next.js error page.\nBody preview: {body[:300]}",
            "path": route,
            "statusCode": status,
            "response_time_ms": elapsed_ms,
            "source": "health_monitor",
            "anomaly": "unexpected_html",
        }

    return None


async def health_ping_all_projects():
    """Monitor all projects with deploy URLs. Runs every 5 minutes."""
    projects = (
        supabase.table("projects")
        .select("id, user_id, name, deploy_platform, deploy_url")
        .not_.is_("deploy_url", "null")
        .execute()
    )

    tasks = []
    for project in projects.data or []:
        deploy_url = project.get("deploy_url", "").rstrip("/")
        if not deploy_url or not deploy_url.startswith("http"):
            continue
        tasks.append(_monitor_project(project, deploy_url))

    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


async def _monitor_project(project: dict, deploy_url: str):
    """Monitor a single project's endpoints with response analysis."""
    project_id = project["id"]

    # Get cached or scan endpoints
    endpoints = await _get_endpoints(project_id)

    # Build route list: root + all non-dynamic API routes
    routes_to_check = ["/"]
    for ep in endpoints:
        if not ep.get("has_dynamic"):
            routes_to_check.append(ep["route"])
    routes_to_check = list(dict.fromkeys(routes_to_check))

    # Collect all results
    anomalies = []
    results = []

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        for route in routes_to_check:
            url = f"{deploy_url}{route}"
            try:
                start = datetime.now(timezone.utc)
                resp = await client.get(url)
                elapsed_ms = int((datetime.now(timezone.utc) - start).total_seconds() * 1000)

                result = {
                    "route": route,
                    "status": resp.status_code,
                    "response_time_ms": elapsed_ms,
                    "content_type": resp.headers.get("content-type", ""),
                    "body_preview": resp.text[:200],
                }
                results.append(result)

                # Analyze response
                anomaly = _analyze_response(route, resp, elapsed_ms)
                if anomaly:
                    anomalies.append(anomaly)

            except httpx.TimeoutException:
                anomalies.append({
                    "message": f"Timeout at {route} (>15s) -- endpoint not responding",
                    "path": route,
                    "statusCode": 0,
                    "response_time_ms": 15000,
                    "source": "health_monitor",
                    "anomaly": "timeout",
                })
            except Exception as e:
                anomalies.append({
                    "message": f"Connection failed at {route}: {str(e)[:200]}",
                    "path": route,
                    "statusCode": 0,
                    "response_time_ms": 0,
                    "source": "health_monitor",
                    "anomaly": "connection_error",
                })

    # Save health check results to knowledge base
    if results:
        summary_lines = []
        for r in results:
            status_icon = "OK" if r["status"] < 400 else f"ERR {r['status']}"
            summary_lines.append(
                f"- {r['route']} [{status_icon}] {r['response_time_ms']}ms"
            )
        supabase.table("project_knowledge").upsert({
            "project_id": project_id,
            "category": "health_check_latest",
            "content": f"Last check: {datetime.now(timezone.utc).isoformat()}\n"
                       f"Endpoints checked: {len(results)}\n"
                       f"Anomalies: {len(anomalies)}\n\n"
                       + "\n".join(summary_lines),
        }, on_conflict="project_id,category").execute()

    if not anomalies:
        return

    # Check cooldown
    last = _last_alert.get(project_id)
    now = datetime.now(timezone.utc)
    if last and now - last < ALERT_COOLDOWN:
        return

    _last_alert[project_id] = now

    # Trigger deep analysis with rich context
    try:
        analysis = await deep_analyze_error(
            project_id,
            project["user_id"],
            project["name"],
            anomalies,
        )

        severity = analysis.get("severity", "warning")
        root_cause = analysis.get("root_cause", "Unknown")
        fix_info = analysis.get("fix", {})
        user_impact = analysis.get("user_impact", "Service may be degraded")

        # Build alert
        affected = ", ".join(a["path"] for a in anomalies[:3])
        anomaly_types = set(a.get("anomaly", "error") for a in anomalies)
        type_label = " + ".join(sorted(anomaly_types))

        message_parts = [
            f"Detected: {type_label}",
            f"Affected: {affected}",
            f"Root cause: {root_cause[:200]}",
        ]
        if isinstance(fix_info, dict) and fix_info.get("file"):
            message_parts.append(f"Fix: {fix_info['file']} line {fix_info.get('line', '?')}")
        message_parts.append(f"User impact: {user_impact[:100]}")

        supabase.table("alerts").insert({
            "user_id": project["user_id"],
            "project_id": project_id,
            "alert_type": "error_rate_high",
            "severity": severity,
            "title": f"[{type_label}] {affected[:60]}",
            "message": "\n".join(message_parts)[:1000],
            "action_url": f"/projects/{project_id}/issues",
        }).execute()

        # Create issue with full analysis
        error_text = "\n".join(
            f"{a['path']} -> [{a.get('anomaly', '?')}] {a['message'][:150]}"
            for a in anomalies[:5]
        )
        fix_desc = ""
        if isinstance(fix_info, dict) and fix_info.get("before"):
            fix_desc = (
                f"**Fix:** `{fix_info.get('file', '?')}` line {fix_info.get('line', '?')}\n"
                f"```diff\n- {fix_info.get('before', '')[:200]}\n+ {fix_info.get('after', '')[:200]}\n```\n\n"
            )

        introduced = analysis.get("introduced_by")
        introduced_text = ""
        if introduced and isinstance(introduced, dict) and introduced.get("commit"):
            introduced_text = f"**Introduced by:** commit `{introduced['commit']}` -- {introduced.get('description', '')[:200]}\n\n"

        issue_desc = (
            f"**Type:** {type_label}\n\n"
            f"**Root cause:** {root_cause[:300]}\n\n"
            f"{fix_desc}"
            f"{introduced_text}"
            f"**User impact:** {user_impact[:200]}\n\n"
            f"**Anomalies detected:**\n```\n{error_text[:500]}\n```\n\n"
            f"*Detected by LaunchPad endpoint monitor*"
        )

        supabase.table("issues").insert({
            "project_id": project_id,
            "user_id": project["user_id"],
            "title": f"[{type_label}] {anomalies[0]['path']} ({anomalies[0].get('statusCode', '?')})",
            "description": issue_desc[:2000],
            "severity": "critical" if any(a.get("statusCode", 0) >= 500 or a.get("anomaly") == "timeout" for a in anomalies) else "warning",
            "category": "error",
            "status": "open",
            "source": "health_monitor",
        }).execute()

    except Exception:
        affected = ", ".join(a["path"] for a in anomalies[:3])
        supabase.table("alerts").insert({
            "user_id": project["user_id"],
            "project_id": project_id,
            "alert_type": "error_rate_high",
            "severity": "warning",
            "title": f"Endpoint issues: {affected[:80]}",
            "message": anomalies[0]["message"][:300],
        }).execute()


async def _get_endpoints(project_id: str) -> list[dict]:
    """Get endpoints from cache or scan GitHub."""
    now = datetime.now(timezone.utc)

    cached = _endpoint_cache.get(project_id)
    if cached and now - cached["scanned_at"] < CACHE_TTL:
        return cached["endpoints"]

    # Try to load from project_knowledge first (persisted cache)
    kb = safe_maybe_single(
        supabase.table("project_knowledge")
        .select("content")
        .eq("project_id", project_id)
        .eq("category", "api_endpoints")
    )

    endpoints = []
    if kb and kb.get("content"):
        import re
        for line in kb["content"].split("\n"):
            m = re.match(r"^- (/api/\S+)\s+\((.+?)\)$", line)
            if m:
                route, file_path = m.group(1), m.group(2)
                endpoints.append({
                    "route": route,
                    "file": file_path,
                    "has_dynamic": "[" in route,
                })

    if not endpoints:
        endpoints = await scan_project_endpoints(project_id)

    _endpoint_cache[project_id] = {"endpoints": endpoints, "scanned_at": now}
    return endpoints
