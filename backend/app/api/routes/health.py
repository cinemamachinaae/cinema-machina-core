from fastapi import APIRouter

from app.models.system import HealthStatusResponse
from app.services.system_overview import get_health_status

router = APIRouter()


@router.get("/health", response_model=HealthStatusResponse)
def health_check() -> HealthStatusResponse:
    """Return a typed backend health response."""
    return get_health_status()
