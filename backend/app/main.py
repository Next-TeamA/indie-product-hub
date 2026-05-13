from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from slowapi.errors import RateLimitExceeded
from app.core.exceptions import AppError, app_error_handler
from app.core.rate_limit import limiter, rate_limit_handler

from app.api.health import router as health_router
from app.api.routes.projects import router as projects_router
from app.api.routes.events import router as events_router
from app.api.routes.issues import router as issues_router
from app.api.routes.promotion import router as promotion_router
from app.api.routes.insights import router as insights_router
from app.api.routes.accounts import router as accounts_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.deployments import router as deployments_router
from app.api.routes.market_insights import router as market_insights_router
from app.api.routes.webhooks import router as webhooks_router
from app.api.routes.sns_metrics import router as sns_metrics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup -- start background scheduler
    try:
        from app.workers.scheduler import setup_scheduler, shutdown_scheduler
        setup_scheduler()
    except Exception:
        pass  # Scheduler is optional (APScheduler may not be installed)
    yield
    # Shutdown
    try:
        from app.workers.scheduler import shutdown_scheduler
        shutdown_scheduler()
    except Exception:
        pass


app = FastAPI(title="LaunchPad API", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(AppError, app_error_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core
app.include_router(health_router, prefix="/api")
app.include_router(projects_router, prefix="/api")
app.include_router(events_router, prefix="/api")
app.include_router(issues_router, prefix="/api")
app.include_router(promotion_router, prefix="/api")
app.include_router(insights_router, prefix="/api")

# Phase 3+
app.include_router(accounts_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(deployments_router, prefix="/api")
app.include_router(market_insights_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(sns_metrics_router, prefix="/api")
