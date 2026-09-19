import React from 'react';

export const VelaOracle: React.FC<{ active?: boolean; complete?: boolean; className?: string }> = ({ active = false, complete = false, className = '' }) => (
  <div className={`vela-oracle ${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''} ${className}`} aria-hidden="true">
    <svg viewBox="0 0 96 96" role="presentation">
      <circle className="vela-oracle__halo" cx="48" cy="48" r="42" />
      <circle className="vela-oracle__beads" cx="48" cy="48" r="35" />
      <path className="vela-oracle__arch" d="M24 67V43c0-16 10-27 24-27s24 11 24 27v24" />
      <path className="vela-oracle__laurel" d="M22 60c-8-8-9-20-4-30m4 4-8-2m6 10-8 1m10 8-7 4M74 60c8-8 9-20 4-30m-4 4 8-2m-6 10 8 1m-10 8 7 4" />
      <path className="vela-oracle__v" d="m34 34 13 29c.4.9 1.7.9 2.1 0L62 34 48 45 34 34Z" />
      <circle className="vela-oracle__signal" cx="48" cy="28" r="3" />
      <path className="vela-oracle__base" d="M29 72h38M34 78h28" />
    </svg>
  </div>
);
