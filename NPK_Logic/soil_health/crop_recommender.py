"""Crop Recommendation Engine trained on Crop_recommendation.csv.

Predicts which crops will survive and thrive based on soil N, P, K, pH,
and climatic parameters (temperature, humidity, rainfall).
"""
from pathlib import Path
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from . import config

_CROP_BUNDLE = None

# Agronomic survival profile explanations for major Indian crops
CROP_INSIGHTS = {
    "rice": "High water affinity; thrives in clayey to loamy soils with pH 5.0–7.0 and high moisture.",
    "maize": "Well-drained fertile loam; prefers neutral to slightly acidic pH and moderate-to-high nitrogen.",
    "chickpea": "Leguminous pulse; fixes atmospheric nitrogen, highly suited for low-nitrogen and neutral soils.",
    "kidneybeans": "Thrives in rich, well-aerated soil with moderate moisture and acidic-to-neutral pH (5.5–6.5).",
    "pigeonpeas": "Deep-rooted drought-resistant pulse; enriches soil fertility with low nitrogen requirements.",
    "mothbeans": "Extreme drought tolerance; well-adapted to sandy, low-nutrient arid/semi-arid soils.",
    "mungbean": "Short-duration leguminous crop; enriches soil nitrogen and thrives in well-drained loam.",
    "blackgram": "Nitrogen-fixing pulse; tolerates moderate moisture and slightly alkaline-to-neutral soils.",
    "lentil": "Cold-season pulse; requires low nitrogen and thrives in neutral-to-moderately alkaline soils.",
    "pomegranate": "Drought-hardy fruit crop; prefers well-drained slightly alkaline-to-neutral soils.",
    "banana": "Heavy nutrient feeder; requires high nitrogen, potassium, and abundant organic matter.",
    "mango": "Deep, well-drained alluvial soil; highly adaptable to slightly acidic to neutral pH.",
    "grapes": "Requires high potassium and phosphorus; prefers well-drained sandy loam with pH 6.0–7.5.",
    "watermelon": "Warm-season crop; thrives in sandy loam with high nitrogen and moderate potassium.",
    "muskmelon": "Warm and dry climate lover; prefers fertile sandy soils with neutral pH.",
    "apple": "Temperate climate crop; requires high phosphorus/potassium and cool winter temperatures.",
    "orange": "Sub-tropical citrus; prefers well-drained loam with neutral pH and moderate nutrients.",
    "papaya": "Fast-growing; thrives in rich loam soils with good drainage and warm temperatures.",
    "coconut": "Coastal and tropical lover; tolerates salinity, prefers sandy-to-alluvial soils.",
    "cotton": "Deep black soils (Regur); requires substantial potassium and thrives in warm climates.",
    "jute": "High rainfall and humidity lover; thrives in alluvial fertile plains.",
    "coffee": "Hill-slope crop; thrives in well-drained, organic-rich, slightly acidic forest soils.",
}


def train_crop_model() -> dict:
    """Trains a Random Forest classifier on Crop_recommendation.csv and saves it."""
    if not config.CROP_DATA_PATH.exists():
        raise FileNotFoundError(f"Crop dataset not found at {config.CROP_DATA_PATH}")

    df = pd.read_csv(config.CROP_DATA_PATH)
    features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X = df[features]
    y = df["label"]

    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X, y)

    bundle = {
        "model": model,
        "features": features,
        "classes": list(model.classes_),
    }

    config.ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, config.CROP_MODEL_PATH)
    return bundle


def get_crop_model():
    """Loads the cached crop recommendation model."""
    global _CROP_BUNDLE
    if _CROP_BUNDLE is None:
        if not config.CROP_MODEL_PATH.exists():
            _CROP_BUNDLE = train_crop_model()
        else:
            _CROP_BUNDLE = joblib.load(config.CROP_MODEL_PATH)
    return _CROP_BUNDLE


def recommend_crops(
    n: float,
    p: float,
    k: float,
    ph: float,
    temperature: float = None,
    humidity: float = None,
    rainfall: float = None,
    top_k: int = 3,
) -> list[dict]:
    """Recommends top matching crops that will survive and thrive on this soil.

    Adapts soil-test ratings to crop feature distributions and uses regional
    defaults for climate if not provided.
    """
    bundle = get_crop_model()
    model = bundle["model"]

    # Adapt scale: in Crop_recommendation.csv, N is 0-140, P is 5-145, K is 5-205.
    # If farmer inputs available N in kg/ha (> 140), map 560 kg/ha (ICAR high) to 140.
    n_scaled = min(140.0, n * (140.0 / 560.0)) if n > 140 else n
    k_scaled = min(205.0, k * (205.0 / 280.0)) if k > 205 else k
    p_scaled = min(145.0, p * 2.0) if p < 50 else p

    # Standard climate defaults for Indian conditions if farmer didn't provide
    temp = float(temperature) if temperature is not None else 25.0
    hum = float(humidity) if humidity is not None else 70.0
    rain = float(rainfall) if rainfall is not None else 100.0

    sample = pd.DataFrame([{
        "N": n_scaled,
        "P": p_scaled,
        "K": k_scaled,
        "temperature": temp,
        "humidity": hum,
        "ph": ph,
        "rainfall": rain,
    }])

    probabilities = model.predict_proba(sample)[0]
    sorted_indices = probabilities.argsort()[::-1]

    recommendations = []
    for idx in sorted_indices[:top_k]:
        crop_raw = model.classes_[idx]
        prob = probabilities[idx]
        if prob <= 0.0:
            continue

        crop_name = crop_raw.title()
        score_pct = round(prob * 100, 1)

        if score_pct >= 60.0:
            viability = "Highly Suitable"
        elif score_pct >= 25.0:
            viability = "Moderately Suitable"
        else:
            viability = "Conditional / Fair"

        reason = CROP_INSIGHTS.get(
            crop_raw.lower(),
            f"Compatible with soil pH {ph} and current N-P-K nutrient availability."
        )

        recommendations.append({
            "crop": crop_name,
            "suitability_score": f"{score_pct}%",
            "viability": viability,
            "survival_reason": reason,
        })

    # Fallback if all probabilities are zero on extreme outliers
    if not recommendations:
        top_crop = model.predict(sample)[0].title()
        recommendations.append({
            "crop": top_crop,
            "suitability_score": "50.0%",
            "viability": "Marginal Viability",
            "survival_reason": "Nearest matching crop; soil amendment recommended before sowing.",
        })

    return recommendations
