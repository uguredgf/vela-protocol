import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, CircleDashed, Database, ExternalLink, FileCheck2,
  FlaskConical, Landmark, LockKeyhole, ReceiptText, ShieldCheck,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { getExplorerUrl } from '../services/stellar';
import { formatAnchorStatus } from '../utils/status';
import { AnchorTransaction, Position } from '../types';

type NetworkState = 'idle' | 'checking' | 'confirmed' | 'unconfirmed';

const short = (value?: string | null) => value ? `${value.slice(0, 10)}…${value.slice(-8)}` : 'Not created';
const GATEKEEPER_CONTRACT = import.meta.env.VITE_GATEKEEPER_CONTRACT_ID;
const BLEND_POOL = 'CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF';
const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const amountsMatch = (a: string | number, b: string | number) => Math.abs(Number(a) - Number(b)) < 0.0000001;

async function getHorizonEvidence(hash: string) {
  if (!/^[0-9a-f]{64}$/i.test(hash)) return false;
  const [txResponse, operationsResponse] = await Promise.all([
    fetch(`https://horizon-testnet.stellar.org/transactions/${hash}`),
    fetch(`https://horizon-testnet.stellar.org/transactions/${hash}/operations`),
  ]);
  if (!txResponse.ok || !operationsResponse.ok) return false;
  const transaction = await txResponse.json() as { successful?: boolean; source_account?: string; memo?: string; memo_type?: string };
  const operations = await operationsResponse.json() as { _embedded?: { records?: Array<Record<string, any>> } };
  return { transaction, records: operations._embedded?.records ?? [] };
}

async function verifyBlendTransaction(position: Position): Promise<boolean> {
  if (!position.txHash || !GATEKEEPER_CONTRACT) return false;
  const evidence = await getHorizonEvidence(position.txHash);
  if (!evidence || evidence.transaction.successful !== true || evidence.transaction.source_account !== position.user) return false;
  return evidence.records.some(record => {
    const changes = Array.isArray(record.asset_balance_changes) ? record.asset_balance_changes : [];
    const userSupply = changes.some((change: any) => change.from === position.user && change.to === GATEKEEPER_CONTRACT && amountsMatch(change.amount, position.collateral));
    const blendSupply = changes.some((change: any) => change.from === GATEKEEPER_CONTRACT && change.to === BLEND_POOL && amountsMatch(change.amount, position.totalPosition));
    return record.type === 'invoke_host_function' && userSupply && blendSupply;
  });
}

async function verifyAnchorPayment(transaction: AnchorTransaction, sourceAccount: string): Promise<boolean> {
  if (!transaction.txHash || !transaction.anchorAccount || !transaction.memo || !transaction.memoType) return false;
  const evidence = await getHorizonEvidence(transaction.txHash);
  if (!evidence || evidence.transaction.successful !== true || evidence.transaction.source_account !== sourceAccount) return false;
  if (evidence.transaction.memo !== transaction.memo || evidence.transaction.memo_type !== transaction.memoType) return false;
  return evidence.records.some(record => record.type === 'payment' && record.from === sourceAccount && record.to === transaction.anchorAccount && record.asset_code === 'USDC' && record.asset_issuer === USDC_ISSUER && amountsMatch(record.amount, transaction.amount));
}

