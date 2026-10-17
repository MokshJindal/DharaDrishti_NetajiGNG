"""
Weather Prediction Model for Weather_Logic.
Uses Ridge Autoregression with Cyclical Diurnal Harmonics (sine/cosine time encoding)
to forecast next 1-day (24 hours) and 3-day (72 hours) weather conditions.
"""

from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge


class LightweightWeatherPredictor:
    """
    Lightweight autoregressive weather predictor designed for short-horizon (10-day) training data.
    """

    MODEL_JUSTIFICATION = (
        "We chose a regularized Ridge Autoregressive model augmented with cyclical diurnal harmonics "
        "(sine and cosine hour encodings) and autoregressive lags (t-1, t-2, t-24). With only 10 days "
        "(240 hours) of data, heavy models like Prophet or deep networks overfit to local noise, "
        "whereas Ridge is computationally instantaneous, resistant to small-sample collinearity, "
        "and naturally captures day-night temperature and humidity oscillations."
    )

    DATA_LIMITATIONS = [
        "No Synoptic Physics: The model is purely statistical and cannot detect barometric pressure changes, cold/warm fronts, or cloud cover.",
        "Zero Seasonal Context: 10 days represents less than 3% of an annual climate cycle, preventing detection of seasonal shifts.",
        "Recency Bias: Any atypical heatwave, unseasonal storm, or stagnation in the past 10 days will disproportionately skew future projections.",
        "Compounding Multi-step Uncertainty: As recursive predictions are generated for 72 hours (Day 3), feeding predicted values back as lagged inputs causes error accumulation.",
    ]

    def __init__(self, ridge_alpha: float = 1.0):
        self.ridge_alpha = ridge_alpha
        self.models: Dict[str, Ridge] = {}
        self.feature_columns = ["hour_sin", "hour_cos", "lag_1", "lag_2", "lag_24", "step_idx"]
        self.targets = ["temperature", "humidity", "wind_speed"]
        self.last_historical_time: pd.Timestamp = None
        self.last_history_tail: pd.DataFrame = None

    def _engineer_features(self, series: pd.Series, times: pd.Series) -> pd.DataFrame:
        """Constructs cyclical time and autoregressive lag features."""
        hours = times.dt.hour
        df = pd.DataFrame({
            "hour_sin": np.sin(2 * np.pi * hours / 24.0),
            "hour_cos": np.cos(2 * np.pi * hours / 24.0),
            "lag_1": series.shift(1),
            "lag_2": series.shift(2),
            "lag_24": series.shift(24),
            "step_idx": np.arange(len(series)),
        })
        return df

    def fit(self, historical_df: pd.DataFrame) -> "LightweightWeatherPredictor":
        """
        Fits separate Ridge autoregressive models for temperature, humidity, and wind speed.
        """
        if len(historical_df) < 30:
            raise ValueError(f"Insufficient historical data: expected at least 30 hours, got {len(historical_df)}")

        df = historical_df.copy().sort_values("time").reset_index(drop=True)
        self.last_historical_time = df["time"].iloc[-1]
        self.last_history_tail = df.copy()

        for target in self.targets:
            if target not in df.columns:
                raise ValueError(f"Target variable '{target}' missing from historical data.")

            features = self._engineer_features(df[target], df["time"])
            features["target"] = df[target]
            valid_train = features.dropna().reset_index(drop=True)

            X = valid_train[self.feature_columns]
            y = valid_train["target"]

            model = Ridge(alpha=self.ridge_alpha)
            model.fit(X, y)
            self.models[target] = model

        return self

    def predict_future(self, horizon_hours: int = 72) -> pd.DataFrame:
        """
        Recursively predicts the next `horizon_hours` hourly values for temp, humidity, and wind.
        """
        if not self.models:
            raise RuntimeError("Model has not been trained yet. Call fit() first.")

        # Prepare future hourly timestamps
        future_times = [
            self.last_historical_time + pd.Timedelta(hours=i)
            for i in range(1, horizon_hours + 1)
        ]

        predictions: Dict[str, List[float]] = {t: [] for t in self.targets}
        base_step_offset = len(self.last_history_tail)

        for target in self.targets:
            model = self.models[target]
            # Copy recent history series so we can roll predictions forward
            simulated_history = list(self.last_history_tail[target].values)

            for step_i, future_t in enumerate(future_times):
                h = future_t.hour
                h_sin = np.sin(2 * np.pi * h / 24.0)
                h_cos = np.cos(2 * np.pi * h / 24.0)
                lag_1 = simulated_history[-1]
                lag_2 = simulated_history[-2] if len(simulated_history) >= 2 else lag_1
                lag_24 = simulated_history[-24] if len(simulated_history) >= 24 else lag_1
                step_idx = base_step_offset + step_i

                X_step = pd.DataFrame([{
                    "hour_sin": h_sin,
                    "hour_cos": h_cos,
                    "lag_1": lag_1,
                    "lag_2": lag_2,
                    "lag_24": lag_24,
                    "step_idx": step_idx,
                }])

                pred_val = float(model.predict(X_step)[0])

                # Domain boundaries
                if target == "humidity":
                    pred_val = max(5.0, min(100.0, pred_val))
                elif target == "wind_speed":
                    pred_val = max(0.0, pred_val)

                predictions[target].append(pred_val)
                simulated_history.append(pred_val)

        pred_df = pd.DataFrame({
            "time": future_times,
            "temperature": predictions["temperature"],
            "humidity": predictions["humidity"],
            "wind_speed": predictions["wind_speed"],
        })
        return pred_df

    @staticmethod
    def summarize_forecast(df: pd.DataFrame, hours: int) -> Dict[str, Dict[str, float]]:
        """
        Computes summary statistics (mean, min, max) for a given window (e.g., 24h or 72h).
        """
        subset = df.iloc[:hours]
        return {
            "temperature": {
                "mean": round(float(subset["temperature"].mean()), 1),
                "min": round(float(subset["temperature"].min()), 1),
                "max": round(float(subset["temperature"].max()), 1),
            },
            "humidity": {
                "mean": round(float(subset["humidity"].mean()), 1),
                "min": round(float(subset["humidity"].min()), 1),
                "max": round(float(subset["humidity"].max()), 1),
            },
            "wind_speed": {
                "mean": round(float(subset["wind_speed"].mean()), 1),
                "min": round(float(subset["wind_speed"].min()), 1),
                "max": round(float(subset["wind_speed"].max()), 1),
            },
        }
