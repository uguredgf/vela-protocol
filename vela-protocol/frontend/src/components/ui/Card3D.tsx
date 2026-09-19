import React, { useState } from 'react';

export const Card3D: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  const [transform, setTransform] = useState('perspective(1200px) rotateX(0deg) rotateY(0deg)');
  return (
    <div
      className={`card-3d ${className}`}
      style={{ transform }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        setTransform(`perspective(1200px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg)`);
      }}
      onPointerLeave={() => setTransform('perspective(1200px) rotateX(0deg) rotateY(0deg)')}
    >
      {children}
    </div>
  );
};
