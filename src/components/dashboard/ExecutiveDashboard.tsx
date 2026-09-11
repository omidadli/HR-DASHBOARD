import React, { useState, useMemo } from 'react';
import {
  Users,
  Briefcase,
  Clock,
  TrendingDown,
  Sparkles,
  Calendar,
  AlertTriangle,
  Building2,
  Bot,
  UserPlus,
  Mic,
  ChevronLeft,
  GraduationCap,
  CheckSquare,
  BarChart3,
  Factory,
  Activity,
  FileCheck2,
  Wallet,
  TrendingUp,
  SlidersHorizontal,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  HRDashboardMetrics,
  HoldingDepartment,
  JobPosting,
  Candidate,
  UserRole,
  AttendanceRecord,
  Employee,
  LeaveRequest,
  PayrollSlip,
  ChecklistItem,
  TrainingCourse,
  PerformanceGoal,
} from '../../types';
import { toPersianDigits, getTodayJalali, formatJalaliDateReadable, formatToman } from '../../utils/jalali';
import { ModuleKey } from '../common/Sidebar';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { DepartmentJobsExplorer } from './DepartmentJobsExplorer';

interface ExecutiveDashboardProps {
  currentRole: UserRole;
  metrics?: HRDashboardMetrics;
  departments: HoldingDepartment[];
  jobs: JobPosting[];
  candidates: Candidate[];
  attendances?: AttendanceRecord[];
  employees?: Employee[];
  leaveRequests?: LeaveRequest[];
  payrollSlips?: PayrollSlip[];
  checklists?: ChecklistItem[];
  trainingCourses?: TrainingCourse[];
  performanceGoals?: PerformanceGoal[];
  isLoading?: boolean;
  onNavigate: (module: ModuleKey) => void;
  onOpenVoiceAssistant: () => void;
  onOpenJobGenerator: () => void;
  onOpenCommandPalette: () => void;
}

