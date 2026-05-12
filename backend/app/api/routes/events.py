import calendar as cal

from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.project_access import verify_project_access
from app.core.exceptions import NotFoundError, ValidationError
from app.core.supabase import supabase
from app.models.event import EventCreate, EventUpdate

router = APIRouter(prefix="/projects/{project_id}/events", tags=["events"])


@router.get("")
async def list_events(
    project_id: str,
    month: str | None = None,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    query = (
        supabase.table("events")
        .select("*")
        .eq("project_id", project_id)
        .order("date")
        .order("time")
    )
    if month:
        # month = "YYYY-MM" -> 해당 월의 정확한 마지막 날짜 계산
        try:
            year, m = int(month[:4]), int(month[5:7])
            last_day = cal.monthrange(year, m)[1]
            query = query.gte("date", f"{month}-01").lte("date", f"{month}-{last_day:02d}")
        except (ValueError, IndexError):
            raise ValidationError(f"Invalid month format: {month}. Use YYYY-MM.")

    result = query.execute()
    return result.data


@router.post("", status_code=201)
async def create_event(
    project_id: str,
    body: EventCreate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    data = {
        "project_id": project_id,
        "user_id": user["id"],
        "title": body.title,
        "event_type": body.event_type,
        "date": body.date,
        "time": body.time,
        "description": body.description,
    }
    result = supabase.table("events").insert(data).execute()
    return result.data[0]


@router.patch("/{event_id}")
async def update_event(
    project_id: str,
    event_id: str,
    body: EventUpdate,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise ValidationError("No fields to update")

    result = (
        supabase.table("events")
        .update(updates)
        .eq("id", event_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError("Event", event_id)
    return result.data[0]


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    project_id: str,
    event_id: str,
    user: dict = Depends(get_current_user),
    _project: dict = Depends(verify_project_access),
):
    result = (
        supabase.table("events")
        .delete()
        .eq("id", event_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise NotFoundError("Event", event_id)
