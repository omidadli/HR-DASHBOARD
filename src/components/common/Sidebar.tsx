import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Clock,
  Wallet,
  TrendingUp,
  GraduationCap,
  CheckSquare,
  BarChart3,
  Sparkles,
  LayoutDashboard,
  X,
  Lock,
  ChevronRight,
  ChevronLeft,
  Factory,
  ShieldAlert,
  ListTodo,
} from 'lucide-react';

export type ModuleKey =
  | 'dashboard'
  | 'tasks'
  | 'ai-governance'
  | 'recruitment'
  | 'employees'
  | 'attendance'
  | 'payroll'
  | 'performance'
  | 'training'
  | 'checklists'
  | 'analytics';

/**
 * Role-based module visibility (audit fix SEC-02).
 * Strictly preserved without any modifications to business permissions.
 */
export const MODULE_ACCESS: Record<ModuleKey, UserRole[]> = {
  dashboard: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  tasks: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  'ai-governance': [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER],
  recruitment: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER],
  employees: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  attendance: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  payroll: [UserRole.HR_DIRECTOR],
  performance: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  training: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  checklists: [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER, UserRole.EMPLOYEE],
  analytics: [UserRole.HR_DIRECTOR],
};

export const canAccessModule = (role: UserRole, module: ModuleKey): boolean =>
  MODULE_ACCESS[module]?.includes(role) ?? false;

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  currentRole?: UserRole;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ModuleItem {
  key: ModuleKey;
  label: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  comingSoon?: boolean;
}

