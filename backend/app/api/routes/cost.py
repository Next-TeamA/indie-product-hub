"""Cost ledger read API for the cost dashboard."""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.supabase import supabase

router = APIRouter(prefix="/projects/{project_id}", tags=["cost"])


@router.get("/cost-ledger")
async def get_cost_ledger(
    project_id: str,
    days: int = 30,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    """Cost dashboard data.

    Returns total + by_service breakdown + per-day series + raw recent rows.
    `days` defaults to 30 (covers monthly budget check).
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    rows = (
        supabase.table("cost_ledger")
        .select(
            "id, service, operation, cost_usd, tokens_used, units_used, "
            "related_video_id, related_draft_id, occurred_at"
        )
        .eq("project_id", project_id)
        .gte("occurred_at", since)
        .order("occurred_at", desc=True)
        .execute()
        .data
    )

    total = 0.0
    by_service: dict[str, float] = defaultdict(float)
    by_day: dict[str, float] = defaultdict(float)
    for r in rows:
        c = float(r["cost_usd"])
        total += c
        by_service[r["service"]] += c
        day = r["occurred_at"][:10]
        by_day[day] += c

    return {
        "window_days": days,
        "total_usd": round(total, 4),
        "by_service": [
            {"service": s, "cost_usd": round(c, 4)}
            for s, c in sorted(by_service.items(), key=lambda kv: -kv[1])
        ],
        "by_day": [
            {"date": d, "cost_usd": round(c, 4)}
            for d, c in sorted(by_day.items())
        ],
        "recent": rows[:50],
    }
