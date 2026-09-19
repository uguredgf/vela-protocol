import { getNetworkDetails, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import { Networks, StrKey } from '@stellar/stellar-sdk';

export async function connectFreighter(): Promise<string> {
  const connection = await isConnected();
  if (connection.error || !connection.isConnected) throw new Error('Freighter extension is not available in this browser');

  const access = await requestAccess();
  if (access.error || !StrKey.isValidEd25519PublicKey(access.address)) {
    throw new Error(access.error?.message || 'Freighter access was not granted');
  }

  const network = await getNetworkDetails();
  if (network.error || network.networkPassphrase !== Networks.TESTNET) {
    throw new Error('Switch Freighter to Stellar Testnet and try again');
  }
  return access.address;
}

export async function signWithFreighter(xdr: string, address: string): Promise<string> {
  const result = await signTransaction(xdr, { networkPassphrase: Networks.TESTNET, address });
  if (result.error || !result.signedTxXdr || result.signerAddress !== address) {
    throw new Error(result.error?.message || 'Freighter did not sign for the connected account');
  }
  return result.signedTxXdr;
}
