import React from 'react';
import {
  BookmarkCheck,
  BookmarkPlus,
  Check,
  Eye,
  Loader2,
  MessageCircle,
  ScanSearch,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { decisionOf } from '../../lib/decisions';

export type CardContext = 'results' | 'bank' | 'decisions';

export interface CandidateActionHandlers {
  /** Quick peek (the side drawer) — used when the card body itself is clicked. */
  onOpen: (r: ResumeRecord) => void;
  /** «مشاهده تحلیل و رزومه» — the full page with the analysis + original file. */
  onOpenAnalysis: (r: ResumeRecord) => void;
  onMessage: (r: ResumeRecord) => void;
  /** «بازبینی» — deep, evidence-by-evidence re-analysis by the AI. */
  onRerun: (r: ResumeRecord) => void;
  onBank: (r: ResumeRecord) => void;
  onRemoveBank: (r: ResumeRecord) => void;
  onDelete: (r: ResumeRecord) => void;
  onApprove?: (r: ResumeRecord) => void;
  onReject?: (r: ResumeRecord) => void;
  onNeedsReview?: (r: ResumeRecord) => void;
  /** Back to «بدون تصمیم» (only meaningful inside the decisions workspace). */
  onClearDecision?: (r: ResumeRecord) => void;
}

interface CandidateActionsProps extends CandidateActionHandlers {
  record: ResumeRecord;
  context: CardContext;
  rerunning?: boolean;
  busy?: boolean;
  /** 'card' shows the full-width primary button; 'toolbar' keeps it compact. */
  variant?: 'card' | 'toolbar';
  /**
   * Hidden on surfaces that already ARE the analysis view (the full page and the
   * quick-peek drawer), where «مشاهده تحلیل و رزومه» would be a no-op.
   */
  showPrimary?: boolean;
}

const ICON_BTN =
  'relative w-11 h-11 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-control border bg-surface-1 cursor-pointer transition-all shrink-0 disabled:opacity-50 disabled:cursor-wait';

const SECONDARY_BTN =
  'min-h-[44px] sm:min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-control border text-xs font-bold cursor-pointer transition-all px-3 py-2 shadow-xs disabled:opacity-60 disabled:cursor-wait';

const PRIMARY_BTN =
  'w-full min-h-[46px] sm:min-h-[42px] inline-flex items-center justify-center gap-2 rounded-control text-xs sm:text-sm font-bold cursor-pointer transition-all px-3 py-2.5 shadow-xs disabled:opacity-60 disabled:cursor-wait';

interface IconAction {
  key: string;
  title: string;
  node: React.ReactNode;
  className: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
}

/**
 * The action row under every resume card (and in the analysis page toolbar).
 *
 * One component decides which buttons exist for each surface, so the results
 * list, the talent bank and the approved/rejected workspace never drift apart:
 *   results   → تحلیل و رزومه · پیام · بازبینی · ذخیره · تایید · رد · حذف
 *   bank      → تحلیل و رزومه · پیام · بازبینی · خروج از بانک · حذف
 *   decisions → depends on the decision itself (see below)
 */
export const CandidateActions: React.FC<CandidateActionsProps> = ({
  record,
  context,
  rerunning,
  busy,
  variant = 'card',
  showPrimary = true,
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
  const decision = decisionOf(record);
  const inBank = Boolean(record.inBank);

  const icons: IconAction[] = [];

  const pushRerun = () =>
    icons.push({
      key: 'rerun',
      title: 'بازبینی دقیق با هوشا',
      node: rerunning ? (
        <Loader2 className="w-4 h-4 animate-spin text-brand" />
      ) : (
        <ScanSearch className="w-4 h-4 text-text-2" />
      ),
      className: rerunning
        ? 'border-brand/40 bg-brand-soft'
        : 'border-border-default hover:border-brand/40 hover:bg-brand-soft/40 hover:text-brand',
      onClick: () => onRerun(record),
      disabled: rerunning || busy,
    });

  const pushBank = () =>
    icons.push({
      key: 'bank',
      title: inBank ? 'در بانک رزومه ذخیره شده — مشاهده/ویرایش' : 'ذخیره در بانک رزومه',
      node: inBank ? (
        <BookmarkCheck className="w-4 h-4 text-brand" />
      ) : (
        <BookmarkPlus className="w-4 h-4 text-text-2" />
      ),
      className: inBank
        ? 'border-brand/30 bg-brand-soft'
        : 'border-border-default hover:border-brand/40 hover:bg-brand-soft/40',
      onClick: () => (inBank && context === 'bank' ? onRemoveBank(record) : onBank(record)),
      active: inBank,
      disabled: busy,
    });

  const pushRemoveBank = () =>
    icons.push({
      key: 'remove-bank',
      title: 'خروج از بانک رزومه',
      node: <BookmarkCheck className="w-4 h-4 text-warning" />,
      className: 'border-border-default hover:border-[var(--warning-border)] hover:bg-warning-soft',
      onClick: () => onRemoveBank(record),
      disabled: busy,
    });

  const pushApprove = () =>
    onApprove &&
    icons.push({
      key: 'approve',
      title: decision === 'approved' ? 'تایید شده — کلیک برای بازگردانی' : 'تایید رزومه',
      node: <Check className={`w-4 h-4 ${decision === 'approved' ? 'text-white' : 'text-text-2'}`} />,
      className:
        decision === 'approved'
          ? 'bg-brand border-brand text-white'
          : 'border-border-default hover:border-brand hover:bg-brand-soft hover:text-brand',
      onClick: () => onApprove(record),
      active: decision === 'approved',
      disabled: busy,
    });

  const pushReject = () =>
    onReject &&
    icons.push({
      key: 'reject',
      title: decision === 'rejected' ? 'رد شده — کلیک برای بازگردانی' : 'رد رزومه',
      node: <X className={`w-4 h-4 ${decision === 'rejected' ? 'text-white' : 'text-text-2'}`} />,
      className:
        decision === 'rejected'
          ? 'bg-danger border-danger text-white'
          : 'border-border-default hover:border-[var(--danger-border)] hover:bg-danger-soft hover:text-danger',
      onClick: () => onReject(record),
      active: decision === 'rejected',
      disabled: busy,
    });

  const pushNeedsReview = () =>
    onNeedsReview &&
    icons.push({
      key: 'needs-review',
      title: decision === 'review' ? 'نیاز به بررسی — کلیک برای بازگردانی' : 'انتقال به «نیاز به بررسی»',
      node: (
        <Undo2
          className={`w-4 h-4 ${decision === 'review' ? 'text-white' : 'text-text-2'}`}
        />
      ),
      className:
        decision === 'review'
          ? 'bg-warning border-warning text-white'
          : 'border-border-default hover:border-[var(--warning-border)] hover:bg-warning-soft hover:text-warning',
      onClick: () => onNeedsReview(record),
      active: decision === 'review',
      disabled: busy,
    });

  const pushClear = () =>
    onClearDecision &&
    decision !== 'none' &&
    icons.push({
      key: 'clear',
      title: 'لغو تصمیم (بازگشت به وضعیت بدون تصمیم)',
      node: <Undo2 className="w-4 h-4 text-text-2" />,
      className: 'border-border-default hover:border-border-strong hover:bg-surface-2',
      onClick: () => onClearDecision(record),
      disabled: busy,
    });

  const pushDelete = () =>
    icons.push({
      key: 'delete',
      title: 'حذف رزومه',
      node: <Trash2 className="w-4 h-4 text-danger" />,
      className: 'border-border-default hover:border-[var(--danger-border)] hover:bg-danger-soft',
      onClick: () => onDelete(record),
      disabled: busy,
    });

  if (context === 'results') {
    pushRerun();
    pushBank();
    pushApprove();
    pushReject();
    pushDelete();
  } else if (context === 'bank') {
    pushRerun();
    pushRemoveBank();
    pushDelete();
  } else {
    // decisions workspace — the buttons follow the current decision
    if (decision === 'approved') {
      pushBank();
      pushNeedsReview();
      pushReject();
      pushDelete();
    } else if (decision === 'rejected') {
      pushRerun();
      pushBank();
      pushApprove();
      pushDelete();
    } else {
      pushRerun();
      pushBank();
      pushApprove();
      pushReject();
      pushDelete();
    }
    // «لغو تصمیم» only appears in the wide analysis-page toolbar; the cards keep
    // the tight set the user asked for.
    if (variant === 'toolbar' && decision !== 'none') pushClear();
  }

  const primary = (
    <button
      type="button"
      onClick={() => onOpenAnalysis(record)}
      className={`${PRIMARY_BTN} bg-brand text-white hover:bg-brand-hover ${
        variant === 'toolbar' ? 'w-auto sm:w-auto flex-1 sm:flex-none sm:min-w-[220px]' : ''
      }`}
      title="مشاهده تحلیل هوشا و پیش‌نمایش فایل اصلی رزومه"
    >
      <Eye className="w-4 h-4" />
      مشاهده تحلیل و رزومه
    </button>
  );

  const message = (
    <button
      type="button"
      onClick={() => onMessage(record)}
      className={`${SECONDARY_BTN} flex-1 bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
      title="ارسال پیام به کاندید"
    >
      <MessageCircle className="w-4 h-4 text-text-2" />
      ارسال پیام
      {record.messageStatus === 'sent' && (
        <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-brand" title="پیام داده شده" />
      )}
    </button>
  );

  const iconRow = (
    <div className="flex items-center gap-1.5 shrink-0">
      {icons.map((a) => (
        <button
          key={a.key}
          type="button"
          onClick={a.onClick}
          disabled={a.disabled}
          title={a.title}
          aria-label={a.title}
          className={`${ICON_BTN} ${a.className}`}
        >
          {a.node}
        </button>
      ))}
    </div>
  );

  if (variant === 'toolbar') {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {showPrimary ? primary : null}
        {message}
        {iconRow}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2.5 border-t border-border-default">
      {showPrimary ? primary : null}
      <div className="flex items-stretch gap-2 flex-wrap">
        {message}
        {iconRow}
      </div>
    </div>
  );
};

export default CandidateActions;
