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
  Loader2,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { CATEGORY_META } from '../../lib/categories';
import { fileDownloadUrl, scopedHeaders } from '../../lib/api';
import { toPersianDigits } from '../../lib/normalizeFa';
import { CandidateAvatar } from '../common/CandidateAvatar';

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
  <div className="flex items-start gap-2.5 p-3 rounded-control bg-surface-2/60 border border-border-default">
    <span className="text-brand shrink-0 mt-0.5">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="text-xs text-text-3 font-medium">{label}</div>
      <div className="text-xs font-bold text-text-1 truncate mt-0.5">{value}</div>
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
  const [downloading, setDownloading] = React.useState(false);

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

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!record || !record.filePath || downloading) return;
    setDownloading(true);
    try {
      const url = fileDownloadUrl(record.id);
      const res = await fetch(url, {
        headers: scopedHeaders(),
      });
      if (!res.ok) {
        throw new Error('خطا در دریافت فایل');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = record.fileName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.warn('Blob download failed, using direct navigation:', err);
      window.location.href = fileDownloadUrl(record.id);
    } finally {
      setDownloading(false);
    }
  };

  if (!record) return null;
  const rec = record.recommendation;
  const meta = rec ? CATEGORY_META[rec] : null;

  const categoryTone =
    rec === 'INTERVIEW'
      ? 'bg-brand-soft text-brand-700 border-brand-200'
      : rec === 'REVIEW'
      ? 'bg-warning-soft text-warning border-[var(--warning-border)]'
      : rec === 'REJECT'
      ? 'bg-danger-soft text-danger border-[var(--danger-border)]'
      : 'bg-surface-2 text-text-2 border-border-default';

  const confLabel =
    record.confidence === 'high' ? 'اطمینان قوی' : record.confidence === 'medium' ? 'اطمینان متوسط' : 'اطمینان ضعیف';
  const confColor =
    record.confidence === 'high'
      ? 'text-brand-700 bg-brand-soft border-brand-200'
      : record.confidence === 'medium'
      ? 'text-warning bg-warning-soft border-[var(--warning-border)]'
      : 'text-danger bg-danger-soft border-[var(--danger-border)]';

  const actionBtn =
    'flex-1 min-h-[44px] sm:min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-control border text-xs font-medium cursor-pointer transition-all px-2 sm:px-2.5 py-2 sm:py-1.5 shadow-xs';

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 backdrop-blur-[2px]" onClick={onClose} dir="rtl">
      <aside
        className="absolute top-0 bottom-0 right-0 w-full sm:w-[520px] bg-surface-0 shadow-2xl flex flex-col animate-fadeIn pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-surface-1 border-b border-border-default flex flex-col gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <CandidateAvatar
              name={record.candidateName}
              category={record.category}
              size="lg"
            />
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
                {record.confidence && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${confColor}`}>
                    {confLabel}
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
            </div>
            {meta && (
              <div className={`flex flex-col items-center px-3.5 py-1.5 rounded-control border shrink-0 ${meta.scoreBox}`}>
                <span className="text-xl font-bold leading-none tabular-nums">{toPersianDigits(record.score)}</span>
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

          {/* Top Quick Actions */}
          <div className="grid grid-cols-2 sm:flex sm:items-stretch gap-1.5 pt-2 border-t border-border-default">
            <button
              type="button"
              onClick={() => onMessage(record)}
              className={`${actionBtn} bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-text-2" />
              ارسال پیام
            </button>
            <button
              type="button"
              onClick={() => onRerun(record)}
              className={`${actionBtn} bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-2" />
              بررسی مجدد
            </button>
            {context === 'results' ? (
              <button
                type="button"
                onClick={() => onBank(record)}
                className={`${actionBtn} ${
                  record.inBank
                    ? 'bg-brand-soft border-brand/30 text-brand-700'
                    : 'bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand'
                }`}
                title={record.inBank ? 'مشاهده و جابه‌جایی در بانک رزومه' : 'افزودن به بانک رزومه'}
              >
                {record.inBank ? <BookmarkCheck className="w-3.5 h-3.5 text-brand" /> : <BookmarkPlus className="w-3.5 h-3.5 text-text-2" />}
                {record.inBank ? 'در بانک ✓' : 'افزودن به بانک'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRemoveBank(record)}
                className={`${actionBtn} bg-surface-1 border-border-default text-warning hover:border-[var(--warning-border)] hover:bg-warning-soft`}
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-warning" />
                خروج از بانک
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(record)}
              className={`${actionBtn} bg-surface-1 border-border-default text-danger hover:border-[var(--danger-border)] hover:bg-danger-soft`}
            >
              <Trash2 className="w-3.5 h-3.5 text-danger" />
              حذف
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4">
          {/* Why */}
          <div className="rounded-card border border-brand/20 bg-brand-soft/50 p-4 flex gap-3 shadow-xs">
            <Bot className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-brand mb-1">چرا این دسته؟</div>
              <p className="text-xs text-text-1 leading-relaxed font-bold mb-1.5">{record.whyCategory}</p>
              <p className="text-xs text-text-2 leading-relaxed">{record.summary}</p>
            </div>
          </div>

          {/* Criterion bars */}
          {record.criterionScores.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-bold text-text-1">امتیاز تفصیلی معیارها</h3>
              {record.criterionScores.map((cs) => (
                <div key={cs.criterionId} className="bg-surface-1 border border-border-default rounded-control p-3 flex flex-col gap-2 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text-1">{cs.title}</span>
                    <span className="text-xs font-bold text-brand">{toPersianDigits(cs.score)} از ۱۰۰</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cs.score >= 65 ? 'bg-brand' : cs.score >= 40 ? 'bg-warning' : 'bg-danger'}`}
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
                <div key={i} className="rounded-control bg-brand-soft/60 border border-brand-200 p-3 flex flex-col gap-1.5 shadow-xs">
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
                      isKnockout ? 'bg-danger-soft/50 border-[var(--danger-border)]' : 'bg-warning-soft/40 border-[var(--warning-border)]'
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
                value={record.facts?.yearsExperience != null ? `${toPersianDigits(record.facts.yearsExperience)} سال` : 'در رزومه ذکر نشده'}
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
                  <span key={s} className="text-xs font-medium bg-surface-2 border border-border-default rounded-full px-2.5 py-0.5">
                    {s}
                  </span>
                ))}
              </div>
            ) : null}
            {record.filePath && (
              <button
                type="button"
                id="btn-download-candidate-resume"
                onClick={handleDownload}
                disabled={downloading}
                className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline pt-1 cursor-pointer disabled:opacity-50"
              >
                {downloading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-brand" />
                ) : (
                  <FileDown className="w-4 h-4 text-brand" />
                )}
                <span>{downloading ? 'در حال دریافت فایل...' : 'دانلود فایل اصلی رزومه'}</span>
              </button>
            )}
          </section>

          {/* Bank info */}
          {record.inBank && (
            <section className="rounded-card border border-brand-200 bg-brand-soft/50 p-3.5 flex flex-col gap-2 shadow-xs">
              <div className="text-xs font-bold text-brand-700 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-brand" /> در بانک رزومه — افزوده در {record.addedToBankAtJalali}
              </div>
              {record.bankNote && <p className="text-xs text-text-2 leading-relaxed">یادداشت: {record.bankNote}</p>}
              {record.bankTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {record.bankTags.map((t) => (
                    <span key={t} className="text-xs font-medium bg-surface-1 border border-brand-200 text-brand rounded-full px-2.5 py-0.5">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )}

          {record.bankSuggested && !record.inBank && (
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
                {record.analysisHistory.map((h, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-text-3 bg-surface-1 border border-border-default rounded-control px-3 py-2">
                    <span>
                      {h.reason === 'rerun' ? 'بررسی مجدد' : 'تحلیل اولیه'} — {h.atJalali}
                      {h.engine === 'local' && ' (موتور محلی)'}
                    </span>
                    <span className="font-bold text-text-1">{toPersianDigits(h.score)} از ۱۰۰</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border-default bg-surface-1 grid grid-cols-2 sm:flex sm:items-stretch gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onMessage(record)}
            className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-text-2" />
            ارسال پیام
          </button>
          <button
            type="button"
            onClick={() => onRerun(record)}
            className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-2" />
            بررسی مجدد
          </button>
          {context === 'results' ? (
            <button
              type="button"
              onClick={() => (record.inBank ? onRemoveBank(record) : onBank(record))}
              className={`${actionBtn} flex-1 ${
                record.inBank
                  ? 'bg-brand-soft border-brand/30 text-brand-700'
                  : 'bg-surface-1 border-border-default text-text-1 hover:border-brand/40 hover:bg-brand-soft/30 hover:text-brand'
              }`}
            >
              {record.inBank ? <BookmarkCheck className="w-3.5 h-3.5 text-brand" /> : <BookmarkPlus className="w-3.5 h-3.5 text-text-2" />}
              {record.inBank ? 'در بانک ✓' : 'افزودن به بانک'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRemoveBank(record)}
              className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-warning hover:border-[var(--warning-border)] hover:bg-warning-soft`}
            >
              <BookmarkCheck className="w-3.5 h-3.5 text-warning" />
              خروج از بانک
            </button>
          )}
          <button
            type="button"
            onClick={() => onDelete(record)}
            className={`${actionBtn} flex-1 bg-surface-1 border-border-default text-danger hover:border-[var(--danger-border)] hover:bg-danger-soft`}
          >
            <Trash2 className="w-3.5 h-3.5 text-danger" />
            حذف
          </button>
        </div>
      </aside>
    </div>
  );
};
