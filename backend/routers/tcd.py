from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from backend.models.tcd import TCD, TestCase
from backend.services.tcd_service import tcd_service
from backend.services.project_service import ProjectLoadError

router = APIRouter(tags=["TCD"])

@router.get("/tcd", response_model=TCD)
async def get_tcd():
    return tcd_service.get_tcd()

@router.get("/tcd/resolved")
async def get_resolved_tcd(layer: Optional[str] = Query(None)):
    return tcd_service.get_resolved_tcd(layer)

@router.post("/tcd/cases", response_model=TestCase)
async def add_test_case(tc: TestCase):
    return tcd_service.add_test_case(tc)

@router.put("/tcd/cases/{id}", response_model=TestCase)
async def update_test_case(id: str, tc: TestCase):
    try:
        return tcd_service.update_test_case(id, tc)
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/tcd/cases/{id}")
async def delete_test_case(id: str):
    tcd_service.delete_test_case(id)
    return {"message": "Test case deleted successfully"}

@router.put("/tcd/reorder", response_model=List[TestCase])
async def reorder_test_cases(order: List[str] = Body(..., embed=True)):
    return tcd_service.reorder_test_cases(order)
