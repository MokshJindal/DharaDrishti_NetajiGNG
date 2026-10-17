"""
Irrigation Advisor & Agronomic Alert Module for Weather_Logic.
Translates meteorological forecasts into actionable water management and crop protection alerts:
1. Rain & Nitrogen Leaching Risk (Hold irrigation + Leaching Vulnerability Index calculation).
2. Continuous High Humidity & Overcast Fungal Disease Risk (Irrigation method switching & delay).
"""

from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict
import pandas as pd


@dataclass
class RainLeachingAlert:
    triggered: bool
    predicted_precip_24_48h_mm: float
    max_rain_probability_pct: int
    alert_message: str
    action: str
    leaching_vulnerability_index: Optional[float] = None
    leaching_risk_level: str = "LOW"
    leaching_details: str = ""


@dataclass
class FungalDiseaseAlert:
    triggered: bool
    risk_level: str  # SAFE, MODERATE, HIGH, CRITICAL
    avg_humidity_3d_pct: float
    hours_above_80_pct_humidity: int
    overcast_hours_3d: int
    recommendation: str
    agronomic_rationale: str


@dataclass
class IrrigationAdvisoryResult:
    rain_alert: RainLeachingAlert
    fungal_alert: FungalDiseaseAlert
    overall_irrigation_status: str  # "HOLD", "DELAY_24H", "SWITCH_METHOD", "SAFE_TO_IRRIGATE"
    summary_banner: str

    def to_dict(self) -> Dict[str, Any]:
        """Converts the advisory result to a dictionary for JSON UI serialization."""
        return {
            "overall_irrigation_status": self.overall_irrigation_status,
            "summary_banner": self.summary_banner,
            "rain_and_leaching": asdict(self.rain_alert),
            "fungal_disease_risk": asdict(self.fungal_alert),
        }


def calculate_leaching_vulnerability_index(
    precip_mm: float,
    rain_prob_pct: float,
    urea_applied: bool,
    soil_n_status: str,
) -> Dict[str, Any]:
    """
    Calculates the Leaching Vulnerability Index (LVI) on a scale of 0 to 100.
    
    Agronomic Rationale:
    Urea hydrolyzes into ammonium (NH4+) and converts to nitrate (NO3-).
    Because NO3- is an anion, it cannot bind to negatively charged soil clay platelets.
    Excessive moisture from heavy rain combined with flood irrigation creates downward
    hydraulic pressure that pushes soluble nitrate far below the effective root zone,
    causing 40-60% fertilizer loss and groundwater contamination.
    """
    # 1. Base precipitation intensity score (0 to 60)
    # 10mm starts around 30; 25mm+ reaches 55+
    precip_score = min(60.0, (precip_mm / 30.0) * 60.0)

    # 2. Probability confidence weight (0 to 20)
    prob_score = (rain_prob_pct / 100.0) * 20.0

    base_score = precip_score + prob_score

    # 3. Nitrogen sensitivity multiplier
    multiplier = 1.0
    status_lower = (soil_n_status or "").lower()

    if urea_applied:
        multiplier += 0.35  # Freshly applied urea is at peak vulnerability
    if status_lower in ["low", "deficient", "critical"]:
        multiplier += 0.25  # Any additional nitrogen loss is catastrophic for yield

    lvi_score = round(min(100.0, base_score * multiplier), 1)

    if lvi_score >= 70.0:
        level = "CRITICAL"
        details = (
            "CRITICAL HAZARD: Deep flood irrigation must be strictly avoided! High rainfall will flush "
            "mobile nitrate (NO3-) past root depth. Applying water now guarantees severe fertilizer loss."
        )
    elif lvi_score >= 45.0:
        level = "HIGH"
        details = (
            "HIGH RISK: Postpone all fertigation and heavy irrigation. Soil moisture from incoming rain "
            "is sufficient. Flood irrigation will trigger rapid downward percolation and nitrogen leaching."
        )
    elif lvi_score >= 25.0:
        level = "MODERATE"
        details = (
            "MODERATE RISK: Monitor rain accumulation. Limit irrigation to shallow micro-drips if required."
        )
    else:
        level = "LOW"
        details = "LOW RISK: Moisture and leaching threat is minimal under current weather projections."

    return {
        "lvi": lvi_score,
        "level": level,
        "details": details,
    }


