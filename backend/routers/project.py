import os
import tempfile
import shutil
from fastapi import APIRouter, UploadFile, File, Response, HTTPException
from backend.models.project import ProjectInfo
from backend.services.project_service import project_service, ProjectLoadError

router = APIRouter(tags=["Project"])

@router.post("/project/load", response_model=ProjectInfo)
async def load_project(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip files are allowed.")

    tmp_dir = tempfile.mkdtemp()
    tmp_zip_path = os.path.join(tmp_dir, file.filename)

    with open(tmp_zip_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        project_info = project_service.load_zip(tmp_zip_path)
        return project_info
    except ProjectLoadError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

@router.get("/project/info", response_model=ProjectInfo)
async def get_project_info():
    state = project_service.get_state()
    if not state.zip_path:
        raise HTTPException(status_code=404, detail="No project currently loaded.")
    return ProjectInfo(
        assembly_no=state.assembly_no,
        assembly_rev=state.assembly_rev,
        zip_path=state.zip_path,
        available_layers=list(state.available_layers.values()),
        active_layer=state.active_layer,
        has_ctp=len(state.ctps) > 0,
        has_tcd=state.tcd is not None
    )

@router.get("/project/image/{layer}")
async def get_project_image(layer: str):
    try:
        image_bytes = project_service.get_image_bytes(layer)
        return Response(content=image_bytes, media_type="image/png")
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/project/active-layer/{layer}")
async def set_active_layer(layer: str):
    active = project_service.set_active_layer(layer)
    return {"active_layer": active}

@router.get("/project/export")
async def export_project():
    try:
        data, filename = project_service.get_zip_bytes()
        return Response(
            content=data,
            media_type="application/zip",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))
