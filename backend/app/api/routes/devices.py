"""Device monitoring API routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.devices.android_adb.shield import ShieldAdbMonitor
from app.models.device import ShieldDeviceState

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("/shield/state", response_model=ShieldDeviceState)
def get_shield_state() -> ShieldDeviceState:
    """Return the current read-only Nvidia Shield state."""
    return ShieldAdbMonitor().get_state()
