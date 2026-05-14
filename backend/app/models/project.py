from pydantic import BaseModel
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    prd: str | None = None
    github_repo_url: str | None = None
    github_repo_owner: str | None = None
    github_repo_name: str | None = None
    deploy_platform: str | None = None
    deploy_project_id: str | None = None
    sns_channels: list[str] = []


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    prd: str | None = None
    github_repo_url: str | None = None
    github_repo_owner: str | None = None
    github_repo_name: str | None = None
    deploy_platform: str | None = None
    deploy_project_id: str | None = None
    sns_channels: list[str] | None = None


class ProjectResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: str | None
    prd: str | None
    github_repo_url: str | None
    github_repo_owner: str | None
    github_repo_name: str | None
    deploy_platform: str | None
    deploy_project_id: str | None
    sns_channels: list[str]
    status: str
    created_at: datetime
    updated_at: datetime
