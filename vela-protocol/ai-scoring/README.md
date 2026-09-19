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
- `POST /score` : Score an account ID using canonical Horizon history. A legacy `transactions` field is accepted for client compatibility but ignored by the service.

## Deployment

The public Vercel deployment is available at:

```text
https://vela-ai-scoring.vercel.app
```

`api/index.py` exports the existing FastAPI application for Vercel. `vercel.json` routes API requests to that entrypoint; the core scoring logic remains shared with local Uvicorn development.
