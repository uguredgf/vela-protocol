import React from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const routeMessages: Record<string, { eyebrow: string; message: string }> = {
  '/': { eyebrow: 'Vela guide', message: 'Choose a secure way in' },
  '/score': { eyebrow: 'Signal scan', message: 'Reading real Stellar activity' },
  '/proof': { eyebrow: 'Privacy layer', message: 'Preparing your local commitment' },
  '/position': { eyebrow: 'Gatekeeper', message: 'Routing qualified collateral' },
  '/anchor': { eyebrow: 'Local rail', message: 'Connecting the Anchor sandbox' },
  '/transparency': { eyebrow: 'Audit view', message: 'Every boundary stays visible' },
  '/evidence': { eyebrow: 'Proof desk', message: 'Live links, no simulated claims' },
};

export const VelaGuide: React.FC = () => {
  const { pathname } = useLocation();
  const copy = routeMessages[pathname] || routeMessages['/'];

  return (
    <motion.aside
      key={pathname}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="vela-guide"
      role="status"
      aria-label={`${copy.eyebrow}: ${copy.message}`}
    >
      <img className="vela-guide__mascot" src="/vela-mascot.png" alt="" aria-hidden="true" />
      <div className="vela-guide__copy">
        <span>{copy.eyebrow}</span>
        <strong>{copy.message}</strong>
      </div>
    </motion.aside>
  );
};
