import { getNetworkDetails, isConnected, requestAccess, signTransaction } from '@stellar/freighter-api';
import { Networks, StrKey } from '@stellar/stellar-sdk';

export class FreighterNetworkError extends Error {
  readonly currentNetwork: string;

  constructor(currentNetwork: string) {
    super(`Freighter is connected to ${currentNetwork}. Open Freighter, switch Network to Testnet, then click Connect Freighter again.`);
    this.name = 'FreighterNetworkError';
    this.currentNetwork = currentNetwork;
  }
}

export async function connectFreighter(): Promise<string> {
  const connection = await isConnected();
  if (connection.error || !connection.isConnected) {
    throw new Error('Freighter was not detected. Open this site in Chrome or Edge with the Freighter extension installed and unlocked, switch Freighter to Testnet, then try again. In-app browsers cannot access browser extensions.');
  }

  const network = await getNetworkDetails();
  if (network.error) {
    throw new Error(network.error.message || 'Freighter network could not be read. Unlock Freighter and try again.');
  }
  if (network.networkPassphrase !== Networks.TESTNET) {
    throw new FreighterNetworkError(network.network || 'a non-Testnet network');
  }

  const access = await requestAccess();
  if (access.error || !StrKey.isValidEd25519PublicKey(access.address)) {
    throw new Error(access.error?.message || 'Freighter access was not granted');
  }

  // Re-check after account approval in case the extension network changed while
  // its popup was open.
  const confirmedNetwork = await getNetworkDetails();
  if (confirmedNetwork.error || confirmedNetwork.networkPassphrase !== Networks.TESTNET) {
    throw new FreighterNetworkError(confirmedNetwork.network || 'a non-Testnet network');
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
