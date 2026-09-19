import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Bot,
  RotateCcw,
  Download,
  Printer,
  AlertTriangle,
  ChevronDown,
  Users,
  Search,
  XCircle,
  CheckCircle2,
  ClipboardCheck,
} from 'lucide-react';
import { SilanehLogo } from '../common/SilanehLogo';
import {
  Recommendation,
  ResumeRecord,
  ScreeningBatch,
} from '../../types/screening';
import { fetchBatch, rerunResume } from '../../lib/api';
import { exportBatchToExcel } from '../../lib/excelExport';
import { toPersianDigits } from '../../lib/normalizeFa';
import { CATEGORY_META } from '../../lib/categories';
import { emitDecisionsChanged } from '../../lib/decisions';
import { CandidateCard } from './CandidateCard';
import { useResumeWorkspace } from './useResumeWorkspace';
import { Pagination } from '../common/Pagination';
import { toast } from '../common/Toast';

const PAGE_SIZE = 10;

interface ResultsViewProps {
  batchId: string;
  onNewScreening: () => void;
  /** Opens the «رزومه‌های تایید/رد شده» workspace, scoped to this session's position. */
  onOpenDecisions?: (scope: { departmentId: string; roleTitle: string }) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ batchId, onNewScreening, onOpenDecisions }) => {
  const [batch, setBatch] = useState<ScreeningBatch | null>(null);
  const [records, setRecords] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<Recommendation>('INTERVIEW');
  const [pages, setPages] = useState<Record<string, number>>({ INTERVIEW: 1, REVIEW: 1, REJECT: 1 });
  const [showUnjudgeable, setShowUnjudgeable] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const replaceRecord = useCallback((updated: ResumeRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const reloadBatch = useCallback(() => {
    fetchBatch(batchId)
      .then((data) => {
        setBatch(data.batch);
        setRecords(data.resumes);
      })
      .catch(() => {});
  }, [batchId]);

  const workspace = useResumeWorkspace({
    context: 'results',
    defaultBankDepartmentId: batch?.departmentId,
    onUpdate: replaceRecord,
    onRemove: removeRecord,
    // Keep the summary banner and the rank numbers in sync with the server.
    onChanged: reloadBatch,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBatch(batchId);
      setBatch(data.batch);
      setRecords(data.resumes);
      const firstNonEmpty: Recommendation =
        data.batch.stats.interview > 0
          ? 'INTERVIEW'
          : data.batch.stats.review > 0
          ? 'REVIEW'
          : 'REJECT';
      setTab(firstNonEmpty);
    } catch (e: any) {
      setLoadError(e?.message || 'بارگذاری نتایج ممکن نشد');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  /** Retry of an ERROR/UNJUDGEABLE file — the fast pass, not a deep review. */
  const handleRetry = async (r: ResumeRecord) => {
    setRetryingId(r.id);
    try {
      const { record } = await rerunResume(r.id);
      replaceRecord(record);
      reloadBatch();
      emitDecisionsChanged();
      const moved = record.category !== r.category;
      toast(
        moved && record.recommendation
          ? `تحلیل تازه انجام شد و دسته به «${CATEGORY_META[record.recommendation].label}» تغییر کرد`
          : 'تحلیل تازه انجام شد ✓'
      );
    } catch (e: any) {
      toast(e?.message || 'بررسی مجدد ممکن نشد', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  const byCategory = useMemo(() => {
    const groups: Record<Recommendation, ResumeRecord[]> = { INTERVIEW: [], REVIEW: [], REJECT: [] };
    for (const r of records) {
      if (r.category === 'INTERVIEW' || r.category === 'REVIEW' || r.category === 'REJECT') {
        groups[r.category].push(r);
      }
    }
    for (const key of ['INTERVIEW', 'REVIEW', 'REJECT'] as Recommendation[]) {
      groups[key].sort((a, b) => {
        if (a.rankInCategory != null && b.rankInCategory != null) {
          return a.rankInCategory - b.rankInCategory;
        }
        if (b.score !== a.score) return b.score - a.score;
        const ya = a.facts?.yearsExperience ?? -1;
        const yb = b.facts?.yearsExperience ?? -1;
        return yb - ya;
      });
    }
    return groups;
  }, [records]);

  const unjudgeable = records.filter((r) => r.category === 'UNJUDGEABLE' || r.category === 'ERROR');
  const decidedCount = records.filter((r) => (r.decisionStatus || 'none') !== 'none').length;
  const tabRecords = byCategory[tab];
  const page = pages[tab] || 1;
  const totalPages = Math.max(1, Math.ceil(tabRecords.length / PAGE_SIZE));
  const visible = tabRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setActiveTab = (t: Recommendation) => {
    setTab(t);
    setPages((p) => ({ ...p, [t]: 1 }));
  };

  if (loading) {
    return (
      <div className="w-full max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5 animate-pulse">
        <div className="h-28 rounded-card bg-surface-1 border border-border-default" />
        <div className="h-14 rounded-card bg-surface-1 border border-border-default" />
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 rounded-card bg-surface-1 border border-border-default" />
          ))}
        </div>
      </div>
    );
  }

  if (loadError || !batch) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-danger" />
        <p className="text-xs font-bold text-danger">{loadError || 'نتیجه‌ای پیدا نشد'}</p>
        <button
          type="button"
          onClick={load}
          className="px-5 py-2.5 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover shadow-xs"
        >
          تلاش مجدد
        </button>
      </div>
    );
  }

  const tabButton = (t: Recommendation, icon: React.ReactNode) => {
    const meta = CATEGORY_META[t];
    const active = tab === t;
    return (
      <button
        key={t}
        type="button"
        onClick={() => setActiveTab(t)}
        className={`flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-control border text-xs sm:text-sm font-bold px-2 sm:px-3 cursor-pointer transition-all ${
          active ? meta.tabActive : meta.tabIdle
        }`}
      >
        {icon}
        <span>{meta.label}</span>
        <span
          className={`text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full tabular-nums ${
            active ? 'bg-white/25' : 'bg-surface-2 text-text-3'
          }`}
        >
          {toPersianDigits(byCategory[t].length)}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-5">
      {/* Print-only Report Header */}
      <div className="hidden print-only mb-4 pb-4 border-b border-gray-300">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="text-lg font-bold text-gray-900">گزارش غربالگری هوشمند رزومه‌ها — هلدینگ سیلانه سبز</h1>
          <SilanehLogo className="h-10 w-auto" />
        </div>
        <div className="text-xs text-gray-600 mt-1 flex gap-4">
          <span><strong>موقعیت:</strong> {batch.roleTitle || batch.departmentName}</span>
          <span><strong>دپارتمان:</strong> {batch.departmentName}</span>
          <span><strong>تاریخ:</strong> {batch.createdAtJalali}</span>
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-200">
          <span>کل: {toPersianDigits(batch.stats.total)}</span>
          <span>دعوت به مصاحبه: {toPersianDigits(batch.stats.interview)}</span>
          <span>بررسی بیشتر: {toPersianDigits(batch.stats.review)}</span>
          <span>عدم انطباق: {toPersianDigits(batch.stats.reject)}</span>
          {batch.stats.unjudgeable > 0 && <span>غیرقابل‌ارزیابی: {toPersianDigits(batch.stats.unjudgeable)}</span>}
        </div>
      </div>

      {/* Summary banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand via-brand-600 to-brand-700 text-white p-5 rounded-card shadow-[0_10px_25px_-5px_rgba(0,200,123,0.35)] border border-white/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3.5 text-center sm:text-right relative z-10">
          <div className="w-11 h-11 rounded-control bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0 shadow-xs">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold leading-snug">
              از {toPersianDigits(batch.stats.total)} رزومه، {toPersianDigits(batch.stats.interview)} نفر برای مصاحبه پیشنهاد شده‌اند
            </h2>
            <span className="text-xs text-white/90 mt-0.5 block font-medium">
              {batch.roleTitle || batch.departmentName} — {batch.createdAtJalali}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end no-print w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void exportBatchToExcel(batch, records)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[40px] rounded-control bg-white text-brand text-xs font-bold cursor-pointer hover:bg-white/90 shadow-xs"
          >
            <Download className="w-4 h-4" /> دانلود گزارش
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] rounded-control bg-white/20 text-white text-xs font-bold cursor-pointer hover:bg-white/30"
          >
            <Printer className="w-4 h-4" /> چاپ
          </button>
          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[40px] rounded-control bg-white/20 text-white text-xs font-bold cursor-pointer hover:bg-white/30"
          >
            <RotateCcw className="w-4 h-4" /> جدید
          </button>
        </div>
      </div>

      {/* AI explanation */}
      <div className="bg-surface-1 rounded-card border border-brand/20 p-4 flex items-start gap-3 shadow-xs">
        <div className="w-9 h-9 rounded-control bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-brand mb-0.5 flex items-center gap-1">
            تحلیل هوشا از این موقعیت شغلی
          </div>
          <p className="text-xs text-text-2 leading-relaxed font-medium">{batch.understanding.plainExplanation}</p>
        </div>
      </div>

      {/* Decisions shortcut */}
      {onOpenDecisions && (
        <div className="bg-surface-1 rounded-card border border-border-default p-3.5 flex items-center gap-3 shadow-xs">
          <span className="w-9 h-9 rounded-control bg-brand-soft text-brand border border-brand-200 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-4.5 h-4.5" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-text-1">تصمیم‌های شما روی این نشست</div>
            <p className="text-[11px] text-text-3 leading-relaxed mt-0.5">
              {decidedCount > 0
                ? `${toPersianDigits(decidedCount)} رزومه تایید یا رد شده است؛ همه در بخش «تایید/رد شده» نگهداری می‌شوند.`
                : 'با دکمه‌های تیک (تایید) و ضربدر (رد) زیر هر کارت، رزومه‌ها را تعیین تکلیف کنید.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              onOpenDecisions({ departmentId: batch.departmentId, roleTitle: batch.roleTitle })
            }
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-control border border-brand/30 bg-brand-soft/60 text-xs font-bold text-brand-700 hover:bg-brand-soft cursor-pointer transition-all"
          >
            مشاهده بخش
          </button>
        </div>
      )}

      {/* Category tabs */}
      <div className="sticky top-14 sm:top-16 z-30 bg-surface-0/95 backdrop-blur py-2.5 -mx-4 px-4 sm:mx-0 sm:px-0 no-print">
        <div className="flex gap-2">
          {tabButton('INTERVIEW', <CheckCircle2 className="w-4 h-4" />)}
          {tabButton('REVIEW', <Search className="w-4 h-4" />)}
          {tabButton('REJECT', <XCircle className="w-4 h-4" />)}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="p-10 text-center bg-surface-1 rounded-card border border-dashed border-border-default text-xs text-text-3 font-bold">
          <Users className="w-9 h-9 mx-auto mb-2 opacity-50" />
          در این دسته رزومه‌ای نیست.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((r) => (
            <CandidateCard
              key={r.id}
              record={r}
              rank={r.rankInCategory ?? undefined}
              context="results"
              rerunning={workspace.rerunningId === r.id}
              busy={workspace.busyId === r.id}
              {...workspace.handlers}
            />
          ))}
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={(p) => {
          setPages((prev) => ({ ...prev, [tab]: p }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Unjudgeable */}
      {unjudgeable.length > 0 && (
        <div className="rounded-card border border-border-default bg-surface-1 overflow-hidden no-print shadow-xs">
          <button
            type="button"
            onClick={() => setShowUnjudgeable((s) => !s)}
            className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-surface-2/40 transition-colors"
          >
            <span className="inline-flex items-center gap-2 text-xs font-bold text-text-2">
              <AlertTriangle className="w-4 h-4 text-text-3" />
              غیرقابل‌ارزیابی ({toPersianDigits(unjudgeable.length)})
            </span>
            <ChevronDown className={`w-4 h-4 text-text-3 transition-transform ${showUnjudgeable ? 'rotate-180' : ''}`} />
          </button>
          {showUnjudgeable && (
            <div className="px-4 pb-4 flex flex-col gap-2">
              {unjudgeable.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-2 p-3 rounded-control bg-surface-2/60 border border-border-default"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text-1 truncate">{r.fileName}</div>
                    <div className="text-xs text-text-3 mt-0.5">
                      {r.category === 'ERROR' ? r.errorMessage || 'خطا در تحلیل' : r.unjudgeableReason}
                    </div>
                  </div>
                  {r.category === 'ERROR' && r.extractedText && (
                    <button
                      type="button"
                      onClick={() => handleRetry(r)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-brand px-2.5 py-1.5 rounded-control bg-brand-soft border border-brand/20 cursor-pointer hover:bg-brand-soft/80"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${retryingId === r.id ? 'animate-spin' : ''}`} />
                      تلاش دوباره
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlays (analysis page, drawer, message, bank, delete, reject) */}
      {workspace.overlays}
    </div>
  );
};

export default ResultsView;
