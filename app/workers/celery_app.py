"""
Celery configuration for background task processing.

Tasks:
- process_due_checkins: Runs every minute to send due check-ins (v2)
- mark_silence_and_escalate: Runs every minute to detect silence (v2)
"""
from __future__ import annotations

from celery import Celery

from app.core.config import get_settings


settings = get_settings()

celery_app = Celery(
    "tracking",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    # IMPORTANT: Always use UTC for Celery
    timezone="UTC",
    enable_utc=True,
    # Beat schedule for periodic tasks
    beat_schedule={
        # Send due check-ins every minute
        "process_due_checkins": {
            "task": "app.workers.tasks.process_due_checkins",
            "schedule": 60.0,  # 1 minute
        },
        # Check for silence and escalate every minute (tolerance is configurable)
        "mark_silence_and_escalate": {
            "task": "app.workers.tasks.mark_silence_and_escalate",
            "schedule": 60.0,  # 1 minute
        },
    },
    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completes (for reliability)
    task_reject_on_worker_lost=True,  # Re-queue if worker dies
    worker_prefetch_multiplier=1,  # Process one task at a time
)
