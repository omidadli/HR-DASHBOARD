import React from 'react';
import { History, CheckCircle2, Search, XCircle } from 'lucide-react';
import { ScreeningBatch } from '../../types/screening';
import { getDepartment } from '../../lib/departments';
import { toPersianDigits } from '../../lib/normalizeFa';

interface RecentBatchesProps {
  batches: ScreeningBatch[];
  onOpen: (batchId: string) => void;
}

export const RecentBatches: React.FC<RecentBatchesProps> = ({ batches, onOpen }) => {
  if (!batches.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-black text-text-3 flex items-center gap-1.5">
        <History className="w-3.5 h-3.5" />
        غربالگری‌های اخیر
      </span>
      <div className="flex flex-col gap-1.5">
        {batches.map((b) => {
          const dept = getDepartment(b.departmentId);
          const Icon = dept.icon;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => onOpen(b.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border-default hover:border-brand/50 text-right cursor-pointer transition-all group"
            >
              <span className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${dept.accent}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-text-1 truncate">
                  {b.roleTitle || b.departmentName}
                  <span className="text-text-3 font-bold"> — {b.departmentName}</span>
                </div>
                <div className="text-[10px] text-text-3 mt-0.5">{b.createdAtJalali}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  {toPersianDigits(b.stats.interview)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  <Search className="w-3 h-3" />
                  {toPersianDigits(b.stats.review)}
                </span>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />
                  {toPersianDigits(b.stats.reject)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
