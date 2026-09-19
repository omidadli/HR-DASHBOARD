import React from 'react';
import { Bot, Briefcase, CheckCheck, Clock3, MapPin, ScanSearch, Sparkles } from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { CATEGORY_META } from '../../lib/categories';
import { toPersianDigits } from '../../lib/normalizeFa';
import { DECISION_META, decisionLabel, decisionOf, isPendingHumanDecision } from '../../lib/decisions';
import { CandidateAvatar } from '../common/CandidateAvatar';
import { CandidateActionHandlers, CardContext, CandidateActions } from './CandidateActions';

interface CandidateCardProps extends CandidateActionHandlers {
  record: ResumeRecord;
  rank?: number;
  /** A deep review («بازبینی») is in flight for this record. */
  rerunning?: boolean;
  /** A decision/bank/delete mutation is in flight for this record. */
  busy?: boolean;
  context: CardContext;
}

/**
 * One resume card. The body (avatar, score, «چرا این دسته؟», tags) is identical
 * everywhere; only the action row changes per surface — see CandidateActions.
 */
export const CandidateCard: React.FC<CandidateCardProps> = ({
  record,
  rank,
  rerunning,
  busy,
  context,
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
  const rec = record.recommendation;
  const meta = rec ? CATEGORY_META[rec] : null;
  const name = record.candidateName || 'کاندید بدون نام (روی کارت بزنید)';
  const years = record.facts?.yearsExperience;
  const decision = decisionOf(record);
  const pending = isPendingHumanDecision(record);
  const label = decisionLabel(record);

  const categoryTone =
    rec === 'INTERVIEW'
      ? 'bg-brand-soft text-brand-700 border-brand-200'
      : rec === 'REVIEW'
      ? 'bg-warning-soft text-warning border-[var(--warning-border)]'
      : rec === 'REJECT'
      ? 'bg-danger-soft text-danger border-[var(--danger-border)]'
      : 'bg-surface-2 text-text-2 border-border-default';

  const decisionTone =
    decision === 'approved'
      ? DECISION_META.approved.badge
      : decision === 'rejected'
      ? DECISION_META.rejected.badge
      : decision === 'review'
      ? DECISION_META.review.badge
      : 'bg-warning-soft text-warning border-[var(--warning-border)]';

  return (
    <div
      className={`w-full bg-surface-1 rounded-card border border-border-default p-4 sm:p-5 flex flex-col gap-3 shadow-xs card-hover-lift ${
        meta ? meta.ring : ''
      } ${rerunning ? 'opacity-80' : ''}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onOpen(record)}
          className="flex items-start gap-3 min-w-0 flex-1 text-right cursor-pointer"
        >
          {rank !== undefined && (
            <span
              className={`w-8 h-8 rounded-control border text-xs sm:text-sm font-bold flex items-center justify-center shrink-0 ${categoryTone}`}
              title={`رتبه ${toPersianDigits(rank)} در دسته`}
            >
              {toPersianDigits(rank)}
            </span>
          )}
          <CandidateAvatar name={record.candidateName} category={record.category} size="md" />
          <div className="min-w-0 flex flex-col gap-1">
            <span className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-text-1 truncate">{name}</h3>
              {meta && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                  {meta.label}
                </span>
              )}
              {label && (
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${decisionTone}`}
                  title={
                    decision === 'none'
                      ? 'هوشا «بررسی شود» داده و هنوز تصمیمی ثبت نشده است'
                      : `${DECISION_META[decision].label}${record.decidedAtJalali ? ` — ${record.decidedAtJalali}` : ''}`
                  }
                >
                  {label}
                </span>
              )}
              {record.engine === 'local' && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-2 text-text-3 border border-border-default"
                  title="این تحلیل با موتور محلی انجام شده است"
                >
                  تحلیل محلی
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
              {record.messageStatus === 'sent' && (
                <span
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-soft border border-brand-200 px-2 py-0.5 rounded-full"
                  title={`پیام ارسال شده در ${record.lastMessagedAtJalali || ''}`}
                >
                  <CheckCheck className="w-3.5 h-3.5 text-brand" />
                  پیام داده‌شده
                </span>
              )}
            </span>
            <span className="flex items-center gap-3 text-xs text-text-3 flex-wrap">
              {record.facts?.lastRole && (
                <span className="inline-flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-text-3" />
                  {record.facts.lastRole}
                </span>
              )}
              {years != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="w-3.5 h-3.5 text-text-3" />
                  {toPersianDigits(years)} سال سابقه
                </span>
              )}
              {record.contact?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-text-3" />
                  {record.contact.city}
                </span>
              )}
              {(context === 'decisions' || context === 'bank') && record.roleTitle && (
                <span className="inline-flex items-center gap-1 truncate" title="موقعیت شغلی">
                  {record.roleTitle}
                </span>
              )}
            </span>
          </div>
        </button>

        {/* Score */}
        {meta && record.score > 0 && (
          <div
            className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-control border shrink-0 ${meta.scoreBox}`}
          >
            <span className="text-2xl font-bold leading-none tabular-nums">
              {toPersianDigits(record.score)}
            </span>
            <span className="text-xs font-medium opacity-80 mt-1">از ۱۰۰</span>
          </div>
        )}
      </div>

      {/* Why */}
      <button
        type="button"
        onClick={() => onOpen(record)}
        className="text-right bg-surface-2/60 border border-border-default rounded-control p-3 flex items-start gap-2.5 cursor-pointer hover:border-brand/30 hover:bg-surface-2 transition-all"
      >
        <Bot className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <span className="text-xs text-text-2 leading-relaxed line-clamp-2">
          {record.whyCategory || record.summary}
        </span>
      </button>

      {/* Decision note (captured when rejecting) */}
      {record.decisionNote && decision !== 'none' && (
        <div
          className={`text-xs leading-relaxed rounded-control border px-3 py-2 ${
            decision === 'rejected'
              ? 'bg-danger-soft/50 border-[var(--danger-border)] text-danger'
              : 'bg-surface-2/60 border-border-default text-text-2'
          }`}
        >
          <span className="font-bold">دلیل ثبت‌شده: </span>
          {record.decisionNote}
        </div>
      )}
      {pending && (
        <div className="text-xs leading-relaxed rounded-control border border-[var(--warning-border)] bg-warning-soft/60 px-3 py-2 text-warning flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          هوشا این رزومه را «بررسی شود» داده است — با تایید یا رد، تعیین تکلیفش کنید.
        </div>
      )}

      {/* Tags */}
      {record.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {record.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="text-xs font-medium text-text-2 bg-surface-2 border border-border-default rounded-full px-2.5 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <CandidateActions
        record={record}
        context={context}
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

      {record.bankSuggested && !record.inBank && (
        <div className="text-xs font-medium text-brand flex items-center gap-1.5 -mt-1 pt-1">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          هوشا نگهداری این رزومه در بانک را برای فرصت‌های آتی پیشنهاد می‌کند.
        </div>
      )}
    </div>
  );
};

export default CandidateCard;
