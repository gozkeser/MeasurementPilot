from pydantic import BaseModel
from typing import Optional

class PPLComponent(BaseModel):
    designator: str
    comment: Optional[str] = ""
    layer: str  # "TOP" | "BOT"
    footprint: Optional[str] = ""
    x_mm: float
    y_mm: float
    rotation: float = 0.0
    type: str = "COMPONENT"  # "COMPONENT" | "FIDUCIAL"
