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
