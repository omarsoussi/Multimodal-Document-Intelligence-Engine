import logging
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.config import (
    ALLOWED_ORIGINS,
    APP_TITLE,
    APP_VERSION,
    AUTH_EXEMPT_PATHS,
    OPTIONS_METHOD,
    get_settings,
)
from app.models.schemas import ErrorResponse
from app.routers.conversations import router as conversations_router
from app.routers.documents import router as documents_router
from app.routers.query import router as query_router
from app.routers.stats import router as stats_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

app = FastAPI(title=APP_TITLE, version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def api_key_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    if request.method == OPTIONS_METHOD or request.url.path in AUTH_EXEMPT_PATHS:
        return await call_next(request)
    if request.headers.get(settings.API_KEY_HEADER) != settings.API_KEY:
        return _error_response("Unauthorized", "Invalid or missing API key.", 401)
    return await call_next(request)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Convert FastAPI HTTP exceptions into structured API error responses."""
    logger.info("HTTP error on %s: %s", request.url.path, exc.detail)
    return _error_response("Request failed", str(exc.detail), exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """Convert validation failures into structured API error responses."""
    logger.info("Validation error on %s: %s", request.url.path, exc.errors())
    return _error_response("Validation failed", str(exc.errors()), 422)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Convert unexpected server failures into structured API error responses."""
    logger.exception("Unhandled error on %s", request.url.path)
    return _error_response("Internal server error", str(exc), 500)


def _error_response(error: str, detail: str, status_code: int) -> JSONResponse:
    body = ErrorResponse(error=error, detail=detail)
    return JSONResponse(status_code=status_code, content=body.model_dump())


app.include_router(documents_router)
app.include_router(query_router)
app.include_router(conversations_router)
app.include_router(stats_router)
