"""Playback chain snapshot API route."""

from __future__ import annotations

from fastapi import APIRouter

from app.models.chain import ChainSnapshotResponse
from app.services.chain_snapshot import get_current_chain_snapshot

router = APIRouter(prefix="/chain", tags=["chain"])


@router.get("/current", response_model=ChainSnapshotResponse)
def get_current_chain() -> ChainSnapshotResponse:
    """Return the current unified playback chain snapshot."""
    return get_current_chain_snapshot()
