"""Basic configuration and mappings."""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "icar_soil_health_model_ready.csv"
CROP_DATA_PATH = BASE_DIR / "Crop_recommendation.csv"
ARTIFACT_DIR = BASE_DIR / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "soil_health_model.joblib"
CROP_MODEL_PATH = ARTIFACT_DIR / "crop_model.joblib"

# Model input features
NUMERIC_FEATURES = [
    "Nitrogen_N_kg_ha",
    "Phosphorus_P_kg_ha",
    "Potassium_K_kg_ha",
    "pH",
    "Electrical_Conductivity_dS_m",
    "Organic_Carbon_Percent",
    "Sulphur_S_ppm",
    "Zinc_Zn_ppm",
    "Iron_Fe_ppm",
    "Copper_Cu_ppm",
    "Manganese_Mn_ppm",
    "Boron_B_ppm",
]

CATEGORICAL_FEATURES = ["Targeted_Crop"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "Soil_Health_Status"

# Standard risk mapping
LABEL_TO_RISK = {
    "Healthy/Balanced": "Low Risk",
    "Nutrient Deficient": "High Risk",
    "Degraded/Critical": "Critical Risk",
}