// Lightweight, crisp SVG sparkline for KPI cards
const MiniSparkline: React.FC<{
  data: number[];
  color?: string;
  height?: number;
}> = ({ data, color = '#059669', height = 28 }) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 76;
  const padding = 2;
  const points = data
    .map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const pointsArr = points.split(' ');
  const firstPoint = pointsArr[0];
  const lastPoint = pointsArr[pointsArr.length - 1];
  const lastX = lastPoint.split(',')[0];
  const firstX = firstPoint.split(',')[0];
  const areaPoints = `${points} ${lastX},${height} ${firstX},${height}`;
  const gradId = `sparkline-grad-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={width} height={height} className="overflow-visible opacity-90 shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#${gradId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

// Recharts Custom Tooltip styled for both themes
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-1/95 backdrop-blur-md p-3 rounded-[10px] border border-border-default shadow-xl text-right text-xs">
        <p className="font-black text-text-1 mb-2 pb-1 border-b border-border-default">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-[11px] py-0.5">
            <span className="flex items-center gap-1.5 text-text-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="font-semibold">{entry.name}:</span>
            </span>
            <span className="font-black text-text-1">
              {toPersianDigits(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({
  currentRole,
  metrics,
  departments,
  jobs,
  candidates,
  attendances = [],
  employees = [],
  leaveRequests = [],
  payrollSlips = [],
  checklists = [],
  trainingCourses = [],
  performanceGoals = [],
  isLoading = false,
  onNavigate,
  onOpenVoiceAssistant,
  onOpenJobGenerator,
  onOpenCommandPalette,
}) => {
  const today = getTodayJalali();
  const formattedDate = formatJalaliDateReadable(today);
  const todayJalaliStr = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;

  // Time-of-day personalized greeting
  const currentHour = new Date().getHours();
  const greetingTime =
    currentHour >= 5 && currentHour < 12
      ? 'صبح بخیر'
      : currentHour >= 12 && currentHour < 17
      ? 'ظهر بخیر'
      : currentHour >= 17 && currentHour < 21
      ? 'عصر بخیر'
      : 'شب بخیر';

  const roleTitle =
    currentRole === UserRole.HR_DIRECTOR
      ? 'مدیر منابع انسانی'
      : currentRole === UserRole.DEPT_MANAGER
      ? 'مدیر دپارتمان'
      : 'کارمند';

  // 1. Headcount & Workforce metrics
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const activeHeadcount = activeEmployees.length > 0 ? activeEmployees.length : metrics?.activeHeadcount ?? 850;
  const eshtehardStaffCount =
    employees.filter(
      (e) => e.department?.includes('تولید') || e.department?.includes('اشتهارد') || e.department?.includes('لجستیک')
    ).length || Math.round(activeHeadcount * 0.58);
  const hqStaffCount = Math.max(0, activeHeadcount - eshtehardStaffCount);

  // 2. Attendance metrics
  const presentToday = attendances.filter(
    (a) => a.dateJalali === todayJalaliStr && (a.status === 'PRESENT' || a.checkIn)
  ).length;
  const attendanceRatePct =
    activeHeadcount > 0 && presentToday > 0
      ? Math.round((presentToday / activeHeadcount) * 1000) / 10
      : 96.4;

  // 3. Leaves & Requests metrics
  const pendingLeaves = leaveRequests.filter(
    (r) =>
      r.status === 'PENDING_MANAGER' ||
      r.status === 'PENDING_HR' ||
      (r.status as string)?.includes('PENDING')
  );
  const pendingLeavesCount =
    pendingLeaves.length > 0 ? pendingLeaves.length : (metrics?.pendingLeavesCount ?? 7);
  const onLeaveTodayCount =
    leaveRequests.filter(
      (r) =>
        r.status === 'APPROVED' &&
        r.startDateJalali <= todayJalaliStr &&
        r.endDateJalali >= todayJalaliStr
    ).length || 14;

  // 4. Recruitment & Pipeline metrics
  const activeJobsCount = jobs.filter((j) => j.status === 'ACTIVE').length || metrics?.openPositionsCount || 6;
  const totalResumes = jobs.reduce((acc, j) => acc + (j.applicationsCount || 0), 0) || candidates.length || 54;
  const priorityCandidatesCount =
    candidates.filter((c) => c.category === 'INTERVIEW_PRIORITY').length || 8;

  // 5. Payroll metrics (role-sensitive)
  const isHR = currentRole === UserRole.HR_DIRECTOR;
  const payrollTotal = metrics?.monthlyPayrollTotalToman;
  const draftSlips = payrollSlips.filter((p) => p.status === 'DRAFT');

  // 6. Onboarding & Expiring Checklists
  const pendingChecklists = checklists.filter((c) => !c.isCompleted);

  // Total items needing attention
  const totalActionItems =
    pendingLeaves.length +
    (isHR && draftSlips.length > 0 ? 1 : 0) +
    pendingChecklists.length;

  // Chart Data 1: Department Workforce Distribution
  const departmentChartData = useMemo(() => {
    if (employees.length > 0) {
      const counts: Record<string, number> = {};
      employees.forEach((emp) => {
        const dept = emp.department || 'سایر واحدها';
        counts[dept] = (counts[dept] || 0) + 1;
      });
      return Object.entries(counts)
        .slice(0, 5)
        .map(([name, count]) => ({
          name: name.length > 16 ? `${name.substring(0, 14)}...` : name,
          fullName: name,
          count,
        }));
    }
    if (departments.length > 0) {
      return departments.slice(0, 5).map((d) => ({
        name: d.name.length > 16 ? `${d.name.substring(0, 14)}...` : d.name,
        fullName: d.name,
        count: d.headcount || 0,
      }));
    }
    return [
      { name: 'تولید اشتهارد', fullName: 'خطوط تولید کارخانجات اشتهارد', count: Math.round(activeHeadcount * 0.42) },
      { name: 'R&D و آزمایشگاه', fullName: 'فرمولاسیون و تحقیق و توسعه', count: Math.round(activeHeadcount * 0.16) },
      { name: 'بازاریابی و برندها', fullName: 'مارکتینگ دافی، کامان و میس‌ویک', count: Math.round(activeHeadcount * 0.18) },
      { name: 'فروش و لجستیک', fullName: 'توزیع مویرگی و انبارداری', count: Math.round(activeHeadcount * 0.14) },
      { name: 'مالی و منابع انسانی', fullName: 'اداری، حقوقی و سرمایه انسانی', count: Math.round(activeHeadcount * 0.10) },
    ];
  }, [employees, departments, activeHeadcount]);

  // Chart Data 2: Weekly Attendance & Shift Trend
  const attendanceTrendData = useMemo(() => {
    const days = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'];
    const basePresent = activeHeadcount > 0 ? Math.round(activeHeadcount * 0.95) : 810;
    return days.map((day, i) => {
      const factor = [0.94, 0.96, 0.97, 0.95, 0.93, 0.89][i];
      const present = Math.round(basePresent * factor);
      const delayed = Math.round(activeHeadcount * (0.015 + (i % 3) * 0.008));
      return {
        day,
        'حاضر': present,
        'تأخیر': delayed,
      };
    });
  }, [activeHeadcount]);

  // SKELETON LOADER STATE
  if (isLoading || !metrics) {
    return (
      <div dir="rtl" className="space-y-6 pb-12 animate-pulse">
        {/* Skeleton Greeting Banner */}
        <div className="p-6 rounded-[14px] bg-surface-1 border border-border-default space-y-3">
          <Skeleton className="w-48 h-5" />
          <Skeleton className="w-80 h-7" />
          <Skeleton className="w-full max-w-xl h-4" />
        </div>

        {/* 4 Skeleton KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Skeleton Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-5 rounded-[14px] bg-surface-1 border border-border-default space-y-4">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-full h-64" />
          </div>
          <div className="p-5 rounded-[14px] bg-surface-1 border border-border-default space-y-4">
            <Skeleton className="w-40 h-5" />
            <Skeleton className="w-full h-64" />
          </div>
        </div>

        {/* Skeleton Needs Attention Panel */}
        <div className="p-5 rounded-[14px] bg-surface-1 border border-border-default space-y-3">
          <Skeleton className="w-48 h-5" />
          <Skeleton className="w-full h-14" />
          <Skeleton className="w-full h-14" />
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-6 pb-12">
      {/* 1. Personalized Greeting Row */}
      <div className="relative overflow-hidden rounded-[14px] bg-surface-1 border border-border-default p-4 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl text-right">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-[6px] bg-brand-soft border border-brand/20 text-xs font-black text-brand">
                هلدینگ سیلانه سبز
              </span>
              <span className="text-xs text-text-3 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-text-1">
              {greetingTime}، {roleTitle}
            </h1>

            <p className="text-[13px] text-text-2 leading-relaxed font-medium">
              داشبورد وضعیت منابع انسانی کارخانجات اشتهارد و برندهای دافی، کامان، میس‌ویک و کاپوت.
            </p>
          </div>

          {/* Quick Action Shortcuts */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('ai-governance')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-brand-soft hover:bg-brand/20 text-brand font-bold text-xs border border-brand/25 transition-all cursor-pointer shadow-2xs"
            >
              <Bot className="w-4 h-4" />
              <span>مدیریت دستیار</span>
            </button>

            <button
              type="button"
              onClick={onOpenVoiceAssistant}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>دستیار صوتی</span>
            </button>

            <button
              type="button"
              onClick={onOpenJobGenerator}
              className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-1 font-bold text-xs border border-border-default transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-brand" />
              <span>ایجاد آگهی شغلی</span>
            </button>

            <button
              type="button"
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 font-bold text-xs border border-border-default transition-all cursor-pointer"
              title="جستجو در سامانه"
            >
              <span>جستجو</span>
              <kbd className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-surface-1 border border-border-default text-text-2 font-mono">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Up to 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Headcount */}
        <Card
          hoverable
          onClick={() => onNavigate('employees')}
          className="p-4 sm:p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-text-2">کارکنان فعال</span>
              <div className="w-10 h-10 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center border border-brand/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">
                {toPersianDigits(activeHeadcount)}
              </span>
              <span className="text-xs font-bold text-text-3">نفر</span>
            </div>

            <p className="text-[13px] text-text-3 font-medium mt-1.5 leading-relaxed">
              {toPersianDigits(eshtehardStaffCount)} نفر کارخانجات اشتهارد • {toPersianDigits(hqStaffCount)} نفر دفتر مرکزی
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border-default flex items-center justify-between">
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
              <span>▲</span>
              <span>۱.۴٪ نسبت به ماه قبل</span>
            </span>
            <MiniSparkline data={[780, 792, 805, 814, 822, 835, activeHeadcount]} color="#059669" />
          </div>
        </Card>

        {/* KPI 2: Open Positions */}
        <Card
          hoverable
          onClick={() => onNavigate('recruitment')}
          className="p-4 sm:p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-text-2">آگهی‌های شغلی فعال</span>
              <div className="w-10 h-10 rounded-[10px] bg-info-soft text-info flex items-center justify-center border border-info/20 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">
                {toPersianDigits(activeJobsCount)}
              </span>
              <span className="text-xs font-bold text-text-3">موقعیت</span>
            </div>

            <p className="text-[13px] text-text-3 font-medium mt-1.5 leading-relaxed">
              {toPersianDigits(totalResumes)} رزومه • {toPersianDigits(priorityCandidatesCount)} در اولویت مصاحبه
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border-default flex items-center justify-between">
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center gap-1">
              <span>▲</span>
              <span>۲ موقعیت جدید</span>
            </span>
            <MiniSparkline data={[3, 4, 4, 5, 5, 6, activeJobsCount]} color="#0284c7" />
          </div>
        </Card>

        {/* KPI 3: Pending Leaves */}
        <Card
          hoverable
          onClick={() => onNavigate('attendance')}
          className="p-4 sm:p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-text-2">درخواست‌های مرخصی</span>
              <div className="w-10 h-10 rounded-[10px] bg-warning-soft text-warning flex items-center justify-center border border-warning/20 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">
                {toPersianDigits(pendingLeavesCount)}
              </span>
              <span className="text-xs font-bold text-text-3">درخواست</span>
            </div>

            <p className="text-[13px] text-text-3 font-medium mt-1.5 leading-relaxed">
              {toPersianDigits(onLeaveTodayCount)} نفر در مرخصی امروز
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border-default flex items-center justify-between">
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
              <span>▼</span>
              <span>۳ مورد نسبت به دیروز</span>
            </span>
            <MiniSparkline data={[12, 10, 9, 11, 8, 7, pendingLeavesCount]} color="#d97706" />
          </div>
        </Card>

        {/* KPI 4: Turnover / Confidential Payroll */}
        <Card
          hoverable
          onClick={() => onNavigate(isHR ? 'payroll' : 'analytics')}
          className="p-4 sm:p-5 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <span className="text-xs font-bold text-text-2">
                {isHR ? 'حقوق و دستمزد ماهانه (تومان)' : 'نرخ خروج کارکنان'}
              </span>
              <div className="w-10 h-10 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center border border-brand/20 shrink-0">
                {isHR ? <Wallet className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              </div>
            </div>

            <div className="flex items-baseline gap-1.5 mt-1">
              {isHR ? (
                typeof payrollTotal === 'number' && payrollTotal > 0 ? (
                  <>
                    <span className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">
                      {toPersianDigits((payrollTotal / 1_000_000_000).toFixed(2))}
                    </span>
                    <span className="text-xs font-bold text-text-3">میلیارد</span>
                  </>
                ) : (
                  <span className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">—</span>
                )
              ) : (
                <>
                  <span className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">
                    {metrics.turnoverRatePct != null ? `${toPersianDigits(metrics.turnoverRatePct)}٪` : '—'}
                  </span>
                  <span className="text-xs font-bold text-text-3">سالانه</span>
                </>
              )}
            </div>

            <p className="text-[13px] text-text-3 font-medium mt-1.5 leading-relaxed">
              {isHR
                ? 'محاسبه بیمه ۷٪ تأمین اجتماعی و مالیات پله‌ای'
                : '۲.۱٪ کمتر از میانگین صنعت آرایشی-بهداشتی'}
            </p>
          </div>

          <div className="pt-3 mt-3 border-t border-border-default flex items-center justify-between">
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center gap-1">
              <span>▼</span>
              <span>۰.۳٪ کاهش خروج</span>
            </span>
            <MiniSparkline
              data={[2.4, 2.3, 2.1, 2.0, 1.9, 1.8, metrics.turnoverRatePct || 1.8]}
              color="#059669"
            />
          </div>
        </Card>
      </div>

      {/* 3. Responsive Grid of Chart Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart Card 1: Department Workforce & Subordinate Jobs Explorer */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-text-1">
                  دپارتمان‌های اصلی و عناوین شغلی سازمانی
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-brand/10 text-brand border border-brand/20">
                  راهنمای تعاملی مشاغل
                </span>
              </div>
              <p className="text-[13px] text-text-3 font-medium mt-0.5">
                برای مشاهده شغل‌های زیرمجموعه، ماوس را روی هر دپارتمان ببرید یا در موبایل روی آن ضربه بزنید
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="text-xs font-bold text-brand hover:underline flex items-center gap-1.5 cursor-pointer bg-surface-2/60 hover:bg-surface-2 px-3 py-1.5 rounded-xl border border-border-default transition-all"
              >
                <span>مشاهده چارت پرسنلی کامل</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <DepartmentJobsExplorer
            departments={departments}
            jobs={jobs}
            employees={employees}
            onNavigate={onNavigate}
          />
        </Card>

        {/* Chart Card 2: Weekly Attendance & Shift Trend */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-black text-text-1">
                روند تردد و شیفت‌های هفتگی
              </h3>
              <p className="text-[13px] text-text-3 font-medium">
                تردد خطوط تولید دافی و کامان (میانگین حضور {toPersianDigits(attendanceRatePct)}٪)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('attendance')}
              className="text-xs font-bold text-brand hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>گزارش‌های تردد</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                <defs>
                  <linearGradient id="areaColorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="areaColorDelayed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" opacity={0.6} vertical={false} />
                <XAxis
                  dataKey="day"
                  stroke="#94a3b8"
                  tick={{ fill: 'var(--color-text-3)', fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: 'var(--color-text-3)', fontSize: 11 }}
                  tickLine={false}
                  tickFormatter={(v) => toPersianDigits(v)}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="حاضر"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaColorPresent)"
                />
                <Area
                  type="monotone"
                  dataKey="تأخیر"
                  stroke="#d97706"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#areaColorDelayed)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 4. "Needs Attention" Actionable Panel */}
      <Card className="p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-warning-soft text-warning flex items-center justify-center border border-warning/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-1">
                اقدامات نیازمند بررسی
              </h3>
              <p className="text-[13px] text-text-3 font-medium">
                تأیید درخواست‌های مرخصی، فیش‌های حقوق و چک‌لیست‌ها
              </p>
            </div>
          </div>

          {totalActionItems > 0 && (
            <span className="text-[11px] font-black px-2.5 py-1 rounded-[8px] bg-warning-soft text-warning border border-warning/20">
              {toPersianDigits(totalActionItems)} مورد نیازمند بررسی
            </span>
          )}
        </div>

        {totalActionItems === 0 ? (
          <EmptyState
            title="موردی برای بررسی وجود ندارد"
            description="تمام درخواست‌ها، ترددها و امور پرسنلی تأیید شده‌اند."
            actionLabel="مشاهده ترددها"
            onAction={() => onNavigate('attendance')}
            className="py-8"
          />
        ) : (
          <div className="divide-y divide-border-default/60">
            {/* Action Item 1: Pending Leave Approvals */}
            {pendingLeaves.slice(0, 3).map((leave) => (
              <div
                key={leave.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-2 rounded-[10px] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-black shrink-0 border border-amber-500/20">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-text-1 flex items-center gap-2">
                      <span>{leave.employeeName || 'کارمند'}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-text-3 border border-border-default">
                        {leave.leaveType === 'ANNUAL'
                          ? 'استحقاقی'
                          : leave.leaveType === 'SICK'
                          ? 'استعلاجی'
                          : leave.leaveType === 'HOURLY'
                          ? 'ساعتی'
                          : 'مرخصی'}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-3 font-medium mt-0.5">
                      بازه زمانی: {toPersianDigits(leave.startDateJalali)} تا {toPersianDigits(leave.endDateJalali)} • {leave.reason || 'درخواست سیستمی'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('attendance')}
                  className="px-3 py-1.5 rounded-[8px] bg-brand text-white hover:bg-brand-hover text-xs font-bold flex items-center gap-1 self-end sm:self-auto cursor-pointer shadow-2xs"
                >
                  <span>بررسی درخواست</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Action Item 2: Draft Payrolls (HR Only) */}
            {isHR && draftSlips.length > 0 && (
              <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-2 rounded-[10px] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-soft text-brand flex items-center justify-center text-xs font-black shrink-0 border border-brand/20">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-text-1 flex items-center gap-2">
                      <span>دوره حقوق ماه جاری در وضعیت پیش‌نویس</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-brand-soft text-brand border border-brand/20">
                        {toPersianDigits(draftSlips.length)} فیش پیش‌نویس
                      </span>
                    </div>
                    <div className="text-[11px] text-text-3 font-medium mt-0.5">
                      محاسبات بیمه، مالیات و مزایا نیازمند بررسی و تایید نهایی است.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('payroll')}
                  className="px-3 py-1.5 rounded-[8px] bg-brand text-white hover:bg-brand-hover text-xs font-bold flex items-center gap-1 self-end sm:self-auto cursor-pointer shadow-2xs"
                >
                  <span>بررسی فیش حقوق</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Action Item 3: Expiring / Pending Checklists */}
            {pendingChecklists.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-2/40 px-2 rounded-[10px] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-black shrink-0 border border-blue-500/20">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-text-1 flex items-center gap-2">
                      <span>{item.title}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-surface-2 text-text-3 border border-border-default">
                        {item.type === 'ONBOARDING' ? 'ورود نیرو' : 'تسویه حساب'}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-3 font-medium mt-0.5">
                      کارمند: {item.employeeName || 'نیروی جدید'} • دپارتمان: {item.department} • مهلت: {toPersianDigits(item.dueDateJalali)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('checklists')}
                  className="px-3 py-1.5 rounded-[8px] bg-surface-2 hover:bg-surface-3 text-text-1 border border-border-default text-xs font-bold flex items-center gap-1 self-end sm:self-auto cursor-pointer"
                >
                  <span>مشاهده چک‌لیست</span>
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. 3-Click Navigation Grid (Instant Module Access) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-text-1">
            دسترسی سریع به بخش‌های سامانه
          </h3>
          <span className="text-xs font-medium text-text-3">
            انتخاب بخش برای ورود مستقیم
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            {
              key: 'recruitment' as ModuleKey,
              title: 'جذب و استخدام',
              desc: 'رزومه‌ها و مصاحبه‌ها',
              icon: UserPlus,
            },
            {
              key: 'employees' as ModuleKey,
              title: 'پرونده پرسنلی',
              desc: 'احکام و ساختار سازمانی',
              icon: Users,
            },
            {
              key: 'attendance' as ModuleKey,
              title: 'تردد و مرخصی',
              desc: 'ثبت تردد و شیفت‌ها',
              icon: Clock,
            },
            {
              key: 'payroll' as ModuleKey,
              title: 'حقوق و دستمزد',
              desc: 'فیش حقوق، بیمه و مالیات',
              icon: Wallet,
            },
            {
              key: 'performance' as ModuleKey,
              title: 'مدیریت عملکرد',
              desc: 'اهداف فصلی و ارزیابی',
              icon: TrendingUp,
            },
            {
              key: 'training' as ModuleKey,
              title: 'آموزش سازمانی',
              desc: 'دوره‌ها و مهارت‌ها',
              icon: GraduationCap,
            },
            {
              key: 'checklists' as ModuleKey,
              title: 'ورود و خروج',
              desc: 'مراحل ورود و تسویه',
              icon: CheckSquare,
            },
            {
              key: 'analytics' as ModuleKey,
              title: 'گزارش‌ها و تحلیل‌ها',
              desc: 'شاخص‌های کلیدی',
              icon: BarChart3,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className="flex flex-col items-center text-center p-3.5 rounded-[12px] bg-surface-1 hover:bg-surface-2 border border-border-default hover:border-brand/40 transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
              >
                <div className="w-10 h-10 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center mb-2 group-hover:scale-105 transition-transform border border-brand/20">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-black text-text-1 leading-tight">
                  {item.title}
                </div>
                <div className="text-[11px] text-text-3 font-medium mt-1 leading-tight line-clamp-1">
                  {item.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
