import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CheckCircle2, ExternalLink, Github, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { checkHealth, getScoreByAccountId, SCORING_API_URL } from '../services/scoring';

const TEST_ACCOUNT = 'GCG3ED3ZCAYQAF76DEB2LLXOQ75KF3PE4ZADO4JLCCWAM5YHRDALCJ6Y';
const GATEKEEPER_TX = 'https://stellar.expert/explorer/testnet/tx/f924cb43d67a19aeec69a8d76e35c366bea5c71416cac0b11dbf51a25544b0c5';
const POSITION_TX = 'https://stellar.expert/explorer/testnet/tx/bcec10737c1f4f538c142eca78c7de9540f9746d7e21f0680ff808ad7e84ab39';

type VerificationState = {
  service: 'checking' | 'online' | 'offline';
  score?: number;
  tier?: string;
  txCount?: number;
  scoreError?: string;
};

export const EvidencePanel: React.FC = () => {
  const navigate = useNavigate();
  const [verification, setVerification] = useState<VerificationState>({ service: 'checking' });

  useEffect(() => {
    let active = true;
    const verify = async () => {
      const healthy = await checkHealth();
      if (!active) return;
      if (!healthy) {
        setVerification({ service: 'offline' });
        return;
      }

      setVerification({ service: 'online' });
      try {
        const result = await getScoreByAccountId(TEST_ACCOUNT);
        if (active) {
          setVerification({
            service: 'online',
            score: result.score,
            tier: result.tier,
            txCount: result.features?.tx_count,
          });
        }
      } catch (error) {
        if (active) {
          setVerification({
            service: 'online',
            scoreError: error instanceof Error ? error.message : 'Live score check failed',
          });
        }
      }
    };

    void verify();
    return () => { active = false; };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          <ShieldCheck size={18} /> Verifiable demo mode
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">Live Testnet Evidence</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          This page remains accessible without a wallet so judges can independently verify the deployed services and on-chain transactions. It does not simulate a completed user flow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-5">
          <div className="flex items-center gap-2 text-sm text-gray-400"><Activity size={18} /> AI service</div>
          <div className="mt-3 flex items-center gap-2 font-semibold">
            {verification.service === 'checking' && <><Loader2 className="animate-spin text-accent" size={18} /> Checking live endpoint</>}
            {verification.service === 'online' && <><CheckCircle2 className="text-success" size={18} /> Online · model loaded</>}
            {verification.service === 'offline' && <><AlertTriangle className="text-amber-400" size={18} /> Temporarily unavailable</>}
          </div>
          <a href={`${SCORING_API_URL}/health`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-accent underline break-all">
            Open health response <ExternalLink size={12} />
          </a>
        </div>

        <div className="glass-panel p-5">
          <div className="text-sm text-gray-400">Real Horizon score check</div>
          <div className="mt-3 text-2xl font-bold">
            {verification.score === undefined ? '—' : verification.score.toFixed(1)}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {verification.score !== undefined
              ? `${verification.tier} tier · ${verification.txCount ?? 'unknown'} observed transactions`
              : verification.scoreError || 'Waiting for the public testnet account result.'}
          </p>
          <p className="text-[11px] text-gray-600 mt-2">Public test account only; this is not the viewer's credit score.</p>
        </div>

        <div className="glass-panel p-5">
          <div className="text-sm text-gray-400">Identity-bound gatekeeper</div>
          <div className="mt-3 flex items-center gap-2 font-semibold"><CheckCircle2 className="text-success" size={18} /> Deployed on testnet</div>
          <p className="text-xs text-gray-500 mt-2">A repeated identity hash is rejected with contract error #12.</p>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-4">
        <h2 className="text-xl font-bold">Independent transaction proof</h2>
        <a href={GATEKEEPER_TX} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-lg bg-surface p-4 hover:bg-white/5">
          <span><strong>Gatekeeper deployment</strong><span className="block text-xs text-gray-500 mt-1">Identity-bound Soroban contract</span></span>
          <ExternalLink className="text-accent shrink-0" size={18} />
        </a>
        <a href={POSITION_TX} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 rounded-lg bg-surface p-4 hover:bg-white/5">
          <span><strong>Blend-backed position</strong><span className="block text-xs text-gray-500 mt-1">Successful gatekeeper call and collateral supply</span></span>
          <ExternalLink className="text-accent shrink-0" size={18} />
        </a>
      </div>

      <div className="glass-panel p-6 border border-amber-400/20">
        <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="text-amber-400" size={19} /> MVP boundaries</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-400 list-disc pl-5">
          <li>The commitment and threshold claim are not yet verified by a full Groth16/zkML verifier.</li>
          <li>The displayed borrow limit is an estimate; the verified on-chain path supplies collateral to Blend.</li>
          <li>The TRY bank rail is an Anchor sandbox; Stellar-side testnet settlement is independently verifiable.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button type="button" onClick={() => navigate('/')} className="bg-accent hover:bg-accent/80 px-6 py-3 rounded-xl font-semibold">Start Interactive Demo</button>
        <a href="https://github.com/uguredgf/vela-protocol" target="_blank" rel="noreferrer" className="bg-surface border border-white/10 hover:bg-white/5 px-6 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2">
          <Github size={18} /> View Source
        </a>
      </div>
    </motion.div>
  );
};
