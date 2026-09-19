import axios from 'axios';
import { StellarTransaction, Balance } from '../types';
import { StrKey } from '@stellar/stellar-sdk';

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const EXPLORER_BASE = 'https://stellar.expert/explorer/testnet';

/**
 * Fetch transaction/operation history for a Stellar account from Horizon API.
 * Normalizes the data into our StellarTransaction format.
 */
export async function fetchTransactionHistory(accountId: string): Promise<StellarTransaction[]> {
  if (!StrKey.isValidEd25519PublicKey(accountId)) throw new Error('Horizon requires a classic G-address');
  try {
    const res = await axios.get(
      `${HORIZON_TESTNET}/accounts/${accountId}/operations`,
      {
        params: { limit: 200, order: 'desc' },
      }
    );

    const records = res.data._embedded?.records || [];
    
    return records
      .filter((op: any) => op.type === 'payment' || op.type === 'create_account')
      .map((op: any) => ({
        id: op.id || op.transaction_hash,
        timestamp: op.created_at,
        amount: op.amount || op.starting_balance || '0',
        asset_code: op.asset_code || 'XLM',
        counterparty: op.from === accountId ? (op.to || op.account) : (op.from || 'unknown'),
        type: op.type,
        direction: op.to === accountId || op.account === accountId ? 'received' : 'sent',
      })) as StellarTransaction[];
  } catch (error) {
    console.error('Horizon transaction history request failed:', error);
    throw error;
  }
}

/**
 * Get account balances from Horizon.
 */
export async function getAccountBalance(accountId: string): Promise<Balance[]> {
  if (!StrKey.isValidEd25519PublicKey(accountId)) throw new Error('Horizon requires a classic G-address');
  try {
    const res = await axios.get(`${HORIZON_TESTNET}/accounts/${accountId}`);
    return res.data.balances.map((b: any) => ({
      asset_code: b.asset_code || 'XLM',
      asset_issuer: b.asset_issuer || 'native',
      balance: b.balance,
    }));
  } catch (error) {
    console.error('Horizon balance request failed:', error);
    throw error;
  }
}

/**
 * Submit a signed transaction XDR to the Stellar testnet.
 */
export async function submitTransaction(xdr: string): Promise<any> {
  try {
    const res = await axios.post(`${HORIZON_TESTNET}/transactions`, `tx=${encodeURIComponent(xdr)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  } catch (error: any) {
    console.error('Transaction submission failed:', error?.response?.data || error);
    throw error;
  }
}

/**
 * Get Stellar Expert explorer URL for a transaction hash.
 */
export function getExplorerUrl(txHash: string): string {
  return `${EXPLORER_BASE}/tx/${txHash}`;
}

/**
 * Get Stellar Expert explorer URL for an account.
 */
export function getAccountExplorerUrl(accountId: string): string {
  return `${EXPLORER_BASE}/account/${accountId}`;
}
