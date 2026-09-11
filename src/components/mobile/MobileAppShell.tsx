import React, { useState } from 'react';
import {
  Home,
  Building2,
  Mic,
  FileText,
  Users,
  Bell,
  PhoneCall,
  Laptop,
  Sparkles,
} from 'lucide-react';
import { MobileHome } from './MobileHome';
import { MobileDepartments } from './MobileDepartments';
import { MobileVoiceCall } from './MobileVoiceCall';
import { MobileJobAdGenerator } from './MobileJobAdGenerator';
import { MobilePersonnelPortal } from './MobilePersonnelPortal';
import { MobileAutomations } from './MobileAutomations';
import { ThemeToggle } from '../common/ThemeToggle';
import {
  Employee,
  HoldingDepartment,
  HRAutomationTask,
  HRDashboardMetrics,
  LeaveRequest,
  PayrollSlip,
} from '../../types';

interface MobileAppShellProps {
  metrics: HRDashboardMetrics;
  departments: HoldingDepartment[];
  automationTasks: HRAutomationTask[];
  employees: Employee[];
  leaves: LeaveRequest[];
  payrollSlips: PayrollSlip[];
  onRunAutomation: (taskId: string) => Promise<void>;
  onJobCreated?: (newJob: any) => void;
  onExitToDesktop?: () => void;
}

export type MobileTab = 'home' | 'departments' | 'voice' | 'jobAd' | 'portal' | 'automations';

