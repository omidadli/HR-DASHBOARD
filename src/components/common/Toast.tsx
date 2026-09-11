import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

let pushExternal: ((message: string, type?: ToastType) => void) | null = null;

export function toast(message: string, type: ToastType = 'success') {
  pushExternal?.(message, type);
}

export const Toaster: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushExternal = (message, type = 'success') => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3600);
    };
    return () => {
      pushExternal = null;
    };
  }, []);

  return (
    <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 no-print pointer-events-none">
      {items.map((t) => (
        <div
          key={t.id}
          className={`animate-fadeIn pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-control shadow-e2 border text-xs sm:text-sm font-bold max-w-[92vw] ${
            t.type === 'success'
              ? 'bg-brand-soft border-brand/30 text-brand-700'
              : t.type === 'error'
              ? 'bg-danger-soft border-[var(--danger-border)] text-danger'
              : 'bg-info-soft border-info/30 text-info'
          }`}
        >
          {t.type === 'success' ? (
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4.5 h-4.5 shrink-0" />
          )}
          <span className="leading-relaxed">{t.message}</span>
          <button
            type="button"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
            className="w-7 h-7 rounded-control flex items-center justify-center opacity-60 hover:opacity-100 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
