from typing import List, Optional, Dict
from fastapi import APIRouter, HTTPException, Body
from backend.services.project_service import project_service

router = APIRouter(tags=["Transform"])

@router.post("/transform/mm-to-px")
async def mm_to_px(
    layer: str = Body(...),
    x_mm: float = Body(...),
    y_mm: float = Body(...)
):
    state = project_service.get_state()
    svc = state.transform_services.get(layer.upper())
    if not svc:
        raise HTTPException(status_code=400, detail=f"No transformation matrix available for layer '{layer}'")
    x_px, y_px = svc.mm_to_px(x_mm, y_mm)
    return {"x_px": x_px, "y_px": y_px}

@router.post("/transform/px-to-mm")
async def px_to_mm(
    layer: str = Body(...),
    x_px: float = Body(...),
    y_px: float = Body(...)
):
    state = project_service.get_state()
    svc = state.transform_services.get(layer.upper())
    if not svc:
        raise HTTPException(status_code=400, detail=f"No transformation matrix available for layer '{layer}'")
    x_mm, y_mm = svc.px_to_mm(x_px, y_px)
    return {"x_mm": x_mm, "y_mm": y_mm}

@router.post("/transform/batch")
async def transform_batch(
    layer: str = Body(...),
    points: List[Dict[str, float]] = Body(...)  # list of {"x": ..., "y": ...} in mm
):
    state = project_service.get_state()
    svc = state.transform_services.get(layer.upper())
    if not svc:
        raise HTTPException(status_code=400, detail=f"No transformation matrix available for layer '{layer}'")
    
    results = []
    for pt in points:
        x_px, y_px = svc.mm_to_px(pt.get("x", 0.0), pt.get("y", 0.0))
        results.append({"x_px": x_px, "y_px": y_px})
    return {"results": results}
