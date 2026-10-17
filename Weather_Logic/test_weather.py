"""
Automated unit & integration test suite for Weather_Logic.
Can be executed with: python3 test_weather.py
"""

import unittest
import numpy as np
import pandas as pd

from config import WeatherConfig
from weather_codes import get_weather_description, WMO_WEATHER_CODES
from model import LightweightWeatherPredictor
from api_client import WeatherAPIClient, WeatherAPIError
from irrigation_advisor import evaluate_irrigation_advisory


class TestWeatherConfig(unittest.TestCase):
    """Tests configuration loading and boundary validation."""

    def test_default_config_valid(self):
        cfg = WeatherConfig()
        cfg.validate()
        self.assertTrue(-90 <= cfg.default_latitude <= 90)
        self.assertTrue(-180 <= cfg.default_longitude <= 180)
        self.assertGreater(cfg.historical_days, 0)

    def test_invalid_latitude_raises(self):
        cfg = WeatherConfig(default_latitude=105.0)
        with self.assertRaises(ValueError):
            cfg.validate()

    def test_invalid_longitude_raises(self):
        cfg = WeatherConfig(default_longitude=-200.0)
        with self.assertRaises(ValueError):
            cfg.validate()


class TestWeatherCodes(unittest.TestCase):
    """Tests WMO weather code decoding."""

    def test_known_codes(self):
        self.assertEqual(get_weather_description(0), "Clear sky")
        self.assertEqual(get_weather_description(3), "Overcast")
        self.assertEqual(get_weather_description(61), "Slight rain")
        self.assertEqual(get_weather_description(95), "Thunderstorm (slight/moderate)")

    def test_fallback_unknown_code(self):
        self.assertEqual(get_weather_description(999), "Condition code 999")
        self.assertEqual(get_weather_description(None), "Unknown")


class TestWeatherPredictorModel(unittest.TestCase):
    """Tests feature engineering, fitting, and recursive forecasting."""

    def setUp(self):
        # Generate 240 hours of synthetic realistic weather data
        dates = pd.date_range("2026-10-01 00:00:00", periods=240, freq="h")
        hours = dates.hour
        # Diurnal temperature oscillation between 12°C and 24°C
        temp = 18.0 + 6.0 * np.sin(2 * np.pi * (hours - 8) / 24.0) + np.random.normal(0, 0.2, 240)
        # Diurnal humidity oscillation (inverse to temp) between 40% and 85%
        hum = 60.0 - 20.0 * np.sin(2 * np.pi * (hours - 8) / 24.0) + np.random.normal(0, 0.5, 240)
        hum = np.clip(hum, 0.0, 100.0)
        # Wind speed >= 0
        wind = np.abs(5.0 + 3.0 * np.cos(2 * np.pi * hours / 24.0) + np.random.normal(0, 0.3, 240))

        self.df = pd.DataFrame({
            "time": dates,
            "temperature": temp,
            "humidity": hum,
            "wind_speed": wind,
        })

    def test_fit_and_predict_horizons(self):
        predictor = LightweightWeatherPredictor(ridge_alpha=1.0)
        predictor.fit(self.df)

        self.assertIn("temperature", predictor.models)
        self.assertIn("humidity", predictor.models)
        self.assertIn("wind_speed", predictor.models)

        # Predict 72 hours (3 days)
        forecast_df = predictor.predict_future(horizon_hours=72)
        self.assertEqual(len(forecast_df), 72)
        self.assertListEqual(list(forecast_df.columns), ["time", "temperature", "humidity", "wind_speed"])

        # Boundary checks
        self.assertTrue((forecast_df["humidity"] >= 0.0).all())
        self.assertTrue((forecast_df["humidity"] <= 100.0).all())
        self.assertTrue((forecast_df["wind_speed"] >= 0.0).all())

    def test_forecast_summary_metrics(self):
        predictor = LightweightWeatherPredictor(ridge_alpha=1.0)
        predictor.fit(self.df)
        forecast_df = predictor.predict_future(horizon_hours=72)

        summary_24 = predictor.summarize_forecast(forecast_df, 24)
        self.assertIn("temperature", summary_24)
        self.assertIn("mean", summary_24["temperature"])
        self.assertIn("min", summary_24["temperature"])
        self.assertIn("max", summary_24["temperature"])
        self.assertLessEqual(summary_24["temperature"]["min"], summary_24["temperature"]["max"])


