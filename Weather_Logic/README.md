# Weather_Logic

A clean, modular Python meteorological intelligence and forecasting engine.
It connects to Open-Meteo's open-source APIs to fetch real-time conditions, retrieves 10-day historical observations, trains a lightweight diurnal autoregressive machine learning model, forecasts conditions for the next 1-day (24h) and 3-days (72h), and provides a side-by-side comparative analysis against official Numerical Weather Prediction (NWP) physics models.

---

## 1. Directory Structure & File Reason of Existence

```text
Weather_Logic/
├── .env.example          # Configuration template for environment variables
├── config.py             # Configuration loader, parser, and boundary validator
├── weather_codes.py      # Official WMO meteorological interpretation decoder
├── api_client.py         # Resilient HTTP client for live, historical, & forecast endpoints
├── model.py              # Lightweight Ridge Autoregressive ML forecaster
├── irrigation_advisor.py # Agronomic intelligence: Rain leaching (LVI) & fungal disease alerts
├── main.py               # Main CLI orchestrator & side-by-side ASCII comparison table
├── test_weather.py       # Automated unit and integration test suite (12 test cases)
├── requirements.txt      # Minimal required production dependencies
└── README.md             # Comprehensive architecture, algorithm, and testing guide
```

### Detailed Breakdown: Why Each File Exists

| File | Primary Role | Reason of Existence & What It Does |
| :--- | :--- | :--- |
| **`.env.example`** | Environment Template | Provides a clean, declarative template of all configurable settings (`FORECAST_API_URL`, `HISTORICAL_API_URL`, `WEATHER_API_KEY`, `DEFAULT_LATITUDE`, `DEFAULT_LONGITUDE`, `HISTORICAL_DAYS`). Ensures **zero hardcoding** across the entire codebase. |
| **`config.py`** | Config Management | Reads from `.env` or system environment variables without requiring heavyweight third-party libraries. Exposes a frozen dataclass `WeatherConfig` and enforces mathematical boundary validation (e.g., latitude between $-90^\circ$ and $+90^\circ$, longitude between $-180^\circ$ and $+180^\circ$). |
| **`weather_codes.py`** | Meteorology Decoder | Open-Meteo returns weather conditions as raw World Meteorological Organization (WMO 4677) numerical codes (e.g. `0`, `3`, `61`, `95`). This module maps these codes to clear, human-readable descriptions (e.g., `"Clear sky"`, `"Overcast"`, `"Slight rain"`, `"Thunderstorm"`). |
| **`api_client.py`** | Resilient API Client | Encapsulates all network communication with Open-Meteo endpoints. Handles query parameter formatting, custom headers, timeout handling, network drops, HTTP error statuses (4xx/5xx), and converts raw JSON payloads into clean, strongly typed Pandas DataFrames. |
| **`model.py`** | Machine Learning Core | Houses `LightweightWeatherPredictor`. Trains Ridge regression models over 10-day hourly observations with diurnal time harmonics and lag features, executes recursive 72-hour forecasting, and calculates summary metrics (mean, min, max). |
| **`irrigation_advisor.py`** | Agronomic Intelligence | Translates 24h-48h and 72h forecasts into precision irrigation rules. Calculates the **Leaching Vulnerability Index (LVI)** when rain or urea is present, and detects sustained microclimates that trigger **Fungal Disease Risk Alerts** (advising ground drip over overhead sprinklers). |
| **`main.py`** | User Interface & CLI | The command-line entry point. Parses CLI flags (`--lat`, `--lon`, `--name`, `--urea-applied`, `--soil-n`, `--json`), orchestrates the fetch-train-predict pipeline, prints the current weather card, displays model justification/limitations, formats side-by-side comparative tables, and outputs farmer advisory cards (or raw JSON for UI). |
| **`test_weather.py`** | Automated Verification | Self-contained test suite with 12 unit and integration tests covering config validation, WMO decoding, ML fitting, boundary clipping, rain hold, LVI escalation, and fungal disease alerts. |
| **`requirements.txt`** | Dependency Lock | Explicitly specifies minimal dependencies (`pandas`, `numpy`, `scikit-learn`) ensuring zero bloat. |

---

## 2. Algorithms & Mathematical Methodology

### A. The Challenge: Short-Horizon (10-Day) Weather Forecasting
Predicting weather with only 10 days of hourly observations ($N = 240$ time steps) presents acute statistical challenges:
- Deep learning (LSTM, Transformer) or Prophet require months to years of data to identify yearly seasonal baselines; on 10 days, they severely overfit to high-frequency local noise.
- Pure ARIMA models often experience instability when non-stationary variance is present across multiple weather variables.

