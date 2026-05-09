from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    prd: str | None = None
    github_repo_url: str | None = None
    sns_channels: list[str] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    prd: str | None = None
    github_repo_url: str | None = None
    sns_channels: list[str] | None = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None
    prd: str | None
    github_repo_url: str | None
    sns_channels: list[str]
    status: str
    created_at: datetime
    updated_at: datetime
