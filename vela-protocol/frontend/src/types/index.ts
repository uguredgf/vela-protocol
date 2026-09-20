// ─── Core Types ─────────────────────────────────────────────────────────────

export interface Position {
  id: number;
  user: string;
  collateral: number;
  subsidy: number;
  totalPosition: number;
  subsidyPercentage: number;
  tier: 'high' | 'medium' | 'low';
  status: 'pending' | 'active' | 'closed';
  txHash?: string;
  timestamp: number;
}

export interface ScoreResult {
  score: number;
  tier: string;
  threshold_met: boolean;
  explanation: {
    base_value: number;
    feature_contributions: Record<string, number>;
  };
  features: Record<string, number>;
}

export interface ModelInfo {
  model_type: string;
  hyperparameters: Record<string, any>;
  responsible_ai: {
    features_used: string[];
    features_NOT_used: string[];
    proxy_variable_analysis: string;
    model_limitations: string;
  };
}

// ─── Anchor Types ───────────────────────────────────────────────────────────

export interface StellarToml {
  WEB_AUTH_ENDPOINT: string;
  TRANSFER_SERVER: string;
  KYC_SERVER: string;
  ANCHOR_QUOTE_SERVER: string;
  SIGNING_KEY: string;
  NETWORK_PASSPHRASE: string;
}

export interface DepositResponse {
  id: string;
  how: string;
  instructions: Record<string, string>;
  eta: number;
  min_amount: string;
  max_amount: string;
}

export interface WithdrawResponse {
  id: string;
  account_id: string;
  memo: string;
  memo_type: string;
  eta: number;
}

export interface TransactionStatus {
  id: string;
  status: string;
  status_eta?: number;
  amount_in?: string;
  amount_out?: string;
  started_at?: string;
  completed_at?: string;
}

export interface Quote {
  id: string;
  price: string;
  total_price: string;
  sell_amount: string;
  buy_amount: string;
  expires_at: string;
}

export interface AnchorTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  status: string;
  amount: string;
  asset: string;
  startedAt: string;
  completedAt?: string;
  txHash?: string;
  anchorAccount?: string;
  memo?: string;
  memoType?: string;
}

// ─── ZK Proof Types ─────────────────────────────────────────────────────────

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
  publicInputsBytes: Uint8Array;
  meetsThreshold: boolean;
  proofSizeBytes: number;
  provingTimeMs: number;
  commitment: string;
  threshold: number;
}

// ─── Stellar Types ──────────────────────────────────────────────────────────

export interface StellarTransaction {
  id: string;
  timestamp: string;
  amount: string;
  asset_code: string;
  counterparty: string;
  type: string;
  direction: 'sent' | 'received';
}

export interface Balance {
  asset_code: string;
  asset_issuer: string;
  balance: string;
}

// ─── Blend Types ────────────────────────────────────────────────────────────

export interface BlendReserve {
  asset: string;
  supply: string;
  borrow: string;
  rate: string;
}

export interface BlendPoolInfo {
  id: string;
  reserves: BlendReserve[];
  totalSupply: string;
  totalBorrow: string;
}
