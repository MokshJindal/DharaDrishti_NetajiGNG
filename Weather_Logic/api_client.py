"""
API Client for Open-Meteo Weather Services.
Fetches current conditions, future NWP forecasts, and past 10-day historical observations.
Includes comprehensive error handling, timeout management, and schema extraction.
"""

import json
from typing import Dict, Any, Optional
import urllib.request
import urllib.error
import urllib.parse
import pandas as pd

from config import config, WeatherConfig
from weather_codes import get_weather_description


class WeatherAPIError(Exception):
    """Custom exception raised for weather API errors."""
    pass


class WeatherAPIClient:
    """Client for interacting with Open-Meteo current, forecast, and historical endpoints."""

    def __init__(self, cfg: Optional[WeatherConfig] = None):
        self.config = cfg or config

    def _execute_request(self, base_url: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes an HTTP GET request with query parameters and handles errors gracefully.
        """
        query_string = urllib.parse.urlencode(params)
        full_url = f"{base_url}?{query_string}"

        headers = {
            "User-Agent": "WeatherLogic-App/1.0",
            "Accept": "application/json",
        }
        if self.config.api_key:
            headers["apikey"] = self.config.api_key

        req = urllib.request.Request(full_url, headers=headers)

        try:
            with urllib.request.urlopen(req, timeout=self.config.timeout_seconds) as response:
                if response.status != 200:
                    raise WeatherAPIError(
                        f"API request failed with HTTP status {response.status}: {response.reason}"
                    )
                raw_data = response.read().decode("utf-8")
                return json.loads(raw_data)
        except urllib.error.HTTPError as e:
            error_msg = f"HTTP Error {e.code}: {e.reason}"
            try:
                error_body = json.loads(e.read().decode("utf-8"))
                if "reason" in error_body:
                    error_msg += f" - {error_body['reason']}"
            except Exception:
                pass
            raise WeatherAPIError(error_msg) from e
        except urllib.error.URLError as e:
            raise WeatherAPIError(
                f"Network connection failed when reaching {base_url}: {e.reason}"
            ) from e
        except json.JSONDecodeError as e:
            raise WeatherAPIError(f"Failed to parse API response as JSON: {e}") from e
        except Exception as e:
            raise WeatherAPIError(f"Unexpected error while calling weather API: {e}") from e

    def get_current_and_forecast(
        self, latitude: float, longitude: float
    ) -> Dict[str, Any]:
        """
        Fetches current weather conditions and next 7-day NWP forecast from the forecast API.
        
        Returns:
            dict containing:
                - 'current': current observation (temp, humidity, wind, description)
                - 'forecast_df': Pandas DataFrame of hourly forecast
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
            "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,precipitation_probability,cloud_cover,weather_code",
            "timezone": self.config.timezone,
        }

        data = self._execute_request(self.config.forecast_api_url, params)

        # Parse current conditions
        current_raw = data.get("current", {})
        if not current_raw:
            raise WeatherAPIError("Forecast API response did not contain 'current' weather block.")

        wmo_code = current_raw.get("weather_code")
        current_summary = {
            "time": current_raw.get("time"),
            "temperature_c": current_raw.get("temperature_2m"),
            "relative_humidity_pct": current_raw.get("relative_humidity_2m"),
            "wind_speed_kmh": current_raw.get("wind_speed_10m"),
            "weather_code": wmo_code,
            "condition_description": get_weather_description(wmo_code),
        }

        # Parse forecast hourly dataframe
        hourly_raw = data.get("hourly", {})
        if not hourly_raw or "time" not in hourly_raw:
            raise WeatherAPIError("Forecast API response did not contain valid 'hourly' forecast data.")

        forecast_df = pd.DataFrame({
            "time": pd.to_datetime(hourly_raw["time"]),
            "temperature": hourly_raw.get("temperature_2m"),
            "humidity": hourly_raw.get("relative_humidity_2m"),
            "wind_speed": hourly_raw.get("wind_speed_10m"),
            "precipitation": hourly_raw.get("precipitation", [0.0] * len(hourly_raw["time"])),
            "precipitation_probability": hourly_raw.get(
                "precipitation_probability", [0] * len(hourly_raw["time"])
            ),
            "cloud_cover": hourly_raw.get("cloud_cover", [0] * len(hourly_raw["time"])),
            "weather_code": hourly_raw.get("weather_code", [0] * len(hourly_raw["time"])),
        })

        return {
            "current": current_summary,
            "forecast_df": forecast_df,
            "raw": data,
        }

    def get_historical_data(
        self, latitude: float, longitude: float, past_days: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Fetches the past N days of hourly weather data for the specified location.
        
        Returns:
            pd.DataFrame indexed or containing hourly records for temp, humidity, wind.
        """
        days = past_days if past_days is not None else self.config.historical_days

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "past_days": days,
            "forecast_days": 0,
            "hourly": "temperature_2m,relative_humidity_2m,wind_speed_10m",
            "timezone": self.config.timezone,
        }

        data = self._execute_request(self.config.historical_api_url, params)

        hourly_raw = data.get("hourly", {})
        if not hourly_raw or "time" not in hourly_raw:
            raise WeatherAPIError(
                f"Historical API did not return hourly data for past {days} days."
            )

        df = pd.DataFrame({
            "time": pd.to_datetime(hourly_raw["time"]),
            "temperature": hourly_raw.get("temperature_2m"),
            "humidity": hourly_raw.get("relative_humidity_2m"),
            "wind_speed": hourly_raw.get("wind_speed_10m"),
        })

        # Drop any empty/trailing nulls and sort chronologically
        df = df.dropna().sort_values("time").reset_index(drop=True)
        if len(df) == 0:
            raise WeatherAPIError("Received historical data but all observation records were empty/NaN.")

        return df
