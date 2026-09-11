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
              className="w-full flex items-center gap-3 p-3 rounded-card bg-surface-1 border border-border-default hover:border-brand/40 text-right cursor-pointer transition-all group shadow-xs hover:shadow-e1"
            >
              <span className={`w-9 h-9 rounded-control border flex items-center justify-center shrink-0 ${dept.accent}`}>
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-text-1 truncate">
                  {b.roleTitle || b.departmentName}
                  <span className="text-text-3 font-normal"> — {b.departmentName}</span>
                </div>
                <div className="text-xs text-text-3 mt-0.5">{b.createdAtJalali}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-soft border border-brand-200 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {toPersianDigits(b.stats.interview)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning-soft border border-[var(--warning-border)] px-2 py-0.5 rounded-full">
                  <Search className="w-3.5 h-3.5" />
                  {toPersianDigits(b.stats.review)}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-danger bg-danger-soft border border-[var(--danger-border)] px-2 py-0.5 rounded-full">
                  <XCircle className="w-3.5 h-3.5" />
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
