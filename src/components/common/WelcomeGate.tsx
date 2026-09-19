import React, { useEffect, useRef, useState } from 'react';
import { Bot, Sparkles, UserRound, ArrowLeft } from 'lucide-react';
import { SilanehLogo } from './SilanehLogo';
import { Typewriter } from './Typewriter';
import { registerUser, StoredUser } from '../../lib/user';

interface WelcomeGateProps {
  onComplete: (user: StoredUser) => void;
}

type Step = 'loading' | 'intro' | 'ask' | 'done';

const WELCOME_TYPING = 'به هوشا خوش آمدید تا لحظاتی دیگر وارد می‌شوید';

const HELLO_LINES = [
  'سلام! من هوشا هستم، دستیار هوشمند و تخصصی غربالگری و تحلیل رزومه‌ها در هلدینگ سیلانه سبز.',
  'خوشحالم که در فرآیند استخدام، کشف شایستگی‌ها و تصمیم‌گیری دقیق در کنارتان هستم.',
];

/**
 * First-visit experience:
 * 1. Branded loading screen with logo and typing animation:
 *    «به هوشا خوش آمدید تا لحظاتی دیگر وارد می‌شوید»
 * 2. Hosha introduces itself and asks the user's name.
 * 3. Persists identity to localStorage so this onboarding only appears on the very first visit.
 */
export const WelcomeGate: React.FC<WelcomeGateProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('loading');
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

  // When initial typing completes, transition smoothly to Hosha's introduction
  const handleLoadingDone = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      setStep('intro');
    }, 700);
  };

  // Fallback watchdog: ensure loading never hangs if timer throttled
  useEffect(() => {
    if (step !== 'loading') return;
    const watchdog = setTimeout(() => {
      setStep('intro');
    }, 6000);
    return () => clearTimeout(watchdog);
  }, [step]);

  // When introduction typing finishes, wait briefly then ask for the name
  const handleIntroDone = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => {
      setStep('ask');
    }, 2400);
  };

  // Watchdog for intro step
  useEffect(() => {
    if (step !== 'intro') return;
    const watchdog = setTimeout(() => {
      setStep('ask');
    }, 12000);
    return () => clearTimeout(watchdog);
  }, [step]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const clean = name.trim();
    if (clean.length < 2) {
      setError('لطفاً نام خود را حداقل در ۲ حرف وارد کنید.');
      return;
    }
    const user = registerUser(clean);
    setNewUser(user);
    setError('');
    setStep('done');
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(() => onComplete(user), 1200);
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

  const skipLoading = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setStep('intro');
  };

  const skipIntro = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    setStep('ask');
  };

  return (
    <div
      className="fixed inset-0 z-[115] bg-gradient-to-b from-surface-0 via-surface-1 to-surface-0 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto"
      dir="rtl"
    >
      {/* 1. PROFESSIONAL LOADING SCREEN */}
      {step === 'loading' && (
        <div className="w-full max-w-md flex flex-col items-center gap-6 animate-fadeIn text-center my-auto py-8">
          {/* Logo Card with Neon Glow */}
          <div className="relative p-5 rounded-3xl bg-surface-1/90 border border-brand/25 shadow-[0_12px_40px_-8px_rgba(0,200,123,0.35)] backdrop-blur-md flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-brand/15 blur-xl -z-10 animate-pulse" />
            <SilanehLogo className="h-16 sm:h-20 w-auto" showGlow />
          </div>

          {/* Typing Text Container */}
          <div className="min-h-[38px] flex items-center justify-center px-4">
            <Typewriter
              lines={[WELCOME_TYPING]}
              speed={34}
              startDelay={200}
              className="text-base sm:text-lg font-bold text-text-1 text-center"
              onDone={handleLoadingDone}
            />
          </div>

          {/* Smooth Shimmer Progress Bar */}
          <div className="w-48 h-1.5 bg-surface-2 rounded-full overflow-hidden relative shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-300 via-brand to-brand-dark rounded-full animate-progressShimmer" />
          </div>

          {/* Quick Skip Link */}
          <button
            type="button"
            onClick={skipLoading}
            className="mt-2 text-xs text-text-3 hover:text-brand font-medium transition-colors cursor-pointer"
          >
            ادامه ↵
          </button>
        </div>
      )}

      {/* 2 & 3. WELCOME & NAME STEP */}
      {(step === 'intro' || step === 'ask' || step === 'done') && (
        <div className="w-full max-w-lg flex flex-col items-center gap-5 sm:gap-6 animate-fadeIn my-auto py-6">
          {/* Top Brand Header */}
          <div className="relative p-3.5 rounded-2xl bg-surface-1/90 border border-brand/25 shadow-[0_10px_30px_-5px_rgba(0,200,123,0.25)] backdrop-blur-md flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-brand/10 blur-lg -z-10" />
            <SilanehLogo className="h-14 sm:h-16 w-auto" showGlow />
          </div>

          {/* Hosha Chat Box */}
          <div className="w-full flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-brand-soft border border-brand-200 flex items-center justify-center shrink-0 shadow-xs">
              <SilanehLogo className="h-5 w-auto" />
            </span>
            <div
              onClick={step === 'intro' ? skipIntro : undefined}
              className={`flex-1 bg-surface-1 border border-border-default rounded-card p-4 shadow-e1 min-h-[96px] ${
                step === 'intro' ? 'cursor-pointer' : ''
              }`}
            >
              <div className="text-[11px] font-bold text-brand mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" />
                  هوشا • دستیار هوشمند سیلانه سبز
                </span>
                {step === 'intro' && (
                  <span className="text-[10px] text-text-3 font-normal hover:text-brand">لمس برای رد شدن</span>
                )}
              </div>

              {step === 'intro' && (
                <Typewriter
                  lines={HELLO_LINES}
                  speed={24}
                  className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium"
                  onDone={handleIntroDone}
                />
              )}

              {step === 'ask' && (
                <Typewriter
                  key="ask"
                  lines={['برای شروع کار با هوشا، لطفاً نام شریف خود را وارد کنید:']}
                  speed={22}
                  className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium"
                />
              )}

              {step === 'done' && newUser && (
                <p className="text-xs sm:text-sm text-text-1 leading-relaxed font-bold animate-fadeIn text-brand">
                  خیلی خوشبختم {newUser.name} عزیز! در حال ورود به محیط کاری شما…
                </p>
              )}
            </div>
          </div>

          {step === 'intro' && (
            <button
              type="button"
              onClick={skipIntro}
              className="text-xs text-brand hover:underline font-bold py-1 px-3 cursor-pointer flex items-center gap-1"
            >
              <span>ورود به مرحله نام‌نویسی</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Name input form */}
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
                  placeholder="نام و نام خانوادگی خود را بنویسید…"
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
                شروع کار با هوشا
              </button>
              <button
                type="button"
                onClick={quickStart}
                className="text-xs text-text-3 hover:text-brand font-medium py-1 transition-colors cursor-pointer text-center"
              >
                ورود سریع بدون ثبت نام (همکار سیلانه)
              </button>
              <p className="text-[11px] text-text-3 text-center leading-relaxed">
                این اطلاعات فقط برای اولین بار پرسیده می‌شود تا فضای کاری و بانک رزومه اختصاصی شما ذخیره گردد.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default WelcomeGate;
