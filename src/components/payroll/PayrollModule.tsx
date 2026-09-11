/**
 * Payroll module — Redesigned enterprise payroll interface for Seilane Sabz HRMS
 * 
 * Features:
 * - Period selector as an interactive Jalali month picker; locked periods (finalized/paid)
 *   show a lock icon and disabled actions with explanatory tooltip.
 * - Payslip list: responsive table with employee, gross/net in Persian digits, status lifecycle
 *   chips (پیش‌نویس = neutral, نهایی = info-soft, پرداخت‌شده = success-soft) and per-row actions
 *   gated by status and role.
 * - Payslip detail: authentic enterprise document-style card that looks like a real فیش حقوقی
 *   (company header, two-column layout of مزایا vs کسورات with highlighted net line, print/PDF
 *   friendly styling in both themes, Persian-digit amounts throughout).
 * - Batch actions toolbar: appears only when rows are selected; destructive actions require
 *   the confirm modal pattern.
 * - 100% Persian typography & digits with strict Iranian Labor Law transparency.
 */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Employee, PayrollSlip, PayrollStatus, UserRole } from '../../types';
import { toPersianDigits, formatToman } from '../../utils/jalali';
import {
  Calculator,
  Eye,
  Lock,
  CheckCircle2,
  FileCheck2,
  Banknote,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Printer,
  Layers,
  AlertTriangle,
  X,
  Check,
  Building2,
  HelpCircle,
  ShieldCheck,
  FileText,
} from 'lucide-react';

const MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const SEASONS = [
  { name: 'بهار', months: [1, 2, 3] },
  { name: 'تابستان', months: [4, 5, 6] },
  { name: 'پاییز', months: [7, 8, 9] },
  { name: 'زمستان', months: [10, 11, 12] },
];

const STATUS_META: Record<PayrollStatus, { label: string; chipClass: string; dotClass: string }> = {
  [PayrollStatus.DRAFT]: {
    label: 'پیش‌نویس',
    chipClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dotClass: 'bg-slate-400',
  },
  [PayrollStatus.FINALIZED]: {
    label: 'نهایی‌شده',
    chipClass: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    dotClass: 'bg-sky-500',
  },
  [PayrollStatus.PAID]: {
    label: 'پرداخت‌شده',
    chipClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    dotClass: 'bg-emerald-500',
  },
};

interface PayrollModuleProps {
  payrollSlips: PayrollSlip[];
  currentRole: UserRole;
  employees: Employee[];
  onGeneratePayroll: (monthJalali: number, yearJalali: number) => void;
  onFinalizePayroll: (yearJalali: number, monthJalali: number) => void;
  onMarkPaid: (yearJalali: number, monthJalali: number) => void;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => void;
}

