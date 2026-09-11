import React from 'react';
import {
  MessageCircle,
  RefreshCw,
  BookmarkPlus,
  Trash2,
  Bot,
  CheckCheck,
  BookmarkCheck,
  MapPin,
  Briefcase,
  Clock3,
  Sparkles,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { CATEGORY_META } from '../../lib/categories';
import { toPersianDigits } from '../../lib/normalizeFa';

interface CandidateCardProps {
  record: ResumeRecord;
  rank?: number;
  rerunning?: boolean;
  context: 'results' | 'bank';
  onOpen: (r: ResumeRecord) => void;
  onMessage: (r: ResumeRecord) => void;
  onRerun: (r: ResumeRecord) => void;
  onBank: (r: ResumeRecord) => void;
  onRemoveBank: (r: ResumeRecord) => void;
  onDelete: (r: ResumeRecord) => void;
}

function initial(name: string | null): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || '؟') + (parts[1]?.[0] || '');
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  record,
  rank,
  rerunning,
  context,
  onOpen,
  onMessage,
  onRerun,
  onBank,
  onRemoveBank,
  onDelete,
}) => {
  const rec = record.recommendation;
  const meta = rec ? CATEGORY_META[rec] : null;
  const name = record.candidateName || 'کاندید بدون نام (روی کارت بزنید)';
  const years = record.facts?.yearsExperience;

  // Category-specific avatar & rank colors
  const categoryTone =
    rec === 'INTERVIEW'
      ? 'bg-brand-soft text-brand-700 border-brand-200'
      : rec === 'REVIEW'
      ? 'bg-warning-soft text-warning border-[var(--warning-border)]'
      : rec === 'REJECT'
      ? 'bg-danger-soft text-danger border-[var(--danger-border)]'
      : 'bg-surface-2 text-text-2 border-border-default';

  const actionBtn =
    'min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-control border text-xs font-medium cursor-pointer transition-all disabled:opacity-60 disabled:cursor-wait px-2.5 py-1.5 shadow-xs';

  return (
    <div
      className={`w-full bg-surface-1 rounded-card border border-border-default p-4 sm:p-5 flex flex-col gap-3 shadow-xs ${
        meta ? meta.ring : ''
      } transition-all`}
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
          <span
            className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border ${categoryTone}`}
          >
            {initial(record.candidateName)}
          </span>
          <div className="min-w-0 flex flex-col gap-1">
            <span className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-text-1 truncate">{name}</h3>
              {meta && (
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${meta.badge}`}>
                  {meta.label}
                </span>
              )}
              {record.engine === 'local' && (
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-2 text-text-3 border border-border-default"
                  title="این تحلیل با موتور محلی انجام شده است"
                >
                  تحلیل محلی
                </span>
              )}
              {record.messageStatus === 'sent' && (
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 bg-brand-soft border border-brand-200 px-2 py-0.5 rounded-full"
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
            </span>
          </div>
        </button>

        {/* Score */}
        {meta && record.score > 0 && (
          <div className={`flex flex-col items-center justify-center px-3.5 py-1.5 rounded-control border shrink-0 ${meta.scoreBox}`}>
            <span className="text-2xl font-bold leading-none">{toPersianDigits(record.score)}</span>
            <span className="text-[10px] font-medium opacity-80 mt-1">از ۱۰۰</span>
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

      {/* Actions (4 shortcut buttons) */}
      <div className="grid grid-cols-2 sm:flex sm:items-stretch gap-2 pt-2 border-t border-border-default">
        <button
          type="button"
          onClick={() => onMessage(record)}
          className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
          title="ارسال پیام"
        >
          <MessageCircle className="w-3.5 h-3.5 text-text-2" />
          ارسال پیام
        </button>
        <button
          type="button"
          onClick={() => onRerun(record)}
          disabled={rerunning}
          className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
          title="بررسی مجدد با هوش مصنوعی"
        >
          {rerunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand" /> : <RefreshCw className="w-3.5 h-3.5 text-text-2" />}
          بررسی مجدد
        </button>
        {context === 'results' ? (
          <button
            type="button"
            onClick={() => onBank(record)}
            className={`${actionBtn} flex-1 ${
              record.inBank
                ? 'bg-brand-soft border-brand/30 text-brand-700'
                : 'bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand'
            }`}
            title={record.inBank ? 'مشاهده و جابه‌جایی در بانک رزومه' : 'افزودن به بانک رزومه'}
          >
            {record.inBank ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5 text-brand" />
                در بانک ✓
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5 text-text-2" />
                افزودن به بانک
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRemoveBank(record)}
            className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-warning hover:border-[var(--warning-border)] hover:bg-warning-soft`}
            title="خروج از بانک رزومه"
          >
            <BookmarkCheck className="w-3.5 h-3.5 text-warning" />
            خروج از بانک
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(record)}
          className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-danger hover:border-[var(--danger-border)] hover:bg-danger-soft`}
          title="حذف رزومه"
        >
          <Trash2 className="w-3.5 h-3.5 text-danger" />
          حذف
        </button>
      </div>

      {record.bankSuggested && !record.inBank && (
        <div className="text-xs font-medium text-brand flex items-center gap-1.5 -mt-1 pt-1">
          <Sparkles className="w-3.5 h-3.5 text-brand" />
          هوش مصنوعی نگهداری این رزومه در بانک را برای فرصت‌های آتی پیشنهاد می‌کند.
        </div>
      )}
    </div>
  );
};
