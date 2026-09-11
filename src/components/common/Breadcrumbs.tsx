import React from 'react';
import {
  ChevronLeft,
  Home,
  Smartphone,
} from 'lucide-react';
import { ModuleKey } from './Sidebar';
import { UserRole } from '../../types';

interface BreadcrumbsProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  currentRole?: UserRole;
  isPwaPortalMode?: boolean;
  onTogglePwaPortalMode?: () => void;
}

const moduleTitles: Record<ModuleKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'داشبورد اجرایی', subtitle: 'وضعیت کلی هلدینگ و شاخص‌های منابع انسانی' },
  tasks: { title: 'میز کار و وظایف', subtitle: 'برنامه‌ریزی هوشمند امور روزانه، هفتگی و ماهانه منابع انسانی (Notion Workspace)' },
  'ai-governance': { title: 'مدیریت دستیار', subtitle: 'تنظیم رفتار دستیار، سند فرهنگ سازمانی و اتصال Gemini' },
  recruitment: { title: 'جذب و استخدام', subtitle: 'فرآیند جذب، رزومه‌ها، ارزیابی و مصاحبه‌ها' },
  employees: { title: 'پرونده پرسنلی', subtitle: 'اطلاعات کارکنان، احکام و چارت سازمانی' },
  attendance: { title: 'تردد و مرخصی', subtitle: 'ثبت تردد کارخانه و مانده مرخصی' },
  payroll: { title: 'حقوق و دستمزد', subtitle: 'صدور فیش حقوق بر اساس قانون کار، بیمه و مالیات' },
  performance: { title: 'ارزیابی عملکرد', subtitle: 'اهداف فصلی، شایستگی‌ها و ارزیابی دوره‌ای' },
  training: { title: 'آموزش کارکنان', subtitle: 'دوره‌های آموزشی، استانداردهای GMP و ماتریس مهارت' },
  checklists: { title: 'چک‌لیست استخدام و تسویه', subtitle: 'مراحل ورود، تحویل اقلام و تسویه حساب' },
  analytics: { title: 'گزارش‌ها و تحلیل‌ها', subtitle: 'شاخص‌های کلیدی منابع انسانی' },
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeModule,
  onSelectModule,
  isPwaPortalMode,
  onTogglePwaPortalMode,
}) => {
  const current = moduleTitles[activeModule] || moduleTitles.dashboard;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 mb-5 border-b border-border-default">
      {/* Breadcrumbs Trail & Module Title */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-text-3 font-medium mb-1">
          <button
            type="button"
            onClick={() => onSelectModule('dashboard')}
            className="flex items-center gap-1 hover:text-brand transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>سامانه کارا</span>
          </button>
          <ChevronLeft className="w-3 h-3 text-text-3" />
          <span className="text-text-1 font-bold">{current.title}</span>
        </nav>
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-xl font-black text-text-1 tracking-tight">
            {current.title}
          </h2>
          <span className="text-xs text-text-3 font-medium hidden md:inline">
            — {current.subtitle}
          </span>
        </div>
      </div>

      {/* Mobile PWA Portal Switcher Action */}
      {onTogglePwaPortalMode && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePwaPortalMode}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface-1 hover:bg-surface-2 text-text-2 hover:text-brand border border-border-default text-xs font-bold transition-all cursor-pointer shadow-2xs select-none active:scale-95"
            title="نمای همراه"
          >
            <Smartphone className="w-4 h-4 text-brand" />
            <span>{isPwaPortalMode ? 'بازگشت به پیشخوان' : 'نمای همراه'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

