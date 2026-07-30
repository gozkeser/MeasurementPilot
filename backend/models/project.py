from pydantic import BaseModel
from typing import Optional, List, Dict

class LayerInfo(BaseModel):
    layer: str  # "TOP" | "BOT"
    image_available: bool
    origin_json_available: bool
    transformation_matrix: Optional[List[List[float]]] = None
    origin_pixel: Optional[Dict[str, int]] = None

class ProjectInfo(BaseModel):
    assembly_no: str
    assembly_rev: str
    zip_path: str
    available_layers: List[LayerInfo]
    active_layer: str
    has_ctp: bool
    has_tcd: bool
    warnings: List[str] = []
