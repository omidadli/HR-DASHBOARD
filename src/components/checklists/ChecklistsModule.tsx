import React, { useState } from 'react';
import { ChecklistItem } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { CheckSquare, UserPlus, UserMinus, CheckCircle2, Clock } from 'lucide-react';

interface ChecklistsModuleProps {
  checklists: ChecklistItem[];
  onToggleChecklist: (id: string) => void;
}

export const ChecklistsModule: React.FC<ChecklistsModuleProps> = ({
  checklists,
  onToggleChecklist,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'ONBOARDING' | 'OFFBOARDING'>('ALL');

  const filtered = checklists.filter(
    (c) => filterType === 'ALL' || c.type === filterType
  );

  const completedCount = checklists.filter((c) => c.isCompleted).length;
  const progressPct = Math.round((completedCount / checklists.length) * 100);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">چک‌لیست‌های ورود و خروج کارکنان</h2>
          <p className="text-xs text-slate-500">
            مدیریت مراحل پذیرش، تحویل تجهیزات و فرایند تسویه‌حساب
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            تکمیل: {toPersianDigits(completedCount)} از {toPersianDigits(checklists.length)} ({toPersianDigits(progressPct)}٪)
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              همه
            </button>
            <button
              type="button"
              onClick={() => setFilterType('ONBOARDING')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'ONBOARDING' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              ورود و پذیرش
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OFFBOARDING')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'OFFBOARDING' ? 'bg-white text-rose-800 shadow-2xs' : 'text-slate-600'
              }`}
            >
              خروج و تسویه
            </button>
          </div>
        </div>
      </div>

      {/* Checklists List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            موردی یافت نشد.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggleChecklist(item.id)}
              className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={item.isCompleted}
                  onChange={() => {}} // Handled by parent div click
                  className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />

                <div>
                  <div
                    className={`text-xs font-bold ${
                      item.isCompleted ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {item.employeeName} • دپارتمان: {item.department}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.type === 'ONBOARDING'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {item.type === 'ONBOARDING' ? 'ورود' : 'خروج'}
                </span>

                {item.isCompleted ? (
                  <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>تکمیل: {toPersianDigits(item.completedAtJalali || '۱۴۰۳/۰۶/۱۵')}</span>
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>در انتظار اقدام</span>
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
