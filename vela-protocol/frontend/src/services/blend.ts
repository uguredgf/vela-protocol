import { BlendPoolInfo, BlendReserve, Position } from '../types';
import { StrKey } from '@stellar/stellar-sdk';

/**
 * Blend v2 position estimate service
 * 
 * Provides local position estimates. No on-chain borrow call is made; the
 * gatekeeper contract performs the collateral supply transaction.
 * 
 * Testnet Contract Addresses:
 * - Pool Factory V2: CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6
 * - TestnetV2 Pool:  CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF
 * - USDC Token:      CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU
 * - BLND Token:      CB22KRA3YZVCNCQI64JQ5WE7UY2VAV7WFLK6A2JN3HEX56T2EDAFO7QF
 */

const BLEND_POOL_ID = 'CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF';

// ─── Subsidy Tier Calculation (mirrors the Soroban contract) ────────────────

export function calculateSubsidyTier(score: number): {
  percentage: number;
  tier: 'high' | 'medium' | 'low' | 'rejected';
  label: string;
} {
  if (score >= 80) return { percentage: 40, tier: 'high', label: 'High Trust — 40% Subsidy' };
  if (score >= 60) return { percentage: 40, tier: 'medium', label: 'Qualified — 40% Subsidy' };
  if (score >= 40) return { percentage: 0, tier: 'low', label: 'Below contract threshold' };
  return { percentage: 0, tier: 'rejected', label: 'Insufficient Score — Rejected' };
}

export function calculatePosition(
  collateralAmount: number, 
  score: number
): {
  userCollateral: number;
  subsidyAmount: number;
  totalPosition: number;
  borrowAmount: number;
  subsidyPercentage: number;
  ltv: number;
} {
  const { percentage } = calculateSubsidyTier(score);
  const subsidyAmount = (collateralAmount * percentage) / 100;
  const totalPosition = collateralAmount + subsidyAmount;
  
  // Blend v2 standard: ~75% LTV for USDC collateral
  const ltv = 0.75;
  const borrowAmount = totalPosition * ltv;
  
  return {
    userCollateral: collateralAmount,
    subsidyAmount,
    totalPosition,
    borrowAmount,
    subsidyPercentage: percentage,
    ltv,
  };
}

// ─── Pool Information ───────────────────────────────────────────────────────

export async function getPoolInfo(): Promise<BlendPoolInfo> {
  throw new Error(`Blend pool reserve query is not implemented for ${BLEND_POOL_ID}`);
}

export async function getPoolReserves(): Promise<BlendReserve[]> {
  const info = await getPoolInfo();
  return info.reserves;
}

// ─── Position Management ────────────────────────────────────────────────────

/**
 * Preview a subsidized position locally. No gatekeeper or Blend transaction is submitted.
 */
export async function openPosition(
  userAddress: string,
  collateralAmount: number,
  score: number,
  proofData: Uint8Array,
): Promise<Position> {
  const calc = calculatePosition(collateralAmount, score);
  const { tier } = calculateSubsidyTier(score);

  if (!StrKey.isValidContract(userAddress)) throw new Error('A Passkey C-address is required');
  if (!Number.isFinite(collateralAmount) || collateralAmount <= 0) throw new Error('Enter a valid collateral amount');
  if (!proofData.length || score < 60) throw new Error('A qualifying proof is required');
  if (tier === 'rejected') {
    throw new Error('Score too low for any subsidy tier');
  }

  const position: Position = {
    id: Math.floor(Math.random() * 10000),
    user: userAddress,
    collateral: calc.userCollateral,
    subsidy: calc.subsidyAmount,
    totalPosition: calc.totalPosition,
    borrowAmount: calc.borrowAmount,
    subsidyPercentage: calc.subsidyPercentage,
    tier: tier as 'high' | 'medium' | 'low',
    status: 'pending',
    timestamp: Date.now(),
  };

  return position;
}

/**
 * Get an existing position for a user.
 */
export async function getUserPosition(_accountId: string): Promise<Position | null> {
  // In production: query the gatekeeper contract
  // For MVP: return null (no existing position)
  return null;
}

/**
 * Get the current subsidy pool balance.
 */
export async function getSubsidyPoolBalance(): Promise<string> {
  throw new Error('Gatekeeper subsidy balance query is not implemented');
}
