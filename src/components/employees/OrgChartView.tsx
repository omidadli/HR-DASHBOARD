import React, { useState, useMemo } from 'react';
import { Employee } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { EmployeeAvatar } from './EmployeeAvatar';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Users,
  Search,
  Network,
  ChevronDown,
  Building,
} from 'lucide-react';

interface OrgChartViewProps {
  employees: Employee[];
  onSelectEmployee: (emp: Employee) => void;
}

// Department color themes
const DEPT_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  'منابع انسانی': {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-800 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    bar: 'bg-emerald-600',
  },
  'فناوری اطلاعات': {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-800 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/40',
    bar: 'bg-blue-600',
  },
  'مالی و حسابداری': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/40',
    bar: 'bg-purple-600',
  },
  'مالی': {
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    text: 'text-purple-800 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/40',
    bar: 'bg-purple-600',
  },
  'بازاریابی و فروش': {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-800 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/40',
    bar: 'bg-rose-600',
  },
  'تولید و کارخانه': {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/40',
    bar: 'bg-amber-600',
  },
};

const DEFAULT_DEPT_COLOR = {
  bg: 'bg-slate-50 dark:bg-slate-900/40',
  text: 'text-slate-800 dark:text-slate-300',
  border: 'border-slate-200 dark:border-slate-800/40',
  bar: 'bg-slate-600',
};

