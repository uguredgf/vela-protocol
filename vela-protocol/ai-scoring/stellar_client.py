import httpx
import base64
import binascii
import struct
from datetime import datetime


def is_classic_address(account_id: str) -> bool:
    try:
        raw = base64.b32decode(account_id, casefold=False)
    except (binascii.Error, ValueError):
        return False
    return (len(account_id) == 56 and len(raw) == 35 and raw[0] == 0x30
            and raw[-2:] == struct.pack('<H', binascii.crc_hqx(raw[:-2], 0)))

async def fetch_transactions(account_id: str, limit: int = 200) -> list:
    """
    Fetch transactions from Stellar Horizon testnet API.
    Normalizes Horizon's format into our expected format.
    """
    if not is_classic_address(account_id):
        raise ValueError("Horizon scoring requires a valid classic G-address")
    url = f"https://horizon-testnet.stellar.org/accounts/{account_id}/payments"
    params = {
        "limit": limit,
        "order": "desc"
    }
    
    transactions = []
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            records = data.get("_embedded", {}).get("records", [])
            
            for record in records:
                if record["type"] == "payment":
                    is_received = (record["to"] == account_id)
                    direction = "received" if is_received else "sent"
                    counterparty = record["from"] if is_received else record["to"]
                    
                    transactions.append({
                        "id": record["transaction_hash"],
                        "timestamp": record["created_at"],
                        "amount": record["amount"],
                        "asset_code": record.get("asset_code", "XLM"), # native is XLM
                        "counterparty": counterparty,
                        "type": "payment",
                        "direction": direction
                    })
                # Account creation/Friendbot funding is infrastructure bootstrap,
                # not behavioural payment history, so it is intentionally excluded.
        except httpx.HTTPError as e:
            print(f"Error fetching from Horizon: {e}", flush=True)
            raise
            
    return transactions
