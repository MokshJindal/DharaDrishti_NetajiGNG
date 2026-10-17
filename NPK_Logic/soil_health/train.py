"""Trains a Machine Learning model for soil health prediction and saves the artifact."""
import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

from . import config


def train():
    print(f"Loading dataset from: {config.DATA_PATH}")
    df = pd.read_csv(config.DATA_PATH)

    X = df[config.ALL_FEATURES]
    y = df[config.TARGET]

    print(f"Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")
    print("Class Distribution:")
    for label, count in y.value_counts().items():
        print(f"  - {label}: {count}")

    # 80/20 stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    # Standard Preprocessing
    num_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])

    cat_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    preprocessor = ColumnTransformer([
        ("num", num_pipeline, config.NUMERIC_FEATURES),
        ("cat", cat_pipeline, config.CATEGORICAL_FEATURES),
    ])

    # Compare Decision Tree and Random Forest
    candidates = {
        "Decision Tree": DecisionTreeClassifier(max_depth=5, class_weight="balanced", random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=6, class_weight="balanced", random_state=42),
    }

    best_name = None
    best_pipe = None
    best_f1 = -1

    for name, clf in candidates.items():
        pipe = Pipeline([
            ("preprocessor", preprocessor),
            ("classifier", clf),
        ])
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        f1 = f1_score(y_test, y_pred, average="macro")
        acc = accuracy_score(y_test, y_pred)
        print(f"\n--- {name} Results ---")
        print(f"Accuracy: {acc * 100:.2f}%, Macro F1-Score: {f1:.4f}")
        print(classification_report(y_test, y_pred, zero_division=0))
        print("Confusion Matrix:\n", confusion_matrix(y_test, y_pred))

        if f1 > best_f1:
            best_f1 = f1
            best_name = name
            best_pipe = pipe

    print(f"\nBest Model Selected: {best_name} (Macro F1: {best_f1:.4f})")

    # Refit best model on full dataset for maximum accuracy in deployment
    print("Refitting best model on full dataset for production artifact...")
    best_pipe.fit(X, y)

    # Save artifact
    config.ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({
        "pipeline": best_pipe,
        "features": config.ALL_FEATURES,
        "classes": list(best_pipe.named_steps["classifier"].classes_),
        "model_name": best_name,
    }, config.MODEL_PATH)

    print(f"Production model saved successfully to: {config.MODEL_PATH}")

    # Train Crop Recommendation Model
    print("\n" + "=" * 50)
    print("Training Crop Recommendation Model on Crop_recommendation.csv...")
    from . import crop_recommender
    crop_recommender.train_crop_model()
    print(f"Crop Recommendation model saved successfully to: {config.CROP_MODEL_PATH}")
    print("=" * 50 + "\n")


if __name__ == "__main__":
    train()
