"""Celery app -- 영상 생성처럼 5+ 분 걸리는 작업을 main API 밖으로 위임.

기획서 §7.1 ([Queue] -> Celery 위임).

REDIS_URL(broker) 미설정이면 app 은 정의되되 실제 워커는 뜨지 않는다.
APScheduler(주기 작업)와는 별개 -- Celery 는 긴 단발 작업 전용.

워커 실행:
    celery -A app.workers.celery_app.celery_app worker --loglevel=info
"""

from celery import Celery

from app.core.config import settings

# redis 미설정 시 메모리 broker 로 fallback (정의만 되고 실행은 안 됨)
_broker = settings.redis_url or "memory://"
_backend = settings.redis_url or "cache+memory://"

celery_app = Celery(
    "launchpad",
    broker=_broker,
    backend=_backend,
    include=["app.workers.celery_tasks.video_generation"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Seoul",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=60 * 30,        # 30분 hard limit (영상 합성 여유)
    task_soft_time_limit=60 * 25,   # 25분 soft
    worker_prefetch_multiplier=1,   # 무거운 작업 -- 1개씩
    task_acks_late=True,
    broker_connection_retry_on_startup=True,
)


def redis_configured() -> bool:
    """Celery 워커를 실제로 띄울 수 있는지(broker 설정 여부)."""
    return bool(settings.redis_url)
