from pydantic import BaseModel
from datetime import datetime


class IssueCreate(BaseModel):
    title: str
    description: str | None = None
    severity: str = "warning"  # critical, warning, info
    category: str = "기타"  # 보안, 성능, 배포, 에러, 기타


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    category: str | None = None
    status: str | None = None  # open, investigating, resolved


class IssueResponse(BaseModel):
    id: str
    project_id: str
    title: str
    description: str | None
    severity: str
    category: str
    status: str
    created_at: datetime
    updated_at: datetime
