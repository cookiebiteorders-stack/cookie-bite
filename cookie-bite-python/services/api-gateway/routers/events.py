"""User behavior events — feeds the recommendation engine (Phase 3)."""

import json
from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import require_internal_or_user
from core.database import get_db
from core.responses import ApiResponse, ok

router = APIRouter(prefix="/events", tags=["Events"])

EventType = Literal["view", "add_to_cart", "purchase", "wishlist"]


class TrackEventBody(BaseModel):
    product_id: str = Field(min_length=1)
    event_type: EventType
    user_id: str | None = None
    session_id: str | None = Field(default=None, max_length=120)
    metadata: dict[str, Any] = Field(default_factory=dict)


@router.post("", response_model=ApiResponse)
async def track_event(
    body: TrackEventBody,
    db: AsyncSession = Depends(get_db),
    _auth: dict | None = Depends(require_internal_or_user),
):
    clerk_sub = (_auth or {}).get("sub")
    user_id = body.user_id
    if clerk_sub and not user_id:
        row = await db.execute(
            text("SELECT id FROM users WHERE clerk_user_id = :cid LIMIT 1"),
            {"cid": clerk_sub},
        )
        found = row.first()
        if found:
            user_id = str(found[0])

    await db.execute(
        text(
            """
            INSERT INTO user_events (user_id, session_id, event_type, product_id, metadata)
            VALUES (:user_id, :session_id, :event_type, :product_id::uuid, :metadata::jsonb)
            """
        ),
        {
            "user_id": user_id,
            "session_id": body.session_id,
            "event_type": body.event_type,
            "product_id": body.product_id,
            "metadata": json.dumps(body.metadata),
        },
    )
    return ok({"tracked": True})
