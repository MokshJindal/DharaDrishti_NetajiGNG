# Soil Health Risk Prediction Backend

A working machine learning backend designed to help Indian farmers assess soil health, detect nutrient deficiencies, identify risks, and **recommend the optimal crops that will survive and thrive** on their soil.

---

## 1. Supported Farmer Inputs

Farmers can provide laboratory test results from an Indian **Soil Health Card (SHC)** or private soil testing laboratory:

| Parameter | Accepted Shorthand | Standard Unit | Status in Backend | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Available Nitrogen** | `N`, `nitrogen` | kg/ha | **Mandatory** | Available Nitrogen |
| **Available Phosphorus** | `P`, `phosphorus` | kg/ha (elemental P) | **Mandatory** | Available Phosphorus |
| **Available Potassium** | `K`, `potassium` | kg/ha (elemental K) | **Mandatory** | Available Potassium |
| **Soil pH** | `pH`, `soil_ph` | pH units (1:2 water) | **Mandatory** | Acidity / Alkalinity level |
| **Electrical Conductivity** | `EC`, `ec` | dS/m (1:2 extract) | Optional | Soil salinity |
| **Organic Carbon** | `OC`, `organic_carbon` | % | Optional | Soil organic matter |
| **Sulphur** | `S`, `sulphur` | ppm (mg/kg) | Optional | Secondary nutrient |
| **Zinc** | `Zn`, `zinc` | ppm (mg/kg) | Optional | Micronutrient |
| **Iron** | `Fe`, `iron` | ppm (mg/kg) | Optional | Micronutrient |
| **Copper** | `Cu`, `copper` | ppm (mg/kg) | Optional | Micronutrient |
| **Manganese** | `Mn`, `manganese` | ppm (mg/kg) | Optional | Micronutrient |
| **Boron** | `B`, `boron` | ppm (mg/kg) | Optional | Micronutrient |
| **Targeted Crop** | `crop`, `crop_type` | text (e.g., Rice, Wheat) | Optional | Targeted crop |
| **Temperature** | `temperature`, `temp` | °C | Optional | Growing temperature (default: 25.0) |
| **Humidity** | `humidity` | % | Optional | Relative humidity (default: 70.0) |
| **Rainfall** | `rainfall`, `rain` | mm | Optional | Rainfall (default: 100.0) |

### Automatic Unit Conversion
Farmers can supply values in alternate units:
```json
{
  "N": 120, "P": 40, "K": 80, "pH": 7.0,
  "units": {
    "macro": "mg/kg",
    "phosphorus_form": "P2O5",
    "potassium_form": "K2O"
  }
}
```
* `units.macro`: `"mg/kg"` or `"ppm"` $\rightarrow$ automatically converted to `kg/ha` ($\times 2.24$).
* `units.phosphorus_form`: `"P2O5"` $\rightarrow$ converted to elemental P ($\times 0.4364$).
* `units.potassium_form`: `"K2O"` $\rightarrow$ converted to elemental K ($\times 0.8301$).

### Missing Data Handling
* If **N, P, K, or pH** is omitted $\rightarrow$ returns **`Insufficient Data`** (no reliable assessment can be made).
* Optional parameters $\rightarrow$ imputed automatically using median values inside the ML pipeline.

---

## 2. Machine Learning Models Used & Their Purpose

1. **Soil Health Risk Model (`DecisionTreeClassifier`):**
   * *Dataset:* `icar_soil_health_model_ready.csv` (150 Soil Health Card samples).
   * *Purpose:* Production ML model for soil condition classification (`Healthy/Balanced`, `Nutrient Deficient`, `Degraded/Critical`). Captures non-linear threshold splits without artificial smoothing (83.33% test accuracy, 0.6905 Macro F1).
2. **Crop Recommendation Model (`RandomForestClassifier`):**
   * *Dataset:* `Crop_recommendation.csv` (2,200 multi-crop samples covering 22 major Indian crops).
   * *Purpose:* Predicts the top 3 best-suited crops that will survive and thrive based on soil N, P, K, pH and climate conditions (achieves 99.55% test accuracy).
3. **SimpleImputer + StandardScaler (`ColumnTransformer` pipeline):**
   * *Purpose:* Handles missing optional inputs and normalizes continuous numerical features.

---

## 3. Purpose of Every File & Folder in the Repository

