import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  JalaliDate,
  getTodayJalali,
  getJalaliMonthDays,
  getJalaliMonthStartWeekday,
  JALALI_MONTH_NAMES,
  JALALI_WEEK_DAYS,
  toPersianDigits,
  formatJalaliDate,
  parseJalaliDateString,
  compareJalali,
} from '../../utils/jalali';
import { Calendar, ChevronRight, ChevronLeft, X, RotateCcw } from 'lucide-react';

export interface JalaliDatePickerProps {
  value?: string; // Standard format like "1403/06/15" or "۱۴۰۳/۰۶/۱۵"
  onChange: (jalaliStr: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
  /** Optional range start date for connected range highlighting (e.g. "۱۴۰۳/۰۶/۱۰") */
  rangeStart?: string;
  /** Optional range end date for connected range highlighting (e.g. "۱۴۰۳/۰۶/۲۰") */
  rangeEnd?: string;
  /** Optional minimum allowable date string */
  minDate?: string;
  /** Optional maximum allowable date string */
  maxDate?: string;
  /** Optional helper text below input */
  helperText?: string;
}

export const JalaliDatePicker: React.FC<JalaliDatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'انتخاب تاریخ...',
  required = false,
  disabled = false,
  className = '',
  id,
  rangeStart,
  rangeEnd,
  minDate,
  maxDate,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarGridRef = useRef<HTMLDivElement>(null);
  const reactGeneratedId = React.useId();
  const pickerId = id || `jalali-picker-${reactGeneratedId}`;
  const today = getTodayJalali();

  // Parse initial view year and month
  const parseVal = useCallback((): JalaliDate => {
    if (value) {
      const parsed = parseJalaliDateString(value);
      if (parsed) return parsed;
    }
    return today;
  }, [value, today]);

  const selectedDate = value ? parseVal() : null;
  const parsedRangeStart = rangeStart ? parseJalaliDateString(rangeStart) : null;
  const parsedRangeEnd = rangeEnd ? parseJalaliDateString(rangeEnd) : null;
  const parsedMin = minDate ? parseJalaliDateString(minDate) : null;
  const parsedMax = maxDate ? parseJalaliDateString(maxDate) : null;

  const [viewYear, setViewYear] = useState<number>(selectedDate?.year || today.year);
  const [viewMonth, setViewMonth] = useState<number>(selectedDate?.month || today.month);
  const [focusedDay, setFocusedDay] = useState<number>(selectedDate?.day || today.day);

