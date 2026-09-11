import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  RotateCcw,
  Search,
  X,
  Inbox,
  Filter,
  Layers,
} from 'lucide-react';
import { getDepartment } from '../../lib/departments';
import {
  deleteResume,
  fetchBankDepartments,
  fetchBankResumes,
  fetchDepartmentBankBatches,
  removeFromBank,
  rerunResume,
} from '../../lib/api';
import {
  PagedResult,
  ResumeRecord,
} from '../../types/screening';
import { toPersianDigits } from '../../lib/normalizeFa';
import { CandidateCard } from '../screening/CandidateCard';
import { CandidateDrawer } from '../screening/CandidateDrawer';
import { MessageModal } from '../screening/MessageModal';
import { ConfirmDialog } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { toast } from '../common/Toast';

const SCORE_CHIPS = [
  { v: '', label: 'فرقی نمی‌کند' },
  { v: '70', label: '۷۰+' },
  { v: '80', label: '۸۰+' },
  { v: '90', label: '۹۰+' },
];
const YEAR_CHIPS = [
  { v: '', label: 'فرقی نمی‌کند' },
  { v: '1', label: '۱+ سال' },
  { v: '3', label: '۳+ سال' },
  { v: '5', label: '۵+ سال' },
];
const SINCE_CHIPS = [
  { v: 'all', label: 'همه زمان‌ها' },
  { v: 'week', label: 'این هفته' },
  { v: 'month', label: 'این ماه' },
];
const SORT_CHIPS = [
  { v: 'newest', label: 'جدیدترین افزوده' },
  { v: 'score', label: 'بالاترین امتیاز' },
  { v: 'experience', label: 'بیشترین سابقه' },
];

interface Props {
  departmentId: string;
  initialQuery?: string;
  onBack: () => void;
  onGoScreening: () => void;
}

