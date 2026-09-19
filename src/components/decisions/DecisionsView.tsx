import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Filter,
  Inbox,
  RotateCcw,
  Search,
  X,
  XCircle,
} from 'lucide-react';
import {
  DecidedStatus,
  DecisionsMeta,
  DecisionsPage,
  ResumeRecord,
} from '../../types/screening';
import { fetchDecisionResumes, fetchDecisionsMeta } from '../../lib/api';
import { DEPARTMENTS } from '../../lib/departments';
import { toPersianDigits } from '../../lib/normalizeFa';
import { DECISION_META, DECISION_ORDER, emitDecisionsChanged, onDecisionsChanged } from '../../lib/decisions';
import {
  JalaliDate,
  addJalaliDays,
  formatJalaliDate,
  getTodayJalali,
} from '../../utils/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { Pagination } from '../common/Pagination';
import { CandidateCard } from '../screening/CandidateCard';
import { useResumeWorkspace } from '../screening/useResumeWorkspace';
import { toast } from '../common/Toast';

const SCORE_CHIPS = [
  { v: '', label: 'فرقی نمی‌کند' },
  { v: '60', label: '۶۰+' },
  { v: '70', label: '۷۰+' },
  { v: '80', label: '۸۰+' },
];

const SORT_CHIPS: { v: 'newest' | 'oldest' | 'score' | 'experience'; label: string }[] = [
  { v: 'newest', label: 'جدیدترین تصمیم' },
  { v: 'oldest', label: 'قدیمی‌ترین تصمیم' },
  { v: 'score', label: 'بالاترین امتیاز' },
  { v: 'experience', label: 'بیشترین سابقه' },
];

type RangePreset = 'all' | 'today' | '3d' | '7d' | '30d' | 'month';

const RANGE_CHIPS: { v: RangePreset; label: string }[] = [
  { v: 'all', label: 'همه زمان‌ها' },
  { v: 'today', label: 'امروز' },
  { v: '3d', label: '۳ روز اخیر' },
  { v: '7d', label: 'هفته اخیر' },
  { v: '30d', label: '۳۰ روز اخیر' },
  { v: 'month', label: 'این ماه شمسی' },
];

const STATUS_ICON: Record<DecidedStatus, React.ReactNode> = {
  approved: <CheckCircle2 className="w-4 h-4" />,
  rejected: <XCircle className="w-4 h-4" />,
  review: <ClipboardCheck className="w-4 h-4" />,
};

function presetRange(preset: RangePreset): { from: JalaliDate | null; to: JalaliDate | null } {
  const today = getTodayJalali();
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case '3d':
      return { from: addJalaliDays(today, -2), to: today };
    case '7d':
      return { from: addJalaliDays(today, -6), to: today };
    case '30d':
      return { from: addJalaliDays(today, -29), to: today };
    case 'month':
      return { from: { year: today.year, month: today.month, day: 1 }, to: today };
    default:
      return { from: null, to: null };
  }
}

interface DecisionsViewProps {
  initialStatus?: DecidedStatus;
  /** Opened from a screening session: pre-filter to that position. */
  initialDepartmentId?: string;
  initialRoleTitle?: string;
  onGoScreening: () => void;
}

/**
 * «رزومه‌های تایید/رد شده» — the human decision workspace.
 *
 * Three lists (تایید شده / رد شده / نیاز به بررسی) over every screening session,
 * with fast position picking and a Jalali date range, because HR reviews these
 * lists per vacancy and per period, not per batch.
 */
