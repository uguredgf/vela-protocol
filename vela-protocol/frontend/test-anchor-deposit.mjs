/**
 * Vela Protocol — End-to-End Anchor Transfer Test Script
 * 
 * Tests the full TRY→USDC deposit flow:
 * 1. Create keypair + fund via Friendbot
 * 2. Establish USDC trustline (ChangeTrust)
 * 3. SEP-10 authentication (challenge → sign → JWT)
 * 4. SEP-6 deposit request
 * 5. Simulate bank transfer (sandbox)
 * 6. Poll until completed
 * 7. Check final USDC balance
 */

import {
  Keypair, Networks, Transaction, TransactionBuilder,
  Operation, Asset, Horizon, StrKey, Memo
} from '@stellar/stellar-sdk';
import axios from 'axios';

const ANCHOR_BASE = 'https://tr-mock-anchor.fly.dev';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const HORIZON = 'https://horizon-testnet.stellar.org';

async function main() {
  console.log('=== Vela Protocol — Anchor Transfer E2E Test ===\n');

  // ── Step 1: Create keypair ──
  const pair = Keypair.random();
  console.log('1. Keypair created');
  console.log('   Public:  ', pair.publicKey());
  console.log('   Secret:  ', pair.secret().substring(0, 8) + '...');

  // ── Step 2: Fund via Friendbot ──
  console.log('\n2. Funding via Friendbot...');
  const fbRes = await axios.get('https://friendbot.stellar.org', {
    params: { addr: pair.publicKey() },
    timeout: 30000,
  });
  console.log('   Funded! TX:', fbRes.data.hash?.substring(0, 16) + '...');

  // ── Step 3: Establish USDC trustline ──
  console.log('\n3. Establishing USDC trustline...');
  const server = new Horizon.Server(HORIZON);
  const account = await server.loadAccount(pair.publicKey());
  const usdcAsset = new Asset('USDC', USDC_ISSUER);

  const trustTx = new TransactionBuilder(account, {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(180)
    .build();

  trustTx.sign(pair);
  const trustResult = await server.submitTransaction(trustTx);
  console.log('   Trustline set! TX:', trustResult.hash.substring(0, 16) + '...');

  // ── Step 4: Fetch stellar.toml ──
  console.log('\n4. Fetching stellar.toml...');
  const tomlRes = await axios.get(`${ANCHOR_BASE}/.well-known/stellar.toml`);
  const tomlText = tomlRes.data;
  
  const extractVal = (text, key) => {
    const match = text.match(new RegExp(`${key}\\s*=\\s*"([^"]*)"`));
    return match ? match[1] : '';
  };

  const WEB_AUTH = extractVal(tomlText, 'WEB_AUTH_ENDPOINT');
  const TRANSFER = extractVal(tomlText, 'TRANSFER_SERVER');
  const SIGNING_KEY = extractVal(tomlText, 'SIGNING_KEY');
  
  console.log('   WEB_AUTH_ENDPOINT:', WEB_AUTH);
  console.log('   TRANSFER_SERVER:  ', TRANSFER);
  console.log('   SIGNING_KEY:      ', SIGNING_KEY.substring(0, 12) + '...');

  // ── Step 5: SEP-10 Authentication ──
  console.log('\n5. SEP-10 Authentication...');
  
  // 5a: Get challenge
  const challengeRes = await axios.get(WEB_AUTH, {
    params: { account: pair.publicKey() },
  });
  const challengeXdr = challengeRes.data.transaction;
  console.log('   Challenge received (XDR length:', challengeXdr.length, ')');

  // 5b: Sign challenge
  const challengeTx = new Transaction(challengeXdr, Networks.TESTNET);
  challengeTx.sign(pair);
  const signedXdr = challengeTx.toEnvelope().toXDR('base64');
  console.log('   Challenge signed');

  // 5c: Submit for JWT
  const tokenRes = await axios.post(WEB_AUTH, {
    transaction: signedXdr,
  });
  const jwt = tokenRes.data.token;
  console.log('   JWT received:', jwt.substring(0, 30) + '...');

  // ── Step 6: SEP-6 Deposit ──
  console.log('\n6. SEP-6 Deposit (TRY → USDC)...');
  const depositRes = await axios.get(`${TRANSFER}/deposit`, {
    params: {
      asset_code: 'USDC',
      account: pair.publicKey(),
      amount: '50',
      type: 'bank_account',
    },
    headers: { Authorization: `Bearer ${jwt}` },
  });
  
  const depositId = depositRes.data.id;
  const howTo = depositRes.data.how;
  console.log('   Deposit ID:', depositId);
  console.log('   Instructions:', howTo);

  // ── Step 7: Simulate Bank Transfer ──
  console.log('\n7. Simulating bank transfer...');
  try {
    await axios.post(
      `${TRANSFER}/tx/${depositId}/simulate-bank-transfer`,
      {},
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
    console.log('   Bank transfer simulated!');
  } catch (e) {
    console.log('   Simulate endpoint response:', e.response?.status, e.response?.data || e.message);
    // Some anchors don't have this exact endpoint — try alternative
    try {
      await axios.patch(
        `${TRANSFER}/transaction/${depositId}`,
        { status: 'pending_anchor' },
        { headers: { Authorization: `Bearer ${jwt}` } }
      );
      console.log('   Used PATCH fallback');
    } catch (e2) {
      console.log('   Fallback also failed:', e2.response?.status, e2.response?.data || e2.message);
    }
  }

  // ── Step 8: Poll for completion ──
  console.log('\n8. Polling transaction status...');
  let finalStatus = 'unknown';
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const statusRes = await axios.get(`${TRANSFER}/transaction`, {
        params: { id: depositId },
        headers: { Authorization: `Bearer ${jwt}` },
      });
      const status = statusRes.data.transaction?.status || statusRes.data.status;
      console.log(`   Poll ${i + 1}: status = ${status}`);
      finalStatus = status;
      
      if (status === 'completed') {
        console.log('   ✅ DEPOSIT COMPLETED!');
        break;
      }
      if (status === 'error') {
        console.log('   ❌ Anchor reported error');
        break;
      }
    } catch (e) {
      console.log(`   Poll ${i + 1}: error -`, e.response?.status, e.message);
    }
  }

  // ── Step 9: Check USDC balance ──
  console.log('\n9. Checking account balance...');
  const finalAccount = await server.loadAccount(pair.publicKey());
  for (const bal of finalAccount.balances) {
    if (bal.asset_type === 'native') {
      console.log(`   XLM: ${bal.balance}`);
    } else if (bal.asset_code === 'USDC') {
      console.log(`   USDC: ${bal.balance} (issuer: ${bal.asset_issuer?.substring(0, 12)}...)`);
    }
  }

  // ── Step 10: Real SEP-6 withdrawal payment ──
  console.log('\n10. SEP-6 Withdrawal (USDC → TRY)...');
  const withdrawRes = await axios.get(`${TRANSFER}/withdraw`, {
    params: { asset_code: 'USDC', account: pair.publicKey(), type: 'bank_account', amount: '1.0' },
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const withdrawal = withdrawRes.data;
  console.log('   Withdrawal ID:', withdrawal.id);
  console.log('   Anchor destination:', withdrawal.account_id);
  console.log('   Memo:', withdrawal.memo);
  const withdrawSource = await server.loadAccount(pair.publicKey());
  const withdrawTx = new TransactionBuilder(withdrawSource, {
    fee: '100', networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: withdrawal.account_id,
      asset: usdcAsset,
      amount: '1.0',
    }))
    .addMemo(withdrawal.memo_type === 'id' ? Memo.id(withdrawal.memo) : Memo.text(withdrawal.memo))
    .setTimeout(180).build();
  withdrawTx.sign(pair);
  const withdrawResult = await server.submitTransaction(withdrawTx);
  console.log('   Payment TX:', withdrawResult.hash);
  let withdrawStatus = 'unknown';
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await axios.get(`${TRANSFER}/transaction`, {
      params: { id: withdrawal.id }, headers: { Authorization: `Bearer ${jwt}` },
    });
    withdrawStatus = statusRes.data.transaction?.status || statusRes.data.status;
    console.log(`   Withdrawal poll ${i + 1}: status = ${withdrawStatus}`);
    if (withdrawStatus === 'completed' || withdrawStatus === 'error') break;
  }
  console.log('   Final withdrawal status:', withdrawStatus);

  console.log('\n=== Test Complete ===');
  console.log('Final deposit status:', finalStatus);
  console.log('Account:', `https://stellar.expert/explorer/testnet/account/${pair.publicKey()}`);
}

main().catch(err => {
  console.error('FATAL:', err.response?.data || err.message);
  process.exit(1);
});
