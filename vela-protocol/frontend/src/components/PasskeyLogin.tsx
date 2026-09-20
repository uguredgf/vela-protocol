import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { assertPasskeyEnvironment, createWallet, connectWallet } from '../services/passkey';
import { bindClassicAccount, createFundedClassicAccount, PENDING_DEPLOY_SOURCE_KEY, provisionClassicAccount, restorePendingClassicAccount } from '../services/classicAccount';
import { connectFreighter } from '../services/freighter';
import { ArrowUpRight, Fingerprint, ShieldCheck, Wallet } from 'lucide-react';
import { ProtocolCore } from './ui/ProtocolCore';
import { StatefulAction } from './ui/StatefulAction';

export const PasskeyLogin: React.FC = () => {
  const { setAuth, setFreighterAuth, isAuthenticated, classicAccount } = useStore();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
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
    setIsConnecting(true);
    setError(null);
    try {
      assertPasskeyEnvironment();
      const deployer = restorePendingClassicAccount() || await createFundedClassicAccount();
      sessionStorage.setItem(PENDING_DEPLOY_SOURCE_KEY, deployer.secret!);
      const wallet = await createWallet(deployer.secret!);
      const classic = bindClassicAccount(wallet.address, deployer);
      sessionStorage.removeItem(PENDING_DEPLOY_SOURCE_KEY);
      setAuth(wallet.address, classic);
      navigate('/score');
    } catch (e) {
      console.error(e);
      setError(loginError(e));
    }
    setIsConnecting(false);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      assertPasskeyEnvironment();
      const wallet = await connectWallet();
      const classic = await provisionClassicAccount(wallet.address);
      setAuth(wallet.address, classic);
      navigate('/score');
    } catch (e) {
      console.error(e);
      setError(loginError(e));
    }
    setIsConnecting(false);
  };

  const handleFreighter = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const publicKey = await connectFreighter();
      setFreighterAuth(publicKey);
      navigate('/score');
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Freighter connection failed');
    } finally {
      setIsConnecting(false);
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
          <div className="text-left">
            <p className="font-semibold">Choose a secure entry</p>
            <p className="text-xs text-gray-500 mt-0.5">Passkey secures entry; MVP protocol calls use a session-scoped testnet G-account.</p>
          </div>
          <span className="status-badge">MVP</span>
        </div>
        {error && <p role="alert" className="text-red-400 text-sm">{error}</p>}
        {isAuthenticated && classicAccount && (
          <button type="button" onClick={() => navigate('/score')}
            className="bg-accent hover:bg-accent/80 text-white p-4 rounded-lg font-semibold">
            Continue Current Session
          </button>
        )}
        <StatefulAction
          onClick={handleCreate}
          disabled={isConnecting}
          state={isConnecting ? 'working' : 'idle'}
          workingLabel="Preparing secure entry…"
          icon={<Fingerprint size={20} />}
          className="primary-action bg-accent text-white p-4 rounded-xl font-semibold"
        >
          Create Passkey
        </StatefulAction>
        
        <StatefulAction
          onClick={handleConnect}
          disabled={isConnecting}
          state={isConnecting ? 'working' : 'idle'}
          workingLabel="Connecting passkey…"
          icon={<Fingerprint size={20} />}
          className="secondary-action bg-surface border border-white/10 p-4 rounded-xl font-semibold"
        >
          Connect Passkey
        </StatefulAction>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">or</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          onClick={handleFreighter}
          disabled={isConnecting}
          className="secondary-action bg-surface hover:bg-surface/80 border border-white/10 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Wallet size={20} />
          Connect Freighter
        </button>

        <button
          type="button"
          onClick={() => navigate('/evidence')}
          className="evidence-link text-accent px-2 py-2 font-semibold flex items-center justify-center gap-2"
        >
          <ShieldCheck size={20} />
          View Live Testnet Evidence
          <ArrowUpRight size={16} />
        </button>
        <p className="text-[11px] leading-relaxed text-gray-500 px-2">A signal requires at least 5 non-bootstrap payments spanning 7 days. New or Friendbot-only accounts return “insufficient history,” not a score.</p>
        </div>
      </div>
    </motion.div>
  );
};