/** Generates clean printable HTML for single or batch payslips */
function printSlips(slips: PayrollSlip[], employees: Employee[]) {
  if (!slips.length) return;

  const renderSingleSlipHtml = (slip: PayrollSlip, index: number) => {
    const emp = employees.find((e) => e.id === slip.employeeId);
    const row = (label: string, value: string) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;color:#334155;">${label}</td><td style="padding:6px 10px;border-bottom:1px solid #e2e8f0;font-weight:700;text-align:left;color:#0f172a;">${value}</td></tr>`;

    return `
    <div class="payslip-page ${index < slips.length - 1 ? 'page-break' : ''}">
      <div class="header">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:16px;font-weight:900;color:#065f46;">هلدینگ دارویی، بهداشتی و آرایشی سیلانه سبز</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">برندهای تجاری: دافی (Dafi) • کامان (Come'on) • میسویک (Misswake)</div>
          </div>
          <div style="text-align:left;">
            <div style="font-size:14px;font-weight:800;color:#1e293b;">فیش حقوق و دستمزد</div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;">دوره: ${slip.monthName} ${toPersianDigits(slip.yearJalali)}</div>
          </div>
        </div>

        <div style="margin-top:14px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;font-size:11px;">
          <div><strong>نام و نام خانوادگی:</strong> ${slip.employeeName || '—'}</div>
          <div><strong>کد پرسنلی:</strong> ${toPersianDigits(slip.personnelCode || '—')}</div>
          <div><strong>دپارتمان:</strong> ${emp?.department || '—'}</div>
          <div><strong>سمت:</strong> ${emp?.jobTitle || '—'}</div>
          <div><strong>وضعیت:</strong> ${STATUS_META[slip.status]?.label || slip.status}</div>
          <div><strong>کارکرد موظف:</strong> ${slip.payableDays !== undefined ? `${toPersianDigits(slip.payableDays)} روز` : '۳۰ روز کامل'}</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;">
        <!-- Earnings -->
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr><th colspan="2" style="background:#ecfdf5;color:#065f46;text-align:right;padding:8px 10px;border-bottom:2px solid #a7f3d0;">حقوق و مزایا (تومان)</th></tr>
          </thead>
          <tbody>
            ${row('حقوق پایه', formatToman(slip.baseSalaryToman))}
            ${row('حق مسکن', formatToman(slip.housingAllowanceToman))}
            ${row('بن خواربار', formatToman(slip.bonKargariToman))}
            ${slip.seniorityBaseToman ? row('پایه سنوات', formatToman(slip.seniorityBaseToman)) : ''}
            ${slip.marriageAllowanceToman ? row('حق تأهل', formatToman(slip.marriageAllowanceToman)) : ''}
            ${row('حق اولاد', formatToman(slip.childAllowanceToman))}
            ${row('حق ایاب و ذهاب', formatToman(slip.commuteAllowanceToman))}
            ${row(`اضافه‌کاری${slip.overtimeHours ? ` (${toPersianDigits(slip.overtimeHours)} ساعت)` : ''}`, formatToman(slip.overtimePayToman))}
            <tr style="background:#f0fdf4;"><td style="padding:8px 10px;font-weight:900;color:#065f46;">جمع ناخالص</td><td style="padding:8px 10px;font-weight:900;text-align:left;color:#065f46;">${formatToman(slip.grossSalaryToman)}</td></tr>
          </tbody>
        </table>

        <!-- Deductions -->
        <table style="width:100%;border-collapse:collapse;font-size:11px;">
          <thead>
            <tr><th colspan="2" style="background:#fff1f2;color:#9f1239;text-align:right;padding:8px 10px;border-bottom:2px solid #fecdd3;">کسورات (تومان)</th></tr>
          </thead>
          <tbody>
            ${row('بیمه سهم کارگر (۷٪)', formatToman(slip.ssoInsurance7PctToman))}
            ${row('مالیات بر درآمد', formatToman(slip.incomeTaxToman))}
            ${slip.otherDeductionsToman ? row('سایر کسورات', formatToman(slip.otherDeductionsToman)) : ''}
            <tr style="background:#fff1f2;"><td style="padding:8px 10px;font-weight:900;color:#9f1239;">جمع کسورات</td><td style="padding:8px 10px;font-weight:900;text-align:left;color:#9f1239;">${formatToman(slip.ssoInsurance7PctToman + slip.incomeTaxToman + (slip.otherDeductionsToman || 0))}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Net Salary Banner -->
      <div style="margin-top:16px;padding:12px 16px;background:#047857;color:#ffffff;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:11px;color:#d1fae5;">خالص پرداختی:</div>
          <div style="font-size:16px;font-weight:900;margin-top:2px;">${formatToman(slip.netSalaryToman)}</div>
        </div>
        <div style="text-align:left;font-size:10px;color:#a7f3d0;">
          ${slip.paidAtJalali ? `تاریخ پرداخت: ${slip.paidAtJalali}` : 'در انتظار پرداخت'}
        </div>
      </div>

      <!-- Legal Reserves & Notes -->
      <div style="margin-top:12px;display:flex;justify-content:space-between;gap:12px;font-size:10px;color:#475569;background:#f8fafc;padding:8px 12px;border:1px solid #e2e8f0;border-radius:6px;">
        <div><strong>ذخیره سنوات:</strong> ${formatToman(slip.sanavatReserveToman)}</div>
        <div><strong>ذخیره عیدی:</strong> ${formatToman(slip.eidiReserveToman)}</div>
        ${slip.unpaidLeaveDays ? `<div><strong>مرخصی بدون حقوق:</strong> ${toPersianDigits(slip.unpaidLeaveDays)} روز</div>` : ''}
      </div>

      <div style="margin-top:28px;display:grid;grid-template-columns:repeat(3, 1fr);gap:16px;text-align:center;font-size:10px;color:#64748b;">
        <div style="border-top:1px dashed #94a3b8;padding-top:6px;">امضای مسئول حقوق و دستمزد</div>
        <div style="border-top:1px dashed #94a3b8;padding-top:6px;">امضای مدیر منابع انسانی</div>
        <div style="border-top:1px dashed #94a3b8;padding-top:6px;">امضای کارمند</div>
      </div>
    </div>
    `;
  };

  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
<title>فیش‌های حقوقی هلدینگ سیلانه سبز</title>
<style>
  @page { size: A4 portrait; margin: 12mm 15mm; }
  body { font-family: Tahoma, 'Vazirmatn', sans-serif; padding: 0; margin: 0; color: #0f172a; direction: rtl; }
  .payslip-page { padding: 20px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 24px; box-sizing: border-box; }
  .page-break { page-break-after: always; }
  @media print {
    body { padding: 0; }
    .payslip-page { border: 1px solid #94a3b8; margin-bottom: 0; }
  }
</style>
</head><body>
${slips.map((s, i) => renderSingleSlipHtml(s, i)).join('')}
<script>window.onload=()=>{ window.print(); };</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=960');
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

export const PayrollModule: React.FC<PayrollModuleProps> = ({
  payrollSlips,
  currentRole,
  employees,
  onGeneratePayroll,
  onFinalizePayroll,
  onMarkPaid,
}) => {
  const isHR = currentRole === UserRole.HR_DIRECTOR;
  const isDeptManager = currentRole === UserRole.DEPT_MANAGER;

  // Selected period state
  const [selectedSlip, setSelectedSlip] = useState<PayrollSlip | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(6);
  const [selectedYear, setSelectedYear] = useState(1404);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Month Picker Popover State
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const monthPickerRef = useRef<HTMLDivElement>(null);

  // Multi-selection for Batch Actions
  const [selectedSlipIds, setSelectedSlipIds] = useState<Set<string>>(new Set());

  // Search and Status Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PayrollStatus>('ALL');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  // Close month picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    }
    if (isMonthPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isMonthPickerOpen]);

  // Fetch available circular years
  useEffect(() => {
    let alive = true;
    fetch('/api/payroll/years')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setAvailableYears(d.availableYears || []);
        if (d.currentYearJalali) setSelectedYear(d.currentYearJalali);
        if (d.currentMonthJalali) setSelectedMonth(d.currentMonthJalali);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Filter slips for the selected period
  const periodSlips = useMemo(
    () => payrollSlips.filter((s) => s.yearJalali === selectedYear && s.monthJalali === selectedMonth),
    [payrollSlips, selectedYear, selectedMonth]
  );

  // Reset selection when changing period
  useEffect(() => {
    setSelectedSlipIds(new Set());
  }, [selectedYear, selectedMonth]);

  // Status counters for selected period
  const draftCount = useMemo(
    () => periodSlips.filter((s) => s.status === PayrollStatus.DRAFT).length,
    [periodSlips]
  );
  const finalizedCount = useMemo(
    () => periodSlips.filter((s) => s.status === PayrollStatus.FINALIZED).length,
    [periodSlips]
  );
  const paidCount = useMemo(
    () => periodSlips.filter((s) => s.status === PayrollStatus.PAID).length,
    [periodSlips]
  );
  const periodLocked = periodSlips.length > 0 && paidCount === periodSlips.length;

  // Filtered slips based on search and status
  const filteredSlips = useMemo(() => {
    return periodSlips.filter((slip) => {
      if (statusFilter !== 'ALL' && slip.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const empName = (slip.employeeName || '').toLowerCase();
        const code = (slip.personnelCode || '').toLowerCase();
        return empName.includes(query) || code.includes(query);
      }
      return true;
    });
  }, [periodSlips, statusFilter, searchQuery]);

  // Summary KPIs (RBAC: HR sees holding totals; others see personal/restricted with "—")
  const totalGross = useMemo(() => periodSlips.reduce((sum, s) => sum + s.grossSalaryToman, 0), [periodSlips]);
  const totalNet = useMemo(() => periodSlips.reduce((sum, s) => sum + s.netSalaryToman, 0), [periodSlips]);
  const totalSSO = useMemo(() => periodSlips.reduce((sum, s) => sum + s.ssoInsurance7PctToman, 0), [periodSlips]);
  const totalTax = useMemo(() => periodSlips.reduce((sum, s) => sum + s.incomeTaxToman, 0), [periodSlips]);

  // Handle generation trigger
  const handleGenerate = () => {
    if (periodLocked) return;
    setIsGenerating(true);
    try {
      onGeneratePayroll(selectedMonth, selectedYear);
    } finally {
      setTimeout(() => setIsGenerating(false), 600);
    }
  };

  // Checkbox handlers
  const handleToggleSelectAll = () => {
    if (selectedSlipIds.size === filteredSlips.length && filteredSlips.length > 0) {
      setSelectedSlipIds(new Set());
    } else {
      setSelectedSlipIds(new Set(filteredSlips.map((s) => s.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedSlipIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Batch Print
  const handleBatchPrint = () => {
    const slipsToPrint = periodSlips.filter((s) => selectedSlipIds.has(s.id));
    if (slipsToPrint.length > 0) {
      printSlips(slipsToPrint, employees);
    }
  };

  // Find employee metadata helper
  const getEmployeeMeta = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId);
  };

  return (
    <div className="space-y-4 text-slate-800 dark:text-slate-100">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">مجموع ناخالص</div>
          <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
            {isHR ? formatToman(totalGross) : isDeptManager ? '—' : periodSlips[0] ? formatToman(periodSlips[0].grossSalaryToman) : '—'}
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {MONTH_NAMES[selectedMonth - 1]} {toPersianDigits(selectedYear)} • {toPersianDigits(periodSlips.length)} فیش
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">مجموع خالص پرداختی</div>
          <div className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
            {isHR ? formatToman(totalNet) : isDeptManager ? '—' : periodSlips[0] ? formatToman(periodSlips[0].netSalaryToman) : '—'}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-bold">
            {isHR ? 'مجموع خالص' : 'خالص پرداختی'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">بیمه سهم کارگر (۷٪)</div>
          <div className="text-base sm:text-lg font-extrabold text-blue-700 dark:text-blue-400">
            {isHR ? formatToman(totalSSO) : isDeptManager ? '—' : periodSlips[0] ? formatToman(periodSlips[0].ssoInsurance7PctToman) : '—'}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">با کسر معافیت‌ها</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">مالیات بر درآمد</div>
          <div className="text-base sm:text-lg font-extrabold text-purple-700 dark:text-purple-400">
            {isHR ? formatToman(totalTax) : isDeptManager ? '—' : periodSlips[0] ? formatToman(periodSlips[0].incomeTaxToman) : '—'}
          </div>
          <div className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">
            سال {toPersianDigits(selectedYear)}
          </div>
        </div>
      </div>

      {/* Main Period Control & Automation Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Header Title & Info */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  مدیریت حقوق و دستمزد
                </h3>
                {periodLocked && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Lock className="w-3 h-3" />
                    دوره قفل‌شده
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                محاسبه حقوق و مزایا بر اساس بخشنامه مزد سال {toPersianDigits(selectedYear)}
              </p>
            </div>
          </div>

          {/* Period Selector Popover Trigger & Actions */}
          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            {/* Jalali Month & Year Picker Dropdown */}
            <div className="relative" ref={monthPickerRef}>
              <button
                type="button"
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className={`px-3.5 py-2 text-xs rounded-xl font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                  isMonthPickerOpen
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title="انتخاب دوره"
              >
                <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  دوره: {MONTH_NAMES[selectedMonth - 1]} {toPersianDigits(selectedYear)}
                </span>
                {periodLocked ? (
                  <Lock className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                ) : (
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMonthPickerOpen ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Jalali Month Picker Popover Card */}
              {isMonthPickerOpen && (
                <div className="absolute left-0 lg:left-auto lg:right-0 mt-2 z-40 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
                  {/* Year Selection Bar */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        const nextYear = selectedYear - 1;
                        if (!availableYears.length || availableYears.includes(nextYear)) {
                          setSelectedYear(nextYear);
                        }
                      }}
                      disabled={availableYears.length > 0 && !availableYears.includes(selectedYear - 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="سال قبل"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="text-center">
                      <span className="text-xs font-black text-slate-900 dark:text-white">
                        سال {toPersianDigits(selectedYear)}
                      </span>
                      {availableYears.includes(selectedYear) && (
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          بخشنامه مصوب
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nextYear = selectedYear + 1;
                        if (!availableYears.length || availableYears.includes(nextYear)) {
                          setSelectedYear(nextYear);
                        }
                      }}
                      disabled={availableYears.length > 0 && !availableYears.includes(selectedYear + 1)}
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300 cursor-pointer"
                      title="سال بعد"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 12 Months Grid */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTH_NAMES.map((name, idx) => {
                      const monthNum = idx + 1;
                      const isSelected = selectedMonth === monthNum;
                      // Check if slips exist in this month/year
                      const monthSlips = payrollSlips.filter(
                        (s) => s.yearJalali === selectedYear && s.monthJalali === monthNum
                      );
                      const isMonthPaid = monthSlips.length > 0 && monthSlips.every((s) => s.status === PayrollStatus.PAID);
                      const isMonthFinal = monthSlips.length > 0 && !isMonthPaid && monthSlips.some((s) => s.status === PayrollStatus.FINALIZED);

                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(monthNum);
                            setIsMonthPickerOpen(false);
                          }}
                          className={`p-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <div>{name}</div>
                          {monthSlips.length > 0 && (
                            <div className="flex items-center justify-center gap-1 mt-0.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isSelected
                                    ? 'bg-white'
                                    : isMonthPaid
                                    ? 'bg-emerald-500'
                                    : isMonthFinal
                                    ? 'bg-sky-500'
                                    : 'bg-amber-500'
                                }`}
                              />
                              <span className={`text-[9px] ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                                {toPersianDigits(monthSlips.length)} فیش
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer note */}
                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> پرداخت‌شده
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500" /> نهایی
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> پیش‌نویس
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* HR Action: Generate Payroll button with locked tooltip */}
            {isHR && (
              <div className="relative group">
                <button
                  type="button"
                  disabled={isGenerating || periodLocked}
                  onClick={handleGenerate}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
                    periodLocked
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                  }`}
                  title={
                    periodLocked
                      ? 'این دوره مالی پرداخت و قفل شده است.'
                      : 'محاسبه فیش‌های دوره'
                  }
                >
                  {periodLocked ? <Lock className="w-3.5 h-3.5" /> : <Calculator className="w-3.5 h-3.5" />}
                  <span>
                    {isGenerating
                      ? 'در حال محاسبه...'
                      : periodLocked
                      ? 'دوره قفل شده'
                      : 'محاسبه حقوق'}
                  </span>
                </button>

                {periodLocked && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-30 w-64 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg text-center leading-relaxed">
                    این دوره پرداخت و قفل شده است.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle Status & Batch Actions Bar */}
        {periodSlips.length > 0 && (
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            {/* Period Status Breakdown */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-bold text-slate-500 dark:text-slate-400">وضعیت دوره:</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                {toPersianDigits(draftCount)} پیش‌نویس
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                {toPersianDigits(finalizedCount)} نهایی‌شده
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {toPersianDigits(paidCount)} پرداخت‌شده
              </span>
            </div>

            {/* Lifecycle Triggers (HR Only) */}
            {isHR && (
              <div className="flex items-center gap-2 flex-wrap">
                {draftCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'نهایی‌سازی فیش‌های دوره',
                        description: `آیا از نهایی‌سازی ${toPersianDigits(draftCount)} فیش پیش‌نویس دوره ${MONTH_NAMES[selectedMonth - 1]} ${toPersianDigits(selectedYear)} اطمینان دارید؟`,
                        confirmLabel: 'نهایی‌سازی',
                        variant: 'primary',
                        onConfirm: () => {
                          setConfirmModal(null);
                          onFinalizePayroll(selectedYear, selectedMonth);
                        },
                      });
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>نهایی‌سازی ({toPersianDigits(draftCount)})</span>
                  </button>
                )}

                {finalizedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'ثبت پرداخت دوره',
                        description: `آیا از ثبت پرداخت ${toPersianDigits(finalizedCount)} فیش نهایی‌شده دوره ${MONTH_NAMES[selectedMonth - 1]} ${toPersianDigits(selectedYear)} اطمینان دارید؟ پس از ثبت، این دوره قفل می‌شود.`,
                        confirmLabel: 'ثبت پرداخت',
                        variant: 'warning',
                        onConfirm: () => {
                          setConfirmModal(null);
                          onMarkPaid(selectedYear, selectedMonth);
                        },
                      });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>ثبت پرداخت</span>
                  </button>
                )}

                {periodLocked && (
                  <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    دوره قفل است
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Batch Actions Toolbar — appears only when rows are selected */}
      {selectedSlipIds.size > 0 && (
        <div className="bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold">
                {toPersianDigits(selectedSlipIds.size)} فیش انتخاب شده است
              </div>
              <div className="text-[10px] text-slate-400">
                عملیات گروهی روی فیش‌های انتخابی
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleBatchPrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ فیش‌های انتخابی ({toPersianDigits(selectedSlipIds.size)})</span>
            </button>

            {isHR && !periodLocked && (
              <>
                {draftCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'نهایی‌سازی فیش‌های انتخابی دوره',
                        description: `آیا مایلید تمام فیش‌های پیش‌نویس این دوره نهایی شوند؟`,
                        confirmLabel: 'نهایی‌سازی',
                        variant: 'primary',
                        onConfirm: () => {
                          setConfirmModal(null);
                          onFinalizePayroll(selectedYear, selectedMonth);
                        },
                      });
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>نهایی‌سازی دوره</span>
                  </button>
                )}

                {finalizedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: 'ثبت پرداخت دوره',
                        description: `آیا از ثبت پرداخت دوره اطمینان دارید؟`,
                        confirmLabel: 'ثبت پرداخت',
                        variant: 'warning',
                        onConfirm: () => {
                          setConfirmModal(null);
                          onMarkPaid(selectedYear, selectedMonth);
                        },
                      });
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>ثبت پرداخت</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => setSelectedSlipIds(new Set())}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer transition-colors"
            >
              لغو انتخاب
            </button>
          </div>
        </div>
      )}

      {/* Table Card with Search & Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
        {/* Table Filter Header */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو با نام یا کد پرسنلی..."
              className="w-full pl-3 pr-9 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              همه ({toPersianDigits(periodSlips.length)})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(PayrollStatus.DRAFT)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === PayrollStatus.DRAFT
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              پیش‌نویس ({toPersianDigits(draftCount)})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(PayrollStatus.FINALIZED)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === PayrollStatus.FINALIZED
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              نهایی ({toPersianDigits(finalizedCount)})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(PayrollStatus.PAID)}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === PayrollStatus.PAID
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              پرداخت‌شده ({toPersianDigits(paidCount)})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto touch-scroll">
          {filteredSlips.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {periodSlips.length === 0
                  ? `برای دوره ${MONTH_NAMES[selectedMonth - 1]} ${toPersianDigits(selectedYear)} فیشی ثبت نشده است.`
                  : 'هیچ فیشی با فیلترهای انتخابی مطابقت ندارد.'}
              </p>
              {periodSlips.length === 0 && isHR && !periodLocked && (
                <p className="text-[11px] text-slate-400 mt-1">
                  جهت محاسبه حقوق بر روی دکمه «محاسبه حقوق» در بالای صفحه کلیک کنید.
                </p>
              )}
            </div>
          ) : (
            <table className="w-full min-w-[840px] text-right text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedSlipIds.size === filteredSlips.length && filteredSlips.length > 0}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      title="انتخاب همه"
                    />
                  </th>
                  <th className="p-3.5">نام و مشخصات</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">حقوق پایه (تومان)</th>
                  <th className="p-3.5">مزایا (تومان)</th>
                  <th className="p-3.5">بیمه (تومان)</th>
                  <th className="p-3.5">مالیات (تومان)</th>
                  <th className="p-3.5">خالص (تومان)</th>
                  <th className="p-3.5 text-center w-28">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredSlips.map((slip) => {
                  const meta = STATUS_META[slip.status] || STATUS_META[PayrollStatus.DRAFT];
                  const emp = getEmployeeMeta(slip.employeeId);
                  const isSelected = selectedSlipIds.has(slip.id);

                  const totalBenefits =
                    slip.housingAllowanceToman +
                    slip.bonKargariToman +
                    slip.childAllowanceToman +
                    slip.commuteAllowanceToman +
                    (slip.seniorityBaseToman || 0) +
                    (slip.marriageAllowanceToman || 0) +
                    slip.overtimePayToman;

                  return (
                    <tr
                      key={slip.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(slip.id)}
                          className="w-4 h-4 rounded-sm border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                        />
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{slip.employeeName || '—'}</span>
                          {emp?.department && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                              ({emp.department})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          کد پرسنلی: {toPersianDigits(slip.personnelCode || '—')}
                        </div>
                        {slip.payableDays !== undefined && slip.payableDays < 28 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                            کارکرد: {toPersianDigits(slip.payableDays)} روز
                            {slip.unpaidLeaveDays ? ` (${toPersianDigits(slip.unpaidLeaveDays)} روز بدون حقوق)` : ''}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-lg border ${meta.chipClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotClass}`} />
                          {meta.label}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {formatToman(slip.baseSalaryToman)}
                      </td>

                      <td className="p-3.5 text-slate-600 dark:text-slate-400">
                        {formatToman(totalBenefits)}
                      </td>

                      <td className="p-3.5 text-blue-700 dark:text-blue-400 font-bold">
                        {formatToman(slip.ssoInsurance7PctToman)}
                      </td>

                      <td className="p-3.5 text-purple-700 dark:text-purple-400 font-bold">
                        {formatToman(slip.incomeTaxToman)}
                      </td>

                      <td className="p-3.5 font-extrabold text-emerald-700 dark:text-emerald-400 text-sm">
                        {formatToman(slip.netSalaryToman)}
                      </td>

                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedSlip(slip)}
                            className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                            title="مشاهده فیش حقوق"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => printSlips([slip], employees)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="چاپ فیش"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Payslip Document-Style Modal */}
      {selectedSlip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Document Header with Company Brands */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-black text-xs">
                      س
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      هلدینگ دارویی، بهداشتی و آرایشی سیلانه سبز
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    برندهای تجاری: دافی (Dafi) • کامان (Come'on) • میسویک (Misswake)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => printSlips([selectedSlip], employees)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="چاپ فیش"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>چاپ فیش</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSlip(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    title="بستن"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Title & Document Badge */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                <div className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  فیش حقوق و دستمزد — دوره: {selectedSlip.monthName} {toPersianDigits(selectedSlip.yearJalali)}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md border ${
                      (STATUS_META[selectedSlip.status] || STATUS_META[PayrollStatus.DRAFT]).chipClass
                    }`}
                  >
                    {(STATUS_META[selectedSlip.status] || STATUS_META[PayrollStatus.DRAFT]).label}
                  </span>
                  {selectedSlip.paidAtJalali && (
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      پرداخت: {selectedSlip.paidAtJalali}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Employee Metadata Info Card */}
            {(() => {
              const emp = getEmployeeMeta(selectedSlip.employeeId);
              return (
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">نام و نام خانوادگی:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedSlip.employeeName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">کد پرسنلی:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                      {toPersianDigits(selectedSlip.personnelCode || '—')}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">دپارتمان:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{emp?.department || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">سمت:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{emp?.jobTitle || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">کارکرد:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedSlip.payableDays !== undefined ? `${toPersianDigits(selectedSlip.payableDays)} روز` : '۳۰ روز'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">مرخصی بدون حقوق:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedSlip.unpaidLeaveDays ? `${toPersianDigits(selectedSlip.unpaidLeaveDays)} روز` : '۰ روز'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">شماره حساب/شبا:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {emp?.bankIban || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاریخ صدور:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedSlip.generatedAtJalali || '—'}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Two-Column Layout: مزایا vs کسورات */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings Column (مزایا و اضافات) */}
              <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-2.5 text-xs">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 pb-2 border-b border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between">
                  <span>حقوق و مزایا</span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">مبالغ به تومان</span>
                </div>
                <div className="space-y-2 text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between items-center">
                    <span>حقوق پایه:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.baseSalaryToman)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>حق مسکن:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.housingAllowanceToman)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>بن خواربار:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.bonKargariToman)}</span>
                  </div>
                  {selectedSlip.seniorityBaseToman ? (
                    <div className="flex justify-between items-center">
                      <span>پایه سنوات:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.seniorityBaseToman)}</span>
                    </div>
                  ) : null}
                  {selectedSlip.marriageAllowanceToman ? (
                    <div className="flex justify-between items-center">
                      <span>حق تأهل:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.marriageAllowanceToman)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between items-center">
                    <span>حق اولاد:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.childAllowanceToman)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>حق ایاب و ذهاب:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.commuteAllowanceToman)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>
                      اضافه‌کاری
                      {selectedSlip.overtimeHours ? ` (${toPersianDigits(selectedSlip.overtimeHours)} ساعت)` : ''}:
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.overtimePayToman)}</span>
                  </div>
                </div>
                <div className="pt-2.5 border-t border-emerald-200 dark:border-emerald-800 flex justify-between font-black text-emerald-900 dark:text-emerald-300 text-sm">
                  <span>جمع ناخالص:</span>
                  <span>{formatToman(selectedSlip.grossSalaryToman)}</span>
                </div>
              </div>

              {/* Deductions Column (کسورات قانونی) */}
              <div className="bg-rose-50/40 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/60 space-y-2.5 text-xs flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="font-bold text-rose-900 dark:text-rose-300 pb-2 border-b border-rose-200 dark:border-rose-800/80 flex items-center justify-between">
                    <span>کسورات قانونی</span>
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">مبالغ به تومان</span>
                  </div>
                  <div className="space-y-2 text-slate-700 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <div>
                        <span>بیمه سهم کارگر (۷٪):</span>
                        <div className="text-[10px] text-slate-400">با کسر معافیت حق اولاد</div>
                      </div>
                      <span className="font-bold text-blue-700 dark:text-blue-400">{formatToman(selectedSlip.ssoInsurance7PctToman)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <span>مالیات بر درآمد:</span>
                        <div className="text-[10px] text-slate-400">نرخ پله‌ای</div>
                      </div>
                      <span className="font-bold text-purple-700 dark:text-purple-400">{formatToman(selectedSlip.incomeTaxToman)}</span>
                    </div>
                    {selectedSlip.otherDeductionsToman ? (
                      <div className="flex justify-between items-center">
                        <span>سایر کسورات:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatToman(selectedSlip.otherDeductionsToman)}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="pt-2.5 border-t border-rose-200 dark:border-rose-800 flex justify-between font-black text-rose-900 dark:text-rose-300 text-sm">
                  <span>جمع کسورات:</span>
                  <span>{formatToman(selectedSlip.ssoInsurance7PctToman + selectedSlip.incomeTaxToman + (selectedSlip.otherDeductionsToman || 0))}</span>
                </div>
              </div>
            </div>

            {/* Legal Reserves Box */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:justify-between gap-2">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">ذخیره سنوات: </span>
                <span className="font-semibold">{formatToman(selectedSlip.sanavatReserveToman)}</span>
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">ذخیره عیدی: </span>
                <span className="font-semibold">{formatToman(selectedSlip.eidiReserveToman)}</span>
                <span className="text-[10px] text-slate-400 block sm:inline"> (سقف قانونی)</span>
              </div>
            </div>

            {/* Net Salary Highlight Line */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div>
                <div className="text-xs text-emerald-100 font-medium">خالص پرداختی:</div>
                <div className="text-xl sm:text-2xl font-black mt-0.5">{formatToman(selectedSlip.netSalaryToman)}</div>
                {selectedSlip.statutoryYearNote && (
                  <div className="text-[10px] text-emerald-200 mt-1 max-w-lg leading-relaxed">
                    {selectedSlip.statutoryYearNote}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => printSlips([selectedSlip], employees)}
                className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>چاپ فیش</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Destructive / Lifecycle Actions */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.variant === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                    : confirmModal.variant === 'danger'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{confirmModal.title}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer ${
                  confirmModal.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : confirmModal.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
