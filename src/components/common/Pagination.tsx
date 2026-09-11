import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toPersianDigits } from '../../lib/normalizeFa';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;

  // Build a compact window: first, last, current ±1
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: (number | 'gap')[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push('gap');
    items.push(p);
    prev = p;
  }

  const btnBase =
    'min-w-10 h-10 rounded-control flex items-center justify-center text-sm font-bold tabular-nums transition-all cursor-pointer select-none';

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2" dir="rtl">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className={`${btnBase} px-2.5 bg-surface-1 border border-border-default text-text-2 hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label="صفحه قبل"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {items.map((it, i) =>
        it === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-text-3">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onChange(it)}
            className={`${btnBase} ${
              it === page
                ? 'bg-brand text-white shadow-sm'
                : 'bg-surface-1 border border-border-default text-text-2 hover:border-brand hover:text-brand'
            }`}
          >
            {toPersianDigits(it)}
          </button>
        )
      )}

      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onChange(page + 1)}
        className={`${btnBase} px-2.5 bg-surface-1 border border-border-default text-text-2 hover:border-brand hover:text-brand disabled:opacity-40 disabled:cursor-not-allowed`}
        aria-label="صفحه بعد"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
};
