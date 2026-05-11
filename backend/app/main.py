from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.exceptions import AppError, app_error_handler

from app.api.health import router as health_router
from app.api.routes.projects import router as projects_router
from app.api.routes.events import router as events_router
from app.api.routes.issues import router as issues_router
from app.api.routes.promotion import router as promotion_router
from app.api.routes.insights import router as insights_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown (cleanup resources here later)


app = FastAPI(title="Indie Product Hub API", lifespan=lifespan)

app.add_exception_handler(AppError, app_error_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(promotion_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
