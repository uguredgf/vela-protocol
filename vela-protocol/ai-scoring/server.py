from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import httpx
from datetime import datetime

from features import extract_features_from_txs
from model import predict_score, get_model_info, MODEL_PATH, train_model, load_model
from stellar_client import fetch_transactions, is_classic_address

app = FastAPI(title="Vela Protocol AI Scoring Service")
MIN_SCORE_THRESHOLD = 60.0
MIN_BEHAVIORAL_TRANSACTIONS = 5
MIN_HISTORY_DAYS = 7

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Validate that the persisted artifact can actually be loaded. If it was created
# by an incompatible scikit-learn version, deterministically retrain it.
@app.on_event("startup")
async def startup_event():
    try:
        load_model()
        print(f"Scoring model loaded from {MODEL_PATH}")
    except Exception as exc:
        print(f"Scoring model unavailable ({exc}). Retraining from source data...", flush=True)
        data_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "synthetic_dataset.json")
        if os.path.exists(data_path):
            train_model(data_path)
            print("Model trained and validated successfully.", flush=True)
        else:
            print("WARNING: Data not found. Cannot train scoring model.", flush=True)

class TransactionItem(BaseModel):
    id: str
    timestamp: str
    amount: str
    asset_code: str
    counterparty: str
    type: str
    direction: str

class ScoreRequest(BaseModel):
    account_id: str
    transactions: Optional[List[TransactionItem]] = None

def require_sufficient_history(transactions: list) -> None:
    """Refuse to turn sparse activity into a deceptively precise score."""
    if len(transactions) < MIN_BEHAVIORAL_TRANSACTIONS:
        raise HTTPException(status_code=422, detail={
            "code": "insufficient_history",
            "message": f"Insufficient Stellar payment history. At least {MIN_BEHAVIORAL_TRANSACTIONS} behavioural payments are required; account creation and Friendbot funding do not count.",
            "observed_transactions": len(transactions),
            "minimum_transactions": MIN_BEHAVIORAL_TRANSACTIONS,
            "minimum_history_days": MIN_HISTORY_DAYS,
        })
    timestamps = sorted(datetime.fromisoformat((t.timestamp if isinstance(t, TransactionItem) else t["timestamp"]).replace("Z", "+00:00")) for t in transactions)
    history_days = (timestamps[-1] - timestamps[0]).total_seconds() / 86400
    if history_days < MIN_HISTORY_DAYS:
        raise HTTPException(status_code=422, detail={
            "code": "insufficient_history",
            "message": f"Insufficient account history. Activity must span at least {MIN_HISTORY_DAYS} days before Vela presents a signal.",
            "observed_transactions": len(transactions),
            "observed_history_days": round(history_days, 1),
            "minimum_transactions": MIN_BEHAVIORAL_TRANSACTIONS,
            "minimum_history_days": MIN_HISTORY_DAYS,
        })

@app.post("/score")
async def score_account(req: ScoreRequest):
    if not is_classic_address(req.account_id):
        raise HTTPException(status_code=422, detail="Scoring requires a valid classic G-address")
    txs = req.transactions
    
    if not txs:
        # Fetch from horizon if no txs provided
        try:
            txs_raw = await fetch_transactions(req.account_id)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Horizon request failed: {e}")
        txs = [TransactionItem(**t) for t in txs_raw]

    require_sufficient_history(txs)
    
    # Convert to dicts for feature extraction
    tx_dicts = [t.model_dump() for t in txs]
    
    try:
        features = extract_features_from_txs(tx_dicts)
        result = predict_score(features)
        
        score = result["score"]
        tier = "high" if score >= 80 else ("medium" if score >= MIN_SCORE_THRESHOLD else "low")
        threshold_met = score >= MIN_SCORE_THRESHOLD
        
        return {
            "score": score,
            "tier": tier,
            "threshold_met": threshold_met,
            "explanation": result["explanation"],
            "features": result["features_used"]
        }
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not loaded or trained yet.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/score/{account_id}")
async def get_score_for_account(account_id: str):
    if not is_classic_address(account_id):
        raise HTTPException(status_code=422, detail="Scoring requires a valid classic G-address")
    try:
        txs_raw = await fetch_transactions(account_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Horizon request failed: {e}")
    require_sufficient_history(txs_raw)
        
    try:
        features = extract_features_from_txs(txs_raw)
        result = predict_score(features)
        
        score = result["score"]
        tier = "high" if score >= 80 else ("medium" if score >= MIN_SCORE_THRESHOLD else "low")
        threshold_met = score >= MIN_SCORE_THRESHOLD
        
        return {
            "account_id": account_id,
            "score": score,
            "tier": tier,
            "threshold_met": threshold_met,
            "explanation": result["explanation"],
            "features": result["features_used"]
        }
    except FileNotFoundError:
        raise HTTPException(status_code=503, detail="Model not loaded or trained yet.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    try:
        load_model()
        model_loaded = True
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Scoring model unavailable: {exc}")
    return {
        "status": "ok",
        "model_version": "1.0",
        "model_loaded": model_loaded
    }

@app.get("/model-info")
def get_model_information():
    return get_model_info()
