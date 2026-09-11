import React, { useState, useMemo } from 'react';
import {
  AttendanceRecord,
  Employee,
  LeaveBalance,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  UserRole,
} from '../../types';
import {
  parseJalaliDateString,
  countWorkingDaysInclusive,
  toPersianDigits,
  toEnglishDigits,
  getTodayJalali,
  formatJalaliDate,
  addJalaliDays,
  jalaliToGregorian,
  JALALI_WEEK_DAYS,
  JALALI_MONTH_NAMES,
  JalaliDate,
} from '../../utils/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import {
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  Plus,
  LogIn,
  LogOut,
  AlertTriangle,
  ShieldCheck,
  User,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Search,
  Check,
  Hourglass,
  CalendarDays,
  Info,
  Layers,
  LayoutGrid,
  ListFilter,
} from 'lucide-react';

interface AttendanceModuleProps {
  currentRole: UserRole;
  attendances: AttendanceRecord[];
  leaveRequests: LeaveRequest[];
  /** Statutory balances computed server-side (Art. 64/66) — audit fix LEA-01. */
  leaveBalances: LeaveBalance[];
  employees: Employee[];
  sessionEmployeeId?: string;
  onCheckInOut: (type: 'CHECK_IN' | 'CHECK_OUT') => void;
  onSubmitLeaveRequest: (req: Partial<LeaveRequest>) => void;
  onApproveLeave: (id: string, approved: boolean, comment?: string) => void;
}

