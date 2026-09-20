import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { assertPasskeyEnvironment, createWallet, connectWallet } from '../services/passkey';
import { bindClassicAccount, createFundedClassicAccount, hasBoundClassicAccount, PENDING_DEPLOY_SOURCE_KEY, provisionClassicAccount, restorePendingClassicAccount } from '../services/classicAccount';
import { connectFreighter } from '../services/freighter';
import { ArrowUpRight, Fingerprint, History, KeyRound, ShieldCheck, Wallet } from 'lucide-react';
import { ProtocolCore } from './ui/ProtocolCore';
import { StatefulAction } from './ui/StatefulAction';

export const PasskeyLogin: React.FC = () => {
  const { setAuth, setFreighterAuth, startGuidedDemo, isAuthenticated, classicAccount } = useStore();
  const navigate = useNavigate();
  const [connectingAction, setConnectingAction] = useState<'create' | 'passkey' | 'freighter' | null>(null);
  const isConnecting = connectingAction !== null;
  const [error, setError] = useState<string | null>(null);

  const loginError = (e: unknown): string => {
    const error = e as { message?: string; code?: string | number; cause?: unknown };
    const cause = error?.cause as { message?: string; code?: string | number; name?: string } | undefined;
    const detail = cause?.message || (cause?.name && cause.name !== error?.message ? cause.name : undefined);
    const code = error?.code || cause?.code;
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      return 'Passkey prompt was cancelled, denied, or timed out. Use Chrome/Edge on the same host where the passkey was created (127.0.0.1 and localhost are different), then approve the browser prompt.';
    }
    if (e instanceof DOMException && e.name === 'InvalidStateError') {
      return 'This passkey is already registered here. Use Connect Passkey instead.';
    }
    if (code === 3004 || code === 3002) {
      return `No usable Vela passkey was approved for ${window.location.hostname}. Passkeys are tied to the website hostname; open the exact domain where the old passkey was created, or create a new testnet passkey here.`;
    }
    if (detail || code) return `${error.message || 'Passkey operation failed'}${code ? ` [${code}]` : ''}${detail ? `: ${detail}` : ''}`;
    return e instanceof Error ? e.message : 'Wallet connection failed';
  };

  const handleCreate = async () => {
    setConnectingAction('create');
    setError(null);
    try {
      assertPasskeyEnvironment();
      const deployer = restorePendingClassicAccount() || await createFundedClassicAccount();
      sessionStorage.setItem(PENDING_DEPLOY_SOURCE_KEY, deployer.secret!);
      const wallet = await createWallet(deployer.secret!);
      const classic = bindClassicAccount(wallet.address, deployer);
      sessionStorage.removeItem(PENDING_DEPLOY_SOURCE_KEY);
      setAuth(wallet.address, classic);
      // A newly-created helper G-account has no meaningful payment history.
      // Open the explicitly-labelled walkthrough instead of attempting to score
      // Friendbot/account-creation activity.
      startGuidedDemo();
      navigate('/score');
    } catch (e) {
      console.error(e);
      setError(loginError(e));
    }
    setConnectingAction(null);
  };

  const handleConnect = async () => {
    setConnectingAction('passkey');
    setError(null);
    try {
      assertPasskeyEnvironment();
      const wallet = await connectWallet();
      const hasExistingHistorySource = hasBoundClassicAccount(wallet.address);
      const classic = await provisionClassicAccount(wallet.address);
      setAuth(wallet.address, classic);
      if (!hasExistingHistorySource) startGuidedDemo();
      navigate('/score');
    } catch (e) {
      console.error(e);
      setError(loginError(e));
    }
    setConnectingAction(null);
  };

  const handleFreighter = async () => {
    setConnectingAction('freighter');
    setError(null);
    try {
      const publicKey = await connectFreighter();
      setFreighterAuth(publicKey);
      navigate('/score');
    } catch (e) {
      console.warn('Freighter connection was not completed:', e);
      setError(e instanceof Error ? e.message : 'Freighter connection failed');
    } finally {
      setConnectingAction(null);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center max-w-5xl mx-auto py-1 md:py-3"
    >
      <div className="hero-layout w-full">
        <div className="hero-copy-glass">
          <div className={`login-identity-flow mb-5 ${isConnecting ? 'is-working' : isAuthenticated ? 'is-ready' : ''}`}>
            <div className="hero-mark"><ProtocolCore variant="hero" active={isConnecting} /></div>
            <div className="login-identity-flow__route">
              <div className="login-identity-flow__line"><span /><span /><span /></div>
              <div className="login-identity-flow__labels"><span>Account</span><span>Signal</span><span>Blend</span></div>
            </div>
          </div>
          <div className="eyebrow mb-4">
            <span className="eyebrow__dot" /> Verified on Stellar testnet
          </div>
          <h1 className="display-serif text-4xl md:text-[3.35rem] font-semibold mb-5 tracking-[-0.035em] leading-[0.98]">
            Credit context for<br className="hidden sm:block" /> <span className="text-accent">on-chain cash flow.</span>
          </h1>
          <p className="text-gray-400 mb-7 text-base md:text-lg max-w-2xl leading-relaxed">
            Read eligible Stellar payment history into a demonstrative risk signal, prepare a private commitment, and verify a real collateral-supply path through Blend v2.
          </p>

          <div className="trust-list w-full" aria-label="Protocol safeguards">
            <div><ShieldCheck size={16} /><span>Minimum evidence gate</span></div>
            <div><ShieldCheck size={16} /><span>Score stays off-chain</span></div>
            <div><ShieldCheck size={16} /><span>Verifiable testnet supply</span></div>
          </div>
        </div>

        <div className="glass-panel login-panel p-5 md:p-7 w-full flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="text-left min-w-0">
            <p className="font-semibold">Choose what Vela should read</p>
            <p className="text-xs text-gray-500 mt-0.5">Your public Stellar history and your sign-in method are separate.</p>
          </div>
          <span className="status-badge">MVP</span>
        </div>
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        {error?.includes('Freighter was not detected') && (
          <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" className="freighter-help-link">
            Freighter setup guide · opens in a new tab <ArrowUpRight size={14} />
          </a>
        )}
        {isAuthenticated && classicAccount && (
          <button type="button" onClick={() => navigate('/score')}
            className="bg-accent hover:bg-accent/80 text-white p-4 rounded-lg font-semibold">
            Continue Current Session
          </button>
        )}
        <StatefulAction
          onClick={handleFreighter}
          disabled={isConnecting}
          state={connectingAction === 'freighter' ? 'working' : 'idle'}
          workingLabel="Connecting Freighter…"
          icon={<Wallet size={20} />}
          className="login-choice login-choice--recommended secondary-action text-left disabled:opacity-50"
        >
          <span className="login-choice__copy"><strong>Use my Freighter wallet</strong><small>Recommended · scores this G-address’s existing public payment history</small></span>
          <span className="login-choice__tag">LIVE</span>
        </StatefulAction>

        <div className="login-divider"><span>Passkey identity</span></div>

        <StatefulAction
          onClick={handleCreate}
          disabled={isConnecting}
          state={connectingAction === 'create' ? 'working' : 'idle'}
          workingLabel="Creating testnet identity…"
          icon={<KeyRound size={20} />}
          className="login-choice secondary-action"
        >
          <span className="login-choice__copy"><strong>Create a new Passkey identity</strong><small>Creates a new C-wallet and helper G-account · opens a labelled sample because a new account has no history</small></span>
        </StatefulAction>

        <StatefulAction
          onClick={handleConnect}
          disabled={isConnecting}
          state={connectingAction === 'passkey' ? 'working' : 'idle'}
          workingLabel="Reconnecting passkey…"
          icon={<Fingerprint size={20} />}
          className="login-choice secondary-action"
        >
          <span className="login-choice__copy"><strong>Reconnect an existing Passkey</strong><small>Restores the C-wallet; Vela can only score its session-linked G-account, not the C-address itself</small></span>
        </StatefulAction>

        <div className="account-model-note">
          <History size={17} />
          <p><strong>What is scored?</strong> Stellar Horizon history belonging to a classic <b>G-address</b>. A Passkey <b>C-address</b> is the secure smart-wallet identity; it does not automatically contain your old wallet history.</p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/evidence')}
          className="evidence-link text-accent px-2 py-2 font-semibold flex items-center justify-center gap-2"
        >
          <ShieldCheck size={20} />
          View Live Testnet Evidence
          <ArrowUpRight size={16} />
        </button>
        <p className="text-[11px] leading-relaxed text-gray-500 px-2">A live signal requires at least 5 non-bootstrap payments spanning 7 days. New or Friendbot-only accounts open the clearly-labelled sample walkthrough instead.</p>
        </div>
      </div>
    </motion.div>
  );
};
