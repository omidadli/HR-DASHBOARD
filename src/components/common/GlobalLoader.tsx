import React from 'react';
import { Sparkles, Building2 } from 'lucide-react';

interface GlobalLoaderProps {
  message?: string;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  message = 'در حال بارگذاری اطلاعات سامانه کارا...',
}) => {
  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-surface-0/90 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-colors"
      role="status"
      aria-label="در حال بارگذاری اطلاعات"
    >
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Branded Pulse Emblem */}
        <div className="relative mb-6">
          {/* Outer Pulsing Glow */}
          <div className="absolute -inset-3 rounded-2xl bg-brand/20 animate-ping opacity-60 pointer-events-none" />
          
          {/* Secondary Soft Ring */}
          <div className="absolute -inset-1.5 rounded-2xl bg-brand/30 animate-pulse pointer-events-none" />

          {/* Main Logo Card */}
          <div className="relative w-16 h-16 rounded-2xl bg-brand text-white shadow-xl shadow-brand/25 flex flex-col items-center justify-center font-black select-none border border-white/20">
            <span className="text-xl tracking-tight leading-none">کارا</span>
            <span className="text-[9px] font-bold opacity-90 mt-0.5">KARA</span>
          </div>
        </div>

        {/* Title & Brand */}
        <div className="space-y-1.5 mb-4">
          <h2 className="text-base font-black text-text-1 flex items-center justify-center gap-1.5">
            <span>سامانه منابع انسانی کارا</span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-[6px] bg-brand-soft text-brand border border-brand/20">
              سیلانه سبز
            </span>
          </h2>
          <div className="flex items-center justify-center gap-1 text-[11px] text-text-3 font-medium">
            <Building2 className="w-3.5 h-3.5 text-text-3" />
            <span>مدیریت کارخانجات اشتهارد و برندهای هلدینگ</span>
          </div>
        </div>

        {/* Subtle Progress Bar */}
        <div className="w-48 h-1 bg-surface-2 rounded-full overflow-hidden mb-3 border border-border-default">
          <div className="h-full bg-brand rounded-full w-2/5 animate-[shimmer_1.8s_infinite] transition-all" />
        </div>

        {/* Dynamic Status Message */}
        <p className="text-xs text-text-2 font-semibold animate-pulse leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
};
