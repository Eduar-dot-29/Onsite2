"""
Tests for timezone utilities.

These tests verify:
1. Local to UTC conversion is correct
2. ETA calculation is correct
3. Check-in schedule generation works for both INTERVAL and MILESTONE modes
4. DST handling is correct
"""
import pytest
from datetime import datetime, timezone as tz, timedelta

from app.core.timezone import (
    to_utc,
    utc_to_local,
    calculate_eta_utc,
    generate_checkin_schedule,
    now_utc,
    is_valid_timezone,
    format_local_time,
    DEFAULT_TIMEZONE,
)


class TestToUtc:
    """Test local to UTC conversion."""

    def test_madrid_to_utc_winter(self):
        """Spain winter time: UTC+1"""
        # 02/10/2026 09:00 Madrid (winter, CET = UTC+1)
        local_str = "2026-10-02T09:00:00"
        utc_dt = to_utc(local_str, "Europe/Madrid")
        
        # Should be 08:00 UTC (1 hour behind)
        assert utc_dt.hour == 8
        assert utc_dt.tzinfo == tz.utc

    def test_madrid_to_utc_summer(self):
        """Spain summer time: UTC+2"""
        # 02/07/2026 09:00 Madrid (summer, CEST = UTC+2)
        local_str = "2026-07-02T09:00:00"
        utc_dt = to_utc(local_str, "Europe/Madrid")
        
        # Should be 07:00 UTC (2 hours behind)
        assert utc_dt.hour == 7
        assert utc_dt.tzinfo == tz.utc

    def test_mexico_to_utc(self):
        """Mexico City: UTC-6 (standard) or UTC-5 (DST)"""
        local_str = "2026-01-15T10:00:00"
        utc_dt = to_utc(local_str, "America/Mexico_City")
        
        # Mexico in January: UTC-6, so 10:00 local = 16:00 UTC
        assert utc_dt.hour == 16
        assert utc_dt.tzinfo == tz.utc


class TestUtcToLocal:
    """Test UTC to local conversion."""

    def test_utc_to_madrid_winter(self):
        """Convert UTC to Madrid winter time."""
        utc_dt = datetime(2026, 10, 2, 8, 0, 0, tzinfo=tz.utc)
        local_dt = utc_to_local(utc_dt, "Europe/Madrid")
        
        # 08:00 UTC = 09:00 Madrid (CET)
        assert local_dt.hour == 9

    def test_utc_to_madrid_summer(self):
        """Convert UTC to Madrid summer time."""
        utc_dt = datetime(2026, 7, 2, 7, 0, 0, tzinfo=tz.utc)
        local_dt = utc_to_local(utc_dt, "Europe/Madrid")
        
        # 07:00 UTC = 09:00 Madrid (CEST)
        assert local_dt.hour == 9


class TestCalculateEta:
    """Test ETA calculation."""

    def test_basic_eta_calculation(self):
        """Calculate ETA from departure and duration."""
        departure = datetime(2026, 10, 2, 9, 0, 0, tzinfo=tz.utc)
        duration_minutes = 180  # 3 hours
        
        eta = calculate_eta_utc(departure, duration_minutes)
        
        # 09:00 + 3 hours = 12:00
        assert eta.hour == 12
        assert eta.minute == 0

    def test_eta_crosses_midnight(self):
        """ETA that crosses midnight."""
        departure = datetime(2026, 10, 2, 22, 0, 0, tzinfo=tz.utc)
        duration_minutes = 240  # 4 hours
        
        eta = calculate_eta_utc(departure, duration_minutes)
        
        # 22:00 + 4 hours = 02:00 next day
        assert eta.day == 3
        assert eta.hour == 2


