"""Deployment health check worker.

5분 주기로 모든 project_deployments 를 ping 해서 status 갱신.

흐름:
1. 각 deployment 마다 direct check
   - health_check_url 있으면 그거 GET
   - 아니면 external_url + (health_endpoint or '/') GET
   - 200~399 -> healthy, 5xx -> down, 그 외 -> degraded
2. 결과를 deployment_health_history 에 누적 (SLO 계산용)
3. project_deployments.status + last_checked_at 업데이트
4. cascade-aware: upstream 이 down 이면 본 deployment 가 healthy 여도 degraded 로 effective
   -> deployment_health_history 에 cascade_from 표시
5. status 가 healthy -> down 으로 변하면 alerts 에 incident + topology_context
   (영향받는 downstream 목록)
"""

import asyncio
import logging
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.supabase import safe_maybe_single, supabase
from app.services.deployment_topology import (
    cascade_impact,
    effective_status,
    load_topology,
)

logger = logging.getLogger(__name__)

CHECK_TIMEOUT_S = 10


# ============================================================
# Direct HTTP probe
# ============================================================

async def _probe(url: str) -> tuple[str, int | None, int | None, str | None]:
    """Returns (status_label, http_status, response_time_ms, error_msg)."""
    start = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=CHECK_TIMEOUT_S, follow_redirects=True) as client:
            r = await client.get(url, headers={"User-Agent": "LaunchPad/health-ping"})
        elapsed = int((time.perf_counter() - start) * 1000)
        code = r.status_code
        if 200 <= code < 400:
            return "healthy", code, elapsed, None
        if code >= 500:
            return "down", code, elapsed, f"HTTP {code}"
        return "degraded", code, elapsed, f"HTTP {code}"
    except httpx.TimeoutException:
        return "down", None, int((time.perf_counter() - start) * 1000), "timeout"
    except Exception as e:
        return "down", None, int((time.perf_counter() - start) * 1000), str(e)[:200]


def _build_check_url(d: dict) -> str | None:
    """deployment 의 우선순위 health URL."""
    if d.get("health_check_url"):
        return d["health_check_url"]
    ext = d.get("external_url")
    if not ext:
        return None
    base = ext.rstrip("/")
    hp = (d.get("health_endpoint") or "/").lstrip("/")
    return f"{base}/{hp}" if hp else base


# ============================================================
# Per-project sweep
# ============================================================

async def check_project_deployments(project_id: str) -> dict[str, Any]:
    """Run health check on every deployment in a project + cascade-aware status update."""
    nodes, outgoing, incoming = load_topology(project_id)

    # 1) Direct probes (병렬)
    direct_results: dict[str, dict] = {}
    probe_tasks = []
    probe_ids = []
    for nid, n in nodes.items():
        url = _build_check_url(n)
        if not url:
            direct_results[nid] = {
                "status": "unknown",
                "http_status": None,
                "response_time_ms": None,
                "error": "no URL",
            }
            continue
        probe_tasks.append(_probe(url))
        probe_ids.append(nid)

    if probe_tasks:
        results = await asyncio.gather(*probe_tasks, return_exceptions=True)
        for nid, res in zip(probe_ids, results):
            if isinstance(res, Exception):
                direct_results[nid] = {
                    "status": "unknown",
                    "http_status": None,
                    "response_time_ms": None,
                    "error": str(res)[:200],
                }
            else:
                status, code, elapsed, err = res
                direct_results[nid] = {
                    "status": status,
                    "http_status": code,
                    "response_time_ms": elapsed,
                    "error": err,
                }

    # 2) Direct 결과를 nodes 에 반영 (effective_status 계산 시 참조)
    for nid, r in direct_results.items():
        nodes[nid] = {**nodes[nid], "status": r["status"]}

    # 3) Cascade-aware effective status + 누적 + 업데이트
    now_iso = datetime.now(timezone.utc).isoformat()
    state_changes: list[dict] = []
    for nid, r in direct_results.items():
        n = nodes[nid]
        previous_status = n.get("status_before") or n.get("_prev_status") or n.get("status")
        effective, cascade_from = effective_status(nid, r["status"], incoming, nodes)

        # history insert
        try:
            supabase.table("deployment_health_history").insert({
                "platform_deployment_id": nid,
                "status": effective,
                "http_status": r["http_status"],
                "response_time_ms": r["response_time_ms"],
                "error_message": r["error"],
                "cascade_from": cascade_from,
            }).execute()
        except Exception as e:
            logger.warning("history insert failed: %s", e)

        # project_deployments.status 업데이트
        try:
            supabase.table("project_deployments").update({
                "status": effective,
                "last_checked_at": now_iso,
            }).eq("id", nid).execute()
        except Exception as e:
            logger.warning("status update failed: %s", e)

        # state change 감지 (incident 생성용)
        if previous_status and previous_status != effective and effective == "down":
            state_changes.append({
                "deployment_id": nid,
                "deployment_name": n.get("name"),
                "from": previous_status,
                "to": effective,
                "error": r["error"],
            })

    # 4) state change -> alerts incident with topology context
    for change in state_changes:
        try:
            impact = cascade_impact(project_id, change["deployment_id"])
            supabase.table("alerts").insert({
                "project_id": project_id,
                "severity": "critical" if impact["affected"] else "warning",
                "category": "deployment_down",
                "title": f"{change['deployment_name']} is down",
                "description": change.get("error") or "",
                "status": "open",
                "topology_context": {
                    "deployment_id": change["deployment_id"],
                    "affected_count": len(impact["affected"]),
                    "affected": impact["affected"][:10],  # 상위 10개
                },
            }).execute()
        except Exception as e:
            logger.warning("alert insert failed: %s", e)

    return {
        "project_id": project_id,
        "checked": len(direct_results),
        "state_changes": state_changes,
    }


async def check_all_projects() -> dict[str, Any]:
    """모든 활성 project 의 deployments 체크."""
    projects = (
        supabase.table("projects")
        .select("id")
        .execute()
        .data
        or []
    )
    results = []
    for p in projects:
        try:
            res = await check_project_deployments(p["id"])
            results.append(res)
        except Exception as e:
            logger.warning("project %s health check failed: %s", p["id"], e)

    return {
        "projects_scanned": len(projects),
        "state_changes_total": sum(len(r["state_changes"]) for r in results),
    }
