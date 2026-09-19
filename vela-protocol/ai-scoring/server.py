from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import httpx

from features import extract_features_from_txs
from model import predict_score, get_model_info, MODEL_PATH, train_model, load_model
from stellar_client import fetch_transactions, is_classic_address

app = FastAPI(title="Vela Protocol AI Scoring Service")
MIN_SCORE_THRESHOLD = 60.0

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
        if not txs_raw:
            raise HTTPException(status_code=404, detail="No transactions found for account")
        txs = [TransactionItem(**t) for t in txs_raw]
    
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
    if not txs_raw:
        raise HTTPException(status_code=404, detail="No transactions found for account")
        
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
