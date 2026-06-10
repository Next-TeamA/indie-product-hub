"""Project's platform deployments + dependencies.

기존 \`/deployments\` 라우트(deployment_logs 조회/sync) 와 별개.
이 라우트는 project_deployments 테이블 -- 사용자가 \"이 프로젝트는 Vercel 프론트
+ Railway 백엔드로 구성됨\" 같이 명시적으로 박는 메타데이터.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import require_role, verify_project_access
from app.core.exceptions import AppError, NotFoundError, ValidationError
from app.core.supabase import safe_maybe_single, supabase
from app.services import deployment_topology

router = APIRouter(prefix="/projects/{project_id}/platform-deployments", tags=["platform-deployments"])


VALID_PLATFORMS = {
    "vercel", "railway", "cloudflare", "fly", "render",
    "aws", "gcp", "azure", "supabase", "other",
}
VALID_ROLES = {
    "frontend", "backend", "worker", "database",
    "cache", "queue", "cron", "storage", "other",
}
VALID_KINDS = {"api_call", "db", "queue", "webhook", "storage", "other"}
VALID_ENVIRONMENTS = {"production", "staging", "preview", "development", "other"}


# ============================================================
# Deployments
# ============================================================

class DeploymentInput(BaseModel):
    platform: str
    external_project_id: str
    name: str
    role: str = "other"
    environment: str = "production"
    external_service_id: str | None = None
    description: str | None = None
    external_url: str | None = None
    health_endpoint: str | None = None
    health_check_url: str | None = None
    framework: str | None = None
    region: str | None = None
    slo_target: dict | None = None


@router.get("")
async def list_deployments(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    rows = (
        supabase.table("project_deployments")
        .select("*")
        .eq("project_id", project_id)
        .order("created_at")
        .execute()
        .data
        or []
    )

    dep_ids = [r["id"] for r in rows]
    deps: list[dict] = []
    if dep_ids:
        deps = (
            supabase.table("deployment_dependencies")
            .select("*")
            .in_("source_deployment_id", dep_ids)
            .execute()
            .data
            or []
        )

    return {"deployments": rows, "dependencies": deps}


@router.post("", status_code=201)
async def create_deployment(
    project_id: str,
    body: DeploymentInput,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    if body.platform not in VALID_PLATFORMS:
        raise ValidationError(f"Invalid platform: {body.platform}")
    if body.role not in VALID_ROLES:
        raise ValidationError(f"Invalid role: {body.role}")
    if body.environment not in VALID_ENVIRONMENTS:
        raise ValidationError(f"Invalid environment: {body.environment}")

    payload = body.model_dump(exclude_none=True)
    payload["project_id"] = project_id

    try:
        result = supabase.table("project_deployments").insert(payload).execute()
    except Exception as e:
        raise AppError(f"Insert failed: {e}", 400, "BAD_REQUEST")

    return result.data[0]


@router.patch("/{deployment_id}")
async def update_deployment(
    project_id: str,
    deployment_id: str,
    body: DeploymentInput,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    if body.platform not in VALID_PLATFORMS:
        raise ValidationError(f"Invalid platform: {body.platform}")
    if body.role not in VALID_ROLES:
        raise ValidationError(f"Invalid role: {body.role}")
    if body.environment not in VALID_ENVIRONMENTS:
        raise ValidationError(f"Invalid environment: {body.environment}")

    existing = safe_maybe_single(
        supabase.table("project_deployments")
        .select("id")
        .eq("id", deployment_id)
        .eq("project_id", project_id)
    )
    if not existing:
        raise NotFoundError("Deployment", deployment_id)

    payload = body.model_dump(exclude_none=True)
    payload["updated_at"] = "now()"
    supabase.table("project_deployments").update(payload).eq("id", deployment_id).execute()
    return {"ok": True}


@router.delete("/{deployment_id}", status_code=204)
async def delete_deployment(
    project_id: str,
    deployment_id: str,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    result = (
        supabase.table("project_deployments")
        .delete()
        .eq("id", deployment_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError("Deployment", deployment_id)


# ============================================================
# Dependencies
# ============================================================

class DependencyInput(BaseModel):
    source_deployment_id: str
    target_deployment_id: str
    kind: str = "api_call"
    description: str | None = None


@router.post("/dependencies", status_code=201)
async def create_dependency(
    project_id: str,
    body: DependencyInput,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    if body.kind not in VALID_KINDS:
        raise ValidationError(f"Invalid kind: {body.kind}")
    if body.source_deployment_id == body.target_deployment_id:
        raise ValidationError("source and target must differ")

    for did in (body.source_deployment_id, body.target_deployment_id):
        row = safe_maybe_single(
            supabase.table("project_deployments")
            .select("project_id")
            .eq("id", did)
        )
        if not row or row["project_id"] != project_id:
            raise NotFoundError("Deployment", did)

    payload = body.model_dump(exclude_none=True)
    try:
        result = supabase.table("deployment_dependencies").insert(payload).execute()
    except Exception as e:
        raise AppError(f"Insert failed: {e}", 400, "BAD_REQUEST")
    return result.data[0]


@router.delete("/dependencies/{dep_id}", status_code=204)
async def delete_dependency(
    project_id: str,
    dep_id: str,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    existing = safe_maybe_single(
        supabase.table("deployment_dependencies")
        .select("source_deployment_id")
        .eq("id", dep_id)
    )
    if not existing:
        raise NotFoundError("Dependency", dep_id)
    src = safe_maybe_single(
        supabase.table("project_deployments")
        .select("project_id")
        .eq("id", existing["source_deployment_id"])
    )
    if not src or src["project_id"] != project_id:
        raise NotFoundError("Dependency", dep_id)

    supabase.table("deployment_dependencies").delete().eq("id", dep_id).execute()


# ============================================================
# Topology + cascade impact
# ============================================================

@router.get("/topology")
async def get_topology(
    project_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Graph 형태로 nodes + edges 반환. 각 node 는 cascade-aware effective status 포함."""
    return deployment_topology.topology_for_project(project_id)