export const TransparencyPanel: React.FC = () => {
  const navigate = useNavigate();
  const { score, guidedDemo, features, commitment, proofGenerated, position, identityVerified, classicAccount, anchorTransactions } = useStore();
  const [positionState, setPositionState] = useState<NetworkState>(position?.txHash ? 'checking' : 'idle');
  const latestAnchor = useMemo(() => anchorTransactions.at(-1), [anchorTransactions]);
  const [anchorPaymentState, setAnchorPaymentState] = useState<NetworkState>(latestAnchor?.txHash ? 'checking' : 'idle');

  useEffect(() => {
    let active = true;
    if (position?.txHash) {
      setPositionState('checking');
      void verifyBlendTransaction(position)
        .then(ok => active && setPositionState(ok ? 'confirmed' : 'unconfirmed'))
        .catch(() => active && setPositionState('unconfirmed'));
    }
    return () => { active = false; };
  }, [position?.txHash]);

  useEffect(() => {
    let active = true;
    if (latestAnchor?.txHash) {
      setAnchorPaymentState('checking');
      if (!classicAccount) return;
      void verifyAnchorPayment(latestAnchor, classicAccount.publicKey)
        .then(ok => active && setAnchorPaymentState(ok ? 'confirmed' : 'unconfirmed'))
        .catch(() => active && setAnchorPaymentState('unconfirmed'));
    }
    return () => { active = false; };
  }, [classicAccount, latestAnchor]);

  const receiptRows = [
    {
      icon: Database,
      title: 'Stellar activity',
      value: guidedDemo ? `${features?.tx_count ?? 0} fictional payments in the walkthrough profile` : features ? `${features.tx_count ?? 0} qualifying payments read from Horizon` : 'No scoring result in this tab',
      badge: guidedDemo ? 'GUIDED SAMPLE' : features ? 'LIVE SOURCE' : 'NOT RECORDED',
      tone: guidedDemo ? 'warning' : features ? 'success' : 'muted',
      note: guidedDemo ? 'This sample is not derived from the connected account.' : 'Account activity is read off-chain; raw history is not written to the contract.',
    },
    {
      icon: FileCheck2,
      title: 'Risk signal',
      value: score === null ? 'Not calculated' : `${score.toFixed(1)} / 100 demonstrative signal`,
      badge: score === null ? 'NOT RECORDED' : guidedDemo ? 'GUIDED SAMPLE' : 'SYNTHETIC MODEL',
      tone: score === null ? 'muted' : 'warning',
      note: 'This is a hackathon model output, not measured accuracy, loan approval, or financial advice.',
    },
    {
      icon: LockKeyhole,
      title: 'Private commitment',
      value: proofGenerated ? short(commitment) : 'Not prepared',
      badge: proofGenerated ? 'LOCAL CLAIM' : 'NOT CREATED',
      tone: proofGenerated ? 'warning' : 'muted',
      note: 'The score stays off-chain, but the threshold claim is not cryptographically proven in this MVP.',
    },
    {
      icon: ShieldCheck,
      title: 'Identity duplicate guard',
      value: identityVerified ? 'Anchor customer ID hashed in this session' : 'Not completed in this tab',
      badge: identityVerified ? 'SANDBOX-DERIVED' : 'NOT RECORDED',
      tone: identityVerified ? 'warning' : 'muted',
      note: 'The current contract stores submitted hashes; it does not verify an Anchor signature or identity attestation.',
    },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-2 text-sm text-accent">
          <ReceiptText size={18} /> End-of-session verification
        </div>
        <h1 className="display-serif text-3xl md:text-4xl font-semibold">Your verification receipt</h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          A plain-language record of what happened in this session—and what each result actually proves. This is a prototype receipt, not a regulatory audit report.
        </p>
      </div>

      <div className="glass-panel task-panel overflow-hidden">
        <div className="px-5 md:px-6 py-4 border-b border-white/10">
          <h2 className="font-bold">Session trail</h2>
          <p className="text-xs text-gray-500 mt-1">Statuses are labeled by their real source instead of being presented as one continuous loan.</p>
        </div>
        <div className="divide-y divide-white/10">
          {receiptRows.map(({ icon: Icon, title, value, badge, tone, note }) => (
            <div key={title} className="p-5 md:px-6 flex items-start gap-4">
              <span className="mt-0.5 rounded-xl bg-surface p-2.5 text-accent"><Icon size={19} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">{title}</h3>
                  <span className={`receipt-badge receipt-badge--${tone}`}>{badge}</span>
                </div>
                <p className="text-sm mt-1 break-all">{value}</p>
                <p className="text-xs text-gray-500 mt-1">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="support-panel p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold flex items-center gap-2"><Landmark className="text-accent" size={20} /> Blend collateral supply</h2>
            <NetworkBadge state={positionState} />
          </div>
          {position?.txHash ? (
            <>
              <p className="text-sm text-gray-400">Horizon confirms whether the session transaction succeeded. It supplies collateral through the gatekeeper; it does not execute a borrow.</p>
              <a href={getExplorerUrl(position.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-accent underline break-all">
                Verify {short(position.txHash)} <ExternalLink size={13} />
              </a>
            </>
          ) : <p className="text-sm text-gray-500">No Blend supply transaction was recorded in this session.</p>}
        </div>

        <div className="support-panel p-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold flex items-center gap-2"><FlaskConical className="text-accent" size={20} /> Anchor rail</h2>
            {latestAnchor?.txHash ? <NetworkBadge state={anchorPaymentState} /> : <span className="receipt-badge receipt-badge--warning">TRY SANDBOX</span>}
          </div>
          {latestAnchor ? (
            <>
              <p className="text-sm text-gray-400">
                {latestAnchor.type === 'withdraw' ? 'USDC payment' : 'TRY deposit simulation'} · {latestAnchor.amount} {latestAnchor.asset} · {formatAnchorStatus(latestAnchor.status)}
              </p>
              <p className="text-xs text-gray-500">The TRY bank side is sandboxed. Only a linked Stellar hash can be independently checked on testnet.</p>
              {latestAnchor.txHash && <a href={getExplorerUrl(latestAnchor.txHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-accent underline break-all">Verify payment {short(latestAnchor.txHash)} <ExternalLink size={13} /></a>}
            </>
          ) : <p className="text-sm text-gray-500">No Anchor transfer was recorded in this session.</p>}
        </div>
      </div>

      <div className="glass-panel p-6 border border-amber-500/20">
        <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="text-amber-600" size={19} /> What this receipt does not prove</h2>
        <ul className="mt-3 grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-500 list-disc pl-5">
          <li>No ZK verifier binds the commitment to the threshold claim yet.</li>
          <li>No Anchor-signed identity attestation is checked on-chain yet.</li>
          <li>Blend borrowing, repayment, and user withdrawal are not implemented.</li>
          <li>The Anchor rail is separate from the Blend supply; it is not loan proceeds.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <button type="button" onClick={() => navigate('/evidence')} className="bg-accent hover:bg-accent/80 text-white px-6 py-3 rounded-xl font-semibold">Open Judge Evidence</button>
        <button type="button" onClick={() => navigate('/')} className="bg-surface border border-white/10 hover:bg-white/5 px-6 py-3 rounded-xl font-semibold">Return to Start</button>
      </div>
    </motion.div>
  );
};

const NetworkBadge: React.FC<{ state: NetworkState }> = ({ state }) => {
  if (state === 'checking') return <span className="receipt-badge receipt-badge--muted"><CircleDashed className="animate-spin" size={12} /> CHECKING</span>;
  if (state === 'confirmed') return <span className="receipt-badge receipt-badge--success"><CheckCircle2 size={12} /> ON-CHAIN</span>;
  if (state === 'unconfirmed') return <span className="receipt-badge receipt-badge--warning"><AlertTriangle size={12} /> UNVERIFIED</span>;
  return <span className="receipt-badge receipt-badge--muted">NOT RECORDED</span>;
};
