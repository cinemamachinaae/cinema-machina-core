from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.health import router as health_router
from app.api.routes.playback import router as playback_router

LOCAL_DASHBOARD_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app = FastAPI(
    title="Cinema Machina Core",
    version="0.1.0",
    description="Local-first playback-chain monitoring and diagnostics platform.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=LOCAL_DASHBOARD_ORIGINS,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(playback_router)
