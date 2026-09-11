import React, { useState, useEffect } from 'react';
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  FileText,
  AlertCircle,
  FileSearch,
} from 'lucide-react';
import { toPersianDigits } from '../lib/normalizeFa';
import { ResumeFileItem } from '../types/screening';

interface ProcessingScreenProps {
  processedCount: number;
  totalCount: number;
  successCount: number;
  queuedCount: number;
  errorCount: number;
  currentEvaluatingName?: string;
  statusText?: string;
  items?: ResumeFileItem[];
  error?: string | null;
  onRetry?: () => void;
  onCancel: () => void;
}

const ROTATING_MESSAGES = [
  'در حال استخراج و تحلیل متن رزومه‌ها… 📖',
  'در حال تطبیق شرایط کاندیداها با نیازهای شغلی… ⚖️',
  'در حال انتخاب برترین رزومه‌ها و کالیبراسیون نهایی… 🏆',
];

export const ProcessingScreen: React.FC<ProcessingScreenProps> = ({
  processedCount,
  totalCount,
  successCount,
  queuedCount,
  errorCount,
  currentEvaluatingName,
  statusText,
  items = [],
  error,
  onRetry,
  onCancel,
}) => {
  const [messageIndex, setMessageIndex] = useState(0);
  const [showItemList, setShowItemList] = useState(true);

  // Rotate friendly message every 3.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ROTATING_MESSAGES.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Calculate honest percentage
  const percentage = totalCount > 0 ? Math.min(100, Math.round((processedCount / totalCount) * 100)) : 0;

  return (
    <div
      className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center gap-6 sm:gap-8 text-center select-none"
      dir="rtl"
    >
      {/* Error state if screening encountered a fatal problem */}
      {error ? (
        <div className="w-full bg-danger/10 border border-danger/30 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-danger/20 text-danger flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-bold text-danger">خطا در پردازش هوشمند رزومه‌ها</h3>
            <p className="text-sm text-text-2 max-w-md">{error}</p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>تلاش مجدد</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 bg-surface-1 border border-border-default text-text-2 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-surface-2 transition cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>بازگشت و اصلاح ورودی‌ها</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Animated Spinner Icon */}
          <div className="relative flex items-center justify-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-brand-soft border border-brand/30 flex items-center justify-center text-brand shadow-lg shadow-brand/10">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-brand" />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-brand text-white font-mono text-xs font-black shadow-xs">
              {toPersianDigits(percentage)}٪
            </div>
          </div>

          {/* Rotating Friendly Persian Message */}
          <div className="flex flex-col items-center gap-2 max-w-lg">
            <h2 className="text-xl sm:text-2xl font-black text-text-1 tracking-tight transition-all">
              {ROTATING_MESSAGES[messageIndex]}
            </h2>
            {statusText && (
              <p className="text-xs sm:text-sm text-text-2 leading-relaxed">
                {statusText}
              </p>
            )}
            {currentEvaluatingName && (
              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-brand font-bold bg-brand-soft px-3.5 py-1.5 rounded-full border border-brand/20 truncate max-w-sm">
                <FileSearch className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{currentEvaluatingName}</span>
              </span>
            )}
          </div>

          {/* Real Progress Bar */}
          <div className="w-full flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-text-2">
              <span>
                {toPersianDigits(processedCount)} از {toPersianDigits(totalCount)} رزومه بررسی شد
              </span>
              <span className="font-mono text-brand font-black">
                {toPersianDigits(percentage)}٪
              </span>
            </div>

            <div className="w-full h-3 bg-surface-2 rounded-full overflow-hidden p-0.5 border border-border-default">
              <div
                className="h-full bg-brand rounded-full transition-all duration-300 ease-out"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* 3 Simple Status Counters */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full">
            <div className="p-3 sm:p-4 rounded-2xl bg-surface-1 border border-border-default flex flex-col items-center gap-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>بررسی‌شده</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-text-1 font-mono">
                {toPersianDigits(successCount)}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-surface-1 border border-border-default flex flex-col items-center gap-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
                <span>در صف / در حال بررسی</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-text-1 font-mono">
                {toPersianDigits(queuedCount)}
              </span>
            </div>

            <div className="p-3 sm:p-4 rounded-2xl bg-surface-1 border border-border-default flex flex-col items-center gap-1 shadow-xs">
              <div className="flex items-center gap-1.5 text-xs font-bold text-danger">
                <AlertTriangle className="w-4 h-4" />
                <span>مشکل‌دار / ناقص</span>
              </div>
              <span className="text-xl sm:text-2xl font-black text-text-1 font-mono">
                {toPersianDigits(errorCount)}
              </span>
            </div>
          </div>

          {/* Live Activity Files Preview */}
          {items.length > 0 && (
            <div className="w-full bg-surface-1 border border-border-default rounded-2xl p-4 text-right flex flex-col gap-3 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-2 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-brand" />
                  وضعیت لحظه‌ای فایل‌های رزومه ({toPersianDigits(items.length)})
                </span>
                <button
                  type="button"
                  onClick={() => setShowItemList((prev) => !prev)}
                  className="text-xs text-text-3 hover:text-brand transition cursor-pointer"
                >
                  {showItemList ? 'بستن لیست' : 'نمایش جزییات'}
                </button>
              </div>

              {showItemList && (
                <div className="max-h-48 overflow-y-auto divide-y divide-border-default text-xs">
                  {items.map((it, idx) => (
                    <div key={it.id || idx} className="py-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate max-w-[65%]">
                        <span className="font-mono text-text-3 w-5 shrink-0 text-left">
                          {toPersianDigits(idx + 1)}.
                        </span>
                        <span className="truncate font-medium text-text-1">{it.name}</span>
                      </div>

                      <div className="shrink-0">
                        {it.status === 'success' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            ارزیابی شد ({toPersianDigits(it.result?.score || 0)})
                          </span>
                        )}
                        {it.status === 'evaluating' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-soft text-brand font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            در حال ارزیابی هوش مصنوعی
                          </span>
                        )}
                        {it.status === 'extracting' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            در حال استخراج متن
                          </span>
                        )}
                        {it.status === 'queued' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-2 text-text-3">
                            <Clock className="w-3 h-3" />
                            در صف
                          </span>
                        )}
                        {(it.status === 'unjudgeable' || it.status === 'error') && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/10 text-danger font-medium"
                            title={it.unjudgeableReason || it.errorMessage || 'نقص در پردازش'}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {it.status === 'unjudgeable' ? 'بدون لایه متنی / ناقص' : 'خطا در ارزیابی'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cancel Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-text-3 hover:text-danger hover:underline transition-colors py-2 px-4 cursor-pointer"
            >
              <ArrowRight className="w-4 h-4" />
              <span>انصراف و برگشت به مرحله قبل</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
