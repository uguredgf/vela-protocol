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
            <stop stopColor="#8B83D7" />
            <stop offset=".55" stopColor="#655DB0" />
            <stop offset="1" stopColor="#2E8B75" />
          </linearGradient>
        </defs>
        <circle className="protocol-core__signal" cx="24" cy="24" r="21" />
        <path className="protocol-core__shell" d="M24 3.5 42 14v20L24 44.5 6 34V14L24 3.5Z" fill={`url(#${gradientId})`} />
        <path className="protocol-core__sail" d="m14.5 14.5 8.9 21.2c.3.8 1.4.8 1.8.1l9.1-21.3-10.1 8.2-9.7-8.2Z" />
        <path className="protocol-core__wake" d="M17 31.8c4.8 2.1 9.5 2.1 14.2-.1" />
        <circle className="protocol-core__star" cx="35.7" cy="10.8" r="2.2" />
        <circle className="protocol-core__node" cx="24" cy="3" r="1.7" />
      </svg>
    </div>
  );
};
