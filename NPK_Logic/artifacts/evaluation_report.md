# Soil Health Risk Model — Documentation & Evaluation

## 1. Supported Farmer Inputs

Farmers can provide laboratory test results from an Indian **Soil Health Card (SHC)** or a local soil testing lab. The backend accepts both raw numerical values and familiar shorthand aliases.

### Input Table
| Parameter | Shorthand Aliases | Standard Unit | Requirement | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Nitrogen** | `N`, `nitrogen` | kg/ha | **Mandatory** | Available Nitrogen |
| **Phosphorus** | `P`, `phosphorus` | kg/ha (elemental P) | **Mandatory** | Available Phosphorus |
| **Potassium** | `K`, `potassium` | kg/ha (elemental K) | **Mandatory** | Available Potassium |
| **Soil pH** | `pH`, `soil_ph` | pH scale (1:2 water) | **Mandatory** | Acidity / Alkalinity level |
| **Electrical Conductivity** | `EC`, `ec` | dS/m (1:2 extract) | Optional | Salinity assessment |
| **Organic Carbon** | `OC`, `organic_carbon` | % | Optional | Soil organic matter |
| **Sulphur** | `S`, `sulphur` | ppm (mg/kg) | Optional | Secondary nutrient |
| **Zinc** | `Zn`, `zinc` | ppm (mg/kg) | Optional | DTPA micronutrient |
| **Iron** | `Fe`, `iron` | ppm (mg/kg) | Optional | DTPA micronutrient |
| **Copper** | `Cu`, `copper` | ppm (mg/kg) | Optional | DTPA micronutrient |
| **Manganese** | `Mn`, `manganese` | ppm (mg/kg) | Optional | DTPA micronutrient |
| **Boron** | `B`, `boron` | ppm (mg/kg) | Optional | Hot-water soluble micronutrient |
| **Crop** | `crop`, `crop_type` | text (e.g. Rice, Wheat) | Optional | Targeted crop |

#### Unit Normalization for Farmers
If a farmer provides measurements in alternate units:
* `mg/kg` or `ppm` $\rightarrow$ automatically converted to `kg/ha` using the furrow-slice depth conversion ($1\text{ mg/kg} \times 2.24 = \text{kg/ha}$).
* `P2O5` $\rightarrow$ converted to elemental P ($\times 0.4364$).
* `K2O` $\rightarrow$ converted to elemental K ($\times 0.8301$).

#### Missing Data Handling
* If **N, P, K, or pH** is missing, the backend returns **`Insufficient Data`** because no reliable agronomic assessment is possible without core fertility and soil reaction.
* Other parameters (EC, OC, micronutrients, crop) are optional. When omitted, the model imputes medians using its standard preprocessing pipeline and assesses whichever nutrients were supplied.

---

## 2. Machine Learning Models Used & Their Purpose

| Model / Component | Dataset & Algorithm | Purpose & Performance |
| :--- | :--- | :--- |
| **Soil Health Risk Model** | `icar_soil_health_model_ready.csv` (150 samples) <br>`DecisionTreeClassifier` | Classifies overall soil condition (`Healthy/Balanced`, `Nutrient Deficient`, `Degraded/Critical`). Captures non-linear thresholds in soil chemistry (83.33% accuracy, 0.6905 Macro F1). |
| **Crop Recommendation Model** | `Crop_recommendation.csv` (2,200 samples, 22 crops) <br>`RandomForestClassifier(n_estimators=100)` | Predicts the **Top 3 optimal crops** that will survive and thrive based on soil N, P, K, pH and climate conditions (99.55% test accuracy). |
| **SimpleImputer + StandardScaler** | Preprocessing Pipeline | Automatically fills omitted optional inputs with training medians and normalizes continuous features. |

---

## 3. Structure and Purpose of Every File and Folder

```text
NPK_Logic/
├── icar_soil_health_model_ready.csv    <- Dataset (150 Maharashtra Soil Health Card samples)
├── requirements.txt                   <- Project dependencies (scikit-learn, fastapi, pandas, etc.)
├── .gitignore                         <- Excludes temporary build & cache files from Git
├── README.md                          <- Project overview and quick start guide
├── soil_health/                       <- Python backend package
│   ├── __init__.py                    <- Package marker
│   ├── config.py                      <- File paths, feature list, and target risk mapping
│   ├── agronomy.py                    <- ICAR threshold values and deficiency evaluation logic
│   ├── features.py                    <- Input normalization (aliases and unit conversions)
│   ├── train.py                       <- End-to-end model training, evaluation, and artifact export
│   ├── predict.py                     <- Inference engine combining ML prediction and ICAR rules
│   └── api.py                         <- FastAPI REST endpoints (/predict, /predict/batch, /health)
├── artifacts/
│   ├── soil_health_model.joblib       <- Saved, runnable ML model pipeline
│   └── evaluation_report.md           <- Technical documentation & farmer input specifications
├── tests/
│   └── test_soil_health.py            <- Automated pytest suite (7 tests verifying ML & API)
├── .pytest_cache/                     <- Automatically generated test cache directory
└── __pycache__/                       <- Automatically generated Python bytecode cache
```

---

## 4. Understanding Cache & Testing Directories

### What is `__pycache__/`?
* **Mechanism:** When Python executes `.py` files, it compiles human-readable source code into bytecode files (`.pyc`).
* **Location:** Stored in a local `__pycache__/` directory.
* **Benefit:** Accelerates subsequent program launches by skipping code parsing when source files have not changed.
* **Management:** Fully disposable and excluded from Git via `.gitignore`.

### What is `.pytest_cache/`?
* **Mechanism:** Created by the `pytest` test runner to maintain session state.
* **Benefit:** Records test outcome histories (e.g. tracks failed tests for the `--last-failed` flag) and speeds up re-runs.
* **Management:** Fully disposable and excluded from Git via `.gitignore`.

### Purpose of the `tests/` Directory
The `tests/` folder contains automated tests that safeguard against regressions:
* `test_prediction_healthy`: Verifies healthy soil receives Low/Moderate Risk.
* `test_prediction_deficient`: Verifies low N/P/K returns High Risk and lists deficiencies.
* `test_prediction_critical_override`: Verifies extreme pH (< 5.5) triggers Critical Risk safety override.
* `test_insufficient_data`: Verifies missing N/pH returns `Insufficient Data`.
* `test_unit_conversion`: Verifies ppm ($\text{mg/kg}$) inputs convert to $\text{kg/ha}$ accurately.
* `test_batch_prediction`: Verifies batch inference works across multiple samples simultaneously.
* `test_fastapi_endpoints`: Tests the REST API endpoints (`/predict`, `/predict/batch`, `/health`).

---

## 5. Test Results & Validation

Running the automated test suite:
```bash
python3 -m pytest tests/test_soil_health.py -v
```
Output:
* `test_prediction_healthy`: PASSED
* `test_prediction_deficient`: PASSED
* `test_prediction_critical_override`: PASSED
* `test_insufficient_data`: PASSED
* `test_unit_conversion`: PASSED
* `test_batch_prediction`: PASSED
* `test_fastapi_endpoints`: PASSED
