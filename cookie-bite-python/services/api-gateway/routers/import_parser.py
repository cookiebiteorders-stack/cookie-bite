"""PDF / table extraction for admin import-export."""

from __future__ import annotations

import io
import re
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/import", tags=["import"])


def _normalize_headers(raw: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    out: list[str] = []
    for i, h in enumerate(raw):
        base = (h or f"col_{i + 1}").strip() or f"col_{i + 1}"
        key = re.sub(r"\s+", "_", base.lower())
        if key in seen:
            seen[key] += 1
            key = f"{key}_{seen[key]}"
        else:
            seen[key] = 0
        out.append(key)
    return out


def _extract_with_pdfplumber(data: bytes) -> tuple[list[str], list[dict[str, str]]]:
    import pdfplumber

    headers: list[str] = []
    rows: list[dict[str, str]] = []

    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables() or []
            for table in tables:
                if not table or len(table) < 2:
                    continue
                hdr = [str(c or "").strip() for c in table[0]]
                if not headers:
                    headers = _normalize_headers(hdr)
                for line in table[1:]:
                    cells = [str(c or "").strip() for c in line]
                    if not any(cells):
                        continue
                    row: dict[str, str] = {}
                    for idx, key in enumerate(headers):
                        if idx < len(cells):
                            row[key] = cells[idx]
                    rows.append(row)
            if rows:
                break
            text = page.extract_text() or ""
            for line in text.splitlines():
                parts = [p.strip() for p in re.split(r"\s{2,}|\t", line) if p.strip()]
                if len(parts) < 2:
                    continue
                if not headers:
                    headers = _normalize_headers([f"col_{i+1}" for i in range(len(parts))])
                row = {headers[i]: parts[i] for i in range(min(len(headers), len(parts)))}
                rows.append(row)

    return headers, rows


@router.post("/parse-pdf")
async def parse_pdf(file: UploadFile = File(...)) -> dict[str, Any]:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Expected a PDF file")

    data = await file.read()
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 12MB)")

    try:
        headers, rows = _extract_with_pdfplumber(data)
    except ImportError as exc:
        raise HTTPException(status_code=503, detail="pdfplumber not installed") from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"PDF parse failed: {exc}") from exc

    if not rows:
        raise HTTPException(status_code=422, detail="No tabular data found in PDF")

    return {
        "ok": True,
        "headers": headers,
        "rows": rows[:500],
        "row_count": min(len(rows), 500),
    }
