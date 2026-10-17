"""
Main execution module for Weather_Logic.
Coordinates:
1. Data retrieval (Current conditions, next 7-day NWP forecast, and past 10-day history).
2. Training lightweight autoregressive Ridge model.
3. Forecasting for +1 Day (24h) and +3 Days (72h).
4. Side-by-side comparison against Open-Meteo's official NWP forecast.
5. Agronomic Water & Irrigation Intelligence:
   - Rain & Nitrogen Leaching Warning (Hold irrigation + Leaching Vulnerability Index).
   - High Humidity & Overcast Fungal Disease Risk (Irrigation method switching & delay).
"""

import sys
import json
import argparse
from typing import Dict, Any
import pandas as pd

from config import config
from api_client import WeatherAPIClient, WeatherAPIError
from model import LightweightWeatherPredictor
from irrigation_advisor import evaluate_irrigation_advisory, IrrigationAdvisoryResult


def parse_arguments() -> argparse.Namespace:
    """Parses CLI arguments for location and agronomic context."""
    parser = argparse.ArgumentParser(
        description="Weather_Logic: Meteorological Intelligence, Forecasting & Irrigation Advisor."
    )
    parser.add_argument(
        "--lat",
        type=float,
        default=config.default_latitude,
        help=f"Target latitude (-90 to 90). Default: {config.default_latitude}",
    )
    parser.add_argument(
        "--lon",
        type=float,
        default=config.default_longitude,
        help=f"Target longitude (-180 to 180). Default: {config.default_longitude}",
    )
    parser.add_argument(
        "--name",
        type=str,
        default=config.default_location_name,
        help=f"Location label. Default: '{config.default_location_name}'",
    )
    parser.add_argument(
        "--urea-applied",
        action="store_true",
        help="Flag indicating farmer recently applied Urea fertilizer in the field.",
    )
    parser.add_argument(
        "--soil-n",
        type=str,
        default="normal",
        choices=["normal", "low", "deficient", "critical"],
        help="Soil Nitrogen status from Soil Health Card / NPK model. Default: 'normal'",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output full payload in JSON format for web UI integration.",
    )
    return parser.parse_args()


def display_current_weather(current: Dict[str, Any], location_name: str, lat: float, lon: float) -> None:
    """Renders current weather conditions in a structured console card."""
    print("=" * 82)
    print(f"  CURRENT WEATHER CONDITIONS: {location_name.upper()} (Lat: {lat}, Lon: {lon})")
    print("=" * 82)
    print(f"  • Timestamp:            {current['time']}")
    print(f"  • Condition:            {current['condition_description']} (WMO Code: {current['weather_code']})")
    print(f"  • Temperature:          {current['temperature_c']} °C")
    print(f"  • Relative Humidity:    {current['relative_humidity_pct']} %")
    print(f"  • Wind Speed:           {current['wind_speed_kmh']} km/h")
    print("=" * 82)
    print()


def display_model_info(predictor: LightweightWeatherPredictor) -> None:
    """Displays justification for model choice and data limitations."""
    print("=" * 82)
    print("  PREDICTION MODEL: JUSTIFICATION & LIMITATIONS")
    print("=" * 82)
    print(f"\n[MODEL CHOICE JUSTIFICATION]\n{predictor.MODEL_JUSTIFICATION}\n")
    print("[LIMITATIONS OF PREDICTING WITH ONLY 10 DAYS OF DATA]")
    for idx, limitation in enumerate(predictor.DATA_LIMITATIONS, 1):
        print(f"  {idx}. {limitation}")
    print("=" * 82)
    print()


