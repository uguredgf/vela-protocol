# 🌟 Vela Protocol

> Privacy-aware risk signals and a Blend collateral-supply prototype on Stellar

[![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)](https://stellar.org)
[![Blend v2](https://img.shields.io/badge/Blend-v2-green)](https://blend.capital)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Stellar Pro Hackathon — Genesis Track** | 19-20 Eylül 2026 | Grand Pera, İstanbul

---

## 🎯 Problem

Many Turkish small businesses and gig workers have real cash flow that is not represented in conventional credit records. Stablecoin activity adds another source of verifiable payment history, but banks do not treat it as credit history. Vela turns that Stellar activity into a privacy-conscious risk signal for licensed lenders.

## 💡 Solution

Vela Protocol is a hackathon integration prototype that derives a demonstrative risk signal from sufficient Stellar payment history, keeps the raw score off-chain, and submits collateral plus a subsidy to Blend v2 through a deployed Soroban gatekeeper. It does not issue a loan. The anchor leg is a separate interoperability demo whose TRY side runs in a testnet sandbox.

### Key Differentiators
1. **Privacy by construction**: Raw transaction history and the score stay off-chain; the current contract receives only a commitment and threshold claim
2. **AI-Enriched Signal Demo**: Explainable ML trained on synthetic behavior profiles, with a minimum-history gate
3. **Real DeFi Integration**: A real Soroban-to-Blend collateral-supply transaction on testnet; borrow/repay/withdraw are roadmap work
4. **Anchor integration**: SEP-10/SEP-6 flows are exercised against the TR Mock Anchor testnet sandbox; Stellar USDC payment settlement is real testnet activity
5. **Identity replay prototype**: An Anchor SEP-12 sandbox `customer_id` is hashed locally and duplicate submitted hashes are rejected; on-chain Anchor attestation is not yet implemented

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER (Browser)                               │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐  │
│  │ Passkey  │   │  Score   │   │Commitment│   │  Anchor TL       │  │
│  │  Login   │──▶│ Display  │──▶│Generator │──▶│  Transfer        │  │
│  └──────────┘   └────┬─────┘   └────┬─────┘   └────────┬─────────┘  │
└──────────────────────┼──────────────┼──────────────────┼────────────┘
                       │              │                  │
                       ▼              ▼                  ▼
              ┌────────────┐  ┌──────────────┐  ┌──────────────────┐
              │ AI Scoring │  │   Soroban    │  │  TR Mock Anchor  │
              │  Service   │  │  Gatekeeper  │  │  SEP-6/10/12/38  │
              │ (FastAPI)  │  │  Contract    │  │ (tr-mock-anchor  │
              └────────────┘  └──────┬───────┘  │  .fly.dev)       │
                                     │          └──────────────────┘
                                     ▼
                              ┌──────────────┐
                              │   Blend v2   │
                              │  Lending Pool│
                              │  (Testnet)   │
                              └──────────────┘
```

### End-to-End Flow
1. **Passkey Login** — Passkey-Kit deploys/connects a real Soroban smart-wallet C-address; a separate Friendbot-funded classic G-address is provisioned for Horizon, gatekeeper authorization, and SEP-10
2. **Data Collection** — Transaction history fetched from Stellar Horizon API
3. **AI Scoring** — After a minimum evidence gate, an explainable synthetic-data ML model produces a demonstrative 0-100 signal
4. **Score commitment** — Client-side SHA-256 commitment plus a 0/1 threshold claim; this MVP does not implement a Groth16 verifier
5. **Identity binding** — SEP-10 authenticates the classic G-address; SEP-12 returns a `customer_id` that is SHA-256 hashed in the browser
6. **On-Chain Gatekeeper** — Soroban rejects a repeated submitted identity hash and executes the configured Blend supply path; it does not verify the hash's Anchor origin
7. **Blend Position** — The deployed contract supplies user collateral plus subsidy to Blend; the displayed borrow figure is an estimate, not a completed borrow call
8. **Anchor Transfer** — SEP-6 withdraw returns an anchor address/memo; the classic G-address sends real testnet USDC and the UI polls the returned anchor transaction

---

## 📁 Project Structure

```
vela-protocol/
├── contracts/gatekeeper/     # Soroban smart contract (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs            # Main contract
│       ├── types.rs          # Data types
│       ├── storage.rs        # Storage management + TTL
│       ├── proof.rs          # Commitment + threshold-claim validation
│       ├── blend.rs          # Blend v2 cross-contract calls
│       ├── errors.rs         # Custom errors
│       └── events.rs         # Contract events
├── ai-scoring/               # Python AI scoring service
│   ├── server.py             # FastAPI server
│   ├── model.py              # Gradient Boosting model
│   ├── features.py           # Feature extraction (12 metrics)
│   ├── generate_data.py      # Synthetic data generator
│   ├── stellar_client.py     # Horizon API client
│   └── train.py              # Training script
├── frontend/                 # React + TypeScript frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── services/         # Stellar, Anchor, Blend, Passkey
│   │   ├── store/            # Zustand state management
│   │   └── types/            # TypeScript types
│   └── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- Python 3.11+
- Rust and Stellar CLI (only for contract development)
- Stellar testnet account with XLM

### 1. AI Scoring Service
```bash
cd ai-scoring
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python train.py
uvicorn server:app --reload --port 8001
```

### 2. Frontend
```bash
cd frontend
copy .env.example .env.local       # Windows
# cp .env.example .env.local       # macOS/Linux
npm install
npm run dev -- --host localhost --port 5173
```

Open `http://localhost:5173`, not `127.0.0.1`. WebAuthn treats them as different relying-party origins. `VITE_SCORING_API_URL` must point to a reachable FastAPI deployment when the frontend is hosted remotely.

### 3. Smart Contract (optional — deploy to testnet)
```bash
cd contracts/gatekeeper
stellar contract build
```

The frontend is already configured for the deployed testnet contract through `.env.example`; redeployment is not required to evaluate the demo.

### 4. Vercel

The repository-root `vercel.json` installs and builds `vela-protocol/frontend`, publishes its `dist/` directory, and rewrites client-side routes to `index.html`.

Configure these Vercel environment variables:

```text
VITE_GATEKEEPER_CONTRACT_ID=CCSDVXSUOS2P7PJZASQ7XZ27BYOMRWUNJPBMBK3AMF6PFWXT5VPU7ZMB
VITE_SCORING_API_URL=https://vela-ai-scoring.vercel.app
VITE_DEMO_MODE=false
```

The FastAPI scoring service is deployed separately at `https://vela-ai-scoring.vercel.app`. Its Vercel entrypoint lives under `ai-scoring/api/`; it can also be run locally with Uvicorn.

The public `/evidence` route checks the deployed model service and demonstrates that sparse accounts are rejected, then links directly to verified Stellar Expert transactions. The published position fixture proves the collateral-supply integration only; it uses an empty proof and zero identity hash and is labeled accordingly.

---

## 🔧 Technology Stack

| Layer | Technology |
|-------|-----------|
| **Data** | Stellar Horizon API, Python/pandas |
| **AI** | scikit-learn (Gradient Boosting), SHAP explanations |
| **Privacy** | SHA-256 commitment + threshold claim (full ZK verification is roadmap) |
| **Smart Contract** | Soroban (Rust/WASM), deployed on testnet |
| **DeFi (mandatory)** | Blend v2 — collateral supply via gatekeeper |
| **Fiat Rail (mandatory)** | TR Mock Anchor — SEP-6/10; bank side is sandboxed |
| **Identity** | Passkey-Kit Soroban wallet + separate classic G-address |
| **Frontend** | React, TypeScript, Tailwind CSS, Vite |

---

## 🔐 Privacy & Security

- **No raw data on-chain**: Only a commitment/threshold payload and position state are submitted
- **User transparency**: Users see exactly which data influenced their score
- **No proxy discrimination**: Model explicitly excludes demographic, location, and identity features
- **Commitment replay guard**: Submitted commitment payloads cannot be reused
- **Identity-hash duplicate guard**: Repeated submitted hashes are rejected; the contract does not yet verify an Anchor signature, so this is not complete Sybil resistance
- **Explainable AI**: SHAP values show per-feature contribution to every score

## Regulatory Boundary

Vela is a testnet risk-signal and collateral-routing MVP; it is not the licensed lender or fiat custodian. A production rollout in Turkey would keep the regulated roles explicit:

- Credit origination and lending decisions remain with a BDDK-regulated lender or another appropriately licensed institution.
- A production fiat/crypto anchor must satisfy the applicable SPK crypto-asset service-provider framework.
- Customer identification and AML controls remain with the regulated institution under MASAK requirements. Vela consumes the resulting SEP-12 customer identifier only as a client-side SHA-256 hash and never writes the raw identifier on-chain.

---

## 📊 Subsidy Tiers

| Score | Trust Level | Subsidy | User Provides |
|-------|------------|---------|---------------|
| 60-100 | Client-claimed threshold met (MVP) | 40% of user amount | 71.4% of total collateral |
| 0-59 | Insufficient | Rejected | — |

---

## 🌐 Testnet Configuration

| Parameter | Value |
|-----------|-------|
| Network | Stellar Testnet |
| Network Passphrase | `Test SDF Network ; September 2015` |
| Anchor Home Domain | `tr-mock-anchor.fly.dev` |
| USDC Issuer | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` |
| Blend Pool (TestnetV2) | `CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF` |
| Gatekeeper Contract | `CCSDVXSUOS2P7PJZASQ7XZ27BYOMRWUNJPBMBK3AMF6PFWXT5VPU7ZMB` |
| Anchor Signing Key | `GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M` |

Live testnet evidence:

- [Gatekeeper deployment](https://stellar.expert/explorer/testnet/tx/f924cb43d67a19aeec69a8d76e35c366bea5c71416cac0b11dbf51a25544b0c5)
- [Blend collateral-supply fixture (empty proof / zero identity)](https://stellar.expert/explorer/testnet/tx/bcec10737c1f4f538c142eca78c7de9540f9746d7e21f0680ff808ad7e84ab39)

---

## 📋 Stellar References Used

- Stellar Anchor Skills: https://skills.stellar.org/
- SEP standards and ecosystem references: https://developers.stellar.org/docs/learn/encyclopedia/sep
- Blend v2 Documentation: https://docs.blend.capital/

---

## 🏆 Hackathon Criteria Alignment

- **Integration**: Blend v2 — real collateral supply through the Soroban gatekeeper
- **Anchor/Local Payments**: TR Mock Anchor — SEP-6/10 (TRY bank side sandbox, Stellar USDC leg real on testnet)
- **Core Feature**: Blend is the destination of the verified collateral-supply path; lending lifecycle remains roadmap work
- **Current verification**: Live test script covers Friendbot, trustline, SEP-10, SEP-6 deposit polling, and SEP-6 withdrawal payment polling
- **Roadmap**: Full Groth16/zkML verification, Blend borrow/repay, production anchor partnership, and mainnet pilot

---

## 📄 License

MIT

---

Built with ❤️ for Stellar Pro Hackathon 2026
