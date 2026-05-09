from pydantic import BaseModel
from datetime import datetime


class EventCreate(BaseModel):
    title: str
    event_type: str  # promotion, deployment, marketing, meeting, other
    date: str  # YYYY-MM-DD
    time: str | None = None
    description: str | None = None


class EventUpdate(BaseModel):
    title: str | None = None
    event_type: str | None = None
    date: str | None = None
    time: str | None = None
    description: str | None = None


class EventResponse(BaseModel):
    id: str
    project_id: str
    title: str
    event_type: str
    date: str
    time: str | None
    description: str | None
    created_at: datetime
