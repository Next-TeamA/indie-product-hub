"""영상 생성 Celery 태스크.

기획서 §7.1 [Queue] -> Celery 위임.

sync Celery <-> async pipeline 다리: asyncio.run.
video_pipeline 은 무거운 import(cv2/open_clip 등 선택)를 끌고 올 수 있으므로
태스크 함수 안에서 lazy import 한다.
"""

import asyncio

from app.workers.celery_app import celery_app


@celery_app.task(
    name="video.generate",
    bind=True,
    max_retries=2,
    default_retry_delay=60,
)
def generate_video_task(self, video_project_id: str) -> dict:
    """video_projects row 1개를 영상으로 생성. video_pipeline.generate_video 위임."""
    from app.services import video_pipeline

    try:
        return asyncio.run(video_pipeline.generate_video(video_project_id))
    except Exception as exc:
        # 인프라성 오류(network 등)는 재시도. 횟수 초과 시 그대로 raise.
        raise self.retry(exc=exc)
