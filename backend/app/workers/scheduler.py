"""APScheduler setup -- cost-optimized background tasks."""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from app.workers.tasks.smart_sync import smart_sync_metrics, daily_market_insights
from app.workers.tasks.publish_scheduled import publish_scheduled_posts
from app.workers.tasks.refresh_tokens import refresh_expiring_tokens
from app.workers.tasks.weekly_report import generate_weekly_reports
from app.workers.tasks.cleanup import cleanup_expired_oauth_states
from app.workers.tasks.sync_knowledge import sync_project_knowledge
from app.workers.tasks.agent_tasks import daily_project_health_check, daily_market_analysis

scheduler = AsyncIOScheduler()


def setup_scheduler():
    """Register all periodic tasks with cost-optimized intervals."""

    # SNS metrics: smart tiered sync (recent=30min, older=6h, ancient=daily)
    scheduler.add_job(
        smart_sync_metrics,
        IntervalTrigger(minutes=30),
        id="smart_sync_metrics",
        replace_existing=True,
    )

    # Publish scheduled posts: check every 5 minutes
    scheduler.add_job(
        publish_scheduled_posts,
        IntervalTrigger(minutes=5),
        id="publish_scheduled",
        replace_existing=True,
    )

    # Refresh expiring tokens: every hour
    scheduler.add_job(
        refresh_expiring_tokens,
        IntervalTrigger(hours=1),
        id="refresh_tokens",
        replace_existing=True,
    )

    # Market insights: once per day at 8:00 UTC
    scheduler.add_job(
        daily_market_insights,
        CronTrigger(hour=8, minute=0),
        id="daily_market_insights",
        replace_existing=True,
    )

    # Weekly report: every Monday at 9:00 UTC
    scheduler.add_job(
        generate_weekly_reports,
        CronTrigger(day_of_week="mon", hour=9, minute=0),
        id="weekly_reports",
        replace_existing=True,
    )

    # Cleanup expired OAuth states: every hour
    scheduler.add_job(
        cleanup_expired_oauth_states,
        IntervalTrigger(hours=1),
        id="cleanup_oauth_states",
        replace_existing=True,
    )

    # Knowledge base sync: every 6 hours
    scheduler.add_job(
        sync_project_knowledge,
        IntervalTrigger(hours=6),
        id="sync_knowledge",
        replace_existing=True,
    )

    # Daily agent health check: 9:00 UTC
    scheduler.add_job(
        daily_project_health_check,
        CronTrigger(hour=9, minute=30),
        id="daily_health_check",
        replace_existing=True,
    )

    # Daily agent market analysis: 10:00 UTC (uses accumulated knowledge + Threads + web search)
    scheduler.add_job(
        daily_market_analysis,
        CronTrigger(hour=10, minute=0),
        id="daily_market_analysis",
        replace_existing=True,
    )

    scheduler.start()


def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
