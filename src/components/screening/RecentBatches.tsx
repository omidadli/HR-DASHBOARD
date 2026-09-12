import React, { useState } from 'react';
import { History, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { ScreeningBatch } from '../../types/screening';
import { getDepartment } from '../../lib/departments';
import { Modal } from '../common/Modal';

interface RecentBatchesProps {
  batches: ScreeningBatch[];
  onOpen: (batchId: string) => void;
  onDelete?: (batchId: string) => Promise<void> | void;
}

export const RecentBatches: React.FC<RecentBatchesProps> = ({ batches, onOpen, onDelete }) => {
  const [batchToDelete, setBatchToDelete] = useState<ScreeningBatch | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Show at most the 3 latest screenings
  const displayedBatches = batches.slice(0, 3);
  if (!displayedBatches.length) return null;

  const handleConfirmDelete = async () => {
    if (!batchToDelete || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(batchToDelete.id);
      setBatchToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-bold text-text-3 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          غربالگری‌های اخیر
        </span>
        <div className="flex flex-col gap-1.5">
          {displayedBatches.map((b) => {
            const dept = getDepartment(b.departmentId);
            const Icon = dept.icon;
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(b.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(b.id);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 rounded-card bg-surface-1 border border-border-default hover:border-brand/40 active:scale-[0.99] text-right cursor-pointer transition-all group shadow-xs hover:shadow-e1"
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
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBatchToDelete(b);
                    }}
                    title="حذف سابقه غربالگری"
                    aria-label={`حذف سابقه غربالگری ${b.roleTitle || b.departmentName}`}
                    className="w-8 h-8 rounded-control flex items-center justify-center text-text-3 hover:text-danger hover:bg-danger-soft border border-transparent hover:border-[var(--danger-border)] transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {batchToDelete && (
        <Modal
          open={!!batchToDelete}
          onClose={() => !isDeleting && setBatchToDelete(null)}
          title="حذف سابقه غربالگری"
          icon={<AlertTriangle className="w-5 h-5 text-danger" />}
          footer={
            <>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setBatchToDelete(null)}
                className="px-4 py-2 rounded-control border border-border-default hover:bg-surface-2 text-xs font-bold text-text-2 cursor-pointer transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-danger hover:bg-danger/90 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>حذف سابقه</span>
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-2 text-text-2 text-xs sm:text-sm leading-relaxed">
            <p>
              آیا از حذف سابقه غربالگری مربوط به{' '}
              <strong className="text-text-1">
                «{batchToDelete.roleTitle || batchToDelete.departmentName} — {batchToDelete.departmentName}»
              </strong>{' '}
              اطمینان دارید؟
            </p>
            <p className="text-text-3 text-xs">
              با حذف این مورد، تمامی نتایج ارزیابی و اطلاعات مربوط به این جلسه غربالگری پاک خواهند شد.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
};