  useEffect(() => {
    if (value) {
      const p = parseVal();
      setViewYear(p.year);
      setViewMonth(p.month);
      setFocusedDay(p.day);
    }
  }, [value, parseVal]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const daysInMonth = getJalaliMonthDays(viewYear, viewMonth);
  const startWeekday = getJalaliMonthStartWeekday(viewYear, viewMonth); // 0 = Shanbeh

  const prevMonth = () => {
    if (viewMonth === 1) {
      setViewYear(viewYear - 1);
      setViewMonth(12);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 12) {
      setViewYear(viewYear + 1);
      setViewMonth(1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDayDisabled = (day: number) => {
    const candidate: JalaliDate = { year: viewYear, month: viewMonth, day };
    if (parsedMin && compareJalali(candidate, parsedMin) < 0) return true;
    if (parsedMax && compareJalali(candidate, parsedMax) > 0) return true;
    return false;
  };

  const handleSelectDay = (day: number) => {
    if (isDayDisabled(day)) return;
    const chosen: JalaliDate = { year: viewYear, month: viewMonth, day };
    onChange(formatJalaliDate(chosen, true));
    setIsOpen(false);
  };

  const handleSelectToday = () => {
    setViewYear(today.year);
    setViewMonth(today.month);
    setFocusedDay(today.day);
    if (!isDayDisabled(today.day)) {
      onChange(formatJalaliDate(today, true));
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'ArrowLeft':
        // In RTL, left moves forward (+1 day)
        e.preventDefault();
        if (focusedDay < daysInMonth) {
          setFocusedDay((prev) => prev + 1);
        } else {
          nextMonth();
          setFocusedDay(1);
        }
        break;
      case 'ArrowRight':
        // In RTL, right moves backward (-1 day)
        e.preventDefault();
        if (focusedDay > 1) {
          setFocusedDay((prev) => prev - 1);
        } else {
          prevMonth();
          setFocusedDay(getJalaliMonthDays(viewMonth === 1 ? viewYear - 1 : viewYear, viewMonth === 1 ? 12 : viewMonth - 1));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusedDay - 7 >= 1) {
          setFocusedDay((prev) => prev - 7);
        } else {
          prevMonth();
          const prevMonthDays = getJalaliMonthDays(viewMonth === 1 ? viewYear - 1 : viewYear, viewMonth === 1 ? 12 : viewMonth - 1);
          setFocusedDay(Math.max(1, prevMonthDays - (7 - focusedDay)));
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (focusedDay + 7 <= daysInMonth) {
          setFocusedDay((prev) => prev + 7);
        } else {
          nextMonth();
          setFocusedDay(Math.min(daysInMonth, (focusedDay + 7) - daysInMonth));
        }
        break;
      case 'PageUp':
        e.preventDefault();
        prevMonth();
        break;
      case 'PageDown':
        e.preventDefault();
        nextMonth();
        break;
      case 'Home':
        e.preventDefault();
        setFocusedDay(1);
        break;
      case 'End':
        e.preventDefault();
        setFocusedDay(daysInMonth);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleSelectDay(focusedDay);
        break;
    }
  };

  // Generate selectable year options (e.g. today.year - 15 to today.year + 10)
  const yearOptions: number[] = [];
  const baseYear = today.year;
  for (let y = baseYear - 15; y <= baseYear + 10; y++) {
    yearOptions.push(y);
  }
  if (!yearOptions.includes(viewYear)) {
    yearOptions.push(viewYear);
    yearOptions.sort((a, b) => a - b);
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={pickerId} className="block text-xs font-bold text-text-1 mb-1.5">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}

      {/* Input button trigger */}
      <div
        id={pickerId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-required={required}
        aria-label={label ? `${label}: ${value ? toPersianDigits(value) : placeholder}` : placeholder}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`flex items-center justify-between w-full px-3.5 py-2.5 text-xs bg-surface-1 border rounded-xl shadow-2xs transition-all cursor-pointer select-none outline-hidden ${
          disabled
            ? 'bg-surface-2 text-text-3 cursor-not-allowed border-border-default opacity-60'
            : isOpen
            ? 'border-brand ring-2 ring-brand/20'
            : 'border-border-default hover:border-border-strong text-text-1 focus:border-brand focus:ring-2 focus:ring-brand/20'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Calendar className="w-4 h-4 text-brand shrink-0" aria-hidden="true" />
          <span className={`truncate ${value ? 'font-bold text-text-1' : 'text-text-3'}`}>
            {value ? toPersianDigits(value) : placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-text-3 hover:text-danger rounded-md transition-colors"
              title="پاک کردن تاریخ"
              aria-label="پاک کردن تاریخ"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          ) : (
            <div className="w-2 h-2 rounded-full bg-brand/60" aria-hidden="true" />
          )}
        </div>
      </div>

      {helperText && (
        <p className="mt-1 text-[11px] text-text-3 leading-tight">{helperText}</p>
      )}

      {/* Dropdown Calendar Popover */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="تقویم شمسی"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className="absolute z-50 mt-2 p-4 bg-surface-1 border border-border-default rounded-2xl shadow-xl w-80 right-0 sm:right-auto sm:left-0 origin-top-right sm:origin-top-left animate-in fade-in zoom-in-95 duration-150 outline-hidden"
        >
          {/* Header with Month / Year Dropdowns & Prev/Next */}
          <div className="flex items-center justify-between gap-1.5 pb-3 border-b border-border-default mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-text-2 hover:text-brand hover:bg-brand-soft rounded-lg transition-colors cursor-pointer"
              title="ماه قبل"
              aria-label="ماه قبل"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Month & Year Dropdown Selectors */}
            <div className="flex items-center gap-1.5">
              <select
                value={viewMonth}
                onChange={(e) => {
                  setViewMonth(Number(e.target.value));
                  setFocusedDay(1);
                }}
                className="bg-surface-2 hover:bg-surface-3 text-text-1 font-bold text-xs py-1 px-2 rounded-lg border border-border-default focus:border-brand focus:outline-hidden cursor-pointer"
                aria-label="انتخاب ماه"
              >
                {JALALI_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => {
                  setViewYear(Number(e.target.value));
                  setFocusedDay(1);
                }}
                className="bg-surface-2 hover:bg-surface-3 text-brand font-bold text-xs py-1 px-2 rounded-lg border border-border-default focus:border-brand focus:outline-hidden cursor-pointer"
                aria-label="انتخاب سال"
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
              onClick={nextMonth}
              className="p-1.5 text-text-2 hover:text-brand hover:bg-brand-soft rounded-lg transition-colors cursor-pointer"
              title="ماه بعد"
              aria-label="ماه بعد"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Weekday headers: Shanbeh (شنبه) to Jomeh (جمعه) */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-text-3 mb-2 select-none" aria-hidden="true">
            {JALALI_WEEK_DAYS.map((wd) => {
              const isFriday = wd.key === 5;
              return (
                <div
                  key={wd.key}
                  className={`py-1 ${isFriday ? 'text-danger font-extrabold' : 'text-text-2'}`}
                  title={wd.name}
                >
                  {wd.short}
                </div>
              );
            })}
          </div>

          {/* Days Grid */}
          <div ref={calendarGridRef} className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center text-xs">
            {/* Empty slots for month start weekday offset */}
            {Array.from({ length: startWeekday }).map((_, i) => (
              <div key={`empty-${i}`} className="py-2" aria-hidden="true" />
            ))}

            {/* Days of month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const curDate: JalaliDate = { year: viewYear, month: viewMonth, day: dayNum };
              const disabledDay = isDayDisabled(dayNum);

              // Calculate weekday (0 = Shanbeh, 6 = Jomeh)
              const cellWeekday = (startWeekday + idx) % 7;
              const isFriday = cellWeekday === 6; // Friday is weekend

              // Date status checks
              const isExactSelected =
                selectedDate &&
                selectedDate.year === viewYear &&
                selectedDate.month === viewMonth &&
                selectedDate.day === dayNum;

              const isToday =
                today.year === viewYear &&
                today.month === viewMonth &&
                today.day === dayNum;

              const isFocused = focusedDay === dayNum;

              // Range checking
              const isRangeStart =
                parsedRangeStart &&
                compareJalali(curDate, parsedRangeStart) === 0;

              const isRangeEnd =
                parsedRangeEnd &&
                compareJalali(curDate, parsedRangeEnd) === 0;

              const isInRange =
                parsedRangeStart &&
                parsedRangeEnd &&
                compareJalali(curDate, parsedRangeStart) > 0 &&
                compareJalali(curDate, parsedRangeEnd) < 0;

              let cellClasses = 'relative py-2 text-xs font-semibold transition-all select-none ';

              if (disabledDay) {
                cellClasses += 'text-text-3 opacity-40 cursor-not-allowed ';
              } else if (isExactSelected || isRangeStart || isRangeEnd) {
                cellClasses += 'bg-brand text-white font-bold shadow-xs ';
                if (isRangeStart && parsedRangeEnd) {
                  cellClasses += 'rounded-r-xl rounded-l-none ';
                } else if (isRangeEnd && parsedRangeStart) {
                  cellClasses += 'rounded-l-xl rounded-r-none ';
                } else {
                  cellClasses += 'rounded-xl ';
                }
              } else if (isInRange) {
                cellClasses += 'bg-brand-soft text-brand font-bold rounded-none border-y border-brand/20 ';
              } else {
                cellClasses += 'rounded-xl hover:bg-surface-2 cursor-pointer ';
                if (isFriday) {
                  cellClasses += 'text-danger font-bold hover:bg-danger-soft ';
                } else {
                  cellClasses += 'text-text-1 ';
                }
              }

              // Today ring indicator
              const showTodayRing = isToday && !isExactSelected && !isRangeStart && !isRangeEnd;
              if (showTodayRing) {
                cellClasses += 'ring-2 ring-brand ring-offset-1 font-extrabold text-brand bg-brand-soft/70 ';
              }

              // Focused day border indicator for keyboard nav
              if (isFocused && !isExactSelected && !isRangeStart && !isRangeEnd) {
                cellClasses += 'ring-1 ring-border-strong ';
              }

              return (
                <button
                  type="button"
                  key={dayNum}
                  disabled={disabledDay}
                  aria-pressed={Boolean(isExactSelected)}
                  aria-label={`${toPersianDigits(dayNum)} ${JALALI_MONTH_NAMES[viewMonth - 1]} ${toPersianDigits(viewYear)}${isToday ? '، امروز' : ''}${isExactSelected ? '، انتخاب شده' : ''}${isFriday ? '، تعطیل' : ''}`}
                  onClick={() => handleSelectDay(dayNum)}
                  className={cellClasses}
                  title={`${toPersianDigits(dayNum)} ${JALALI_MONTH_NAMES[viewMonth - 1]} ${toPersianDigits(viewYear)}${isFriday ? ' (تعطیل رسمی)' : ''}`}
                >
                  <span>{toPersianDigits(dayNum)}</span>
                  {isToday && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer with Today shortcut & Legend */}
          <div className="mt-3 pt-2.5 border-t border-border-default flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleSelectToday}
              className="flex items-center gap-1.5 text-brand hover:opacity-80 font-bold py-1 px-2 rounded-lg hover:bg-brand-soft transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>امروز: {toPersianDigits(today.day)} {JALALI_MONTH_NAMES[today.month - 1]} {toPersianDigits(today.year)}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-3 hover:text-text-1 font-medium py-1 px-2 rounded-lg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
