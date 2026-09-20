import axios from 'axios';
import { Networks, StrKey, WebAuth } from '@stellar/stellar-sdk';
import { StellarToml, DepositResponse, WithdrawResponse, TransactionStatus, Quote } from '../types';

// ─── Anchor Configuration ───────────────────────────────────────────────────
export const ANCHOR_DOMAIN = 'tr-mock-anchor.fly.dev';
export const ANCHOR_BASE = `https://${ANCHOR_DOMAIN}`;
export const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const ANCHOR_SIGNING_KEY = 'GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M';

// DEMO_MODE: sadece bilinçli olarak açıldığında mock veri döner.
// Kapalıyken (varsayılan) her hata yukarı fırlatılır, sessizce sahte veriye düşülmez.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export interface AnchorHealth {
  reachable: boolean;
  stellarMode: string;
  treasuryUsdc: string;
  lowBalance: boolean;
  checkedAt: string;
}

// Cached TOML data
let cachedToml: StellarToml | null = null;

// ─── SEP: stellar.toml Discovery ────────────────────────────────────────────

export async function fetchStellarToml(): Promise<StellarToml> {
  if (cachedToml) return cachedToml;

  try {
    const res = await axios.get(`${ANCHOR_BASE}/.well-known/stellar.toml`);
    const text: string = res.data;

    const toml: StellarToml = {
      WEB_AUTH_ENDPOINT: '',
      TRANSFER_SERVER: '',
      KYC_SERVER: '',
      ANCHOR_QUOTE_SERVER: '',
      SIGNING_KEY: '',
      NETWORK_PASSPHRASE: '',
    };

    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('WEB_AUTH_ENDPOINT')) toml.WEB_AUTH_ENDPOINT = extractTomlValue(trimmed);
      if (trimmed.startsWith('TRANSFER_SERVER')) toml.TRANSFER_SERVER = extractTomlValue(trimmed);
      if (trimmed.startsWith('KYC_SERVER')) toml.KYC_SERVER = extractTomlValue(trimmed);
      if (trimmed.startsWith('ANCHOR_QUOTE_SERVER')) toml.ANCHOR_QUOTE_SERVER = extractTomlValue(trimmed);
      if (trimmed.startsWith('SIGNING_KEY')) toml.SIGNING_KEY = extractTomlValue(trimmed);
      if (trimmed.startsWith('NETWORK_PASSPHRASE')) toml.NETWORK_PASSPHRASE = extractTomlValue(trimmed);
    }

    cachedToml = toml;
    return toml;
  } catch (error) {
    // Config keşfi başarısız olursa bilinen sabit değerlere düş — bu finansal veri
    // uydurmak değil, sadece endpoint adreslerini bilmek, bu yüzden DEMO_MODE'a bağlı değil.
    console.warn('stellar.toml alınamadı, bilinen sabit değerler kullanılıyor:', error);
    cachedToml = {
      WEB_AUTH_ENDPOINT: `${ANCHOR_BASE}/auth`,
      TRANSFER_SERVER: `${ANCHOR_BASE}/sep6`,
      KYC_SERVER: `${ANCHOR_BASE}/sep12`,
      ANCHOR_QUOTE_SERVER: `${ANCHOR_BASE}/sep38`,
      SIGNING_KEY: ANCHOR_SIGNING_KEY,
      NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    };
    return cachedToml;
  }
}

function extractTomlValue(line: string): string {
  const match = line.match(/=\s*"([^"]*)"/);
  return match ? match[1] : '';
}

/**
 * Lightweight reachability check. This deliberately does not claim that an
 * asynchronous payout worker is healthy; transaction status remains the source
 * of truth for an individual SEP-6 transfer.
 */
export async function getAnchorHealth(): Promise<AnchorHealth> {
  try {
    const response = await axios.get(`${ANCHOR_BASE}/health`, { timeout: 8_000 });
    const data = response.data;
    const trusted = data?.ok === true &&
      data?.network_passphrase === Networks.TESTNET &&
      data?.sep?.signing_key === ANCHOR_SIGNING_KEY;
    if (!trusted) throw new Error('Anchor health response failed trust checks');
    return {
      reachable: true,
      stellarMode: String(data.stellar_mode || 'unknown'),
      treasuryUsdc: String(data.treasury?.usdc_balance || 'unknown'),
      lowBalance: data.treasury?.low_balance === true,
      checkedAt: String(data.time || new Date().toISOString()),
    };
  } catch (error) {
    const healthError = new Error('Anchor gateway is currently unreachable. No transfer was submitted.') as Error & { cause?: unknown };
    healthError.cause = error;
    throw healthError;
  }
}

