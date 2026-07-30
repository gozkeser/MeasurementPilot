import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
SESSIONS_DIR = DATA_DIR / "sessions"
SETTINGS_FILE = DATA_DIR / "settings.json"
FRONTEND_DIR = BASE_DIR / "frontend"
TEMPLATES_DIR = BASE_DIR / "backend" / "templates"

# Ensure data directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
