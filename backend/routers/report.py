import os
from typing import Optional, Dict
from fastapi import APIRouter, HTTPException, Body, Response
from backend.services.report_service import report_service
from backend.services.project_service import ProjectLoadError

router = APIRouter(tags=["Report"])

@router.post("/report/generate")
async def generate_report(
    session_id: str = Body(...),
    metadata: Optional[Dict[str, str]] = Body(None)
):
    try:
        report_path = report_service.generate_html_report(session_id, metadata)
        filename = os.path.basename(report_path)
        return {
            "session_id": session_id,
            "report_path": report_path,
            "report_filename": filename
        }
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/report/view/{filename}")
async def view_report(filename: str):
    reports_dir = report_service.get_reports_dir()
    filepath = os.path.join(reports_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report file not found.")
    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()
    return Response(content=html_content, media_type="text/html")

@router.get("/report/download/{filename}")
async def download_report(filename: str):
    reports_dir = report_service.get_reports_dir()
    filepath = os.path.join(reports_dir, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Report file not found.")
    with open(filepath, "rb") as f:
        content = f.read()
    return Response(content=content, media_type="text/html", headers={"Content-Disposition": f'attachment; filename="{filename}"'})
