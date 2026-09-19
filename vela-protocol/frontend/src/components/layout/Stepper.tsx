import React from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Anchor, BarChart3, Check, CircleDollarSign, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';

const steps = [
  { path: '/', label: 'Login', icon: Fingerprint },
  { path: '/score', label: 'Score', icon: BarChart3 },
  { path: '/proof', label: 'Proof', icon: LockKeyhole },
  { path: '/position', label: 'Position', icon: CircleDollarSign },
  { path: '/anchor', label: 'Transfer', icon: Anchor },
  { path: '/transparency', label: 'Audit', icon: ShieldCheck }
];

export const Stepper: React.FC = () => {
  const navigate = useNavigate();
  const currentStep = useStore(state => state.currentStep);
  const transferCompleted = useStore(state => state.anchorTransactions.some(tx => tx.status === 'completed'));

  return (
    <div className="stepper-shell w-full mb-8 overflow-x-auto pb-4">
      <div className="stepper-track flex items-start w-full min-w-[680px] px-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep && (index !== 4 || transferCompleted);
          const isCurrent = index === currentStep;

          return (
            <div key={step.path} className="stepper-item flex flex-col items-center relative">
              <div
                className={`stepper-node w-10 h-10 rounded-full flex items-center justify-center font-bold z-10 transition-colors cursor-pointer ${
                  isCompleted ? 'bg-success text-white' :
                  isCurrent ? 'bg-accent text-white ring-4 ring-accent/20' : 'bg-surface text-gray-500'
                }`}
                onClick={() => {
                  if (index <= currentStep) navigate(step.path);
                }}
              >
                {isCompleted ? <Check size={17} strokeWidth={3} /> : <step.icon size={17} />}
              </div>
              <span className={`text-[11px] uppercase tracking-[0.12em] mt-2 ${isCurrent ? 'text-accent font-semibold' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`stepper-connector ${isCompleted ? 'is-complete' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
