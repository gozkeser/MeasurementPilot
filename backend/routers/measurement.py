from typing import List, Optional
from fastapi import APIRouter, HTTPException, Body
from backend.models.measurement import MeasurementSession, MeasurementRecord
from backend.services.measurement_service import measurement_service
from backend.services.project_service import ProjectLoadError

router = APIRouter(tags=["Measurement"])

@router.post("/measurement/session", response_model=MeasurementSession)
async def start_session(operator: str = Body(..., embed=True)):
    return measurement_service.start_session(operator)

@router.get("/measurement/sessions")
async def list_sessions():
    return measurement_service.list_sessions()

@router.get("/measurement/{sid}", response_model=MeasurementSession)
async def get_session(sid: str):
    try:
        return measurement_service.get_session(sid)
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/measurement/{sid}/record", response_model=MeasurementRecord)
async def record_measurement(
    sid: str,
    test_case_id: str = Body(...),
    measured_value: float = Body(...),
    measured_prefix: Optional[str] = Body(""),
    measured_unit: Optional[str] = Body(""),
    notes: Optional[str] = Body("")
):
    try:
        return measurement_service.record_measurement(
            session_id=sid,
            test_case_id=test_case_id,
            measured_value=measured_value,
            measured_prefix=measured_prefix,
            measured_unit=measured_unit,
            notes=notes
        )
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/measurement/{sid}/skip/{tcid}", response_model=MeasurementRecord)
async def skip_measurement(
    sid: str,
    tcid: str,
    notes: Optional[str] = Body("", embed=True)
):
    try:
        return measurement_service.skip_measurement(sid, tcid, notes)
    except ProjectLoadError as e:
        raise HTTPException(status_code=404, detail=str(e))
