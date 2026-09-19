import React from 'react';
import { Stepper } from './Stepper';
import { useStore } from '../../store/useStore';
import { AnimatedBackground } from '../ui/AnimatedBackground';
import { ProtocolCore } from '../ui/ProtocolCore';
import { useLocation } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { walletAddress, classicAccount } = useStore();
  const location = useLocation();
  const displayAddress = walletAddress || classicAccount?.publicKey;

  return (
    <AnimatedBackground className="min-h-screen flex flex-col font-sans">
      <header className="w-full px-5 py-3 border-b border-white/10 glass-panel sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ProtocolCore />
          <div>
            <span className="block text-lg font-bold tracking-tight gradient-text">Vela Protocol</span>
            <span className="hidden sm:block text-[10px] uppercase tracking-[0.24em] text-gray-500">Private credit layer</span>
          </div>
        </div>
        {displayAddress && (
          <div className="flex items-center gap-2 text-xs sm:text-sm bg-surface/80 px-3 py-2 rounded-full border border-white/10 shadow-inner shadow-white/[0.03]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
            {displayAddress.substring(0, 6)}...{displayAddress.substring(displayAddress.length - 4)}
          </div>
        )}
      </header>
      
      <main className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full gap-8">
        {location.pathname !== '/evidence' && <Stepper />}
        <div className="flex-1">
          {children}
        </div>
      </main>
    </AnimatedBackground>
  );
};
