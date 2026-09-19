import axios from 'axios';
import { ScoreResult, ModelInfo, StellarTransaction } from '../types';
import { StrKey } from '@stellar/stellar-sdk';

const DEFAULT_API_BASE = import.meta.env.PROD
  ? 'https://vela-ai-scoring.vercel.app'
  : 'http://127.0.0.1:8001';

export const SCORING_API_URL = (import.meta.env.VITE_SCORING_API_URL || DEFAULT_API_BASE).replace(/\/$/, '');

function scoringError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') return new Error(detail);
    if (detail?.message) return new Error(detail.message);
  }
  return error instanceof Error ? error : new Error('Scoring service is unavailable');
}

/**
 * Get creditworthiness score for an account.
 * Sends transaction history to the AI scoring service.
 * If no transactions are provided, the service will fetch them from Horizon.
 */
export async function getScore(
  accountId: string, 
  transactions?: StellarTransaction[]
): Promise<ScoreResult> {
  if (!StrKey.isValidEd25519PublicKey(accountId)) throw new Error('Scoring requires a valid classic G-address');
  try {
    const payload: any = { account_id: accountId };
    if (transactions && transactions.length > 0) {
      payload.transactions = transactions;
    }

    const res = await axios.post(`${SCORING_API_URL}/score`, payload, {
      timeout: 30000,
    });

    return res.data as ScoreResult;
  } catch (error) {
    throw scoringError(error);
  }
}

/**
 * Get score by account ID only (service fetches transactions from Horizon).
 */
export async function getScoreByAccountId(accountId: string): Promise<ScoreResult> {
  if (!StrKey.isValidEd25519PublicKey(accountId)) throw new Error('Scoring requires a valid classic G-address');
  try {
    const res = await axios.get(`${SCORING_API_URL}/score/${accountId}`, {
      timeout: 30000,
    });
    return res.data as ScoreResult;
  } catch (error) {
    throw scoringError(error);
  }
}

/**
 * Get model information and responsible AI notes.
 */
export async function getModelInfo(): Promise<ModelInfo> {
  try {
    const res = await axios.get(`${SCORING_API_URL}/model-info`);
    return res.data as ModelInfo;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if the scoring API is healthy.
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await axios.get(`${SCORING_API_URL}/health`, { timeout: 20000 });
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}
