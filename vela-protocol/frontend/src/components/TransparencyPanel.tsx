import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Eye, ShieldOff, Check, GitCommit } from 'lucide-react';
import { getExplorerUrl } from '../services/stellar';

export const TransparencyPanel: React.FC = () => {
  const { features, position, identityVerified } = useStore();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Data Transparency</h2>
        <p className="text-gray-400">We believe you should know exactly how your data is used.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2 text-success mb-4">
            <Eye size={24} />
            <h3 className="text-lg font-bold">Data We Used</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex justify-between text-sm bg-surface p-2 rounded">
              <span className="text-gray-400">Observed History</span>
              <span className="font-mono">{features?.history_length_days ?? 'Unavailable'} days</span>
            </li>
            <li className="flex justify-between text-sm bg-surface p-2 rounded">
              <span className="text-gray-400">Average Transaction Amount (mixed assets)</span>
              <span className="font-mono">{features?.avg_amount ?? 'Unavailable'}</span>
            </li>
            <li className="flex justify-between text-sm bg-surface p-2 rounded">
              <span className="text-gray-400">Tx Count</span>
              <span className="font-mono">{features?.tx_count ?? 'Unavailable'}</span>
            </li>
          </ul>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-400 mb-4">
            <ShieldOff size={24} />
            <h3 className="text-lg font-bold">Data We Ignored</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-2 text-sm bg-surface p-2 rounded text-gray-400">
              <Check size={16} className="text-red-400" /> Geographic Location
            </li>
            <li className="flex items-center gap-2 text-sm bg-surface p-2 rounded text-gray-400">
              <Check size={16} className="text-red-400" /> Demographics
            </li>
            <li className="flex items-center gap-2 text-sm bg-surface p-2 rounded text-gray-400">
              <Check size={16} className="text-red-400" /> Real Identity (KYC kept off-chain)
            </li>
          </ul>
        </div>
      </div>

      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <GitCommit className="text-accent" /> Contract Status
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          {position?.txHash ? 'The gatekeeper transaction succeeded on testnet. The contract accepted a 32-byte commitment and a client-claimed 4-byte threshold result, then supplied collateral to Blend. The raw score was not sent on-chain, but this MVP does not cryptographically verify that the commitment and threshold claim match.' : 'No successful gatekeeper transaction has been recorded in this session.'}
        </p>
        {position?.txHash && <a href={getExplorerUrl(position.txHash)} target="_blank" rel="noreferrer" className="text-accent underline break-all">View transaction: {position.txHash}</a>}
      </div>

      <div className="glass-panel p-6 flex items-start gap-3">
        <ShieldOff className="text-accent mt-0.5" size={22} />
        <div>
          <h3 className="font-bold">Sybil Resistance</h3>
          <p className="text-sm text-gray-400 mt-1">One verified identity → one subsidized position, regardless of wallet used.</p>
          <p className="text-xs text-gray-500 mt-2">Status: {identityVerified ? 'Anchor identity hash verified for this session.' : 'Anchor identity verification required before opening a position.'}</p>
        </div>
      </div>
      
      <div className="text-center">
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-surface border border-white/10 hover:bg-white/5 px-8 py-3 rounded-xl font-semibold transition-colors"
        >
          Return to Start
        </button>
      </div>
    </motion.div>
  );
};
