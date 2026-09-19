import assert from 'node:assert/strict';
import { Keypair, Networks, Transaction, WebAuth } from '@stellar/stellar-sdk';
import { createServer } from 'vite';

// Live SEP-10 check: ephemeral, unfunded test identities; no payments or secret output.
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { sep10Auth, ANCHOR_SIGNING_KEY, ANCHOR_DOMAIN } = await server.ssrLoadModule('/src/services/anchor.ts');
  const client = Keypair.random();
  let receivedChallenge;
  const token = await sep10Auth(client.publicKey(), async challenge => {
    receivedChallenge = challenge;
    const tx = new Transaction(challenge, Networks.TESTNET);
    tx.sign(client);
    return tx.toXDR();
  });
  assert.equal(typeof token, 'string');
  assert.ok(token.length > 0);
  console.log('Live SEP-10 authentication: PASS (token received; not printed)');

  assert.throws(() => WebAuth.verifyChallengeTxSigners(
    receivedChallenge, ANCHOR_SIGNING_KEY, Networks.TESTNET, [ANCHOR_SIGNING_KEY], ANCHOR_DOMAIN, ANCHOR_DOMAIN,
  ), /No verifiable client signers/);
  console.log('Original pre-signing error reproduced: PASS');

  await assert.rejects(sep10Auth(client.publicKey(), async challenge => challenge), /None of the given signers/);
  console.log('Unsigned client challenge rejected: PASS');

  const wrongClient = Keypair.random();
  await assert.rejects(sep10Auth(client.publicKey(), async challenge => {
    const tx = new Transaction(challenge, Networks.TESTNET);
    tx.sign(wrongClient);
    return tx.toXDR();
  }), /None of the given signers|unrecognized signatures/);
  console.log('Wrong client signature rejected: PASS');
} finally {
  await server.close();
}
