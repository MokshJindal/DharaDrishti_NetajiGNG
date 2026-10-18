"""
Configuration module for Weather_Logic.
Loads settings from environment variables or a local .env file.
Provides default values and validation for coordinates, URLs, and query parameters.
"""

import os
from pathlib import Path
from dataclasses import dataclass


def _load_env_file(dotenv_path: Path) -> None:
    """Simple parser to load key-value pairs from a .env file without external dependencies."""
    if not dotenv_path.is_file():
        return
    try:
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                if key and key not in os.environ:
                    os.environ[key] = val
    except Exception:
        pass


# Automatically load .env if present in the same directory or project root
_curr_dir = Path(__file__).resolve().parent
_load_env_file(_curr_dir / ".env")
_load_env_file(_curr_dir.parent / ".env")


@dataclass(frozen=True)
class WeatherConfig:
    forecast_api_url: str = os.getenv(
        "FORECAST_API_URL", "https://api.open-meteo.com/v1/forecast"
    )
    historical_api_url: str = os.getenv(
        "HISTORICAL_API_URL", "https://api.open-meteo.com/v1/forecast"
    )
    api_key: str = os.getenv("WEATHER_API_KEY", "")
    default_latitude: float = float(os.getenv("DEFAULT_LATITUDE", "18.8262"))
    default_longitude: float = float(os.getenv("DEFAULT_LONGITUDE", "74.3731"))
    default_location_name: str = os.getenv("DEFAULT_LOCATION_NAME", "Shirur, Pune, Maharashtra")
    historical_days: int = int(os.getenv("HISTORICAL_DAYS", "10"))
    timezone: str = os.getenv("TIMEZONE", "Asia/Kolkata")
    timeout_seconds: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "10"))

    def validate(self) -> None:
        """Validates configuration parameters."""
        if not (-90.0 <= self.default_latitude <= 90.0):
            raise ValueError(f"Latitude must be between -90 and 90, got {self.default_latitude}")
        if not (-180.0 <= self.default_longitude <= 180.0):
            raise ValueError(f"Longitude must be between -180 and 180, got {self.default_longitude}")
        if self.historical_days < 1 or self.historical_days > 90:
            raise ValueError(f"Historical days must be between 1 and 90, got {self.historical_days}")


# Singleton instance
config = WeatherConfig()
config.validate()
