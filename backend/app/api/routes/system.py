"""System monitoring overview API routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.models.system import SystemOverviewResponse
from app.services.system_overview import get_system_overview

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/overview", response_model=SystemOverviewResponse)
def get_overview() -> SystemOverviewResponse:
    """Return the aggregated system overview."""
    return get_system_overview()
