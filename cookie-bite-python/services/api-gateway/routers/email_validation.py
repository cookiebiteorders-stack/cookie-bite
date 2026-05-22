"""Email validation, DNS checks, and deliverability helpers."""

from __future__ import annotations

import re
from typing import Any

from fastapi import APIRouter, Query
from pydantic import BaseModel, EmailStr

router = APIRouter(prefix="/email", tags=["email"])


class ValidateEmailBody(BaseModel):
    email: EmailStr


class ValidateEmailResponse(BaseModel):
    ok: bool
    email: str
    domain: str
    mx_found: bool
    mx_hosts: list[str]
    format_valid: bool
    disposable_hint: bool
    spam_score_hint: float
    suggestions: list[str]


def _mx_lookup(domain: str) -> tuple[bool, list[str]]:
    try:
        import dns.resolver

        answers = dns.resolver.resolve(domain, "MX")
        hosts = sorted({str(r.exchange).rstrip(".") for r in answers})
        return True, hosts[:5]
    except Exception:
        return False, []


def _txt_records(name: str) -> list[str]:
    try:
        import dns.resolver

        return [str(r).strip('"') for r in dns.resolver.resolve(name, "TXT")]
    except Exception:
        return []


@router.post("/validate", response_model=ValidateEmailResponse)
async def validate_email(body: ValidateEmailBody) -> ValidateEmailResponse:
    email = str(body.email).lower().strip()
    domain = email.split("@")[-1] if "@" in email else ""
    format_valid = bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))
    mx_found, mx_hosts = _mx_lookup(domain) if domain else (False, [])

    disposable_domains = {"mailinator.com", "tempmail.com", "guerrillamail.com"}
    disposable_hint = domain in disposable_domains

    spam_score_hint = 0.15
    if not mx_found:
        spam_score_hint = 0.85
    elif disposable_hint:
        spam_score_hint = 0.7

    suggestions: list[str] = []
    if not format_valid:
        suggestions.append("Fix email format")
    if not mx_found:
        suggestions.append("Domain has no MX — delivery unlikely")

    return ValidateEmailResponse(
        ok=format_valid and mx_found,
        email=email,
        domain=domain,
        mx_found=mx_found,
        mx_hosts=mx_hosts,
        format_valid=format_valid,
        disposable_hint=disposable_hint,
        spam_score_hint=spam_score_hint,
        suggestions=suggestions,
    )


@router.get("/validate-dns")
async def validate_dns(domain: str = Query(..., min_length=3, max_length=253)) -> dict[str, Any]:
    domain = domain.strip().lower()
    root_txt = _txt_records(domain)
    spf_ok = any("v=spf1" in t for t in root_txt)
    dmarc_txt = _txt_records(f"_dmarc.{domain}")
    dmarc_ok = any("v=DMARC1" in t for t in dmarc_txt)

    dkim_ok = False
    for sel in ("resend", "default", "google", "k1"):
        dkim_txt = _txt_records(f"{sel}._domainkey.{domain}")
        if dkim_txt:
            dkim_ok = True
            break

    return {
        "ok": True,
        "domain": domain,
        "spf_ok": spf_ok,
        "dkim_ok": dkim_ok,
        "dmarc_ok": dmarc_ok,
        "txt_count": len(root_txt),
    }
