import React from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Clock,
  Wallet,
  Menu,
} from 'lucide-react';
import { ModuleKey, canAccessModule } from './Sidebar';
import { UserRole } from '../../types';

interface BottomNavProps {
  activeModule: ModuleKey;
  onSelectModule: (module: ModuleKey) => void;
  onOpenMobileMenu: () => void;
  currentRole?: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeModule,
  onSelectModule,
  onOpenMobileMenu,
  currentRole = UserRole.HR_DIRECTOR,
}) => {
  // Tabs the role may actually open (audit fix SEC-02)
  const tabs = [
    { key: 'dashboard' as ModuleKey, label: 'پیشخوان', icon: LayoutDashboard },
    { key: 'recruitment' as ModuleKey, label: 'استخدام', icon: UserPlus },
    { key: 'attendance' as ModuleKey, label: 'تردد', icon: Clock },
    { key: 'payroll' as ModuleKey, label: 'حقوق', icon: Wallet },
  ].filter((t) => canAccessModule(currentRole, t.key));

  return (
    <nav
      dir="rtl"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-1/95 backdrop-blur-md border-t border-border-default px-2 py-1 shadow-lg"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeModule === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectModule(tab.key)}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center min-h-[48px] min-w-[52px] py-1 px-2 rounded-[10px] transition-all cursor-pointer select-none ${
                isActive
                  ? 'text-brand font-black'
                  : 'text-text-3 hover:text-text-1 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-[8px] transition-all ${
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'text-text-3'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 leading-tight">{tab.label}</span>
            </button>
          );
        })}

        {/* More / Mobile Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="سایر بخش‌ها"
          className="flex flex-col items-center justify-center min-h-[48px] min-w-[52px] py-1 px-2 rounded-[10px] text-text-3 hover:text-text-1 font-medium transition-all cursor-pointer select-none"
        >
          <div className="p-1.5 rounded-[8px] text-text-3">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">سایر بخش‌ها</span>
        </button>
      </div>
    </nav>
  );
};
