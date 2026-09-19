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
        totalPosition: calc.totalPosition, borrowAmount: calc.borrowAmount, subsidyPercentage: calc.subsidyPercentage,
        tier: tier.tier as 'high' | 'medium' | 'low', status: 'active', txHash: hash, timestamp: Date.now() });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Contract submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-6">
      <div className="glass-panel p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <TrendingUp className="text-accent" /> Supply Subsidized Collateral
        </h2>
        {guidedDemo && <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-800"><Info size={18} className="mt-0.5 shrink-0" /><span>Guided sample mode. The calculator is illustrative and no transaction will be submitted from this fictional score. The public fixture below remains independently verifiable.</span></div>}

        {!position || guidedDemo ? (
          <div className="space-y-6">
            <label htmlFor="collateral" className="block text-gray-300 text-sm">Collateral (XLM, testnet)</label>
            <input id="collateral" type="number" min="0.01" step="0.01" value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-surface border border-white/10 rounded-lg p-3 outline-none focus:border-accent" />

            <div className="bg-surface p-6 rounded-lg border border-white/5 space-y-4">
              <p className="text-sm text-gray-500">You supply {formatAmount(estimate.userCollateral)} XLM; Vela adds {formatAmount(estimate.subsidyAmount)} XLM; {formatAmount(estimate.totalPosition)} XLM would reach Blend.</p>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Scenario collateral</span>
                <span className="font-bold">{formatAmount(estimate.userCollateral)} XLM</span>
              </div>
              <div className="flex justify-between gap-4 text-accent">
                <span>Vela subsidy ({tier.percentage}%)</span>
                <span className="font-bold">+{formatAmount(estimate.subsidyAmount)} XLM</span>
              </div>
              <div className="h-px bg-white/10" />
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Total collateral</span>
                <span className="font-bold">{formatAmount(estimate.totalPosition)} XLM</span>
              </div>
              <div className="flex justify-between gap-4 text-success">
                <span>Illustrative borrow capacity</span>
                <span className="font-bold">{formatAmount(estimate.borrowAmount)} XLM</span>
              </div>
            </div>

            {guidedDemo ? (
              <div className="space-y-3">
                <a href={PUBLIC_SUPPLY_FIXTURE} target="_blank" rel="noreferrer" className="w-full border border-accent/25 bg-accent/10 p-4 rounded-xl font-semibold inline-flex items-center justify-center gap-2 text-accent">Inspect real Blend supply fixture <ExternalLink size={16} /></a>
                <p className="text-xs text-gray-500 text-center">Existing testnet fixture: 1.0 XLM user input + 0.4 XLM subsidy supplied to Blend. It uses an empty proof and zero identity hash, so it demonstrates only integration.</p>
                <button type="button" onClick={() => navigate('/anchor')} className="w-full bg-surface hover:bg-surface/80 border border-white/10 py-4 rounded-lg font-semibold">Explore separate Anchor rail</button>
              </div>
            ) : (
              <>
                <button onClick={handleOpenPosition}
                  disabled={loading || !classicAccount || !publicInputs || score === null || score < 60 || !validAmount}
                  className="w-full bg-accent hover:bg-accent/80 py-4 rounded-lg font-semibold disabled:opacity-50">
                  {loading ? 'Submitting to testnet...' : 'Supply Collateral on Testnet'}
                </button>
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
                <div className="text-gray-400 text-sm mb-1">Illustrative capacity (no borrow)</div>
                <div className="text-xl font-bold">{formatAmount(position.borrowAmount)} XLM</div>
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
