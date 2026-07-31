from pydantic import BaseModel
from typing import Optional, Dict, Any

class FlytoConfig(BaseModel):
    duration_ms: int = 800
    easing: str = "easeInOut"
    target_zoom: float = 2.5
    padding_px: int = 50
    highlight_delay_ms: int = 200

class MinimapConfig(BaseModel):
    position: str = "bottom-right"  # "top-right", "bottom-right", etc.
    width_px: int = 220
    height_px: int = 140
    opacity: float = 0.85
    border_color: str = "#00d4ff"

class OverlayConfig(BaseModel):
    shape: str = "reticle"  # "crosshair", "reticle", "flash", "ping", "badge"
    color: str = "#00d4ff"
    size_px: int = 24
    animation_speed: float = 1.0

class ProbeConfig(BaseModel):
    positive_color: str = "#ff4757"
    negative_color: str = "#000000"
    body_length_px: int = 80
    tip_length_px: int = 20
    cable_sag_factor: float = 0.35
    probe_angle: int = 40

class HighlightConfig(BaseModel):
    animation: str = "reticle"   # "reticle" | "ping" | "crosshair"
    color: str = "#00d4ff"
    size: int = 32
    line_width: int = 2

class AppSettings(BaseModel):
    theme: str = "dark"  # "dark", "light", "corporate"
    language: str = "en"  # "en", "tr"
    flyto: FlytoConfig = FlytoConfig()
    minimap: MinimapConfig = MinimapConfig()
    overlays: Dict[str, OverlayConfig] = {
        "TPR": OverlayConfig(shape="reticle", color="#00d4ff"),
        "CTP": OverlayConfig(shape="ping", color="#ff9f1a"),
        "FIDUCIAL": OverlayConfig(shape="crosshair", color="#2ed573"),
        "COMPONENT": OverlayConfig(shape="badge", color="#a55eea")
    }
    probe: ProbeConfig = ProbeConfig()
    highlight: HighlightConfig = HighlightConfig()
