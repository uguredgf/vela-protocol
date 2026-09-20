import assert from 'node:assert/strict';
import { rpc, xdr } from '@stellar/stellar-sdk';

const FRONTEND = 'https://vela-protocol-n9kf.vercel.app';
const SCORING = 'https://vela-ai-scoring.vercel.app';
const ANCHOR = 'https://tr-mock-anchor.fly.dev';
const TEST_ACCOUNT = 'GCG3ED3ZCAYQAF76DEB2LLXOQ75KF3PE4ZADO4JLCCWAM5YHRDALCJ6Y';
const GATEKEEPER = 'CCSDVXSUOS2P7PJZASQ7XZ27BYOMRWUNJPBMBK3AMF6PFWXT5VPU7ZMB';
const GATEKEEPER_TX = 'f924cb43d67a19aeec69a8d76e35c366bea5c71416cac0b11dbf51a25544b0c5';
const BLEND_TX = 'bcec10737c1f4f538c142eca78c7de9540f9746d7e21f0680ff808ad7e84ab39';
const EXPECTED_SIGNING_KEY = 'GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M';

const results = [];

async function check(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail: detail || 'ok' });
  } catch (error) {
    results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
  }
}

await check('Frontend shell', async () => {
  const response = await fetch(`${FRONTEND}/?verify=${Date.now()}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/);
  return 'HTTP 200';
});

await check('Scoring health', async () => {
  const response = await fetch(`${SCORING}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  return 'model online';
});

await check('Minimum-history gate', async () => {
  const response = await fetch(`${SCORING}/score/${TEST_ACCOUNT}`);
  const body = await response.json();
  if (response.ok) {
    assert.equal(typeof body.score, 'number');
    return `score ${body.score}`;
  }
  const detail = String(body.detail?.message || body.detail || '');
  assert.match(detail, /insufficient/i);
  return 'sparse account rejected correctly';
});

await check('Gatekeeper contract instance', async () => {
  const server = new rpc.Server('https://soroban-testnet.stellar.org');
  const entry = await server.getContractData(GATEKEEPER, xdr.ScVal.scvLedgerKeyContractInstance());
  assert.ok(entry.lastModifiedLedgerSeq > 0);
  return `live through ledger ${entry.liveUntilLedgerSeq}`;
});

for (const [name, hash] of [['Gatekeeper evidence transaction', GATEKEEPER_TX], ['Blend evidence transaction', BLEND_TX]]) {
  await check(name, async () => {
    const response = await fetch(`https://horizon-testnet.stellar.org/transactions/${hash}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.successful, true);
    return body.ledger_attr ? `ledger ${body.ledger_attr}` : 'successful';
  });
}

await check('Anchor discovery and trust pins', async () => {
  const response = await fetch(`${ANCHOR}/.well-known/stellar.toml`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(body.includes('NETWORK_PASSPHRASE="Test SDF Network ; September 2015"'));
  assert.ok(body.includes(`SIGNING_KEY="${EXPECTED_SIGNING_KEY}"`));
  return 'testnet TOML trusted';
});

await check('Anchor gateway health', async () => {
  const response = await fetch(`${ANCHOR}/health`);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.sep?.signing_key, EXPECTED_SIGNING_KEY);
  return `gateway ${body.stellar_mode}; treasury ${body.treasury?.usdc_balance ?? 'unknown'} USDC`;
});

await check('Passkey recovery indexer', async () => {
  const response = await fetch('https://testnet.mercurydata.app/rest/passkey-indexer/');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  return 'online';
});

for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}: ${item.detail}`);
}

const failed = results.filter(item => !item.ok);
if (failed.length) {
  console.error(`\n${failed.length} live-stack check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${results.length} live-stack checks passed.`);