export const DepartmentBankView: React.FC<Props> = ({ departmentId, initialQuery, onBack, onGoScreening }) => {
  const dept = getDepartment(departmentId);
  const Icon = dept.icon;

  const [query, setQuery] = useState(initialQuery || '');
  const [minScore, setMinScore] = useState('');
  const [minYears, setMinYears] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [batches, setBatches] = useState<{ id: string; roleTitle: string; createdAtJalali: string }[]>([]);
  const [since, setSince] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [data, setData] = useState<PagedResult<ResumeRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [allTags, setAllTags] = useState<string[]>([]);

  const [drawerRecord, setDrawerRecord] = useState<ResumeRecord | null>(null);
  const [messageRecord, setMessageRecord] = useState<ResumeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeRecord | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  useEffect(() => {
    fetchBankDepartments()
      .then((d) => setAllTags(d.tags))
      .catch(() => {});
    fetchDepartmentBankBatches(departmentId)
      .then((d) => setBatches(d.batches || []))
      .catch(() => {});
  }, [departmentId]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchBankResumes(departmentId, {
        query: debouncedQuery || undefined,
        minScore: minScore ? Number(minScore) : undefined,
        minYears: minYears ? Number(minYears) : undefined,
        batchId: selectedBatchId || undefined,
        tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        since,
        sort,
        page,
      });
      setData(res);
    } catch {
      toast('بارگذاری رزومه‌ها ممکن نشد', 'error');
    } finally {
      setLoading(false);
    }
  }, [departmentId, debouncedQuery, minScore, minYears, selectedBatchId, selectedTags, since, sort, page]);

  useEffect(() => {
    load();
  }, [load]);

  const patchInList = (updated: ResumeRecord) => {
    setData((prev) =>
      prev ? { ...prev, items: prev.items.map((r) => (r.id === updated.id ? updated : r)) } : prev
    );
    setDrawerRecord((d) => (d?.id === updated.id ? updated : d));
  };

  const handleRerun = async (r: ResumeRecord) => {
    setRerunningId(r.id);
    try {
      const { record } = await rerunResume(r.id);
      patchInList(record);
      toast('بررسی مجدد با موفقیت انجام شد');
    } catch (e: any) {
      toast(e?.message || 'بررسی مجدد ممکن نشد', 'error');
    } finally {
      setRerunningId(null);
    }
  };

  const handleRemoveBank = async (r: ResumeRecord) => {
    try {
      await removeFromBank(r.id);
      toast('رزومه از بانک خارج شد');
      setData((prev) =>
        prev ? { ...prev, total: prev.total - 1, items: prev.items.filter((x) => x.id !== r.id) } : prev
      );
      setDrawerRecord(null);
    } catch (e: any) {
      toast(e?.message || 'عملیات ممکن نشد', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteResume(deleteTarget.id);
      toast('رزومه حذف شد');
      setDeleteTarget(null);
      setDrawerRecord(null);
      load();
    } catch (e: any) {
      toast(e?.message || 'حذف ممکن نشد', 'error');
    }
  };

  const toggleTag = (t: string) => {
    setSelectedTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
    setPage(1);
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-control text-xs font-bold border cursor-pointer transition-all min-h-[38px] sm:min-h-[34px] ${
      active ? 'bg-brand text-white border-brand shadow-xs' : 'bg-surface-1 text-text-2 border-border-default hover:border-brand/40'
    }`;

  const hasFilter = Boolean(
    minScore ||
    minYears ||
    selectedTags.length > 0 ||
    selectedBatchId ||
    since !== 'all' ||
    sort !== 'newest' ||
    debouncedQuery
  );

  const clearFilters = () => {
    setMinScore('');
    setMinYears('');
    setSelectedTags([]);
    setSelectedBatchId('');
    setSince('all');
    setSort('newest');
    setQuery('');
    setPage(1);
  };

  const cardProps = {
    context: 'bank' as const,
    onOpen: (r: ResumeRecord) => setDrawerRecord(r),
    onMessage: (r: ResumeRecord) => setMessageRecord(r),
    onRerun: handleRerun,
    onBank: (_r: ResumeRecord) => {},
    onRemoveBank: handleRemoveBank,
    onDelete: (r: ResumeRecord) => setDeleteTarget(r),
  };

  return (
    <div className="w-full max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          title="بازگشت به دپارتمان‌ها"
          className="w-10 h-10 rounded-control bg-surface-1 border border-border-default flex items-center justify-center text-text-2 hover:text-brand cursor-pointer shrink-0 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className="w-11 h-11 rounded-control border border-border-default bg-surface-2 text-text-2 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-text-1 truncate">{dept.name}</h1>
          <p className="text-xs text-text-3">
            {data ? `${toPersianDigits(data.total)} رزومه در این دپارتمان` : 'در حال بارگذاری…'}
          </p>
        </div>

        {/* Mobile filter toggle */}
        <button
          type="button"
          onClick={() => setMobileFilterOpen((o) => !o)}
          className={`sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-control border text-xs font-bold transition-all cursor-pointer ${
            hasFilter
              ? 'bg-brand-soft text-brand border-brand/30'
              : 'bg-surface-1 text-text-2 border-border-default'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          فیلترها
          {hasFilter && <span className="w-2 h-2 rounded-full bg-brand" />}
        </button>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-3 bg-surface-1 border border-border-default rounded-card p-3 sm:p-4 shadow-xs">
        {/* Text search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-3 absolute right-3 top-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در نام، سمت، مهارت، یادداشت یا برچسب…"
            className="w-full pr-9 pl-9 py-2 rounded-control bg-surface-2 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-2.5 top-2.5 text-text-3 hover:text-text-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filters section - always on desktop, collapsible on mobile */}
        <div className={`flex flex-col gap-3 ${mobileFilterOpen ? 'block' : 'hidden sm:flex'}`}>
          {/* Row 1: Score, Experience, Timeframe */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-3 min-w-[56px]">امتیاز:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SCORE_CHIPS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={chip(minScore === c.v)}
                  onClick={() => {
                    setMinScore(c.v);
                    setPage(1);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <span className="w-px h-5 bg-border-default mx-1 hidden lg:inline-block" />

            <span className="text-xs font-bold text-text-3 min-w-[56px] lg:min-w-0">سابقه:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {YEAR_CHIPS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={chip(minYears === c.v)}
                  onClick={() => {
                    setMinYears(c.v);
                    setPage(1);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Sort, Timeframe, Batch source */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-3 min-w-[56px]">مرتب‌سازی:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SORT_CHIPS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={chip(sort === c.v)}
                  onClick={() => {
                    setSort(c.v);
                    setPage(1);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <span className="w-px h-5 bg-border-default mx-1 hidden lg:inline-block" />

            <span className="text-xs font-bold text-text-3 min-w-[56px] lg:min-w-0">افزوده:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SINCE_CHIPS.map((c) => (
                <button
                  key={c.v}
                  type="button"
                  className={chip(since === c.v)}
                  onClick={() => {
                    setSince(c.v);
                    setPage(1);
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Batch source (if batches available) */}
          {batches.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-default/60">
              <span className="text-xs font-bold text-text-3 min-w-[56px] flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-text-3" />
                منبع:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  className={chip(selectedBatchId === '')}
                  onClick={() => {
                    setSelectedBatchId('');
                    setPage(1);
                  }}
                >
                  همه غربالگری‌ها
                </button>
                {batches.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className={chip(selectedBatchId === b.id)}
                    onClick={() => {
                      setSelectedBatchId(selectedBatchId === b.id ? '' : b.id);
                      setPage(1);
                    }}
                  >
                    {b.roleTitle} ({toPersianDigits(b.createdAtJalali)})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Multi-select Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border-default/60 pt-2">
              <span className="text-xs font-bold text-text-3 ml-1">برچسب‌ها:</span>
              {allTags.slice(0, 16).map((t) => {
                const active = selectedTags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    className={chip(active)}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          {/* Clear filters action */}
          {hasFilter && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-bold text-danger cursor-pointer px-2 py-1 rounded-control hover:bg-danger-soft transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                حذف همه فیلترها
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-card bg-surface-1 border border-border-default animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-10 text-center bg-surface-1 rounded-card border border-dashed border-border-default flex flex-col items-center gap-3">
          <Inbox className="w-10 h-10 text-text-3 opacity-60" />
          <p className="text-xs font-medium text-text-3">
            {hasFilter ? 'با فیلترهای انتخابی رزومه‌ای یافت نشد.' : 'این دپارتمان هنوز رزومه‌ای در بانک ندارد.'}
          </p>
          {hasFilter ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-brand cursor-pointer hover:underline"
            >
              حذف فیلترها و مشاهده همه
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoScreening}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              رفتن به غربالگری جدید
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.items.map((r) => (
            <CandidateCard key={r.id} record={r} rerunning={rerunningId === r.id} {...cardProps} />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
      )}

      {/* Overlays */}
      <CandidateDrawer
        record={drawerRecord}
        context="bank"
        onClose={() => setDrawerRecord(null)}
        onMessage={(r) => {
          setDrawerRecord(null);
          setMessageRecord(r);
        }}
        onRerun={handleRerun}
        onBank={() => {}}
        onRemoveBank={handleRemoveBank}
        onDelete={(r) => {
          setDrawerRecord(null);
          setDeleteTarget(r);
        }}
      />
      <MessageModal
        record={messageRecord}
        onClose={() => setMessageRecord(null)}
        onMarkedSent={(updated) => {
          patchInList(updated);
          load();
        }}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف رزومه"
        danger
        confirmLabel="حذف رزومه"
        message={
          <>
            این رزومه برای همیشه از بانک رزومه و نتایج غربالگری حذف شود؟
            {deleteTarget?.candidateName ? (
              <span className="font-bold text-text-1"> ({deleteTarget.candidateName})</span>
            ) : ''}
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
