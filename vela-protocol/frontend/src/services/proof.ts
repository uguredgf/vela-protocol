import { ProofResult } from '../types';

// A commitment and client-claimed threshold result, not a zero-knowledge proof.
export async function generateCommitment(score: number, salt: Uint8Array): Promise<string> {
  if (!Number.isInteger(score) || score < 0 || score > 100 || salt.length !== 32) throw new Error('Invalid score or salt');
  const data = new Uint8Array(33);
  data[0] = score;
  data.set(salt, 1);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashIdentity(customerId: string): Promise<Uint8Array> {
  if (!customerId || customerId.length > 512) throw new Error('Anchor did not return a valid customer_id');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(customerId));
  return new Uint8Array(digest);
}

export function generateRangeProof(score: number, threshold: number, commitment: string): ProofResult {
  if (!Number.isInteger(score) || score < 0 || score > 100 || !Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
    throw new Error('Score and threshold must be integers from 0 to 100');
  }
  if (!/^[0-9a-f]{64}$/.test(commitment)) throw new Error('Invalid SHA-256 commitment');
  const meetsThreshold = score >= threshold;
  // Contract ABI: 32-byte commitment + 4-byte big-endian boolean (0 or 1).
  const thresholdFlag = meetsThreshold ? 1 : 0;
  const publicInputs = new Uint8Array(36);
  for (let i = 0; i < 32; i++) publicInputs[i] = parseInt(commitment.slice(i * 2, i * 2 + 2), 16);
  publicInputs[32] = 0;
  publicInputs[33] = 0;
  publicInputs[34] = 0;
  publicInputs[35] = thresholdFlag;
  return {
    proof: new Uint8Array(0), publicInputs: [commitment, String(thresholdFlag)], publicInputsBytes: publicInputs,
    meetsThreshold, proofSizeBytes: 0, provingTimeMs: 0, commitment, threshold,
  };
}
