import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { RefreshCcw, ArrowRight, Building, Wallet, Key, CheckCircle, AlertTriangle, ExternalLink, Info } from 'lucide-react';
import { sep10Auth, sep6Deposit, simulateBankTransfer, getTransactionStatus, getAnchorHealth, type AnchorHealth } from '../services/anchor';
import { getUsdcBalance, withdrawToAnchor } from '../services/anchorPayment';
import { Keypair, Transaction, Networks } from '@stellar/stellar-sdk';
import { signWithFreighter } from '../services/freighter';
import { getExplorerUrl } from '../services/stellar';
import { formatAnchorStatus } from '../utils/status';
import { StatefulAction } from './ui/StatefulAction';

type DepositStep = 'idle' | 'authenticating' | 'requesting' | 'awaiting_bank' | 'simulating' | 'polling' | 'completed' | 'error';
type TransferMode = 'deposit' | 'withdraw';

export const AnchorTransfer: React.FC = () => {
  const navigate = useNavigate();
  const { walletAddress, classicAccount, identityVerified, anchorTransactions, recordAnchorTransaction } = useStore();
  const resumableWithdrawal = [...anchorTransactions].reverse().find(tx => tx.type === 'withdraw' && !!tx.txHash && !['completed', 'error', 'expired'].includes(tx.status));
  const [mode, setMode] = useState<TransferMode>(resumableWithdrawal ? 'withdraw' : 'deposit');
  const [amount, setAmount] = useState(resumableWithdrawal?.amount ?? '');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<DepositStep>(resumableWithdrawal ? 'polling' : 'idle');
  const [error, setError] = useState<string | null>(null);
  const [depositId, setDepositId] = useState<string | null>(null);
  const [depositInstructions, setDepositInstructions] = useState<string | null>(null);
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null);
  const [anchorJwt, setAnchorJwt] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<string | null>(resumableWithdrawal?.status ?? null);
  const [withdrawHash, setWithdrawHash] = useState<string | null>(resumableWithdrawal?.txHash ?? null);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [anchorHealth, setAnchorHealth] = useState<AnchorHealth | null>(null);
  const [anchorHealthError, setAnchorHealthError] = useState<string | null>(null);

  const refreshAnchorHealth = useCallback(async () => {
    setAnchorHealthError(null);
    try {
      setAnchorHealth(await getAnchorHealth());
    } catch (healthError) {
      setAnchorHealth(null);
      setAnchorHealthError(healthError instanceof Error ? healthError.message : 'Anchor gateway is unavailable');
    }
  }, []);

  const refreshUsdcBalance = useCallback(async () => {
    if (!classicAccount) return;
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      setUsdcBalance(await getUsdcBalance(classicAccount.publicKey));
    } catch {
      setBalanceError('Live balance is temporarily unavailable. It will be checked again before sending.');
    } finally {
      setBalanceLoading(false);
    }
  }, [classicAccount]);

  useEffect(() => {
    if (mode === 'withdraw') void refreshUsdcBalance();
  }, [mode, refreshUsdcBalance]);

  useEffect(() => {
    void refreshAnchorHealth();
  }, [refreshAnchorHealth]);

  const authenticateAnchor = async () => {
    if (!classicAccount) throw new Error('Connect a classic G-address first');
    const anchorKeypair = classicAccount.secret ? Keypair.fromSecret(classicAccount.secret) : null;
    return sep10Auth(
      classicAccount.publicKey,
      async (xdr: string) => {
        if (!anchorKeypair) return signWithFreighter(xdr, classicAccount.publicKey);
        const tx = new Transaction(xdr, Networks.TESTNET);
        tx.sign(anchorKeypair);
        return tx.toEnvelope().toXDR('base64');
      },
    );
  };

  const handleDeposit = async () => {
    setLoading(true);
    setError(null);
    setStep('authenticating');

    try {
      if (!classicAccount) throw new Error('Connect a classic G-address first');
      if (!amount || Number(amount) < 50 || Number(amount) > 300) throw new Error('Amount must be between 50 and 300');

      // Step 1: SEP-10 Authentication
      console.log("SEP-10 auth with G-address:", classicAccount.publicKey);
      const jwt = await authenticateAnchor();
      setAnchorJwt(jwt);
      console.log("SEP-10 JWT received");

      // Step 2: SEP-6 Deposit request
      setStep('requesting');
      const instructions = await sep6Deposit(jwt, classicAccount.publicKey, amount);
      setDepositId(instructions.id);
      setDepositInstructions(instructions.how);
      setSandboxUrl(`https://tr-mock-anchor.fly.dev/sep6/tx/${instructions.id}`);
      setStep('awaiting_bank');

      recordAnchorTransaction({
        id: instructions.id,
        type: 'deposit',
        status: 'pending_user_transfer_start',
        amount,
        asset: 'USDC',
        startedAt: new Date().toISOString(),
      });

    } catch (e) {
      console.error("Deposit error:", e);
      setError(e instanceof Error ? e.message : 'Deposit failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    let paymentSubmitted = false;
    setLoading(true);
    setError(null);
    setWithdrawHash(null);
    setFinalStatus(null);
    setStep('authenticating');
    try {
      if (!classicAccount) throw new Error('Connect a classic G-address first');
      if (!/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(amount) || Number(amount) <= 0) {
        throw new Error('Enter a positive USDC amount with at most 7 decimals');
      }
      const liveBalance = await getUsdcBalance(classicAccount.publicKey);
      setUsdcBalance(liveBalance);
      if (Number(amount) > Number(liveBalance)) {
        throw new Error(`Your Stellar account has ${liveBalance} USDC available. Enter ${liveBalance} USDC or less.`);
      }
      const jwt = await authenticateAnchor();
      setAnchorJwt(jwt);
      setStep('requesting');
      const result = await withdrawToAnchor(classicAccount, jwt, amount, submission => {
        paymentSubmitted = true;
        setWithdrawHash(submission.hash);
        setFinalStatus('pending_user_transfer_complete');
        setStep('polling');
        recordAnchorTransaction({
          id: submission.id,
          type: 'withdraw',
          status: 'pending_user_transfer_complete',
          amount,
          asset: 'USDC',
          startedAt: new Date().toISOString(),
          txHash: submission.hash,
          anchorAccount: submission.anchorAccount,
          memo: submission.memo,
          memoType: submission.memoType,
        });
      });
      setWithdrawHash(result.hash);
      setFinalStatus(result.status.status);
      setStep(result.status.status === 'error' ? 'error' : result.status.status === 'completed' ? 'completed' : 'polling');
      recordAnchorTransaction({
        id: result.status.id,
        type: 'withdraw',
        status: result.status.status,
        amount,
        asset: 'USDC',
        startedAt: result.status.started_at || new Date().toISOString(),
        completedAt: result.status.completed_at,
        txHash: result.hash,
        anchorAccount: result.anchorAccount,
        memo: result.memo,
        memoType: result.memoType,
      });
      await refreshUsdcBalance();
    } catch (e) {
      if (paymentSubmitted) {
        setError('The Stellar payment was submitted and saved, but Anchor status is temporarily unavailable. Resume confirmation below; do not send again.');
        setStep('polling');
      } else {
        setError(e instanceof Error ? e.message : 'Withdrawal failed');
        setStep('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (nextMode: TransferMode) => {
    if (resumableWithdrawal && step === 'polling') return;
    setMode(nextMode);
    setAmount('');
    setStep('idle');
    setError(null);
    setFinalStatus(null);
    setWithdrawHash(null);
  };

  const resumeWithdrawalStatus = async () => {
    if (!resumableWithdrawal) return;
    setLoading(true);
    setError(null);
    try {
      const jwt = await authenticateAnchor();
      setAnchorJwt(jwt);
      for (let i = 0; i < 20; i++) {
        const status = await getTransactionStatus(jwt, resumableWithdrawal.id);
        setFinalStatus(status.status);
        recordAnchorTransaction({
          ...resumableWithdrawal,
          status: status.status,
          completedAt: status.completed_at,
        });
        if (status.status === 'completed') {
          setStep('completed');
          return;
        }
        if (status.status === 'error' || status.status === 'expired') {
          throw new Error(`Anchor status: ${formatAnchorStatus(status.status)}`);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      setStep('polling');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh Anchor status');
      setStep('polling');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateBank = async () => {
    if (!anchorJwt || !depositId) return;
    setLoading(true);
    setStep('simulating');

    try {
      // Simulate the bank transfer via the anchor's sandbox endpoint
      await simulateBankTransfer(anchorJwt, depositId);
      console.log("Bank transfer simulated for", depositId);

      // Poll for completion
      setStep('polling');
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        const status = await getTransactionStatus(anchorJwt, depositId);
        console.log(`Poll ${i + 1}: status=${status.status}`);
        setFinalStatus(status.status);

        if (status.status === 'completed') {
          setStep('completed');
          recordAnchorTransaction({
            id: depositId,
            type: 'deposit',
            status: 'completed',
            amount,
            asset: 'USDC',
            startedAt: status.started_at || new Date().toISOString(),
            completedAt: status.completed_at,
          });
          setLoading(false);
          return;
        }
        if (status.status === 'error') {
          throw new Error('Anchor reported an error for this transaction');
        }
      }
      setFinalStatus('timeout — check manually');
    } catch (e) {
      console.error("Simulation/poll error:", e);
      setError(e instanceof Error ? e.message : 'Bank simulation failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto space-y-6">

      <div className="context-note flex items-start gap-3 p-4 text-sm text-amber-800">
        <Info size={19} className="mt-0.5 shrink-0" />
        <div><strong>Standalone Anchor interoperability demo</strong><p className="mt-1 text-xs text-gray-600">This rail uses the Stellar account’s existing USDC or a sandbox TRY deposit. It is separate from Blend and does not represent loan proceeds.</p></div>
      </div>

      <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${anchorHealth ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800' : 'border-amber-500/25 bg-amber-500/8 text-amber-800'}`}>
        <div className="flex items-center gap-2">
          {anchorHealth ? <CheckCircle size={17} /> : <AlertTriangle size={17} />}
          <span>
            {anchorHealth
              ? `Anchor gateway reachable · ${anchorHealth.stellarMode === 'live' ? 'Stellar testnet mode' : anchorHealth.stellarMode} · treasury ${Number(anchorHealth.treasuryUsdc).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`
              : anchorHealthError || 'Checking Anchor gateway…'}
          </span>
        </div>
        <button type="button" onClick={() => void refreshAnchorHealth()} className="shrink-0 rounded-full border border-current/20 p-1.5" aria-label="Recheck Anchor gateway">
          <RefreshCcw size={14} />
        </button>
      </div>
      {anchorHealth && (
        <p className="-mt-4 px-1 text-[11px] leading-relaxed text-gray-500">
          Gateway health confirms discovery and authentication only. Each payout is verified separately by its SEP-6 status and Stellar transaction hash.
        </p>
      )}

      {/* Identity Separation Panel */}
      <div className="support-panel p-5 md:p-6">
        <h3 className="text-lg font-semibold mb-4 text-white">Identity Separation</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 bg-surface p-3 rounded-lg border border-white/5">
            <Wallet className="text-blue-400 flex-shrink-0" size={20} />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Main Wallet (Passkey / C-Address)</p>
              <p className="font-mono text-xs text-white break-all">{walletAddress || 'Freighter login — no Passkey C-address'}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-surface p-3 rounded-lg border border-accent/30">
            <Key className="text-accent flex-shrink-0" size={20} />
            <div className="min-w-0">
              <p className="text-xs text-accent">Bank Connection (Classic G-Address for SEP-10)</p>
              <p className="font-mono text-xs text-white break-all">
                {classicAccount?.publicKey || 'Connect a wallet first'}
              </p>
              <p className="text-xs text-gray-500 mt-1">USDC trustline auto-established ✓</p>
            </div>
          </div>
        </div>
      </div>

      {identityVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
          <span>Anchor SEP-12 returned a sandbox customer ID, which was hashed locally. The MVP contract blocks a repeated submitted hash, but does not yet verify an Anchor signature.</span>
        </div>
      )}

      {/* Deposit Flow */}
      <div className="glass-panel task-panel overflow-hidden">
        <div className="mode-switch grid grid-cols-2">
          <button type="button" onClick={() => changeMode('deposit')}
            disabled={!!resumableWithdrawal && step === 'polling'}
            className={`py-3 text-sm font-semibold ${mode === 'deposit' ? 'bg-accent/15 text-accent' : 'text-gray-400 hover:text-white'}`}>
            Deposit TRY to USDC
          </button>
          <button type="button" onClick={() => changeMode('withdraw')}
            disabled={!!resumableWithdrawal && step === 'polling'}
            className={`py-3 text-sm font-semibold ${mode === 'withdraw' ? 'bg-accent/15 text-accent' : 'text-gray-400 hover:text-white'}`}>
            Withdraw USDC to TRY
          </button>
        </div>
        <div className="bg-accent/10 border-b border-accent/20 px-8 py-4">
          <h3 className="text-lg font-semibold text-accent">{mode === 'deposit' ? 'Deposit TRY to USDC' : 'Withdraw USDC to TRY'}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {mode === 'deposit'
              ? 'Simulate a TRY bank transfer with the test anchor and receive testnet USDC.'
              : 'Send a real testnet USDC payment to the anchor address and wait for anchor confirmation.'}
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Amount input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-gray-400 text-sm">Amount ({mode === 'deposit' ? 'TRY' : 'USDC'})</label>
              {mode === 'withdraw' && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">
                    Available: <strong className="text-gray-700">{balanceLoading ? 'Checking…' : `${usdcBalance ?? '—'} USDC`}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => usdcBalance && setAmount(usdcBalance)}
                    disabled={!usdcBalance || balanceLoading || (step !== 'idle' && step !== 'error')}
                    className="rounded-full border border-accent/25 px-2.5 py-1 font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
                  >
                    Max
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshUsdcBalance()}
                    disabled={balanceLoading}
                    aria-label="Refresh USDC balance"
                    className="rounded-full border border-black/10 p-1.5 text-gray-500 transition-colors hover:text-accent disabled:opacity-40"
                  >
                    <RefreshCcw size={13} className={balanceLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              )}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={mode === 'deposit' ? 'e.g. 100' : 'e.g. 1'}
              min={mode === 'deposit' ? '50' : '0.0000001'}
              max={mode === 'deposit' ? '300' : usdcBalance ?? undefined}
              disabled={step !== 'idle' && step !== 'error'}
              className="w-full bg-surface border border-white/10 rounded-xl p-4 text-xl outline-none focus:border-accent transition-colors disabled:opacity-50"
            />
            {mode === 'withdraw' && balanceError && <p className="text-xs text-amber-700">{balanceError}</p>}
            {mode === 'withdraw' && usdcBalance && Number(amount) > Number(usdcBalance) && (
              <p className="text-xs text-red-600">This exceeds your available balance. Choose Max or enter a smaller amount.</p>
            )}
          </div>

          {/* Anchor info */}
          <div className="bg-surface/50 border border-white/5 p-4 rounded-xl flex gap-4">
            <Building className="text-accent flex-shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-semibold text-accent mb-1">Testnet Anchor</p>
              <p className="text-gray-400">tr-mock-anchor.fly.dev · SEP-6/SEP-10 · Isolated G-address</p>
            </div>
          </div>

          {/* Step 1: Initiate */}
          {mode === 'deposit' && (step === 'idle' || step === 'error') && (
            <StatefulAction
              onClick={handleDeposit}
              disabled={!amount || loading || !classicAccount || Number(amount) < 50 || Number(amount) > 300}
              state={loading ? 'working' : 'idle'}
              workingLabel="Opening Anchor deposit…"
              icon={<ArrowRight size={18} />}
              className="w-full bg-accent text-white py-4 rounded-xl font-semibold"
            >
              Initiate Deposit
            </StatefulAction>
          )}

          {mode === 'withdraw' && !resumableWithdrawal && (step === 'idle' || step === 'error') && (
            <StatefulAction onClick={handleWithdraw}
              disabled={!amount || loading || !classicAccount || Number(amount) <= 0 || (!!usdcBalance && Number(amount) > Number(usdcBalance))}
              state={loading ? 'working' : 'idle'}
              workingLabel="Submitting USDC payment…"
              icon={<ArrowRight size={18} />}
              className="w-full bg-accent text-white py-4 rounded-xl font-semibold">
              Send USDC Withdrawal on Testnet
            </StatefulAction>
          )}

          {/* Step progress */}
          {mode === 'deposit' && step !== 'idle' && (
            <div className="space-y-3">
              <StepIndicator label="SEP-10 Authentication" done={step !== 'authenticating'} active={step === 'authenticating'} />
              <StepIndicator label="SEP-6 Deposit Request" done={!['authenticating', 'requesting'].includes(step)} active={step === 'requesting'} />
              <StepIndicator label="Bank Transfer (Sandbox)" done={['polling', 'completed'].includes(step)} active={step === 'awaiting_bank' || step === 'simulating'} />
              <StepIndicator label="Anchor Confirmation" done={step === 'completed'} active={step === 'polling'} />
            </div>
          )}

          {mode === 'withdraw' && step !== 'idle' && (
            <div className="space-y-3">
              <StepIndicator label="SEP-10 Authentication" done={step !== 'authenticating'} active={step === 'authenticating'} />
              <StepIndicator label="SEP-6 Withdrawal Instructions" done={!['authenticating', 'requesting'].includes(step)} active={step === 'requesting'} />
              <StepIndicator label="Stellar USDC Payment" done={!!withdrawHash} active={!withdrawHash && step === 'polling'} />
              <StepIndicator label="Anchor Status" done={step === 'completed'} active={step === 'polling'} />
            </div>
          )}

          {/* Bank instructions + simulate button */}
          {mode === 'deposit' && step === 'awaiting_bank' && depositInstructions && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl space-y-3">
              <p className="text-sm text-yellow-300 font-semibold">📋 Bank Transfer Instructions</p>
              <p className="text-sm text-gray-300">{depositInstructions}</p>
              {sandboxUrl && (
                <a href={sandboxUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-accent underline flex items-center gap-1">
                  <ExternalLink size={12} /> Open in Anchor Sandbox
                </a>
              )}
              <button
                onClick={handleSimulateBank}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-500 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? <RefreshCcw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                Simulate Bank Transfer (Testnet)
              </button>
            </div>
          )}

          {/* Polling status */}
          {step === 'polling' && (
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-center gap-3">
              <RefreshCcw className="animate-spin text-blue-400" size={18} />
              <div>
                <p className="text-sm text-blue-300 font-semibold">Waiting for Anchor confirmation...</p>
                <p className="text-xs text-gray-400">{formatAnchorStatus(finalStatus)}</p>
                {withdrawHash && <a href={getExplorerUrl(withdrawHash)} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-accent underline break-all">Stellar payment confirmed: {withdrawHash}</a>}
                {mode === 'withdraw' && withdrawHash && resumableWithdrawal && (
                  <button type="button" onClick={() => void resumeWithdrawalStatus()} disabled={loading} className="mt-3 rounded-lg border border-blue-400/30 px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">
                    {loading ? 'Checking Anchor…' : 'Resume Anchor confirmation'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Completed */}
          {mode === 'deposit' && step === 'completed' && (
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                <p className="text-green-300 font-semibold">Deposit Completed!</p>
              </div>
              <p className="text-sm text-gray-300">
                USDC has been credited to your G-address. Check on{' '}
                <a href={`https://stellar.expert/explorer/testnet/account/${classicAccount?.publicKey}`}
                  target="_blank" rel="noreferrer" className="text-accent underline">
                  stellar.expert
                </a>
              </p>
            </div>
          )}

          {mode === 'withdraw' && step === 'completed' && withdrawHash && (
            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-xl space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} />
                <p className="text-green-300 font-semibold">USDC Payment Submitted</p>
              </div>
              <p className="text-sm text-gray-300">Anchor: {formatAnchorStatus(finalStatus)}</p>
              <a href={getExplorerUrl(withdrawHash)} target="_blank" rel="noreferrer"
                className="block text-xs text-accent underline break-all">
                View payment transaction: {withdrawHash}
              </a>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
              <div>
                <p className="text-sm text-red-300 font-semibold">Error</p>
                <p className="text-xs text-gray-400 break-all">{error}</p>
              </div>
            </div>
          )}

          <button type="button" onClick={() => navigate('/transparency')} className="text-accent underline text-sm">
            Review session receipt →
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500">
        The anchor runs on testnet. Bank-side TRY movement is sandboxed; Stellar USDC payments and returned transaction hashes are real testnet operations.
      </p>
    </motion.div>
  );
};

// Helper component for step indicators
const StepIndicator: React.FC<{ label: string; done: boolean; active: boolean }> = ({ label, done, active }) => (
  <div className={`flex items-center gap-3 text-sm ${done ? 'text-green-400' : active ? 'text-accent' : 'text-gray-500'}`}>
    {done ? (
      <CheckCircle size={16} />
    ) : active ? (
      <RefreshCcw className="animate-spin" size={16} />
    ) : (
      <div className="w-4 h-4 rounded-full border border-gray-600" />
    )}
    <span>{label}</span>
  </div>
);