export const DecisionsView: React.FC<DecisionsViewProps> = ({
  initialStatus = 'approved',
  initialDepartmentId = '',
  initialRoleTitle = '',
  onGoScreening,
}) => {
  const [status, setStatus] = useState<DecidedStatus>(initialStatus);
  const [meta, setMeta] = useState<DecisionsMeta | null>(null);
  const [data, setData] = useState<DecisionsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [departmentId, setDepartmentId] = useState(initialDepartmentId);
  const [roleTitle, setRoleTitle] = useState(initialRoleTitle);
  const [from, setFrom] = useState<JalaliDate | null>(null);
  const [to, setTo] = useState<JalaliDate | null>(null);
  const [preset, setPreset] = useState<RangePreset>('all');
  const [minScore, setMinScore] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'score' | 'experience'>('newest');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const loadMeta = useCallback(() => {
    fetchDecisionsMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  useEffect(loadMeta, [loadMeta]);
  // Any decision taken anywhere in the app refreshes these counters.
  useEffect(() => onDecisionsChanged(loadMeta), [loadMeta]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetchDecisionResumes({
        status,
        departmentId: departmentId || undefined,
        roleTitle: roleTitle || undefined,
        query: debouncedQuery || undefined,
        fromJalali: from ? formatJalaliDate(from) : undefined,
        toJalali: to ? formatJalaliDate(to) : undefined,
        minScore: minScore ? Number(minScore) : undefined,
        sort,
        page,
      });
      setData(res);
    } catch (e: any) {
      setLoadError(e?.message || 'بارگذاری رزومه‌ها ممکن نشد');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [status, departmentId, roleTitle, debouncedQuery, from, to, minScore, sort, page]);

  useEffect(() => {
    void load();
  }, [load]);

  /** A decision can move the card out of the list we are currently showing. */
  const workspace = useResumeWorkspace({
    context: 'decisions',
    onUpdate: (updated) => {
      setData((prev) =>
        prev ? { ...prev, items: prev.items.map((r) => (r.id === updated.id ? updated : r)) } : prev
      );
      // The record may no longer belong to this tab (or to the current filters).
      void load();
      loadMeta();
    },
    onRemove: (id) => {
      setData((prev) => (prev ? { ...prev, items: prev.items.filter((r) => r.id !== id) } : prev));
      void load();
      loadMeta();
    },
    shouldRemoveAfterUpdate: (r) => {
      if (status === 'review') return false; // pending AI-review items stay until decided
      return (r.decisionStatus || 'none') !== status;
    },
  });

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  const counts = data?.counts || meta?.counts || { approved: 0, rejected: 0, review: 0 };
  const totalAll = counts.approved + counts.rejected + counts.review;

  const positions = useMemo(() => {
    const list = meta?.positions || [];
    return departmentId ? list.filter((p) => p.departmentId === departmentId) : list;
  }, [meta?.positions, departmentId]);

  const hasFilter = Boolean(
    departmentId || roleTitle || debouncedQuery || from || to || minScore || sort !== 'newest'
  );

  const clearFilters = () => {
    setDepartmentId('');
    setRoleTitle('');
    setQuery('');
    setDebouncedQuery('');
    setFrom(null);
    setTo(null);
    setPreset('all');
    setMinScore('');
    setSort('newest');
    setPage(1);
  };

  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    const range = presetRange(p);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };

  const chip = (active: boolean) =>
    `px-3 py-1.5 rounded-control text-xs font-bold border cursor-pointer transition-all min-h-[38px] sm:min-h-[34px] whitespace-nowrap ${
      active
        ? 'bg-brand text-white border-brand shadow-xs'
        : 'bg-surface-1 text-text-2 border-border-default hover:border-brand/40'
    }`;

  return (
    <div className="w-full max-w-[760px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-control bg-brand-soft text-brand border border-brand-200 flex items-center justify-center shrink-0">
          <BadgeCheck className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-text-1">رزومه‌های تایید/رد شده</h1>
          <p className="text-xs text-text-3 leading-relaxed mt-0.5">
            {initialRoleTitle
              ? `تصمیم‌های شما برای موقعیت «${initialRoleTitle}» — بقیه فیلترها را می‌توانید تغییر دهید.`
              : 'تصمیم‌های خودتان روی همه نشست‌های غربالگری، تفکیک‌شده بر اساس موقعیت شغلی و بازه زمانی شمسی.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
            loadMeta();
            toast('لیست به‌روزرسانی شد');
          }}
          title="به‌روزرسانی لیست"
          className="w-10 h-10 rounded-control bg-surface-1 border border-border-default flex items-center justify-center text-text-2 hover:text-brand hover:border-brand/40 cursor-pointer shrink-0 transition-colors"
        >
          <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin text-brand' : ''}`} />
        </button>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={`sm:hidden inline-flex items-center gap-1.5 px-3 h-10 rounded-control border text-xs font-bold transition-all cursor-pointer shrink-0 ${
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

      {/* Status tabs (with live counts) */}
      <div className="grid grid-cols-3 gap-2">
        {DECISION_ORDER.map((s) => {
          const m = DECISION_META[s];
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              title={`نمایش فهرست ${m.label}`}
              aria-pressed={active}
              className={`rounded-card border p-3 sm:p-3.5 flex flex-col items-start gap-1.5 cursor-pointer transition-all text-right ${
                active ? `${m.statBox} shadow-xs` : 'bg-surface-1 border-border-default hover:border-brand/30'
              }`}
            >
              <span className="flex items-center gap-1.5">{STATUS_ICON[s]}</span>
              <span className="text-lg sm:text-xl font-bold leading-none tabular-nums">
                {toPersianDigits(counts[s])}
              </span>
              <span className="text-[11px] sm:text-xs font-bold leading-tight">{m.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] sm:text-xs text-text-3 leading-relaxed -mt-1">
        {DECISION_META[status].hint}
      </p>

      {/* Filters */}
      <div className="flex flex-col gap-3 bg-surface-1 border border-border-default rounded-card p-3 sm:p-4 shadow-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-text-3 absolute right-3 top-3" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو در نام کاندید، فایل، مهارت یا دلیل رد…"
            className="w-full pr-9 pl-9 py-2.5 rounded-control bg-surface-2 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-2.5 top-3 text-text-3 hover:text-text-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`flex flex-col gap-3 ${filtersOpen ? 'block' : 'hidden sm:flex'}`}>
          {/* Position quick access */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-text-3 min-w-[70px]">موقعیت شغلی:</span>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setRoleTitle('');
                  setPage(1);
                }}
                className="h-9 sm:h-[34px] rounded-control border border-border-default bg-surface-1 text-xs font-bold text-text-1 px-2.5 cursor-pointer outline-none focus:border-brand"
              >
                <option value="">همه دپارتمان‌ها</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            {positions.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                <button
                  type="button"
                  className={chip(roleTitle === '')}
                  onClick={() => {
                    setRoleTitle('');
                    setPage(1);
                  }}
                >
                  همه موقعیت‌ها
                </button>
                {positions.map((p) => (
                  <button
                    key={`${p.departmentId}::${p.roleTitle}`}
                    type="button"
                    className={chip(roleTitle === p.roleTitle)}
                    onClick={() => {
                      setDepartmentId(p.departmentId);
                      setRoleTitle(roleTitle === p.roleTitle ? '' : p.roleTitle);
                      setPage(1);
                    }}
                    title={`${p.departmentName} — ${toPersianDigits(p.count)} رزومه`}
                  >
                    {p.roleTitle}
                    <span className="tabular-nums opacity-70"> ({toPersianDigits(p.count)})</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Jalali date range */}
          <div className="flex flex-col gap-2 pt-1 border-t border-border-default/60">
            <span className="text-xs font-bold text-text-3 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              بازه زمانی (شمسی):
            </span>
            <div className="flex flex-wrap items-end gap-2">
              <div className="w-full sm:w-[168px]">
                <JalaliDatePicker
                  label="از تاریخ"
                  value={from}
                  max={to}
                  compact
                  onChange={(v) => {
                    setFrom(v);
                    setPreset('all');
                    setPage(1);
                  }}
                />
              </div>
              <div className="w-full sm:w-[168px]">
                <JalaliDatePicker
                  label="تا تاریخ"
                  value={to}
                  min={from}
                  compact
                  onChange={(v) => {
                    setTo(v);
                    setPreset('all');
                    setPage(1);
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {RANGE_CHIPS.map((c) => (
                  <button key={c.v} type="button" className={chip(preset === c.v)} onClick={() => applyPreset(c.v)}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Score + sort */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border-default/60">
            <span className="text-xs font-bold text-text-3 min-w-[70px]">حداقل امتیاز:</span>
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-text-3 min-w-[70px]">مرتب‌سازی:</span>
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
          </div>

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

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 rounded-card bg-surface-1 border border-border-default animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="p-10 text-center bg-surface-1 rounded-card border border-dashed border-[var(--danger-border)] flex flex-col items-center gap-3">
          <XCircle className="w-9 h-9 text-danger opacity-70" />
          <p className="text-xs font-bold text-danger">{loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-4 py-2 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover shadow-xs"
          >
            تلاش مجدد
          </button>
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-10 text-center bg-surface-1 rounded-card border border-dashed border-border-default flex flex-col items-center gap-3">
          <Inbox className="w-10 h-10 text-text-3 opacity-60" />
          <p className="text-xs font-medium text-text-3 max-w-sm leading-relaxed">
            {totalAll === 0
              ? 'هنوز تصمیمی ثبت نشده است. در بخش «نتایج و اولویت‌بندی» زیر هر رزومه دکمه تیک (تایید) یا ضربدر (رد) را بزنید تا اینجا ذخیره شود.'
              : hasFilter
              ? 'با فیلترهای انتخابی رزومه‌ای در این فهرست نیست.'
              : `در این فهرست رزومه‌ای وجود ندارد.`}
          </p>
          {hasFilter ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-bold text-brand cursor-pointer hover:underline"
            >
              حذف فیلترها و مشاهده همه
            </button>
          ) : totalAll === 0 ? (
            <button
              type="button"
              onClick={onGoScreening}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              رفتن به غربالگری
            </button>
          ) : null}
          {totalAll === 0 && import.meta.env.DEV ? (
            <p className="mt-4 text-[11px] text-text-3 leading-relaxed max-w-md">
              پیش‌نمایش سریع: آدرس صفحه را با{' '}
              <code dir="ltr" className="font-mono text-text-2 bg-surface-2 px-1 rounded">
                ?demo=1
              </code>{' '}
              باز کنید تا یک نشست نمونه (۸ رزومه با فایل واقعی و تصمیم‌های آماده) ساخته شود.
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-text-3">
              {toPersianDigits(data.total)} رزومه در فهرست «{DECISION_META[status].label}»
              {from || to ? (
                <span className="font-medium">
                  {' '}
                  — بازه {from ? formatJalaliDate(from) : 'ابتدا'} تا {to ? formatJalaliDate(to) : 'امروز'}
                </span>
              ) : null}
            </span>
            <button
              type="button"
              onClick={() => {
                void load();
                loadMeta();
                emitDecisionsChanged();
              }}
              className="text-[11px] font-bold text-text-3 hover:text-brand cursor-pointer"
            >
              به‌روزرسانی
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {data.items.map((r: ResumeRecord) => (
              <CandidateCard
                key={r.id}
                record={r}
                context="decisions"
                rerunning={workspace.rerunningId === r.id}
                busy={workspace.busyId === r.id}
                {...workspace.handlers}
              />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      )}

      {workspace.overlays}
    </div>
  );
};

export default DecisionsView;
