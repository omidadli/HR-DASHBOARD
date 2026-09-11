/**
 * Leave entitlement engine (audit fixes LEA-01/LEA-02).
 *
 * Rules implemented (Iranian Labor Law):
 * - Art. 64: 26 WORKING days of paid annual leave per year (Fridays excluded
 *   from working-day counts; the 4 Fridays are already folded into the 26-day
 *   statutory figure).
 * - Mid-year hires: entitlement is pro-rated by calendar days employed within
 *   the Jalali year (26 × employedDays / daysInYear). NOTE: some employers use
 *   the employment-anniversary year instead of the Jalali calendar year — the
 *   calendar-year basis is implemented here and documented (flagged in report).
 * - Art. 66: at most 9 unused days may carry over into the next year.
 * - Hourly leave deducts from the same annual quota (fractional days).
 * - Marriage leave (Art. 73): 3 paid days, does NOT deduct from annual quota.
 * - Sick / unpaid / maternity leave do NOT deduct from the annual quota
 *   (sick leave is an SSO matter; unpaid leave affects payroll instead).
 *
 * Balances are DERIVED from stored requests (never stored separately), so an
 * approval can never drift out of sync with the balance — the balance simply
 * recomputes from the approved set (audit: "could a leave be approved but
 * balance not deducted?" — structurally impossible now).
 */
import {
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  Employee,
} from '../src/types';
import {
  JalaliDate,
  parseJalaliDateString,
  compareJalali,
  countWorkingDaysInclusive,
  isJalaliLeapYear,
  jalaliToGregorian,
  getTodayJalali,
} from '../src/utils/jalali';
import {
  ANNUAL_LEAVE_WORKING_DAYS,
  ANNUAL_LEAVE_MAX_CARRYOVER_DAYS,
  MARRIAGE_LEAVE_DAYS,
} from './statutory';

export interface YearBalance {
  yearJalali: number;
  /** Statutory entitlement for the year (pro-rated by hire date). */
  entitlementDays: number;
  /** Carried over from previous year (capped at 9 days, Art. 66). */
  carryoverDays: number;
  /** Working days consumed by APPROVED annual/hourly leave. */
  usedDays: number;
  /** Working days held by PENDING annual/hourly requests (reserved). */
  pendingDays: number;
  /** entitlement + carryover − used − pending (can be negative if legacy data over-drew). */
  remainingDays: number;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName?: string;
  currentYear: number;
  years: Record<number, YearBalance>;
  /** Convenience: remaining for the current Jalali year. */
  remainingNow: number;
}

const QUOTA_TYPES = new Set<string>([LeaveType.ANNUAL, LeaveType.HOURLY]);

function daysInJalaliYear(jy: number): number {
  return isJalaliLeapYear(jy) ? 366 : 365;
}

/** Working days of a request that fall inside a given Jalali year (Fridays excluded). */
function workingDaysInYear(req: LeaveRequest, jy: number): number {
  const start = parseJalaliDateString(req.startDateJalali);
  const end = parseJalaliDateString(req.endDateJalali);
  if (!start || !end) {
    // Legacy/unparseable rows: fall back to the stored daysCount attributed to
    // the start-string year if it matches, else 0 (never fabricate usage).
    const fallbackYear = parseInt(String(req.startDateJalali).replace(/[۰-۹]/g, (w) =>
      String('۰۱۲۳۴۵۶۷۸۹'.indexOf(w))), 10);
    return fallbackYear === jy ? Math.max(0, req.daysCount || 0) : 0;
  }
  const yearStart: JalaliDate = { year: jy, month: 1, day: 1 };
  const yearEnd: JalaliDate = { year: jy, month: 12, day: isJalaliLeapYear(jy) ? 30 : 29 };
  const from = compareJalali(start, yearStart) < 0 ? yearStart : start;
  const to = compareJalali(end, yearEnd) > 0 ? yearEnd : end;
  if (compareJalali(to, from) < 0) return 0;
  return countWorkingDaysInclusive(from, to);
}

