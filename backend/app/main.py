from fastapi import FastAPI

from app.api.routes.health import router as health_router
from app.api.routes.playback import router as playback_router

app = FastAPI(
    title="Cinema Machina Core",
    version="0.1.0",
    description="Local-first playback-chain monitoring and diagnostics platform.",
)

app.include_router(health_router)
app.include_router(playback_router)