### B. Selected Algorithm: Ridge Autoregression with Cyclical Diurnal Harmonics
We implement an **$L_2$-Regularized Ridge Autoregressive Model** combined with continuous **Cyclical Diurnal Encodings** and multi-order lag features.

#### 1. Cyclical Diurnal Harmonics (Feature Engineering)
Weather exhibits strong 24-hour diurnal oscillations (temperature peaks in the afternoon and troughs right before sunrise; relative humidity behaves inversely).
To teach a linear model that hour `23` is adjacent to hour `0`, the solar hour $h \in [0, 23]$ is projected onto the unit circle:
$$\text{hour\_sin}(t) = \sin\left(\frac{2\pi \cdot h(t)}{24}\right), \quad \text{hour\_cos}(t) = \cos\left(\frac{2\pi \cdot h(t)}{24}\right)$$

#### 2. Autoregressive Temporal Lags
To capture short-term inertia and 24-hour periodicity, the feature vector for each variable $y(t)$ incorporates:
$$X(t) = \left[ \text{hour\_sin}(t),\; \text{hour\_cos}(t),\; y(t-1),\; y(t-2),\; y(t-24),\; t \right]$$
- $y(t-1), y(t-2)$: Short-term momentum and persistence.
- $y(t-24)$: Day-to-day diurnal persistence (same hour yesterday).
- $t$: Local trend slope across the 10-day training window.

#### 3. Ridge Regularization Objective
To prevent overfitting on the 240 samples and stabilize multicollinearity between lags, the model minimizes the penalized loss:
$$\min_{w} \sum_{i=1}^{N} \left(y_i - X_i w\right)^2 + \alpha \|w\|_2^2 \quad (\alpha = 1.0)$$
Training runs analytically in milliseconds and guarantees numerical stability.

#### 4. Recursive Multi-Step Horizon Rollout
For future hours $h \in [1, 168]$ (Next 7 Days):
1. The model computes $[\text{hour\_sin}, \text{hour\_cos}]$.
2. Retrieves $[y(t-1), y(t-2), y(t-24)]$ from either historical data or previously generated predictions.
3. Predicts $\hat{y}(t)$ and applies physical domain constraints:
   $$\hat{\text{humidity}} = \text{clip}(\hat{\text{humidity}}, 0\%, 100\%), \quad \hat{\text{wind\_speed}} = \max(0.0, \hat{\text{wind\_speed}})$$
4. Appends $\hat{y}(t)$ to the simulated trajectory to serve as input for subsequent hours.

---

## 3. Stated Limitations of 10-Day Training Data

1. **No Synoptic Atmospheric Physics:** The statistical model has no sensor awareness of incoming air masses, barometric pressure gradients, storm depressions, or cloud cover dynamics.
2. **Zero Seasonal Context:** 10 days represents less than 3% of an annual climate cycle, rendering the model incapable of detecting seasonal shifts (e.g., transition from summer to autumn).
3. **Recency Bias:** Any atypical weather event (such as a temporary heatwave or persistent rain) in the past 10 days will disproportionately bias future projections.
4. **Compounding Uncertainty in Multi-Step Rollout:** As predictions are recursively generated out to 168 hours (Day 7), feeding synthetic outputs back as lagged inputs causes error accumulation and dampening toward the 10-day mean.

---

## 4. Agronomic Irrigation & Crop Protection Intelligence

This module connects meteorological forecasting directly to on-field water management and the NPK soil health model:

### Feature 1: Rain & Nitrogen Leaching Alert
- **Trigger Rule:** If the weather forecast predicts $>10\text{ mm}$ rain OR $>65\%$ rain probability within the next $24\text{–}48\text{ hours}$.
- **Primary Action Alert:**
  > `"Hold irrigation! Rain predicted tomorrow. Save water and prevent Nitrogen wash-off."`
