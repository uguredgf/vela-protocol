# ZK Circuit — Commitment + Range Proof

## Overview

This module implements the zero-knowledge proof layer for Vela Protocol.

**What we prove:** "The committed score is ≥ threshold" — without revealing the actual score.

**What we DON'T do:** zkML (proving the AI model's computation itself is ZK) — this is research-level and not feasible in 36 hours.

## Architecture

```
Client-Side (Browser)                    On-Chain (Soroban)
┌─────────────────────┐                  ┌─────────────────────┐
│ 1. Receive score    │                  │ 4. Verify proof     │
│ 2. Create commitment│ ───proof+pi───▶  │ 5. Extract threshold│
│ 3. Generate proof   │                  │ 6. Calculate subsidy│
└─────────────────────┘                  └─────────────────────┘
```

## MVP Implementation

For the hackathon MVP, the ZK proof is simulated client-side:
- **Commitment**: SHA-256 hash of (score || nonce)
- **Public inputs**: threshold value + commitment hash
- **Proof**: Structured bytes (mock — real implementation would use Groth16)

The Soroban contract's mock verifier validates structure and extracts the score.

## Future: Real BLS12-381 Groth16

Soroban (Protocol 22+) supports native BLS12-381 primitives:
```rust
env.crypto().bls12_381().pairing_check(...)
```

A production implementation would:
1. Define a Circom/Noir circuit for range proof
2. Generate proving key + verification key
3. Client generates Groth16 proof
4. Soroban verifies via BLS12-381 pairing check
