import React, { useEffect } from 'react';
import {
  X,
  Bot,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  FileDown,
  Phone,
  Mail,
  MapPin,
  GraduationCap,
  Briefcase,
  Clock3,
  Banknote,
  History,
  Sparkles,
  MessageCircle,
  RefreshCw,
  BookmarkPlus,
  Trash2,
  BookmarkCheck,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { CATEGORY_META } from '../../lib/categories';
import { fileDownloadUrl } from '../../lib/api';
import { toPersianDigits } from '../../lib/normalizeFa';

interface CandidateDrawerProps {
  record: ResumeRecord | null;
  context: 'results' | 'bank';
  onClose: () => void;
  onMessage: (r: ResumeRecord) => void;
  onRerun: (r: ResumeRecord) => void;
  onBank: (r: ResumeRecord) => void;
  onRemoveBank: (r: ResumeRecord) => void;
  onDelete: (r: ResumeRecord) => void;
}

const Fact: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-2/60 border border-border-default/70">
    <span className="text-brand shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0">
      <div className="text-[10px] text-text-3 font-bold">{label}</div>
      <div className="text-[11px] font-black text-text-1 truncate">{value}</div>
    </div>
  </div>
);

export const CandidateDrawer: React.FC<CandidateDrawerProps> = ({
  record,
  context,
  onClose,
  onMessage,
  onRerun,
  onBank,
  onRemoveBank,
  onDelete,
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
  const meta = record.recommendation ? CATEGORY_META[record.recommendation] : null;
  const confLabel =
    record.confidence === 'high' ? 'اطمینان بالا' : record.confidence === 'medium' ? 'اطمینان متوسط' : 'اطمینان پایین';
  const confColor =
    record.confidence === 'high'
      ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
      : record.confidence === 'medium'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : 'text-rose-700 bg-rose-50 border-rose-200';

  const actionBtn =
    'flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-xl border text-[11px] font-black cursor-pointer transition-all';

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]" onClick={onClose} dir="rtl">
      <aside
        className="absolute top-0 bottom-0 right-0 w-full sm:w-[520px] bg-surface-0 shadow-2xl flex flex-col animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-surface-1 border-b border-border-default flex items-start gap-3 shrink-0">
          <span className="w-11 h-11 rounded-full bg-brand-soft text-brand font-black flex items-center justify-center shrink-0">
            {(record.candidateName?.trim()[0] || '؟') + (record.candidateName?.trim().split(/\s+/)[1]?.[0] || '')}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-text-1 truncate">
              {record.candidateName || 'کاندید بدون نام'}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {meta && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${meta.badge}`}>
                  {meta.emoji} {meta.label}
                </span>
              )}
              {record.confidence && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${confColor}`}>
                  {confLabel}
                </span>
              )}
              {record.rankInCategory != null && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-surface-2 text-text-2 border border-border-default">
                  رتبه {toPersianDigits(record.rankInCategory)} در دسته
                </span>
              )}
              {record.engine === 'local' && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600">
                  تحلیل محلی (غیر هوشمند)
                </span>
              )}
            </div>
          </div>
          {meta && (
            <div className={`flex flex-col items-center px-3 py-1 rounded-xl border shrink-0 ${meta.scoreBox}`}>
              <span className="text-xl font-black font-mono leading-none">{toPersianDigits(record.score)}</span>
              <span className="text-[9px] mt-0.5">از ۱۰۰</span>
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:bg-surface-2 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Why */}
          <div className="rounded-2xl border border-brand/25 bg-brand-soft/50 p-3.5 flex gap-2.5">
            <Bot className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-black text-brand mb-1">چرا این دسته؟</div>
              <p className="text-xs text-text-1 leading-relaxed font-bold mb-1">{record.whyCategory}</p>
              <p className="text-[11px] text-text-2 leading-relaxed">{record.summary}</p>
            </div>
          </div>

          {/* Criterion bars */}
          {record.criterionScores.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-black text-text-1">امتیاز تفصیلی معیارها</h3>
              {record.criterionScores.map((cs) => (
                <div key={cs.criterionId} className="bg-surface-1 border border-border-default rounded-xl p-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-text-1">{cs.title}</span>
                    <span className="text-[11px] font-black font-mono text-brand">{toPersianDigits(cs.score)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cs.score >= 60 ? 'bg-emerald-500' : cs.score >= 35 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${cs.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-text-2 leading-relaxed">{cs.rationale}</p>
                  {cs.evidence && (
                    <p className="text-[10px] text-text-3 italic bg-surface-2/60 rounded-lg p-1.5 leading-relaxed">
                      «{cs.evidence}»
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Knockout misses */}
          {record.knockoutMisses.length > 0 && (
            <div className="rounded-2xl border border-danger/30 bg-danger-soft p-3 flex gap-2.5">
              <ShieldAlert className="w-5 h-5 text-danger shrink-0 mt-0.5" />
              <div>
                <div className="text-[11px] font-black text-danger mb-1">شرط‌های اصلی احراز نشده</div>
                <ul className="text-[11px] text-text-2 leading-relaxed list-disc pr-4 flex flex-col gap-0.5">
                  {record.knockoutMisses.map((k, i) => (
                    <li key={i}>{k}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Strengths / weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-black text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> نقاط قوت
              </h3>
              {record.strengths.length === 0 && <p className="text-[10px] text-text-3 italic">مورد شاخصی نیست</p>}
              {record.strengths.map((s, i) => (
                <div key={i} className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5 flex flex-col gap-1">
                  <span className="text-[11px] font-black text-text-1">• {s.point}</span>
                  <span className="text-[10px] text-text-3 italic leading-relaxed">«{s.evidence}»</span>
                </div>
              ))}
            </section>
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-black text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> کمبودها و ریسک‌ها
              </h3>
              {record.weaknesses.length === 0 && <p className="text-[10px] text-text-3 italic">مورد شاخصی نیست</p>}
              {record.weaknesses.map((w, i) => (
                <div
                  key={i}
                  className={`rounded-xl border p-2.5 flex flex-col gap-1 ${
                    w.severity === 'knockout'
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-amber-50/70 border-amber-200'
                  }`}
                >
                  <span className="text-[11px] font-black text-text-1">• {w.point}</span>
                  <span className="text-[10px] text-text-3 italic leading-relaxed">«{w.evidence}»</span>
                </div>
              ))}
            </section>
          </div>

          {/* Facts */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-black text-text-1">اطلاعات استخراج‌شده</h3>
            <div className="grid grid-cols-2 gap-2">
              <Fact icon={<Phone className="w-4 h-4" />} label="تلفن" value={record.contact?.phone || 'ذکر نشده'} />
              <Fact icon={<Mail className="w-4 h-4" />} label="ایمیل" value={record.contact?.email || 'ذکر نشده'} />
              <Fact icon={<MapPin className="w-4 h-4" />} label="شهر" value={record.contact?.city || 'ذکر نشده'} />
              <Fact
                icon={<Clock3 className="w-4 h-4" />}
                label="سال سابقه"
                value={record.facts?.yearsExperience != null ? `${toPersianDigits(record.facts.yearsExperience)} سال` : 'ذکر نشده'}
              />
              <Fact
                icon={<GraduationCap className="w-4 h-4" />}
                label="تحصیلات"
                value={record.facts?.education || 'ذکر نشده'}
              />
              <Fact
                icon={<Briefcase className="w-4 h-4" />}
                label="آخرین سمت"
                value={record.facts?.lastRole || 'ذکر نشده'}
              />
              <Fact
                icon={<Banknote className="w-4 h-4" />}
                label="حقوق درخواستی"
                value={record.facts?.expectedSalary || 'ذکر نشده'}
              />
              <Fact icon={<FileDown className="w-4 h-4" />} label="فایل" value={record.fileName} />
            </div>
            {record.facts?.skills?.length ? (
              <div className="flex flex-wrap gap-1 pt-1">
                {record.facts.skills.map((s) => (
                  <span key={s} className="text-[10px] font-bold bg-surface-2 border border-border-default rounded-full px-2 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
            {record.filePath && (
              <a
                href={fileDownloadUrl(record.id)}
                className="self-start inline-flex items-center gap-1.5 text-[11px] font-black text-brand hover:underline"
              >
                <FileDown className="w-4 h-4" />
                دانلود فایل اصلی رزومه
              </a>
            )}
          </section>

          {/* Bank info */}
          {record.inBank && (
            <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 flex flex-col gap-1.5">
              <div className="text-[11px] font-black text-emerald-800 flex items-center gap-1">
                <BookmarkCheck className="w-4 h-4" /> در بانک رزومه — افزوده {record.addedToBankAtJalali}
              </div>
              {record.bankNote && <p className="text-[11px] text-text-2 leading-relaxed">یادداشت: {record.bankNote}</p>}
              {record.bankTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {record.bankTags.map((t) => (
                    <span key={t} className="text-[10px] font-bold bg-white border border-emerald-200 rounded-full px-2 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {record.bankSuggested && !record.inBank && (
            <div className="rounded-2xl border border-brand/30 bg-brand-soft p-3 flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-brand shrink-0" />
              <p className="text-[11px] font-bold text-text-2 flex-1">
                هوش مصنوعی نگهداری این رزومه در بانک را برای فرصت‌های آتی پیشنهاد می‌کند.
              </p>
            </div>
          )}

          {/* History */}
          {record.analysisHistory.length > 1 && (
            <section className="flex flex-col gap-1.5">
              <h3 className="text-[11px] font-black text-text-2 flex items-center gap-1">
                <History className="w-4 h-4" /> تاریخچه تحلیل
              </h3>
              <div className="flex flex-col gap-1">
                {record.analysisHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px] text-text-3 bg-surface-1 border border-border-default rounded-lg px-2.5 py-1.5">
                    <span>
                      {h.reason === 'rerun' ? 'بررسی مجدد' : 'تحلیل اولیه'} — {h.atJalali}
                      {h.engine === 'local' && ' (موتور محلی)'}
                    </span>
                    <span className="font-mono font-black text-text-2">{toPersianDigits(h.score)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 border-t border-border-default bg-surface-1 flex items-stretch gap-1.5 shrink-0">
          <button type="button" onClick={() => onMessage(record)} className={`${actionBtn} bg-info-soft/60 border-info/30 text-info`}>
            <MessageCircle className="w-3.5 h-3.5" /> پیام
          </button>
          <button type="button" onClick={() => onRerun(record)} className={`${actionBtn} bg-surface-2 border-border-default text-text-2`}>
            <RefreshCw className="w-3.5 h-3.5" /> بررسی مجدد
          </button>
          {context === 'results' ? (
            <button
              type="button"
              onClick={() => (record.inBank ? onRemoveBank(record) : onBank(record))}
              className={`${actionBtn} ${record.inBank ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-brand-soft border-brand/30 text-brand'}`}
            >
              {record.inBank ? <BookmarkCheck className="w-3.5 h-3.5" /> : <BookmarkPlus className="w-3.5 h-3.5" />}
              {record.inBank ? 'در بانک' : 'افزودن به بانک'}
            </button>
          ) : (
            <button type="button" onClick={() => onRemoveBank(record)} className={`${actionBtn} bg-surface-2 border-border-default text-amber-700`}>
              <BookmarkCheck className="w-3.5 h-3.5" /> خروج از بانک
            </button>
          )}
          <button type="button" onClick={() => onDelete(record)} className={`${actionBtn} bg-danger-soft/70 border-danger/30 text-danger`}>
            <Trash2 className="w-3.5 h-3.5" /> حذف
          </button>
        </div>
      </aside>
    </div>
  );
};
