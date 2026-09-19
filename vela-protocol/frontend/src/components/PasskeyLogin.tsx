import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { assertPasskeyEnvironment, createWallet, connectWallet } from '../services/passkey';
import { bindClassicAccount, createFundedClassicAccount, PENDING_DEPLOY_SOURCE_KEY, provisionClassicAccount, restorePendingClassicAccount } from '../services/classicAccount';
import { connectFreighter } from '../services/freighter';
import { Fingerprint, Wallet } from 'lucide-react';

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
      className="aurora-stage flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12"
    >
      <div className="w-24 h-24 rounded-full bg-accent/20 flex items-center justify-center mb-6">
        <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center text-3xl font-bold">
          V
        </div>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Welcome to <span className="gradient-text">Vela</span>
      </h1>
      <p className="text-gray-400 mb-12 text-lg">
        AI-powered trust scores, local score commitments, and testnet contract interactions on Stellar.
      </p>

      <div className="glass-panel p-8 w-full max-w-md flex flex-col gap-4">
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
          className="bg-accent hover:bg-accent/80 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Fingerprint size={20} />
          Create Passkey
        </button>
        
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-surface hover:bg-surface/80 border border-white/10 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
          className="bg-surface hover:bg-surface/80 border border-white/10 text-white p-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Wallet size={20} />
          Connect Freighter
        </button>
      </div>
    </motion.div>
  );
};
