"""Simple and practical inference engine combining ML model with ICAR rules."""
from pathlib import Path
import joblib
import pandas as pd

from . import agronomy, config, crop_recommender, features

# Load model on module import for high performance
_MODEL_BUNDLE = None


def get_model():
    global _MODEL_BUNDLE
    if _MODEL_BUNDLE is None:
        if not config.MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found at {config.MODEL_PATH}. "
                "Please run `python -m soil_health.train` first."
            )
        _MODEL_BUNDLE = joblib.load(config.MODEL_PATH)
    return _MODEL_BUNDLE


def predict(input_data: dict) -> dict:
    """Predicts soil health risk and provides an agronomic assessment.

    Args:
        input_data: dict with nutrient values (e.g., {"N": 240, "P": 12, "K": 180, "pH": 6.8})

    Returns:
        Structured prediction dict with risk category, deficiencies, and confidence.
    """
    clean = features.normalize_input(input_data)

    # 1. Check for required core parameters
    required = ["Nitrogen_N_kg_ha", "Phosphorus_P_kg_ha", "Potassium_K_kg_ha", "pH"]
    missing = [req for req in required if req not in clean]

    if missing:
        return {
            "risk_category": "Insufficient Data",
            "soil_health_status": "Unknown",
            "confidence": None,
            "deficiencies": [],
            "nutrient_assessments": {},
            "recommended_crops": [],
            "explanation": f"Missing mandatory parameter(s): {', '.join(missing)}. "
                           "Please provide Nitrogen (N), Phosphorus (P), Potassium (K), and pH.",
            "inputs_received": clean,
        }

    # 2. Rule-based evaluation against ICAR standard thresholds
    eval_result = agronomy.evaluate_nutrients(clean)
    deficiencies = eval_result["deficiencies"]
    assessments = eval_result["assessments"]

    # 3. Crop Recommendation (Trained on Crop_recommendation.csv)
    recommended_crops = crop_recommender.recommend_crops(
        n=clean["Nitrogen_N_kg_ha"],
        p=clean["Phosphorus_P_kg_ha"],
        k=clean["Potassium_K_kg_ha"],
        ph=clean["pH"],
        temperature=clean.get("temperature"),
        humidity=clean.get("humidity"),
        rainfall=clean.get("rainfall"),
        top_k=3,
    )

    # 4. ML Model Prediction
    bundle = get_model()
    pipeline = bundle["pipeline"]

    # Build single-row DataFrame for pipeline
    row = {col: clean.get(col, None) for col in config.ALL_FEATURES}
    df_row = pd.DataFrame([row])

    ml_label = pipeline.predict(df_row)[0]
    probabilities = pipeline.predict_proba(df_row)[0]
    class_idx = list(pipeline.classes_).index(ml_label)
    confidence = round(float(probabilities[class_idx]), 3)

    # 5. Determine overall Risk Category
    risk_category = config.LABEL_TO_RISK.get(ml_label, "Moderate Risk")

    # Agronomic safety override:
    # If soil is strongly acidic (pH < 5.5) or strongly alkaline (pH > 8.5) or very saline (EC > 2.5), it's Critical Risk
    ph_val = clean.get("pH")
    ec_val = clean.get("Electrical_Conductivity_dS_m")
    if (ph_val and (ph_val < 5.5 or ph_val > 8.5)) or (ec_val and ec_val > 2.5):
        risk_category = "Critical Risk"
    elif risk_category == "Low Risk" and len(deficiencies) > 0:
        # If model says Healthy but specific nutrient is low, mark as Moderate Risk
        risk_category = "Moderate Risk"

    # 6. Build concise explanation
    crop_names = [c["crop"] for c in recommended_crops[:2]]
    crop_str = f" Recommended crops for this soil: {', '.join(crop_names)}." if crop_names else ""

    if risk_category == "Low Risk":
        explanation = f"Soil parameters are well-balanced and within optimal ICAR ranges.{crop_str}"
    elif risk_category == "Moderate Risk":
        explanation = f"Soil is generally viable, but {len(deficiencies)} nutrient deficiency/imbalance was detected.{crop_str}"
    elif risk_category == "High Risk":
        explanation = f"Significant nutrient deficiencies detected ({', '.join(deficiencies[:3])}). Targeted fertilization needed.{crop_str}"
    elif risk_category == "Critical Risk":
        explanation = f"Soil condition is degraded (extreme pH, high salinity, or severe multi-nutrient depletion). Soil reclamation required before planting.{crop_str}"
    else:
        explanation = f"Assessment completed.{crop_str}"

    return {
        "risk_category": risk_category,
        "soil_health_status": ml_label,
        "confidence": confidence,
        "deficiencies": deficiencies,
        "nutrient_assessments": assessments,
        "recommended_crops": recommended_crops,
        "explanation": explanation,
        "inputs_received": clean,
    }


def predict_batch(records: list[dict]) -> list[dict]:
    """Batch prediction helper."""
    return [predict(rec) for rec in records]