def evaluate_irrigation_advisory(
    forecast_df: pd.DataFrame,
    urea_applied: bool = False,
    soil_nitrogen_status: str = "normal",
) -> IrrigationAdvisoryResult:
    """
    Evaluates weather forecast data across 24h-48h and 72h windows to generate
    irrigation guidance and disease alerts.
    """
    if len(forecast_df) < 24:
        raise ValueError("Forecast DataFrame requires at least 24 hours of future data.")

    # -------------------------------------------------------------------------
    # 1. Rain & Nitrogen Leaching Risk (24h - 48h horizon)
    # -------------------------------------------------------------------------
    window_48h = forecast_df.iloc[:min(48, len(forecast_df))]
    total_precip_48h = round(float(window_48h.get("precipitation", pd.Series([0.0])).sum()), 1)
    max_rain_prob_48h = int(window_48h.get("precipitation_probability", pd.Series([0])).max())

    rain_triggered = (total_precip_48h > 10.0) or (max_rain_prob_48h > 65)

    if rain_triggered:
        alert_msg = "Hold irrigation! Rain predicted tomorrow. Save water and prevent Nitrogen wash-off."
        action = "HOLD_IRRIGATION"
    else:
        alert_msg = "No heavy precipitation forecast in the next 24-48 hours."
        action = "PROCEED_AS_SCHEDULED"

    # Evaluate Leaching Vulnerability Index (LVI)
    lvi_info = None
    if rain_triggered or urea_applied or (soil_nitrogen_status.lower() in ["low", "deficient", "critical"]):
        lvi_calc = calculate_leaching_vulnerability_index(
            precip_mm=total_precip_48h,
            rain_prob_pct=max_rain_prob_48h,
            urea_applied=urea_applied,
            soil_n_status=soil_nitrogen_status,
        )
        lvi_info = lvi_calc

    rain_alert = RainLeachingAlert(
        triggered=rain_triggered,
        predicted_precip_24_48h_mm=total_precip_48h,
        max_rain_probability_pct=max_rain_prob_48h,
        alert_message=alert_msg,
        action=action,
        leaching_vulnerability_index=lvi_info["lvi"] if lvi_info else None,
        leaching_risk_level=lvi_info["level"] if lvi_info else "LOW",
        leaching_details=lvi_info["details"] if lvi_info else "",
    )

    # -------------------------------------------------------------------------
    # 2. Continuous High Humidity & Overcast Fungal Disease Risk (72h / 3-day horizon)
    # -------------------------------------------------------------------------
    window_72h = forecast_df.iloc[:min(72, len(forecast_df))]
    avg_humidity_3d = round(float(window_72h["humidity"].mean()), 1)
    hours_high_humidity = int((window_72h["humidity"] >= 80.0).sum())

    # Check for overcast conditions: either cloud_cover >= 75% or weather_code == 3 (overcast)
    cloud_cover_series = window_72h.get("cloud_cover", pd.Series([0] * len(window_72h)))
    weather_code_series = window_72h.get("weather_code", pd.Series([0] * len(window_72h)))
    overcast_mask = (cloud_cover_series >= 75) | (weather_code_series == 3) | (weather_code_series.between(51, 65))
    overcast_hours_3d = int(overcast_mask.sum())

    # Fungal trigger condition: continuous high humidity (or >50% of the 72h window above 80%)
    # coupled with sustained overcast skies (>36 hours out of 72h)
    fungal_triggered = (
        (avg_humidity_3d >= 80.0 or hours_high_humidity >= 36) and (overcast_hours_3d >= 36)
    )

    if fungal_triggered:
        risk_level = "CRITICAL" if (avg_humidity_3d >= 85.0 and hours_high_humidity >= 48) else "HIGH"
        recommendation = (
            "Avoid overhead / sprinkler irrigation; switch to ground drip or furrow to keep leaves dry. "
            "Delay irrigation by 24 hours."
        )
        rationale = (
            f"Forecast projects {hours_high_humidity} hours of >80% relative humidity (avg: {avg_humidity_3d}%) "
            f"and {overcast_hours_3d} overcast hours over the next 3 days. Extended canopy wetness without "
            f"direct solar radiation accelerates fungal spore germination (e.g., Phytophthora blight, powdery mildew, "
            f"blast). Overhead sprinklers will exacerbate foliar dampness and splash spores across rows."
        )
    elif hours_high_humidity >= 24 or avg_humidity_3d >= 75.0:
        risk_level = "MODERATE"
        recommendation = "Prefer early-morning ground irrigation. Inspect lower canopy for initial fungal spots."
        rationale = "Elevated humidity periods detected. Avoid late evening sprinkler watering."
    else:
        risk_level = "SAFE"
        recommendation = "Standard irrigation methods permissible."
        rationale = "Low leaf-wetness duration and adequate solar radiation prevent fungal pathogen buildup."

    fungal_alert = FungalDiseaseAlert(
        triggered=fungal_triggered,
        risk_level=risk_level,
        avg_humidity_3d_pct=avg_humidity_3d,
        hours_above_80_pct_humidity=hours_high_humidity,
        overcast_hours_3d=overcast_hours_3d,
        recommendation=recommendation,
        agronomic_rationale=rationale,
    )

    # -------------------------------------------------------------------------
    # Overall Action Determination
    # -------------------------------------------------------------------------
    if rain_triggered:
        overall_status = "HOLD_IRRIGATION"
        summary = "CRITICAL ACTION: Hold irrigation immediately! Rain expected within 24-48 hours."
    elif fungal_triggered:
        overall_status = "DELAY_24H_SWITCH_TO_DRIP"
        summary = "HIGH CAUTION: Fungal disease conditions active. Delay irrigation 24h & avoid overhead sprinklers."
    elif fungal_alert.risk_level == "MODERATE":
        overall_status = "SWITCH_TO_DRIP"
        summary = "MODERATE: Use ground drip or furrow irrigation to minimize canopy moisture."
    else:
        overall_status = "SAFE_TO_IRRIGATE"
        summary = "NORMAL: Weather conditions favorable for scheduled irrigation."

    return IrrigationAdvisoryResult(
        rain_alert=rain_alert,
        fungal_alert=fungal_alert,
        overall_irrigation_status=overall_status,
        summary_banner=summary,
    )
