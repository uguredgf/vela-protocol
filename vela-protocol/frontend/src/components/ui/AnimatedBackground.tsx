import React from 'react';

export const AnimatedBackground: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`animated-bg ${className}`}>
    <div className="ambient-orb ambient-orb--lavender" />
    <div className="ambient-orb ambient-orb--sage" />
    <div className="ambient-orb ambient-orb--blue" />
    <div className="animated-bg__beam animated-bg__beam--one" />
    <div className="animated-bg__beam animated-bg__beam--two" />
    <div className="animated-bg__grid" />
    <div className="animated-bg__veil" />
    <div className="relative z-[1]">{children}</div>
  </div>
);
