from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class PromotionRequest(BaseModel):
    message: str = Field(..., max_length=5000)
    template: Literal["x", "threads", "bluesky", "mastodon", "blog"] | None = None


class PromotionPostCreate(BaseModel):
    platform: Literal["x", "threads", "bluesky", "mastodon"]
    hook: str = Field("", max_length=500)
    content: str = Field(..., min_length=1, max_length=5000)
    hashtags: list[str] = Field(default_factory=list, max_length=10)
    link: str | None = Field(None, max_length=500)
    images: list[str] | None = None
    tone: Literal["friendly", "professional", "humorous", "informative"] | None = None
    content_type: Literal["launch", "update", "retrospective", "qa", "tip", "milestone"] | None = None
    scheduled_at: datetime | None = None


class PromotionInfoUpsert(BaseModel):
    service_name: str | None = Field(None, max_length=100)
    description: str | None = Field(None, max_length=1000)
    target_user: str | None = Field(None, max_length=500)
    key_values: str | None = Field(None, max_length=500)
    site_url: str | None = Field(None, max_length=500)
    default_hashtags: list[str] = Field(default_factory=list, max_length=10)
    tone_preference: Literal["friendly", "professional", "humorous", "informative"] | None = None
    logo_url: str | None = Field(None, max_length=500)


class InsightUpdate(BaseModel):
    is_read: bool | None = None
    is_dismissed: bool | None = None


class PromotionMessage(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime


class PromotionResponse(BaseModel):
    message: PromotionMessage
