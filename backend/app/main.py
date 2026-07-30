import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, StreamingResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.core.logger import APILogger

logger = logging.getLogger("uvicorn.error")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for database connection pool cleanup on shutdown."""
    yield
    # Clean up DB connection pool on shutdown
    await engine.dispose()


# ─── Rich API Logging Middleware ─────────────────────────────────────────────


class RichLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs every API request/response with rich formatting."""

    # Content types that are safe to read and log
    LOGGABLE_CONTENT_TYPES = ("application/json",)

    # Skip request body logging for multipart uploads (binary files)
    SKIP_BODY_CONTENT_TYPES = ("multipart/form-data",)

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        method = request.method

        if not APILogger.should_log(path):
            return await call_next(request)

        # ── Log Request ──
        client_ip = request.client.host if request.client else "unknown"
        content_type = request.headers.get("content-type", "")

        request_body = None
        is_multipart = any(ct in content_type for ct in self.SKIP_BODY_CONTENT_TYPES)

        if not is_multipart and method in ("POST", "PUT", "PATCH"):
            try:
                raw = await request.body()
                if raw:
                    request_body = json.loads(raw)
                    # Redact sensitive fields
                    if isinstance(request_body, dict):
                        for key in ("password", "token", "refresh_token", "access_token"):
                            if key in request_body:
                                request_body[key] = "***REDACTED***"
            except (json.JSONDecodeError, UnicodeDecodeError):
                request_body = f"<binary payload, {len(raw)} bytes>" if raw else None
        elif is_multipart:
            request_body = "<multipart/form-data upload>"

        APILogger.log_request(method, path, client_ip, body=request_body)

        # ── Execute Request & Measure Time ──
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = (time.perf_counter() - start) * 1000
            APILogger.log_error(method, path, str(exc), duration_ms)
            raise

        duration_ms = (time.perf_counter() - start) * 1000

        # ── Log Response ──
        # For streaming responses (SSE), just log status without reading body
        if isinstance(response, StreamingResponse) or "text/event-stream" in response.headers.get(
            "content-type", ""
        ):
            APILogger.log_response(method, path, response.status_code, duration_ms, "<SSE stream>")
            return response

        # For JSON responses, read and log a preview of the body
        resp_content_type = response.headers.get("content-type", "")
        body_preview = None

        if any(ct in resp_content_type for ct in self.LOGGABLE_CONTENT_TYPES):
            # Read the response body and re-create the response
            body_bytes = b""
            async for chunk in response.body_iterator:
                if isinstance(chunk, str):
                    body_bytes += chunk.encode("utf-8")
                else:
                    body_bytes += chunk

            try:
                body_json = json.loads(body_bytes)
                body_preview = json.dumps(body_json, indent=2, ensure_ascii=False, default=str)
                if len(body_preview) > 600:
                    body_preview = body_preview[:600] + "\n... (truncated)"
            except (json.JSONDecodeError, UnicodeDecodeError):
                body_preview = f"<{len(body_bytes)} bytes>"

            # Re-create response with the read body
            response = Response(
                content=body_bytes,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type,
            )

        APILogger.log_response(method, path, response.status_code, duration_ms, body_preview)
        return response


# ─── App Setup ───────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS Middleware (must be added before custom middleware)
if settings.CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Rich Logging Middleware
app.add_middleware(RichLoggingMiddleware)

# Exception Handlers
register_exception_handlers(app)

# Route registration
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "docs": f"{settings.API_V1_STR}/docs" if settings.DEBUG else "Disabled",
    }
