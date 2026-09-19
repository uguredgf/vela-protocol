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
        <path className="protocol-core__depth" d="M9.5 11.5h10L29 31l-4.1 8.1c-.6 1.3-2.5 1.3-3.1 0L9.5 11.5Zm12.7 0h18L30.3 31l-8.1-19.5Z" />
        <path className="protocol-core__sail protocol-core__sail--left" d="M7 8.5h11.2l10.3 21.8-4.6 9c-.7 1.4-2.7 1.4-3.4 0L7 8.5Z" fill={`url(#${gradientId})`} />
        <path className="protocol-core__sail protocol-core__sail--right" d="M20.7 8.5H42L29.8 30.2 20.7 8.5Z" />
        <path className="protocol-core__fold" d="m18.2 8.5 11.6 21.7-5.9 9.1c-.7 1.3-2.7 1.4-3.4 0l4.1-9L14.2 8.5h4Z" />
        <path className="protocol-core__edge" d="M7 8.5h11.2M20.7 8.5H42" />
      </svg>
    </div>
  );
};
