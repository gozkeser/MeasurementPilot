from typing import List, Optional
from fastapi import APIRouter, Query
from backend.models.testpoint import TestPoint
from backend.services.project_service import project_service

router = APIRouter(tags=["Testpoints"])

@router.get("/testpoints", response_model=List[TestPoint])
async def list_testpoints(
    side: Optional[str] = Query(None, description="Filter by side: TOP, BOT, BOTH"),
    search: Optional[str] = Query(None, description="Search by ID or net")
):
    state = project_service.get_state()
    tps = state.testpoints

    if side:
        side_upper = side.upper()
        tps = [tp for tp in tps if tp.side.upper() == side_upper or tp.side.upper() == "BOTH"]

    if search:
        s = search.lower()
        tps = [tp for tp in tps if s in tp.id.lower() or s in tp.net.lower()]

    return tps
