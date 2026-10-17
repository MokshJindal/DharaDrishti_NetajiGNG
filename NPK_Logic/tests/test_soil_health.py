"""Automated test suite verifying the ML model, agronomic rules, and REST API."""
import pytest
from fastapi.testclient import TestClient

from soil_health.api import app
from soil_health.predict import predict, predict_batch

SAMPLE_HEALTHY = {
    "N": 380,
    "P": 25,
    "K": 260,
    "pH": 6.8,
    "EC": 0.5,
    "OC": 0.7,
    "crop": "Wheat",
}

SAMPLE_DEFICIENT = {
    "N": 150,
    "P": 6,
    "K": 95,
    "pH": 6.5,
    "EC": 0.4,
    "OC": 0.35,
    "crop": "Rice",
}

SAMPLE_CRITICAL_PH = {
    "N": 350,
    "P": 20,
    "K": 250,
    "pH": 4.8,  # Strongly acidic
    "EC": 0.5,
    "crop": "Cotton",
}


def test_prediction_healthy():
    result = predict(SAMPLE_HEALTHY)
    assert result["risk_category"] in ["Low Risk", "Moderate Risk"]
    assert result["confidence"] is not None
    assert isinstance(result["deficiencies"], list)
    assert "Nitrogen" in result["nutrient_assessments"]
    assert "recommended_crops" in result
    assert len(result["recommended_crops"]) > 0
    assert "crop" in result["recommended_crops"][0]
    assert "survival_reason" in result["recommended_crops"][0]


def test_crop_recommendation_climate_inputs():
    # Rice profile with high moisture / rainfall
    rice_sample = {
        "N": 80,
        "P": 45,
        "K": 40,
        "pH": 6.5,
        "temperature": 24.0,
        "humidity": 82.0,
        "rainfall": 220.0,
    }
    result = predict(rice_sample)
    top_crops = [c["crop"].lower() for c in result["recommended_crops"]]
    assert any(c in top_crops for c in ["rice", "jute", "banana"])


def test_prediction_deficient():
    result = predict(SAMPLE_DEFICIENT)
    assert result["risk_category"] in ["High Risk", "Moderate Risk"]
    assert len(result["deficiencies"]) > 0


def test_prediction_critical_override():
    result = predict(SAMPLE_CRITICAL_PH)
    assert result["risk_category"] == "Critical Risk"
    assert any("Acidic" in d for d in result["deficiencies"])


def test_insufficient_data():
    # Missing Nitrogen and pH
    incomplete = {"P": 20, "K": 200}
    result = predict(incomplete)
    assert result["risk_category"] == "Insufficient Data"
    assert "Missing mandatory parameter" in result["explanation"]


def test_unit_conversion():
    # Provide values in mg/kg (ppm) instead of kg/ha
    ppm_sample = {
        "N": 100,  # 100 * 2.24 = 224 kg/ha
        "P": 10,
        "K": 100,
        "pH": 7.0,
        "units": {"macro": "mg/kg"},
    }
    result = predict(ppm_sample)
    assert result["inputs_received"]["Nitrogen_N_kg_ha"] == 224.0


def test_batch_prediction():
    results = predict_batch([SAMPLE_HEALTHY, SAMPLE_DEFICIENT])
    assert len(results) == 2
    assert results[0]["risk_category"] != "Insufficient Data"
    assert results[1]["risk_category"] != "Insufficient Data"


def test_fastapi_endpoints():
    client = TestClient(app)
    
    # Test health check
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "healthy"

    # Test single prediction
    pred_resp = client.post("/predict", json=SAMPLE_HEALTHY)
    assert pred_resp.status_code == 200
    assert "risk_category" in pred_resp.json()

    # Test batch prediction
    batch_resp = client.post("/predict/batch", json=[SAMPLE_HEALTHY, SAMPLE_DEFICIENT])
    assert batch_resp.status_code == 200
    assert len(batch_resp.json()) == 2
