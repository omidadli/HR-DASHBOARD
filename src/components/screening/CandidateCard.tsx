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
  const name = record.candidateName || 'کاندید بدون نام (روی کارت بزن)';
  const years = record.facts?.yearsExperience;

  const actionBtn =
    'flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border text-[11px] font-black cursor-pointer transition-all disabled:opacity-60 disabled:cursor-wait';

  return (
    <div
      className={`w-full bg-surface-1 rounded-2xl border border-border-default p-4 flex flex-col gap-3 shadow-xs ${
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
            <span className="w-8 h-8 rounded-xl bg-surface-2 border border-border-default text-text-2 text-sm font-black flex items-center justify-center shrink-0 font-mono">
              {toPersianDigits(rank)}
            </span>
          )}
          <span className="w-10 h-10 rounded-full bg-brand-soft text-brand font-black flex items-center justify-center text-sm shrink-0">
            {initial(record.candidateName)}
          </span>
          <div className="min-w-0 flex flex-col gap-1">
            <span className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-black text-text-1 truncate">{name}</h3>
              {meta && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${meta.badge}`}>
                  {meta.emoji} {meta.label}
                </span>
              )}
              {record.engine === 'local' && (
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600"
                  title="این تحلیل با موتور محلی و بدون هوش مصنوعی انجام شده"
                >
                  تحلیل محلی

                </span>
              )}
              {record.messageStatus === 'sent' && (
                <span title={`پیام داده‌شده ${record.lastMessagedAtJalali || ''}`}>
                  <CheckCheck className="w-4 h-4 text-info" />
                </span>
              )}
            </span>
            <span className="flex items-center gap-2 text-[10px] text-text-3 flex-wrap">
              {record.facts?.lastRole && (
                <span className="inline-flex items-center gap-0.5">
                  <Briefcase className="w-3 h-3" />
                  {record.facts.lastRole}
                </span>
              )}
              {years != null && (
                <span className="inline-flex items-center gap-0.5">
                  <Clock3 className="w-3 h-3" />
                  {toPersianDigits(years)} سال سابقه
                </span>
              )}
              {record.contact?.city && (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {record.contact.city}
                </span>
              )}
            </span>
          </div>
        </button>

        {/* Score */}
        {meta && record.score > 0 && (
          <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border shrink-0 ${meta.scoreBox}`}>
            <span className="text-2xl font-black font-mono leading-none">{toPersianDigits(record.score)}</span>
            <span className="text-[9px] font-bold opacity-80 mt-0.5">از ۱۰۰</span>
          </div>
        )}
      </div>

      {/* Why */}
      <button
        type="button"
        onClick={() => onOpen(record)}
        className="text-right bg-surface-2/60 border border-border-default/70 rounded-xl p-2.5 flex items-start gap-2 cursor-pointer hover:border-brand/30 transition-all"
      >
        <Bot className="w-4 h-4 text-brand shrink-0 mt-0.5" />
        <span className="text-[11px] sm:text-xs text-text-2 leading-relaxed line-clamp-2">
          {record.whyCategory || record.summary}
        </span>
      </button>

      {/* Tags */}
      {record.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {record.tags.slice(0, 4).map((t) => (
            <span
              key={t}
              className="text-[10px] font-bold text-text-2 bg-surface-2 border border-border-default rounded-full px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-stretch gap-1.5 pt-1 border-t border-border-default/70">
        <button
          type="button"
          onClick={() => onMessage(record)}
          className={`${actionBtn} bg-info-soft/60 border-info/30 text-info hover:bg-info-soft`}
          title="ارسال پیام"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          پیام
        </button>
        <button
          type="button"
          onClick={() => onRerun(record)}
          disabled={rerunning}
          className={`${actionBtn} bg-surface-2 border-border-default text-text-2 hover:border-brand/50 hover:text-brand`}
          title="بررسی مجدد با هوش مصنوعی"
        >
          {rerunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          بررسی مجدد
        </button>
        {context === 'results' ? (
          <button
            type="button"
            onClick={() => (record.inBank ? onRemoveBank(record) : onBank(record))}
            className={`${actionBtn} ${
              record.inBank
                ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                : 'bg-brand-soft border-brand/30 text-brand hover:bg-emerald-100'
            }`}
            title={record.inBank ? 'در بانک رزومه' : 'افزودن به بانک رزومه'}
          >
            {record.inBank ? (
              <>
                <BookmarkCheck className="w-3.5 h-3.5" />
                در بانک ✓
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                بانک رزومه
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRemoveBank(record)}
            className={`${actionBtn} bg-surface-2 border-border-default text-text-2 hover:border-amber-500/50 hover:text-amber-700`}
            title="خروج از بانک"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            خروج از بانک
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(record)}
          className={`${actionBtn} bg-danger-soft/70 border-danger/30 text-danger hover:bg-rose-100`}
          title="حذف رزومه"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف
        </button>
      </div>

      {record.bankSuggested && !record.inBank && (
        <div className="text-[10px] font-bold text-brand flex items-center gap-1 -mt-1">
          <Sparkles className="w-3 h-3" />
          هوش مصنوعی نگهداری در بانک رزومه را پیشنهاد می‌کند
        </div>
      )}
    </div>
  );
};
