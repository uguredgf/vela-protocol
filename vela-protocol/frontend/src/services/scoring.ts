import axios from 'axios';
import { ScoreResult, ModelInfo, StellarTransaction } from '../types';
import { StrKey } from '@stellar/stellar-sdk';

const API_BASE = import.meta.env.VITE_SCORING_API_URL || 'http://localhost:8000';

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

    const res = await axios.post(`${API_BASE}/score`, payload, {
      timeout: 30000,
    });

    return res.data as ScoreResult;
  } catch (error) {
    throw error;
  }
}

/**
 * Get score by account ID only (service fetches transactions from Horizon).
 */
export async function getScoreByAccountId(accountId: string): Promise<ScoreResult> {
  if (!StrKey.isValidEd25519PublicKey(accountId)) throw new Error('Scoring requires a valid classic G-address');
  try {
    const res = await axios.get(`${API_BASE}/score/${accountId}`, {
      timeout: 30000,
    });
    return res.data as ScoreResult;
  } catch (error) {
    throw error;
  }
}

/**
 * Get model information and responsible AI notes.
 */
export async function getModelInfo(): Promise<ModelInfo> {
  try {
    const res = await axios.get(`${API_BASE}/model-info`);
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
    const res = await axios.get(`${API_BASE}/health`, { timeout: 5000 });
    return res.data.status === 'ok';
  } catch {
    return false;
  }
}
