import axios from 'axios';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';

const base = 'https://tr-mock-anchor.fly.dev';
const pair = Keypair.random();

await axios.get('https://friendbot.stellar.org', { params: { addr: pair.publicKey() }, timeout: 30000 });
const toml = await axios.get(`${base}/.well-known/stellar.toml`);
const value = (key) => toml.data.match(new RegExp(`${key}\\s*=\\s*"([^"]+)"`))?.[1];
const authEndpoint = value('WEB_AUTH_ENDPOINT');
const kycEndpoint = value('KYC_SERVER');
const challenge = await axios.get(authEndpoint, { params: { account: pair.publicKey() } });
const tx = new Transaction(challenge.data.transaction, Networks.TESTNET);
tx.sign(pair);
const token = await axios.post(authEndpoint, { transaction: tx.toEnvelope().toXDR('base64') });
const initial = await axios.get(`${kycEndpoint}/customer`, {
  params: { account: pair.publicKey() },
  headers: { Authorization: `Bearer ${token.data.token}` },
});
const registration = await axios.put(`${kycEndpoint}/customer`, { account: pair.publicKey() }, {
  headers: { Authorization: `Bearer ${token.data.token}` },
});
const customer = await axios.get(`${kycEndpoint}/customer`, {
  params: { id: registration.data.id },
  headers: { Authorization: `Bearer ${token.data.token}` },
});

console.log(JSON.stringify({
  account: pair.publicKey(),
  initial: initial.data,
  registration: registration.data,
  response: customer.data,
  fields: Object.keys(customer.data),
}, null, 2));
