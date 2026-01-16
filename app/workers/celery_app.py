from __future__ import annotations

from celery import Celery

from app.core.config import get_settings


settings = get_settings()

celery_app = Celery(
    "tracking",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "send_due_checkins": {"task": "app.workers.tasks.send_due_checkins", "schedule": 60.0},
        "mark_silence_and_escalate": {
            "task": "app.workers.tasks.mark_silence_and_escalate",
            "schedule": 300.0,
        },
    },
)
