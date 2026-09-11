/**
 * Statutory configuration for Iranian payroll & leave, per Jalali year.
 *
 * WHY THIS FILE EXISTS (audit findings PAY-02/PAY-03/LOC-03):
 * All labor-law-derived numbers were previously hardcoded to the 1403 circular
 * inside the payroll generator, could not be updated when regulations change,
 * and were used for ANY requested year (1300–1500). They are now centralized,
 * keyed by Jalali year, with sources cited. Adding a new year = adding one
 * entry here when the Supreme Labor Council / tax authority publish it.
 *
 * Units: ALL amounts are in TOMAN (the rest of the app stores Toman).
 * Circulars publish Rial — values below are Rial/10.
 *
 * Sources (verified 2026-09):
 * - Wage items 1403/1404/1405: Supreme Labor Council decrees, compiled by
 *   e-estekhdam.com/salary (min daily 2,388,728 / 3,463,656 / 5,541,850 Rial).
 * - Salary tax tables: 1403 Budget Law (exempt 12M Toman/month, top 25%),
 *   1404 Budget Law (exempt 24M, top 30% > 66.67M),
 *   1405 Budget Law (exempt 40M, 10% 40–80M … 30% > 140M).
 * - Eidi: ماده واحده قانون عیدی و پاداش — 60 days' wage minimum, capped at
 *   90 days' MINIMUM wage (3 × minMonthlyToman).
 * - SSO worker share: 7% (Art. 36 Social Security Law). Child allowance
 *   (حق اولاد, Art. 86) is a family benefit: EXEMPT from SSO contributions
 *   and from income tax; payable only with ≥720 days of contribution history.
 * - Overtime premium: Art. 59 Labor Law — 40% surcharge (×1.4 hourly).
 */

export interface TaxBracket {
  /** Upper bound of the bracket in Toman/month (exclusive); Infinity for the top. */
  upTo: number;
  rate: number;
}

export interface StatutoryYearConfig {
  yearJalali: number;
  /** حداقل دستمزد ماهانه (Toman) — basis for the eidi ceiling. */
  minMonthlyWageToman: number;
  minDailyWageToman: number;
  /** حق مسکن مصوب (Toman/month). */
  housingAllowanceToman: number;
  /** بن خواربار / کمک‌هزینه اقلام مصرفی (Toman/month). */
  bonKargariToman: number;
  /** حق اولاد per child (Toman/month) = 3 × min daily wage. */
  childAllowancePerChildToman: number;
  /** پایه سنوات روزانه (Toman/month) — mandatory for staff with ≥1 year of service. */
  seniorityBaseToman: number;
  /** حق تأهل (Toman/month) — married workers (present in 1403+ decrees). */
  marriageAllowanceToman: number;
  /** Minimum SSO contribution days required for child allowance (Art. 86). */
  childAllowanceMinSsoDays: number;
  ssoWorkerShareRate: number; // 0.07
  overtimeMultiplier: number; // 1.4 (Art. 59)
  /** Working hours per day for hourly-rate derivation (44h week / 6 days). */
  dailyWorkingHours: number; // 7.33
  taxBrackets: TaxBracket[];
  sourceNote: string;
}

const BRACKETS_1403: TaxBracket[] = [
  { upTo: 12_000_000, rate: 0 },
  { upTo: 16_666_667, rate: 0.10 },
  { upTo: 27_000_000, rate: 0.15 },
  { upTo: 33_333_333, rate: 0.20 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.25 },
];

const BRACKETS_1404: TaxBracket[] = [
  { upTo: 24_000_000, rate: 0 },
  { upTo: 30_000_000, rate: 0.10 },
  { upTo: 38_000_000, rate: 0.15 },
  { upTo: 50_000_000, rate: 0.20 },
  { upTo: 66_666_667, rate: 0.25 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.30 },
];

const BRACKETS_1405: TaxBracket[] = [
  { upTo: 40_000_000, rate: 0 },
  { upTo: 80_000_000, rate: 0.10 },
  { upTo: 100_000_000, rate: 0.15 },
  { upTo: 120_000_000, rate: 0.20 },
  { upTo: 140_000_000, rate: 0.25 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.30 },
];

