/**
 * Payroll calculation engine (audit fixes PAY-01 … PAY-09).
 *
 * What changed vs. the old inline generator in server.ts:
 * - PAY-01: the tax exemption is applied exactly ONCE (brackets start at the
 *   statutory exemption; taxable base = taxable gross − worker's 7% SSO share).
 * - PAY-02/03: every statutory number comes from server/statutory.ts keyed by
 *   the payroll's Jalali year (1403/1404/1405 configured); unknown years are
 *   rejected instead of silently using stale constants.
 * - PAY-04: employees hired after the period start are skipped; mid-month
 *   hires are pro-rated by payable calendar days; RESIGNED employees are not
 *   paid; approved UNPAID leave overlapping the period reduces payable days.
 * - PAY-05: overtime is computed from REAL attendance records for the period
 *   at the employee's hourly wage × 1.4 (Art. 59) — the flat 2.5M fabrication
 *   is gone. Commute allowance is a per-employee benefit (default 0), not a
 *   universal constant.
 * - PAY-06: eidi reserve is capped at 90 days' minimum wage (3 × statutory
 *   minimum monthly wage of the year) per the عیدی و پاداش single-article law.
 * - PAY-07: SSO 7% base EXCLUDES child allowance (Art. 86 family benefit —
 *   exempt from contributions). Base/housing/bon/seniority/marriage/overtime
 *   are insurable per current SSO practice; commute is excluded (disputed —
 *   documented, decision D6 in the report).
 * - PAY-08: child allowance requires ≥720 days of SSO contribution history
 *   (Art. 86). Employees lack the history field → treated as 0 → not paid
 *   until HR records it (legally correct default; flagged, not silent).
 * - PAY-09 (pending decision D3): sanavat/eidi wage basis remains the BASE
 *   salary (the current implemented rule). The right of Administrative Justice
 *   oscillated between base-only and full حق‌السعی; changing the basis is a
 *   product-owner decision and is NOT made silently here.
 *
 * New statutory items now paid (were missing entirely — PAY-03):
 * - پایه سنوات (seniority base) for staff with ≥1 year of service.
 * - حق تأهل (marriage allowance) for married staff.
 */
import {
  AttendanceRecord,
  Employee,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  PayrollSlip,
  PayrollStatus,
} from '../src/types';
import {
  JalaliDate,
  parseJalaliDateString,
  compareJalali,
  getJalaliMonthDays,
  isJalaliLeapYear,
  jalaliToGregorian,
  nowJalaliString,
  toJalaliDateString,
  JALALI_MONTH_NAMES,
} from '../src/utils/jalali';
import { StatutoryYearConfig, computeMonthlyIncomeTax } from './statutory';

export interface PayrollGenerationResult {
  slips: PayrollSlip[];
  skipped: Array<{ employeeId: string; employeeName: string; reason: string }>;
}

function gregorianOf(j: JalaliDate): Date {
  const g = jalaliToGregorian(j.year, j.month, j.day);
  return new Date(g.year, g.month - 1, g.day);
}

/** Calendar days between two Jalali dates, inclusive. */
function daysInclusive(a: JalaliDate, b: JalaliDate): number {
  return Math.round((gregorianOf(b).getTime() - gregorianOf(a).getTime()) / 86400000) + 1;
}

/**
 * Unpaid-leave WORKING days overlapping a Jalali month [monthStart..monthEnd].
 * Only APPROVED UNPAID requests reduce pay (audit PAY-04).
 */
function unpaidDaysInMonth(employeeId: string, requests: LeaveRequest[], year: number, month: number): number {
  const monthStart: JalaliDate = { year, month, day: 1 };
  const monthEnd: JalaliDate = { year, month, day: getJalaliMonthDays(year, month) };
  let total = 0;
  for (const req of requests) {
    if (req.employeeId !== employeeId) continue;
    if (req.leaveType !== LeaveType.UNPAID) continue;
    if (req.status !== LeaveStatus.APPROVED) continue;
    const s = parseJalaliDateString(req.startDateJalali);
    const e = parseJalaliDateString(req.endDateJalali);
    if (!s || !e) continue;
    const from = compareJalali(s, monthStart) < 0 ? monthStart : s;
    const to = compareJalali(e, monthEnd) > 0 ? monthEnd : e;
    if (compareJalali(to, from) < 0) continue;
    // Count non-Friday days in the overlap.
    const cur = gregorianOf(from);
    const end = gregorianOf(to);
    while (cur <= end) {
      if (cur.getDay() !== 5) total += 1;
      cur.setDate(cur.getDate() + 1);
    }
  }
  return total;
}

