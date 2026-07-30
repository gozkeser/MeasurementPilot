from typing import List
from fastapi import APIRouter, HTTPException
from backend.models.ctp import CTP, CTPCreate, CTPUpdate
from backend.services.ctp_service import ctp_service
from backend.services.project_service import ProjectLoadError

router = APIRouter(tags=["CTPs"])

@router.get("/ctps", response_model=List[CTP])
async def list_ctps():
    return ctp_service.list_ctps()

@router.post("/ctps", response_model=CTP)
async def create_ctp(data: CTPCreate):
    return ctp_service.create_ctp(data)

@router.put("/ctps/{id}", response_model=CTP)
async def update_ctp(id: str, data: CTPUpdate):
    try:
        return ctp_service.update_ctp(id, data)
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/ctps/{id}")
async def delete_ctp(id: str):
    ctp_service.delete_ctp(id)
    return {"message": "CTP deleted successfully"}
