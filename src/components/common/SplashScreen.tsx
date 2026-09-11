import React, { useEffect, useState } from 'react';
import { SilanehLogo } from './SilanehLogo';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, durationMs = 600 }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // If reduced motion is requested, complete immediately
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setFading(true);
      const exitTimer = setTimeout(onComplete, 250);
      return () => clearTimeout(exitTimer);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [onComplete, durationMs]);

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

        <div className="flex flex-col gap-1.5">
          <h1 className="text-base sm:text-lg font-bold text-text-1">
            هلدینگ دارویی و بهداشتی سیلانه سبز
          </h1>
          <p className="text-xs text-text-3 font-medium">
            سامانه هوشمند غربالگری و مدیریت رزومه‌ها
          </p>
        </div>

        <div className="w-24 h-1 rounded-full bg-surface-2 overflow-hidden mt-3">
          <div className="w-full h-full bg-gradient-to-r from-brand-neon to-brand rounded-full animate-pulse shadow-[0_0_8px_rgba(5,229,144,0.6)]" />
        </div>
      </div>
    </div>
  );
};
