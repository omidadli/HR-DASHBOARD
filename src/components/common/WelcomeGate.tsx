import React, { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, UserRound } from 'lucide-react';
import { SilanehLogo } from './SilanehLogo';
import { Typewriter } from './Typewriter';
import { registerUser, StoredUser } from '../../lib/user';

interface WelcomeGateProps {
  onComplete: (user: StoredUser) => void;
}

type Step = 'hello' | 'ask' | 'done';

const HELLO_LINES = [
  'سلام! خوش آمدید؛ خوشحالم که اینجا می‌بینمتون.',
  'من هوشا هستم — یک دستیار هوشمند که بهتون در غربالگری رزومه‌ها کمک می‌کنم.',
];

/**
 * First-visit gate: هوشا types a welcome, holds it for 3 seconds, then asks
 * the user's name and registers a unique id for them (design-system matched).
 */
export const WelcomeGate: React.FC<WelcomeGateProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('hello');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState<StoredUser | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    []
  );

  // Typing finished → hold 3 seconds → ask the name.
  const handleHelloDone = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => setStep('ask'), 3000);
  };

  /**
   * This overlay is the only way in for a first-time visitor, so it must never
   * depend on the typing animation completing. If the greeting has not finished
   * within 12s (background tab, throttled timers, an aborted animation) the
   * name form is shown anyway instead of leaving the user locked out.
   */
  useEffect(() => {
    if (step !== 'hello') return;
    const watchdog = setTimeout(() => setStep('ask'), 12000);
    return () => clearTimeout(watchdog);
  }, [step]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      setError('اسم باید حداقل ۲ حرف باشد.');
      return;
    }
    const user = registerUser(clean);
    setNewUser(user);
    setError('');
    setStep('done');
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => onComplete(user), 1400);
  };

  const canSubmit = name.trim().length >= 2;

  const quickStart = () => {
    const user = registerUser('همکار گرامی');
    setNewUser(user);
    setError('');
    setStep('done');
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => onComplete(user), 600);
  };

  const skipGreeting = () => {
    if (step === 'hello') {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      setStep('ask');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[115] bg-gradient-to-b from-surface-0 to-surface-1 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
      dir="rtl"
    >
      <div className="w-full max-w-lg flex flex-col items-center gap-5 sm:gap-6 animate-fadeIn my-auto py-6">
        {/* Brand block — same visual language as the splash screen */}
        <div className="relative p-3 rounded-2xl bg-surface-1/90 border border-brand/25 shadow-[0_10px_30px_-5px_rgba(0,200,123,0.3)] backdrop-blur-md flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-brand/10 blur-lg -z-10" />
          <SilanehLogo className="h-14 sm:h-16 w-auto" showGlow />
        </div>

        {/* هوشا chat bubble */}
        <div className="w-full flex items-start gap-3">
          <span className="w-10 h-10 rounded-full bg-brand-soft border border-brand-200 flex items-center justify-center shrink-0 shadow-xs">
            <SilanehLogo className="h-5 w-auto" />
          </span>
          <div
            onClick={skipGreeting}
            className="flex-1 bg-surface-1 border border-border-default rounded-card p-4 shadow-e1 min-h-[92px] cursor-pointer"
          >
            <div className="text-[11px] font-bold text-brand mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                هوشا
              </span>
              {step === 'hello' && (
                <span className="text-[10px] text-text-3 font-normal">لمس برای رد شدن</span>
              )}
            </div>
            {step === 'hello' && (
              <Typewriter
                lines={HELLO_LINES}
                speed={24}
                className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium"
                onDone={handleHelloDone}
              />
            )}
            {step === 'ask' && (
              <Typewriter
                key="ask"
                lines={['میتونم اسم شما رو بدونم؟']}
                speed={24}
                className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium"
              />
            )}
            {step === 'done' && newUser && (
              <p className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium animate-fadeIn">
                خیلی خوشبختم {newUser.name}! بریم شروع کنیم.
              </p>
            )}
          </div>
        </div>

        {step === 'hello' && (
          <button
            type="button"
            onClick={skipGreeting}
            className="text-xs text-brand hover:underline font-bold py-1 px-3 cursor-pointer"
          >
            رد شدن از مقدمه و ورود ↵
          </button>
        )}

        {/* Name form */}
        {step === 'ask' && (
          <form onSubmit={submit} className="w-full flex flex-col gap-3 animate-fadeIn">
            <div className="relative">
              <UserRound className="w-4 h-4 text-text-3 absolute right-3.5 top-3.5" />
              <input
                autoFocus
                type="text"
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                placeholder="اسم شما…"
                className="w-full pr-10 pl-4 py-3 rounded-control bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-base sm:text-sm font-bold placeholder:text-text-3 shadow-xs"
              />
            </div>
            {error && <span className="text-xs font-bold text-danger">{error}</span>}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 px-8 rounded-control text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                canSubmit
                  ? 'bg-brand btn-neon-glass text-white cursor-pointer shadow-neon active:scale-[0.99]'
                  : 'bg-surface-2 text-text-3 border border-border-default cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              شروع کنیم
            </button>
            <button
              type="button"
              onClick={quickStart}
              className="text-xs text-text-3 hover:text-brand font-medium py-1 transition-colors cursor-pointer"
            >
              ورود سریع بدون ثبت نام (همکار سیلانه)
            </button>
            <p className="text-[11px] text-text-3 text-center leading-relaxed">
              اسم شما فقط روی همین دستگاه نگهداری می‌شود تا سوابق غربالگری و بانک رزومه‌تان جدا از بقیه بماند.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
