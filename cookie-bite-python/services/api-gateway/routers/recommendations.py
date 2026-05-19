"""Product recommendations — hybrid collaborative + content-based."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import get_current_user, require_internal
from core.database import get_db
from core.responses import ApiResponse, ok
from recommendation import engine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


async def _db_user_id_for_clerk(db: AsyncSession, clerk_sub: str | None) -> str | None:
    if not clerk_sub:
        return None
    row = await db.execute(
        text("SELECT id::text FROM users WHERE clerk_user_id = :cid LIMIT 1"),
        {"cid": clerk_sub},
    )
    return row.scalar()


@router.get("/trending", response_model=ApiResponse)
async def get_trending(
    limit: int = Query(10, ge=1, le=50),
    lang: str = Query("en", pattern="^(en|ar)$"),
    db: AsyncSession = Depends(get_db),
):
    ids = await engine.trending_product_ids(db, limit)
    products = await engine.enrich_products(db, ids, lang)
    return ok({"products": products, "product_ids": ids})


@router.get("/cart-based", response_model=ApiResponse)
async def get_cart_based(
    product_ids: list[str] = Query(..., min_length=1, max_length=20),
    limit: int = Query(10, ge=1, le=50),
    lang: str = Query("en", pattern="^(en|ar)$"),
    db: AsyncSession = Depends(get_db),
):
    ids = await engine.recommend_for_cart(db, product_ids, limit)
    products = await engine.enrich_products(db, ids, lang)
    return ok({"products": products, "product_ids": ids})


@router.get("/me", response_model=ApiResponse)
async def get_for_me(
    limit: int = Query(10, ge=1, le=50),
    lang: str = Query("en", pattern="^(en|ar)$"),
    db: AsyncSession = Depends(get_db),
    clerk_user: dict = Depends(get_current_user),
):
    db_uid = await _db_user_id_for_clerk(db, clerk_user.get("sub"))
    if not db_uid:
        ids = await engine.trending_product_ids(db, limit)
    else:
        ids = await engine.recommend_for_user(db, db_uid, limit, lang)
    products = await engine.enrich_products(db, ids, lang)
    return ok({"products": products, "product_ids": ids})


@router.get("/user/{user_id}", response_model=ApiResponse)
async def get_for_user(
    user_id: str,
    limit: int = Query(10, ge=1, le=50),
    lang: str = Query("en", pattern="^(en|ar)$"),
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_internal),
):
    ids = await engine.recommend_for_user(db, user_id, limit, lang)
    products = await engine.enrich_products(db, ids, lang)
    return ok({"products": products, "product_ids": ids})


@router.post("/retrain", response_model=ApiResponse)
async def retrain(
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_internal),
):
    meta = await engine.train_models(db)
    return ok(meta, message="Models retrained")


@router.get("/status", response_model=ApiResponse)
async def training_status():
    return ok(engine.training_status())
