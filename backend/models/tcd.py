from pydantic import BaseModel
from typing import Optional, List

class ProbePointRef(BaseModel):
    source: str  # "TPR" | "CTP" | "PPL"
    ref: str     # id or designator

class TestCase(BaseModel):
    id: str  # "TC-001"
    name: str
    description: Optional[str] = ""
    measurement_type: str  # "DC_VOLTAGE", "AC_VOLTAGE", "RESISTANCE", "FREQUENCY", "DIODE", "CONTINUITY"
    expected_min: float
    expected_max: float
    unit: str
    prefix: str = ""  # "m", "k", "M", "μ", "n", "p", ""
    probe_positive: ProbePointRef
    probe_negative: ProbePointRef
    order: int = 0
    status: str = "pending"  # "pending", "measured", "skipped"

class TCD(BaseModel):
    assembly_no: str
    assembly_rev: str
    version: str = "1.0"
    test_cases: List[TestCase] = []
