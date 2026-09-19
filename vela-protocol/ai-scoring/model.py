import os
import json
import pandas as pd
import numpy as np
import joblib
import shap
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from features import extract_features_from_txs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.environ.get("VELA_SCORING_MODEL_PATH", os.path.join(MODELS_DIR, "scoring_model.joblib"))
_MODEL = None

FEATURE_NAMES = [
    "tx_count", "tx_frequency", "tx_regularity", "avg_amount", 
    "amount_variance", "unique_counterparties", "counterparty_concentration",
    "income_regularity", "history_length_days", "max_gap_days", 
    "net_flow", "consistency_score"
]

def prepare_training_data(json_path: str):
    """Parses raw JSON data, extracts features, and saves to CSV."""
    with open(json_path, "r") as f:
        data = json.load(f)
        
    rows = []
    for item in data:
        feats = extract_features_from_txs(item["transactions"])
        feats["label"] = item["label"]
        rows.append(feats)
        
    df = pd.DataFrame(rows)
    csv_path = os.path.join(os.path.dirname(json_path), "training_data.csv")
    df.to_csv(csv_path, index=False)
    return df

def train_model(data_path: str = None) -> dict:
    """Trains the GradientBoostingRegressor and saves it."""
    global _MODEL
    if not data_path:
        data_path = os.path.join(BASE_DIR, "data", "synthetic_dataset.json")
        
    df = prepare_training_data(data_path)
    
    X = df[FEATURE_NAMES]
    y = df["label"]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    model = GradientBoostingRegressor(
        n_estimators=200, 
        max_depth=4, 
        learning_rate=0.1,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    preds = model.predict(X_test)
    mse = mean_squared_error(y_test, preds)
    r2 = r2_score(y_test, preds)
    
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    _MODEL = model
    
    return {"mse": mse, "r2": r2, "status": "success"}

def load_model():
    """Load and cache the persisted model, failing fast on incompatible artifacts."""
    global _MODEL
    if _MODEL is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
        _MODEL = joblib.load(MODEL_PATH)
    return _MODEL

def predict_score(features: dict) -> dict:
    """Predicts a credit score and generates SHAP explanations."""
    model = load_model()
    
    # Prepare input dataframe
    input_df = pd.DataFrame([features])[FEATURE_NAMES]
    
    # Predict
    score = float(model.predict(input_df)[0])
    
    # SHAP explainer
    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(input_df)
    
    # Format explanation
    base_val = explainer.expected_value[0] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value
    
    explanation = {
        "base_value": float(base_val),
        "feature_contributions": {}
    }
    
    for i, feature in enumerate(FEATURE_NAMES):
        explanation["feature_contributions"][feature] = float(shap_values[0][i])
        
    # Bound score
    score = max(0.0, min(100.0, score))
    
    return {
        "score": round(score, 1),
        "explanation": explanation,
        "features_used": features
    }

def get_model_info() -> dict:
    """Returns metadata and responsible AI notes."""
    return {
        "model_type": "GradientBoostingRegressor",
        "hyperparameters": {
            "n_estimators": 200,
            "max_depth": 4,
            "learning_rate": 0.1
        },
        "responsible_ai": {
            "features_used": FEATURE_NAMES,
            "features_NOT_used": ["demographics", "location", "identity", "KYC_status", "device_info"],
            "proxy_variable_analysis": "No proxy demographic data is included. All features are strictly derived from on-chain transaction metrics (volume, frequency, variance, counterparties).",
            "model_limitations": "Model may penalize new users with short histories. Not robust to sybil attacks or artificially generated transaction loops if counterparties are not carefully verified."
        }
    }