export const MobileAppShell: React.FC<MobileAppShellProps> = ({
  metrics,
  departments,
  automationTasks,
  employees,
  leaves,
  payrollSlips,
  onRunAutomation,
  onJobCreated,
  onExitToDesktop,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [notificationCount] = useState(3);
  const [jobAdDeptId, setJobAdDeptId] = useState<string | null>(null);

  return (
    <div
      dir="rtl"
      className="w-full min-h-screen bg-surface-0 text-text-1 flex flex-col justify-between font-sans antialiased selection:bg-brand/20 selection:text-brand transition-colors"
    >
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-surface-1 relative shadow-2xl border-x border-border-default overflow-x-hidden">
        {/* Mobile App Bar with Safe Area Top Padding */}
        <header
          id="mobile-header"
          className="sticky top-0 z-40 bg-surface-1/95 backdrop-blur-md border-b border-border-default pt-[max(env(safe-area-inset-top,0px),10px)] pb-3 px-3.5 flex items-center justify-between transition-colors shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[12px] bg-brand text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 select-none">
              کارا
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black tracking-tight text-text-1">
                  سیلانه سبز
                </span>
                <span className="text-[10px] bg-brand-soft text-brand border border-brand/20 px-1.5 py-0.2 rounded-full font-bold">
                  HRMS
                </span>
              </div>
              <span className="text-[10px] text-text-3 block leading-tight font-medium">
                دافی • کامان • میس‌ویک • اشتهارد
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Exit to Desktop Mode */}
            {onExitToDesktop && (
              <button
                type="button"
                id="btn-exit-to-desktop"
                onClick={onExitToDesktop}
                className="min-h-[44px] px-2.5 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 text-[11px] font-bold flex items-center gap-1 border border-border-default transition-all cursor-pointer select-none"
                title="مشاهده نسخه دسکتاپ"
              >
                <Laptop className="w-3.5 h-3.5 text-text-3" />
                <span className="hidden xs:inline">نسخه دسکتاپ</span>
              </button>
            )}

            {/* Direct Voice Call Quick Trigger */}
            <button
              type="button"
              id="btn-header-voice-call"
              onClick={() => setActiveTab('voice')}
              className="min-h-[44px] min-w-[44px] rounded-[10px] bg-brand-soft hover:bg-brand/20 text-brand flex items-center justify-center cursor-pointer transition-all relative border border-brand/25"
              title="دستیار صوتی"
            >
              <PhoneCall className="w-4 h-4 text-brand" />
              <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-brand animate-ping" />
            </button>

            {/* Automations Notification Badge */}
            <button
              type="button"
              id="btn-header-automations-bell"
              onClick={() => setActiveTab('automations')}
              className="min-h-[44px] min-w-[44px] rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-2 flex items-center justify-center cursor-pointer transition-all relative border border-border-default"
              title="وظایف خودکار و اعلان‌ها"
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 left-1.5 w-4 h-4 rounded-full bg-danger text-white font-bold text-[10px] flex items-center justify-center">
                  ۳
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Mobile Tab Body */}
        <main className="flex-1 pb-24 overflow-y-auto">
          {activeTab === 'home' && (
            <MobileHome
              metrics={metrics}
              departments={departments}
              automationTasks={automationTasks}
              tasks={automationTasks}
              onNavigateToVoice={() => setActiveTab('voice')}
              onNavigateToJobAd={() => setActiveTab('jobAd')}
              onNavigateToDepartments={() => setActiveTab('departments')}
              onNavigateToAutomations={() => setActiveTab('automations')}
              onNavigateToPortal={() => setActiveTab('portal')}
              onQuickRunAutomation={onRunAutomation}
              onNavigate={(tab) => setActiveTab(tab)}
              onRunTask={onRunAutomation}
            />
          )}

          {activeTab === 'departments' && (
            <div className="p-3.5 sm:p-4">
              <MobileDepartments
                departments={departments}
                onBack={() => setActiveTab('home')}
                onSelectDepartmentForJob={(dept) => {
                  setJobAdDeptId(dept.id);
                  setActiveTab('jobAd');
                }}
              />
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="p-2 sm:p-3 h-full">
              <MobileVoiceCall
                onBack={() => setActiveTab('home')}
                onNavigateToJobAd={() => setActiveTab('jobAd')}
                onNavigateToDepartments={() => setActiveTab('departments')}
                onRunAutomation={(cat) => onRunAutomation(cat)}
              />
            </div>
          )}

          {activeTab === 'jobAd' && (
            <div className="p-3.5 sm:p-4">
              <MobileJobAdGenerator
                departments={departments}
                initialDeptId={jobAdDeptId}
                onBack={() => setActiveTab('home')}
                onJobCreated={(job) => {
                  if (onJobCreated) onJobCreated(job);
                  setActiveTab('portal');
                }}
              />
            </div>
          )}

          {activeTab === 'portal' && (
            <div className="p-3.5 sm:p-4">
              <MobilePersonnelPortal
                employees={employees}
                leaves={leaves}
                payrollSlips={payrollSlips}
                onBack={() => setActiveTab('home')}
              />
            </div>
          )}

          {activeTab === 'automations' && (
            <div className="p-3.5 sm:p-4">
              <MobileAutomations
                tasks={automationTasks}
                onRunTask={onRunAutomation}
                onBack={() => setActiveTab('home')}
              />
            </div>
          )}
        </main>

        {/* Bottom Mobile Tab Bar with Safe-Area Padding & Brand-Tinted Active State */}
        <nav
          id="mobile-bottom-nav"
          className="fixed bottom-0 inset-x-0 max-w-md mx-auto bg-surface-1/95 backdrop-blur-md border-t border-border-default pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),10px)] px-3 flex items-center justify-around z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] transition-colors"
        >
          {/* Tab 1: Home */}
          <button
            type="button"
            id="mobile-tab-home"
            onClick={() => setActiveTab('home')}
            className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-[12px] transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'home'
                ? 'bg-brand-soft text-brand font-black'
                : 'text-text-3 hover:text-text-1 font-medium'
            }`}
          >
            <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.4]' : ''}`} />
            <span className="text-[10px] leading-none">خانه</span>
          </button>

          {/* Tab 2: Departments */}
          <button
            type="button"
            id="mobile-tab-departments"
            onClick={() => setActiveTab('departments')}
            className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-[12px] transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'departments'
                ? 'bg-brand-soft text-brand font-black'
                : 'text-text-3 hover:text-text-1 font-medium'
            }`}
          >
            <Building2 className={`w-5 h-5 ${activeTab === 'departments' ? 'stroke-[2.4]' : ''}`} />
            <span className="text-[10px] leading-none">دپارتمان‌ها</span>
          </button>

          {/* Tab 3: Raised Center Highlighted Voice Assistant Button */}
          <button
            type="button"
            id="mobile-tab-voice"
            onClick={() => setActiveTab('voice')}
            className="flex flex-col items-center gap-0.5 -mt-6 cursor-pointer group focus:outline-none select-none"
            title="دستیار صوتی هوشمند"
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform active:scale-90 border-4 border-surface-1 ${
                activeTab === 'voice'
                  ? 'bg-brand text-white shadow-brand/50 scale-105 ring-2 ring-brand/30'
                  : 'bg-brand text-white shadow-brand/30 hover:bg-brand-hover'
              }`}
            >
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <span
              className={`text-[10px] font-black ${
                activeTab === 'voice' ? 'text-brand' : 'text-text-3'
              }`}
            >
              دستیار صوتی
            </span>
          </button>

          {/* Tab 4: AI Job Ad */}
          <button
            type="button"
            id="mobile-tab-jobad"
            onClick={() => setActiveTab('jobAd')}
            className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-[12px] transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'jobAd'
                ? 'bg-brand-soft text-brand font-black'
                : 'text-text-3 hover:text-text-1 font-medium'
            }`}
          >
            <FileText className={`w-5 h-5 ${activeTab === 'jobAd' ? 'stroke-[2.4]' : ''}`} />
            <span className="text-[10px] leading-none">آگهی‌ساز</span>
          </button>

          {/* Tab 5: Administrative Portal */}
          <button
            type="button"
            id="mobile-tab-portal"
            onClick={() => setActiveTab('portal')}
            className={`min-h-[48px] min-w-[54px] flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-[12px] transition-all cursor-pointer select-none active:scale-95 ${
              activeTab === 'portal'
                ? 'bg-brand-soft text-brand font-black'
                : 'text-text-3 hover:text-text-1 font-medium'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'portal' ? 'stroke-[2.4]' : ''}`} />
            <span className="text-[10px] leading-none">کارتابل</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
