import json
import logging
import threading
import time
from collections import defaultdict, deque
from uuid import uuid4

import redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from .auth import router as auth_router
from .config import settings
from .db import engine
from .routes import router


class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps(
            {
                "level": record.levelname,
                "event": record.getMessage(),
                **{
                    key: getattr(record, key)
                    for key in [
                        "request_id",
                        "actor_id",
                        "resource_id",
                        "status",
                        "duration_ms",
                        "error_type",
                    ]
                    if hasattr(record, key)
                },
            }
        )


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logger = logging.getLogger("nexora")
logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.propagate = False
app = FastAPI(
    title="Nexora API",
    version="1.0.0",
    docs_url="/api/v1/docs",
    openapi_url="/api/v1/openapi.json",
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings().allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "X-Nexora-Request"],
)
limits = defaultdict(deque)
lock = threading.Lock()
redis_client = redis.Redis.from_url(settings().redis_url) if settings().redis_url else None


def limited(key, maximum):
    if redis_client:
        # Atomic increment plus expiry: no persistent keys if a process dies mid-request.
        count = redis_client.eval(
            "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],60) end; return n",
            1,
            "nexora:limit:" + key,
        )
        return count > maximum
    with lock:
        t = time.monotonic()
        if len(limits) > 10000:
            for stale in list(limits):
                if not limits[stale] or limits[stale][-1] < t - 60:
                    del limits[stale]
        q = limits[key]
        while q and q[0] < t - 60:
            q.popleft()
        q.append(t)
        return len(q) > maximum


@app.middleware("http")
async def guard(request: Request, call_next):
    request_id = str(uuid4())
    start = time.monotonic()
    response = None
    try:
        if request.method not in ("GET", "HEAD", "OPTIONS"):
            if (
                request.headers.get("origin") not in settings().allowed_origins
                or request.headers.get("x-nexora-request") != "1"
            ):
                response = JSONResponse(
                    {"detail": "Request origin could not be verified"}, status_code=403
                )
            else:
                raw = bytearray()
                async for chunk in request.stream():
                    raw.extend(chunk)
                    if len(raw) > 262144:
                        response = JSONResponse(
                            {"detail": "Request exceeds 256 KB limit"}, status_code=413
                        )
                        break
                request._body = bytes(raw)
        if response is None and request.method != "OPTIONS":
            auth_path = request.url.path.startswith("/api/v1/auth/") and request.method == "POST"
            # Only trust peer IP. Configure a trusted proxy boundary before enabling forwarded headers.
            key = (request.client.host if request.client else "unknown") + (
                ":auth" if auth_path else ":api"
            )
            if limited(key, 20 if auth_path else 240):
                response = JSONResponse(
                    {"detail": "Too many requests. Please try again in a minute."},
                    status_code=429,
                    headers={"Retry-After": "60"},
                )
        if response is None:
            response = await call_next(request)
    except redis.RedisError:
        response = JSONResponse(
            {"detail": "Security service temporarily unavailable"}, status_code=503
        )
    except Exception as exc:
        logger.error(
            "unhandled_error", extra={"request_id": request_id, "error_type": type(exc).__name__}
        )
        response = JSONResponse(
            {"detail": "An unexpected error occurred", "request_id": request_id},
            status_code=500,
        )
    response.headers.update(
        {
            "X-Request-ID": request_id,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
        }
    )
    logger.info(
        "request_completed",
        extra={
            "request_id": request_id,
            "status": response.status_code,
            "duration_ms": round((time.monotonic() - start) * 1000),
        },
    )
    return response


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(
        {"detail": "This record conflicts with an existing record. Refresh and try again."},
        status_code=409,
    )


@app.get("/api/v1/health")
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "service": "nexora", "environment": settings().app_env}


app.include_router(auth_router, prefix="/api/v1", tags=["Identity"])
app.include_router(router, prefix="/api/v1", tags=["Ecosystem"])
