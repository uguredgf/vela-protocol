import React from 'react';
import { Check, LoaderCircle } from 'lucide-react';

type ActionState = 'idle' | 'working' | 'success';

type StatefulActionProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  state?: ActionState;
  workingLabel?: string;
  successLabel?: string;
  icon?: React.ReactNode;
};

export const StatefulAction: React.FC<StatefulActionProps> = ({
  state = 'idle',
  workingLabel = 'Working…',
  successLabel = 'Confirmed',
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => (
  <button
    {...props}
    disabled={disabled || state === 'working'}
    aria-busy={state === 'working'}
    className={`stateful-action ${state === 'success' ? 'is-success' : ''} ${className}`}
  >
    <span className="stateful-action__content">
      {state === 'working' ? <LoaderCircle className="animate-spin" size={18} /> : state === 'success' ? <Check size={18} strokeWidth={3} /> : icon}
      <span>{state === 'working' ? workingLabel : state === 'success' ? successLabel : children}</span>
    </span>
  </button>
);
