import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { getScore } from '../services/scoring';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Info, RefreshCcw, ShieldCheck } from 'lucide-react';
import { Card3D } from './ui/Card3D';
import { VelaOracle } from './ui/VelaOracle';

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
  const { classicAccount, authMethod, walletAddress, score, guidedDemo, scoreExplanation, setScore, startGuidedDemo } = useStore();
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

  if (error || !classicAccount) {
    const insufficient = !!error?.toLowerCase().includes('insufficient');
    return <div className="max-w-2xl mx-auto glass-panel p-8 text-center space-y-4">
      <AlertTriangle className={insufficient ? 'text-amber-600 mx-auto' : 'text-red-500 mx-auto'} size={34} />
      <h2 className="text-2xl font-bold">{insufficient ? 'More payment history is needed' : 'Signal unavailable'}</h2>
      <p role="alert" className="text-sm text-gray-500">{error || 'Connect a wallet first.'}</p>
      {insufficient && <p className="text-xs text-gray-500">Vela no longer turns account creation or Friendbot funding into a high signal. This protects users from a precise-looking result based on too little evidence.</p>}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
        {classicAccount && <button type="button" onClick={() => { setError(null); setRetryCount(count => count + 1); }} className="bg-surface border border-white/10 px-5 py-3 rounded-xl font-semibold inline-flex items-center justify-center gap-2"><RefreshCcw size={16} /> Check again</button>}
        {insufficient && <button type="button" onClick={() => { setError(null); startGuidedDemo(); }} className="bg-accent text-white px-5 py-3 rounded-xl font-semibold">Preview Guided Sample</button>}
        <button type="button" onClick={() => navigate('/evidence')} className="bg-accent text-white px-5 py-3 rounded-xl font-semibold">Open Judge Evidence</button>
      </div>
    </div>;
  }

  const getColor = (value: number) => value >= 80 ? 'text-green-400' : value >= 60 ? 'text-success' : value >= 40 ? 'text-yellow-400' : 'text-red-500';
  const getTier = (value: number) => value >= 80 ? 'Strong signal' : value >= 60 ? 'Developing signal' : value >= 40 ? 'Limited signal' : 'Not enough signal';

  if (isLoading || score === null) return <div className="score-loader" role="status" aria-live="polite">
    <div className="score-loader__stage"><span className="score-loader__ring score-loader__ring--one" /><span className="score-loader__ring score-loader__ring--two" /><VelaOracle active /></div>
    <h2 className="text-xl font-semibold">Reading your Stellar activity…</h2>
    <p className="text-gray-400 mt-2">Vela is turning on-chain patterns into a private credit signal.</p>
  </div>;

  return <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="score-page max-w-4xl mx-auto space-y-6 pb-12">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 px-1">
      <div><div className="text-[11px] uppercase tracking-[0.25em] text-accent mb-2">{guidedDemo ? 'Guided sample' : 'On-chain signal'}</div><h1 className="display-serif text-3xl md:text-4xl font-semibold tracking-tight">{guidedDemo ? 'Sample risk signal' : 'Your credit signal'}</h1><p className="text-gray-400 mt-2 max-w-xl">{guidedDemo ? 'A clearly labeled fictional profile for exploring the interface. It is not this account’s history or a lending result.' : 'A live behavioural read of the Stellar account powering this session.'}</p></div>
      <div className={`inline-flex items-center gap-2 text-xs border px-3 py-2 rounded-full ${guidedDemo ? 'text-amber-700 bg-amber-500/10 border-amber-500/20' : 'text-emerald-700 bg-emerald-400/10 border-emerald-400/20'}`}><span className={`w-1.5 h-1.5 rounded-full ${guidedDemo ? 'bg-amber-500' : 'bg-emerald-400 animate-pulse'}`} /> {guidedDemo ? 'Fictional sample · no live claim' : 'Live Horizon data'}</div>
    </div>
    <div className="score-source-card" aria-label="Signal data source">
      <div><span>{guidedDemo ? 'Walkthrough source' : 'History being scored'}</span><strong>{guidedDemo ? 'Fictional sample profile' : `${classicAccount.publicKey.slice(0, 8)}…${classicAccount.publicKey.slice(-6)}`}</strong></div>
      <p>{guidedDemo
        ? 'No connected wallet history is used in this walkthrough.'
        : authMethod === 'freighter'
          ? 'This is the G-address selected in Freighter. Vela reads its public Horizon activity.'
          : `Passkey protects the C-wallet ${walletAddress ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}` : ''}; the signal comes from its separate session-linked G-account shown here.`}</p>
    </div>
    <Card3D className="glass-panel task-panel p-6 md:p-8 grid md:grid-cols-[230px_1fr] items-center gap-8">
      <div className="flex flex-col items-center">
        <div className="relative w-48 h-48 flex items-center justify-center"><svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#CBD3E0" strokeWidth="8" /><motion.circle initial={{ strokeDasharray: '0 300' }} animate={{ strokeDasharray: `${score * 2.83} 300` }} transition={{ duration: 1.5, ease: 'easeOut' }} cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className={getColor(score)} strokeLinecap="round" /></svg><div className="absolute text-center"><strong className="block text-5xl">{score}</strong><span className="text-xs text-gray-500">out of 100</span></div></div>
        <h2 className={`text-xl font-bold mt-4 ${getColor(score)}`}>{getTier(score)}</h2><p className="text-center text-xs text-gray-500 mt-2">Signal strength, not an accuracy or approval percentage.</p>
      </div>
      <div className="min-w-0"><h3 className="text-xl font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="text-accent" /> What shaped your signal</h3><p className="text-sm text-gray-400 mb-4">The most influential account patterns, translated into plain language.</p>
        <div className="space-y-3">{rankedFactors.slice(0, 4).map(({ key, value }) => <div key={key} className="signal-factor"><span className={`signal-factor__icon ${value >= 0 ? 'is-positive' : 'is-negative'}`}>{value >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}</span><span className="flex-1 text-sm font-medium">{FEATURE_LABELS[key] || 'Account behaviour'}</span><span className={`text-xs font-semibold ${value >= 0 ? 'text-green-400' : 'text-red-400'}`}>{impactLabel(value)}</span></div>)}</div>
      </div>
    </Card3D>
    <div className="model-note glass-panel p-4 flex items-start gap-3"><Info className="text-accent flex-shrink-0 mt-0.5" size={19} /><div><strong className="text-sm">{guidedDemo ? 'Guided sample boundary' : 'MVP model disclosure'}</strong><p className="text-xs text-gray-500 mt-1">{guidedDemo ? 'These values are a fictional walkthrough profile. You can prepare a local commitment and inspect the public Blend fixture, but Vela will not submit this sample as your on-chain position.' : 'Your account metrics are live and come from Stellar Horizon. The scoring model was trained on synthetic behaviour profiles for this hackathon MVP, so this signal is demonstrative—not a lending decision or measured prediction accuracy.'}</p></div></div>
    <div className="flex justify-end pt-2"><button onClick={() => navigate('/proof')} className="bg-accent hover:bg-accent/80 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg shadow-accent/20">{guidedDemo ? 'Continue Sample Walkthrough' : 'Prepare private commitment'}</button></div>
  </motion.div>;
};
