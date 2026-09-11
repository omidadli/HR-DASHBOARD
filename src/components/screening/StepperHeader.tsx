import React from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toPersianDigits } from '../../lib/normalizeFa';

export type ScreeningWizardStep = 'home' | 'processing' | 'results';

interface StepperHeaderProps {
  currentStep: ScreeningWizardStep;
  onStepClick?: (step: ScreeningWizardStep) => void;
}

interface StepItem {
  id: ScreeningWizardStep;
  num: number;
  label: string;
  sublabel: string;
}

const STEPS: StepItem[] = [
  { id: 'home', num: 1, label: 'دپارتمان و رزومه‌ها', sublabel: 'انتخاب دپارتمان، سوال‌ها و بارگذاری' },
  { id: 'processing', num: 2, label: 'پردازش و تحلیل', sublabel: 'استخراج، سنجش هوش مصنوعی و کالیبراسیون' },
  { id: 'results', num: 3, label: 'نتایج و اولویت‌بندی', sublabel: 'دسته‌بندی، کارنامه‌ها و بانک رزومه' },
];

export const StepperHeader: React.FC<StepperHeaderProps> = ({ currentStep, onStepClick }) => {
  const stepIndex = currentStep === 'home' ? 0 : currentStep === 'processing' ? 1 : 2;

  return (
    <div className="w-full bg-surface-1 border-b border-border-default py-3 px-4 no-print">
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {STEPS.map((step, idx) => {
          const isDone = idx < stepIndex;
          const isActive = idx === stepIndex;
          const isPending = idx > stepIndex;

          const isClickable = isDone && onStepClick && step.id === 'home';

          return (
            <React.Fragment key={step.id}>
              {/* Step indicator button/element */}
              <div
                onClick={() => {
                  if (isClickable) onStepClick(step.id);
                }}
                className={`flex items-center gap-2.5 transition-all select-none ${
                  isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-control flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                    isDone
                      ? 'bg-brand text-white shadow-xs'
                      : isActive
                      ? 'bg-brand-soft text-brand border border-brand/40 ring-2 ring-brand/15'
                      : 'bg-surface-2 text-text-3 border border-border-default'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-4 h-4" strokeWidth={2.5} />
                  ) : isActive && currentStep === 'processing' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-brand" />
                  ) : (
                    <span>{toPersianDigits(step.num)}</span>
                  )}
                </div>

                <div className="hidden sm:flex flex-col text-right">
                  <span
                    className={`text-xs font-bold leading-tight ${
                      isActive ? 'text-brand' : isDone ? 'text-text-1' : 'text-text-3'
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="text-[11px] text-text-3 leading-tight mt-0.5 max-w-[140px] truncate">
                    {step.sublabel}
                  </span>
                </div>

                {/* Mobile-only short label */}
                <span
                  className={`sm:hidden text-xs font-bold leading-tight ${
                    isActive ? 'text-brand' : isDone ? 'text-text-1' : 'text-text-3'
                  }`}
                >
                  {step.label.split(' ')[0]}
                </span>
              </div>

              {/* Connecting line */}
              {idx < STEPS.length - 1 && (
                <div className="flex-1 h-[2px] mx-1 sm:mx-3 rounded-full bg-border-default overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      idx < stepIndex ? 'bg-brand w-full' : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
