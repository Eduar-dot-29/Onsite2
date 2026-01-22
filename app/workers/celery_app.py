"""
Celery configuration for background task processing.

Tasks:
- process_due_checkins: Runs every minute to send due check-ins
- cleanup_stale_locks: Runs every 2 minutes to recover stuck check-ins
- mark_silence_and_escalate: Runs every 5 minutes to detect non-responsive drivers
"""
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
        # Clean up stale locks every 2 minutes
        "cleanup_stale_locks": {
            "task": "app.workers.tasks.cleanup_stale_locks",
            "schedule": 120.0,  # 2 minutes
        },
        # Check for silence and escalate every 5 minutes
        "mark_silence_and_escalate": {
            "task": "app.workers.tasks.mark_silence_and_escalate",
            "schedule": 300.0,  # 5 minutes
        },
        # Legacy task name (backward compatibility)
        "send_due_checkins": {
            "task": "app.workers.tasks.send_due_checkins",
            "schedule": 60.0,
        },
    },
    # Task execution settings
    task_acks_late=True,  # Acknowledge after task completes (for reliability)
    task_reject_on_worker_lost=True,  # Re-queue if worker dies
    worker_prefetch_multiplier=1,  # Process one task at a time
)
