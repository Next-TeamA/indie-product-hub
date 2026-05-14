"""Global events endpoint — returns events across all of a user's projects."""
import calendar as cal

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.core.exceptions import ValidationError
from app.core.supabase import supabase

router = APIRouter(prefix="/events", tags=["events"])


@router.get("")
async def list_all_events(
    month: str | None = None,
    user: dict = Depends(get_current_user),
):
    projects = supabase.table("projects").select("id").eq("user_id", user["id"]).execute()
    project_ids = [p["id"] for p in projects.data]
    if not project_ids:
        return []

    query = (
        supabase.table("events")
        .select("*, projects(name)")
        .in_("project_id", project_ids)
        .order("date")
        .order("time")
    )

    if month:
        try:
            year, m = int(month[:4]), int(month[5:7])
            last_day = cal.monthrange(year, m)[1]
            query = query.gte("date", f"{month}-01").lte("date", f"{month}-{last_day:02d}")
        except (ValueError, IndexError):
            raise ValidationError(f"Invalid month format: {month}. Use YYYY-MM.")

    result = query.execute()

    # Flatten nested projects object into project_name
    events = []
    for e in result.data:
        project = e.pop("projects", None)
        e["project_name"] = project["name"] if project else None
        events.append(e)

    return events
