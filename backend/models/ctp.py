from pydantic import BaseModel
from typing import Optional

class CTP(BaseModel):
    id: str  # "CTP-001"
    name: str
    side: str  # "TOP" | "BOT"
    x_mm: float
    y_mm: float
    net: Optional[str] = ""
    notes: Optional[str] = ""
    created_at: Optional[str] = ""
    updated_at: Optional[str] = ""

class CTPCreate(BaseModel):
    name: str
    side: str
    x_mm: float
    y_mm: float
    net: Optional[str] = ""
    notes: Optional[str] = ""

class CTPUpdate(BaseModel):
    name: Optional[str] = None
    side: Optional[str] = None
    x_mm: Optional[float] = None
    y_mm: Optional[float] = None
    net: Optional[str] = None
    notes: Optional[str] = None
