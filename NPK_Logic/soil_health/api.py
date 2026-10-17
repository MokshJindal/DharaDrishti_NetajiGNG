"""FastAPI REST Service for Soil Health Risk Prediction."""
from typing import Any, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .predict import get_model, predict, predict_batch

app = FastAPI(
    title="Soil Health Risk Prediction API",
    description="Machine Learning & Agronomic Decision Support Backend for Indian Farmers",
    version="1.0.0",
)


class SoilSample(BaseModel):
    Nitrogen_N_kg_ha: Optional[float] = Field(None, description="Available N in kg/ha (alias: N)")
    Phosphorus_P_kg_ha: Optional[float] = Field(None, description="Available P in kg/ha (alias: P)")
    Potassium_K_kg_ha: Optional[float] = Field(None, description="Available K in kg/ha (alias: K)")
    pH: Optional[float] = Field(None, description="Soil pH value")
    Electrical_Conductivity_dS_m: Optional[float] = Field(None, description="EC in dS/m (alias: EC)")
    Organic_Carbon_Percent: Optional[float] = Field(None, description="Organic Carbon % (alias: OC)")
    Sulphur_S_ppm: Optional[float] = Field(None, description="Available Sulphur in ppm")
    Zinc_Zn_ppm: Optional[float] = Field(None, description="Available Zinc in ppm")
    Iron_Fe_ppm: Optional[float] = Field(None, description="Available Iron in ppm")
    Copper_Cu_ppm: Optional[float] = Field(None, description="Available Copper in ppm")
    Manganese_Mn_ppm: Optional[float] = Field(None, description="Available Manganese in ppm")
    Boron_B_ppm: Optional[float] = Field(None, description="Available Boron in ppm")
    Targeted_Crop: Optional[str] = Field(None, description="Target crop (e.g., Rice, Wheat, Cotton)")
    temperature: Optional[float] = Field(None, description="Temperature in °C (default: 25.0)")
    humidity: Optional[float] = Field(None, description="Relative humidity in % (default: 70.0)")
    rainfall: Optional[float] = Field(None, description="Rainfall in mm (default: 100.0)")

    model_config = {"extra": "allow"}


@app.get("/health")
def health_check():
    """Returns model status and metadata."""
    bundle = get_model()
    return {
        "status": "healthy",
        "model_name": bundle.get("model_name", "Trained ML Model"),
        "features": bundle.get("features", []),
        "classes": bundle.get("classes", []),
    }


@app.post("/predict")
def predict_soil_health(sample: dict):
    """Predicts soil health risk and provides deficiency assessment for one sample."""
    return predict(sample)


@app.post("/predict/batch")
def predict_soil_health_batch(samples: List[dict]):
    """Predicts soil health risk for multiple soil samples."""
    if len(samples) > 1000:
        raise HTTPException(status_code=400, detail="Batch size exceeds limit of 1000 samples.")
    return predict_batch(samples)
