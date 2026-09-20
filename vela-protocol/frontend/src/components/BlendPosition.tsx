import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { calculatePosition, calculateSubsidyTier } from '../services/blend';
import { submitOpenPosition } from '../services/gatekeeper';
import { getExplorerUrl } from '../services/stellar';
import { ExternalLink, Info, TrendingUp } from 'lucide-react';
import { MultiStepLoader } from './ui/MultiStepLoader';
import { sep10Auth, sep12KYC } from '../services/anchor';
import { hashIdentity } from '../services/proof';
import { Keypair, Networks, Transaction } from '@stellar/stellar-sdk';
import { signWithFreighter } from '../services/freighter';
import { StatefulAction } from './ui/StatefulAction';

const formatAmount = (value: number) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
}).format(value);
const PUBLIC_SUPPLY_FIXTURE = 'https://stellar.expert/explorer/testnet/tx/bcec10737c1f4f538c142eca78c7de9540f9746d7e21f0680ff808ad7e84ab39';

export const BlendPosition: React.FC = () => {
  const { classicAccount, score, guidedDemo, proofData, publicInputs, position, identityHash, setIdentity, setPosition } = useStore();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const collateral = Number(amount);
  const validAmount = amount.trim() !== '' && Number.isFinite(collateral) && collateral > 0;
  const estimate = calculatePosition(validAmount ? collateral : 0, score ?? 0);
  const tier = calculateSubsidyTier(score ?? 0);

  const handleOpenPosition = async () => {
    if (!classicAccount || !proofData || !publicInputs || score === null || !validAmount) return;
    setLoading(true);
    setError(null);
    try {
      let verifiedIdentityHash = identityHash;
      if (!verifiedIdentityHash) {
        const keypair = classicAccount.secret ? Keypair.fromSecret(classicAccount.secret) : null;
        const jwt = await sep10Auth(classicAccount.publicKey, async (challengeXdr) => {
          if (!keypair) return signWithFreighter(challengeXdr, classicAccount.publicKey);
          const tx = new Transaction(challengeXdr, Networks.TESTNET);
          tx.sign(keypair);
          return tx.toEnvelope().toXDR('base64');
        });
        const kyc = await sep12KYC(jwt, classicAccount.publicKey);
        if (kyc.status !== 'ACCEPTED') throw new Error(`Anchor KYC status: ${kyc.status}`);
        verifiedIdentityHash = await hashIdentity(kyc.customer_id);
        setIdentity(verifiedIdentityHash);
      }
      const hash = await submitOpenPosition(classicAccount, proofData, publicInputs, collateral, verifiedIdentityHash);
      const calc = calculatePosition(collateral, score);
      setPosition({ id: 0, user: classicAccount.publicKey, collateral, subsidy: calc.subsidyAmount,
        totalPosition: calc.totalPosition, subsidyPercentage: calc.subsidyPercentage,
        tier: tier.tier as 'high' | 'medium' | 'low', status: 'active', txHash: hash, timestamp: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Contract submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div className="glass-panel task-panel p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <TrendingUp className="text-accent" /> Blend Collateral Preview
        </h2>
        <p className="mb-6 text-sm text-gray-500">See how a qualifying signal could increase supplied collateral. Vela never borrows automatically.</p>
        {guidedDemo && <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-800"><Info size={18} className="mt-0.5 shrink-0" /><span><strong>Preview only.</strong> The amount below is an adjustable example—not your wallet balance. No transaction will be sent from this sample.</span></div>}

        {!position || guidedDemo ? (
          <div className="space-y-6">
            <label htmlFor="collateral" className="block text-gray-300 text-sm">{guidedDemo ? 'Example collateral amount (XLM)' : 'Amount to supply (XLM, testnet)'}</label>
            <input id="collateral" type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg p-3 outline-none focus:border-accent" />

            <div className="position-equation" aria-label="Collateral composition">
              <div><span>{guidedDemo ? 'Example user amount' : 'You supply'}</span><strong>{formatAmount(estimate.userCollateral)} XLM</strong></div>
              <b>+</b>
              <div><span>Vela adds · {tier.percentage}%</span><strong className="text-accent">{formatAmount(estimate.subsidyAmount)} XLM</strong></div>
              <b>=</b>
              <div className="is-total"><span>Total supplied to Blend</span><strong>{formatAmount(estimate.totalPosition)} XLM</strong></div>
            </div>
            {guidedDemo ? (
              <div className="space-y-3">
                <a href={PUBLIC_SUPPLY_FIXTURE} target="_blank" rel="noreferrer" className="w-full border border-accent/25 bg-accent/10 p-4 rounded-xl font-semibold inline-flex items-center justify-center gap-2 text-accent">View a completed Blend testnet transaction <ExternalLink size={16} /></a>
                <div className="blend-proof-note"><strong>What this link proves</strong><p>A previously completed Vela test sent 1.0 XLM from a user and added 0.4 XLM before supplying 1.4 XLM to Blend. It is public evidence of the integration, not a transaction from this sample.</p><details><summary>Technical test limitation</summary><p>The published test used a placeholder proof and empty identity hash. It proves the collateral-supply path, not the full private-credit claim.</p></details></div>
                <button type="button" onClick={() => navigate('/anchor')} className="w-full bg-surface hover:bg-surface/80 border border-white/10 py-4 rounded-lg font-semibold">Continue to TRY ↔ USDC sandbox</button>
              </div>
            ) : (
              <>
                <StatefulAction onClick={handleOpenPosition}
                  disabled={loading || !classicAccount || !publicInputs || score === null || score < 60 || !validAmount}
                  state={loading ? 'working' : 'idle'}
                  workingLabel="Submitting to Stellar testnet…"
                  className="w-full bg-accent text-white py-4 rounded-xl font-semibold">
                  Supply Collateral on Testnet
                </StatefulAction>
                <MultiStepLoader active={loading} steps={['Preparing Soroban transaction', 'Signing with classic G-address', 'Waiting for testnet confirmation']} />
                {!classicAccount && <p className="text-sm text-yellow-400">A classic G-address is required for this position.</p>}
                {classicAccount && !publicInputs && <button onClick={() => navigate('/proof')} className="text-accent underline">Prepare commitment</button>}
                {score !== null && score < 60 && <p className="text-sm text-yellow-400">A score of at least 60 is required for this threshold claim.</p>}
                {error && <p role="alert" className="text-red-400">{error}</p>}
              </>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-success/10 border border-success/30 p-6 rounded-lg text-center">
              <h3 className="text-success font-bold text-xl mb-2">Contract Transaction Succeeded</h3>
              {position.txHash && <a className="text-accent underline break-all" href={getExplorerUrl(position.txHash)} target="_blank" rel="noreferrer">View transaction: {position.txHash}</a>}
              <p className="text-gray-400 text-sm">The contract accepted the 36-byte client claim and executed a collateral supply to Blend on testnet. It did not borrow funds. The raw score stayed off-chain, while cryptographic claim verification remains roadmap work.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface p-4 rounded-lg border border-white/5">
                <div className="text-gray-400 text-sm mb-1">Total collateral</div>
                <div className="text-xl font-bold">{formatAmount(position.totalPosition)} XLM</div>
              </div>
              <div className="bg-surface p-4 rounded-lg border border-white/5">
                <div className="text-gray-400 text-sm mb-1">Vela subsidy supplied</div>
                <div className="text-xl font-bold">{formatAmount(position.subsidy)} XLM</div>
              </div>
            </div>
            <button onClick={() => navigate('/anchor')}
              className="w-full bg-surface hover:bg-surface/80 border border-white/10 py-4 rounded-lg font-semibold">
              Explore separate Anchor rail
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
