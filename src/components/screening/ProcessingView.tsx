import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  ScanSearch,
  X,
  Clock,
  Zap,
  Layers,
} from 'lucide-react';
import { SilanehLogo } from '../common/SilanehLogo';
import { ResumeFileItem, ScreeningProgressUpdate } from '../../types/screening';
import { toPersianDigits } from '../../lib/normalizeFa';

interface ProcessingViewProps {
  progress: ScreeningProgressUpdate;
  error: string | null;
  onCancel: () => void;
}

function formatRemainingTime(seconds?: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return 'در حال محاسبه…';
  if (seconds <= 3) return 'چند لحظه دیگر';
  if (seconds < 60) return `حدود ${toPersianDigits(seconds)} ثانیه`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (s === 0) return `حدود ${toPersianDigits(m)} دقیقه`;
  return `حدود ${toPersianDigits(m)} دقیقه و ${toPersianDigits(s)} ثانیه`;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({ progress, error, onCancel }) => {
  const {
    items,
    processedCount,
    totalCount,
    statusText,
    subStatusText,
    currentEvaluatingName,
    activeEvaluatingNames,
    phase = 'extracting',
    extractedCount = 0,
    estimatedSecondsRemaining,
    speedPerMinute,
    overallPercent,
    warningText,
  } = progress;

  // Granular, weighted target percentage across the entire screening pipeline
  const targetPct = useMemo(() => {
    if (phase === 'done') return 100;
    if (!totalCount) return 0;
    if (overallPercent !== undefined) return overallPercent;

    if (phase === 'extracting') {
      const extRatio = extractedCount / totalCount;
      return Math.min(15, Math.max(4, Math.round(extRatio * 15)));
    }
    if (phase === 'evaluating') {
      const completedRatio = processedCount / totalCount;
      const base = 15 + completedRatio * 75;
      const activeCount = activeEvaluatingNames?.length || 0;
      const slotWeight = 75 / totalCount;
      const activeBonus = activeCount > 0 ? slotWeight * 0.45 : 0;
      return Math.min(90, Math.max(16, Math.round(base + activeBonus)));
    }
    if (phase === 'calibrating') {
      return 95;
    }
    return 0;
  }, [phase, totalCount, extractedCount, processedCount, activeEvaluatingNames, overallPercent]);

  // Smooth easing animation for progress bar
  const [animatedPct, setAnimatedPct] = useState(0);

  // Reset progress when a brand new screening job starts
  useEffect(() => {
    if (phase === 'extracting' && processedCount === 0 && extractedCount === 0) {
      setAnimatedPct(0);
    }
  }, [phase, processedCount, extractedCount]);

  useEffect(() => {
    if (phase === 'done') {
      setAnimatedPct(100);
      return;
    }

    const interval = setInterval(() => {
      setAnimatedPct((prev) => {
        // Strict monotonicity: percentage must never regress backwards during screening
        const target = Math.max(prev, targetPct);
        if (prev >= target) return prev;
        const diff = target - prev;
        const step = Math.max(1, Math.ceil(diff * 0.25));
        return Math.min(target, prev + step);
      });
    }, 40);

    return () => clearInterval(interval);
  }, [targetPct, phase]);

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [processedCount, extractedCount]);

  const success = items.filter((i) => i.status === 'success').length;
  const unjudgeable = items.filter((i) => i.status === 'unjudgeable').length;
  const failed = items.filter((i) => i.status === 'error').length;
  const pending = Math.max(0, totalCount - processedCount);

  const statusIcon = (s: ResumeFileItem['status']) => {
    if (s === 'success') return <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />;
    if (s === 'unjudgeable') return <AlertTriangle className="w-4 h-4 text-warning shrink-0" />;
    if (s === 'error') return <XCircle className="w-4 h-4 text-danger shrink-0" />;
    if (s === 'evaluating' || s === 'extracting') {
      return <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />;
    }
    return <span className="w-2 h-2 rounded-full bg-border-strong inline-block mx-1 shrink-0" />;
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center gap-6">
      {/* Top Header Card */}
      <div className="w-full bg-surface-1 border border-border-default rounded-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
        <div className="relative w-16 h-16 rounded-card bg-brand-soft border border-brand/20 flex items-center justify-center shrink-0 shadow-xs">
          <span className="absolute inset-0 rounded-card bg-brand/15 animate-ping" />
          <SilanehLogo className="h-9 w-auto relative" showGlow />
        </div>

        <div className="flex-1 text-center sm:text-start flex flex-col gap-1.5 min-w-0">
          <h2 className="text-base sm:text-lg font-bold text-text-1">
            هوشا در حال تحلیل و غربالگری رزومه‌هاست
          </h2>

          <p className="text-xs text-text-3 truncate">
            {statusText || 'هوشا در حال تحلیل دقیق سوابق و شایستگی‌های داوطلبان است…'}
          </p>

          {currentEvaluatingName && (
            <div className="text-xs font-bold text-brand truncate pt-0.5">
              آخرین رزومه بررسی‌شده: «{currentEvaluatingName}»
            </div>
          )}
        </div>
      </div>

      {/* Phase Trackers */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div
          className={`p-3 rounded-card border text-xs flex items-center gap-2.5 transition-colors ${
            phase === 'extracting'
              ? 'bg-brand-soft/60 border-brand/40 text-brand font-bold shadow-xs'
              : extractedCount >= totalCount
              ? 'bg-surface-1 border-border-default text-text-2'
              : 'bg-surface-2/60 border-border-default text-text-3'
          }`}
        >
          {phase === 'extracting' ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-brand" />
          ) : extractedCount >= totalCount ? (
            <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
          ) : (
            <Layers className="w-4 h-4 shrink-0 text-text-3" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold">۱. استخراج محتوا</span>
            <span className="text-[11px] text-text-3 tabular-nums">
              {toPersianDigits(extractedCount)} از {toPersianDigits(totalCount)} فایل
            </span>
          </div>
        </div>

        <div
          className={`p-3 rounded-card border text-xs flex items-center gap-2.5 transition-colors ${
            phase === 'evaluating'
              ? 'bg-brand-soft/60 border-brand/40 text-brand font-bold shadow-xs'
              : processedCount >= totalCount
              ? 'bg-surface-1 border-border-default text-text-2'
              : 'bg-surface-2/60 border-border-default text-text-3'
          }`}
        >
          {phase === 'evaluating' ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-brand" />
          ) : processedCount >= totalCount ? (
            <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
          ) : (
            <Zap className="w-4 h-4 shrink-0 text-text-3" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold">۲. تحلیل موازی هوشا</span>
            <span className="text-[11px] text-text-3 tabular-nums">
              {toPersianDigits(processedCount)} از {toPersianDigits(totalCount)} رزومه
            </span>
          </div>
        </div>

        <div
          className={`p-3 rounded-card border text-xs flex items-center gap-2.5 transition-colors ${
            phase === 'calibrating'
              ? 'bg-brand-soft/60 border-brand/40 text-brand font-bold shadow-xs'
              : phase === 'done'
              ? 'bg-surface-1 border-border-default text-text-2'
              : 'bg-surface-2/60 border-border-default text-text-3'
          }`}
        >
          {phase === 'calibrating' ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-brand" />
          ) : phase === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-brand shrink-0" />
          ) : (
            <Clock className="w-4 h-4 shrink-0 text-text-3" />
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold">۳. کالیبراسیون و رتبه‌بندی</span>
            <span className="text-[11px] text-text-3">
              {phase === 'done' ? 'تکمیل شد' : 'چیدمان اولویت‌ها'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Numerical Metrics */}
      <div className="w-full bg-surface-1 border border-border-default rounded-card p-4 sm:p-5 flex flex-col gap-3 shadow-xs">
        <div className="flex items-center justify-between text-xs font-bold text-text-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>پیشرفت کل غربالگری:</span>
            <span className="text-text-1 tabular-nums font-bold">
              {toPersianDigits(processedCount)} از {toPersianDigits(totalCount)} رزومه
            </span>
            {phase === 'extracting' && (
              <span className="text-[11px] font-normal text-text-3 mr-1">
                (استخراج محتوا: {toPersianDigits(extractedCount)} از {toPersianDigits(totalCount)})
              </span>
            )}
            {phase === 'evaluating' && activeEvaluatingNames && activeEvaluatingNames.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand bg-brand-soft/50 border border-brand/20 px-2 py-0.5 rounded-full mr-1.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin shrink-0" />
                هوشا در حال پردازش
              </span>
            )}
          </div>
          <span className="text-brand tabular-nums font-extrabold text-base">
            {toPersianDigits(animatedPct)}٪
          </span>
        </div>

        {/* Outer track */}
        <div className="h-3.5 w-full rounded-full bg-surface-2 overflow-hidden relative p-0.5 border border-border-default">
          <div
            className="h-full bg-gradient-to-r from-brand to-brand-neon rounded-full transition-all duration-300 shadow-[0_0_14px_rgba(5,229,144,0.65)]"
            style={{ width: `${Math.max(animatedPct, animatedPct > 0 ? 3 : 0)}%` }}
          />
        </div>

        {/* Live Substatus Text */}
        {(subStatusText || (statusText && phase === 'evaluating')) && (
          <div className="flex items-center gap-2 text-xs text-text-2 bg-surface-2/60 border border-border-default/60 rounded-control px-3 py-1.5 min-w-0">
            <Loader2 className="w-3 h-3 text-brand animate-spin shrink-0" />
            <span className="truncate font-medium">
              {subStatusText || statusText}
            </span>
          </div>
        )}

        {/* Speed & ETA Row */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-xs text-text-3 border-t border-border-default">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-text-3 shrink-0" />
            <span>زمان تخمینی باقی‌مانده:</span>
            <span className="font-bold text-text-1 tabular-nums">
              {phase === 'done' ? 'تکمیل شده' : formatRemainingTime(estimatedSecondsRemaining)}
            </span>
          </div>

          {speedPerMinute !== undefined && speedPerMinute > 0 && (
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>سرعت پردازش:</span>
              <span className="font-bold text-text-1 tabular-nums">
                {toPersianDigits(speedPerMinute)} رزومه در دقیقه
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Parallel Working Slots (if any) */}
      {activeEvaluatingNames && activeEvaluatingNames.length > 0 && (
        <div className="w-full bg-surface-1 border border-border-default rounded-card p-3 sm:p-4 flex flex-col gap-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-text-2">
            <Loader2 className="w-3.5 h-3.5 text-brand animate-spin shrink-0" />
            <span>
              هوشا در حال ارزیابی همزمان ({toPersianDigits(activeEvaluatingNames.length)} اسلات موازی):
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {activeEvaluatingNames.map((name, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-control bg-brand-soft/70 border border-brand/20 text-brand text-xs font-bold max-w-[240px] truncate"
                title={name}
              >
                <FileText className="w-3 h-3 shrink-0" />
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Status Counters */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-bold">
        <div className="p-3 rounded-control bg-surface-1 border border-border-default flex flex-col gap-1 shadow-xs">
          <span className="text-text-3 font-normal">کل رزومه‌ها</span>
          <span className="text-text-1 tabular-nums text-sm font-bold">
            {toPersianDigits(totalCount)}
          </span>
        </div>
        <div className="p-3 rounded-control bg-surface-1 border border-border-default flex flex-col gap-1 shadow-xs">
          <span className="text-text-3 font-normal">موفق و امتیازدهی‌شده</span>
          <span className="text-brand tabular-nums text-sm font-bold">
            {toPersianDigits(success)}
          </span>
        </div>
        <div className="p-3 rounded-control bg-surface-1 border border-border-default flex flex-col gap-1 shadow-xs">
          <span className="text-text-3 font-normal">غیرقابل تحلیل / نقص</span>
          <span className="text-warning tabular-nums text-sm font-bold">
            {toPersianDigits(unjudgeable + failed)}
          </span>
        </div>
        <div className="p-3 rounded-control bg-surface-1 border border-border-default flex flex-col gap-1 shadow-xs">
          <span className="text-text-3 font-normal">در صف انتظار</span>
          <span className="text-text-2 tabular-nums text-sm font-bold">
            {toPersianDigits(pending)}
          </span>
        </div>
      </div>

      {/* Live Resume List */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-text-3 px-1">
          <span>فهرست زنده رزومه‌ها ({toPersianDigits(items.length)} فایل):</span>
          <span>اسکرول خودکار به آخرین وضعیت</span>
        </div>

        <div
          ref={listRef}
          className="w-full max-h-[36vh] overflow-y-auto bg-surface-1 border border-border-default rounded-card p-2 flex flex-col gap-1 shadow-xs"
        >
          {items.map((it) => (
            <div
              key={it.id}
              className={`flex items-center gap-2.5 p-2 rounded-control text-xs transition-colors ${
                it.status === 'evaluating' || it.status === 'extracting'
                  ? 'bg-brand-soft/60 border border-brand/30'
                  : 'hover:bg-surface-2'
              }`}
            >
              {statusIcon(it.status)}
              <FileText className="w-3.5 h-3.5 text-text-3 shrink-0" />
              <span className="font-bold text-text-1 truncate flex-1" title={it.name}>
                {it.name}
              </span>

              {it.status === 'success' && it.score !== undefined && (
                <span className="font-bold text-brand tabular-nums shrink-0 px-2 py-0.5 rounded bg-brand-soft/80">
                  امتیاز {toPersianDigits(it.score)}
                </span>
              )}

              {it.status === 'unjudgeable' && (
                <span
                  className="text-warning shrink-0 truncate max-w-[45%] text-[11px]"
                  title={it.unjudgeableReason}
                >
                  {it.unjudgeableReason ? `نقص: ${it.unjudgeableReason}` : 'غیرقابل‌تحلیل'}
                </span>
              )}

              {it.status === 'error' && (
                <span className="text-danger shrink-0 text-[11px] font-bold">خطا در پردازش</span>
              )}

              {it.status === 'queued' && (
                <span className="text-text-3 shrink-0 text-[11px]">در انتظار…</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {warningText && !error ? (
        <div className="w-full p-3 rounded-control bg-warning-soft border border-[var(--warning-border)] text-warning-text text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
          <span>{warningText}</span>
        </div>
      ) : null}

      {error ? (
        <div className="w-full p-3.5 rounded-control bg-danger-soft border border-[var(--danger-border)] text-danger text-xs font-bold text-center">
          {error}
        </div>
      ) : null}

      {/* Cancel button */}
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-control bg-surface-1 border border-border-default text-text-2 text-xs font-bold hover:border-danger/50 hover:text-danger cursor-pointer shadow-xs transition-colors"
      >
        <X className="w-4 h-4" />
        لغو پردازش و بازگشت
      </button>
    </div>
  );
};
