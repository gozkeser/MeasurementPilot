from pydantic import BaseModel
from typing import Optional

class TestPoint(BaseModel):
    id: str  # e.g., "TP1"
    net: str
    side: str  # "TOP" | "BOT" | "BOTH"
    x_mm: float
    y_mm: float
    hole_size_mm: float = 0.0
    type: str = "TPR"

class ResolvedProbePoint(BaseModel):
    source: str  # "TPR" | "CTP" | "PPL"
    ref: str
    x_mm: float
    y_mm: float
    side: str
    net: str
    x_px: Optional[float] = None
    y_px: Optional[float] = None
    error: Optional[str] = None
