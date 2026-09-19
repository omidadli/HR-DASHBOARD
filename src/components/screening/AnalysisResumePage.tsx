import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Download,
  FileText,
  Loader2,
  ScanSearch,
  Sparkles,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { CATEGORY_META } from '../../lib/categories';
import { toPersianDigits } from '../../lib/normalizeFa';
import { DECISION_META, decisionLabel, decisionOf } from '../../lib/decisions';
import { downloadResumeFile } from '../../lib/download';
import { CandidateAvatar } from '../common/CandidateAvatar';
import { AnalysisPanel, EmptyAnalysisNotice } from './AnalysisPanel';
import { ResumePreview } from './ResumePreview';
import { CandidateActionHandlers, CardContext, CandidateActions } from './CandidateActions';

interface AnalysisResumePageProps {
  record: ResumeRecord | null;
  context: CardContext;
  onClose: () => void;
  handlers: CandidateActionHandlers;
  /** A deep review («بازبینی») is running for this record. */
  rerunning?: boolean;
  /** A decision/bank/delete mutation is in flight. */
  busy?: boolean;
}

type MobilePane = 'analysis' | 'file';

/**
 * «مشاهده تحلیل و رزومه» — a full page (rendered as an overlay route) that puts
 * هوشا's analysis next to the ORIGINAL uploaded file, with preview + download.
 *
 * Desktop: two panes side by side (analysis right, sticky file preview left).
 * Mobile: a segmented switch between the two, because a side-by-side PDF pane
 * is unusable on a phone.
 */
export const AnalysisResumePage: React.FC<AnalysisResumePageProps> = ({
  record,
  context,
  onClose,
  handlers,
  rerunning,
  busy,
}) => {
  const [pane, setPane] = useState<MobilePane>('analysis');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!record) return;
    setPane('analysis');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [record?.id, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!record) return null;

  const rec = record.recommendation;
  const meta = rec ? CATEGORY_META[rec] : null;
  const decision = decisionOf(record);
  const label = decisionLabel(record);
  const hasAnalysis = record.criterionScores.length > 0 || Boolean(record.summary);

  const download = async () => {
    if (!record.filePath || downloading) return;
    setDownloading(true);
    try {
      await downloadResumeFile(record);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[85] bg-surface-0 flex flex-col animate-fadeIn no-print" dir="rtl">
      {/* Page header */}
      <header className="shrink-0 bg-surface-1 border-b border-border-default pb-[env(safe-area-inset-top)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-3 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-control bg-surface-1 border border-border-default flex items-center justify-center text-text-2 hover:text-brand hover:border-brand/40 cursor-pointer shrink-0 transition-colors"
              title="بازگشت"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <CandidateAvatar name={record.candidateName} category={record.category} size="lg" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-base font-bold text-text-1 truncate">
                  {record.candidateName || 'کاندید بدون نام'}
                </h1>
                {meta && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                    {meta.label}
                  </span>
                )}
                {label && (
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${
                      decision === 'none'
                        ? 'bg-warning-soft text-warning border-[var(--warning-border)]'
                        : DECISION_META[decision].badge
                    }`}
                  >
                    {label}
                  </span>
                )}
                {record.deepAnalysisAtJalali && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand-200"
                    title={`بازبینی دقیق در ${record.deepAnalysisAtJalali}`}
                  >
                    <ScanSearch className="w-3.5 h-3.5" />
                    بازبینی‌شده
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-text-3 mt-1 flex-wrap">
                <span className="truncate">
                  {record.roleTitle ? `${record.roleTitle} — ${record.departmentName}` : record.departmentName}
                </span>
                {record.facts?.yearsExperience != null && (
                  <span className="shrink-0">{toPersianDigits(record.facts.yearsExperience)} سال سابقه</span>
                )}
                {record.confidence && (
                  <span className="shrink-0">
                    اطمینان:{' '}
                    {record.confidence === 'high' ? 'قوی' : record.confidence === 'medium' ? 'متوسط' : 'ضعیف'}
                  </span>
                )}
                {record.engine === 'local' && <span className="shrink-0">تحلیل محلی</span>}
              </div>
            </div>

            {meta && record.score > 0 && (
              <div
                className={`hidden sm:flex flex-col items-center justify-center px-3.5 py-1.5 rounded-control border shrink-0 ${meta.scoreBox}`}
              >
                <span className="text-2xl font-bold leading-none tabular-nums">
                  {toPersianDigits(record.score)}
                </span>
                <span className="text-xs font-medium opacity-80 mt-1">از ۱۰۰</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <CandidateActions
              record={record}
              context={context}
              variant="toolbar"
              showPrimary={false}
              rerunning={rerunning}
              busy={busy}
              {...handlers}
            />
            <button
              type="button"
              onClick={download}
              disabled={!record.filePath || downloading}
              className="min-h-[44px] sm:min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-control border border-border-default bg-surface-1 px-3 py-2 text-xs font-bold text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              title={record.filePath ? 'دانلود فایل اصلی رزومه' : 'فایل اصلی روی سرور ذخیره نشده است'}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin text-brand" />
              ) : (
                <Download className="w-4 h-4 text-text-2" />
              )}
              دانلود رزومه
            </button>
          </div>
        </div>
      </header>

      {/* Mobile pane switch */}
      <div className="lg:hidden shrink-0 px-3 sm:px-5 pt-3">
        <div className="grid grid-cols-2 gap-1 bg-surface-2 rounded-control p-1">
          {(
            [
              { id: 'analysis', label: 'تحلیل هوشا', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'file', label: 'فایل رزومه', icon: <FileText className="w-3.5 h-3.5" /> },
            ] as { id: MobilePane; label: string; icon: React.ReactNode }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setPane(t.id)}
              className={`inline-flex items-center justify-center gap-1.5 h-10 rounded-[8px] text-xs font-bold cursor-pointer transition-all ${
                pane === t.id ? 'bg-brand text-white shadow-e1' : 'text-text-2 hover:text-brand'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto touch-scroll">
        <div className="max-w-6xl mx-auto px-3 sm:px-5 py-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start gap-4">
          {/* Analysis */}
          <section
            className={`min-w-0 gap-4 ${pane === 'analysis' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'}`}
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-control bg-brand-soft text-brand border border-brand-200 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-text-1">تحلیل هوش مصنوعی (هوشا)</h2>
              {rerunning && (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-brand bg-brand-soft border border-brand-200 rounded-full px-2.5 py-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  در حال بازبینی دقیق…
                </span>
              )}
            </div>

            <div
              className={`rounded-card border border-border-default bg-surface-1 p-3.5 sm:p-4 shadow-xs ${
                rerunning ? 'opacity-60' : ''
              }`}
            >
              {hasAnalysis ? <AnalysisPanel record={record} onBank={handlers.onBank} /> : <EmptyAnalysisNotice record={record} />}
            </div>

            {record.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {record.tags.map((t) => (
                  <span
                    key={t}
                    className="text-xs font-medium text-text-2 bg-surface-1 border border-border-default rounded-full px-2.5 py-0.5"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Original file */}
          <section
            className={`min-w-0 gap-3 lg:sticky lg:top-0 ${
              pane === 'file' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-control bg-surface-2 text-text-2 border border-border-default flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-text-1 shrink-0">فایل اصلی بارگذاری‌شده</h2>
              <span className="text-[11px] text-text-3 truncate">{record.fileName}</span>
            </div>

            <ResumePreview
              record={record}
              className="h-[70vh] lg:h-[calc(100vh-15rem)]"
              onDownload={download}
            />
          </section>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResumePage;