/** Calendar days between two Jalali dates, inclusive of both ends. */
function calendarDaysInclusive(a: JalaliDate, b: JalaliDate): number {
  const ga = jalaliToGregorian(a.year, a.month, a.day);
  const gb = jalaliToGregorian(b.year, b.month, b.day);
  return Math.round(
    (new Date(gb.year, gb.month - 1, gb.day).getTime() - new Date(ga.year, ga.month - 1, ga.day).getTime()) / 86400000
  ) + 1;
}

function computeYearBalance(
  employee: Employee,
  requests: LeaveRequest[],
  jy: number,
  carryoverFromPrev: number
): YearBalance {
  // Pro-rate entitlement by hire date within the year (Art. 64): a mid-year
  // hire earns 26 × (calendar days employed in the year / days in year).
  let entitlement = ANNUAL_LEAVE_WORKING_DAYS;
  const hire = parseJalaliDateString(employee.hireDateJalali);
  if (hire) {
    const yearStart: JalaliDate = { year: jy, month: 1, day: 1 };
    const yearEnd: JalaliDate = { year: jy, month: 12, day: isJalaliLeapYear(jy) ? 30 : 29 };
    if (hire.year > jy) {
      entitlement = 0; // not employed at all during this year
    } else if (hire.year === jy && compareJalali(hire, yearStart) > 0) {
      const employedCalDays = calendarDaysInclusive(hire, yearEnd);
      entitlement = Math.round((ANNUAL_LEAVE_WORKING_DAYS * employedCalDays) / daysInJalaliYear(jy));
    }
  }

  let usedDays = 0;
  let pendingDays = 0;
  for (const req of requests) {
    if (req.employeeId !== employee.id) continue;
    if (!QUOTA_TYPES.has(req.leaveType)) continue;
    const days = workingDaysInYear(req, jy);
    if (days <= 0) continue;
    if (req.status === LeaveStatus.APPROVED) usedDays += days;
    else if (req.status === LeaveStatus.PENDING_MANAGER || req.status === LeaveStatus.PENDING_HR) pendingDays += days;
    // REJECTED requests consume nothing.
  }

  return {
    yearJalali: jy,
    entitlementDays: entitlement,
    carryoverDays: carryoverFromPrev,
    usedDays,
    pendingDays,
    remainingDays: entitlement + carryoverFromPrev - usedDays - pendingDays,
  };
}

/** Full balance for one employee: previous year (for carry-over) + current year. */
export function computeLeaveBalance(employee: Employee, requests: LeaveRequest[], today?: JalaliDate): LeaveBalance {
  const now = today || getTodayJalali();
  const currentYear = now.year;
  const prevYear = currentYear - 1;

  const prev = computeYearBalance(employee, requests, prevYear, 0);
  const prevUnused = Math.max(0, prev.entitlementDays + prev.carryoverDays - prev.usedDays);
  const carryover = Math.min(prevUnused, ANNUAL_LEAVE_MAX_CARRYOVER_DAYS);
  const current = computeYearBalance(employee, requests, currentYear, carryover);

  return {
    employeeId: employee.id,
    employeeName: employee.fullName,
    currentYear,
    years: { [prevYear]: prev, [currentYear]: current },
    remainingNow: current.remainingDays,
  };
}

export function computeAllLeaveBalances(employees: Employee[], requests: LeaveRequest[], today?: JalaliDate): LeaveBalance[] {
  const day = today || getTodayJalali();
  return employees.map((e) => computeLeaveBalance(e, requests, day));
}

// ---------------------------------------------------------------------------
// Request validation (audit LEA-02: negative days, garbage dates, end<start,
// 999-day requests were all accepted before).
// ---------------------------------------------------------------------------
export interface LeaveValidationResult {
  ok: boolean;
  error?: string;
  /** Server-authoritative working-day count derived from the date range. */
  daysCount?: number;
  start?: JalaliDate;
  end?: JalaliDate;
}

