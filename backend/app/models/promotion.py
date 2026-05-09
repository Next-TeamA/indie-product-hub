from pydantic import BaseModel
from datetime import datetime


class PromotionRequest(BaseModel):
    message: str
    template: str | None = None  # threads, bluesky, mastodon, blog


class PromotionMessage(BaseModel):
    id: str
    role: str  # user, assistant
    content: str
    created_at: datetime


class PromotionResponse(BaseModel):
    message: PromotionMessage
