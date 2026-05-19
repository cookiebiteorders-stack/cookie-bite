from fastapi import APIRouter

from core.database import ping_database
from core.redis_client import ping_redis
from core.responses import ok

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health():
    return ok(
        {
            "status": "ok",
            "service": "cookie-bite-api-gateway",
        }
    )


@router.get("/ready")
async def ready():
    db_ok = await ping_database()
    redis_ok = await ping_redis()
    healthy = db_ok and redis_ok
    return ok(
        {
            "ready": healthy,
            "checks": {"database": db_ok, "redis": redis_ok},
        },
        message="Ready" if healthy else "Degraded",
    )
