import React, { useEffect } from 'react';
import { Expand, X } from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { CATEGORY_META } from '../../lib/categories';
import { toPersianDigits } from '../../lib/normalizeFa';
import { DECISION_META, decisionLabel, decisionOf } from '../../lib/decisions';
import { CandidateAvatar } from '../common/CandidateAvatar';
import { AnalysisPanel, EmptyAnalysisNotice } from './AnalysisPanel';
import { CandidateActionHandlers, CardContext, CandidateActions } from './CandidateActions';

interface CandidateDrawerProps extends CandidateActionHandlers {
  record: ResumeRecord | null;
  context: CardContext;
  onClose: () => void;
  rerunning?: boolean;
  busy?: boolean;
}

/**
 * Quick peek at one candidate.
 *
 * It renders the very same analysis body as the full page (AnalysisPanel) and
 * the very same action set (CandidateActions); its only job is to let an HR user
 * check a resume without leaving the list. «باز کردن صفحه کامل» escalates to the
 * page that also previews and downloads the original file.
 */
export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  record,
  context,
  onClose,
  rerunning,
  busy,
  onOpen,
  onOpenAnalysis,
  onMessage,
  onRerun,
  onBank,
  onRemoveBank,
  onDelete,
  onApprove,
  onReject,
  onNeedsReview,
  onClearDecision,
}) => {
  useEffect(() => {
    if (!record) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [record, onClose]);

  if (!record) return null;

  const rec = record.recommendation;
  const meta = rec ? CATEGORY_META[rec] : null;
  const decision = decisionOf(record);
  const label = decisionLabel(record);
  const hasAnalysis = record.criterionScores.length > 0 || Boolean(record.summary);

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]" onClick={onClose} dir="rtl">
      <aside
        className="absolute top-0 bottom-0 right-0 w-full sm:w-[540px] bg-surface-0 shadow-2xl flex flex-col animate-fadeIn pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-surface-1 border-b border-border-default flex flex-col gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <CandidateAvatar name={record.candidateName} category={record.category} size="lg" />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-text-1 truncate">
                {record.candidateName || 'کاندید بدون نام'}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {meta && (
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                    {meta.label}
                  </span>
                )}
                {label && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      decision === 'none'
                        ? 'bg-warning-soft text-warning border-[var(--warning-border)]'
                        : DECISION_META[decision].badge
                    }`}
                  >
                    {label}
                  </span>
                )}
                {record.confidence && (
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      record.confidence === 'high'
                        ? 'text-brand-700 bg-brand-soft border-brand-200'
                        : record.confidence === 'medium'
                        ? 'text-warning bg-warning-soft border-[var(--warning-border)]'
                        : 'text-danger bg-danger-soft border-[var(--danger-border)]'
                    }`}
                  >
                    {record.confidence === 'high'
                      ? 'اطمینان قوی'
                      : record.confidence === 'medium'
                      ? 'اطمینان متوسط'
                      : 'اطمینان ضعیف'}
                  </span>
                )}
                {record.rankInCategory != null && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-2 text-text-2 border border-border-default">
                    رتبه {toPersianDigits(record.rankInCategory)} در دسته
                  </span>
                )}
                {record.engine === 'local' && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-2 text-text-3 border border-border-default">
                    تحلیل محلی (غیر هوشمند)
                  </span>
                )}
              </div>
              {(record.roleTitle || record.departmentName) && (
                <div className="text-[11px] text-text-3 mt-1 truncate">
                  {record.roleTitle ? `${record.roleTitle} — ${record.departmentName}` : record.departmentName}
                </div>
              )}
            </div>
            {meta && (
              <div
                className={`flex flex-col items-center px-3.5 py-1.5 rounded-control border shrink-0 ${meta.scoreBox}`}
              >
                <span className="text-xl font-bold leading-none tabular-nums">
                  {toPersianDigits(record.score)}
                </span>
                <span className="text-xs font-medium mt-1">از ۱۰۰</span>
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-control flex items-center justify-center text-text-3 hover:bg-surface-2 cursor-pointer shrink-0"
              title="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick actions (same set as the card) */}
          <CandidateActions
            record={record}
            context={context}
            variant="toolbar"
            showPrimary={false}
            rerunning={rerunning}
            busy={busy}
            onOpen={onOpen}
            onOpenAnalysis={onOpenAnalysis}
            onMessage={onMessage}
            onRerun={onRerun}
            onBank={onBank}
            onRemoveBank={onRemoveBank}
            onDelete={onDelete}
            onApprove={onApprove}
            onReject={onReject}
            onNeedsReview={onNeedsReview}
            onClearDecision={onClearDecision}
          />

          {onOpenAnalysis && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAnalysis(record);
              }}
              className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-control border border-brand/30 bg-brand-soft/60 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-soft cursor-pointer transition-all"
            >
              <Expand className="w-4 h-4" />
              مشاهده تحلیل و رزومه در صفحه کامل
            </button>
          )}
        </div>

        {/* Body — shared with the full page */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {hasAnalysis ? (
            <AnalysisPanel record={record} onBank={onBank} />
          ) : (
            <EmptyAnalysisNotice record={record} />
          )}
        </div>
      </aside>
    </div>
  );
};

export default CandidateDrawer;