class TestIrrigationAdvisor(unittest.TestCase):
    """Tests agronomic rules for rain leaching, LVI, and fungal risk alerts."""

    def setUp(self):
        # Base 72h DataFrame
        times = pd.date_range("2026-10-18 00:00:00", periods=72, freq="h")
        self.base_df = pd.DataFrame({
            "time": times,
            "temperature": [22.0] * 72,
            "humidity": [60.0] * 72,
            "wind_speed": [5.0] * 72,
            "precipitation": [0.0] * 72,
            "precipitation_probability": [10] * 72,
            "cloud_cover": [20] * 72,
            "weather_code": [0] * 72,
        })

    def test_rain_exceeding_10mm_triggers_hold(self):
        df = self.base_df.copy()
        df.loc[:24, "precipitation"] = 0.5  # 25 * 0.5 = 12.5mm
        adv = evaluate_irrigation_advisory(df, urea_applied=False, soil_nitrogen_status="normal")

        self.assertTrue(adv.rain_alert.triggered)
        self.assertEqual(adv.overall_irrigation_status, "HOLD_IRRIGATION")
        self.assertIn("Hold irrigation!", adv.rain_alert.alert_message)
        self.assertIsNotNone(adv.rain_alert.leaching_vulnerability_index)

    def test_rain_probability_exceeding_65_pct_triggers_hold(self):
        df = self.base_df.copy()
        df.loc[10, "precipitation_probability"] = 75  # Peak prob > 65%
        adv = evaluate_irrigation_advisory(df, urea_applied=False, soil_nitrogen_status="normal")

        self.assertTrue(adv.rain_alert.triggered)
        self.assertIn("Hold irrigation!", adv.rain_alert.alert_message)

    def test_urea_applied_escalates_lvi(self):
        df = self.base_df.copy()
        df.loc[:20, "precipitation"] = 1.0  # 21mm rain
        df.loc[:20, "precipitation_probability"] = 80

        adv_no_urea = evaluate_irrigation_advisory(df, urea_applied=False, soil_nitrogen_status="normal")
        adv_with_urea = evaluate_irrigation_advisory(df, urea_applied=True, soil_nitrogen_status="normal")

        lvi_no_urea = adv_no_urea.rain_alert.leaching_vulnerability_index
        lvi_with_urea = adv_with_urea.rain_alert.leaching_vulnerability_index

        self.assertGreater(lvi_with_urea, lvi_no_urea)
        self.assertIn("Deep flood irrigation must be strictly avoided", adv_with_urea.rain_alert.leaching_details)

    def test_continuous_high_humidity_and_overcast_triggers_fungal_alert(self):
        df = self.base_df.copy()
        df["humidity"] = 88.0  # High humidity > 80% continuous for 3 days
        df["cloud_cover"] = 90  # Overcast skies for 3 days
        df["weather_code"] = 3  # Overcast code

        adv = evaluate_irrigation_advisory(df, urea_applied=False, soil_nitrogen_status="normal")

        self.assertTrue(adv.fungal_alert.triggered)
        self.assertIn(adv.fungal_alert.risk_level, ["HIGH", "CRITICAL"])
        self.assertIn("Avoid overhead / sprinkler irrigation", adv.fungal_alert.recommendation)
        self.assertIn("Delay irrigation by 24 hours", adv.fungal_alert.recommendation)

    def test_benign_weather_safe_to_irrigate(self):
        adv = evaluate_irrigation_advisory(self.base_df, urea_applied=False, soil_nitrogen_status="normal")
        self.assertFalse(adv.rain_alert.triggered)
        self.assertFalse(adv.fungal_alert.triggered)
        self.assertEqual(adv.overall_irrigation_status, "SAFE_TO_IRRIGATE")


if __name__ == "__main__":
    unittest.main(verbosity=2)

