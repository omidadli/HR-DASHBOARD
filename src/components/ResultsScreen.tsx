import React from 'react';
import { Download, RotateCcw, Printer, Bot, Award, Sparkles } from 'lucide-react';
import { JobUnderstanding, ResumeFileItem } from '../types/screening';
import { toPersianDigits } from '../lib/normalizeFa';
import { CandidateCard } from './CandidateCard';
import { UnjudgeableSection } from './UnjudgeableSection';
import { exportScreeningToExcel } from '../lib/excelExport';

interface ResultsScreenProps {
  jobUnderstanding: JobUnderstanding;
  jobDescription: string;
  items: ResumeFileItem[];
  onReset: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  jobUnderstanding,
  jobDescription,
  items,
  onReset,
}) => {
  // Separate valid evaluated candidates from unjudgeable ones
  const validEvaluated = items
    .filter(
      (it) => it.status === 'success' && it.result && !it.result.insufficientInfo && !it.result.irrelevant
    )
    .sort((a, b) => (b.result?.score || 0) - (a.result?.score || 0));

  const unjudgeableItems = items.filter(
    (it) =>
      it.status !== 'success' ||
      !it.result ||
      it.result.insufficientInfo ||
      it.result.irrelevant
  );

  // Stats
  const interviewCount = validEvaluated.filter((it) => it.result?.recommendation === 'INTERVIEW').length;
  const reviewCount = validEvaluated.filter((it) => it.result?.recommendation === 'REVIEW').length;
  const rejectCount = validEvaluated.filter((it) => it.result?.recommendation === 'REJECT').length;
  const totalCount = items.length;

  const handleDownloadExcel = () => {
    exportScreeningToExcel(jobUnderstanding, items, jobDescription);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6" dir="rtl">
      {/* 1. Executive Summary Banner */}
      <div className="bg-brand text-white p-5 sm:p-6 rounded-3xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black">
              از {toPersianDigits(totalCount)} رزومه، {toPersianDigits(interviewCount)} نفر برای مصاحبه پیشنهاد میشن 🎯
            </h2>
            <span className="text-xs text-white/80 mt-0.5 block">
              بررسی جامع بر اساس شرایط شغل «{jobUnderstanding.department}» انجام شد.
            </span>
          </div>
        </div>

        {/* Quick Actions (Excel, Print, Reset) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-center no-print">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand font-black text-xs sm:text-sm hover:bg-white/90 active:scale-98 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>دانلود گزارش 📥</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
            title="چاپ یا ذخیره به صورت PDF"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">چاپ</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
            title="برگشت به صفحه اول برای ارزیابی شغل جدید"
          >
            <RotateCcw className="w-4 h-4" />
            <span>شروع دوباره 🔄</span>
          </button>
        </div>
      </div>

      {/* 2. AI Plain Understanding Box */}
      <div className="bg-surface-1 rounded-2xl border border-brand/30 p-4 sm:p-5 flex items-start gap-3.5 shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs font-black text-brand flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>هوش مصنوعی این شغل رو اینطوری فهمید 🤖:</span>
          </span>
          <p className="text-xs sm:text-sm text-text-1 leading-relaxed font-medium">
            {jobUnderstanding.plainExplanation}
          </p>
        </div>
      </div>

      {/* 3. Three Large Colored Metric Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Interview Box */}
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
              مصاحبه شود ✅
            </span>
            <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400 mt-0.5">
              بالای نمره {toPersianDigits(jobUnderstanding.thresholds.interview)}
            </span>
          </div>
          <span className="text-3xl font-black font-mono text-emerald-700 dark:text-emerald-300">
            {toPersianDigits(interviewCount)}
          </span>
        </div>

        {/* Review Box */}
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-500/30 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-amber-800 dark:text-amber-200">
              بررسی بیشتر 🟡
            </span>
            <span className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-0.5">
              نمره {toPersianDigits(jobUnderstanding.thresholds.review)} تا {toPersianDigits(jobUnderstanding.thresholds.interview)}
            </span>
          </div>
          <span className="text-3xl font-black font-mono text-amber-700 dark:text-amber-300">
            {toPersianDigits(reviewCount)}
          </span>
        </div>

        {/* Reject Box */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-500/30 flex items-center justify-between shadow-xs">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
              رد شود 🔴
            </span>
            <span className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">
              زیر نمره {toPersianDigits(jobUnderstanding.thresholds.review)}
            </span>
          </div>
          <span className="text-3xl font-black font-mono text-rose-700 dark:text-rose-300">
            {toPersianDigits(rejectCount)}
          </span>
        </div>
      </div>

      {/* 4. Candidate Cards List (Sorted Highest to Lowest Score) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm sm:text-base font-black text-text-1">
            رتبه‌بندی کاندیداها ({toPersianDigits(validEvaluated.length)} نفر):
          </h3>
          <span className="text-xs text-text-3">مرتب‌شده بر اساس بالاترین شایستگی</span>
        </div>

        {validEvaluated.length === 0 ? (
          <div className="p-8 text-center bg-surface-1 rounded-2xl border border-border-default text-xs sm:text-sm text-text-3">
            کاندیدای قابل قبولی یافت نشد. لطفاً بخش پایین را جهت بررسی فایل‌های نامرتبط یا ناقص بررسی کنید.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {validEvaluated.map((it, idx) => (
              <CandidateCard
                key={it.id}
                rank={idx + 1}
                fileName={it.name}
                evaluation={it.result!}
                jobUnderstanding={jobUnderstanding}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. Separate Gray Section: Unjudgeable Resumes */}
      {unjudgeableItems.length > 0 && (
        <UnjudgeableSection items={unjudgeableItems} />
      )}

      {/* Bottom Sticky Action Bar for Mobile & Desktop */}
      <div className="pt-4 border-t border-border-default flex items-center justify-between gap-3 no-print">
        <button
          type="button"
          onClick={handleDownloadExcel}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white font-black text-sm shadow-md cursor-pointer transition-all"
        >
          <Download className="w-4 h-4" />
          <span>دانلود گزارش کامل اکسل 📥</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-surface-1 hover:bg-surface-2 text-text-2 border border-border-default font-bold text-sm cursor-pointer transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>شروع دوباره 🔄</span>
        </button>
      </div>
    </div>
  );
};
