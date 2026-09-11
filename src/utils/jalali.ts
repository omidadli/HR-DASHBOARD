/**
 * Jalali (Shamsi / Persian) Calendar & Formatting Engine
 * Complete implementation for Gregorian-to-Jalali conversion,
 * Persian month days, leap year calculation, Persian numbers, and Rial/Toman formatters.
 */

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const JALALI_WEEK_DAYS = [
  { key: 6, short: 'ش', name: 'شنبه' },
  { key: 0, short: 'ی', name: 'یکشنبه' },
  { key: 1, short: 'د', name: 'دوشنبه' },
  { key: 2, short: 'س', name: 'سه‌شنبه' },
  { key: 3, short: 'چ', name: 'چهارشنبه' },
  { key: 4, short: 'پ', name: 'پنج‌شنبه' },
  { key: 5, short: 'ج', name: 'جمعه' },
];

export interface JalaliDate {
  year: number;
  month: number; // 1 - 12
  day: number;   // 1 - 31
}

/**
 * Checks if a Jalali year is a leap year (سال کبیسه)
 */
export function isJalaliLeapYear(jy: number): boolean {
  // Leap calculation ported from the well-tested jalCal algorithm
  // (same leap table as the official Iranian calendar:
  // ..., 1395, 1399, 1403, 1408, 1412, 1416, 1420, ...).
  // A year is leap when `leap === 0`.
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const bl = breaks.length;
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < bl; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (jy < jm) break;
    jp = jm;
  }
  let n = jy - jp;
  // Find how many years have passed since the last leap year.
  if (jump - n < 6) {
    n = n - jump + Math.floor((jump + 4) / 33) * 33;
  }
  const mod = (a: number, b: number): number => a - Math.trunc(a / b) * b;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }
  return leap === 0;
}

/**
 * Returns the number of days in a given Jalali month
 */
export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

/**
 * Converts Gregorian Date to Jalali Date (Solar Hijri)
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    (365 * gy) +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) +
    gd +
    g_d_m[gm - 1];
  let jy = -1595 + (33 * Math.floor(days / 12053));
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let jm: number;
  let jd: number;
  if (days < 186) {
    jm = 1 + Math.floor(days / 31);
    jd = 1 + (days % 31);
  } else {
    jm = 7 + Math.floor((days - 186) / 30);
    jd = 1 + ((days - 186) % 30);
  }
  return { year: jy, month: jm, day: jd };
}

/**
 * Converts Jalali Date to Gregorian Date
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { year: number; month: number; day: number } {
  let jy_adj = jy + 1595;
  let days =
    -355668 +
    (365 * jy_adj) +
    (Math.floor(jy_adj / 33) * 8) +
    Math.floor(((jy_adj % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm: number;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) {
    gd -= sal_a[gm];
  }
  return { year: gy, month: gm, day: gd };
}

/**
 * Returns current Jalali Date
 */
export function getTodayJalali(now?: Date): JalaliDate {
  const d = now || new Date();
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formats a JalaliDate to standard string (e.g. ۱۴۰۳/۰۶/۱۵ or 1403/06/15)
 */
export function formatJalaliDate(jDate: JalaliDate, toPersian: boolean = true): string {
  const mm = String(jDate.month).padStart(2, '0');
  const dd = String(jDate.day).padStart(2, '0');
  const raw = `${jDate.year}/${mm}/${dd}`;
  return toPersian ? toPersianDigits(raw) : raw;
}

/**
 * Returns human readable Persian date string e.g. "۱۵ شهریور ۱۴۰۳"
 */
export function formatJalaliDateReadable(jDate: JalaliDate): string {
  const monthName = JALALI_MONTH_NAMES[jDate.month - 1] || '';
  return `${toPersianDigits(jDate.day)} ${monthName} ${toPersianDigits(jDate.year)}`;
}

/**
 * Converts English digits to Persian digits (0-9 -> ۰-۹)
 */
export function toPersianDigits(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  const str = String(input);
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w, 10)]);
}

/**
 * Converts Persian digits to English digits
 */
export function toEnglishDigits(input: string): string {
  const persianMap: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  };
  return input.replace(/[۰-۹]/g, (w) => persianMap[w] || w);
}

/**
 * Formats a numeric amount into Persian Toman with thousands separators
 * e.g. 35000000 -> "۳۵,۰۰۰,۰۰۰ تومان"
 */
