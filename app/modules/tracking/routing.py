from __future__ import annotations

from abc import ABC, abstractmethod
from math import asin, cos, radians, sin, sqrt


class RoutingResult:
    def __init__(self, distance_km: float, duration_minutes: int, provider: str):
        self.distance_km = distance_km
        self.duration_minutes = duration_minutes
        self.provider = provider


class RoutingProvider(ABC):
    @abstractmethod
    def calculate(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> RoutingResult:
        raise NotImplementedError


class StubRoutingProvider(RoutingProvider):
    def __init__(self, average_speed_kmh: float = 60.0):
        self.average_speed_kmh = average_speed_kmh

    def calculate(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> RoutingResult:
        distance_km = _haversine_km(origin_lat, origin_lon, dest_lat, dest_lon)
        duration_hours = distance_km / self.average_speed_kmh if self.average_speed_kmh else 0
        duration_minutes = int(round(duration_hours * 60))
        return RoutingResult(distance_km=distance_km, duration_minutes=duration_minutes, provider="stub")


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * asin(sqrt(a))
    return radius_km * c
