import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { VelaOracle } from './VelaOracle';

const routeMessages: Record<string, { eyebrow: string; message: string }> = {
  '/': { eyebrow: 'Vela guide', message: 'Choose a secure way in' },
  '/score': { eyebrow: 'Signal scan', message: 'Reading real Stellar activity' },
  '/proof': { eyebrow: 'Privacy layer', message: 'Preparing your local commitment' },
  '/position': { eyebrow: 'Gatekeeper', message: 'Preparing a collateral-supply preview' },
  '/anchor': { eyebrow: 'Local rail', message: 'Connecting the Anchor sandbox' },
  '/transparency': { eyebrow: 'Session receipt', message: 'Live, local and sandbox steps separated' },
  '/evidence': { eyebrow: 'Evidence desk', message: 'Live links with explicit limitations' },
};

export const VelaGuide: React.FC = () => {
  const { pathname } = useLocation();
  const { score, guidedDemo, proofGenerated, position, anchorTransactions } = useStore();
  if (pathname === '/') return null;
  const routeCopy = routeMessages[pathname] || routeMessages['/'];
  const transferComplete = anchorTransactions.some(tx => tx.status === 'completed');
  const completion = pathname === '/score' && score !== null ? { eyebrow: guidedDemo ? 'Sample ready' : 'Signal ready', message: guidedDemo ? `${score}/100 · fictional walkthrough` : `${score}/100 · live account read` }
    : pathname === '/proof' && proofGenerated ? { eyebrow: 'Privacy ready', message: 'Commitment prepared locally' }
    : pathname === '/position' && position ? { eyebrow: 'On-chain success', message: 'Blend collateral supply confirmed' }
    : pathname === '/position' && guidedDemo ? { eyebrow: 'Guided sample', message: 'Preview only · no transaction submission' }
    : pathname === '/anchor' && transferComplete ? { eyebrow: 'Rail complete', message: 'Transfer confirmed by Anchor' }
    : null;
  const copy = completion || routeCopy;
  const route = pathname.split('/')[1] || 'login';

  return (
    <motion.aside
      key={pathname}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`vela-guide vela-guide--${route} ${completion ? 'is-complete' : 'is-working'}`}
      role="status"
      aria-label={`${copy.eyebrow}: ${copy.message}`}
    >
      <VelaOracle active={!completion} complete={!!completion} />
      <div className="vela-guide__copy">
        <span>{copy.eyebrow}</span>
        <strong>{copy.message}</strong>
      </div>
    </motion.aside>
  );
};