@router.get("/{deployment_id}/impact-downstream")
async def get_downstream_impact(
    project_id: str,
    deployment_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """이 deployment 가 down 되면 영향받는 deployments 목록."""
    return deployment_topology.cascade_impact(project_id, deployment_id)


@router.get("/{deployment_id}/impact-upstream")
async def get_upstream(
    project_id: str,
    deployment_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """이 deployment 가 의존하는 deployments 목록."""
    return deployment_topology.upstream_dependencies(project_id, deployment_id)


# ============================================================
# Health history + SLO + manual ping
# ============================================================

@router.get("/{deployment_id}/health-history")
async def health_history(
    project_id: str,
    deployment_id: str,
    hours: int = 24,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """최근 N시간 health 기록. SLO 차트 + uptime 계산용."""
    from datetime import datetime, timedelta, timezone
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    rows = (
        supabase.table("deployment_health_history")
        .select("status, http_status, response_time_ms, error_message, cascade_from, checked_at")
        .eq("platform_deployment_id", deployment_id)
        .gte("checked_at", since)
        .order("checked_at", desc=False)
        .execute()
        .data
        or []
    )
    return {"window_hours": hours, "checks": rows}


@router.get("/{deployment_id}/slo")
async def slo_progress(
    project_id: str,
    deployment_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """SLO 진행률: 24h uptime + 위반 여부."""
    return deployment_topology.slo_progress(deployment_id)


@router.post("/{deployment_id}/ping")
async def manual_ping(
    project_id: str,
    deployment_id: str,
    user: dict = Depends(get_current_user),
    _admin: dict = Depends(require_role("admin")),
):
    """관리자가 수동으로 health check 한 번 실행."""
    from app.workers.tasks.deployment_health import check_project_deployments
    result = await check_project_deployments(project_id)
    return result