export function formatToman(amount: number | string | bigint | undefined | null): string {
  if (amount === undefined || amount === null) return '۰ تومان';
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  if (isNaN(num) || num === 0) return '۰ تومان';
  const formatted = num.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} تومان`;
}

/**
 * Formats a numeric amount into Persian Rial
 */
export function formatRial(amount: number | string | bigint | undefined | null): string {
  if (amount === undefined || amount === null) return '۰ ریال';
  const num = typeof amount === 'bigint' ? Number(amount) : Number(amount);
  if (isNaN(num)) return '۰ ریال';
  const formatted = num.toLocaleString('en-US');
  return `${toPersianDigits(formatted)} ریال`;
}

/**
 * Calculates start weekday of a Jalali month (0 = Shanbeh, 6 = Jomeh)
 */
export function getJalaliMonthStartWeekday(jy: number, jm: number): number {
  const g = jalaliToGregorian(jy, jm, 1);
  const gDate = new Date(g.year, g.month - 1, g.day);
  const gDay = gDate.getDay(); // 0 = Sunday, 6 = Saturday
  // In Persian calendar: Saturday (6) is index 0
  return (gDay + 1) % 7;
}

// =============================================================================
// Business-logic date utilities (parsing, working-day math, "now" stamps)
// Added by the product audit fixes: the backend previously stored Jalali dates
// as display strings and never parsed them, so no date arithmetic existed.
// =============================================================================

/**
 * Parses a Jalali date string ("1403/06/15", "۱۴۰۳/۰۶/۱۵", "1403-6-5")
 * into parts. Returns null for anything that is not a valid Jalali calendar
 * date (month 1-12, day 1..monthDays including leap-year Esfand rules).
 */
export function parseJalaliDateString(input: string | null | undefined): JalaliDate | null {
  if (!input || typeof input !== 'string') return null;
  const normalized = toEnglishDigits(input.trim()).replace(/-/g, '/');
  const m = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (year < 1300 || year > 1500) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > getJalaliMonthDays(year, month)) return null;
  return { year, month, day };
}

/** Formats Jalali parts back to the canonical Persian-digit string (۱۴۰۳/۰۶/۱۵). */
export function toJalaliDateString(jy: number, jm: number, jd: number): string {
  return toPersianDigits(`${jy}/${String(jm).padStart(2, '0')}/${String(jd).padStart(2, '0')}`);
}

/** Current Jalali date as canonical Persian-digit string (replaces all hardcoded ۱۴۰۳/۰۶/۱۵ stamps). */
export function nowJalaliString(now?: Date): string {
  const t = getTodayJalali(now);
  return toJalaliDateString(t.year, t.month, t.day);
}

/** Compares two Jalali dates: -1 / 0 / 1 (assumes valid parts). */
export function compareJalali(a: JalaliDate, b: JalaliDate): number {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1;
  if (a.month !== b.month) return a.month < b.month ? -1 : 1;
  if (a.day !== b.day) return a.day < b.day ? -1 : 1;
  return 0;
}

/** Adds (or subtracts) calendar days to a Jalali date via the Gregorian bridge. */
export function addJalaliDays(j: JalaliDate, days: number): JalaliDate {
  const g = jalaliToGregorian(j.year, j.month, j.day);
  const d = new Date(g.year, g.month - 1, g.day);
  d.setDate(d.getDate() + days);
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Counts WORKING days between two Jalali dates, INCLUSIVE of both ends,
 * excluding Fridays (جمعه). Official holidays are NOT yet modeled — the
 * product has no holiday calendar (flagged in the audit report, LOC/C-3).
 * Returns -1 for invalid input or end < start, and guards against absurd spans.
 */
export function countWorkingDaysInclusive(start: JalaliDate, end: JalaliDate): number {
  if (compareJalali(end, start) < 0) return -1;
  const gs = jalaliToGregorian(start.year, start.month, start.day);
  const ge = jalaliToGregorian(end.year, end.month, end.day);
  const ds = new Date(gs.year, gs.month - 1, gs.day);
  const de = new Date(ge.year, ge.month - 1, ge.day);
  const spanDays = Math.round((de.getTime() - ds.getTime()) / 86400000) + 1;
  if (spanDays > 3660) return -1; // >10 years: reject to prevent abuse
  let count = 0;
  const cur = new Date(ds);
  while (cur <= de) {
    if (cur.getDay() !== 5) count += 1; // 5 = Friday
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

/** Convenience: parse two Jalali strings and count working days (or -1). */
export function workingDaysBetweenJalaliStrings(startStr: string, endStr: string): number {
  const s = parseJalaliDateString(startStr);
  const e = parseJalaliDateString(endStr);
  if (!s || !e) return -1;
  return countWorkingDaysInclusive(s, e);
}

/**
 * Validates an Iranian national ID (کد ملی) — 10 digits with the standard
 * check digit. Accepts Persian or Latin digits. Empty/padded-identical
 * digits (e.g. 0000000000) are rejected.
 */
export function isValidIranianNationalId(input: string | null | undefined): boolean {
  if (!input) return false;
  const digits = toEnglishDigits(String(input).trim()).replace(/\s/g, '');
  if (!/^\d{10}$/.test(digits)) return false;
  if (/^(\d)\1{9}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i += 1) sum += parseInt(digits[i], 10) * (10 - i);
  const remainder = sum % 11;
  const check = parseInt(digits[9], 10);
  return (remainder < 2 && check === remainder) || (remainder >= 2 && check === 11 - remainder);
}