/** Real overtime hours recorded for an employee within a Jalali month. */
function overtimeHoursInMonth(
  employeeId: string,
  attendances: AttendanceRecord[],
  year: number,
  month: number
): number {
  let hours = 0;
  for (const rec of attendances) {
    if (rec.employeeId !== employeeId) continue;
    const d = parseJalaliDateString(rec.dateJalali);
    if (!d || d.year !== year || d.month !== month) continue;
    const h = Number(rec.overtimeHours);
    if (Number.isFinite(h) && h > 0) hours += h;
  }
  return Math.round(hours * 100) / 100;
}

export function generatePayrollSlips(
  employees: Employee[],
  cfg: StatutoryYearConfig,
  yearJalali: number,
  monthJalali: number,
  leaveRequests: LeaveRequest[],
  attendances: AttendanceRecord[],
  existingSlips: PayrollSlip[]
): PayrollGenerationResult {
  const monthDays = getJalaliMonthDays(yearJalali, monthJalali);
  const monthStart: JalaliDate = { year: yearJalali, month: monthJalali, day: 1 };
  const monthEnd: JalaliDate = { year: yearJalali, month: monthJalali, day: monthDays };
  const monthName = JALALI_MONTH_NAMES[monthJalali - 1];

  // Period lock (PAY-04): a period containing PAID slips is immutable;
  // FINALIZED slips can only be regenerated with an explicit force flag,
  // handled by the caller (which filters them out before calling this).
  const slips: PayrollSlip[] = [];
  const skipped: PayrollGenerationResult['skipped'] = [];

  for (const emp of employees) {
    if (emp.status === 'RESIGNED') {
      skipped.push({ employeeId: emp.id, employeeName: emp.fullName, reason: 'همکار قطع همکاری کرده است (RESIGNED) — فیش صادر نشد' });
      continue;
    }
    if (!(Number(emp.baseSalaryToman) > 0)) {
      // Fresh hires from the recruitment pipeline land with no salary until HR
      // completes their record — never fabricate a wage.
      skipped.push({ employeeId: emp.id, employeeName: emp.fullName, reason: 'حقوق پایه در پرونده ثبت نشده است — ابتدا رکورد پرسنلی تکمیل شود' });
      continue;
    }

    // Hire-date eligibility & proration (PAY-04).
    const hire = parseJalaliDateString(emp.hireDateJalali);
    let payableDays = monthDays;
    if (hire) {
      if (compareJalali(hire, monthEnd) > 0) {
        skipped.push({ employeeId: emp.id, employeeName: emp.fullName, reason: `تاریخ استخدام (${emp.hireDateJalali}) پس از دوره کارکرد است — فیش صادر نشد` });
        continue;
      }
      if (compareJalali(hire, monthStart) > 0) {
        payableDays = daysInclusive(hire, monthEnd); // mid-month hire
      }
    }

    // Approved unpaid leave reduces payable working days.
    const unpaidDays = unpaidDaysInMonth(emp.id, leaveRequests, yearJalali, monthJalali);
    payableDays = Math.max(0, payableDays - unpaidDays);
    if (payableDays === 0) {
      skipped.push({ employeeId: emp.id, employeeName: emp.fullName, reason: 'کل دوره مرخصی بدون حقوق تایید‌شده است — فیش صفر صادر نشد' });
      continue;
    }
    const prorate = payableDays / monthDays;

    // ---- Earnings ----
    const baseSalary = Math.round(emp.baseSalaryToman * prorate);
    const housing = Math.round(cfg.housingAllowanceToman * prorate);
    const bonKargari = Math.round(cfg.bonKargariToman * prorate);

    // Seniority base (پایه سنوات): ≥1 year of service at period end.
    let seniority = 0;
    if (hire) {
      const oneYearBeforeEnd: JalaliDate = { year: yearJalali - 1, month: monthEnd.month, day: monthEnd.day };
      if (compareJalali(hire, oneYearBeforeEnd) <= 0) seniority = Math.round(cfg.seniorityBaseToman * prorate);
    }

    // Marriage allowance (حق تأهل): married staff.
    const marriage = emp.maritalStatus === 'MARRIED' ? Math.round(cfg.marriageAllowanceToman * prorate) : 0;

    // Child allowance (PAY-08): per child, ONLY with ≥720 days SSO history.
    const ssoDays = Number((emp as any).ssoContributionDays ?? 0);
    const childEligible = ssoDays >= cfg.childAllowanceMinSsoDays;
    const childAllowance = childEligible ? Math.round(cfg.childAllowancePerChildToman * emp.childrenCount * prorate) : 0;

    // Commute: per-employee benefit (default 0), no longer a universal constant.
    const commute = Math.round(Number((emp as any).commuteAllowanceToman ?? 0) * prorate);

    // Overtime (PAY-05): real hours × hourly wage × 1.4.
    const otHours = overtimeHoursInMonth(emp.id, attendances, yearJalali, monthJalali);
    const hourlyWage = emp.baseSalaryToman / monthDays / cfg.dailyWorkingHours;
    const overtimePay = Math.round(otHours * hourlyWage * cfg.overtimeMultiplier);

    const gross = baseSalary + housing + bonKargari + seniority + marriage + childAllowance + commute + overtimePay;

    // ---- Deductions ----
    // SSO 7% (PAY-07): child allowance is EXEMPT (family benefit, Art. 86);
    // commute excluded (disputed, D6); everything else insurable.
    const insurable = gross - childAllowance - commute;
    const sso7 = Math.round(insurable * cfg.ssoWorkerShareRate);

    // Income tax (PAY-01): exemption applied ONCE via the year's brackets.
    // Taxable base = gross − exempt child allowance − worker's SSO share
    // (the 7% contribution is tax-deductible).
    const taxable = Math.max(0, gross - childAllowance - sso7);
    const tax = computeMonthlyIncomeTax(taxable, cfg.taxBrackets);

    const net = gross - sso7 - tax;

    // ---- Reserves ----
    // Sanavat: one month's wage per year of service → monthly reserve.
    // Basis = base salary (decision D3 pending; unchanged rule, flagged).
    const sanavat = Math.round(baseSalary / 12);
    // Eidi (PAY-06): 2 months' wage per year, CAPPED at 90 days' minimum wage
    // (3 × statutory minimum monthly wage of the year).
    const eidiAnnualUncapped = baseSalary * 2;
    const eidiCap = cfg.minMonthlyWageToman * 3 * prorate; // cap scales with partial period
    const eidiAnnual = Math.min(eidiAnnualUncapped, eidiCap);
    const eidi = Math.round(eidiAnnual / 12);

    slips.push({
      id: `pay-${emp.id}-${yearJalali}-${monthJalali}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      personnelCode: emp.personnelCode,
      monthJalali,
      monthName,
      yearJalali,
      baseSalaryToman: baseSalary,
      housingAllowanceToman: housing,
      bonKargariToman: bonKargari,
      childAllowanceToman: childAllowance,
      commuteAllowanceToman: commute,
      overtimePayToman: overtimePay,
      grossSalaryToman: gross,
      ssoInsurance7PctToman: sso7,
      incomeTaxToman: tax,
      otherDeductionsToman: 0,
      netSalaryToman: net,
      sanavatReserveToman: sanavat,
      eidiReserveToman: eidi,
      status: PayrollStatus.DRAFT, // PAY-10: lifecycle now real — DRAFT → FINALIZED → PAID
      paidAtJalali: undefined,
      // Extended metadata for transparency (kept additive; PayrollSlip type
      // gains optional fields).
      seniorityBaseToman: seniority,
      marriageAllowanceToman: marriage,
      overtimeHours: otHours,
      payableDays,
      unpaidLeaveDays: unpaidDays,
      statutoryYearNote: cfg.sourceNote,
      generatedAtJalali: nowJalaliString(),
    } as PayrollSlip);
  }

  return { slips, skipped };
}

/** Helper for the UI: canonical Jalali string for "today" (real date, not ۱۴۰۳). */
export { nowJalaliString, toJalaliDateString };