export const AttendanceModule: React.FC<AttendanceModuleProps> = ({
  currentRole,
  attendances,
  leaveRequests,
  leaveBalances,
  employees,
  sessionEmployeeId,
  onCheckInOut,
  onSubmitLeaveRequest,
  onApproveLeave,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'attendance' | 'leaves'>('attendance');
  const [attendanceViewMode, setAttendanceViewMode] = useState<'heatmap' | 'table'>('heatmap');
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Week offset for weekly heatmap (0 = current week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Search & Filters
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [leaveFilterStatus, setLeaveFilterStatus] = useState<string>('ALL');

  // Leave request form states
  const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.ANNUAL);
  const [startDate, setStartDate] = useState(formatJalaliDate(getTodayJalali(), true));
  const [endDate, setEndDate] = useState(formatJalaliDate(getTodayJalali(), true));
  const [daysCount, setDaysCount] = useState<number>(1);
  const [reason, setReason] = useState('');
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  // Real statutory balance (Art. 64/66)
  const myBalance = leaveBalances.find((b) => b.employeeId === sessionEmployeeId) || leaveBalances[0];
  const currentYearBalance = myBalance ? myBalance.years[myBalance.currentYear] : undefined;

  // Server-derived working-day preview for the selected range (Fridays excluded)
  const previewDays = useMemo(() => {
    const s0 = parseJalaliDateString(startDate);
    const e0 = parseJalaliDateString(endDate);
    if (!s0 || !e0) return null;
    return countWorkingDaysInclusive(s0, e0);
  }, [startDate, endDate]);

  const rangeInvalid = previewDays !== null && previewDays < 0;
  const exceedsQuota =
    leaveType === LeaveType.ANNUAL &&
    previewDays !== null &&
    previewDays > 0 &&
    currentYearBalance !== undefined &&
    previewDays > currentYearBalance.remainingDays;

  function showToastLocal(msg: string) {
    setLocalNotice(msg);
    setTimeout(() => setLocalNotice(null), 6000);
  }

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rangeInvalid) {
      showToastLocal('تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد');
      return;
    }
    if (exceedsQuota) {
      showToastLocal(
        `مانده مرخصی استحقاقی شما ${toPersianDigits(currentYearBalance?.remainingDays ?? 0)} روز کاری است؛ ثبت بیش از مانده امکان‌پذیر نیست (ماده ۶۴).`
      );
      return;
    }
    if (leaveType === LeaveType.MARRIAGE && previewDays !== null && previewDays > 3) {
      showToastLocal('مرخصی ازدواج مطابق ماده ۷۳ قانون کار حداکثر ۳ روز با حقوق است');
      return;
    }

    onSubmitLeaveRequest({
      leaveType,
      startDateJalali: startDate,
      endDateJalali: endDate,
      daysCount:
        leaveType === LeaveType.HOURLY
          ? Number(daysCount) || 0.5
          : (previewDays ?? (Number(daysCount) || 1)),
      reason: reason || 'مرخصی استحقاقی روزانه',
    });
    setIsLeaveModalOpen(false);
    setReason('');
  };

  // Status Chip Renderer with soft tones (warning-soft, success-soft, danger-soft)
  const getStatusChip = (status: LeaveStatus) => {
    switch (status) {
      case LeaveStatus.APPROVED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>تأیید نهایی شده</span>
          </span>
        );
      case LeaveStatus.PENDING_MANAGER:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold shadow-2xs">
            <Hourglass className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>در انتظار تأیید مدیر واحد</span>
          </span>
        );
      case LeaveStatus.PENDING_HR:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold shadow-2xs">
            <Hourglass className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>در انتظار تأیید منابع انسانی</span>
          </span>
        );
      case LeaveStatus.REJECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-xs font-bold shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>رد شده</span>
          </span>
        );
    }
  };

  // Compute 7 days for the active week in Persian calendar (Saturday to Friday)
  const today = getTodayJalali();
  const weekDays = useMemo(() => {
    // Determine Saturday of the week
    const gToday = jalaliToGregorian(today.year, today.month, today.day);
    const d = new Date(gToday.year, gToday.month - 1, gToday.day);
    const gDay = d.getDay(); // 0 = Sunday, 6 = Saturday
    const daysSinceSaturday = (gDay + 1) % 7;

    // Shift by weekOffset * 7 days
    const saturdayJalali = addJalaliDays(today, -daysSinceSaturday + weekOffset * 7);

    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const curJ = addJalaliDays(saturdayJalali, i);
      const isFriday = i === 6;
      const isTodayDate =
        curJ.year === today.year && curJ.month === today.month && curJ.day === today.day;

      return {
        jalali: curJ,
        jalaliStr: formatJalaliDate(curJ, true),
        normalizedStr: toEnglishDigits(formatJalaliDate(curJ, false)),
        weekdayName: JALALI_WEEK_DAYS[i].name,
        weekdayShort: JALALI_WEEK_DAYS[i].short,
        dayNum: curJ.day,
        monthName: JALALI_MONTH_NAMES[curJ.month - 1],
        isFriday,
        isToday: isTodayDate,
      };
    });
  }, [today, weekOffset]);

  // Today's summary statistics
  const todayNormalized = toEnglishDigits(formatJalaliDate(today, false));
  const todayAttendances = attendances.filter((r) => {
    const rDateNorm = toEnglishDigits(r.dateJalali || '').replace(/-/g, '/');
    return rDateNorm === todayNormalized;
  });

  // If today's records are empty (e.g. before punch-in), use all records for aggregated indicators
  const activeRecordPool = todayAttendances.length > 0 ? todayAttendances : attendances;
  const totalOnTime = activeRecordPool.filter(
    (r) => r.status === 'PRESENT' && (r.delayMinutes ?? 0) === 0
  ).length;
  const totalLate = activeRecordPool.filter(
    (r) => (r.delayMinutes ?? 0) > 0
  ).length;
  const totalAbsent = activeRecordPool.filter((r) => r.status === 'ABSENT').length;
  const totalOvertimeHours = activeRecordPool.reduce(
    (acc, r) => acc + (r.overtimeHours || 0),
    0
  );

  // Employees list for heatmap
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees;
    const q = employeeSearch.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.personnelCode.includes(q) ||
        e.department.toLowerCase().includes(q)
    );
  }, [employees, employeeSearch]);

  // Quick helper to match record in heatmap
  const getAttendanceFor = (empId: string, dayNormalized: string) => {
    return attendances.find((r) => {
      const rEmp = r.employeeId === empId;
      const rDate = toEnglishDigits(r.dateJalali || '').replace(/-/g, '/') === dayNormalized;
      return rEmp && rDate;
    });
  };

  // Filtered leave requests
  const filteredLeaveRequests = useMemo(() => {
    return leaveRequests.filter((req) => {
      if (leaveFilterStatus === 'ALL') return true;
      if (leaveFilterStatus === 'PENDING') {
        return (
          req.status === LeaveStatus.PENDING_MANAGER || req.status === LeaveStatus.PENDING_HR
        );
      }
      return req.status === leaveFilterStatus;
    });
  }, [leaveRequests, leaveFilterStatus]);

  // Leave balance statistics
  const totalEntitled =
    (currentYearBalance?.entitlementDays ?? 26) + (currentYearBalance?.carryoverDays ?? 0);
  const usedDays = currentYearBalance?.usedDays ?? 0;
  const pendingDays = currentYearBalance?.pendingDays ?? 0;
  const remainingDays = currentYearBalance?.remainingDays ?? 0;
  const usedPercentage = Math.min(
    100,
    Math.round(((usedDays + pendingDays) / (totalEntitled || 1)) * 100)
  );

  return (
    <div className="space-y-5">
      {/* Top Section: Quick Punch Card & Balance Progress Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Smart Check-In / Check-Out Punch Card (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <span>ثبت تردد</span>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                شیفت عادی (۰۸:۰۰ تا ۱۷:۰۰)
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              ثبت ورود و خروج روزانه با محاسبه خودکار تاخیر و اضافه‌کاری.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => onCheckInOut('CHECK_IN')}
              className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>ثبت ورود</span>
            </button>

            <button
              type="button"
              onClick={() => onCheckInOut('CHECK_OUT')}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ثبت خروج</span>
            </button>
          </div>
        </div>

        {/* Iranian Labor Law Statutory Leave Balance Meter (8 Cols) */}
        <div className="lg:col-span-8 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/50 p-5 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-extrabold text-emerald-950 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>مانده مرخصی استحقاقی (ماده ۶۴ و ۶۶ قانون کار)</span>
              </div>
              <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300">
                سال کاری {myBalance ? toPersianDigits(myBalance.currentYear) : '—'}
              </span>
            </div>

            {/* Visual Balance Meter Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">مصرف مرخصی سالانه</span>
                <span className="text-emerald-800">
                  {toPersianDigits(usedDays + pendingDays)} از {toPersianDigits(totalEntitled)} روز کاری ({toPersianDigits(usedPercentage)}٪)
                </span>
              </div>

              {/* Segmented Progress Bar */}
              <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex p-0.5 border border-slate-200">
                {/* Approved used segment (Amber) */}
                <div
                  style={{ width: `${(usedDays / (totalEntitled || 1)) * 100}%` }}
                  className="h-full bg-amber-500 rounded-r-full transition-all"
                  title={`مصرف شده: ${toPersianDigits(usedDays)} روز`}
                />
                {/* Pending segment (Sky) */}
                <div
                  style={{ width: `${(pendingDays / (totalEntitled || 1)) * 100}%` }}
                  className="h-full bg-sky-500 transition-all"
                  title={`در انتظار تأیید: ${toPersianDigits(pendingDays)} روز`}
                />
                {/* Remaining available segment (Emerald) */}
                <div
                  style={{ width: `${(remainingDays / (totalEntitled || 1)) * 100}%` }}
                  className="h-full bg-emerald-500 rounded-l-full transition-all"
                  title={`مانده مجاز: ${toPersianDigits(remainingDays)} روز`}
                />
              </div>
            </div>
          </div>

          {/* 5 Balance Breakdown Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="text-[11px] text-slate-500 font-medium">سقف سالانه</div>
              <div className="text-sm font-extrabold text-slate-800 mt-0.5">
                {toPersianDigits(currentYearBalance?.entitlementDays ?? 26)} روز
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="text-[11px] text-emerald-800 font-medium">ذخیره سال قبل</div>
              <div className="text-sm font-extrabold text-emerald-700 mt-0.5">
                {toPersianDigits(currentYearBalance?.carryoverDays ?? 0)} روز
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="text-[11px] text-amber-800 font-medium">استفاده‌شده</div>
              <div className="text-sm font-extrabold text-amber-700 mt-0.5">
                {toPersianDigits(usedDays)} روز
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-sky-200 shadow-2xs">
              <div className="text-[11px] text-sky-800 font-medium">در انتظار تأیید</div>
              <div className="text-sm font-extrabold text-sky-700 mt-0.5">
                {toPersianDigits(pendingDays)} روز
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-emerald-300 shadow-2xs bg-emerald-50/50">
              <div className="text-[11px] text-emerald-900 font-bold">مانده قابل استفاده</div>
              <div className="text-base font-extrabold text-emerald-800 mt-0.5">
                {toPersianDigits(remainingDays)} روز
              </div>
            </div>
          </div>

          {/* Statutory 9-Day Carryover Rule Helper Text */}
          <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-xl border border-emerald-100">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-800 font-bold">قانون مرخصی و ذخیره سالانه:</strong> طبق ماده ۶۴ قانون کار، مرخصی سالانه ۲۶ روز کاری است. بر اساس ماده ۶۶، حداکثر ۹ روز مرخصی قابل انتقال به سال بعد است و مازاد آن باید تسویه شود.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('attendance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'attendance'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>گزارش هفتگی تردد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('leaves')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'leaves'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>درخواست‌های مرخصی</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeSubTab === 'leaves' ? 'bg-white text-emerald-800' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {toPersianDigits(leaveRequests.length)}
            </span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsLeaveModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>ثبت مرخصی</span>
        </button>
      </div>

      {/* SUB-TAB 1: ATTENDANCE & HEATMAP */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-4">
          {/* Daily Summary Cards with Persian Digits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">حضور به‌موقع</div>
                <div className="text-xl font-extrabold text-emerald-700 mt-1">
                  {toPersianDigits(totalOnTime)} نفر
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">تاخیر ورود</div>
                <div className="text-xl font-extrabold text-amber-700 mt-1">
                  {toPersianDigits(totalLate)} نفر
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">غیبت / ثبت‌نشده</div>
                <div className="text-xl font-extrabold text-rose-700 mt-1">
                  {toPersianDigits(totalAbsent)} نفر
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">اضافه‌کاری</div>
                <div className="text-xl font-extrabold text-sky-700 mt-1">
                  {toPersianDigits(totalOvertimeHours)} ساعت
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Controls Bar: View Switcher (Heatmap vs Table) & Week Navigator */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* View switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('heatmap')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    attendanceViewMode === 'heatmap'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>نمای هفتگی</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAttendanceViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    attendanceViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>جدول تردد</span>
                </button>
              </div>

              {/* Employee search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجوی همکار..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-emerald-600 focus:outline-hidden w-40 sm:w-52"
                />
              </div>
            </div>

            {/* Week navigation (Saturday to Friday) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="هفته قبل"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 px-2">
                <CalendarDays className="w-4 h-4 text-emerald-600" />
                <span>
                  هفته از {toPersianDigits(weekDays[0].dayNum)} {weekDays[0].monthName} تا{' '}
                  {toPersianDigits(weekDays[6].dayNum)} {weekDays[6].monthName}
                </span>
                {weekOffset === 0 && (
                  <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 mr-1">
                    هفته جاری
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="هفته بعد"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {weekOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 py-1 px-2 rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>هفته جاری</span>
                </button>
              )}
            </div>
          </div>

          {/* VIEW 1: WEEKLY HEATMAP GRID */}
          {attendanceViewMode === 'heatmap' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full text-right text-xs min-w-[760px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-3 w-48 sticky right-0 bg-slate-50 z-10 border-l border-slate-200">
                        همکاران ({toPersianDigits(filteredEmployees.length)})
                      </th>
                      {weekDays.map((d) => (
                        <th
                          key={d.normalizedStr}
                          className={`p-3 text-center border-l border-slate-100 ${
                            d.isFriday
                              ? 'bg-rose-50/70 text-rose-800'
                              : d.isToday
                              ? 'bg-emerald-50/70 text-emerald-900'
                              : ''
                          }`}
                        >
                          <div className="font-extrabold">{d.weekdayName}</div>
                          <div
                            className={`text-[11px] font-medium mt-0.5 ${
                              d.isFriday ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            {toPersianDigits(d.dayNum)} {d.monthName}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Employee info sticky col */}
                        <td className="p-3 sticky right-0 bg-white z-10 border-l border-slate-200">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {emp.fullName.slice(0, 1)}
                            </div>
                            <div className="overflow-hidden">
                              <div className="font-bold text-slate-900 truncate">{emp.fullName}</div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {emp.jobTitle} • {emp.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 7 Days heatmap cells */}
                        {weekDays.map((d) => {
                          const record = getAttendanceFor(emp.id, d.normalizedStr);

                          if (d.isFriday) {
                            return (
                              <td
                                key={d.normalizedStr}
                                className="p-2 text-center bg-rose-50/30 border-l border-slate-100"
                              >
                                <span className="inline-block px-2 py-1 rounded-lg text-[10px] font-bold text-rose-400 bg-rose-50/60 border border-rose-100">
                                  تعطیل رسمی
                                </span>
                              </td>
                            );
                          }

                          if (!record) {
                            return (
                              <td
                                key={d.normalizedStr}
                                className="p-2 text-center border-l border-slate-100"
                              >
                                <span className="inline-block px-2 py-1 rounded-lg text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-200">
                                  ثبت نشده
                                </span>
                              </td>
                            );
                          }

                          // Status styling:
                          // Late = warning tint
                          // Absent = danger tint
                          // On-time = success tint
                          // Leave/Mission = soft info
                          const isLate = (record.delayMinutes ?? 0) > 0;
                          const isAbsent = record.status === 'ABSENT';
                          const isLeave = record.status === 'LEAVE' || record.status === 'MISSION';

                          let badgeClasses =
                            'inline-flex flex-col items-center justify-center px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-all ';

                          if (isAbsent) {
                            badgeClasses += 'bg-rose-50 text-rose-800 border-rose-200 shadow-2xs';
                          } else if (isLate) {
                            badgeClasses += 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs';
                          } else if (isLeave) {
                            badgeClasses += 'bg-sky-50 text-sky-800 border-sky-200 shadow-2xs';
                          } else {
                            badgeClasses += 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs';
                          }

                          return (
                            <td
                              key={d.normalizedStr}
                              className="p-2 text-center border-l border-slate-100"
                            >
                              <div
                                className={badgeClasses}
                                title={`ورود: ${toPersianDigits(record.checkIn || '—')} | خروج: ${toPersianDigits(
                                  record.checkOut || '—'
                                )} | تاخیر: ${toPersianDigits(record.delayMinutes || 0)} دقیقه`}
                              >
                                {isAbsent ? (
                                  <span>غیبت</span>
                                ) : isLeave ? (
                                  <span>مرخصی / ماموریت</span>
                                ) : (
                                  <>
                                    <span className="font-mono font-extrabold">
                                      {toPersianDigits(record.checkIn || '-')}
                                    </span>
                                    {isLate && (
                                      <span className="text-[9px] text-amber-700 font-extrabold mt-0.5">
                                        {toPersianDigits(record.delayMinutes)}د تاخیر
                                      </span>
                                    )}
                                    {!isLate && record.checkOut && (
                                      <span className="text-[9px] text-emerald-700 font-medium mt-0.5">
                                        تا {toPersianDigits(record.checkOut)}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Heatmap Legend Below */}
              <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>راهنما:</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-300 inline-block" />
                    <span className="text-slate-600 font-medium">حضور به‌موقع</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-amber-50 border border-amber-300 inline-block" />
                    <span className="text-slate-600 font-medium">تاخیر ورود</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-50 border border-rose-300 inline-block" />
                    <span className="text-slate-600 font-medium">غیبت</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-sky-50 border border-sky-300 inline-block" />
                    <span className="text-slate-600 font-medium">مرخصی / ماموریت</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-md bg-rose-50/60 border border-rose-100 inline-block" />
                    <span className="text-slate-600 font-medium">تعطیل رسمی</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VIEW 2: DETAILED TABLE */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto touch-scroll max-h-[520px]">
                <table className="w-full text-right text-xs min-w-[720px] border-collapse">
                  <thead className="sticky top-0 bg-slate-50 text-slate-700 font-bold border-b border-slate-200 z-10">
                    <tr>
                      <th className="p-3.5">نام همکار</th>
                      <th className="p-3.5">تاریخ (شمسی)</th>
                      <th className="p-3.5">ساعت ورود</th>
                      <th className="p-3.5">ساعت خروج</th>
                      <th className="p-3.5">تاخیر (دقیقه)</th>
                      <th className="p-3.5">اضافه‌کاری (ساعت)</th>
                      <th className="p-3.5 text-center">وضعیت حضور</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {attendances.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">{rec.employeeName}</td>
                        <td className="p-3.5 text-slate-600">{toPersianDigits(rec.dateJalali)}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          {toPersianDigits(rec.checkIn || '-')}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {toPersianDigits(rec.checkOut || '-')}
                        </td>
                        <td className="p-3.5">
                          {(rec.delayMinutes ?? 0) > 0 ? (
                            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              {toPersianDigits(rec.delayMinutes)} دقیقه
                            </span>
                          ) : (
                            <span className="text-slate-400">۰</span>
                          )}
                        </td>
                        <td className="p-3.5">
                          {(rec.overtimeHours ?? 0) > 0 ? (
                            <span className="text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                              {toPersianDigits(rec.overtimeHours)} ساعت
                            </span>
                          ) : (
                            <span className="text-slate-400">۰</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          {rec.status === 'PRESENT' && (rec.delayMinutes ?? 0) === 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                              حاضر به‌موقع
                            </span>
                          )}
                          {rec.status === 'PRESENT' && (rec.delayMinutes ?? 0) > 0 && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                              ورود با تاخیر
                            </span>
                          )}
                          {rec.status === 'ABSENT' && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-bold">
                              غایب
                            </span>
                          )}
                          {(rec.status === 'LEAVE' || rec.status === 'MISSION') && (
                            <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[11px] font-bold">
                              مرخصی / ماموریت
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: LEAVE REQUESTS WORKFLOW */}
      {activeSubTab === 'leaves' && (
        <div className="space-y-4">
          {/* Leave Cartable Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-700 ml-1">وضعیت:</span>
              {[
                { key: 'ALL', label: 'همه' },
                { key: 'PENDING', label: 'در انتظار تأیید' },
                { key: LeaveStatus.APPROVED, label: 'تأییدشده' },
                { key: LeaveStatus.REJECTED, label: 'ردشده' },
              ].map((tab) => (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => setLeaveFilterStatus(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    leaveFilterStatus === tab.key
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {toPersianDigits(filteredLeaveRequests.length)} مورد
            </div>
          </div>

          {/* Leave Requests Workflow Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full min-w-[700px] text-right text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">نام کارمند</th>
                    <th className="p-3.5">نوع مرخصی</th>
                    <th className="p-3.5">بازه زمانی</th>
                    <th className="p-3.5">مدت</th>
                    <th className="p-3.5">دلیل</th>
                    <th className="p-3.5">وضعیت</th>
                    <th className="p-3.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredLeaveRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-bold text-slate-900">{req.employeeName}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
                          {req.leaveType === LeaveType.ANNUAL
                            ? 'استحقاقی'
                            : req.leaveType === LeaveType.SICK
                            ? 'استعلاجی'
                            : req.leaveType === LeaveType.HOURLY
                            ? 'ساعتی'
                            : req.leaveType === LeaveType.MARRIAGE
                            ? 'ازدواج'
                            : req.leaveType === LeaveType.MATERNITY
                            ? 'زایمان'
                            : 'بدون حقوق'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 font-medium">
                        از {toPersianDigits(req.startDateJalali)} تا {toPersianDigits(req.endDateJalali)}
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">
                        {toPersianDigits(req.daysCount)} روز کاری
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>
                      <td className="p-3.5">{getStatusChip(req.status)}</td>
                      <td className="p-3.5 text-center">
                        {/* Manager approval step */}
                        {req.status === LeaveStatus.PENDING_MANAGER &&
                          (currentRole === UserRole.DEPT_MANAGER ||
                            currentRole === UserRole.HR_DIRECTOR) && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onApproveLeave(req.id, true, 'موافقت مدیر واحد')}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                تأیید مدیر
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                   onApproveLeave(req.id, false, 'عدم موافقت به دلیل ترافیک کاری')
                                }
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 active:bg-rose-200 border border-rose-200 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                              >
                                رد
                              </button>
                            </div>
                          )}

                        {/* HR approval step */}
                        {req.status === LeaveStatus.PENDING_HR &&
                          currentRole === UserRole.HR_DIRECTOR && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onApproveLeave(req.id, true, 'تأیید نهایی منابع انسانی')
                                }
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                              >
                                تأیید منابع انسانی
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  onApproveLeave(req.id, false, 'عدم موافقت منابع انسانی')
                                }
                                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
                              >
                                رد
                              </button>
                            </div>
                          )}

                        {/* Approved / Rejected / Non-privileged indicators */}
                        {req.status === LeaveStatus.APPROVED && (
                          <span className="text-[11px] text-emerald-700 font-bold inline-flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>تأیید شده</span>
                          </span>
                        )}

                        {req.status === LeaveStatus.REJECTED && (
                          <span className="text-[11px] text-rose-600 font-bold">رد شده</span>
                        )}

                        {/* For employee role who cannot approve */}
                        {currentRole === UserRole.EMPLOYEE &&
                          (req.status === LeaveStatus.PENDING_MANAGER ||
                            req.status === LeaveStatus.PENDING_HR) && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              در انتظار بررسی
                            </span>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEAVE REQUEST FORM MODAL WITH JALALI DATE RANGE PICKER */}
      {isLeaveModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  ثبت درخواست مرخصی
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                title="بستن"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-4">
              {/* Leave Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع مرخصی</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl focus:border-emerald-600 focus:outline-hidden font-medium text-slate-800 cursor-pointer"
                >
                  <option value={LeaveType.ANNUAL}>استحقاقی (کسر از مانده سالانه)</option>
                  <option value={LeaveType.SICK}>استعلاجی (نیازمند گواهی پزشک)</option>
                  <option value={LeaveType.HOURLY}>ساعتی</option>
                  <option value={LeaveType.MARRIAGE}>ازدواج (۳ روز با حقوق)</option>
                  <option value={LeaveType.MATERNITY}>زایمان</option>
                  <option value={LeaveType.UNPAID}>بدون حقوق</option>
                </select>
              </div>

              {/* Date Range Picker using JalaliDatePicker with rangeStart and rangeEnd props */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <JalaliDatePicker
                  label="از تاریخ"
                  value={startDate}
                  rangeStart={startDate}
                  rangeEnd={endDate}
                  onChange={(v) => setStartDate(v)}
                  required
                />
                <JalaliDatePicker
                  label="تا تاریخ"
                  value={endDate}
                  rangeStart={startDate}
                  rangeEnd={endDate}
                  onChange={(v) => setEndDate(v)}
                  required
                />
              </div>

              {/* Live Working Days Indicator & Inline Pre-Warnings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">
                    {leaveType === LeaveType.HOURLY
                      ? 'مدت (کسری از روز، مثلاً ۰.۵)'
                      : 'تعداد روز کاری (بدون احتساب جمعه)'}
                  </span>
                  {currentYearBalance && leaveType === LeaveType.ANNUAL && (
                    <span className="text-emerald-700 text-[11px]">
                      مانده مرخصی: {toPersianDigits(currentYearBalance.remainingDays)} روز
                    </span>
                  )}
                </div>

                {leaveType === LeaveType.HOURLY ? (
                  <input
                    type="number"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={daysCount}
                    onChange={(e) => setDaysCount(parseFloat(e.target.value) || 0.5)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                  />
                ) : (
                  <div
                    className={`w-full px-3.5 py-2.5 text-xs rounded-xl font-bold flex items-center justify-between border ${
                      rangeInvalid
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : exceedsQuota
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-emerald-50/70 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    <span>
                      {previewDays === null
                        ? '—'
                        : previewDays < 0
                        ? 'تاریخ پایان پیش از تاریخ شروع است'
                        : `${toPersianDigits(previewDays)} روز کاری`}
                    </span>
                    <span className="text-[11px] font-medium opacity-80">
                      {previewDays !== null && previewDays > 0 ? 'محاسبه خودکار' : ''}
                    </span>
                  </div>
                )}

                {/* Inline Quota Exceeded Pre-Warning */}
                {exceedsQuota && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>کسری مانده مرخصی</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      مدت درخواست ({toPersianDigits(previewDays)} روز) بیشتر از مانده مرخصی شما (
                      {toPersianDigits(currentYearBalance?.remainingDays ?? 0)} روز) است. لطفاً بازه را تغییر دهید یا مرخصی بدون حقوق ثبت کنید.
                    </p>
                  </div>
                )}

                {/* Inline Marriage Leave Pre-Warning */}
                {leaveType === LeaveType.MARRIAGE && previewDays !== null && previewDays > 3 && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                      <span>محدودیت مرخصی ازدواج</span>
                    </div>
                    <p className="text-[11px] mt-1">
                      مرخصی ازدواج حداکثر ۳ روز کاری با حقوق است.
                    </p>
                  </div>
                )}

                {/* Error toast notification if any */}
                {localNotice && (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{localNotice}</span>
                  </div>
                )}
              </div>

              {/* Reason Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  دلیل مرخصی
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="توضیحات اختیاری..."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  disabled={rangeInvalid || exceedsQuota}
                  className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                    rangeInvalid || exceedsQuota
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white'
                  }`}
                >
                  ثبت درخواست
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
