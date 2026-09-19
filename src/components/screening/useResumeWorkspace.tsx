import React, { useCallback, useMemo, useState } from 'react';
import { XCircle } from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import {
  addToBank,
  deepRerunResume,
  deleteResume,
  removeFromBank,
  setResumeDecision,
} from '../../lib/api';
import { toPersianDigits } from '../../lib/normalizeFa';
import { REJECT_REASONS, decisionOf, emitDecisionsChanged } from '../../lib/decisions';
import { toast } from '../common/Toast';
import { ConfirmDialog, Modal } from '../common/Modal';
import { AnalysisResumePage } from './AnalysisResumePage';
import { CandidateDrawer } from './CandidateDrawer';
import { MessageModal } from './MessageModal';
import { AddToBankModal } from './AddToBankModal';
import { CandidateActionHandlers, CardContext } from './CandidateActions';

/** Ask for a short, honest reason when rejecting — the archive stays explainable. */
const RejectDialog: React.FC<{
  record: ResumeRecord | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (note: string) => void;
}> = ({ record, saving, onCancel, onConfirm }) => {
  const [note, setNote] = useState('');
  const [chosen, setChosen] = useState<string[]>([]);

  React.useEffect(() => {
    if (record) {
      setNote('');
      setChosen([]);
    }
  }, [record?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!record) return null;

  const toggle = (r: string) =>
    setChosen((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));

  const finalNote = [chosen.join('، '), note.trim()].filter(Boolean).join(' — ').slice(0, 400);

  return (
    <Modal
      open
      onClose={onCancel}
      title="رد کردن رزومه"
      icon={<XCircle className="w-5 h-5 text-danger" />}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-control bg-surface-2 text-text-2 text-xs sm:text-sm font-bold cursor-pointer hover:bg-border-default/40"
          >
            انصراف
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => onConfirm(finalNote)}
            className="px-5 py-2.5 rounded-control bg-danger text-white text-xs sm:text-sm font-bold cursor-pointer hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'در حال ثبت…' : 'رد کردن رزومه'}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <p className="text-xs text-text-2 leading-relaxed">
          <span className="font-bold text-text-1">
            {record.candidateName || record.fileName}
          </span>{' '}
          به فهرست «رد شده‌ها» منتقل می‌شود و در بخش رزومه‌های تایید/رد شده قابل مشاهده خواهد بود.
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-3">دلیل رد (اختیاری):</span>
          <div className="flex flex-wrap gap-1.5">
            {REJECT_REASONS.map((r) => {
              const active = chosen.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggle(r)}
                  className={`px-3 py-1.5 rounded-control text-xs font-bold border cursor-pointer transition-all ${
                    active
                      ? 'bg-danger text-white border-danger'
                      : 'bg-surface-1 text-text-2 border-border-default hover:border-danger/40 hover:bg-danger-soft/40'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="توضیح بیشتر (اختیاری)…"
            className="w-full rounded-control border border-border-default bg-surface-1 p-3 text-xs leading-relaxed outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 resize-none"
          />
        </div>
      </div>
    </Modal>
  );
};

export interface ResumeWorkspaceOptions {
  context: CardContext;
  /** Department preselected in «افزودن به بانک رزومه». */
  defaultBankDepartmentId?: string;
  /** Replace a record in the caller's list after a mutation. */
  onUpdate: (record: ResumeRecord) => void;
  /** Drop a record from the caller's list (delete / left the current filter). */
  onRemove: (id: string) => void;
  /** Called after every successful mutation (header counters, batch reload…). */
  onChanged?: () => void;
  /**
   * Decisions can move a card out of the list the user is looking at (e.g. an
   * approved resume disappears from «رد شده‌ها»). Return true to remove it.
   */
  shouldRemoveAfterUpdate?: (record: ResumeRecord) => boolean;
}

export interface ResumeWorkspace {
  rerunningId: string | null;
  busyId: string | null;
  analysisRecord: ResumeRecord | null;
  drawerRecord: ResumeRecord | null;
  openAnalysis: (r: ResumeRecord) => void;
  openDrawer: (r: ResumeRecord) => void;
  closeOverlays: () => void;
  handlers: CandidateActionHandlers;
  overlays: React.ReactNode;
}

/**
 * All per-resume mutations in one place: deep review («بازبینی»), decisions
 * (تایید / رد / نیاز به بررسی), bank save, message and delete — plus the overlay
 * stack every list needs. Results, the talent bank and the decisions workspace
 * all use it, so behaviour and copy stay identical across the product.
 */
export function useResumeWorkspace(options: ResumeWorkspaceOptions): ResumeWorkspace {
  const {
    context,
    defaultBankDepartmentId,
    onUpdate,
    onRemove,
    onChanged,
    shouldRemoveAfterUpdate,
  } = options;

  const [analysisRecord, setAnalysisRecord] = useState<ResumeRecord | null>(null);
  const [drawerRecord, setDrawerRecord] = useState<ResumeRecord | null>(null);
  const [messageRecord, setMessageRecord] = useState<ResumeRecord | null>(null);
  const [bankRecord, setBankRecord] = useState<ResumeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeRecord | null>(null);
  const [rejectTarget, setRejectTarget] = useState<ResumeRecord | null>(null);
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  /** Push a mutated record into every open surface + the caller's list. */
  const applyUpdate = useCallback(
    (record: ResumeRecord) => {
      setAnalysisRecord((cur) => (cur?.id === record.id ? record : cur));
      setDrawerRecord((cur) => (cur?.id === record.id ? record : cur));
      setBankRecord((cur) => (cur?.id === record.id ? record : cur));
      if (shouldRemoveAfterUpdate?.(record)) onRemove(record.id);
      else onUpdate(record);
      onChanged?.();
    },
    [onUpdate, onRemove, onChanged, shouldRemoveAfterUpdate]
  );

  /** «بازبینی» — a deliberate, slower and much more detailed AI pass. */
  const handleDeepRerun = useCallback(
    async (r: ResumeRecord) => {
      const before = r.score;
      setRerunningId(r.id);
      try {
        const res = await deepRerunResume(r.id);
        applyUpdate(res.record);
        if (res.engine === 'local') {
          toast('هوشا در دسترس نبود؛ بازبینی با موتور محلی انجام شد (تحلیل هوشمند نیست)', 'error');
        } else {
          const after = res.record.score;
          const delta =
            after === before
              ? 'امتیاز تغییر نکرد و نتیجه قبلی تایید شد'
              : `امتیاز از ${toPersianDigits(before)} به ${toPersianDigits(after)} تغییر کرد`;
          toast(`بازبینی دقیق انجام شد ✓ — ${delta}`);
        }
      } catch (e: any) {
        toast(e?.message || 'بازبینی دقیق ممکن نشد', 'error');
      } finally {
        setRerunningId(null);
      }
    },
    [applyUpdate]
  );

  const handleDecision = useCallback(
    async (r: ResumeRecord, status: 'approved' | 'rejected' | 'review' | 'none', note?: string) => {
      setBusyId(r.id);
      try {
        const { record } = await setResumeDecision(r.id, status, note);
        applyUpdate(record);
        if (status === 'approved') toast('رزومه تایید شد ✓ — در بخش «تایید/رد شده» ذخیره شد');
        else if (status === 'rejected') toast('رزومه رد شد — به بخش «رد شده‌ها» منتقل شد');
        else if (status === 'review') toast('به «نیاز به بررسی» منتقل شد');
        else toast('تصمیم لغو شد');
        emitDecisionsChanged();
      } catch (e: any) {
        toast(e?.message || 'ثبت تصمیم ممکن نشد', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [applyUpdate]
  );

  const handleApprove = useCallback(
    (r: ResumeRecord) => {
      // Clicking the tick again takes the resume back to "no decision".
      if (decisionOf(r) === 'approved') void handleDecision(r, 'none');
      else void handleDecision(r, 'approved');
    },
    [handleDecision]
  );

  const handleReject = useCallback(
    (r: ResumeRecord) => {
      if (decisionOf(r) === 'rejected') void handleDecision(r, 'none');
      else setRejectTarget(r);
    },
    [handleDecision]
  );

  const handleNeedsReview = useCallback(
    (r: ResumeRecord) => {
      if (decisionOf(r) === 'review') void handleDecision(r, 'none');
      else void handleDecision(r, 'review');
    },
    [handleDecision]
  );

  /**
   * 🔖 One tap saves the resume into the bank with sensible defaults (its own
   * department + هوشا's tags). Tapping it again opens the full dialog to move it
   * to another department, add a note/tags or take it out of the bank.
   */
  const handleBank = useCallback(
    async (r: ResumeRecord) => {
      if (r.inBank) {
        setBankRecord(r);
        return;
      }
      setBusyId(r.id);
      try {
        const { record } = await addToBank(
          r.id,
          r.bankDepartmentId || r.departmentId || defaultBankDepartmentId || 'other',
          '',
          r.tags.slice(0, 6)
        );
        applyUpdate(record);
        toast('در بانک رزومه ذخیره شد ✓ — برای ویرایش دوباره همان دکمه را بزنید');
      } catch (e: any) {
        toast(e?.message || 'ذخیره در بانک ممکن نشد', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [applyUpdate, defaultBankDepartmentId]
  );

  const handleRemoveBank = useCallback(
    async (r: ResumeRecord) => {
      setBusyId(r.id);
      try {
        const { record } = await removeFromBank(r.id);
        applyUpdate(record);
        toast('از بانک رزومه خارج شد');
      } catch (e: any) {
        toast(e?.message || 'عملیات ممکن نشد', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [applyUpdate]
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    try {
      await deleteResume(target.id);
      setDeleteTarget(null);
      setAnalysisRecord((cur) => (cur?.id === target.id ? null : cur));
      setDrawerRecord((cur) => (cur?.id === target.id ? null : cur));
      onRemove(target.id);
      onChanged?.();
      emitDecisionsChanged();
      toast('رزومه حذف شد');
    } catch (e: any) {
      toast(e?.message || 'حذف ممکن نشد', 'error');
    } finally {
      setBusyId(null);
    }
  }, [deleteTarget, onRemove, onChanged]);

  const handlers = useMemo<CandidateActionHandlers>(
    () => ({
      onOpen: (r) => setDrawerRecord(r),
      onOpenAnalysis: (r) => setAnalysisRecord(r),
      onMessage: (r) => setMessageRecord(r),
      onRerun: (r) => void handleDeepRerun(r),
      onBank: (r) => void handleBank(r),
      onRemoveBank: (r) => void handleRemoveBank(r),
      onDelete: (r) => setDeleteTarget(r),
      onApprove: handleApprove,
      onReject: handleReject,
      onNeedsReview: handleNeedsReview,
      onClearDecision: (r) => void handleDecision(r, 'none'),
    }),
    [handleDeepRerun, handleBank, handleRemoveBank, handleApprove, handleReject, handleNeedsReview, handleDecision]
  );

  const overlays = (
    <>
      <AnalysisResumePage
        record={analysisRecord}
        context={context}
        onClose={() => setAnalysisRecord(null)}
        handlers={{ ...handlers, onOpen: () => {}, onOpenAnalysis: () => {} }}
        rerunning={Boolean(analysisRecord && rerunningId === analysisRecord.id)}
        busy={Boolean(analysisRecord && busyId === analysisRecord.id)}
      />
      <CandidateDrawer
        record={drawerRecord}
        context={context}
        onClose={() => setDrawerRecord(null)}
        rerunning={Boolean(drawerRecord && rerunningId === drawerRecord.id)}
        busy={Boolean(drawerRecord && busyId === drawerRecord.id)}
        {...handlers}
      />
      <MessageModal
        record={messageRecord}
        onClose={() => setMessageRecord(null)}
        onMarkedSent={(updated) => {
          setAnalysisRecord((cur) => (cur?.id === updated.id ? updated : cur));
          setDrawerRecord((cur) => (cur?.id === updated.id ? updated : cur));
          onUpdate(updated);
        }}
      />
      <AddToBankModal
        record={bankRecord}
        defaultDepartmentId={defaultBankDepartmentId || bankRecord?.departmentId || 'other'}
        onClose={() => setBankRecord(null)}
        onSaved={(updated) => applyUpdate(updated)}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="حذف رزومه"
        danger
        confirmLabel="حذف رزومه"
        message={
          <>
            این رزومه{deleteTarget?.inBank ? ' از نتایج غربالگری و بانک رزومه' : ' از نتایج غربالگری'} حذف شود؟
            {deleteTarget?.candidateName ? ` (${deleteTarget.candidateName})` : ''}
          </>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <RejectDialog
        record={rejectTarget}
        saving={Boolean(rejectTarget && busyId === rejectTarget.id)}
        onCancel={() => setRejectTarget(null)}
        onConfirm={(note) => {
          const target = rejectTarget;
          setRejectTarget(null);
          if (target) void handleDecision(target, 'rejected', note);
        }}
      />
    </>
  );

  return {
    rerunningId,
    busyId,
    analysisRecord,
    drawerRecord,
    openAnalysis: (r) => setAnalysisRecord(r),
    openDrawer: (r) => setDrawerRecord(r),
    closeOverlays: () => {
      setAnalysisRecord(null);
      setDrawerRecord(null);
      setMessageRecord(null);
      setBankRecord(null);
      setDeleteTarget(null);
      setRejectTarget(null);
    },
    handlers,
    overlays,
  };
}

export default useResumeWorkspace;
