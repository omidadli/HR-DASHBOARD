import React from 'react';
import {
  AlertTriangle,
  Banknote,
  BookmarkCheck,
  BookmarkPlus,
  Bot,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileDown,
  FileQuestion,
  GraduationCap,
  History,
  ListChecks,
  Mail,
  MapPin,
  MessageSquareQuote,
  Phone,
  ScanSearch,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { toPersianDigits } from '../../lib/normalizeFa';
import { DECISION_META, decisionOf, isPendingHumanDecision } from '../../lib/decisions';

interface AnalysisPanelProps {
  record: ResumeRecord;
  /** CTA used by the «هوشا پیشنهاد نگهداری در بانک دارد» card. */
  onBank?: (r: ResumeRecord) => void;
  /** Extra sections rendered at the very end of the analysis. */
  children?: React.ReactNode;
}

const Fact: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-2.5 p-3 rounded-control bg-surface-2/60 border border-border-default">
    <span className="text-brand shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="text-xs text-text-3 font-medium">{label}</div>
      <div className="text-xs font-bold text-text-1 truncate mt-0.5">{value}</div>
    </div>
  </div>
);

/**
 * هوشا's full analysis of one resume.
 *
 * Extracted from the candidate drawer so the drawer and the new
 * «مشاهده تحلیل و رزومه» page render exactly the same analysis — one source of
 * truth for evidence, scores and the deep-review findings.
 */
