from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        error_code: str = "BAD_REQUEST",
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class NotFoundError(AppError):
    def __init__(self, resource: str, id: str = ""):
        detail = f"{resource} not found" if not id else f"{resource} not found: {id}"
        super().__init__(detail, 404, "NOT_FOUND")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, 403, "FORBIDDEN")


class ExternalAPIError(AppError):
    def __init__(self, service: str, detail: str):
        super().__init__(f"{service} API error: {detail}", 502, "EXTERNAL_API_ERROR")


class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, 422, "VALIDATION_ERROR")


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.error_code, "message": exc.message},
    )
