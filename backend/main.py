import os
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from backend.config import FRONTEND_DIR

app = FastAPI(
    title="MeasurementPilot API",
    version="1.0.0",
    description="MeasurementPilot Backend API for PCB probe visualization and measurement tracking"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    # Strip conditional request headers so StaticFiles never returns 304
    if request.url.path.startswith("/js/") or request.url.path.endswith(".html") or request.url.path == "/":
        request.headers.__dict__["_list"] = [
            (k, v) for k, v in request.headers.raw
            if k.lower() not in (b"if-none-match", b"if-modified-since")
        ]
    response = await call_next(request)
    if request.url.path.startswith("/js/") or request.url.path.endswith(".html") or request.url.path == "/":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        # MutableHeaders has no pop(); use del with existence check
        if "etag" in response.headers:
            del response.headers["etag"]
        if "last-modified" in response.headers:
            del response.headers["last-modified"]
    return response

# Custom exception handler for structured API errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", str(exc))
    code = getattr(exc, "code", "INTERNAL_ERROR")
    return JSONResponse(
        status_code=status_code,
        content={
            "code": code,
            "message": detail,
            "details": getattr(exc, "details", None)
        }
    )

# Routers will be registered here as they are implemented
from backend.routers import project, components, testpoints, ctps, tcd, measurement, report, settings, transform

app.include_router(project.router, prefix="/api/v1")
app.include_router(components.router, prefix="/api/v1")
app.include_router(testpoints.router, prefix="/api/v1")
app.include_router(ctps.router, prefix="/api/v1")
app.include_router(tcd.router, prefix="/api/v1")
app.include_router(measurement.router, prefix="/api/v1")
app.include_router(report.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")
app.include_router(transform.router, prefix="/api/v1")

# Serve static frontend files (must be mounted last)
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
