import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { generateCommitment, generateRangeProof } from '../services/proof';
import { Lock, Cpu } from 'lucide-react';
import { MultiStepLoader } from './ui/MultiStepLoader';

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
      <div className="glass-panel p-8 text-center space-y-6">
        {guidedDemo && <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-800">Guided sample: this local claim uses a fictional profile and will not be submitted as your position.</div>}
        <div className="w-20 h-20 bg-accent/20 rounded-full mx-auto flex items-center justify-center">
          <Lock className="text-accent" size={40} />
        </div>
        
        <h2 className="text-2xl font-bold">Private Threshold Claim</h2>
        <p className="text-gray-400">
          A 32-byte SHA-256 commitment and a 4-byte threshold result are prepared locally. The contract checks the payload format; this MVP does not yet cryptographically prove that the committed score meets the threshold.
        </p>

        {status === 'idle' && (
          <button 
            onClick={handleGenerate}
            className="w-full bg-accent hover:bg-accent/80 py-4 rounded-xl font-semibold transition-colors mt-4"
          >
            Prepare Commitment
          </button>
        )}

        {status === 'generating' && (
          <div className="py-8 space-y-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
              <Cpu size={48} className="mx-auto text-accent" />
            </motion.div>
            <MultiStepLoader active steps={['Hashing score + salt', 'Building 36-byte claim', 'Ready for Soroban']} />
            <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-accent"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.5 }}
              />
            </div>
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

            <button 
              onClick={() => navigate('/position')}
              className="w-full bg-success hover:bg-success/80 py-4 rounded-xl font-semibold transition-colors text-white"
            >
              Continue to Position
            </button>
          </motion.div>
        )}
        {error && <p role="alert" className="text-red-400">{error}</p>}
      </div>
    </motion.div>
  );
};
