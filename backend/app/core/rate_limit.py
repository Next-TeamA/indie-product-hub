"""Rate limiting for expensive endpoints."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse


def _key_func(request: Request) -> str:
    """Rate limit by user ID (from JWT) if available, else by IP."""
    # Try to get user_id from request state (set by auth dependency)
    if hasattr(request.state, "user_id"):
        return f"user:{request.state.user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=_key_func)


async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "error": "RATE_LIMITED",
            "message": f"Too many requests. {exc.detail}",
        },
    )
