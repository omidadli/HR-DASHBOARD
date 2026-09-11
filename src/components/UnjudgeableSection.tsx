import React from 'react';
import { HelpCircle, FileX, AlertCircle } from 'lucide-react';
import { ResumeFileItem } from '../types/screening';
import { toPersianDigits } from '../lib/normalizeFa';

interface UnjudgeableSectionProps {
  items: ResumeFileItem[];
}

export const UnjudgeableSection: React.FC<UnjudgeableSectionProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <div
      className="w-full bg-surface-2/70 rounded-2xl border border-border-strong p-4 sm:p-5 flex flex-col gap-3 text-right print-break-inside-avoid"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-border-default">
        <div className="flex items-center gap-2 text-text-2">
          <HelpCircle className="w-5 h-5 text-text-3" />
          <h3 className="text-sm sm:text-base font-black text-text-1">
            قابل قضاوت نیست 🤷 ({toPersianDigits(items.length)} فایل)
          </h3>
        </div>
        <span className="text-xs text-text-3">
          بدون نمره‌سازی ساختگی، نیازمند بازبینی دستی
        </span>
      </div>

      <p className="text-xs text-text-3 leading-relaxed">
        این رزومه‌ها به دلیل اسکن تصویری بدون لایه متن، ناقص بودن اطلاعات، خرابی فرمت یا نامرتبط بودن کلی، به طور خودکار نمره‌دهی نشدند تا عدالت ارزیابی حفظ شود:
      </p>

      {/* List */}
      <div className="flex flex-col gap-2">
        {items.map((it, idx) => {
          const reason =
            it.unjudgeableReason ||
            it.errorMessage ||
            it.result?.summary ||
            'متن کافی برای سنجش کیفی در فایل وجود ندارد';

          return (
            <div
              key={it.id || idx}
              className="flex items-start justify-between gap-3 p-3 rounded-xl bg-surface-1/90 border border-border-default text-xs"
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <FileX className="w-4 h-4 text-text-3 shrink-0 mt-0.5" />
                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-text-1 truncate" title={it.name}>
                    {it.result?.candidateName ? `${it.result.candidateName} (${it.name})` : it.name}
                  </span>
                  <span className="text-[11px] text-danger mt-0.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>علت: {reason}</span>
                  </span>
                </div>
              </div>

              <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 text-text-3 font-medium shrink-0">
                بررسی دستی
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
