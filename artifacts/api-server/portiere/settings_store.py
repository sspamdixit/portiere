import json
import os
from pathlib import Path
from portiere.models import SettingsModel


SETTINGS_DIR = Path.home() / ".portiere"
SETTINGS_FILE = SETTINGS_DIR / "settings.json"

_SECRET_KEYS = {
    "brain_api_key", "claude_api_key", "openai_api_key", "groq_api_key",
    "fal_api_key", "seedance_api_key", "smtp_password",
}


class SettingsStore:
    def __init__(self):
        SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
        if not SETTINGS_FILE.exists():
            self._write(SettingsModel().model_dump())

    def _read(self) -> dict:
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return SettingsModel().model_dump()

    def _write(self, data: dict):
        with open(SETTINGS_FILE, "w") as f:
            json.dump(data, f, indent=2)

    def get_all(self) -> dict:
        data = self._read()
        model = SettingsModel(**data)
        out = model.model_dump()
        for key in _SECRET_KEYS:
            val = out.get(key)
            if val:
                out[key] = "••••••••" + val[-4:] if len(val) > 4 else "••••"
        out["first_launch"] = data.get("first_launch", True)
        return out

    def get_raw(self) -> SettingsModel:
        data = self._read()
        return SettingsModel(**data)

    def save(self, updates: dict) -> SettingsModel:
        current = self._read()
        for key, value in updates.items():
            if isinstance(value, str) and "••••" in value:
                continue
            current[key] = value
        self._write(current)
        return SettingsModel(**current)
