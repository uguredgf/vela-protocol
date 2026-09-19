import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { getScore } from '../services/scoring';
import { ArrowDownRight, ArrowUpRight, Info, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Card3D } from './ui/Card3D';

const FEATURE_LABELS: Record<string, string> = {
  tx_count: 'Activity history', tx_frequency: 'Payment frequency', tx_regularity: 'Transaction regularity',
  avg_amount: 'Typical transaction size', amount_variance: 'Amount stability', unique_counterparties: 'Network diversity',
  counterparty_concentration: 'Counterparty mix', income_regularity: 'Incoming payment regularity',
  history_length_days: 'Account history', max_gap_days: 'Activity gaps', net_flow: 'Net account flow',
  consistency_score: 'Cash-flow consistency',
};

function impactLabel(value: number) {
  const strength = Math.abs(value) >= 5 ? 'Strong ' : '';
  if (Math.abs(value) < 0.15) return 'Neutral';
  return `${strength}${value > 0 ? 'positive' : 'negative'}`;
}

export const ScoreDisplay: React.FC = () => {
  const { classicAccount, score, scoreExplanation, setScore } = useStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (classicAccount && score === null) {
      setIsLoading(true);
      getScore(classicAccount.publicKey).then(res => setScore(res.score, res.explanation, res.features))
        .catch(e => setError(e instanceof Error ? e.message : 'Scoring failed'))
        .finally(() => setIsLoading(false));
    }
  }, [classicAccount, score, setScore, retryCount]);

  const rankedFactors = useMemo(() => Object.entries(scoreExplanation?.feature_contributions || {})
    .map(([key, value]) => ({ key, value: Number(value) }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value)), [scoreExplanation]);

  if (error || !classicAccount) return <div className="flex items-center gap-4">
    <p role="alert" className="text-red-400">{error || 'Connect a wallet first.'}</p>
    {classicAccount && <button type="button" title="Retry scoring" aria-label="Retry scoring" onClick={() => { setError(null); setRetryCount(count => count + 1); }} className="p-2 rounded border border-white/10 hover:bg-surface"><RefreshCcw size={18} /></button>}
  </div>;

  const getColor = (value: number) => value >= 80 ? 'text-green-400' : value >= 60 ? 'text-success' : value >= 40 ? 'text-yellow-400' : 'text-red-500';
  const getTier = (value: number) => value >= 80 ? 'Strong signal' : value >= 60 ? 'Developing signal' : value >= 40 ? 'Limited signal' : 'Not enough signal';

  if (isLoading || score === null) return <div className="score-loader" role="status" aria-live="polite">
    <div className="score-loader__stage"><span className="score-loader__ring score-loader__ring--one" /><span className="score-loader__ring score-loader__ring--two" /><motion.img src="/vela-mascot.png" alt="Vela is analysing your account" animate={{ y: [0, -7, 0], rotate: [-1, 1, -1] }} transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }} /></div>
    <h2 className="text-xl font-semibold">Reading your Stellar activity…</h2>
    <p className="text-gray-400 mt-2">Vela is turning on-chain patterns into a private credit signal.</p>
  </div>;

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="score-page max-w-4xl mx-auto space-y-6 pb-12">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 px-1">
      <div><div className="text-[11px] uppercase tracking-[0.25em] text-accent mb-2">On-chain signal</div><h1 className="text-3xl md:text-4xl font-bold tracking-tight">Your credit signal</h1><p className="text-gray-400 mt-2 max-w-xl">A live behavioural read of the Stellar account powering this session.</p></div>
      <div className="inline-flex items-center gap-2 text-xs text-emerald-300 bg-emerald-400/10 border border-emerald-400/20 px-3 py-2 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Horizon data</div>
    </div>
    <Card3D className="glass-panel p-6 md:p-8 grid md:grid-cols-[230px_1fr] items-center gap-8">
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48 flex items-center justify-center"><svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#CBD3E0" strokeWidth="8" /><motion.circle initial={{ strokeDasharray: '0 300' }} animate={{ strokeDasharray: `${score * 2.83} 300` }} transition={{ duration: 1.5, ease: 'easeOut' }} cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className={getColor(score)} strokeLinecap="round" /></svg><div className="absolute text-center"><strong className="block text-5xl">{score}</strong><span className="text-xs text-gray-500">out of 100</span></div></div>
        <h2 className={`text-xl font-bold mt-4 ${getColor(score)}`}>{getTier(score)}</h2><p className="text-center text-xs text-gray-500 mt-2">Signal strength, not an accuracy or approval percentage.</p>
      </div>
      <div className="min-w-0"><h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="text-accent" /> What shaped your signal</h3><p className="text-sm text-gray-400 mb-4">The most influential account patterns, translated into plain language.</p>
        <div className="space-y-3">{rankedFactors.slice(0, 4).map(({ key, value }) => <div key={key} className="signal-factor"><span className={`signal-factor__icon ${value >= 0 ? 'is-positive' : 'is-negative'}`}>{value >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span><span className="flex-1 text-sm font-medium">{FEATURE_LABELS[key] || 'Account behaviour'}</span><span className={`text-xs font-semibold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>{impactLabel(value)}</span></div>)}</div>
      </div>
    </Card3D>
    <div className="model-note glass-panel p-4 flex items-start gap-3"><Info className="text-accent flex-shrink-0 mt-0.5" size={19} /><div><strong className="text-sm">MVP model disclosure</strong><p className="text-xs text-gray-500 mt-1">Your account metrics are live and come from Stellar Horizon. The scoring model was trained on synthetic behaviour profiles for this hackathon MVP, so this signal is demonstrative—not a lending decision or measured prediction accuracy.</p></div></div>
    <div className="flex justify-end pt-2"><button onClick={() => navigate('/proof')} className="bg-accent hover:bg-accent/80 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-accent/20">Prepare private commitment</button></div>
  </motion.div>;
};
