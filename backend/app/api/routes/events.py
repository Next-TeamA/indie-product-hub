from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import get_current_user
from app.core.supabase import supabase
from app.models.event import EventCreate, EventUpdate

router = APIRouter(prefix="/projects/{project_id}/events", tags=["events"])


@router.get("")
async def list_events(
    project_id: str, month: str | None = None, user: dict = Depends(get_current_user)
):
    """이벤트 목록 조회. month=YYYY-MM 으로 필터 가능."""
    query = (
        supabase.table("events")
        .select("*")
        .eq("project_id", project_id)
        .order("date")
        .order("time")
    )
    if month:
        query = query.gte("date", f"{month}-01").lte("date", f"{month}-31")

    result = query.execute()
    return result.data


@router.post("", status_code=201)
async def create_event(
    project_id: str, body: EventCreate, user: dict = Depends(get_current_user)
):
    data = {
        "project_id": project_id,
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
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("events")
        .update(updates)
        .eq("id", event_id)
        .eq("project_id", project_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Event not found")
    return result.data[0]


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    project_id: str, event_id: str, user: dict = Depends(get_current_user)
):
    supabase.table("events").delete().eq("id", event_id).eq(
        "project_id", project_id
    ).execute()
