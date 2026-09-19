import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { getScore } from '../services/scoring';
import { Activity, ShieldCheck, RefreshCcw } from 'lucide-react';
import { Card3D } from './ui/Card3D';

export const ScoreDisplay: React.FC = () => {
  const { classicAccount, score, scoreExplanation, features, setScore } = useStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (classicAccount && score === null) {
      setIsLoading(true);
      getScore(classicAccount.publicKey).then(res => {
        setScore(res.score, res.explanation, res.features);
      }).catch(e => setError(e instanceof Error ? e.message : 'Scoring failed'))
        .finally(() => setIsLoading(false));
    }
  }, [classicAccount, score, setScore, retryCount]);

  if (error || !classicAccount) return (
    <div className="flex items-center gap-4">
      <p role="alert" className="text-red-400">{error || 'Connect a wallet first.'}</p>
      {classicAccount && <button type="button" title="Retry scoring" aria-label="Retry scoring"
        onClick={() => { setError(null); setRetryCount(count => count + 1); }}
        className="p-2 rounded border border-white/10 hover:bg-surface"><RefreshCcw size={18} /></button>}
    </div>
  );

  const getColor = (val: number) => {
    if (val >= 80) return 'text-green-400';
    if (val >= 60) return 'text-success';
    if (val >= 40) return 'text-yellow-400';
    return 'text-red-500';
  };

  const getTier = (val: number) => {
    if (val >= 80) return 'High Trust';
    if (val >= 60) return 'Medium Trust';
    if (val >= 40) return 'Low Trust';
    return 'Insufficient';
  };

  if (isLoading || score === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Activity size={48} className="text-accent mb-4" />
        </motion.div>
        <h2 className="text-xl font-semibold">Analyzing On-Chain Data...</h2>
        <p className="text-gray-400 mt-2">Running AI models on your Stellar history</p>
      </div>
    );
  }

  const featureEntries = Object.entries(features || {}).slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 px-1">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-accent mb-2">On-chain intelligence</div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your credit signal</h1>
          <p className="text-gray-400 mt-2 max-w-xl">A live read of the classic Stellar account powering this session.</p>
        </div>
        <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-3 py-2 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Horizon data synced
        </div>
      </div>
      <Card3D className="glass-panel p-8 flex flex-col md:flex-row items-center gap-8 justify-between">
        <div className="flex flex-col items-center">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1A1A2E" strokeWidth="8" />
              <motion.circle 
                initial={{ strokeDasharray: '0 300' }}
                animate={{ strokeDasharray: `${score * 2.83} 300` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                className={getColor(score)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute text-5xl font-bold">{score}</div>
          </div>
          <h2 className={`text-xl font-bold mt-4 ${getColor(score)}`}>{getTier(score)}</h2>
        </div>
        
        <div className="flex-1 w-full">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShieldCheck className="text-accent" /> Score Breakdown
          </h3>
          <div className="space-y-4">
            {Object.entries(scoreExplanation?.feature_contributions || {}).map(([key, val]) => (
              <div key={key} className="flex justify-between items-center bg-surface p-3 rounded-lg border border-white/5">
                <span className="text-gray-300">{key}</span>
                <span className="font-mono text-success font-semibold">{Number(val).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </Card3D>

      {featureEntries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {featureEntries.map(([key, value], index) => (
            <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} className="signal-tile glass-panel px-4 py-3">
              <span className="block text-[10px] uppercase tracking-[0.16em] text-gray-500 truncate">{key.replace(/_/g, ' ')}</span>
              <span className="block text-xl font-semibold mt-1 text-white">{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(value)}</span>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button 
          onClick={() => navigate('/proof')}
          className="bg-accent hover:bg-accent/80 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-accent/20"
        >
          Prepare Score Commitment
        </button>
      </div>
    </motion.div>
  );
};
