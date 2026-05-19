from typing import Any

from pydantic import BaseModel


class ApiResponse(BaseModel):
    success: bool
    data: Any | None = None
    error: str | None = None
    message: str | None = None


def ok(data: Any = None, message: str = "Success") -> ApiResponse:
    return ApiResponse(success=True, data=data, message=message)


def fail(error: str, message: str | None = None) -> ApiResponse:
    return ApiResponse(success=False, error=error, message=message or error)
