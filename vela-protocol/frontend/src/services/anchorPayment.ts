import { Asset, Keypair, Memo, Networks, Operation, StrKey, Transaction, TransactionBuilder, Horizon } from '@stellar/stellar-sdk';
import { ClassicAccount } from './classicAccount';
import { signWithFreighter } from './freighter';
import { USDC_ISSUER, getTransactionStatus, sep6Withdraw } from './anchor';
import { TransactionStatus } from '../types';

const horizon = new Horizon.Server('https://horizon-testnet.stellar.org');

export interface WithdrawSubmission {
  id: string;
  hash: string;
  anchorAccount: string;
  memo: string;
  memoType: string;
}

export async function ensureUsdcTrustline(account: ClassicAccount): Promise<{ created: boolean; hash?: string }> {
  if (!StrKey.isValidEd25519PublicKey(account.publicKey)) {
    throw new Error('A valid Stellar account is required');
  }
  const source = await horizon.loadAccount(account.publicKey);
  const existing = source.balances.some(balance =>
    (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') &&
    balance.asset_code === 'USDC' &&
    balance.asset_issuer === USDC_ISSUER
  );
  if (existing) return { created: false };

  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.changeTrust({ asset: new Asset('USDC', USDC_ISSUER) }))
    .setTimeout(180)
    .build();
  const signed = account.secret
    ? (tx.sign(Keypair.fromSecret(account.secret)), tx)
    : new Transaction(await signWithFreighter(tx.toEnvelope().toXDR('base64'), account.publicKey), Networks.TESTNET);
  const submitted = await horizon.submitTransaction(signed);
  return { created: true, hash: submitted.hash };
}

export async function getUsdcBalance(publicKey: string): Promise<string> {
  if (!StrKey.isValidEd25519PublicKey(publicKey)) throw new Error('A valid Stellar account is required');
  const source = await horizon.loadAccount(publicKey);
  const balance = source.balances.find(b =>
    (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') &&
    b.asset_code === 'USDC' &&
    b.asset_issuer === USDC_ISSUER
  );
  return balance?.balance ?? '0.0000000';
}

export async function withdrawToAnchor(
  account: ClassicAccount,
  jwt: string,
  amount: string,
  onSubmitted?: (submission: WithdrawSubmission) => void,
): Promise<{
  hash: string;
  status: TransactionStatus;
  anchorAccount: string;
  memo: string;
  memoType: string;
}> {
  if (!StrKey.isValidEd25519PublicKey(account.publicKey) || !/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(amount) || Number(amount) <= 0) {
    throw new Error('A classic account and positive USDC amount (up to 7 decimals) are required');
  }
  const source = await horizon.loadAccount(account.publicKey);
  const asset = new Asset('USDC', USDC_ISSUER);
  const balance = source.balances.find(b => (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') && b.asset_code === 'USDC' && b.asset_issuer === USDC_ISSUER);
  if (!balance) throw new Error('This account has no anchor USDC trustline. XLM collateral in Blend cannot be withdrawn as USDC.');
  if (Number(balance.balance) < Number(amount)) {
    throw new Error(`Your Stellar account has ${balance.balance} USDC available. Enter ${balance.balance} USDC or less.`);
  }
  const instructions = await sep6Withdraw(jwt, account.publicKey, amount);
  if (!instructions.id || !StrKey.isValidEd25519PublicKey(instructions.account_id)) throw new Error('Anchor returned invalid withdrawal instructions');
  if (!instructions.memo || !['text', 'id'].includes(instructions.memo_type)) {
    throw new Error('Unsupported or invalid anchor memo');
  }
  if (instructions.memo_type === 'text' && new TextEncoder().encode(instructions.memo).length > 28) {
    throw new Error('Anchor text memo exceeds Stellar limits');
  }
  if (instructions.memo_type === 'id' && (!/^\d+$/.test(instructions.memo) || BigInt(instructions.memo) > 18446744073709551615n)) {
    throw new Error('Anchor memo ID is not a valid uint64');
  }
  const memo = instructions.memo_type === 'id' ? Memo.id(instructions.memo) : Memo.text(instructions.memo);
  const tx = new TransactionBuilder(source, { fee: '100', networkPassphrase: Networks.TESTNET })
    .addOperation(Operation.payment({ destination: instructions.account_id, asset, amount }))
    .addMemo(memo).setTimeout(180).build();
  const signed = account.secret
    ? (tx.sign(Keypair.fromSecret(account.secret)), tx)
    : new Transaction(await signWithFreighter(tx.toEnvelope().toXDR('base64'), account.publicKey), Networks.TESTNET);
  const submitted = await horizon.submitTransaction(signed);
  const submission = {
    id: instructions.id,
    hash: submitted.hash,
    anchorAccount: instructions.account_id,
    memo: instructions.memo,
    memoType: instructions.memo_type,
  };
  onSubmitted?.(submission);
  for (let i = 0; i < 15; i++) {
    const status = await getTransactionStatus(jwt, instructions.id);
    if (status.status !== 'pending_user_transfer_start' && status.status !== 'pending_user_transfer_complete') {
      return {
        hash: submission.hash,
        status,
        anchorAccount: instructions.account_id,
        memo: instructions.memo,
        memoType: instructions.memo_type,
      };
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return {
    hash: submission.hash,
    status: await getTransactionStatus(jwt, instructions.id),
    anchorAccount: instructions.account_id,
    memo: instructions.memo,
    memoType: instructions.memo_type,
  };
}
