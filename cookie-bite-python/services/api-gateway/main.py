from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from core.config import get_settings
from core.logger import get_logger
from routers import email_validation, events, health, import_parser, parse_pdf_alias, recommendations

logger = get_logger("api-gateway")
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Cookie Bite Python API",
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(events.router)
app.include_router(recommendations.router)
app.include_router(import_parser.router)
app.include_router(parse_pdf_alias.router)
app.include_router(email_validation.router)


@app.on_event("startup")
async def on_startup():
    logger.info("Cookie Bite API gateway started (env=%s)", settings.app_env)
    try:
        from core.database import AsyncSessionLocal
        from recommendation import engine as rec_engine

        async with AsyncSessionLocal() as session:
            await rec_engine.train_models(session)
    except Exception as exc:
        logger.info("Recommendation warm-start skipped: %s", exc)
