import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { assertPasskeyEnvironment, createWallet, connectWallet } from '../services/passkey';
import { bindClassicAccount, createFundedClassicAccount, PENDING_DEPLOY_SOURCE_KEY, provisionClassicAccount, restorePendingClassicAccount } from '../services/classicAccount';
import { connectFreighter } from '../services/freighter';
import { Fingerprint, ShieldCheck, Wallet } from 'lucide-react';
import { ProtocolCore } from './ui/ProtocolCore';
import { VelaOracle } from './ui/VelaOracle';

export const PasskeyLogin: React.FC = () => {
  const { setAuth, setFreighterAuth, isAuthenticated, classicAccount } = useStore();
  const navigate = useNavigate();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loginError = (e: unknown): string => {
    const error = e as { message?: string; code?: string; cause?: unknown };
    const cause = error?.cause as { message?: string; code?: string; name?: string } | undefined;
    const detail = cause?.message || (cause?.name && cause.name !== error?.message ? cause.name : undefined);
    const code = error?.code || cause?.code;
    if (e instanceof DOMException && e.name === 'NotAllowedError') {
      return 'Passkey prompt was cancelled, denied, or timed out. Use Chrome/Edge on the same host where the passkey was created (127.0.0.1 and localhost are different), then approve the browser prompt.';
    }
    if (e instanceof DOMException && e.name === 'InvalidStateError') {
      return 'This passkey is already registered here. Use Connect Passkey instead.';
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
      className="aurora-stage flex flex-col items-center justify-center text-center max-w-5xl mx-auto py-4 md:py-6"
    >
      <div className="hero-layout w-full">
        <div className="hero-copy-glass">
          <div className={`login-identity-flow mb-5 ${isConnecting ? 'is-working' : isAuthenticated ? 'is-ready' : ''}`}>
            <div className="hero-mark"><ProtocolCore variant="hero" active={isConnecting} /></div>
            <div className="login-identity-flow__line"><span /><span /><span /></div>
            <div className="login-identity-flow__labels"><span>Passkey</span><span>Stellar account</span><span>Private signal</span></div>
            <VelaOracle className="login-oracle" active={isConnecting} complete={isAuthenticated} />
          </div>
          <div className="eyebrow mb-4">
            <span className="eyebrow__dot" /> Verified on Stellar testnet
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-5 tracking-[-0.04em] leading-[1.02]">
            Credit signals with<br className="hidden sm:block" /> <span className="gradient-text">privacy built in.</span>
          </h1>
          <p className="text-gray-400 mb-7 text-base md:text-lg max-w-2xl leading-relaxed">
            Turn real Stellar activity into an explainable risk signal, bind subsidies to verified identities, and route collateral through Blend v2.
          </p>

          <div className="grid grid-cols-3 gap-2 md:gap-3 w-full">
            <div className="metric-chip"><strong>AI</strong><span>Explainable score</span></div>
            <div className="metric-chip"><strong>1:1</strong><span>Identity bound</span></div>
            <div className="metric-chip"><strong>Live</strong><span>Testnet proof</span></div>
          </div>
        </div>

        <div className="glass-panel login-panel p-5 md:p-7 w-full flex flex-col gap-3">
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="text-left">
            <p className="font-semibold">Choose a secure entry</p>
            <p className="text-xs text-gray-500 mt-0.5">No password. Your signing method stays yours.</p>
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
        <button
          onClick={handleCreate}
          disabled={isConnecting}
          className="primary-action bg-accent hover:bg-accent/80 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Fingerprint size={20} />
          Create Passkey
        </button>
        
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="secondary-action bg-surface hover:bg-surface/80 border border-white/10 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Fingerprint size={20} />
          Connect Passkey
        </button>

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
          className="border border-accent/40 bg-accent/10 hover:bg-accent/20 text-accent p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          <ShieldCheck size={20} />
          View Live Testnet Evidence
        </button>
        </div>
      </div>
    </motion.div>
  );
};