def display_irrigation_advisory(advisory: IrrigationAdvisoryResult, urea_applied: bool, soil_n: str) -> None:
    """Renders the agronomic water management and disease risk alerts."""
    r = advisory.rain_alert
    f = advisory.fungal_alert

    print("=" * 82)
    print("  AGRONOMIC IRRIGATION & CROP PROTECTION ADVISORY (FOR FARMERS / UI)")
    print("=" * 82)
    print(f"  STATUS BANNER: [{advisory.overall_irrigation_status}]")
    print(f"  >>> {advisory.summary_banner}")
    print("-" * 82)

    # 1. Rain & Nitrogen Leaching Section
    print("[1] RAIN & NITROGEN LEACHING INTELLIGENCE (24h - 48h Horizon):")
    print(f"  • 24-48h Total Rain:      {r.predicted_precip_24_48h_mm} mm")
    print(f"  • Peak Rain Probability:  {r.max_rain_probability_pct} %")
    print(f"  • Trigger Status:         {'ACTIVE (THRESHOLD EXCEEDED)' if r.triggered else 'INACTIVE (SAFE)'}")
    print(f"  • Action Recommendation:  {r.action}")
    print(f"  • Alert Message:          \"{r.alert_message}\"")

    if r.leaching_vulnerability_index is not None:
        print(f"\n  [LEACHING VULNERABILITY INDEX (LVI)]: {r.leaching_vulnerability_index} / 100 [{r.leaching_risk_level}]")
        print(f"  • Farmer Urea Applied:    {'YES (High Leaching Hazard)' if urea_applied else 'No'}")
        print(f"  • Soil Nitrogen Status:   {soil_n.upper()}")
        print(f"  • Agronomic Impact:       {r.leaching_details}")

    print("-" * 82)

    # 2. Fungal Disease Risk Section
    print("[2] FUNGAL DISEASE RISK & CANOPY MANAGEMENT (72h / 3-Day Horizon):")
    print(f"  • 3-Day Average Humidity: {f.avg_humidity_3d_pct} %")
    print(f"  • Hours Humidity >= 80%:  {f.hours_above_80_pct_humidity} / 72 hours")
    print(f"  • Overcast / Wet Hours:   {f.overcast_hours_3d} / 72 hours")
    print(f"  • Disease Risk Level:     [{f.risk_level}]")
    print(f"  • Advisory Recommendation:")
    print(f"    \"{f.recommendation}\"")
    print(f"  • Pathogen Rationale:\n    {f.agronomic_rationale}")
    print("=" * 82)
    print()


def align_and_compare(
    pred_df: pd.DataFrame, api_forecast_df: pd.DataFrame
) -> Dict[str, Any]:
    """Computes summary metrics for 24h (+1 day), 72h (+3 days), and 168h (+7 days) windows."""
    m_1d = LightweightWeatherPredictor.summarize_forecast(pred_df, 24)
    a_1d = LightweightWeatherPredictor.summarize_forecast(api_forecast_df, 24)
    m_3d = LightweightWeatherPredictor.summarize_forecast(pred_df, 72)
    a_3d = LightweightWeatherPredictor.summarize_forecast(api_forecast_df, 72)
    m_7d = LightweightWeatherPredictor.summarize_forecast(pred_df, 168)
    a_7d = LightweightWeatherPredictor.summarize_forecast(api_forecast_df, 168)

    return {
        "1_day": {"model": m_1d, "api": a_1d},
        "3_day": {"model": m_3d, "api": a_3d},
        "7_day": {"model": m_7d, "api": a_7d},
    }


