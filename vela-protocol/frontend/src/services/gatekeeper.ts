import { Contract, Keypair, Networks, StrKey, Transaction, TransactionBuilder, nativeToScVal, rpc, xdr } from '@stellar/stellar-sdk';
import { ClassicAccount } from './classicAccount';
import { signWithFreighter } from './freighter';
import { getSorobanTransactionStatus } from './sorobanStatus';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const contractId = import.meta.env.VITE_GATEKEEPER_CONTRACT_ID;

export async function submitOpenPosition(
  account: ClassicAccount, proof: Uint8Array, publicInputs: Uint8Array, amount: number, identityHash: Uint8Array,
): Promise<string> {
  if (!contractId || !StrKey.isValidContract(contractId)) throw new Error('VITE_GATEKEEPER_CONTRACT_ID must identify a deployed testnet gatekeeper');
  if (!StrKey.isValidEd25519PublicKey(account.publicKey)) throw new Error('A classic G-address is required');
  if (publicInputs.length !== 36) {
    throw new Error('A qualifying 36-byte threshold claim is required');
  }
  if (identityHash.length !== 32) throw new Error('A 32-byte verified identity hash is required');
  const thresholdFlag = (publicInputs[32] << 24) | (publicInputs[33] << 16) | (publicInputs[34] << 8) | publicInputs[35];
  if (thresholdFlag !== 1) {
    throw new Error('The threshold claim does not qualify for a position');
  }
  if (!Number.isSafeInteger(amount * 1e7) || amount <= 0) throw new Error('Enter a valid collateral amount (7 decimal places maximum)');
  const server = new rpc.Server(RPC_URL);
  const instance = await server.getContractData(contractId, xdr.ScVal.scvLedgerKeyContractInstance());
  const storage = instance.val.contractData().val().instance().storage();
  if (!storage?.length) {
    throw new Error('Gatekeeper is deployed but not initialized on testnet. No transaction was submitted.');
  }
  const source = await server.getAccount(account.publicKey);
  const tx = new TransactionBuilder(source, { fee: '100000', networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(contractId).call('open_position',
      nativeToScVal(account.publicKey, { type: 'address' }),
      nativeToScVal(proof, { type: 'bytes' }),
      nativeToScVal(publicInputs, { type: 'bytes' }),
      nativeToScVal(BigInt(Math.round(amount * 1e7)), { type: 'i128' }),
      nativeToScVal(identityHash, { type: 'bytes' }),
    )).setTimeout(180).build();
  const prepared = await server.prepareTransaction(tx);
  const signed = account.secret
    ? (prepared.sign(Keypair.fromSecret(account.secret)), prepared)
    : new Transaction(await signWithFreighter(prepared.toEnvelope().toXDR('base64'), account.publicKey), Networks.TESTNET);
  const sent = await server.sendTransaction(signed);
  if (sent.status !== 'PENDING') throw new Error(`Soroban submission failed: ${JSON.stringify(sent)}`);
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const status = await getSorobanTransactionStatus(RPC_URL, sent.hash);
    if (status === 'SUCCESS') return sent.hash;
    if (status === 'FAILED') throw new Error(`Soroban transaction failed: ${sent.hash}`);
  }
  throw new Error(`Soroban transaction still pending: ${sent.hash}`);
}