- **Leaching Vulnerability Index (LVI):**
  - **The Agronomic Hazard:** Nitrate ($\text{NO}_3^-$) is an anion that cannot bind to negatively charged soil clay platelets. Freshly applied Urea rapidly hydrolyzes and converts into soluble nitrate. Combining flood irrigation with rainfall creates downward hydraulic percolation that pushes mobile nitrate deep below the root zone, causing **40%–60% fertilizer loss** and contaminating local groundwater.
  - **LVI Formulation:**
    $$\text{LVI} = \text{clamp}\Big( \big( \text{PrecipScore}(P_{\text{sum}}) + \text{ProbScore}(P_{\text{prob}}) \big) \times \text{NitrogenMultiplier},\; 0,\; 100 \Big)$$
    - $\text{NitrogenMultiplier} = 1.0 + 0.35\;(\text{if Urea applied recently}) + 0.25\;(\text{if soil Nitrogen is low/deficient})$.
  - **Output Warning:** Warns strictly against deep flood irrigation and recommends holding water until the rainfall event passes.

### Feature 2: High Humidity & Overcast Fungal Disease Risk Alert
- **Trigger Rule:** If the forecast shows continuous high humidity ($>80\%$) and overcast skies for 3 days ($72\text{ hours}$).
- **Pathogen Etiology:** Prolonged relative humidity above 80% without direct sunlight keeps canopy leaf surfaces wet for extended periods. This microclimate triggers rapid spore germination of foliar fungal pathogens (e.g., *Phytophthora blight*, powdery mildew, rice blast, and rusts).
- **Advisory Recommendation:**
  > `"Avoid overhead / sprinkler irrigation; switch to ground drip or furrow to keep leaves dry. Delay irrigation by 24 hours."`
- **Farmer Impact:** Overhead sprinklers create splash dispersal of fungal spores and sustain wet leaf surfaces; switching to subsurface drip or delaying irrigation halts fungal propagation.

---

## 5. How to Test: Step-by-Step Instructions

### Step 1: Install Dependencies
Open your terminal and ensure dependencies are installed:
```bash
cd Weather_Logic
pip install -r requirements.txt
```

---

### Step 2: Run the Automated Test Suite (Fast Verification)
Run the automated test runner to verify that all modules, boundary validations, model fitting, and agronomic rules work correctly:
```bash
python test_weather.py
```
**Expected Output:**
```text
test_benign_weather_safe_to_irrigate (__main__.TestIrrigationAdvisor.test_benign_weather_safe_to_irrigate) ... ok
test_continuous_high_humidity_and_overcast_triggers_fungal_alert (__main__.TestIrrigationAdvisor.test_continuous_high_humidity_and_overcast_triggers_fungal_alert) ... ok
test_rain_exceeding_10mm_triggers_hold (__main__.TestIrrigationAdvisor.test_rain_exceeding_10mm_triggers_hold) ... ok
test_rain_probability_exceeding_65_pct_triggers_hold (__main__.TestIrrigationAdvisor.test_rain_probability_exceeding_65_pct_triggers_hold) ... ok
test_urea_applied_escalates_lvi (__main__.TestIrrigationAdvisor.test_urea_applied_escalates_lvi) ... ok
test_fallback_unknown_code (__main__.TestWeatherCodes.test_fallback_unknown_code) ... ok
test_known_codes (__main__.TestWeatherCodes.test_known_codes) ... ok
test_default_config_valid (__main__.TestWeatherConfig.test_default_config_valid) ... ok
test_invalid_latitude_raises (__main__.TestWeatherConfig.test_invalid_latitude_raises) ... ok
test_invalid_longitude_raises (__main__.TestWeatherConfig.test_invalid_longitude_raises) ... ok
test_fit_and_predict_horizons (__main__.TestWeatherPredictorModel.test_fit_and_predict_horizons) ... ok
test_forecast_summary_metrics (__main__.TestWeatherPredictorModel.test_forecast_summary_metrics) ... ok

----------------------------------------------------------------------
Ran 12 tests in 0.143s

OK
```

---

### Step 3: Run Live Testing Scenarios

#### Scenario A: Default City (Berlin)
Test with default configuration:
```bash
python main.py
```
**Expected Output:**
- Live current weather card for Berlin with real timestamp, temperature, humidity, wind, and WMO description.
- 240 hours of past 10-day historical observations retrieved.
- Ridge model trained in real-time.
- Side-by-side table comparing Our Model vs. API NWP Forecast for Day 1 and Day 3 with calculated Delta.

#### Scenario B: Custom Location with Agronomic Intelligence (New Delhi, India)
Test passing custom geographical coordinates with Urea application and low soil Nitrogen:
```bash
python main.py --lat 28.61 --lon 77.20 --name "New Delhi" --urea-applied --soil-n low
```

#### Scenario C: Web UI Machine-Readable Output (JSON Mode)
Export the complete forecast, comparative analysis, and irrigation advisory in structured JSON for frontend UI consumption:
```bash
python main.py --lat 28.61 --lon 77.20 --json
```

