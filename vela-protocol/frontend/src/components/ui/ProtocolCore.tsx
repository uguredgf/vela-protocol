import React, { useId } from 'react';
import { useLocation } from 'react-router-dom';

export const ProtocolCore: React.FC<{ variant?: 'header' | 'hero'; active?: boolean }> = ({ variant = 'header', active = false }) => {
  const gradientId = useId().replace(/:/g, '');
  const { pathname } = useLocation();
  const route = pathname.split('/')[1] || 'login';
  return (
    <div className={`protocol-core protocol-core--${variant} protocol-core--${route} ${active ? 'is-active' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" role="presentation">
        <defs>
          <linearGradient id={gradientId} x1="9" y1="5" x2="39" y2="43" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7A2938" />
            <stop offset=".55" stopColor="#A56F42" />
            <stop offset="1" stopColor="#1D5660" />
          </linearGradient>
        </defs>
        <circle className="protocol-core__signal" cx="24" cy="24" r="20" />
        <path className="protocol-core__sail protocol-core__sail--left" d="M8 10.5 21.4 38c.8 1.7 3.2 1.7 4 0l3.2-6.6L17.7 10.5H8Z" fill={`url(#${gradientId})`} />
        <path className="protocol-core__sail protocol-core__sail--right" d="M21 10.5h19L29.8 30.2 21 10.5Z" />
        <path className="protocol-core__wake" d="M14 40c6.4 2.4 13.2 2.4 20 0" />
        <circle className="protocol-core__node" cx="39" cy="8" r="2.4" />
      </svg>
    </div>
  );
};
