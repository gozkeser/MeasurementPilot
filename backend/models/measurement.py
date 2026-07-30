from pydantic import BaseModel
from typing import Optional, List

class MeasurementRecord(BaseModel):
    test_case_id: str
    test_case_name: str
    status: str  # "measured" | "skipped"
    measured_value: Optional[float] = None
    measured_prefix: Optional[str] = ""
    measured_unit: Optional[str] = ""
    in_range: Optional[bool] = None
    notes: Optional[str] = ""
    timestamp: str

class MeasurementSession(BaseModel):
    session_id: str
    assembly_no: str
    assembly_rev: str
    operator: str
    start_time: str
    end_time: Optional[str] = None
    records: List[MeasurementRecord] = []
