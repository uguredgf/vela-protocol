import React, { useEffect, useState } from 'react';
import { Check, LoaderCircle } from 'lucide-react';

export const MultiStepLoader: React.FC<{ steps: string[]; active: boolean }> = ({ steps, active }) => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (!active) { setCurrent(0); return; }
    const timer = window.setInterval(() => setCurrent(value => Math.min(value + 1, steps.length - 1)), 1200);
    return () => window.clearInterval(timer);
  }, [active, steps.length]);
  if (!active) return null;
  return (
    <div className="multi-step-loader" aria-live="polite">
      {steps.map((step, index) => (
        <div key={step} className={index <= current ? 'multi-step-loader__step is-active' : 'multi-step-loader__step'}>
          <span className="multi-step-loader__icon">{index < current ? <Check size={14} /> : index === current ? <LoaderCircle size={14} className="animate-spin" /> : index + 1}</span>
          <span>{step}</span>
        </div>
      ))}
    </div>
  );
};
