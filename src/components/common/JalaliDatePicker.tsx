import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  JALALI_MONTH_NAMES,
  JALALI_WEEK_DAYS,
  JalaliDate,
  compareJalali,
  formatJalaliDate,
  getJalaliMonthDays,
  getJalaliMonthStartWeekday,
  getTodayJalali,
} from '../../utils/jalali';
import { toPersianDigits } from '../../lib/normalizeFa';

interface JalaliDatePickerProps {
  value: JalaliDate | null;
  onChange: (value: JalaliDate | null) => void;
  placeholder?: string;
  /** Small caption rendered above the field (e.g. «از تاریخ»). */
  label?: string;
  min?: JalaliDate | null;
  max?: JalaliDate | null;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Lightweight Persian (Shamsi) date picker.
 *
 * The decisions workspace filters by Jalali ranges, and the app has no date
 * library — everything is built on the helpers in utils/jalali so the calendar
 * shown here is the same one used for every timestamp in the product.
 */
export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'انتخاب تاریخ',
  label,
  min,
  max,
  disabled,
  compact,
}) => {
  const today = useMemo(() => getTodayJalali(), []);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<{ year: number; month: number }>(
    () => value || today
  );
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Re-open on the selected value (or today) so the panel is never stale.
  useEffect(() => {
    if (open) setView(value ? { year: value.year, month: value.month } : today);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const shiftMonth = (delta: number) => {
    setView((v) => {
      let month = v.month + delta;
      let year = v.year;
      while (month < 1) {
        month += 12;
        year -= 1;
      }
      while (month > 12) {
        month -= 12;
        year += 1;
      }
      return { year, month };
    });
  };

  const daysInMonth = getJalaliMonthDays(view.year, view.month);
  const startWeekday = getJalaliMonthStartWeekday(view.year, view.month);
  const cells: (JalaliDate | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      year: view.year,
      month: view.month,
      day: i + 1,
    })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isDisabledDay = (d: JalaliDate) =>
    (min ? compareJalali(d, min) < 0 : false) || (max ? compareJalali(d, max) > 0 : false);

  const yearOptions = useMemo(() => {
    const base = today.year;
    return Array.from({ length: 11 }, (_, i) => base - 5 + i);
  }, [today.year]);

  const pick = (d: JalaliDate) => {
    onChange(d);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      {label && <div className="text-[11px] font-bold text-text-3 mb-1">{label}</div>}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full inline-flex items-center gap-2 rounded-control border bg-surface-1 text-xs font-bold cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          compact ? 'px-2.5 h-9' : 'px-3 h-10'
        } ${open ? 'border-brand ring-2 ring-brand/20 text-brand' : 'border-border-default text-text-1 hover:border-brand/40'}`}
      >
        <CalendarDays className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-brand' : 'text-text-3'}`} />
        <span className={`flex-1 text-right truncate tabular-nums ${value ? '' : 'text-text-3 font-medium'}`}>
          {value ? formatJalaliDate(value) : placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="w-5 h-5 rounded-full flex items-center justify-center text-text-3 hover:text-danger hover:bg-danger-soft cursor-pointer"
            title="پاک کردن تاریخ"
          >
            <X className="w-3 h-3" />
          </span>
        ) : null}
      </button>

      {open && (
        <div
          className="absolute z-[95] mt-1.5 w-[264px] max-w-[calc(100vw-2.5rem)] bg-surface-1 border border-border-default rounded-card shadow-e3 p-3 animate-fadeIn"
          style={{ insetInlineStart: 0 }}
        >
          {/* Month / year navigation */}
          <div className="flex items-center justify-between gap-1 mb-2.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="w-8 h-8 rounded-control border border-border-default bg-surface-1 flex items-center justify-center text-text-2 hover:border-brand hover:text-brand cursor-pointer"
              title="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <select
                value={view.month}
                onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
                className="h-8 rounded-control border border-border-default bg-surface-1 text-xs font-bold text-text-1 px-1.5 cursor-pointer outline-none focus:border-brand"
              >
                {JALALI_MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={view.year}
                onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
                className="h-8 rounded-control border border-border-default bg-surface-1 text-xs font-bold text-text-1 px-1.5 cursor-pointer outline-none focus:border-brand tabular-nums"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {toPersianDigits(y)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="w-8 h-8 rounded-control border border-border-default bg-surface-1 flex items-center justify-center text-text-2 hover:border-brand hover:text-brand cursor-pointer"
              title="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {JALALI_WEEK_DAYS.map((w) => (
              <span
                key={w.key}
                className={`h-6 flex items-center justify-center text-[11px] font-bold ${
                  w.key === 5 ? 'text-danger' : 'text-text-3'
                }`}
              >
                {w.short}
              </span>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={`e-${i}`} />;
              const selected = value ? compareJalali(value, d) === 0 : false;
              const isToday = compareJalali(today, d) === 0;
              const off = isDisabledDay(d);
              const friday = (i + startWeekday) % 7 === 6;
              return (
                <button
                  key={`${d.year}-${d.month}-${d.day}`}
                  type="button"
                  disabled={off}
                  onClick={() => pick(d)}
                  className={`h-8 rounded-control text-xs font-bold tabular-nums cursor-pointer transition-all border ${
                    selected
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : off
                      ? 'bg-surface-2/60 text-text-3/50 border-transparent cursor-not-allowed'
                      : isToday
                      ? 'bg-brand-soft text-brand-700 border-brand-200 hover:bg-brand-100'
                      : `bg-surface-1 text-text-1 border-transparent hover:border-brand/40 hover:bg-brand-soft/50 ${
                          friday ? 'text-danger' : ''
                        }`
                  }`}
                >
                  {toPersianDigits(d.day)}
                </button>
              );
            })}
          </div>

          {/* Footer shortcuts */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-border-default">
            <button
              type="button"
              onClick={() => pick(today)}
              className="text-[11px] font-bold text-brand cursor-pointer hover:underline"
            >
              امروز
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="text-[11px] font-bold text-text-3 cursor-pointer hover:text-danger"
            >
              پاک کردن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JalaliDatePicker;
