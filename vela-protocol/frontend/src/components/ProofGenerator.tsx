import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { generateCommitment, generateRangeProof } from '../services/proof';
import { Lock } from 'lucide-react';
import { MultiStepLoader } from './ui/MultiStepLoader';
import { StatefulAction } from './ui/StatefulAction';

export const ProofGenerator: React.FC = () => {
  const { score, guidedDemo, setProof } = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState<string>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setStatus('generating');
    setError(null);
    try {
      if (score === null) throw new Error('Calculate a score first');
      const roundedScore = Math.round(score);
      const commitment = await generateCommitment(roundedScore, crypto.getRandomValues(new Uint8Array(32)));
      const proof = generateRangeProof(roundedScore, 60, commitment);
      setProof(proof.proof, commitment, proof.publicInputsBytes);
      setStatus('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Commitment failed');
      setStatus('idle');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">
      <div className="glass-panel task-panel p-6 md:p-8 text-center space-y-6">
        {guidedDemo && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800">Guided sample: this local claim uses a fictional profile and will not be submitted as your position.</div>}
        <div className="commitment-mark mx-auto">
          <Lock className="text-accent" size={40} />
        </div>
        
        <h2 className="display-serif text-3xl font-semibold">Private Threshold Claim</h2>
        <p className="text-gray-400">
          A 32-byte SHA-256 commitment and a 4-byte threshold result are prepared locally. The contract checks the payload format; this MVP does not yet cryptographically prove that the committed score meets the threshold.
        </p>

        {status === 'idle' && (
          <StatefulAction
            onClick={handleGenerate}
            icon={<Lock size={18} />}
            className="w-full bg-accent text-white py-4 rounded-xl font-semibold mt-4"
          >
            Prepare Commitment
          </StatefulAction>
        )}

        {status === 'generating' && (
          <div className="commitment-stage py-8 space-y-5">
            <div className="commitment-mark is-working mx-auto"><Lock className="text-accent" size={38} /></div>
            <MultiStepLoader active steps={['Hashing score + salt', 'Building 36-byte claim', 'Ready for Soroban']} />
          </div>
        )}

        {status === 'done' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-6 py-4">
            <div className="flex items-center justify-center gap-3 text-success">
              <svg className="verified-check" viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="23" /><path d="m16 27 7 7 15-16" /></svg>
              <span className="text-xl font-semibold">Local Claim Prepared</span>
            </div>
            
            <div className="bg-surface p-4 rounded-lg text-left space-y-2 border border-success/30 font-mono text-sm">
              <p><span className="text-gray-500">Target Protocol:</span> Blend v2 Gatekeeper</p>
              <p><span className="text-gray-500">Client claim:</span> Score {'>='} 60</p>
              <p><span className="text-gray-500">Public inputs:</span> 36 bytes</p>
            </div>

            <StatefulAction
              onClick={() => navigate('/position')}
              state="success"
              successLabel="Continue to Position"
              className="w-full py-4 rounded-xl font-semibold text-white"
            >
              Continue to Position
            </StatefulAction>
          </motion.div>
        )}
        {error && <p role="alert" className="text-red-400">{error}</p>}
      </div>
    </motion.div>
  );
};
