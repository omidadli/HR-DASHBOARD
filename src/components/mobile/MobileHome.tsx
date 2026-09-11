import React from 'react';
import {
  Sparkles,
  FileText,
  Building2,
  Zap,
  Users,
  Briefcase,
  Clock,
  TrendingUp,
  Award,
  ChevronLeft,
  PhoneCall,
  Calendar,
  AlertCircle,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { HoldingDepartment, HRAutomationTask, HRDashboardMetrics } from '../../types';
import { toPersianDigits, formatToman } from '../../utils/jalali';

interface MobileHomeProps {
  metrics?: HRDashboardMetrics;
  departments?: HoldingDepartment[];
  automationTasks?: HRAutomationTask[];
  tasks?: HRAutomationTask[];
  onNavigateToVoice?: () => void;
  onNavigateToJobAd?: () => void;
  onNavigateToDepartments?: () => void;
  onNavigateToAutomations?: () => void;
  onNavigateToPortal?: () => void;
  onQuickRunAutomation?: (taskId: string) => Promise<void> | void;
  onNavigate?: (tab: any) => void;
  onRunTask?: (taskId: string) => Promise<void> | void;
}

export const MobileHome: React.FC<MobileHomeProps> = ({
  metrics,
  departments = [],
  automationTasks,
  tasks,
  onNavigateToVoice,
  onNavigateToJobAd,
  onNavigateToDepartments,
  onNavigateToAutomations,
  onNavigateToPortal,
  onQuickRunAutomation,
  onNavigate,
  onRunTask,
}) => {
  const taskList = automationTasks || tasks || [];
  const handleGoVoice = onNavigateToVoice || (() => onNavigate?.('voice'));
  const handleGoJobAd = onNavigateToJobAd || (() => onNavigate?.('jobAd'));
  const handleGoDepartments = onNavigateToDepartments || (() => onNavigate?.('departments'));
  const handleGoAutomations = onNavigateToAutomations || (() => onNavigate?.('automations'));
  const handleGoPortal = onNavigateToPortal || (() => onNavigate?.('portal'));
  const handleRun = onQuickRunAutomation || onRunTask || (async () => {});

  // Brands of Seilaneh Sabz Holding
  const holdingBrands = [
    { name: 'دافی', focus: 'مراقبت از پوست و دستمال‌های بهداشتی', badge: 'برند اصلی', icon: '🌿' },
    { name: 'کامان', focus: 'بهداشت تخصصی پوست و مو', badge: 'نوآور', icon: '✨' },
    { name: 'میس‌ویک', focus: 'سلامت دهان و دندان', badge: 'تخصصی', icon: '🦷' },
    { name: 'کاپوت', focus: 'سلامت خانواده و بهداشت فردی', badge: 'صادراتی', icon: '🛡️' },
    { name: 'آمبرلا', focus: 'مرطوب‌کننده و لوسیون بدن', badge: 'پرمصرف', icon: '💧' },
    { name: 'زنون', focus: 'محصولات بهداشتی آقایان', badge: 'مردانه', icon: '⚡' },
  ];

  return (
    <div className="space-y-4 px-3.5 sm:px-4 pt-2 pb-6">
      {/* 1. App-like Greeting Header Card */}
      <div
        id="mobile-greeting-card"
        className="p-4 sm:p-5 rounded-[20px] bg-gradient-to-br from-brand via-emerald-800 to-teal-900 text-white shadow-xl relative overflow-hidden border border-brand/40"
      >
        <div className="absolute top-0 left-0 w-44 h-44 bg-white/10 rounded-full -translate-x-12 -translate-y-12 blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5">
          {/* Top Row: Holding Badge & Jalali Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center font-black text-xs text-white">
                🌿
              </div>
              <div>
                <span className="text-xs font-black tracking-wide text-white block">
                  هلدینگ سیلانه سبز
                </span>
                <span className="text-[10px] text-emerald-200/90 font-mono tracking-wider">
                  SEILANEH SABZ HOLDING
                </span>
              </div>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-[11px] font-bold border border-white/20 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-200" />
              <span>امروز: {toPersianDigits('۱۴۰۴/۰۶/۱۸')}</span>
            </div>
          </div>

          {/* Personalized Greeting */}
          <div className="pt-0.5">
            <h1 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>روز بخیر، مهندس سهرابی عزیز!</span>
              <span className="text-base select-none">👋</span>
            </h1>
            <p className="text-xs text-emerald-100/85 leading-relaxed mt-1">
              پایش لحظه‌ای وضعیت ۱۳۵۰ کارمند ستاد و کارخانجات اشتهارد.
            </p>
          </div>

          {/* Voice Assistant Trigger Banner (App-like micro-interaction) */}
          <button
            type="button"
            id="mobile-voice-trigger-banner"
            onClick={handleGoVoice}
            className="w-full p-3 rounded-[14px] bg-white/15 hover:bg-white/25 active:scale-[0.98] border border-white/25 shadow-md flex items-center justify-between cursor-pointer transition-all text-right group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white text-brand flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
                <PhoneCall className="w-5 h-5 text-brand" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">
                    گفتگوی صوتی با دستیار هوش مصنوعی
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                    هوشمند
                  </span>
                </div>
                <span className="text-[10px] text-emerald-200 block truncate mt-0.5">
                  مثال: «یک آگهی شغلی برای مدیر برند دافی بنویس»
                </span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <ChevronLeft className="w-4 h-4 text-white group-hover:-translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* 2. Quick-Action Grid: 2×2 Tiles with Icons (Thumb-Zone Friendly) */}
      <section aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="sr-only">
          دسترسی‌های سریع
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Tile 1: AI Job Ad Generator */}
          <button
            type="button"
            id="mobile-tile-jobad"
            onClick={handleGoJobAd}
            className="min-h-[96px] p-3.5 rounded-[16px] bg-surface-1 border border-border-default hover:border-brand shadow-xs hover:shadow-sm text-right cursor-pointer transition-all active:scale-[0.97] flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-[12px] bg-brand-soft text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[6px] bg-brand-soft text-brand border border-brand/20">
                Gemini
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xs font-black text-text-1 block group-hover:text-brand transition-colors">
                تولید شرح شغل و آگهی
              </span>
              <span className="text-[10px] text-text-3 block mt-0.5 font-medium">
                نگارش با هوش مصنوعی
              </span>
            </div>
          </button>

          {/* Tile 2: 10 Holding Departments */}
          <button
            type="button"
            id="mobile-tile-departments"
            onClick={handleGoDepartments}
            className="min-h-[96px] p-3.5 rounded-[16px] bg-surface-1 border border-border-default hover:border-brand shadow-xs hover:shadow-sm text-right cursor-pointer transition-all active:scale-[0.97] flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-[12px] bg-surface-2 text-text-1 flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-surface-2 text-text-2 border border-border-default">
                ۱۰ واحد
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xs font-black text-text-1 block group-hover:text-brand transition-colors">
                دپارتمان‌های هلدینگ
              </span>
              <span className="text-[10px] text-text-3 block mt-0.5 font-medium">
                کارخانجات اشتهارد و ستاد
              </span>
            </div>
          </button>

          {/* Tile 3: Fast HR Automations */}
          <button
            type="button"
            id="mobile-tile-automations"
            onClick={handleGoAutomations}
            className="min-h-[96px] p-3.5 rounded-[16px] bg-surface-1 border border-border-default hover:border-brand shadow-xs hover:shadow-sm text-right cursor-pointer transition-all active:scale-[0.97] flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-[12px] bg-warning-soft text-warning flex items-center justify-center group-hover:bg-warning group-hover:text-white transition-colors shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-warning-soft text-warning">
                سریع
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xs font-black text-text-1 block group-hover:text-brand transition-colors">
                وظایف خودکار
              </span>
              <span className="text-[10px] text-text-3 block mt-0.5 font-medium">
                صرفه‌جویی در زمان
              </span>
            </div>
          </button>

          {/* Tile 4: Administrative & Personnel Portal */}
          <button
            type="button"
            id="mobile-tile-portal"
            onClick={handleGoPortal}
            className="min-h-[96px] p-3.5 rounded-[16px] bg-surface-1 border border-border-default hover:border-brand shadow-xs hover:shadow-sm text-right cursor-pointer transition-all active:scale-[0.97] flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between w-full">
              <div className="w-10 h-10 rounded-[12px] bg-info-soft text-info flex items-center justify-center group-hover:bg-info group-hover:text-white transition-colors shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-[6px] bg-info-soft text-info">
                کارتابل
              </span>
            </div>
            <div className="mt-2">
              <span className="text-xs font-black text-text-1 block group-hover:text-brand transition-colors">
                کارتابل پرسنلی
              </span>
              <span className="text-[10px] text-text-3 block mt-0.5 font-medium">
                فیش حقوق، تردد و مرخصی
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 3. Horizontal Snap-Scrolling Cards: Executive Holding KPIs */}
      <section className="space-y-2" aria-labelledby="kpi-snap-heading">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-brand" />
            <h2 id="kpi-snap-heading" className="text-xs font-black text-text-1">
              شاخص‌های کلیدی هلدینگ سیلانه سبز
            </h2>
          </div>
          <span className="text-[10px] font-bold text-text-3">
            مشاهده بیشتر
          </span>
        </div>

        {/* Snap-scroll container */}
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-2.5 pb-1">
          {/* Snap Card 1: Active Headcount */}
          <div className="snap-start min-w-[155px] sm:min-w-[170px] shrink-0 p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-3">کل پرسنل فعال</span>
              <span className="w-6 h-6 rounded-full bg-brand-soft text-brand flex items-center justify-center text-[10px]">
                👥
              </span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-text-1 font-mono">
                {metrics?.activeHeadcount != null ? `${toPersianDigits(metrics.activeHeadcount)} نفر` : '—'}
              </div>
              <span className="text-[10px] text-brand font-bold mt-0.5 block">
                +۱۲ رشد ماه جاری
              </span>
            </div>
          </div>

          {/* Snap Card 2: Open Positions */}
          <div className="snap-start min-w-[155px] sm:min-w-[170px] shrink-0 p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-3">فرصت‌های باز</span>
              <span className="w-6 h-6 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-[10px]">
                💼
              </span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-amber-600 font-mono">
                {metrics?.openPositionsCount != null ? `${toPersianDigits(metrics.openPositionsCount)} ردیف` : '—'}
              </div>
              <span className="text-[10px] text-text-3 font-medium mt-0.5 block">
                کارخانجات و ستاد
              </span>
            </div>
          </div>

          {/* Snap Card 3: Pending Leaves */}
          <div className="snap-start min-w-[155px] sm:min-w-[170px] shrink-0 p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-3">مرخصی‌های در انتظار</span>
              <span className="w-6 h-6 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center text-[10px]">
                🏖️
              </span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-teal-700 dark:text-teal-400 font-mono">
                {metrics?.pendingLeavesCount != null ? `${toPersianDigits(metrics.pendingLeavesCount)} درخواست` : '—'}
              </div>
              <span className="text-[10px] text-text-3 font-medium mt-0.5 block">
                در انتظار تأیید مدیران
              </span>
            </div>
          </div>

          {/* Snap Card 4: Turnover Rate */}
          <div className="snap-start min-w-[155px] sm:min-w-[170px] shrink-0 p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-3">نرخ خروج خدمت</span>
              <span className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-[10px]">
                📉
              </span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-brand font-mono">
                {metrics?.turnoverRatePct != null ? `${toPersianDigits(metrics.turnoverRatePct)}٪` : '—'}
              </div>
              <span className="text-[10px] text-brand font-bold mt-0.5 block">
                پایین‌تر از میانگین صنعت FMCG
              </span>
            </div>
          </div>

          {/* Snap Card 5: Average Time to Hire */}
          <div className="snap-start min-w-[155px] sm:min-w-[170px] shrink-0 p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-text-3">میانگین زمان جذب</span>
              <span className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-[10px]">
                ⏱️
              </span>
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-text-1 font-mono">
                {metrics?.averageTimeToHireDays != null ? `${toPersianDigits(metrics.averageTimeToHireDays)} روز` : '—'}
              </div>
              <span className="text-[10px] text-text-3 font-medium mt-0.5 block">
                از انتشار تا جذب قطعی
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Horizontal Snap-Scrolling Cards: Holding Brands Showcase */}
      <section className="space-y-2" aria-labelledby="brands-snap-heading">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-brand" />
            <h2 id="brands-snap-heading" className="text-xs font-black text-text-1">
              برندهای هلدینگ سیلانه سبز
            </h2>
          </div>
          <span className="text-[10px] text-text-3 font-medium">
            ۶ برند تخصصی
          </span>
        </div>

        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-2.5 pb-1">
          {holdingBrands.map((brand, idx) => (
            <div
              key={idx}
              className="snap-start min-w-[190px] shrink-0 p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-2xs flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center text-sm shadow-2xs">
                  {brand.icon}
                </div>
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-surface-2 text-text-2 border border-border-default">
                  {brand.badge}
                </span>
              </div>
              <div>
                <span className="text-xs font-black text-text-1 block">
                  {brand.name}
                </span>
                <p className="text-[10px] text-text-3 leading-relaxed mt-0.5">
                  {brand.focus}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 1-Click Fast Automations List */}
      <section className="bg-surface-1 rounded-[18px] p-4 border border-border-default shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-warning" />
            <h2 className="text-xs font-black text-text-1">
              وظایف خودکار سریع
            </h2>
          </div>
          <button
            type="button"
            onClick={handleGoAutomations}
            className="min-h-[44px] px-2 text-[11px] text-brand font-bold hover:underline flex items-center gap-0.5 cursor-pointer select-none"
          >
            <span>مشاهده همه</span>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {taskList.slice(0, 3).map((task) => (
            <div
              key={task.id}
              className="p-3 rounded-[12px] bg-surface-2/70 border border-border-default flex items-center justify-between gap-2 hover:border-brand/40 transition-colors"
            >
              <div className="space-y-0.5 min-w-0 flex-1">
                <span className="text-xs font-bold text-text-1 block truncate">
                  {task.title}
                </span>
                <span className="text-[10px] text-text-3 block">
                  صرفه‌جویی تخمینی: {task.estimatedTimeSaved}
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleRun(task.id)}
                className="min-h-[44px] px-3.5 py-1.5 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-[11px] font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0 select-none active:scale-95"
              >
                <Zap className="w-3 h-3 fill-white" />
                <span>اجرا</span>
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
