import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  CalendarClock,
  Clock,
  X,
  CalendarPlus,
  ArrowRight,
  Sparkles,
  CalendarDays,
  CalendarRange,
} from 'lucide-react';
import { HRWorkspaceTask } from '../../types';
import {
  getTodayJalali,
  formatJalaliDate,
  gregorianToJalali,
  toPersianDigits,
} from '../../utils/jalali';
import { showToast } from '../common/Toast';

interface RescheduleTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: HRWorkspaceTask | null;
  onReschedule: (taskId: string, newDueDateJalali: string, newTimeframe: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER') => void;
}

export const RescheduleTaskModal: React.FC<RescheduleTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onReschedule,
}) => {
  const [customDate, setCustomDate] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<string>('tomorrow');

  if (!isOpen || !task) return null;

  // Compute preset dates accurately
  const computeRelativeDate = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    const j = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return formatJalaliDate(j, false);
  };

  const tomorrowStr = computeRelativeDate(1);
  const inThreeDaysStr = computeRelativeDate(3);
  
  // Calculate next Saturday (اول هفته آینده)
  const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  const daysUntilNextSaturday = (6 - currentDayOfWeek + 7) % 7 || 7;
  const nextSaturdayStr = computeRelativeDate(daysUntilNextSaturday);

  // End of month (approx 30th)
  const todayJ = getTodayJalali();
  const endOfMonthStr = `${todayJ.year}/${String(todayJ.month).padStart(2, '0')}/${todayJ.month <= 6 ? '31' : '30'}`;

  const handleApplyPreset = (targetDate: string, timeframe: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER', label: string) => {
    onReschedule(task.id, targetDate, timeframe);
    showToast(`وظیفه «${task.title}» به ${label} (${toPersianDigits(targetDate)}) موکول شد`, 'success');
    onClose();
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const datePattern = /^\d{4}\/\d{2}\/\d{2}$/;
    if (!datePattern.test(customDate)) {
      showToast('لطفاً تاریخ شمسی را با فرمت معتبر مانند ۱۴۰۳/۱۲/۲۸ وارد کنید', 'error');
      return;
    }
    onReschedule(task.id, customDate, 'LATER');
    showToast(`وظیفه به تاریخ ${toPersianDigits(customDate)} موکول شد`, 'success');
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-1 border border-border-default rounded-[20px] shadow-2xl p-6 space-y-4 text-right animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-[10px] bg-brand-soft text-brand">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-text-1">موکول کردن وظیفه به تاریخ دیگر</h3>
              <p className="text-[11px] text-text-3 truncate max-w-[260px]">
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-text-3 hover:text-text-1 hover:bg-surface-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status display */}
        <div className="p-3 rounded-[12px] bg-surface-2 border border-border-default text-xs flex items-center justify-between">
          <span className="text-text-3 font-bold">مهلت فعلی ثبت‌شده:</span>
          <span className="font-black text-rose-600 bg-rose-500/10 px-2.5 py-0.5 rounded-full">
            {toPersianDigits(task.dueDateJalali)}
          </span>
        </div>

        {/* Quick Reschedule Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-text-2">
            انتخاب سریع موعد جدید:
          </label>

          <button
            type="button"
            onClick={() => handleApplyPreset(tomorrowStr, 'THIS_WEEK', 'فردا')}
            className="w-full p-3 rounded-[12px] bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-brand/40 text-xs font-black text-text-1 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>موکول به فردا</span>
            </div>
            <span className="text-[11px] font-bold text-text-3">
              {toPersianDigits(tomorrowStr)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(inThreeDaysStr, 'THIS_WEEK', '۳ روز بعد')}
            className="w-full p-3 rounded-[12px] bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-brand/40 text-xs font-black text-text-1 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
              <span>موکول به ۳ روز بعد</span>
            </div>
            <span className="text-[11px] font-bold text-text-3">
              {toPersianDigits(inThreeDaysStr)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(nextSaturdayStr, 'THIS_WEEK', 'اول هفته آینده (شنبه)')}
            className="w-full p-3 rounded-[12px] bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-brand/40 text-xs font-black text-text-1 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>موکول به اول هفته آینده (شنبه)</span>
            </div>
            <span className="text-[11px] font-bold text-text-3">
              {toPersianDigits(nextSaturdayStr)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleApplyPreset(endOfMonthStr, 'THIS_MONTH', 'پایان ماه جاری')}
            className="w-full p-3 rounded-[12px] bg-surface-2 hover:bg-surface-3 border border-border-default hover:border-brand/40 text-xs font-black text-text-1 flex items-center justify-between transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-purple-500 group-hover:scale-110 transition-transform" />
              <span>موکول به پایان ماه جاری (بستن کارکرد)</span>
            </div>
            <span className="text-[11px] font-bold text-text-3">
              {toPersianDigits(endOfMonthStr)}
            </span>
          </button>
        </div>

        {/* Custom Jalali Date Picker */}
        <form onSubmit={handleApplyCustom} className="pt-3 border-t border-border-default space-y-3">
          <label className="block text-xs font-black text-text-2">
            یا انتخاب تاریخ شمسی مشخص:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              placeholder="مثال: ۱۴۰۳/۱۲/۲۸"
              className="flex-1 px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:border-brand font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-black shadow-xs cursor-pointer transition-all"
            >
              اعمال تاریخ
            </button>
          </div>
        </form>

        <div className="pt-2 text-left">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[8px] bg-surface-2 text-text-3 hover:text-text-1 text-xs font-bold cursor-pointer"
          >
            انصراف
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
