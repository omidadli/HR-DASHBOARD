import React, { useCallback, useEffect, useState } from 'react';
import {
  ChevronRight,
  RotateCcw,
  Search,
  X,
  Inbox,
} from 'lucide-react';
import { getDepartment } from '../../lib/departments';
import {
  deleteResume,
  fetchBankDepartments,
  fetchBankResumes,
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
  { v: '', label: 'هر امتیازی' },
  { v: '70', label: '۷۰+' },
  { v: '80', label: '۸۰+' },
  { v: '90', label: '۹۰+' },
];
const YEAR_CHIPS = [
  { v: '', label: 'هر سابقه‌ای' },
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
  { v: 'newest', label: 'جدیدترین' },
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
  const [tag, setTag] = useState('');
  const [since, setSince] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery || '');

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
  }, []);

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
        tag: tag || undefined,
        since,
        sort,
        page,
      });
      setData(res);
    } catch (e) {
      toast('بارگذاری رزومه‌ها ممکن نشد', 'error');
    } finally {
      setLoading(false);
    }
  }, [departmentId, debouncedQuery, minScore, minYears, tag, since, sort, page]);

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
      toast('بررسی مجدد انجام شد ✓');
    } catch (e: any) {
      toast(e?.message || 'بررسی مجدد ممکن نشد', 'error');
    } finally {
      setRerunningId(null);
    }
  };

  const handleRemoveBank = async (r: ResumeRecord) => {
    try {
      await removeFromBank(r.id);
      toast('از بانک خارج شد');
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

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[11px] font-bold border cursor-pointer transition-all min-h-[34px] ${
      active ? 'bg-brand text-white border-brand' : 'bg-surface-1 text-text-2 border-border-default hover:border-brand/40'
    }`;

  const hasFilter = minScore || minYears || tag || since !== 'all' || debouncedQuery;
  const clearFilters = () => {
    setMinScore('');
    setMinYears('');
    setTag('');
    setSince('all');
    setQuery('');
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
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-surface-1 border border-border-default flex items-center justify-center text-text-2 hover:text-brand cursor-pointer shrink-0"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <span className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${dept.accent}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-black text-text-1 truncate">{dept.name}</h1>
          <p className="text-[11px] text-text-3">
            {data ? `${toPersianDigits(data.total)} رزومه در بانک` : 'در حال بارگذاری…'}
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2.5 bg-surface-1 border border-border-default rounded-2xl p-3">
        <div className="relative">
          <Search className="w-4 h-4 text-text-3 absolute right-3 top-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی نام، سمت، مهارت یا یادداشت…"
            className="w-full pr-9 pl-9 py-2.5 rounded-xl bg-surface-2 border border-border-default focus:border-brand outline-none text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-2.5 top-2.5 text-text-3 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SCORE_CHIPS.map((c) => (
            <button key={c.v} type="button" className={chip(minScore === c.v)} onClick={() => { setMinScore(c.v); setPage(1); }}>
              {c.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border-default mx-1" />
          {YEAR_CHIPS.map((c) => (
            <button key={c.v} type="button" className={chip(minYears === c.v)} onClick={() => { setMinYears(c.v); setPage(1); }}>
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {SINCE_CHIPS.map((c) => (
            <button key={c.v} type="button" className={chip(since === c.v)} onClick={() => { setSince(c.v); setPage(1); }}>
              {c.label}
            </button>
          ))}
          <span className="w-px h-5 bg-border-default mx-1" />
          {SORT_CHIPS.map((c) => (
            <button key={c.v} type="button" className={chip(sort === c.v)} onClick={() => { setSort(c.v); setPage(1); }}>
              {c.label}
            </button>
          ))}
          {hasFilter ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mr-auto inline-flex items-center gap-1 text-[11px] font-black text-danger cursor-pointer px-2"
            >
              <X className="w-3.5 h-3.5" /> حذف فیلترها
            </button>
          ) : null}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border-default/70 pt-2.5">
            <span className="text-[10px] font-black text-text-3 ml-1">برچسب:</span>
            {allTags.slice(0, 12).map((t) => (
              <button
                key={t}
                type="button"
                className={chip(tag === t)}
                onClick={() => { setTag(tag === t ? '' : t); setPage(1); }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-1 border border-border-default animate-pulse" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-10 text-center bg-surface-1 rounded-2xl border border-dashed border-border-default flex flex-col items-center gap-3">
          <Inbox className="w-10 h-10 text-text-3 opacity-60" />
          <p className="text-xs font-bold text-text-3">
            {hasFilter ? 'با این فیلترها رزومه‌ای پیدا نشد.' : 'این دپارتمان هنوز رزومه‌ای در بانک ندارد.'}
          </p>
          {hasFilter ? (
            <button type="button" onClick={clearFilters} className="text-xs font-black text-brand cursor-pointer">
              حذف فیلترها
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoScreening}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand text-white text-xs font-black cursor-pointer"
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

      <Pagination page={data?.page || 1} totalPages={data?.totalPages || 1} onChange={setPage} />

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
        confirmLabel="حذف کن"
        message={
          <>
            رزومه
            <span className="font-black text-text-1"> «{deleteTarget?.candidateName || deleteTarget?.fileName}» </span>
            برای همیشه از بانک و نتایج حذف می‌شود. مطمئنی؟
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
