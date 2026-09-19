# Vela Protocol AI Scoring Service

This service powers the AI credit scoring logic for the Vela Protocol.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Generate data and train the model:
```bash
python train.py
```
*This will generate a synthetic dataset in `data/` and a trained model in `models/`.*

3. Run the FastAPI server:
```bash
uvicorn server:app --reload
```

## Endpoints

- `GET /health` : Check service health.
- `GET /model-info` : Model metadata and Responsible AI constraints.
- `GET /score/{account_id}` : Live scoring by fetching on-chain data from Stellar Horizon testnet.
- `POST /score` : Submit custom transaction arrays for instantaneous scoring.