// ─── SEP-10: Authentication ─────────────────────────────────────────────────

export async function sep10Auth(
  accountId: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<string> {
  const toml = await fetchStellarToml();
  if (!StrKey.isValidEd25519PublicKey(accountId) || toml.NETWORK_PASSPHRASE !== Networks.TESTNET ||
      toml.SIGNING_KEY !== ANCHOR_SIGNING_KEY || new URL(toml.WEB_AUTH_ENDPOINT).origin !== ANCHOR_BASE) {
    throw new Error('Untrusted SEP-10 anchor configuration');
  }

  try {
    const challengeRes = await axios.get(`${toml.WEB_AUTH_ENDPOINT}`, {
      params: { account: accountId }
    });

    const { transaction: challengeXdr } = challengeRes.data;
    const challenge = WebAuth.readChallengeTx(challengeXdr, toml.SIGNING_KEY, Networks.TESTNET, ANCHOR_DOMAIN, ANCHOR_DOMAIN);
    if (challenge.clientAccountID !== accountId) throw new Error('SEP-10 challenge is for a different account');
    const signedXdr = await signTransaction(challengeXdr);
    WebAuth.verifyChallengeTxSigners(signedXdr, toml.SIGNING_KEY, Networks.TESTNET, [accountId], ANCHOR_DOMAIN, ANCHOR_DOMAIN);

    const tokenRes = await axios.post(`${toml.WEB_AUTH_ENDPOINT}`, {
      transaction: signedXdr,
    });

    return tokenRes.data.token;
  } catch (error) {
    throw error;
  }
}

// ─── SEP-6: Deposit (TRY → USDC) ───────────────────────────────────────────

export async function sep6Deposit(
  jwt: string,
  accountId: string,
  amount: string
): Promise<DepositResponse> {
  const toml = await fetchStellarToml();

  try {
    const res = await axios.get(`${toml.TRANSFER_SERVER}/deposit`, {
      params: {
        asset_code: 'USDC',
        account: accountId,
        amount: amount,
        type: 'bank_account',
      },
      headers: { Authorization: `Bearer ${jwt}` },
    });

    return {
      id: res.data.id,
      how: res.data.how || 'Transfer TRY to the provided IBAN',
      instructions: res.data.instructions || {},
      eta: res.data.eta || 60,
      min_amount: res.data.min_amount || '50',
      max_amount: res.data.max_amount || '3000',
    };
  } catch (error) {
    throw error;
  }
}

// ─── SEP-6: Withdraw (USDC → TRY) ──────────────────────────────────────────

export async function sep6Withdraw(
  jwt: string,
  accountId: string,
  amount: string
): Promise<WithdrawResponse> {
  const toml = await fetchStellarToml();

  try {
    const res = await axios.get(`${toml.TRANSFER_SERVER}/withdraw`, {
      params: {
        asset_code: 'USDC',
        account: accountId,
        type: 'bank_account',
        amount: amount,
      },
      headers: { Authorization: `Bearer ${jwt}` },
    });

    return {
      id: res.data.id,
      account_id: res.data.account_id,
      memo: res.data.memo,
      memo_type: res.data.memo_type || 'id',
      eta: res.data.eta || 120,
    };
  } catch (error) {
    throw error;
  }
}

// ─── Simulate Bank Transfer (Testnet only) ──────────────────────────────────

export async function simulateBankTransfer(jwt: string, txId: string): Promise<void> {
  const toml = await fetchStellarToml();

  try {
    await axios.post(
      `${toml.TRANSFER_SERVER}/tx/${txId}/simulate-bank-transfer`,
      {},
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
  } catch (error) {
    if (DEMO_MODE) {
      console.warn('[DEMO_MODE] Banka transferi simülasyonu hatası yutuldu:', error);
      return;
    }
    throw error;
  }
}

// ─── Poll Transaction Status ────────────────────────────────────────────────

export async function getTransactionStatus(jwt: string, txId: string): Promise<TransactionStatus> {
  const toml = await fetchStellarToml();

  try {
    const res = await axios.get(`${toml.TRANSFER_SERVER}/transaction`, {
      params: { id: txId },
      headers: { Authorization: `Bearer ${jwt}` },
    });

    return {
      id: res.data.transaction.id,
      status: res.data.transaction.status,
      status_eta: res.data.transaction.status_eta,
      amount_in: res.data.transaction.amount_in,
      amount_out: res.data.transaction.amount_out,
      started_at: res.data.transaction.started_at,
      completed_at: res.data.transaction.completed_at,
    };
  } catch (error) {
    throw error;
  }
}

// ─── SEP-38: Quote ──────────────────────────────────────────────────────────

export async function sep38Quote(
  jwt: string,
  sellAsset: string,
  buyAsset: string,
  amount: string
): Promise<Quote> {
  const toml = await fetchStellarToml();

  try {
    const res = await axios.get(`${toml.ANCHOR_QUOTE_SERVER}/quote`, {
      params: {
        sell_asset: `stellar:${sellAsset}`,
        buy_asset: `stellar:${buyAsset}:${USDC_ISSUER}`,
        sell_amount: amount,
      },
      headers: { Authorization: `Bearer ${jwt}` },
    });

    return {
      id: res.data.id,
      price: res.data.price,
      total_price: res.data.total_price || res.data.price,
      sell_amount: res.data.sell_amount,
      buy_amount: res.data.buy_amount,
      expires_at: res.data.expires_at,
    };
  } catch (error) {
    if (DEMO_MODE) {
      console.warn('[DEMO_MODE] SEP-38 quote fallback kur kullanılıyor:', error);
      const rate = 34.5;
      return {
        id: `quote_${Date.now()}`,
        price: rate.toString(),
        total_price: rate.toString(),
        sell_amount: amount,
        buy_amount: (Number(amount) / rate).toFixed(2),
        expires_at: new Date(Date.now() + 300000).toISOString(),
      };
    }
    throw error;
  }
}

// ─── SEP-12: KYC ────────────────────────────────────────────────────────────

export async function sep12KYC(jwt: string, accountId: string): Promise<{ status: string; customer_id: string }> {
  const toml = await fetchStellarToml();

  try {
    const headers = { Authorization: `Bearer ${jwt}` };
    let customer = await axios.get(`${toml.KYC_SERVER}/customer`, {
      params: { account: accountId },
      headers,
    });

    if (customer.data.status === 'NEEDS_INFO') {
      const registration = await axios.put(
        `${toml.KYC_SERVER}/customer`,
        { account: accountId },
        { headers },
      );
      const registeredId = String(registration.data.id || registration.data.customer_id || '');
      if (!registeredId) throw new Error('Anchor SEP-12 registration did not return a customer id');
      customer = await axios.get(`${toml.KYC_SERVER}/customer`, {
        params: { id: registeredId },
        headers,
      });
    }

    const customerId = String(customer.data.id || customer.data.customer_id || customer.data.customerId || '');
    if (!customerId) throw new Error('Anchor SEP-12 response did not include customer_id');
    return { status: String(customer.data.status || 'UNKNOWN'), customer_id: customerId };
  } catch (error) {
    if (DEMO_MODE) {
      console.warn('[DEMO_MODE] KYC mock ACCEPTED dönüyor:', error);
      return { status: 'ACCEPTED', customer_id: `demo:${accountId}` };
    }
    throw error;
  }
}

// ─── Polling Helper ─────────────────────────────────────────────────────────

export async function pollUntilComplete(
  jwt: string,
  txId: string,
  onUpdate?: (status: TransactionStatus) => void,
  maxAttempts = 30,
  intervalMs = 3000
): Promise<TransactionStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTransactionStatus(jwt, txId);
    onUpdate?.(status);

    if (status.status === 'completed' || status.status === 'error') {
      return status;
    }

    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return { id: txId, status: 'timeout' };
}
