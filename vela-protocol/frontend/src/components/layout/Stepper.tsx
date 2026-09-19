import React from 'react';
import { useStore } from '../../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Anchor, BarChart3, Check, CircleDollarSign, Fingerprint, LockKeyhole, ShieldCheck } from 'lucide-react';

const steps = [
  { path: '/', label: 'Login', icon: Fingerprint },
  { path: '/score', label: 'Score', icon: BarChart3 },
  { path: '/proof', label: 'Commitment', icon: LockKeyhole },
  { path: '/position', label: 'Supply', icon: CircleDollarSign },
  { path: '/anchor', label: 'Transfer', icon: Anchor },
  { path: '/transparency', label: 'Receipt', icon: ShieldCheck }
];

export const Stepper: React.FC = () => {
  const navigate = useNavigate();
  const { currentStep, score, proofGenerated, position, anchorTransactions } = useStore();
  const transferCompleted = anchorTransactions.some(tx => tx.status === 'completed');
  const completedSteps = [currentStep > 0, score !== null, proofGenerated, !!position, transferCompleted, false];

  return (
    <nav className="stepper-shell w-full" aria-label="Vela journey">
      <div className="journey-mobile md:hidden">
        <span className="journey-mobile__count">Step {currentStep + 1} of {steps.length}</span>
        <span className="journey-mobile__name">{steps[currentStep].label}</span>
        <div className="journey-mobile__progress"><span style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} /></div>
      </div>
      <div className="stepper-track hidden md:flex items-start w-full px-2">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep && completedSteps[index];
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
              <span className={`text-[10px] uppercase tracking-[0.12em] mt-2 ${isCurrent ? 'text-accent font-semibold' : 'text-gray-400'}`}>
                {step.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`stepper-connector ${isCompleted ? 'is-complete' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
};
