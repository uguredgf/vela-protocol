import { PasskeyKit } from 'passkey-kit';
import { IndexedDBStorage } from 'passkey-kit/storage';
import { Keypair, Networks, rpc, TransactionBuilder } from '@stellar/stellar-sdk';
import { getSorobanTransactionStatus } from './sorobanStatus';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;
// Canonical Passkey-Kit smart-wallet WASM hash for testnet.
const WALLET_WASM_HASH = '97ce047884106b1c6c3bb40b8973cc48db1c4dad95c9e20462bf2c701daa764e';
const PENDING_WALLET_KEY = 'vela:testnet:pending-passkey-wallet';

let kit: PasskeyKit | null = null;

function getKit(deploySource?: string): PasskeyKit {
  if (!kit || deploySource) {
    kit = new PasskeyKit({
      rpcUrl: RPC_URL,
      networkPassphrase: NETWORK_PASSPHRASE,
      walletWasmHash: WALLET_WASM_HASH,
      rpId: window.location.hostname,
      storage: new IndexedDBStorage(),
      ...(deploySource ? { deploySource } : {}),
    });
  }
  return kit;
}

export function isPasskeySupported(): boolean {
  return !!(window.isSecureContext && window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function');
}

export function assertPasskeyEnvironment(): void {
  if (!isPasskeySupported()) {
    throw new Error('Passkeys require localhost or HTTPS with WebAuthn support');
  }
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(window.location.hostname)) {
    throw new Error('PasskeyKit requires a hostname RP ID. Open the app at http://localhost:5173 instead of 127.0.0.1:5173.');
  }
}

export async function createWallet(deploySource: string): Promise<{ address: string; contractId: string; type: 'passkey'; creationHash: string }> {
  assertPasskeyEnvironment();
  if (!deploySource) throw new Error('A funded classic account is required to deploy the Passkey wallet');

  const activeKit = getKit(deploySource);
  const saved = sessionStorage.getItem(PENDING_WALLET_KEY);
  let created: Awaited<ReturnType<PasskeyKit['createWallet']>>;
  if (saved) {
    const pending = JSON.parse(saved) as { deploySource: string; created: { rawResponse: Awaited<ReturnType<PasskeyKit['createWallet']>>['rawResponse']; keyId: number[]; keyIdBase64: string; publicKey: number[]; contractId: string; signedTx: string } };
    if (pending.deploySource === deploySource) {
      created = { ...pending.created, keyId: new Uint8Array(pending.created.keyId), publicKey: new Uint8Array(pending.created.publicKey) };
    } else {
      sessionStorage.removeItem(PENDING_WALLET_KEY);
      created = await activeKit.createWallet('Vela Protocol', 'vela-user');
    }
  } else {
    created = await activeKit.createWallet('Vela Protocol', 'vela-user');
  }
  sessionStorage.setItem(PENDING_WALLET_KEY, JSON.stringify({
    deploySource,
    created: { ...created, keyId: Array.from(created.keyId), publicKey: Array.from(created.publicKey) },
  }));
  // RPC simulation can return a resource fee that is immediately stale on the
  // busy testnet. Increase it while preserving Soroban data, then re-sign the
  // custom deployer envelope before submission.
  const signed = TransactionBuilder.fromXDR(created.signedTx, NETWORK_PASSPHRASE);
  const envelope = signed.toEnvelope();
  const inner = envelope.v1().tx();
  const resourceFee = Number(inner.ext().sorobanData().resourceFee().toString());
  inner.fee(Math.max(Math.ceil(resourceFee * 2), 10_000_000));
  envelope.v1().signatures([]);
  const tx = TransactionBuilder.fromXDR(envelope.toXDR('base64'), NETWORK_PASSPHRASE);
  tx.sign(Keypair.fromSecret(deploySource));
  const server = new rpc.Server(RPC_URL);
  const sent = await server.sendTransaction(tx);
  if (sent.status !== 'PENDING') throw new Error(`Passkey wallet deployment failed: ${JSON.stringify(sent)}`);

  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const status = await getSorobanTransactionStatus(RPC_URL, sent.hash);
    if (status === 'SUCCESS') {
      await activeKit.confirmWalletCreation(created, sent.hash);
      sessionStorage.removeItem(PENDING_WALLET_KEY);
      return { address: created.contractId, contractId: created.contractId, type: 'passkey', creationHash: sent.hash };
    }
    if (status === 'FAILED') throw new Error(`Passkey wallet deployment failed: ${sent.hash}`);
  }
  throw new Error(`Passkey wallet deployment is still pending: ${sent.hash}`);
}

export async function connectWallet(): Promise<{ address: string; contractId: string; type: 'passkey' }> {
  assertPasskeyEnvironment();
  const connected = await getKit().connectWallet();
  return { address: connected.contractId, contractId: connected.contractId, type: 'passkey' };
}

export async function signTransaction(_xdr: string): Promise<string> {
  throw new Error('Use PasskeyKit wallet signing for smart-wallet transactions');
}