class TestIntegration:
    """Integration tests for the full flow."""

    def test_full_flow_madrid(self):
        """
        Given: departure_local=02/10/2026 09:00 tz=Europe/Madrid duration=180
        Assert: eta_local = 12:00 Europe/Madrid
        Assert: eta_utc correct according to date offset
        """
        # Input
        departure_local_str = "2026-10-02T09:00:00"
        tz_str = "Europe/Madrid"
        duration = 180  # 3 hours
        
        # Convert to UTC
        departure_utc = to_utc(departure_local_str, tz_str)
        
        # Calculate ETA in UTC
        eta_utc = calculate_eta_utc(departure_utc, duration)
        
        # Convert ETA back to local
        eta_local = utc_to_local(eta_utc, tz_str)
        
        # Assertions
        assert eta_local.hour == 12  # 09:00 + 3h = 12:00 local
        assert eta_local.minute == 0
        
        # In October 2026, Madrid is still on CEST (UTC+2) until last Sunday
        # Oct 2 is before DST change, so UTC+2
        # 09:00 Madrid = 07:00 UTC
        # 07:00 UTC + 3h = 10:00 UTC
        # 10:00 UTC = 12:00 Madrid
        assert departure_utc.hour == 7  # 09:00 CEST = 07:00 UTC
        assert eta_utc.hour == 10  # 07:00 + 3 = 10:00 UTC


class TestGenerateCheckinSchedule:
    """Test check-in schedule generation."""

    def test_interval_mode(self):
        """Generate check-ins at fixed intervals."""
        # Use future dates to ensure no past-time filtering
        future = now_utc() + timedelta(hours=1)
        departure = future
        eta = future + timedelta(hours=4)
        
        schedule = generate_checkin_schedule(
            departure_utc=departure,
            eta_utc=eta,
            mode="INTERVAL",
            interval_minutes=60,
            skip_first=True,
        )
        
        # 4 hours with 60-min intervals, skipping first = 3 check-ins
        # (at departure+1h, departure+2h, departure+3h)
        assert len(schedule) == 3
        
        # Verify spacing
        for i, checkin_time in enumerate(schedule):
            expected = departure + timedelta(hours=i + 1)
            assert checkin_time == expected

    def test_milestone_mode(self):
        """Generate evenly distributed check-ins."""
        future = now_utc() + timedelta(hours=1)
        departure = future
        eta = future + timedelta(hours=4)
        
        schedule = generate_checkin_schedule(
            departure_utc=departure,
            eta_utc=eta,
            mode="MILESTONE",
            checkin_count=3,
        )
        
        # 3 check-ins distributed over 4 hours
        # At: 1h, 2h, 3h (25%, 50%, 75% of journey)
        assert len(schedule) == 3

    def test_no_past_checkins(self):
        """Check-ins in the past should be filtered out."""
        past = now_utc() - timedelta(hours=2)
        future = now_utc() + timedelta(hours=2)
        
        schedule = generate_checkin_schedule(
            departure_utc=past,
            eta_utc=future,
            mode="INTERVAL",
            interval_minutes=30,
        )
        
        # All scheduled times should be in the future
        current = now_utc()
        for checkin_time in schedule:
            assert checkin_time > current


class TestDST:
    """Test Daylight Saving Time handling."""

    def test_dst_transition_spain(self):
        """
        Test around DST change in Spain.
        Last Sunday of October 2026 (25th) at 03:00 -> 02:00.
        """
        # Before DST change (CEST = UTC+2)
        before_str = "2026-10-24T12:00:00"
        before_utc = to_utc(before_str, "Europe/Madrid")
        
        # After DST change (CET = UTC+1)
        after_str = "2026-10-26T12:00:00"
        after_utc = to_utc(after_str, "Europe/Madrid")
        
        # Before: 12:00 CEST = 10:00 UTC
        # After: 12:00 CET = 11:00 UTC
        assert before_utc.hour == 10
        assert after_utc.hour == 11


class TestValidation:
    """Test timezone validation."""

    def test_valid_timezone(self):
        """Valid timezones should pass."""
        assert is_valid_timezone("Europe/Madrid") is True
        assert is_valid_timezone("America/Mexico_City") is True
        assert is_valid_timezone("UTC") is True

    def test_invalid_timezone(self):
        """Invalid timezones should fail."""
        assert is_valid_timezone("Invalid/Timezone") is False
        assert is_valid_timezone("") is False
        assert is_valid_timezone("Madrid") is False


class TestFormatLocalTime:
    """Test local time formatting."""

    def test_format_with_timezone(self):
        """Format UTC time as local."""
        utc_dt = datetime(2026, 10, 2, 10, 30, 0, tzinfo=tz.utc)
        
        # In Madrid (CEST = UTC+2), this is 12:30
        formatted = format_local_time(utc_dt, "Europe/Madrid", "%H:%M")
        
        assert formatted == "12:30"