def format_comparison_table(comp: Dict[str, Any]) -> None:
    """Renders a clean side-by-side comparative table."""
    headers = [
        "Horizon",
        "Metric",
        "Unit",
        "Our Model",
        "API Forecast",
        "Delta (Diff)",
    ]
    col_w = [11, 19, 8, 12, 14, 14]
    
    def row_fmt(vals):
        return "| " + " | ".join(f"{str(v):<{w}}" for v, w in zip(vals, col_w)) + " |"

    sep = "+-" + "-+-".join("-" * w for w in col_w) + "-+"

    print("=" * 82)
    print("  SIDE-BY-SIDE FORECAST COMPARISON (Our Model vs. Open-Meteo NWP Forecast)")
    print("=" * 82)
    print(sep)
    print(row_fmt(headers))
    print(sep)

    horizons = [
        ("Next 1-Day", "1_day"),
        ("Next 3-Days", "3_day"),
        ("Next 7-Days", "7_day"),
    ]

    metrics = [
        ("Temperature (Avg)", "temperature", "mean", "°C"),
        ("Temperature (Min)", "temperature", "min", "°C"),
        ("Temperature (Max)", "temperature", "max", "°C"),
        ("Humidity (Avg)",    "humidity",    "mean", "%"),
        ("Humidity (Min)",    "humidity",    "min", "%"),
        ("Humidity (Max)",    "humidity",    "max", "%"),
        ("Wind Speed (Avg)",  "wind_speed",  "mean", "km/h"),
        ("Wind Speed (Max)",  "wind_speed",  "max", "km/h"),
    ]

    for horizon_label, horizon_key in horizons:
        data = comp[horizon_key]
        for idx, (m_label, var_key, stat_key, unit) in enumerate(metrics):
            h_disp = horizon_label if idx == 0 else ""
            m_val = data["model"][var_key][stat_key]
            a_val = data["api"][var_key][stat_key]
            delta = round(m_val - a_val, 1)
            delta_str = f"{'+' if delta > 0 else ''}{delta} {unit}"
            print(row_fmt([h_disp, m_label, unit, f"{m_val}", f"{a_val}", delta_str]))
        print(sep)
    print()


def main():
    args = parse_arguments()
    client = WeatherAPIClient()

    if not args.json:
        print("\n>>> Initiating Weather_Logic Data Retrieval & Prediction Workflow...\n")

    # Step 1: Data Retrieval
    try:
        if not args.json:
            print(f"[*] Calling Current & Forecast API for {args.name} (lat: {args.lat}, lon: {args.lon})...")
        forecast_result = client.get_current_and_forecast(latitude=args.lat, longitude=args.lon)
        current_weather = forecast_result["current"]
        api_forecast_df = forecast_result["forecast_df"]

        if not args.json:
            print(f"[*] Calling Historical API to fetch past {config.historical_days} days of observations...")
        historical_df = client.get_historical_data(
            latitude=args.lat, longitude=args.lon, past_days=config.historical_days
        )
        if not args.json:
            print(f"[+] Retrieved {len(historical_df)} hours of historical weather data.")
            print(f"    Date span: {historical_df['time'].iloc[0]} to {historical_df['time'].iloc[-1]}\n")

    except WeatherAPIError as err:
        print(f"\n[!] API Error encountered: {err}", file=sys.stderr)
        print("[!] Please verify your network connection, coordinates, or API endpoint URL.", file=sys.stderr)
        sys.exit(1)

    # Step 2: Prediction Model Fitting
    predictor = LightweightWeatherPredictor(ridge_alpha=1.0)
    predictor.fit(historical_df)
    pred_df = predictor.predict_future(horizon_hours=168)

    # Step 3: Comparative Evaluation
    comparison = align_and_compare(pred_df, api_forecast_df)

    # Step 4: Agronomic Water & Crop Protection Advisory
    advisory = evaluate_irrigation_advisory(
        forecast_df=api_forecast_df,
        urea_applied=args.urea_applied,
        soil_nitrogen_status=args.soil_n,
    )

    if args.json:
        # Machine-readable JSON output for UI integration
        payload = {
            "location": {"name": args.name, "latitude": args.lat, "longitude": args.lon},
            "current_weather": current_weather,
            "comparison": comparison,
            "irrigation_advisory": advisory.to_dict(),
        }
        print(json.dumps(payload, indent=2))
        return

    # Render Terminal UI
    display_current_weather(current_weather, args.name, args.lat, args.lon)
    display_model_info(predictor)
    format_comparison_table(comparison)
    display_irrigation_advisory(advisory, urea_applied=args.urea_applied, soil_n=args.soil_n)

    print("[SUCCESS] Workflow completed cleanly.\n")


if __name__ == "__main__":
    main()