export function validateLeaveRequest(
  employee: Employee,
  leaveType: LeaveType,
  startDateJalali: string,
  endDateJalali: string,
  requestedDays: unknown,
  allRequests: LeaveRequest[],
  today?: JalaliDate
): LeaveValidationResult {
  const start = parseJalaliDateString(startDateJalali);
  const end = parseJalaliDateString(endDateJalali);
  if (!start) return { ok: false, error: 'تاریخ شروع نامعتبر است (قالب معتبر: ۱۴۰۳/۰۶/۱۵)' };
  if (!end) return { ok: false, error: 'تاریخ پایان نامعتبر است (قالب معتبر: ۱۴۰۳/۰۶/۱۵)' };
  if (compareJalali(end, start) < 0) {
    return { ok: false, error: 'تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد' };
  }

  const workingDays = countWorkingDaysInclusive(start, end);
  if (workingDays < 0) return { ok: false, error: 'بازه زمانی درخواست نامعتبر یا بیش از حد طولانی است' };

  // The server derives the authoritative day count from the dates; the client
  // value is only accepted when it matches (or for hourly leave expressed as
  // a fraction of a day within the same working day).
  let daysCount = workingDays;
  const requested = typeof requestedDays === 'number' ? requestedDays : parseFloat(String(requestedDays ?? ''));
  if (leaveType === LeaveType.HOURLY) {
    if (!Number.isFinite(requested) || requested <= 0) {
      return { ok: false, error: 'مقدار مرخصی ساعتی باید عددی مثبت بر حسب روز (کسری از روز کاری) باشد' };
    }
    if (requested > workingDays) {
      return { ok: false, error: `مرخصی ساعتی نمی‌تواند از ${workingDays} روز کاری بازه انتخابی بیشتر باشد` };
    }
    daysCount = Math.round(requested * 100) / 100;
  } else {
    if (Number.isFinite(requested) && requested > 0 && Math.abs(requested - workingDays) > 0.01) {
      // Mismatch: trust the dates, but surface the correction to the caller.
      daysCount = workingDays;
    }
    if (daysCount <= 0) {
      return { ok: false, error: 'بازه انتخابی شامل روز کاری نیست (جمعه‌ها روز کاری محسوب نمی‌شوند)' };
    }
  }

  // Marriage leave: statutory 3 paid days (Art. 73).
  if (leaveType === LeaveType.MARRIAGE && daysCount > MARRIAGE_LEAVE_DAYS) {
    return { ok: false, error: `مرخصی ازدواج مطابق ماده ۷۳ قانون کار حداکثر ${MARRIAGE_LEAVE_DAYS} روز است` };
  }

  // Annual/hourly quota check — a request may not exceed the remaining
  // statutory entitlement (this is the "illegal amount of leave" guard).
  if (QUOTA_TYPES.has(leaveType)) {
    const balance = computeLeaveBalance(employee, allRequests, today);
    const yearOfStart = start.year;
    const yearBal = balance.years[yearOfStart];
    // Requests spanning year boundaries are validated against the start year.
    if (yearBal) {
      const remainingBeforeRequest = yearBal.remainingDays;
      if (daysCount > remainingBeforeRequest) {
        return {
          ok: false,
          error: `مانده مرخصی استحقاقی شما در سال ${yearOfStart} برابر ${remainingBeforeRequest} روز کاری است و درخواست ${daysCount} روز قابل ثبت نیست (سقف قانونی ماده ۶۴). در صورت نیاز، مرخصی بدون حقوق درخواست دهید.`,
        };
      }
    } else if (yearOfStart !== balance.currentYear) {
      // A past year with no balance row (pre-hire) — reject.
      return { ok: false, error: 'بازه زمانی درخواست خارج از دوره اشتغال شماست' };
    }
  }

  return { ok: true, daysCount, start, end };
}
