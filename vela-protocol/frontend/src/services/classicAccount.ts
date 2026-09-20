import axios from 'axios';
import { Asset, Keypair, Networks, Operation, StrKey, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';

const HORIZON_TESTNET = 'https://horizon-testnet.stellar.org';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const PENDING_DEPLOY_SOURCE_KEY = 'vela:testnet:pending-deploy-source';

export interface ClassicAccount {
  publicKey: string;
  secret?: string;
}

/**
 * Check if the account already has a USDC trustline.
 */
async function hasUsdcTrustline(publicKey: string): Promise<boolean> {
  try {
    const res = await axios.get(`${HORIZON_TESTNET}/accounts/${publicKey}`);
    const balances = res.data.balances || [];
    return balances.some((b: any) =>
      (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
      b.asset_code === 'USDC' &&
      b.asset_issuer === USDC_ISSUER
    );
  } catch {
    return false;
  }
}

/**
 * Establish a USDC trustline for the given keypair.
 * This is required so the Anchor can send USDC to this account during deposit (TRY→USDC).
 */
async function establishUsdcTrustline(pair: Keypair): Promise<void> {
  const server = new Horizon.Server(HORIZON_TESTNET);
  const account = await server.loadAccount(pair.publicKey());
  const usdcAsset = new Asset('USDC', USDC_ISSUER);

  const tx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(180)
    .build();

  tx.sign(pair);
  const result = await server.submitTransaction(tx);
  console.info('USDC trustline established for', pair.publicKey(), 'tx:', result.hash);
}

async function fundAndPrepare(pair: Keypair): Promise<ClassicAccount> {
  const publicKey = pair.publicKey();
  const response = await axios.get('https://friendbot.stellar.org', {
    params: { addr: publicKey }, timeout: 30000,
  });
  if (!response.data?.hash) throw new Error('Friendbot did not fund the classic account');
  console.info('Friendbot funded classic account:', publicKey, response.data.hash);
  await establishUsdcTrustline(pair);
  return { publicKey, secret: pair.secret() };
}

/** Create a funded classic account before a new Passkey wallet is deployed. */
export async function createFundedClassicAccount(): Promise<ClassicAccount> {
  return fundAndPrepare(Keypair.random());
}

export function restorePendingClassicAccount(): ClassicAccount | null {
  const secret = sessionStorage.getItem(PENDING_DEPLOY_SOURCE_KEY);
  if (!secret) return null;
  try {
    const pair = Keypair.fromSecret(secret);
    return { publicKey: pair.publicKey(), secret };
  } catch {
    sessionStorage.removeItem(PENDING_DEPLOY_SOURCE_KEY);
    return null;
  }
}

/** Persist the already-funded deployer under the newly-created wallet address. */
export function bindClassicAccount(passkeyAddress: string, account: ClassicAccount): ClassicAccount {
  if (!StrKey.isValidContract(passkeyAddress) || !account.secret || !StrKey.isValidEd25519PublicKey(account.publicKey)) {
    throw new Error('Cannot bind an invalid classic account to the Passkey wallet');
  }
  sessionStorage.setItem(`vela:testnet:classic:${passkeyAddress}`, account.secret);
  return account;
}

/** Whether this browser session still has the helper G-account for a Passkey wallet. */
export function hasBoundClassicAccount(passkeyAddress: string): boolean {
  if (!StrKey.isValidContract(passkeyAddress)) return false;
  const saved = sessionStorage.getItem(`vela:testnet:classic:${passkeyAddress}`);
  if (!saved) return false;
  try {
    return StrKey.isValidEd25519SecretSeed(saved);
  } catch {
    return false;
  }
}

export async function provisionClassicAccount(passkeyAddress: string): Promise<ClassicAccount> {
  if (!StrKey.isValidContract(passkeyAddress)) throw new Error('Invalid passkey address');

  // Session-scoped MVP custody: reconnecting in this tab reuses the funded account.
  const key = `vela:testnet:classic:${passkeyAddress}`;
  const saved = sessionStorage.getItem(key);
  if (saved) {
    const pair = Keypair.fromSecret(saved);
    try {
      const account = await axios.get(`${HORIZON_TESTNET}/accounts/${pair.publicKey()}`);
      if (account.status === 200) {
        // Ensure trustline exists even for restored sessions
        if (!(await hasUsdcTrustline(pair.publicKey()))) {
          await establishUsdcTrustline(pair);
        }
        return { publicKey: pair.publicKey(), secret: saved };
      }
    } catch {
      // Account may have been merged or not found — re-provision below
    }
  }

  const pair = Keypair.random();
  const classic = await fundAndPrepare(pair);
  sessionStorage.setItem(key, pair.secret());
  return classic;
}