#### Scenario D: Custom Location (New York, USA)
```bash
python main.py --lat 40.71 --lon -74.00 --name "New York"
```

#### Scenario D: Error Handling Test (Negative Testing)
Test how the application handles invalid coordinates:
```bash
python3 main.py --lat 999.0
```
**Expected Output:**
```text
>>> Initiating Weather_Logic Data Retrieval & Prediction Workflow...

[*] Calling Current & Forecast API for Berlin (lat: 999.0, lon: 13.41)...

[!] API Error encountered: HTTP Error 400: Bad Request - Latitude must be in range of -90 to 90°. Given: 999.0.
[!] Please verify your network connection, coordinates, or API endpoint URL.
```
Notice that the program handles the API failure gracefully and exits cleanly without unhandled Python stack traces.

---

## 6. Sample Comparative Output Table & Agronomic Card

```text
==================================================================================
  SIDE-BY-SIDE FORECAST COMPARISON (Our Model vs. Open-Meteo NWP Forecast)
==================================================================================
+-------------+---------------------+----------+--------------+----------------+----------------+
| Horizon     | Metric              | Unit     | Our Model    | API Forecast   | Delta (Diff)   |
+-------------+---------------------+----------+--------------+----------------+----------------+
| Next 1-Day  | Temperature (Avg)   | °C       | 23.9         | 24.3           | -0.4 °C        |
|             | Temperature (Min)   | °C       | 21.3         | 19.8           | +1.5 °C        |
|             | Temperature (Max)   | °C       | 26.6         | 29.1           | -2.5 °C        |
|             | Humidity (Avg)      | %        | 76.9         | 65.9           | +11.0 %        |
|             | Humidity (Min)      | %        | 63.5         | 44.0           | +19.5 %        |
|             | Humidity (Max)      | %        | 89.2         | 82.0           | +7.2 %         |
|             | Wind Speed (Avg)    | km/h     | 2.3          | 3.9            | -1.6 km/h      |
|             | Wind Speed (Max)    | km/h     | 2.6          | 6.2            | -3.6 km/h      |
+-------------+---------------------+----------+--------------+----------------+----------------+
| Next 3-Days | Temperature (Avg)   | °C       | 23.3         | 24.0           | -0.7 °C        |
|             | Temperature (Min)   | °C       | 20.0         | 18.8           | +1.2 °C        |
|             | Temperature (Max)   | °C       | 26.6         | 29.8           | -3.2 °C        |
|             | Humidity (Avg)      | %        | 78.8         | 65.4           | +13.4 %        |
|             | Humidity (Min)      | %        | 63.5         | 40.0           | +23.5 %        |
|             | Humidity (Max)      | %        | 95.0         | 82.0           | +13.0 %        |
|             | Wind Speed (Avg)    | km/h     | 1.6          | 5.0            | -3.4 km/h      |
|             | Wind Speed (Max)    | km/h     | 2.6          | 7.9            | -5.3 km/h      |
+-------------+---------------------+----------+--------------+----------------+----------------+

==================================================================================
  AGRONOMIC IRRIGATION & CROP PROTECTION ADVISORY (FOR FARMERS / UI)
==================================================================================
  STATUS BANNER: [HOLD_IRRIGATION]
  >>> CRITICAL ACTION: Hold irrigation immediately! Rain expected within 24-48 hours.
----------------------------------------------------------------------------------
[1] RAIN & NITROGEN LEACHING INTELLIGENCE (24h - 48h Horizon):
  • 24-48h Total Rain:      18.4 mm
  • Peak Rain Probability:  85 %
  • Trigger Status:         ACTIVE (THRESHOLD EXCEEDED)
  • Action Recommendation:  HOLD_IRRIGATION
  • Alert Message:          "Hold irrigation! Rain predicted tomorrow. Save water and prevent Nitrogen wash-off."

  [LEACHING VULNERABILITY INDEX (LVI)]: 72.8 / 100 [CRITICAL]
  • Farmer Urea Applied:    YES (High Leaching Hazard)
  • Soil Nitrogen Status:   LOW
  • Agronomic Impact:       CRITICAL HAZARD: Deep flood irrigation must be strictly avoided! High rainfall will flush mobile nitrate (NO3-) past root depth. Applying water now guarantees severe fertilizer loss.
----------------------------------------------------------------------------------
[2] FUNGAL DISEASE RISK & CANOPY MANAGEMENT (72h / 3-Day Horizon):
  • 3-Day Average Humidity: 86.2 %
  • Hours Humidity >= 80%:  54 / 72 hours
  • Overcast / Wet Hours:   42 / 72 hours
  • Disease Risk Level:     [HIGH]
  • Advisory Recommendation:
    "Avoid overhead / sprinkler irrigation; switch to ground drip or furrow to keep leaves dry. Delay irrigation by 24 hours."
  • Pathogen Rationale:
    Extended canopy wetness without direct solar radiation accelerates fungal spore germination (e.g., Phytophthora blight, powdery mildew, blast). Overhead sprinklers will exacerbate foliar dampness and splash spores across rows.
==================================================================================
```

