"""Deployment topology service.

multi-platform deployment + dependencies 그래프를 다루는 도메인 로직.

핵심 기능:
- 의존성 그래프 traversal (downstream / upstream)
- cascade impact: 한 deployment 가 down 되면 영향받는 deployments
- cascade-aware health: upstream 이 down 이면 downstream 도 degraded
- SLO 진행률 계산
"""

from collections import defaultdict, deque
from typing import Any

from app.core.supabase import safe_maybe_single, supabase


# ============================================================
# Graph loading
# ============================================================

def load_topology(project_id: str) -> tuple[dict[str, dict], dict[str, list[dict]], dict[str, list[dict]]]:
    """Returns (nodes_by_id, outgoing_edges, incoming_edges).

    outgoing_edges[deployment_id] = [{target_id, kind, ...}, ...]
    incoming_edges[deployment_id] = [{source_id, kind, ...}, ...]
    """
    nodes = (
        supabase.table("project_deployments")
        .select("*")
        .eq("project_id", project_id)
        .execute()
        .data
        or []
    )
    nodes_by_id = {n["id"]: n for n in nodes}

    node_ids = list(nodes_by_id.keys())
    edges: list[dict] = []
    if node_ids:
        edges = (
            supabase.table("deployment_dependencies")
            .select("*")
            .in_("source_deployment_id", node_ids)
            .execute()
            .data
            or []
        )

    outgoing: dict[str, list[dict]] = defaultdict(list)
    incoming: dict[str, list[dict]] = defaultdict(list)
    for e in edges:
        outgoing[e["source_deployment_id"]].append({
            "id": e["id"],
            "target_id": e["target_deployment_id"],
            "kind": e["kind"],
            "description": e.get("description"),
        })
        incoming[e["target_deployment_id"]].append({
            "id": e["id"],
            "source_id": e["source_deployment_id"],
            "kind": e["kind"],
            "description": e.get("description"),
        })

    return nodes_by_id, outgoing, incoming


# ============================================================
# BFS / topology traversal
# ============================================================

def downstream(deployment_id: str, outgoing: dict[str, list[dict]], max_depth: int = 10) -> list[dict]:
    """Returns deployments that directly or transitively depend on this one.

    각 결과에 depth 가 부착됨.
    """
    visited: dict[str, int] = {}
    queue: deque[tuple[str, int]] = deque([(deployment_id, 0)])
    while queue:
        nid, depth = queue.popleft()
        if depth >= max_depth:
            continue
        for edge in outgoing.get(nid, []):
            tgt = edge["target_id"]
            if tgt in visited:
                continue
            visited[tgt] = depth + 1
            queue.append((tgt, depth + 1))
    return [{"id": k, "depth": v} for k, v in visited.items()]


def upstream(deployment_id: str, incoming: dict[str, list[dict]], max_depth: int = 10) -> list[dict]:
    """Returns deployments that this one depends on (directly or transitively)."""
    visited: dict[str, int] = {}
    queue: deque[tuple[str, int]] = deque([(deployment_id, 0)])
    while queue:
        nid, depth = queue.popleft()
        if depth >= max_depth:
            continue
        for edge in incoming.get(nid, []):
            src = edge["source_id"]
            if src in visited:
                continue
            visited[src] = depth + 1
            queue.append((src, depth + 1))
    return [{"id": k, "depth": v} for k, v in visited.items()]


# ============================================================
# Cascade impact: who is affected if `deployment_id` goes down?
# ============================================================

def cascade_impact(project_id: str, deployment_id: str) -> dict[str, Any]:
    """Compute who is affected if the given deployment goes down."""
    nodes, outgoing, incoming = load_topology(project_id)
    if deployment_id not in nodes:
        return {"affected": [], "depth": 0, "root": None}

    affected_ids = downstream(deployment_id, outgoing)
    affected = []
    for entry in affected_ids:
        n = nodes.get(entry["id"])
        if not n:
            continue
        affected.append({
            "id": n["id"],
            "name": n["name"],
            "platform": n["platform"],
            "role": n["role"],
            "environment": n.get("environment", "production"),
            "depth": entry["depth"],
            "current_status": n.get("status", "unknown"),
        })

    return {
        "deployment_id": deployment_id,
        "deployment_name": nodes[deployment_id]["name"],
        "affected": sorted(affected, key=lambda x: (x["depth"], x["name"])),
        "max_depth": max((a["depth"] for a in affected), default=0),
    }


