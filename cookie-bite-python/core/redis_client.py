from functools import lru_cache

import redis.asyncio as redis

from core.config import get_settings


@lru_cache
def get_redis_pool() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )


async def ping_redis() -> bool:
    try:
        client = get_redis_pool()
        return (await client.ping()) is True
    except Exception:
        return False


async def cache_get(key: str) -> str | None:
    try:
        return await get_redis_pool().get(key)
    except Exception:
        return None


async def cache_setex(key: str, ttl: int, value: str) -> None:
    try:
        await get_redis_pool().setex(key, ttl, value)
    except Exception:
        pass
