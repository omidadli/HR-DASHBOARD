import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Bot } from 'lucide-react';
import { SilanehLogo } from './SilanehLogo';
import { Typewriter } from './Typewriter';
import { timeGreeting } from '../../lib/user';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
  /** Returning user's first name — هوشا greets them by name (typed). */
  userName?: string | null;
  /**
   * Absolute upper bound. The splash is a full-screen overlay, so if the
   * typed greeting ever fails to finish the app would be invisible forever.
   */
  maxDurationMs?: number;
}

/**
 * Splash / greeting overlay.
 *
 * It used to depend on a chain of timers that lived in a shared array which a
 * *different* effect cleared on every re-render — so any parent re-render
 * during the greeting cancelled the dismissal and the app stayed hidden behind
 * the overlay. Dismissal is now idempotent, driven by one mount-time watchdog,
 * and the overlay can always be skipped with a tap.
 */
export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 600,
  userName,
  maxDurationMs = 6000,
}) => {
  const [fading, setFading] = useState(false);
  const [typedDone, setTypedDone] = useState(!userName);

  // Always the latest callback without becoming an effect dependency.
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setFading(true);
    // Let the fade start, then hand control back to the app.
    setTimeout(() => completeRef.current(), 200);
  }, []);

  // Mount-only: watchdog + the no-user fast path.
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      if (!doneRef.current) {
        doneRef.current = true;
        completeRef.current();
      }
      return;
    }

    // Hard guarantee: the overlay can never outlive this budget.
    const watchdog = setTimeout(finish, maxDurationMs);
    const shortTimer = userName ? undefined : setTimeout(finish, durationMs);

    return () => {
      clearTimeout(watchdog);
      if (shortTimer) clearTimeout(shortTimer);
    };
    // Intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Greeting fully typed → brief hold → finish (still bounded by the watchdog).
  useEffect(() => {
    if (!typedDone || !userName || doneRef.current) return;
    const hold = setTimeout(finish, 900);
    return () => clearTimeout(hold);
  }, [typedDone, userName, finish]);

  return (
    <div
      onClick={finish}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') finish();
      }}
      aria-label="رد کردن صفحه خوش‌آمدگویی"
      className={`fixed inset-0 z-[120] bg-gradient-to-b from-surface-0 to-surface-1 flex flex-col items-center justify-center p-6 text-center select-none transition-opacity duration-200 ease-out cursor-pointer ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      dir="rtl"
    >
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="relative p-3 rounded-2xl bg-surface-1/90 border border-brand/25 shadow-[0_10px_30px_-5px_rgba(0,200,123,0.3)] backdrop-blur-md flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-brand/10 blur-lg -z-10" />
          <SilanehLogo className="h-16 sm:h-20 w-auto" showGlow />
        </div>

        {userName ? (
          /* هوشا greets the returning user by name — typed, chat-style */
          <div className="w-full flex items-start gap-3 text-right animate-fadeIn">
            <span className="w-10 h-10 rounded-full bg-brand-soft border border-brand-200 flex items-center justify-center shrink-0 shadow-xs">
              <SilanehLogo className="h-5 w-auto" />
            </span>
            <div className="flex-1 bg-surface-1 border border-border-default rounded-card p-4 shadow-e1 min-h-[72px]">
              <div className="text-[11px] font-bold text-brand mb-1.5 flex items-center gap-1">
                <Bot className="w-3.5 h-3.5" />
                هوشا
              </div>
              <Typewriter
                lines={[`سلام ${userName}!`, `${timeGreeting()}؛ خوشحالم که برگشتی.`]}
                speed={30}
                className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium"
                onDone={() => setTypedDone(true)}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <h1 className="text-base sm:text-lg font-bold text-text-1">
              هلدینگ دارویی و بهداشتی سیلانه سبز
            </h1>
            <p className="text-xs sm:text-text-3 font-medium">
              سامانه هوشمند غربالگری و مدیریت رزومه‌ها
            </p>
          </div>
        )}

        <div className="w-24 h-1 rounded-full bg-surface-2 overflow-hidden mt-3">
          <div className="w-full h-full bg-gradient-to-r from-brand-neon to-brand rounded-full animate-pulse shadow-[0_0_8px_rgba(5,229,144,0.6)]" />
        </div>

        <span className="text-[10px] text-text-3">برای رد کردن، لمس کنید</span>
      </div>
    </div>
  );
};
