import React, { useRef, useEffect } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ScanSearch,
  X,
} from 'lucide-react';
import { ResumeFileItem, ScreeningProgressUpdate } from '../../types/screening';
import { toPersianDigits } from '../../lib/normalizeFa';

interface ProcessingViewProps {
  progress: ScreeningProgressUpdate;
  error: string | null;
  onCancel: () => void;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ progress, error, onCancel }) => {
  const { items, processedCount, totalCount, statusText, currentEvaluatingName } = progress;
  const pct = totalCount ? Math.round((processedCount / totalCount) * 100) : 0;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [processedCount]);

  const success = items.filter((i) => i.status === 'success').length;
  const failed = items.filter((i) => i.status === 'error' || i.status === 'unjudgeable').length;
  const pending = totalCount - success - failed;

  const statusIcon = (s: ResumeFileItem['status']) => {
    if (s === 'success') return <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />;
    if (s === 'unjudgeable') return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />;
    if (s === 'error') return <XCircle className="w-4 h-4 text-rose-600 shrink-0" />;
    if (s === 'evaluating' || s === 'extracting')
      return <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />;
    return <span className="w-2 h-2 rounded-full bg-border-strong inline-block mx-1" />;
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center gap-6">
      {/* Animated brain */}
      <div className="relative w-24 h-24 rounded-3xl bg-brand-soft flex items-center justify-center">
        <span className="absolute inset-0 rounded-3xl bg-brand/10 animate-ping" />
        <ScanSearch className="w-11 h-11 text-brand relative" />
      </div>

      <div className="text-center flex flex-col gap-1.5">
        <h2 className="text-lg sm:text-xl font-black text-text-1">در حال تحلیل رزومه‌ها…</h2>
        <p className="text-xs text-text-3">{statusText || 'لطفاً شکیبا باش'}</p>
        {currentEvaluatingName && (
          <p className="text-xs font-bold text-brand truncate max-w-[80vw]">«{currentEvaluatingName}»</p>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full flex flex-col gap-2">
        <div className="flex items-center justify-between text-[11px] font-bold text-text-3">
          <span>
            {toPersianDigits(processedCount)} از {toPersianDigits(totalCount)}
          </span>
          <span className="font-mono">{toPersianDigits(pct)}٪</span>
        </div>
        <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
          <div
            className="h-full bg-brand rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-3 text-[11px] font-bold pt-1">
          <span className="inline-flex items-center gap-1 text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" /> موفق: {toPersianDigits(success)}
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" /> قابل‌تحلیل نیست: {toPersianDigits(failed)}
          </span>
          <span className="inline-flex items-center gap-1 text-text-3">
            در صف: {toPersianDigits(Math.max(0, pending))}
          </span>
        </div>
      </div>

      {/* Live file list */}
      <div
        ref={listRef}
        className="w-full max-h-[38vh] overflow-y-auto bg-surface-1 border border-border-default rounded-2xl p-2.5 flex flex-col gap-1"
      >
        {items.map((it) => (
          <div
            key={it.id}
            className={`flex items-center gap-2.5 p-2 rounded-xl text-[11px] ${
              it.status === 'evaluating' || it.status === 'extracting' ? 'bg-brand-soft/60' : ''
            }`}
          >
            {statusIcon(it.status)}
            <FileText className="w-3.5 h-3.5 text-text-3 shrink-0" />
            <span className="font-bold text-text-1 truncate flex-1" title={it.name}>
              {it.name}
            </span>
            {it.status === 'success' && it.score !== undefined && (
              <span className="font-mono font-black text-emerald-700 shrink-0">
                {toPersianDigits(it.score)}
              </span>
            )}
            {it.status === 'unjudgeable' && (
              <span className="text-amber-700 shrink-0 truncate max-w-[45%]" title={it.unjudgeableReason}>
                غیرقابل‌تحلیل
              </span>
            )}
            {it.status === 'error' && <span className="text-rose-700 shrink-0">خطا</span>}
          </div>
        ))}
      </div>

      {error ? (
        <div className="w-full p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-bold text-center">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-surface-1 border border-border-default text-text-2 text-xs font-bold hover:border-danger/50 hover:text-danger cursor-pointer"
      >
        <X className="w-4 h-4" />
        لغو و بازگشت
      </button>
    </div>
  );
};
