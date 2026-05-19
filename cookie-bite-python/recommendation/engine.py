from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.logger import get_logger
from core.redis_client import get_redis_pool
from recommendation.collaborative import CollaborativeFilter
from recommendation.content_based import ContentBasedFilter

logger = get_logger("recommendation-engine")

_collab = CollaborativeFilter()
_content = ContentBasedFilter()
_last_trained: str | None = None

COLLAB_WEIGHT = 0.6
CONTENT_WEIGHT = 0.4


async def train_models(db: AsyncSession) -> dict:
    global _last_trained

    products_res = await db.execute(
        text(
            """
            SELECT id, slug, name, title_en, title_ar, category, price_egp,
                   badges, dietary, image_url, is_active
            FROM products
            WHERE is_active = true
            """
        )
    )
    products = [dict(r._mapping) for r in products_res.fetchall()]

    events_res = await db.execute(
        text(
            """
            SELECT user_id::text, product_id::text, event_type
            FROM user_events
            WHERE created_at > NOW() - INTERVAL '90 days'
            """
        )
    )
    event_rows = [
        (r[0], r[1], r[2])
        for r in events_res.fetchall()
        if r[0] and r[1]
    ]

    _content.fit(products)
    _collab.fit(event_rows)
    _last_trained = datetime.now(timezone.utc).isoformat()

    meta = {
        "trained_at": _last_trained,
        "products": len(products),
        "events": len(event_rows),
        "collaborative_ready": _collab.ready,
        "content_ready": _content.ready,
    }
    logger.info("Recommendation models trained: %s", meta)
    return meta


async def trending_product_ids(db: AsyncSession, limit: int = 10) -> list[str]:
    redis = get_redis_pool()
    cache_key = f"rec:trending:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    res = await db.execute(
        text(
            """
            SELECT product_id::text AS pid, COUNT(*) AS cnt
            FROM user_events
            WHERE event_type IN ('purchase', 'add_to_cart')
              AND created_at > NOW() - INTERVAL '14 days'
            GROUP BY product_id
            ORDER BY cnt DESC
            LIMIT :lim
            """
        ),
        {"lim": limit},
    )
    ids = [str(r[0]) for r in res.fetchall() if r[0]]
    if len(ids) < limit:
        fallback = await db.execute(
            text(
                """
                SELECT oi.product_id::text AS pid, SUM(oi.quantity) AS qty
                FROM order_items oi
                JOIN orders o ON o.id = oi.order_id
                WHERE o.created_at > NOW() - INTERVAL '30 days'
                  AND o.status NOT IN ('cancelled')
                GROUP BY oi.product_id
                ORDER BY qty DESC
                LIMIT :lim
                """
            ),
            {"lim": limit},
        )
        for row in fallback.fetchall():
            pid = str(row[0])
            if pid not in ids:
                ids.append(pid)
            if len(ids) >= limit:
                break

    if len(ids) < limit:
        fill = await db.execute(
            text(
                """
                SELECT id::text FROM products
                WHERE is_active = true
                ORDER BY updated_at DESC
                LIMIT :lim
                """
            ),
            {"lim": limit},
        )
        for row in fill.fetchall():
            pid = str(row[0])
            if pid not in ids:
                ids.append(pid)

    await redis.setex(cache_key, 1800, json.dumps(ids[:limit]))
    return ids[:limit]


def _merge_ranked(*lists: list[str], limit: int) -> list[str]:
    scores: dict[str, float] = {}
    for lst in lists:
        for rank, pid in enumerate(lst):
            scores[pid] = scores.get(pid, 0.0) + (len(lst) - rank)
    ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    out: list[str] = []
    for pid, _ in ordered:
        if pid not in out:
            out.append(pid)
        if len(out) >= limit:
            break
    return out


async def recommend_for_user(
    db: AsyncSession,
    user_id: str,
    limit: int = 10,
    lang: str = "en",
) -> list[str]:
    redis = get_redis_pool()
    cache_key = f"rec:user:{user_id}:{lang}:{limit}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    collab_ids = _collab.recommend(user_id, top_n=limit * 2) if _collab.ready else []

    # seed content from last viewed/purchased product
    seed_res = await db.execute(
        text(
            """
            SELECT product_id::text
            FROM user_events
            WHERE user_id = :uid::uuid
            ORDER BY created_at DESC
            LIMIT 1
            """
        ),
        {"uid": user_id},
    )
    seed = seed_res.scalar()
    content_ids: list[str] = []
    if seed and _content.ready:
        content_ids = _content.get_similar(str(seed), top_n=limit * 2)

    if not collab_ids and not content_ids:
        ids = await trending_product_ids(db, limit)
    else:
        weighted_collab = collab_ids if collab_ids else []
        weighted_content = content_ids if content_ids else []
        if weighted_collab and weighted_content:
            ids = _merge_ranked(weighted_collab, weighted_content, limit=limit)
        else:
            ids = _merge_ranked(weighted_collab or weighted_content, limit=limit)

    await redis.setex(cache_key, 3600, json.dumps(ids))
    return ids


async def recommend_for_cart(
    db: AsyncSession,
    product_ids: list[str],
    limit: int = 10,
) -> list[str]:
    if not product_ids:
        return await trending_product_ids(db, limit)

    pools: list[list[str]] = []
    if _content.ready:
        for pid in product_ids[:5]:
            pools.append(_content.get_similar(pid, top_n=5))

    if not pools:
        return await trending_product_ids(db, limit)

    merged = _merge_ranked(*pools, limit=limit * 2)
    exclude = set(product_ids)
    return [p for p in merged if p not in exclude][:limit]


async def enrich_products(
    db: AsyncSession,
    product_ids: list[str],
    lang: str = "en",
) -> list[dict]:
    if not product_ids:
        return []
    valid = [p for p in product_ids if len(p) == 36 and "-" in p]
    if not valid:
        return []
    placeholders = ", ".join(f":id{i}" for i in range(len(valid)))
    params = {f"id{i}": v for i, v in enumerate(valid)}
    res = await db.execute(
        text(
            f"""
            SELECT id, slug,
                   COALESCE(NULLIF(title_en, ''), name) AS title_en,
                   COALESCE(NULLIF(title_ar, ''), name) AS title_ar,
                   price_egp, image_url, category, stock
            FROM products
            WHERE id IN ({placeholders})
              AND is_active = true
            """
        ),
        params,
    )
    by_id = {str(r.id): dict(r._mapping) for r in res.fetchall()}
    out: list[dict] = []
    for pid in product_ids:
        row = by_id.get(pid)
        if not row:
            continue
        name = row["title_ar"] if lang == "ar" and row.get("title_ar") else row["title_en"]
        out.append(
            {
                "id": str(row["id"]),
                "slug": row["slug"],
                "name": name,
                "price_egp": float(row["price_egp"] or 0),
                "image_url": row.get("image_url"),
                "category": row.get("category"),
                "stock": row.get("stock"),
            }
        )
    return out


def training_status() -> dict:
    return {
        "last_trained": _last_trained,
        "collaborative_ready": _collab.ready,
        "content_ready": _content.ready,
    }
