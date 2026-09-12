import React, { useEffect, useRef, useState } from 'react';
import { Bot } from 'lucide-react';
import { SilanehLogo } from './SilanehLogo';
import { Typewriter } from './Typewriter';
import { timeGreeting } from '../../lib/user';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
  /** Returning user's first name — هوشا greets them by name (typed). */
  userName?: string | null;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 600,
  userName,
}) => {
  const [fading, setFading] = useState(false);
  const [typedDone, setTypedDone] = useState(!userName);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    // If reduced motion is requested, complete immediately
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    // Without a known user, keep the original short logo splash.
    if (!userName) {
      const timer = setTimeout(() => {
        setFading(true);
        const exitTimer = setTimeout(onComplete, 250);
        timers.current.push(exitTimer);
      }, durationMs);
      timers.current.push(timer);
    }
    // With a user: wait for the typed greeting to finish (handled in the
    // typing-done effect below).

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [onComplete, durationMs, userName]);

  // After the greeting is fully typed: short hold → fade out → done.
  useEffect(() => {
    if (!typedDone || !userName) return;
    const hold = setTimeout(() => {
      setFading(true);
      timers.current.push(setTimeout(onComplete, 250));
    }, 1100);
    timers.current.push(hold);
    return () => clearTimeout(hold);
  }, [typedDone, userName, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[120] bg-gradient-to-b from-surface-0 to-surface-1 flex flex-col items-center justify-center p-6 text-center select-none transition-opacity duration-250 ease-out ${
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
            <p className="text-xs text-text-3 font-medium">
              سامانه هوشمند غربالگری و مدیریت رزومه‌ها
            </p>
          </div>
        )}

        <div className="w-24 h-1 rounded-full bg-surface-2 overflow-hidden mt-3">
          <div className="w-full h-full bg-gradient-to-r from-brand-neon to-brand rounded-full animate-pulse shadow-[0_0_8px_rgba(5,229,144,0.6)]" />
        </div>
      </div>
    </div>
  );
};
