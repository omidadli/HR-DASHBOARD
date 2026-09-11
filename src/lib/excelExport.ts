import * as XLSX from 'xlsx';
import { JobUnderstanding, ResumeFileItem } from '../types/screening';
import { toPersianDigits } from './normalizeFa';

export function exportScreeningToExcel(
  jobUnderstanding: JobUnderstanding,
  items: ResumeFileItem[],
  jobDescription: string
) {
  const wb = XLSX.utils.book_new();

  // Valid candidates sorted by score descending
  const validEvaluated = items
    .filter((it) => it.status === 'success' && it.result && !it.result.insufficientInfo && !it.result.irrelevant)
    .sort((a, b) => (b.result?.score || 0) - (a.result?.score || 0));

  // Count metrics
  const interviewCount = validEvaluated.filter((it) => it.result?.recommendation === 'INTERVIEW').length;
  const reviewCount = validEvaluated.filter((it) => it.result?.recommendation === 'REVIEW').length;
  const rejectCount = validEvaluated.filter((it) => it.result?.recommendation === 'REJECT').length;
  const unjudgeableCount = items.length - validEvaluated.length;

  // --- SHEET 1: خلاصه شغل (Job Summary) ---
  const sheet1Data: Array<Record<string, string | number>> = [
    { 'عنوان': 'دپارتمان تشخیص‌داده‌شده', 'مقدار': jobUnderstanding.department },
    { 'عنوان': 'سطح ارشدیت شغل', 'مقدار': jobUnderstanding.seniority },
    { 'عنوان': 'توضیح هوش مصنوعی از شغل', 'مقدار': jobUnderstanding.plainExplanation },
    { 'عنوان': 'آستانه قبولی مصاحبه', 'مقدار': `حداقل نمره ${jobUnderstanding.thresholds.interview}` },
    { 'عنوان': 'آستانه بررسی بیشتر', 'مقدار': `نمره بین ${jobUnderstanding.thresholds.review} تا ${jobUnderstanding.thresholds.interview}` },
    { 'عنوان': 'کل رزومه‌های بارگذاری‌شده', 'مقدار': items.length },
    { 'عنوان': 'پیشنهاد مصاحبه (سبز)', 'مقدار': interviewCount },
    { 'عنوان': 'نیاز به بررسی بیشتر (زرد)', 'مقدار': reviewCount },
    { 'عنوان': 'رد صلاحیت اولیه (قرمز)', 'مقدار': rejectCount },
    { 'عنوان': 'غیرقابل قضاوت / اسکن‌شده / نامرتبط', 'مقدار': unjudgeableCount },
    { 'عنوان': 'متن اولیه ثبت‌شده شغل', 'مقدار': jobDescription.slice(0, 500) },
  ];

  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  // Set RTL direction for Persian
  if (!ws1['!views']) ws1['!views'] = [];
  ws1['!views'].push({ rightToLeft: true });
  ws1['!cols'] = [{ wch: 30 }, { wch: 70 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'خلاصه شغل');

  // --- SHEET 2: رتبه‌بندی (Candidate Rankings) ---
  const sheet2Data: Array<Record<string, string | number>> = [];

  let rank = 1;
  // First add evaluated candidates
  for (const it of validEvaluated) {
    const res = it.result!;
    const recFa =
      res.recommendation === 'INTERVIEW'
        ? 'مصاحبه شود ✅'
        : res.recommendation === 'REVIEW'
        ? 'بررسی بیشتر 🟡'
        : 'رد شود 🔴';

    const strengthsText = res.strengths.map((s, idx) => `${idx + 1}) ${s.point} [شاهد: ${s.evidence}]`).join('\n');
    const weaknessesText = res.weaknesses.map((w, idx) => `${idx + 1}) ${w.point} [دلیل: ${w.evidence}]`).join('\n');

    sheet2Data.push({
      'رتبه': rank++,
      'نام کاندید': res.candidateName || `کاندید ${rank - 1}`,
      'نام فایل رزومه': it.name,
      'امتیاز (از ۱۰۰)': res.score,
      'توصیه نهایی': recFa,
      'خلاصه ارزیابی': res.summary,
      'نقاط قوت و شواهد متنی': strengthsText,
      'کمبودها و دلایل': weaknessesText,
    });
  }

  // Then append unjudgeable/corrupt items with honest status
  const unjudgeables = items.filter((it) => it.status !== 'success' || !it.result || it.result.insufficientInfo || it.result.irrelevant);
  for (const it of unjudgeables) {
    sheet2Data.push({
      'رتبه': '—',
      'نام کاندید': it.result?.candidateName || it.name,
      'نام فایل رزومه': it.name,
      'امتیاز (از ۱۰۰)': 'قابل قضاوت نیست',
      'توصیه نهایی': 'بررسی دستی / غیرقابل قضاوت 🤷',
      'خلاصه ارزیابی': it.unjudgeableReason || it.errorMessage || 'فایل نامعتبر، اسکن‌شده، یا نامرتبط',
      'نقاط قوت و شواهد متنی': '—',
      'کمبودها و دلایل': '—',
    });
  }

  const ws2 = XLSX.utils.json_to_sheet(sheet2Data);
  if (!ws2['!views']) ws2['!views'] = [];
  ws2['!views'].push({ rightToLeft: true });
  ws2['!cols'] = [
    { wch: 8 },  // رتبه
    { wch: 22 }, // نام
    { wch: 25 }, // فایل
    { wch: 15 }, // امتیاز
    { wch: 20 }, // توصیه
    { wch: 45 }, // خلاصه
    { wch: 50 }, // قوت
    { wch: 50 }, // کمبود
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'رتبه‌بندی');

  // Trigger download in browser
  const todayStr = new Date().toISOString().split('T')[0];
  const fileName = `گزارش_غربالگری_رزومه_${todayStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
