import os
import json
from backend.config import SETTINGS_FILE
from backend.models.settings import AppSettings

class SettingsService:
    def __init__(self):
        self._settings = self._load()

    def _load(self) -> AppSettings:
        if SETTINGS_FILE.exists():
            try:
                with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return AppSettings(**data)
            except Exception as e:
                print(f"Warning: Could not read settings.json: {e}")
        settings = AppSettings()
        self._save(settings)
        return settings

    def _save(self, settings: AppSettings):
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            f.write(json.dumps(settings.model_dump(), indent=2))

    def get_settings(self) -> AppSettings:
        return self._settings

    def update_settings(self, patch_dict: dict) -> AppSettings:
        current = self._settings.model_dump()
        
        def deep_update(d, u):
            for k, v in u.items():
                if isinstance(v, dict) and k in d and isinstance(d[k], dict):
                    deep_update(d[k], v)
                else:
                    d[k] = v

        deep_update(current, patch_dict)
        updated = AppSettings(**current)
        self._settings = updated
        self._save(updated)
        return updated

settings_service = SettingsService()
