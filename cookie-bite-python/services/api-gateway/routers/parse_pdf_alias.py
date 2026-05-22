"""Alias POST /parse-pdf → import parser (spec compatibility)."""

from fastapi import APIRouter, File, UploadFile

from routers.import_parser import parse_pdf

router = APIRouter(tags=["import"])


@router.post("/parse-pdf")
async def parse_pdf_root(file: UploadFile = File(...)):
    return await parse_pdf(file)
