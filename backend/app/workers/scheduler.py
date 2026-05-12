"""APScheduler setup for background tasks."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.workers.tasks.sync_sns_metrics import sync_sns_metrics
from app.workers.tasks.publish_scheduled import publish_scheduled_posts
from app.workers.tasks.refresh_tokens import refresh_expiring_tokens

scheduler = AsyncIOScheduler()


def setup_scheduler():
    """Register all periodic tasks."""
    # Sync SNS metrics every 30 minutes
    scheduler.add_job(
        sync_sns_metrics,
        IntervalTrigger(minutes=30),
        id="sync_sns_metrics",
        replace_existing=True,
    )

    # Publish scheduled posts every 5 minutes
    scheduler.add_job(
        publish_scheduled_posts,
        IntervalTrigger(minutes=5),
        id="publish_scheduled",
        replace_existing=True,
    )

    # Refresh expiring tokens every hour
    scheduler.add_job(
        refresh_expiring_tokens,
        IntervalTrigger(hours=1),
        id="refresh_tokens",
        replace_existing=True,
    )

    scheduler.start()


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
