import json
import random
import csv
import os
from datetime import datetime, timedelta, timezone

def generate_account_id():
    """Generates a random pseudo-Stellar G-address."""
    import string
    chars = string.ascii_uppercase + string.digits
    return "G" + "".join(random.choices(chars, k=55))

def generate_transactions_for_profile(account_id, profile, start_date):
    """
    Generates synthetic transaction history based on profile characteristics.
    """
    txs = []
    
    if profile == "high":
        # Regular transactions, low variance, few counterparties, 6-12 months
        num_months = random.randint(6, 12)
        interval_days = random.choice([7, 14, 30])
        num_tx = (num_months * 30) // interval_days
        base_amount = random.uniform(500, 2000)
        counterparties = [generate_account_id() for _ in range(3)]
        
        current_date = start_date
        for _ in range(num_tx):
            # Small jitter in timing (max 1 day)
            jitter_hours = random.uniform(-24, 24)
            tx_time = current_date + timedelta(hours=jitter_hours)
            
            # Small variance in amount
            amount = base_amount * random.uniform(0.95, 1.05)
            
            txs.append({
                "id": f"tx_{random.randint(1000000, 9999999)}",
                "timestamp": tx_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "amount": f"{amount:.2f}",
                "asset_code": random.choice(["USDC", "XLM"]),
                "counterparty": random.choice(counterparties),
                "type": "payment",
                "direction": random.choice(["received", "sent"])
            })
            current_date += timedelta(days=interval_days)
            
        score = random.randint(75, 100)
        
    elif profile == "medium":
        # Semi-regular, moderate variance, 3-8 months
        num_months = random.randint(3, 8)
        num_tx = random.randint(10, 40)
        base_amount = random.uniform(100, 1000)
        counterparties = [generate_account_id() for _ in range(8)]
        
        for _ in range(num_tx):
            days_offset = random.uniform(0, num_months * 30)
            tx_time = start_date + timedelta(days=days_offset)
            amount = base_amount * random.uniform(0.5, 1.5)
            
            txs.append({
                "id": f"tx_{random.randint(1000000, 9999999)}",
                "timestamp": tx_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "amount": f"{amount:.2f}",
                "asset_code": random.choice(["USDC", "XLM"]),
                "counterparty": random.choice(counterparties),
                "type": "payment",
                "direction": random.choice(["received", "sent"])
            })
            
        score = random.randint(40, 74)
        
    else:  # low
        # Irregular, high variance, many counterparties, 1-4 months or long gaps
        num_tx = random.randint(2, 15)
        counterparties = [generate_account_id() for _ in range(num_tx)]
        
        for i in range(num_tx):
            days_offset = random.uniform(0, 365) # highly spread out
            tx_time = start_date + timedelta(days=days_offset)
            amount = random.uniform(10, 5000)
            
            txs.append({
                "id": f"tx_{random.randint(1000000, 9999999)}",
                "timestamp": tx_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "amount": f"{amount:.2f}",
                "asset_code": random.choice(["USDC", "XLM", "SRT"]),
                "counterparty": counterparties[i],
                "type": "payment",
                "direction": random.choice(["received", "sent"])
            })
            
        score = random.randint(0, 39)
        
    # Sort by timestamp
    txs.sort(key=lambda x: x["timestamp"])
    return txs, score

def main():
    random.seed(42)  # Deterministic generation
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, "data")
    os.makedirs(data_dir, exist_ok=True)
    
    profiles = ["high", "medium", "low"]
    dataset = []
    
    # 12 months ago
    start_date = datetime.now(timezone.utc) - timedelta(days=365)
    
    for i in range(500):
        profile = profiles[i % 3]
        account_id = generate_account_id()
        txs, score = generate_transactions_for_profile(account_id, profile, start_date)
        
        dataset.append({
            "account_id": account_id,
            "transactions": txs,
            "label": score
        })
        
    json_path = os.path.join(data_dir, "synthetic_dataset.json")
    with open(json_path, "w") as f:
        json.dump(dataset, f, indent=2)
        
    print(f"Generated {len(dataset)} profiles at {json_path}")

if __name__ == "__main__":
    main()
