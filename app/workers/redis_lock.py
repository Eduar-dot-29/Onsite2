from __future__ import annotations

import os
from dataclasses import dataclass
from uuid import uuid4

import redis

from app.core.config import get_settings


@dataclass(frozen=True)
class RedisLock:
    key: str
    token: str


_client: redis.Redis | None = None


def get_redis_client() -> redis.Redis:
    global _client
    if _client is None:
        settings = get_settings()
        _client = redis.Redis.from_url(settings.redis_url)
    return _client


def acquire_lock(key: str, ttl_seconds: int) -> RedisLock | None:
    """
    Acquire a simple atomic lock using SET NX EX.
    Returns a lock token if acquired, otherwise None.
    """
    client = get_redis_client()
    token = f"{os.getpid()}:{uuid4()}"
    ok = client.set(name=key, value=token, nx=True, ex=ttl_seconds)
    if not ok:
        return None
    return RedisLock(key=key, token=token)


_RELEASE_LUA = """
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
"""


def release_lock(lock: RedisLock) -> bool:
    client = get_redis_client()
    try:
        result = client.eval(_RELEASE_LUA, 1, lock.key, lock.token)
        return bool(result)
    except Exception:
        return False

