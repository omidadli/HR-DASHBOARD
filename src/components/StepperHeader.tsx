import React from 'react';
import { CheckCircle2, FileText, Cpu, Award } from 'lucide-react';

interface StepperHeaderProps {
  currentStep: 'start' | 'processing' | 'results';
}

export const StepperHeader: React.FC<StepperHeaderProps> = ({ currentStep }) => {
  const steps = [
    { key: 'start', label: '۱. شغل و رزومه‌ها', icon: FileText },
    { key: 'processing', label: '۲. بررسی هوشمند', icon: Cpu },
    { key: 'results', label: '۳. نتایج و رتبه‌بندی', icon: Award },
  ] as const;

  const getStepIndex = (step: string) => {
    if (step === 'start') return 0;
    if (step === 'processing') return 1;
    return 2;
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <nav aria-label="مراحل غربالگری" className="w-full bg-surface-1 border-b border-border-default px-4 py-3 sm:py-4 select-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentIndex;
          const isCompleted = idx < currentIndex;

          return (
            <React.Fragment key={step.key}>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : isActive
                      ? 'bg-brand text-white ring-4 ring-brand/15 shadow-sm'
                      : 'bg-surface-2 text-text-3 border border-border-default'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
                </div>

                <span
                  className={`text-xs sm:text-sm font-bold whitespace-nowrap hidden xs:inline-block ${
                    isActive ? 'text-text-1 font-black' : isCompleted ? 'text-text-2' : 'text-text-3'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 rounded-full transition-colors ${
                    idx < currentIndex ? 'bg-emerald-500' : 'bg-surface-2'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
};