---

## 7. Frontend UI Integration Guide (Next.js / React / Tailwind)

The backend provides a clean JSON API interface when executed with `--json`:

```bash
python main.py --lat 28.61 --lon 77.20 --urea-applied --soil-n low --json
```

### A. UI Design System Tokens & Color Guidelines

| Status Code | Severity | Tailwind Classes | Meaning / Action |
| :--- | :--- | :--- | :--- |
| `HOLD_IRRIGATION` | Critical | `bg-red-500/15 text-red-400 border border-red-500/30` | Rain $>10\text{ mm}$ or prob $>65\%$. Immediate water shutoff. |
| `DELAY_24H_SWITCH_TO_DRIP` | High Warning | `bg-amber-500/15 text-amber-400 border border-amber-500/30` | Sustained humidity $>80\%$ + overcast. Stop sprinklers. |
| `SWITCH_TO_DRIP` | Moderate | `bg-yellow-500/15 text-yellow-400 border border-yellow-500/30` | Elevated humidity. Ground drip preferred. |
| `SAFE_TO_IRRIGATE` | Optimal | `bg-emerald-500/15 text-emerald-400 border border-emerald-500/30` | Clear skies, normal moisture. Safe to irrigate. |

### B. Leaching Vulnerability Index (LVI) UI Gauge Mapping
- **0 – 35 (Low / Green):** Normal fertilizer stability.
- **36 – 65 (Moderate / Amber):** Hold top-dressing fertilizers; light drip permissible.
- **66 – 100 (Critical / Red):** Deep flood irrigation prohibited; high leaching alert.

### C. Sample Next.js / React Integration Hook

```tsx
// Example integration for Next.js Frontend (src/components/WeatherAdvisoryCard.tsx)
import React from 'react';

export interface WeatherAdvisoryProps {
  overall_irrigation_status: 'HOLD_IRRIGATION' | 'DELAY_24H_SWITCH_TO_DRIP' | 'SWITCH_TO_DRIP' | 'SAFE_TO_IRRIGATE';
  summary_banner: string;
  rain_and_leaching: {
    triggered: boolean;
    predicted_precip_24_48h_mm: number;
    max_rain_probability_pct: number;
    alert_message: string;
    leaching_vulnerability_index: number | null;
    leaching_risk_level: string;
    leaching_details: string;
  };
  fungal_disease_risk: {
    triggered: boolean;
    risk_level: string;
    avg_humidity_3d_pct: number;
    hours_above_80_pct_humidity: number;
    recommendation: string;
    agronomic_rationale: string;
  };
}

export const WeatherAdvisoryCard: React.FC<{ data: WeatherAdvisoryProps }> = ({ data }) => {
  const isHold = data.overall_irrigation_status === 'HOLD_IRRIGATION';

  return (
    <div className={`p-6 rounded-2xl border ${isHold ? 'bg-red-950/20 border-red-500/40 text-red-200' : 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-white/10">
          {data.overall_irrigation_status.replace(/_/g, ' ')}
        </span>
        {data.rain_and_leaching.leaching_vulnerability_index && (
          <span className="text-sm font-semibold">
            LVI Score: {data.rain_and_leaching.leaching_vulnerability_index} / 100
          </span>
        )}
      </div>

      <h3 className="text-lg font-bold mb-2">{data.summary_banner}</h3>
      <p className="text-sm opacity-90 mb-4">{data.rain_and_leaching.alert_message}</p>

      {data.fungal_disease_risk.triggered && (
        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
          <p className="font-semibold text-sm">Fungal Spore Risk Active ({data.fungal_disease_risk.risk_level})</p>
          <p className="text-xs mt-1">{data.fungal_disease_risk.recommendation}</p>
        </div>
      )}
    </div>
  );
};
```

