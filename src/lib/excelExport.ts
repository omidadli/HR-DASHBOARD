import { ResumeRecord, ScreeningBatch } from '../types/screening';
import { toPersianDigits } from './normalizeFa';

const CAT_LABEL: Record<string, string> = {
  INTERVIEW: 'مصاحبه شود',
  REVIEW: 'بررسی شود',
  REJECT: 'رد شود',
  UNJUDGEABLE: 'غیرقابل ارزیابی',
  ERROR: 'خطا در تحلیل',
};

export async function exportBatchToExcel(batch: ScreeningBatch, records: ResumeRecord[]) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { مورد: 'دپارتمان', مقدار: batch.departmentName },
    { مورد: 'عنوان شغلی', مقدار: batch.roleTitle || '—' },
    { مورد: 'تاریخ غربالگری', مقدار: batch.createdAtJalali },
    { مورد: 'نگاه هوش مصنوعی به شغل', مقدار: batch.understanding.plainExplanation },
    { مورد: 'آستانه مصاحبه', مقدار: toPersianDigits(batch.understanding.thresholds.interview) },
    { مورد: 'آستانه بررسی', مقدار: toPersianDigits(batch.understanding.thresholds.review) },
    { مورد: 'کل رزومه‌ها', مقدار: toPersianDigits(batch.stats.total) },
    { مورد: 'مصاحبه شود', مقدار: toPersianDigits(batch.stats.interview) },
    { مورد: 'بررسی شود', مقدار: toPersianDigits(batch.stats.review) },
    { مورد: 'رد شود', مقدار: toPersianDigits(batch.stats.reject) },
    { مورد: 'غیرقابل ارزیابی', مقدار: toPersianDigits(batch.stats.unjudgeable) },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'خلاصه');

  const rows = records
    .filter((r) => !r.deleted)
    .sort((a, b) => {
      const order = { INTERVIEW: 0, REVIEW: 1, REJECT: 2, UNJUDGEABLE: 3, ERROR: 4 } as const;
      if (order[a.category] !== order[b.category]) return order[a.category] - order[b.category];
      return b.score - a.score;
    })
    .map((r) => ({
      'دسته': CAT_LABEL[r.category] || r.category,
      'رتبه در دسته': r.rankInCategory != null ? toPersianDigits(r.rankInCategory) : '—',
      'نام': r.candidateName || '—',
      'امتیاز': toPersianDigits(r.score),
      'آخرین سمت': r.facts?.lastRole || '—',
      'سال سابقه': r.facts?.yearsExperience != null ? toPersianDigits(r.facts.yearsExperience) : '—',
      'تحصیلات': r.facts?.education || '—',
      'شهر': r.contact?.city || '—',
      'تلفن': r.contact?.phone || '—',
      'ایمیل': r.contact?.email || '—',
      'برچسب‌ها': r.tags.join('، '),
      'خلاصه تحلیل': r.summary,
      'چرا این دسته': r.whyCategory,
      'نقاط قوت': r.strengths.map((s) => s.point).join('؛ '),
      'کمبودها': r.weaknesses.map((w) => w.point).join('؛ '),
      'در بانک رزومه': r.inBank ? 'بله' : 'خیر',
      'فایل': r.fileName,
      'موتور تحلیل': r.engine === 'local' ? 'محلی (غیر هوشمند)' : r.engine === 'ai' ? 'هوش مصنوعی' : '—',
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'نتایج کامل');

  const safeName = (batch.roleTitle || batch.departmentName).replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
  XLSX.writeFile(wb, `غربالگری-${safeName}-${batch.createdAtJalali.replace(/\//g, '-')}.xlsx`);
}