interface ModuleGroup {
  id: string;
  title: string;
  items: ModuleItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  currentRole = UserRole.HR_DIRECTOR,
  isMobileOpen = false,
  onCloseMobile,
  isCollapsed: controlledCollapsed,
  onToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kara_sidebar_collapsed') === 'true';
    }
    return false;
  });

  const isCollapsed =
    controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const moduleGroups: ModuleGroup[] = [
    {
      id: 'core',
      title: 'پیشخوان',
      items: [
        {
          key: 'dashboard',
          label: 'داشبورد اجرایی',
          description: 'وضعیت کلی هلدینگ و شاخص‌ها',
          icon: LayoutDashboard,
        },
        {
          key: 'tasks',
          label: 'میز کار و وظایف',
          description: 'مدیریت روزانه، هفتگی و ماهانه (Notion)',
          icon: ListTodo,
          badge: 'هوشمند',
        },
        {
          key: 'analytics',
          label: 'گزارش‌ها و تحلیل‌ها',
          description: 'تحلیل هزینه‌ها و شاخص‌های KPI',
          icon: BarChart3,
          badge: 'مدیر منابع انسانی',
        },
      ],
    },
    {
      id: 'human_capital',
      title: 'سرمایه انسانی',
      items: [
        {
          key: 'employees',
          label: 'پرونده پرسنلی',
          description: 'اطلاعات کارکنان و چارت سازمانی',
          icon: Users,
        },
        {
          key: 'recruitment',
          label: 'جذب و استخدام',
          description: 'فرآیند جذب، غربالگری و مصاحبه‌ها',
          icon: UserPlus,
        },
        {
          key: 'checklists',
          label: 'چک‌لیست استخدام و تسویه',
          description: 'مراحل ورود، تحویل اقلام و تسویه حساب',
          icon: CheckSquare,
        },
      ],
    },
    {
      id: 'factory_ops',
      title: 'کارخانجات و تردد',
      items: [
        {
          key: 'attendance',
          label: 'تردد و مرخصی',
          description: 'ثبت تردد کارخانه و سهمیه مرخصی',
          icon: Clock,
        },
        {
          key: 'payroll',
          label: 'حقوق و دستمزد',
          description: 'محاسبه حقوق، بیمه ۷٪ و فیش حقوق',
          icon: Wallet,
          badge: 'محرمانه',
        },
      ],
    },
    {
      id: 'learning_perf',
      title: 'ارزیابی و آموزش',
      items: [
        {
          key: 'performance',
          label: 'ارزیابی عملکرد',
          description: 'اهداف فصلی، شایستگی‌ها و ارزیابی دوره‌ای',
          icon: TrendingUp,
        },
        {
          key: 'training',
          label: 'آموزش کارکنان',
          description: 'دوره‌های آموزشی، استانداردهای GMP و مهارت‌ها',
          icon: GraduationCap,
        },
      ],
    },
    {
      id: 'ai_governance',
      title: 'دستیار هوش مصنوعی',
      items: [
        {
          key: 'ai-governance',
          label: 'مدیریت دستیار',
          description: 'تنظیم رفتار دستیار و سند فرهنگ سازمانی',
          icon: Sparkles,
          badge: 'Gemini',
        },
      ],
    },
  ];

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      const next = !internalCollapsed;
      setInternalCollapsed(next);
      try {
        localStorage.setItem('kara_sidebar_collapsed', String(next));
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* RTL Sidebar Container pinned to RIGHT edge */}
      <aside
        id="app-sidebar"
        dir="rtl"
        className={`fixed lg:sticky top-0 right-0 z-50 h-screen lg:h-[calc(100vh-64px)] bg-surface-1 border-l border-border-default shrink-0 flex flex-col justify-between transition-all duration-200 ease-in-out shadow-xl lg:shadow-none ${
          isCollapsed ? 'w-[72px] p-2' : 'w-[264px] p-3'
        } ${isMobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
          {/* Mobile Drawer Top Bar */}
          <div className="flex items-center justify-between px-1.5 py-1.5 lg:hidden border-b border-border-default mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-brand text-white flex items-center justify-center font-black text-xs shadow-xs">
                کارا
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-text-1 block">
                  بخش‌های سامانه
                </span>
                <span className="text-[10px] text-text-3 font-medium">
                  هلدینگ سیلانه سبز
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-[10px] text-text-3 hover:text-text-1 hover:bg-surface-2 cursor-pointer transition-colors"
              aria-label="بستن منو"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop Collapse Toggle */}
          <div className="hidden lg:flex items-center justify-between px-1 mb-1">
            {!isCollapsed && (
              <span className="text-[10px] font-extrabold text-text-3 uppercase tracking-wider select-none">
                منوی اصلی
              </span>
            )}
            <button
              type="button"
              onClick={toggleCollapse}
              aria-expanded={!isCollapsed}
              className={`p-1.5 rounded-[10px] text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors cursor-pointer ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? 'باز کردن منو' : 'بستن منو'}
              aria-label={isCollapsed ? 'باز کردن نوار کناری' : 'بستن نوار کناری'}
            >
              {isCollapsed ? (
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Module Sections / Groups */}
          <div className="space-y-3.5">
            {moduleGroups.map((group) => {
              return (
                <div key={group.id} className="space-y-1">
                  {!isCollapsed ? (
                    <div className="px-2.5 py-0.5 text-[10px] font-extrabold text-text-3 tracking-wider select-none">
                      {group.title}
                    </div>
                  ) : (
                    <div className="h-px bg-border-default my-2 mx-1 opacity-70" />
                  )}

                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeModule === item.key;
                      const allowed = canAccessModule(currentRole, item.key) && !item.comingSoon;

                      return (
                        <div key={item.key} className="relative group/item">
                          <button
                            type="button"
                            disabled={!allowed}
                            aria-label={`${item.label}${!allowed ? ' (دسترسی محدود)' : ''}`}
                            onClick={() => {
                              if (!allowed) return;
                              onSelectModule(item.key);
                              if (onCloseMobile) onCloseMobile();
                            }}
                            className={`w-full flex items-center transition-all duration-150 relative rounded-[10px] select-none text-right ${
                              isCollapsed
                                ? 'justify-center h-11 w-full p-0'
                                : 'items-center gap-2.5 px-3 py-2'
                            } ${
                              !allowed
                                ? 'opacity-40 cursor-not-allowed text-text-3 hover:bg-transparent'
                                : isActive
                                ? 'bg-brand-soft text-brand font-bold border border-brand/20 cursor-pointer shadow-2xs'
                                : 'text-text-2 hover:bg-surface-2 hover:text-text-1 cursor-pointer font-medium'
                            }`}
                            aria-current={isActive ? 'page' : undefined}
                          >
                            {/* 3px Rounded Indicator Bar for Active Item */}
                            {isActive && (
                              <div
                                className={`absolute right-0 w-[3px] bg-brand rounded-full transition-all ${
                                  isCollapsed ? 'top-2.5 bottom-2.5' : 'top-2 bottom-2'
                                }`}
                              />
                            )}

                            {/* Icon Wrapper */}
                            <div
                              className={`p-1.5 rounded-[8px] shrink-0 transition-colors flex items-center justify-center ${
                                isActive
                                  ? 'bg-brand text-white shadow-2xs'
                                  : 'bg-surface-2 text-text-2 group-hover/item:bg-surface-3 group-hover/item:text-text-1'
                              }`}
                              aria-hidden="true"
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            {/* Text labels in Expanded Mode */}
                            {!isCollapsed && (
                              <div className="flex-1 min-w-0 pr-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-black truncate flex items-center gap-1.5">
                                    <span>{item.label}</span>
                                    {!allowed && (
                                      <span title="دسترسی محدود بر اساس نقش">
                                        <Lock className="w-3 h-3 shrink-0 text-text-3" />
                                      </span>
                                    )}
                                  </span>
                                  {item.badge && allowed && (
                                    <span
                                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full whitespace-nowrap ${
                                        isActive
                                          ? 'bg-brand/15 text-brand border border-brand/30'
                                          : 'bg-surface-3 text-text-2 border border-border-default'
                                      }`}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`text-[10px] mt-0.5 line-clamp-1 leading-tight ${
                                    isActive ? 'text-brand/85 font-medium' : 'text-text-3 font-normal'
                                  }`}
                                >
                                  {item.description}
                                </div>
                              </div>
                            )}
                          </button>

                          {/* Hover Tooltip in Collapsed Mode (Positioned to the left of the rail in RTL) */}
                          {isCollapsed && (
                            <div className="hidden lg:group-hover/item:flex flex-col absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 pointer-events-none min-w-44 max-w-56 p-2 rounded-[10px] bg-surface-1 border border-border-default shadow-xl text-right animate-fadeIn">
                              <div className="flex items-center justify-between gap-2 mb-0.5">
                                <span className="text-xs font-black text-text-1 truncate flex items-center gap-1">
                                  <span>{item.label}</span>
                                  {!allowed && <Lock className="w-3 h-3 text-text-3 shrink-0" />}
                                </span>
                                {item.badge && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-soft text-brand">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-text-3 leading-relaxed">
                                {!allowed ? 'دسترسی محدود به مدیر منابع انسانی' : item.description}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Holding & Factory Regulatory Status */}
        {!isCollapsed ? (
          <div className="mt-2.5 p-3 bg-surface-2 rounded-[14px] border border-border-default text-xs">
            <div className="flex items-center justify-between font-black text-text-1 mb-1">
              <span className="flex items-center gap-1.5 text-brand">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-xs font-black">سیلانه سبز</span>
              </span>
              <span className="text-[9px] bg-brand-soft text-brand border border-brand/20 px-1.5 py-0.5 rounded-[6px] font-black">
                قانون کار ۱۴۰۳
              </span>
            </div>
            <p className="text-[10px] text-text-3 leading-relaxed font-medium">
              دافی، کامان، میس‌ویک و کارخانجات اشتهارد
            </p>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t border-border-default flex justify-center">
            <div
              className="w-9 h-9 rounded-[10px] bg-surface-2 text-brand flex items-center justify-center cursor-help transition-colors hover:bg-brand-soft"
              title="هلدینگ سیلانه سبز — کارخانجات اشتهارد"
            >
              <Factory className="w-4 h-4" />
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
