# Commitment and Threshold Claim Prototype

## Current MVP

Vela does not currently implement a zero-knowledge proof or an on-chain ZK verifier.

The browser creates:

- a SHA-256 commitment over the score and a random 32-byte salt;
- a client-computed threshold flag (`0` or `1`);
- a 36-byte public input containing the 32-byte commitment followed by that flag.

The proof byte array is empty. The Soroban contract validates the public-input length and flag encoding, then uses the submitted bytes for replay protection. It does not verify the raw score, recompute the commitment, or cryptographically bind the threshold flag to the committed score.

This is a transparent hackathon boundary, not a simulated ZK proof.

## Future Upgrade

A production version would define a range-proof circuit, generate a real proof in the client, and verify it on Soroban using an audited verifier. Groth16 or another suitable construction would require a proving and verification setup that is outside this MVP.
