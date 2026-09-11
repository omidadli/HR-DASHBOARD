import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'pill' | 'underline';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pill',
  className = '',
}) => {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${
        variant === 'underline'
          ? 'border-b border-border-default'
          : 'bg-surface-2/70 p-1 rounded-[12px] border border-border-default/60 inline-flex'
      } ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        if (variant === 'underline') {
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              disabled={tab.disabled}
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={`relative px-4 py-2.5 text-xs sm:text-sm font-bold transition-all duration-150 flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isActive
                  ? 'text-brand'
                  : 'text-text-2 hover:text-text-1'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                    isActive
                      ? 'bg-brand-soft text-brand'
                      : 'bg-surface-2 text-text-3'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {isActive && (
                <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-brand rounded-t-full" />
              )}
            </button>
          );
        }

        // Pill variant
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            disabled={tab.disabled}
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`px-3.5 py-1.5 rounded-[10px] text-xs font-bold transition-all duration-150 flex items-center gap-2 whitespace-nowrap select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isActive
                ? 'bg-surface-1 text-text-1 shadow-xs font-extrabold border border-border-default/80'
                : 'text-text-2 hover:text-text-1 hover:bg-surface-1/50'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'bg-surface-0 text-text-3'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