def upstream_dependencies(project_id: str, deployment_id: str) -> dict[str, Any]:
    """List deployments this deployment depends on."""
    nodes, outgoing, incoming = load_topology(project_id)
    if deployment_id not in nodes:
        return {"upstream": [], "max_depth": 0}

    ups = upstream(deployment_id, incoming)
    out = []
    for entry in ups:
        n = nodes.get(entry["id"])
        if not n:
            continue
        out.append({
            "id": n["id"],
            "name": n["name"],
            "platform": n["platform"],
            "role": n["role"],
            "environment": n.get("environment", "production"),
            "depth": entry["depth"],
            "current_status": n.get("status", "unknown"),
        })
    return {
        "deployment_id": deployment_id,
        "deployment_name": nodes[deployment_id]["name"],
        "upstream": sorted(out, key=lambda x: (x["depth"], x["name"])),
        "max_depth": max((u["depth"] for u in out), default=0),
    }


# ============================================================
# Cascade-aware effective health
# ============================================================

def effective_status(
    deployment_id: str,
    direct_status: str,
    incoming: dict[str, list[dict]],
    nodes: dict[str, dict],
) -> tuple[str, str | None]:
    """If the direct check says healthy but upstream is down, return degraded.

    Returns (effective_status, cascade_from_deployment_id_or_None).
    """
    if direct_status == "down":
        return "down", None

    # upstream 중 하나라도 down 이면 cascade degraded (이미 degraded 라면 그대로)
    visited = set()
    queue: deque[str] = deque([deployment_id])
    while queue:
        nid = queue.popleft()
        for edge in incoming.get(nid, []):
            src = edge["source_id"]
            if src in visited:
                continue
            visited.add(src)
            src_node = nodes.get(src)
            if src_node and src_node.get("status") == "down":
                if direct_status == "healthy":
                    return "degraded", src
                return direct_status, src
            queue.append(src)

    return direct_status, None


# ============================================================
# Topology output (frontend graph)
# ============================================================

def topology_for_project(project_id: str) -> dict[str, Any]:
    """Return graph payload: nodes (with status, role) + edges (with kind)."""
    nodes_by_id, outgoing, incoming = load_topology(project_id)

    nodes_out = []
    for n in nodes_by_id.values():
        # 직접 status + cascade 고려한 effective status 둘 다 반환
        direct = n.get("status", "unknown")
        effective, cascade_from = effective_status(n["id"], direct, incoming, nodes_by_id)
        nodes_out.append({
            "id": n["id"],
            "name": n["name"],
            "platform": n["platform"],
            "role": n["role"],
            "environment": n.get("environment", "production"),
            "status_direct": direct,
            "status_effective": effective,
            "cascade_from": cascade_from,
            "external_url": n.get("external_url"),
            "framework": n.get("framework"),
            "last_checked_at": n.get("last_checked_at"),
        })

    edges_out = []
    for src, edges in outgoing.items():
        for e in edges:
            edges_out.append({
                "id": e["id"],
                "source": src,
                "target": e["target_id"],
                "kind": e["kind"],
                "description": e.get("description"),
            })

    return {"nodes": nodes_out, "edges": edges_out}


# ============================================================
# SLO progress
# ============================================================

def slo_progress(deployment_id: str) -> dict[str, Any]:
    """24h uptime view 기반 SLO 진행률."""
    row = safe_maybe_single(
        supabase.table("deployment_uptime_24h")
        .select("*")
        .eq("deployment_id", deployment_id)
    )
    if not row:
        return {"has_data": False}

    deploy = safe_maybe_single(
        supabase.table("project_deployments")
        .select("slo_target, name")
        .eq("id", deployment_id)
    )
    slo = (deploy or {}).get("slo_target") or {}

    return {
        "has_data": True,
        "deployment_id": deployment_id,
        "uptime_pct_24h": row.get("uptime_pct"),
        "avg_response_ms_24h": row.get("avg_response_ms"),
        "total_checks_24h": row.get("total_checks"),
        "down_checks_24h": row.get("down_checks"),
        "degraded_checks_24h": row.get("degraded_checks"),
        "slo_target": slo,
        "uptime_violation": (
            slo.get("uptime_pct") is not None
            and row.get("uptime_pct") is not None
            and row["uptime_pct"] < slo["uptime_pct"]
        ),
        "latency_violation": (
            slo.get("latency_p95_ms") is not None
            and row.get("avg_response_ms") is not None
            and row["avg_response_ms"] > slo["latency_p95_ms"]
        ),
    }
