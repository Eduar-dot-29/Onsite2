"""
Timezone utilities for proper date/time handling.

Rules:
- All dates stored in DB are UTC
- API accepts local datetime + timezone
- API returns UTC + timezone for frontend to display in local
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone as tz
from typing import Literal

import pytz


# Default timezone for operations (configurable per tenant in future)
DEFAULT_TIMEZONE = "Europe/Madrid"


def to_utc(local_datetime_str: str, timezone_str: str) -> datetime:
    """
    Convert a local datetime string to UTC.
    
    Args:
        local_datetime_str: ISO format datetime string (e.g., "2026-10-02T09:00:00")
        timezone_str: IANA timezone (e.g., "Europe/Madrid")
    
    Returns:
        datetime in UTC with tzinfo
    """
    # Parse the local datetime (naive)
    if "T" in local_datetime_str:
        local_dt = datetime.fromisoformat(local_datetime_str.replace("Z", ""))
    else:
        local_dt = datetime.fromisoformat(local_datetime_str)
    
    # If it already has timezone info, convert directly
    if local_dt.tzinfo is not None:
        return local_dt.astimezone(tz.utc)
    
    # Localize to the specified timezone
    local_tz = pytz.timezone(timezone_str)
    localized_dt = local_tz.localize(local_dt)
    
    # Convert to UTC
    return localized_dt.astimezone(tz.utc)


def utc_to_local(utc_datetime: datetime, timezone_str: str) -> datetime:
    """
    Convert a UTC datetime to local timezone.
    
    Args:
        utc_datetime: datetime in UTC
        timezone_str: IANA timezone (e.g., "Europe/Madrid")
    
    Returns:
        datetime in local timezone
    """
    if utc_datetime.tzinfo is None:
        utc_datetime = utc_datetime.replace(tzinfo=tz.utc)
    
    local_tz = pytz.timezone(timezone_str)
    return utc_datetime.astimezone(local_tz)


def calculate_eta_utc(departure_utc: datetime, duration_minutes: int) -> datetime:
    """
    Calculate ETA in UTC given departure time and duration.
    
    Args:
        departure_utc: Departure time in UTC
        duration_minutes: Estimated duration in minutes
    
    Returns:
        ETA in UTC
    """
    return departure_utc + timedelta(minutes=duration_minutes)


def now_utc() -> datetime:
    """Get current time in UTC with timezone info."""
    return datetime.now(tz.utc)


# Maximum number of check-ins per shipment to prevent spam
MAX_CHECKINS = 200


def generate_checkin_schedule(
    departure_utc: datetime,
    eta_utc: datetime,
    mode: Literal["INTERVAL", "MILESTONE"],
    interval_minutes: int | None = None,
    checkin_count: int | None = None,
    skip_first: bool = True,
) -> list[datetime]:
    """
    Generate scheduled check-in times between departure and ETA.
    
    Args:
        departure_utc: Departure time in UTC
        eta_utc: ETA in UTC
        mode: "INTERVAL" for fixed intervals, "MILESTONE" for evenly distributed
        interval_minutes: Interval in minutes (required for INTERVAL mode)
        checkin_count: Number of check-ins (required for MILESTONE mode)
        skip_first: If True, skip check-in at exact departure time
    
    Returns:
        List of scheduled check-in times in UTC (max 200)
    """
    schedule: list[datetime] = []
    current_utc = now_utc()
    
    # Total duration in minutes
    total_duration = (eta_utc - departure_utc).total_seconds() / 60
    
    if total_duration <= 0:
        return schedule
    
    if mode == "INTERVAL":
        if not interval_minutes or interval_minutes <= 0:
            raise ValueError("interval_minutes must be positive for INTERVAL mode")
        
        # Start from departure (or departure + interval if skip_first)
        if skip_first:
            current_time = departure_utc + timedelta(minutes=interval_minutes)
        else:
            current_time = departure_utc
        
        while current_time < eta_utc and len(schedule) < MAX_CHECKINS:
            # Only schedule if in the future
            if current_time > current_utc:
                schedule.append(current_time)
            current_time += timedelta(minutes=interval_minutes)
    
    elif mode == "MILESTONE":
        if not checkin_count or checkin_count <= 0:
            raise ValueError("checkin_count must be positive for MILESTONE mode")
        
        # Cap at max checkins
        actual_count = min(checkin_count, MAX_CHECKINS)
        
        # Distribute evenly between departure and ETA
        interval = total_duration / (actual_count + 1)
        
        for i in range(1, actual_count + 1):
            checkin_time = departure_utc + timedelta(minutes=interval * i)
            # Only schedule if in the future and before ETA
            if checkin_time > current_utc and checkin_time < eta_utc:
                schedule.append(checkin_time)
    
    return schedule


def is_valid_timezone(timezone_str: str) -> bool:
    """Check if a timezone string is valid."""
    try:
        pytz.timezone(timezone_str)
        return True
    except pytz.exceptions.UnknownTimeZoneError:
        return False


def format_local_time(utc_datetime: datetime, timezone_str: str, format_str: str = "%d/%m/%Y %H:%M") -> str:
    """Format a UTC datetime as a local time string."""
    local_dt = utc_to_local(utc_datetime, timezone_str)
    return local_dt.strftime(format_str)
