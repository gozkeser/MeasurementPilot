from typing import List, Optional
from fastapi import APIRouter, Query
from backend.models.component import PPLComponent
from backend.services.project_service import project_service

router = APIRouter(tags=["Components"])

@router.get("/components", response_model=List[PPLComponent])
async def list_components(
    type: Optional[str] = Query(None, description="Filter by type: COMPONENT or FIDUCIAL"),
    layer: Optional[str] = Query(None, description="Filter by layer: TOP or BOT"),
    search: Optional[str] = Query(None, description="Search by designator or comment")
):
    state = project_service.get_state()
    comps = state.components

    if type:
        type_upper = type.upper()
        comps = [c for c in comps if c.type.upper() == type_upper]

    if layer:
        layer_upper = layer.upper()
        comps = [c for c in comps if c.layer.upper() == layer_upper]

    if search:
        s = search.lower()
        comps = [c for c in comps if s in c.designator.lower() or (c.comment and s in c.comment.lower())]

    return comps
