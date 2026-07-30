from typing import Dict, Any
from fastapi import APIRouter, Body
from backend.models.settings import AppSettings
from backend.services.settings_service import settings_service

router = APIRouter(tags=["Settings"])

@router.get("/settings", response_model=AppSettings)
async def get_settings():
    return settings_service.get_settings()

@router.put("/settings", response_model=AppSettings)
async def update_settings(patch: Dict[str, Any] = Body(...)):
    return settings_service.update_settings(patch)
