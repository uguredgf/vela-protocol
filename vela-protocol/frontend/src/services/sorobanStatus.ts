export async function getSorobanTransactionStatus(rpcUrl: string, hash: string): Promise<'SUCCESS' | 'FAILED' | 'NOT_FOUND'> {
  if (!/^[0-9a-f]{64}$/i.test(hash)) throw new Error('Invalid transaction hash');
  // SDK 12 cannot decode newer transaction metadata. Status needs no XDR decoding.
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: { hash } }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Transaction status HTTP ${response.status}; tx: ${hash}`);
  const data = await response.json();
  if (data.error) throw new Error(`Transaction status unavailable: ${data.error.message}; tx: ${hash}`);
  const status = data.result?.status;
  if (status !== 'SUCCESS' && status !== 'FAILED' && status !== 'NOT_FOUND') {
    throw new Error(`Unexpected transaction status; tx: ${hash}`);
  }
  return status;
}
