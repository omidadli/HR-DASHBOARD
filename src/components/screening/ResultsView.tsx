import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';
import {
  Recommendation,
  ResumeCategory,
  ResumeRecord,
  ScreeningBatch,
} from '../../types/screening';
import {
  deleteResume,
  fetchBatch,
  removeFromBank,
  rerunResume,
} from '../../lib/api';
import { exportBatchToExcel } from '../../lib/excelExport';
import { toPersianDigits } from '../../lib/normalizeFa';
import { CATEGORY_META, UNJUDGEABLE_META } from '../../lib/categories';
import { CandidateCard } from './CandidateCard';
import { CandidateDrawer } from './CandidateDrawer';
import { MessageModal } from './MessageModal';
import { AddToBankModal } from './AddToBankModal';
import { ConfirmDialog } from '../common/Modal';
import { Pagination } from '../common/Pagination';
import { toast } from '../common/Toast';

const PAGE_SIZE = 10;

interface ResultsViewProps {
  batchId: string;
  onNewScreening: () => void;
}

const TABS: Recommendation[] = ['INTERVIEW', 'REVIEW', 'REJECT'];

export const ResultsView: React.FC<ResultsViewProps> = ({ batchId, onNewScreening }) => {
  const [batch, setBatch] = useState<ScreeningBatch | null>(null);
  const [records, setRecords] = useState<ResumeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<Recommendation>('INTERVIEW');
  const [pages, setPages] = useState<Record<string, number>>({ INTERVIEW: 1, REVIEW: 1, REJECT: 1 });
  const [showUnjudgeable, setShowUnjudgeable] = useState(false);

  const [drawerRecord, setDrawerRecord] = useState<ResumeRecord | null>(null);
  const [messageRecord, setMessageRecord] = useState<ResumeRecord | null>(null);
  const [bankRecord, setBankRecord] = useState<ResumeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeRecord | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBatch(batchId);
      setBatch(data.batch);
      setRecords(data.resumes);
      const firstEmpty: Recommendation =
        data.batch.stats.interview > 0
          ? 'INTERVIEW'
          : data.batch.stats.review > 0
          ? 'REVIEW'
          : 'REJECT';
      setTab(firstEmpty);
    } catch (e: any) {
      setLoadError(e?.message || 'بارگذاری نتایج ممکن نشد');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  const replaceRecord = (updated: ResumeRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDrawerRecord((d) => (d?.id === updated.id ? updated : d));
    // refresh batch stats from server lightly
    fetchBatch(batchId).then((data) => setBatch(data.batch)).catch(() => {});
  };

  const removeRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setDrawerRecord(null);
    fetchBatch(batchId).then((data) => {
      setBatch(data.batch);
      setRecords(data.resumes);
    }).catch(() => {});
  };

  const handleRerun = async (r: ResumeRecord) => {
    setRerunningId(r.id);
    try {
      const { record } = await rerunResume(r.id);
      replaceRecord(record);
      const moved = record.category !== r.category;
      toast(moved ? `تحلیل تازه انجام شد و دسته به «${CATEGORY_META[record.recommendation!].label}» تغییر کرد` : 'تحلیل تازه انجام شد ✓');
    } catch (e: any) {
      toast(e?.message || 'بررسی مجدد ممکن نشد', 'error');
    } finally {
      setRerunningId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteResume(deleteTarget.id);
      removeRecord(deleteTarget.id);
      toast('رزومه حذف شد');
    } catch (e: any) {
      toast(e?.message || 'حذف ممکن نشد', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleRemoveBank = async (r: ResumeRecord) => {
    try {
      const { record } = await removeFromBank(r.id);
      replaceRecord(record);
      toast('از بانک رزومه خارج شد');
    } catch (e: any) {
      toast(e?.message || 'عملیات ممکن نشد', 'error');
    }
  };

  const byCategory = useMemo(() => {
    const groups: Record<Recommendation, ResumeRecord[]> = { INTERVIEW: [], REVIEW: [], REJECT: [] };
    for (const r of records) {
      if (r.category === 'INTERVIEW' || r.category === 'REVIEW' || r.category === 'REJECT') {
        groups[r.category].push(r);
      }
    }
    return groups;
  }, [records]);

  const unjudgeable = records.filter((r) => r.category === 'UNJUDGEABLE' || r.category === 'ERROR');
  const tabRecords = byCategory[tab];
  const page = pages[tab] || 1;
  const totalPages = Math.max(1, Math.ceil(tabRecords.length / PAGE_SIZE));
  const visible = tabRecords.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const setActiveTab = (t: Recommendation) => {
    setTab(t);
    if (!pages[t]) setPages((p) => ({ ...p, [t]: 1 }));
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-24 flex flex-col items-center gap-3 text-text-3">
        <div className="w-10 h-10 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
        <span className="text-sm font-bold">در حال بارگذاری نتایج…</span>
      </div>
    );
  }

  if (loadError || !batch) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-24 flex flex-col items-center gap-4 text-center">
        <AlertTriangle className="w-10 h-10 text-danger" />
        <p className="text-sm font-bold text-danger">{loadError || 'نتیجه‌ای پیدا نشد'}</p>
        <button onClick={load} className="px-5 py-2.5 rounded-xl bg-brand text-white text-xs font-black cursor-pointer">
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
        className={`flex-1 min-h-[46px] inline-flex items-center justify-center gap-1.5 rounded-xl border text-xs sm:text-sm font-black px-2 cursor-pointer transition-all ${
          active ? meta.tabActive : meta.tabIdle
        }`}
      >
        {icon}
        <span>{meta.label}</span>
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
            active ? 'bg-white/25' : 'bg-surface-2 text-text-3'
          }`}
        >
          {toPersianDigits(byCategory[t].length)}
        </span>
      </button>
    );
  };

  const cardProps = {
    context: 'results' as const,
    onOpen: (r: ResumeRecord) => setDrawerRecord(r),
    onMessage: (r: ResumeRecord) => setMessageRecord(r),
    onRerun: handleRerun,
    onBank: (r: ResumeRecord) => setBankRecord(r),
    onRemoveBank: handleRemoveBank,
    onDelete: (r: ResumeRecord) => setDeleteTarget(r),
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5">
      {/* Summary banner */}
      <div className="bg-brand text-white p-5 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black leading-snug">
              از {toPersianDigits(batch.stats.total)} رزومه، {toPersianDigits(batch.stats.interview)} نفر برای مصاحبه پیشنهاد می‌شن 🎯
            </h2>
            <span className="text-[11px] text-white/80 mt-0.5 block">
              {batch.roleTitle || batch.departmentName} — {batch.createdAtJalali}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center no-print">
          <button
            type="button"
            onClick={() => void exportBatchToExcel(batch, records)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-brand text-xs font-black cursor-pointer hover:bg-white/90"
          >
            <Download className="w-4 h-4" /> دانلود گزارش
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-bold cursor-pointer hover:bg-white/30"
          >
            <Printer className="w-4 h-4" /> چاپ
          </button>
          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white text-xs font-bold cursor-pointer hover:bg-white/30"
          >
            <RotateCcw className="w-4 h-4" /> جدید
          </button>
        </div>
      </div>

      {/* AI explanation */}
      <div className="bg-surface-1 rounded-2xl border border-brand/30 p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Bot className="w-4.5 h-4.5" />
        </div>
        <div>
          <div className="text-[11px] font-black text-brand mb-0.5 flex items-center gap-1">
            هوش مصنوعی این شغل رو این‌طوری فهمیده 🤖
          </div>
          <p className="text-xs text-text-2 leading-relaxed font-bold">{batch.understanding.plainExplanation}</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="sticky top-14 z-30 bg-surface-0/95 backdrop-blur py-2 -mx-4 px-4 no-print">
        <div className="flex gap-2">
          {tabButton('INTERVIEW', <CheckCircle2 className="w-4 h-4" />)}
          {tabButton('REVIEW', <Search className="w-4 h-4" />)}
          {tabButton('REJECT', <XCircle className="w-4 h-4" />)}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="p-10 text-center bg-surface-1 rounded-2xl border border-dashed border-border-default text-xs text-text-3 font-bold">
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
              rerunning={rerunningId === r.id}
              {...cardProps}
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
        <div className="rounded-2xl border border-border-default bg-surface-1 overflow-hidden no-print">
          <button
            type="button"
            onClick={() => setShowUnjudgeable((s) => !s)}
            className="w-full flex items-center justify-between p-4 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2 text-xs font-black text-text-2">
              <AlertTriangle className="w-4 h-4 text-slate-500" />
              {UNJUDGEABLE_META.emoji} غیرقابل‌ارزیابی ({toPersianDigits(unjudgeable.length)})
            </span>
            <ChevronDown className={`w-4 h-4 text-text-3 transition-transform ${showUnjudgeable ? 'rotate-180' : ''}`} />
          </button>
          {showUnjudgeable && (
            <div className="px-4 pb-4 flex flex-col gap-1.5">
              {unjudgeable.map((r) => (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-surface-2/60 border border-border-default/70"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-text-1 truncate">{r.fileName}</div>
                    <div className="text-[10px] text-text-3 mt-0.5">
                      {r.category === 'ERROR' ? r.errorMessage || 'خطا در تحلیل' : r.unjudgeableReason}
                    </div>
                  </div>
                  {r.category === 'ERROR' && r.extractedText && (
                    <button
                      type="button"
                      onClick={() => handleRerun(r)}
                      className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black text-brand px-2 py-1.5 rounded-lg bg-brand-soft cursor-pointer"
                    >
                      <RotateCcw className={`w-3 h-3 ${rerunningId === r.id ? 'animate-spin' : ''}`} />
                      تلاش دوباره
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      <CandidateDrawer
        record={drawerRecord}
        context="results"
        onClose={() => setDrawerRecord(null)}
        onMessage={(r) => {
          setDrawerRecord(null);
          setMessageRecord(r);
        }}
        onRerun={handleRerun}
        onBank={(r) => {
          setDrawerRecord(null);
          setBankRecord(r);
        }}
        onRemoveBank={(r) => {
          handleRemoveBank(r);
        }}
        onDelete={(r) => {
          setDrawerRecord(null);
          setDeleteTarget(r);
        }}
      />
      <MessageModal
        record={messageRecord}
        onClose={() => setMessageRecord(null)}
        onMarkedSent={(updated) => replaceRecord(updated)}
      />
      <AddToBankModal
        record={bankRecord}
        defaultDepartmentId={batch.departmentId}
        onClose={() => setBankRecord(null)}
        onSaved={(updated) => replaceRecord(updated)}
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
            برای همیشه از نتایج{deleteTarget?.inBank ? ' و بانک رزومه' : ''} حذف می‌شود. مطمئنی؟
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
