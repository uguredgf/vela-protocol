import pandas as pd
import numpy as np
from datetime import datetime

def extract_features_from_txs(transactions: list) -> dict:
    """
    Extracts features from a list of transaction dictionaries.
    Returns a dictionary of features.
    """
    if not transactions:
        return _get_default_features()
        
    df = pd.DataFrame(transactions)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["amount"] = pd.to_numeric(df["amount"])
    
    df = df.sort_values("timestamp")
    
    # 1. tx_count - total number of transactions
    tx_count = len(df)
    
    # History calculation
    t_min = df["timestamp"].min()
    t_max = df["timestamp"].max()
    history_length_days = (t_max - t_min).days
    
    # 2. tx_frequency - average transactions per week
    weeks = max(history_length_days / 7, 1) # Avoid div by zero
    tx_frequency = tx_count / weeks
    
    # Intervals
    if tx_count > 1:
        intervals = df["timestamp"].diff().dt.total_seconds() / (24 * 3600) # days
        # 3. tx_regularity - std dev of intervals (lower is more regular)
        tx_regularity = intervals.std()
        # 10. max_gap_days
        max_gap_days = intervals.max()
    else:
        tx_regularity = 0.0
        max_gap_days = 0.0
        
    if pd.isna(tx_regularity):
        tx_regularity = 0.0
        
    # 4. avg_amount
    avg_amount = df["amount"].mean()
    
    # 5. amount_variance - coefficient of variation
    amount_std = df["amount"].std()
    amount_variance = (amount_std / avg_amount) if (not pd.isna(amount_std) and avg_amount > 0) else 0.0
    
    # Counterparties
    if "counterparty" in df.columns:
        # 6. unique_counterparties
        unique_counterparties = df["counterparty"].nunique()
        
        # 7. counterparty_concentration - Herfindahl index
        counts = df["counterparty"].value_counts(normalize=True)
        counterparty_concentration = (counts ** 2).sum()
    else:
        unique_counterparties = 0
        counterparty_concentration = 0.0
        
    # Income metrics
    received_df = df[df["direction"] == "received"] if "direction" in df.columns else pd.DataFrame()
    if len(received_df) > 1:
        inc_intervals = received_df["timestamp"].diff().dt.total_seconds() / (24 * 3600)
        # 8. income_regularity
        income_regularity = inc_intervals.std()
        if pd.isna(income_regularity):
            income_regularity = 0.0
    else:
        income_regularity = 0.0
        
    # 9. history_length_days (computed above)
    
    # 11. net_flow
    if "direction" in df.columns:
        received = df[df["direction"] == "received"]["amount"].sum()
        sent = df[df["direction"] == "sent"]["amount"].sum()
        net_flow = received - sent
    else:
        net_flow = 0.0
        
    # 12. consistency_score - proxy metric combining volume and regularity (0-1 scale, higher is better)
    # Using tx_regularity and amount_variance
    reg_factor = np.exp(-tx_regularity/30) # decays as variance increases
    vol_factor = np.exp(-amount_variance)
    consistency_score = float((reg_factor + vol_factor) / 2)
    
    features = {
        "tx_count": int(tx_count),
        "tx_frequency": float(tx_frequency),
        "tx_regularity": float(tx_regularity),
        "avg_amount": float(avg_amount),
        "amount_variance": float(amount_variance),
        "unique_counterparties": int(unique_counterparties),
        "counterparty_concentration": float(counterparty_concentration),
        "income_regularity": float(income_regularity),
        "history_length_days": float(history_length_days),
        "max_gap_days": float(max_gap_days),
        "net_flow": float(net_flow),
        "consistency_score": float(consistency_score)
    }
    
    return features

def _get_default_features():
    return {
        "tx_count": 0,
        "tx_frequency": 0.0,
        "tx_regularity": 0.0,
        "avg_amount": 0.0,
        "amount_variance": 0.0,
        "unique_counterparties": 0,
        "counterparty_concentration": 0.0,
        "income_regularity": 0.0,
        "history_length_days": 0.0,
        "max_gap_days": 0.0,
        "net_flow": 0.0,
        "consistency_score": 0.0
    }