```text
NPK_Logic/
├── icar_soil_health_model_ready.csv    <- Dataset (150 Maharashtra Soil Health Card samples)
├── Crop_recommendation.csv            <- Dataset (2,200 multi-crop agricultural samples across 22 crops)
├── requirements.txt                   <- Python libraries required to run the backend
├── .gitignore                         <- Excludes temporary build & cache files from Git
├── README.md                          <- Project overview, quickstart, and file descriptions
├── soil_health/                       <- Python backend package
│   ├── __init__.py                    <- Package initialization marker
│   ├── config.py                      <- File paths, features list, and risk category mappings
│   ├── agronomy.py                    <- ICAR nutrient thresholds and deficiency evaluations
│   ├── features.py                    <- Input normalization (aliases and unit conversions)
│   ├── crop_recommender.py            <- Crop Recommendation engine (top 3 crops + survival reasons)
│   ├── train.py                       <- Trains both models and saves .joblib artifacts
│   ├── predict.py                     <- Unified inference engine (ML prediction + ICAR rules + crop recommendation)
│   └── api.py                         <- FastAPI REST service (/predict, /predict/batch, /health)
├── artifacts/
│   ├── soil_health_model.joblib       <- Saved Soil Health Risk ML pipeline artifact
│   ├── crop_model.joblib              <- Saved Crop Recommendation ML model artifact
│   └── evaluation_report.md           <- Technical documentation & validation results
├── tests/
│   └── test_soil_health.py            <- Automated tests verifying model predictions, crops, and API
├── .pytest_cache/                     <- Automatically generated test cache directory
└── __pycache__/                       <- Automatically generated Python bytecode cache
```

---

## 4. Understanding Cache & Testing Folders

### What is `__pycache__/`?
* **What it is:** When you run Python files, the Python interpreter compiles `.py` source code into compiled bytecode files ending in `.pyc` (Python Compiled).
* **Where it is created:** Python automatically places these files inside a hidden `__pycache__/` folder next to your scripts.
* **Why it exists:** Performance optimization. Bytecode loading avoids re-parsing source code on every execution, making Python startup much faster.
* **Can it be deleted?** Yes. If you delete it, Python will simply recreate it the next time you execute a script. It should **never** be committed to Git (it is listed in `.gitignore`).

### What is `.pytest_cache/`?
* **What it is:** A directory generated automatically by the `pytest` testing framework.
* **Why it exists:** It caches test session information (such as which tests failed previously, test run durations, and file modification timestamps). This allows commands like `pytest --lf` (run last-failed tests only) to execute quickly.
* **Can it be deleted?** Yes. It contains no application logic and is safely excluded via `.gitignore`.

### What is the `tests/` Folder & `test_soil_health.py`?
* **What it is:** An automated quality assurance suite for the backend.
* **Why it matters:** Instead of manually typing values to check if the model works, running `pytest` automatically executes 7 rigorous verification checks:
  1. `test_prediction_healthy`: Verifies healthy soil receives Low/Moderate Risk.
  2. `test_prediction_deficient`: Verifies low N/P/K returns High Risk and lists deficiencies.
  3. `test_prediction_critical_override`: Verifies extreme pH (< 5.5) triggers Critical Risk safety override.
  4. `test_insufficient_data`: Verifies missing N/pH returns `Insufficient Data`.
  5. `test_unit_conversion`: Verifies ppm ($\text{mg/kg}$) inputs convert to $\text{kg/ha}$ accurately.
  6. `test_batch_prediction`: Verifies batch inference works across multiple samples simultaneously.
  7. `test_fastapi_endpoints`: Simulates HTTP requests against `/predict`, `/predict/batch`, and `/health`.

---

## 5. How to Run

### Install Dependencies
```bash
pip install -r requirements.txt
```

### Train the ML Model
```bash
python3 -m soil_health.train
```

### Run Tests
```bash
python3 -m pytest tests/test_soil_health.py -v
```

### Python Inference Example
```python
from soil_health.predict import predict

result = predict({
    "N": 200,
    "P": 8.0,
    "K": 120,
    "pH": 6.5,
    "crop": "Wheat"
})

print("Risk Category:    ", result["risk_category"])
print("Health Status:    ", result["soil_health_status"])
print("Deficiencies:     ", result["deficiencies"])
print("Recommended Crops:", result["recommended_crops"])
print("Explanation:      ", result["explanation"])
```

### Start the REST API
```bash
uvicorn soil_health.api:app --reload
```
Interactive Swagger API documentation will be available at: `http://127.0.0.1:8000/docs`.
