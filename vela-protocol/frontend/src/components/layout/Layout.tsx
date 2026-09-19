import React from 'react';
import { Stepper } from './Stepper';
import { useStore } from '../../store/useStore';
import { AnimatedBackground } from '../ui/AnimatedBackground';
import { ProtocolCore } from '../ui/ProtocolCore';
import { VelaGuide } from '../ui/VelaGuide';
import { useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { walletAddress, classicAccount } = useStore();
  const location = useLocation();
  const displayAddress = walletAddress || classicAccount?.publicKey;

  return (
    <AnimatedBackground className={`page-${location.pathname.split('/')[1] || 'login'} min-h-screen flex flex-col font-sans`}>
      <header className="app-header w-full px-5 md:px-8 py-3 sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ProtocolCore />
          <div>
            <span className="block text-lg font-bold tracking-tight text-ink">Vela Protocol</span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.2em] text-gray-500">Private risk signal · Stellar testnet</span>
          </div>
        </div>
        {displayAddress && (
          <div className="wallet-pill flex items-center gap-2 text-xs sm:text-sm px-3 py-2 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
            {displayAddress.substring(0, 6)}...{displayAddress.substring(displayAddress.length - 4)}
          </div>
        )}
      </header>
      
      <main className="flex-1 flex flex-col px-4 py-5 md:px-8 md:py-6 max-w-5xl mx-auto w-full gap-6">
        {location.pathname !== '/evidence' && <Stepper />}
        <VelaGuide />
        <div className="flex-1 route-shell">
          {children}
        </div>
      </main>
    </AnimatedBackground>
  );
};