export const OrgChartView: React.FC<OrgChartViewProps> = ({
  employees,
  onSelectEmployee,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [filterQuery, setFilterQuery] = useState<string>('');

  // Map employees by ID for quick subordinate resolution
  const { topLeaders, managers, subordinatesByManager } = useMemo(() => {
    const subMap: Record<string, Employee[]> = {};
    employees.forEach((emp) => {
      const mgrId = emp.directManagerId || 'root';
      if (!subMap[mgrId]) subMap[mgrId] = [];
      subMap[mgrId].push(emp);
    });

    // Top leaders: no directManagerId, or directManagerId not found in employees
    const leaders = employees.filter(
      (e) => !e.directManagerId || !employees.some((m) => m.id === e.directManagerId)
    );

    // If no explicit top leader, pick the one with the highest hierarchy or first
    const primaryLeaders = leaders.length > 0 ? leaders : [employees[0]];

    // Secondary layer: direct reports of leaders
    const mgrs: Employee[] = [];
    primaryLeaders.forEach((l) => {
      const reports = subMap[l.id] || [];
      mgrs.push(...reports);
    });

    return {
      topLeaders: primaryLeaders,
      managers: mgrs,
      subordinatesByManager: subMap,
    };
  }, [employees]);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.15, 1.6));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => setZoomLevel(1);
  const handleZoomFit = () => setZoomLevel(0.85);

  const getDeptColor = (dept: string) => DEPT_COLORS[dept] || DEFAULT_DEPT_COLOR;

  // Single card component
  const EmployeeCard = ({
    emp,
    isLeader = false,
  }: {
    emp: Employee;
    isLeader?: boolean;
  }) => {
    const color = getDeptColor(emp.department);
    const subs = subordinatesByManager[emp.id] || [];
    const isMatched =
      filterQuery.trim() !== '' &&
      (emp.fullName.toLowerCase().includes(filterQuery.toLowerCase()) ||
        emp.jobTitle.toLowerCase().includes(filterQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(filterQuery.toLowerCase()));

    return (
      <div
        onClick={() => onSelectEmployee(emp)}
        className={`relative bg-surface-1 rounded-[14px] p-3.5 border transition-all cursor-pointer select-none text-right shadow-2xs hover:shadow-md hover:-translate-y-0.5 group ${
          isMatched
            ? 'ring-2 ring-brand border-brand scale-105'
            : isLeader
            ? 'border-brand/40 ring-1 ring-brand/10'
            : 'border-border-default hover:border-border-strong'
        } ${isLeader ? 'w-64 sm:w-72' : 'w-56 sm:w-60'}`}
      >
        {/* Top department indicator bar */}
        <div
          className={`absolute top-0 right-0 left-0 h-1.5 rounded-t-[14px] ${color.bar}`}
        />

        <div className="flex items-start gap-2.5 pt-1">
          <EmployeeAvatar
            name={emp.fullName}
            id={emp.id}
            size={isLeader ? 'lg' : 'md'}
            status={emp.status}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h4 className="font-black text-xs sm:text-sm text-text-1 truncate group-hover:text-brand transition-colors">
                {emp.fullName}
              </h4>
            </div>

            <p className="text-[11px] font-semibold text-text-2 truncate mt-0.5">
              {emp.jobTitle}
            </p>

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] border ${color.bg} ${color.text} ${color.border} truncate max-w-[130px]`}
              >
                {emp.department}
              </span>

              {emp.personnelCode && (
                <span className="text-[10px] font-mono text-text-3 font-semibold">
                  {toPersianDigits(emp.personnelCode)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subordinates count badge if any */}
        {subs.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border-default flex items-center justify-between text-[10px] text-text-3 font-semibold">
            <span className="flex items-center gap-1 text-brand">
              <Users className="w-3 h-3" />
              <span>{toPersianDigits(subs.length)} زیرمجموعه</span>
            </span>
            <span className="text-text-3 group-hover:translate-x-0.5 transition-transform">
              مشاهده ←
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Chart Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-1 p-3 rounded-[14px] border border-border-default shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-[10px] bg-brand-soft text-brand">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-1">چارت سازمانی</h3>
            <p className="text-[11px] text-text-3">
              ساختار تیم‌ها و سطوح گزارش‌دهی سازمانی
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Search within Org */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-3 absolute right-2.5 top-2.5" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="جستجوی همکار..."
              className="pr-8 pl-3 py-1.5 text-xs bg-surface-2 border border-border-default rounded-[8px] text-text-1 focus:outline-none focus:ring-1 focus:ring-brand w-44"
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-[10px] border border-border-default">
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1.5 rounded-[6px] text-text-2 hover:text-text-1 hover:bg-surface-1 transition-colors cursor-pointer"
              title="بزرگ‌نمایی"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1.5 rounded-[6px] text-text-2 hover:text-text-1 hover:bg-surface-1 transition-colors cursor-pointer"
              title="کوچک‌نمایی"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-[6px] text-[10px] font-bold text-text-2 hover:text-text-1 hover:bg-surface-1 transition-colors cursor-pointer font-mono"
              title="اندازه پیش‌فرض"
            >
              {toPersianDigits(Math.round(zoomLevel * 100))}٪
            </button>
            <button
              type="button"
              onClick={handleZoomFit}
              className="p-1.5 rounded-[6px] text-text-2 hover:text-text-1 hover:bg-surface-1 transition-colors cursor-pointer"
              title="تطبیق با صفحه"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="bg-surface-1 rounded-[16px] border border-border-default p-6 sm:p-10 shadow-2xs overflow-x-auto min-h-[460px] flex items-center justify-center">
        <div
          className="transition-transform duration-200 origin-top flex flex-col items-center gap-8"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Level 1: Top Leaders */}
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center gap-6">
              {topLeaders.map((leader) => (
                <EmployeeCard key={leader.id} emp={leader} isLeader={true} />
              ))}
            </div>

            {/* Vertical Connector Line from Leader */}
            {(managers.length > 0 || employees.length > topLeaders.length) && (
              <div className="w-0.5 h-8 bg-border-strong my-1" />
            )}
          </div>

          {/* Level 2: Managers / Direct Reports of Leaders */}
          {managers.length > 0 ? (
            <div className="flex flex-col items-center w-full">
              {/* Horizontal line over managers */}
              {managers.length > 1 && (
                <div className="h-0.5 bg-border-strong w-4/5 max-w-2xl mb-4" />
              )}

              <div className="flex items-start justify-center gap-6 sm:gap-8 flex-wrap">
                {managers.map((mgr) => {
                  const leafReports = subordinatesByManager[mgr.id] || [];

                  return (
                    <div key={mgr.id} className="flex flex-col items-center">
                      <EmployeeCard emp={mgr} />

                      {/* Line to subordinates */}
                      {leafReports.length > 0 && (
                        <>
                          <div className="w-0.5 h-6 bg-border-strong" />

                          {leafReports.length > 1 && (
                            <div className="h-0.5 bg-border-strong w-3/4 mb-3" />
                          )}

                          <div className="flex items-start justify-center gap-3 sm:gap-4 flex-wrap">
                            {leafReports.map((leaf) => (
                              <EmployeeCard key={leaf.id} emp={leaf} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Fallback flat grid if no hierarchical directManagerId is set */
            <div className="flex flex-wrap items-center justify-center gap-4 max-w-4xl">
              {employees
                .filter((e) => !topLeaders.some((l) => l.id === e.id))
                .map((emp) => (
                  <EmployeeCard key={emp.id} emp={emp} />
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