export const STATUTORY_CONFIGS: Record<number, StatutoryYearConfig> = {
  1403: {
    yearJalali: 1403,
    minMonthlyWageToman: 7_166_184,
    minDailyWageToman: 238_872.8,
    housingAllowanceToman: 900_000,
    bonKargariToman: 1_400_000,
    childAllowancePerChildToman: 716_618,
    seniorityBaseToman: 210_000,
    marriageAllowanceToman: 500_000,
    childAllowanceMinSsoDays: 720,
    ssoWorkerShareRate: 0.07,
    overtimeMultiplier: 1.4,
    dailyWorkingHours: 7.33,
    taxBrackets: BRACKETS_1403,
    sourceNote: 'بخشنامه دستمزد ۱۴۰۳ شورای عالی کار + قانون بودجه ۱۴۰۳ (معافیت مالیاتی ۱۲ میلیون تومان در ماه)',
  },
  1404: {
    yearJalali: 1404,
    minMonthlyWageToman: 10_390_968,
    minDailyWageToman: 346_365.6,
    housingAllowanceToman: 900_000,
    bonKargariToman: 2_200_000,
    childAllowancePerChildToman: 1_039_097,
    seniorityBaseToman: 282_000,
    marriageAllowanceToman: 500_000,
    childAllowanceMinSsoDays: 720,
    ssoWorkerShareRate: 0.07,
    overtimeMultiplier: 1.4,
    dailyWorkingHours: 7.33,
    taxBrackets: BRACKETS_1404,
    sourceNote: 'بخشنامه دستمزد ۱۴۰۴ شورای عالی کار + قانون بودجه ۱۴۰۴ (معافیت مالیاتی ۲۴ میلیون تومان در ماه)',
  },
  1405: {
    yearJalali: 1405,
    minMonthlyWageToman: 16_625_550,
    minDailyWageToman: 554_185,
    housingAllowanceToman: 3_000_000,
    bonKargariToman: 2_200_000,
    childAllowancePerChildToman: 1_662_555,
    seniorityBaseToman: 500_000,
    marriageAllowanceToman: 500_000,
    childAllowanceMinSsoDays: 720,
    ssoWorkerShareRate: 0.07,
    overtimeMultiplier: 1.4,
    dailyWorkingHours: 7.33,
    taxBrackets: BRACKETS_1405,
    sourceNote: 'بخشنامه دستمزد ۱۴۰۵ شورای عالی کار + قانون بودجه ۱۴۰۵ (معافیت مالیاتی ۴۰ میلیون تومان در ماه)',
  },
};

export const STATUTORY_YEARS = Object.keys(STATUTORY_CONFIGS).map(Number).sort();

export function getStatutoryConfig(yearJalali: number): StatutoryYearConfig | null {
  return STATUTORY_CONFIGS[yearJalali] || null;
}

/** Annual leave entitlement: 26 working days per year (Art. 64 Labor Law). */
export const ANNUAL_LEAVE_WORKING_DAYS = 26;
/** Max carry-over of unused annual leave (Art. 66 Labor Law). */
export const ANNUAL_LEAVE_MAX_CARRYOVER_DAYS = 9;
/** Paid marriage leave: 3 days (Art. 73 Labor Law). */
export const MARRIAGE_LEAVE_DAYS = 3;

/**
 * Progressive monthly salary tax. The taxable base must ALREADY exclude the
 * exempt items (child allowance) and the worker's 7% SSO share — the old code
 * subtracted the exemption a second time inside this function (audit PAY-01).
 */
export function computeMonthlyIncomeTax(taxableToman: number, brackets: TaxBracket[]): number {
  if (!(taxableToman > 0)) return 0;
  let tax = 0;
  let prevLimit = 0;
  for (const b of brackets) {
    const portion = Math.min(taxableToman, b.upTo) - prevLimit;
    if (portion > 0) tax += portion * b.rate;
    prevLimit = b.upTo;
    if (taxableToman <= b.upTo) break;
  }
  return Math.round(tax);
}