export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ record, onBank, children }) => {
  const decision = decisionOf(record);
  const pending = isPendingHumanDecision(record);
  const deep = record.deepFindings;

  return (
    <div className="flex flex-col gap-4">
      {/* Human decision */}
      {(decision !== 'none' || pending) && (
        <div
          className={`rounded-card border p-3.5 flex items-start gap-2.5 shadow-xs ${
            decision === 'none'
              ? 'bg-warning-soft/50 border-[var(--warning-border)]'
              : decision === 'approved'
              ? 'bg-brand-soft/60 border-brand-200'
              : decision === 'rejected'
              ? 'bg-danger-soft/60 border-[var(--danger-border)]'
              : 'bg-warning-soft/60 border-[var(--warning-border)]'
          }`}
        >
          <span
            className={`w-8 h-8 rounded-control flex items-center justify-center shrink-0 border ${
              decision === 'approved'
                ? 'bg-brand-soft text-brand border-brand-200'
                : decision === 'rejected'
                ? 'bg-danger-soft text-danger border-[var(--danger-border)]'
                : 'bg-warning-soft text-warning border-[var(--warning-border)]'
            }`}
          >
            {decision === 'approved' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : decision === 'rejected' ? (
              <XCircle className="w-4 h-4" />
            ) : (
              <ClipboardCheck className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-text-1">
              {decision === 'none'
                ? 'در انتظار تصمیم شما'
                : `${DECISION_META[decision].label}${record.decidedAtJalali ? ` — ${record.decidedAtJalali}` : ''}`}
            </div>
            <p className="text-xs text-text-2 leading-relaxed mt-0.5">
              {record.decisionNote
                ? `دلیل ثبت‌شده: ${record.decisionNote}`
                : decision === 'none'
                ? 'هوشا این رزومه را «بررسی شود» داده است؛ تایید یا رد کردن آن را در بخش «تایید/رد شده» مشخص کنید.'
                : DECISION_META[decision].hint}
            </p>
          </div>
        </div>
      )}

      {/* Deep review stamp */}
      {record.deepAnalysisAtJalali && (
        <div className="rounded-card border border-brand/25 bg-brand-soft/60 p-3 flex items-center gap-2.5 shadow-xs">
          <ScanSearch className="w-4 h-4 text-brand shrink-0" />
          <p className="text-xs font-medium text-text-2 leading-relaxed">
            این رزومه در <span className="font-bold text-brand-700">{record.deepAnalysisAtJalali}</span> با
            «بازبینی دقیق» مجدداً توسط هوشا خوانده شده است.
          </p>
        </div>
      )}

      {/* Why */}
      <div className="rounded-card border border-brand/20 bg-brand-soft/50 p-4 flex gap-3 shadow-xs">
        <Bot className="w-5 h-5 text-brand shrink-0 mt-0.5" />
        <div>
          <div className="text-xs font-bold text-brand mb-1">چرا این دسته؟</div>
          <p className="text-xs text-text-1 leading-relaxed font-bold mb-1.5">{record.whyCategory}</p>
          <p className="text-xs text-text-2 leading-relaxed">{record.summary}</p>
        </div>
      </div>

      {/* Deep findings */}
      {deep && (deep.focusPoints.length > 0 || deep.interviewQuestions.length > 0 || deep.risks.length > 0) && (
        <section className="rounded-card border border-brand-200 bg-surface-1 overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-brand-soft/70 border-b border-brand-200 flex items-center gap-2">
            <ScanSearch className="w-4 h-4 text-brand" />
            <h3 className="text-xs font-bold text-brand-700">یافته‌های بازبینی دقیق</h3>
          </div>
          <div className="p-3.5 flex flex-col gap-3.5">
            {deep.focusPoints.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-text-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-brand" /> نکته‌های کلیدی
                </span>
                <ul className="flex flex-col gap-1.5 pr-1">
                  {deep.focusPoints.map((p, i) => (
                    <li key={i} className="text-xs text-text-2 leading-relaxed flex gap-2">
                      <span className="text-brand shrink-0">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {deep.interviewQuestions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-text-1 flex items-center gap-1.5">
                  <MessageSquareQuote className="w-3.5 h-3.5 text-brand" /> سوال‌های پیشنهادی برای مصاحبه
                </span>
                <ul className="flex flex-col gap-1.5 pr-1">
                  {deep.interviewQuestions.map((q, i) => (
                    <li
                      key={i}
                      className="text-xs text-text-2 leading-relaxed bg-surface-2/60 border border-border-default rounded-control px-3 py-2"
                    >
                      <span className="font-bold text-brand-700">{toPersianDigits(i + 1)}. </span>
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {deep.risks.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-danger flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-danger" /> ریسک‌ها و تناقض‌ها
                </span>
                <ul className="flex flex-col gap-1.5 pr-1">
                  {deep.risks.map((r, i) => (
                    <li
                      key={i}
                      className="text-xs text-text-2 leading-relaxed bg-danger-soft/50 border border-[var(--danger-border)] rounded-control px-3 py-2"
                    >
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Criterion bars */}
      {record.criterionScores.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text-1 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-text-3" /> امتیاز تفصیلی معیارها
          </h3>
          {record.criterionScores.map((cs) => (
            <div
              key={cs.criterionId}
              className="bg-surface-1 border border-border-default rounded-control p-3 flex flex-col gap-2 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-text-1">{cs.title}</span>
                <span className="text-xs font-bold text-brand tabular-nums">
                  {toPersianDigits(cs.score)} از ۱۰۰
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    cs.score >= 65 ? 'bg-brand' : cs.score >= 40 ? 'bg-warning' : 'bg-danger'
                  }`}
                  style={{ width: `${cs.score}%` }}
                />
              </div>
              <p className="text-xs text-text-2 leading-relaxed">{cs.rationale}</p>
              {cs.evidence && (
                <p className="text-xs text-text-3 italic bg-surface-2/60 rounded-control p-2 leading-relaxed border border-border-default/60">
                  «{cs.evidence}»
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Knockout misses */}
      {record.knockoutMisses.length > 0 && (
        <div className="rounded-card border border-[var(--danger-border)] bg-danger-soft p-4 flex gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div>
            <div className="text-xs font-bold text-danger mb-1.5">شرط‌های اصلی احراز نشده</div>
            <ul className="text-xs text-text-2 leading-relaxed list-disc pr-4 flex flex-col gap-1">
              {record.knockoutMisses.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Strengths / weaknesses */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-brand flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-brand" /> نقاط قوت
          </h3>
          {record.strengths.length === 0 && <p className="text-xs text-text-3 italic">مورد شاخصی ذکر نشده</p>}
          {record.strengths.map((s, i) => (
            <div
              key={i}
              className="rounded-control bg-brand-soft/60 border border-brand-200 p-3 flex flex-col gap-1.5 shadow-xs"
            >
              <span className="text-xs font-bold text-text-1">• {s.point}</span>
              {s.evidence && <span className="text-xs text-text-3 italic leading-relaxed">«{s.evidence}»</span>}
            </div>
          ))}
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-warning flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-warning" /> کمبودها و ریسک‌ها
          </h3>
          {record.weaknesses.length === 0 && <p className="text-xs text-text-3 italic">مورد شاخصی ذکر نشده</p>}
          {record.weaknesses.map((w, i) => {
            const isKnockout = w.severity === 'knockout';
            const sevLabel = isKnockout ? 'حذفی' : w.severity === 'major' ? 'مهم' : 'جزئی';
            const sevBg = isKnockout
              ? 'bg-danger-soft border-[var(--danger-border)] text-danger'
              : 'bg-warning-soft border-[var(--warning-border)] text-warning';
            return (
              <div
                key={i}
                className={`rounded-control border p-3 flex flex-col gap-1.5 shadow-xs ${
                  isKnockout
                    ? 'bg-danger-soft/50 border-[var(--danger-border)]'
                    : 'bg-warning-soft/40 border-[var(--warning-border)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-text-1">• {w.point}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full border ${sevBg}`}>
                    {sevLabel}
                  </span>
                </div>
                {w.evidence && <span className="text-xs text-text-3 italic leading-relaxed">«{w.evidence}»</span>}
              </div>
            );
          })}
        </section>
      </div>

      {/* Facts */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold text-text-1">اطلاعات استخراج‌شده</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Fact icon={<Phone className="w-4 h-4" />} label="تلفن" value={record.contact?.phone || 'در رزومه ذکر نشده'} />
          <Fact icon={<Mail className="w-4 h-4" />} label="ایمیل" value={record.contact?.email || 'در رزومه ذکر نشده'} />
          <Fact icon={<MapPin className="w-4 h-4" />} label="شهر" value={record.contact?.city || 'در رزومه ذکر نشده'} />
          <Fact
            icon={<Clock3 className="w-4 h-4" />}
            label="سال سابقه"
            value={
              record.facts?.yearsExperience != null
                ? `${toPersianDigits(record.facts.yearsExperience)} سال`
                : 'در رزومه ذکر نشده'
            }
          />
          <Fact
            icon={<GraduationCap className="w-4 h-4" />}
            label="تحصیلات"
            value={record.facts?.education || 'در رزومه ذکر نشده'}
          />
          <Fact
            icon={<Briefcase className="w-4 h-4" />}
            label="آخرین سمت"
            value={record.facts?.lastRole || 'در رزومه ذکر نشده'}
          />
          <Fact
            icon={<Banknote className="w-4 h-4" />}
            label="حقوق درخواستی"
            value={record.facts?.expectedSalary || 'در رزومه ذکر نشده'}
          />
          <Fact icon={<FileDown className="w-4 h-4" />} label="فایل" value={record.fileName} />
        </div>
        {record.facts?.skills?.length ? (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {record.facts.skills.map((s) => (
              <span
                key={s}
                className="text-xs font-medium bg-surface-2 border border-border-default rounded-full px-2.5 py-0.5"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      {/* Bank info */}
      {record.inBank && (
        <section className="rounded-card border border-brand-200 bg-brand-soft/50 p-3.5 flex flex-col gap-2 shadow-xs">
          <div className="text-xs font-bold text-brand-700 flex items-center gap-1.5">
            <BookmarkCheck className="w-4 h-4 text-brand" /> در بانک رزومه — افزوده در{' '}
            {record.addedToBankAtJalali}
          </div>
          {record.bankNote && <p className="text-xs text-text-2 leading-relaxed">یادداشت: {record.bankNote}</p>}
          {record.bankTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {record.bankTags.map((t) => (
                <span
                  key={t}
                  className="text-xs font-medium bg-surface-1 border border-brand-200 text-brand rounded-full px-2.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {record.bankSuggested && !record.inBank && onBank && (
        <div className="rounded-card border border-brand/20 bg-brand-soft/60 p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5 flex-1">
            <Sparkles className="w-4 h-4 text-brand shrink-0" />
            <p className="text-xs font-medium text-text-2">
              هوشا نگهداری این رزومه در بانک را برای فرصت‌های آتی پیشنهاد می‌کند.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onBank(record)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover shrink-0 shadow-xs"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            افزودن
          </button>
        </div>
      )}

      {/* History */}
      {record.analysisHistory.length > 1 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-text-2 flex items-center gap-1.5">
            <History className="w-4 h-4" /> تاریخچه تحلیل
          </h3>
          <div className="flex flex-col gap-1.5">
            {[...record.analysisHistory].reverse().map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 text-xs text-text-3 bg-surface-1 border border-border-default rounded-control px-3 py-2"
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  {h.reason === 'deep' ? (
                    <ScanSearch className="w-3.5 h-3.5 text-brand shrink-0" />
                  ) : h.reason === 'rerun' ? (
                    <History className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Bot className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {h.reason === 'deep' ? 'بازبینی دقیق' : h.reason === 'rerun' ? 'بررسی مجدد' : 'تحلیل اولیه'} —{' '}
                    {h.atJalali}
                    {h.engine === 'local' && ' (موتور محلی)'}
                  </span>
                </span>
                <span className="font-bold text-text-1 tabular-nums shrink-0">
                  {toPersianDigits(h.score)} از ۱۰۰
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {children}
    </div>
  );
};

/** Shown when a resume has no readable analysis at all (unjudgeable / error). */
export const EmptyAnalysisNotice: React.FC<{ record: ResumeRecord }> = ({ record }) => (
  <div className="rounded-card border border-dashed border-border-default bg-surface-1 p-5 flex flex-col items-center gap-2 text-center">
    <FileQuestion className="w-8 h-8 text-text-3 opacity-60" />
    <p className="text-xs font-bold text-text-2">تحلیل هوشا برای این رزومه ثبت نشده است</p>
    <p className="text-xs text-text-3 leading-relaxed max-w-sm">
      {record.unjudgeableReason || record.errorMessage || 'فایل رزومه محتوای قابل خواندنی نداشت.'}
    </p>
  </div>
);

export default AnalysisPanel;
