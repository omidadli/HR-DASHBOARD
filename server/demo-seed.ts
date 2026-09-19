/**
 * Demo/preview data seeder.
 *
 * The screening flow needs a Gemini key, so a fresh checkout (or a live preview
 * without credentials) has nothing to click through. This module builds one
 * realistic screening session — batch, candidates, decisions, bank entries and
 * real PDF/TXT files on disk — owned by the requesting user, so every screen of
 * the product can be reviewed end to end.
 *
 * Guarded by the caller: only exposed outside production (or with
 * ALLOW_DEMO_SEED=1).
 */
import * as store from './screening-store';
import { buildDefaultUnderstanding } from './screening-gemini';
import { tehranNow } from './tehran-time';
import type {
  CandidateEvaluation,
  DecisionStatus,
  EvidencePoint,
  Recommendation,
} from '../src/types/screening';
import {
  addJalaliDays,
  formatJalaliDate,
  jalaliToGregorian,
} from '../src/utils/jalali';

// ---------------------------------------------------------------------------
// A tiny, dependency-free PDF writer (single page, Helvetica, ASCII text).
// ---------------------------------------------------------------------------

function pdfEscape(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function makeSamplePdf(title: string, lines: string[]): string {
  const parts: string[] = ['BT', '/F1 18 Tf', '60 790 Td', `(${pdfEscape(title)}) Tj`, 'ET'];
  let y = 758;
  for (const line of lines) {
    if (y < 60) break;
    parts.push('BT', '/F1 11 Tf', `60 ${y} Td`, `(${pdfEscape(line)}) Tj`, 'ET');
    y -= 19;
  }
  const stream = parts.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1').toString('base64');
}

// ---------------------------------------------------------------------------
// Sample candidates
// ---------------------------------------------------------------------------

interface DemoCandidate {
  name: string;
  fileName: string;
  kind: 'pdf' | 'txt' | 'none';
  lastRole: string;
  years: number;
  education: string;
  city: string;
  phone: string;
  email: string | null;
  skills: string[];
  salary: string | null;
  score: number;
  recommendation: Recommendation;
  summary: string;
  why: string;
  strengths: [string, string][];
  weaknesses: [string, string, 'knockout' | 'major' | 'minor'][];
  tags: string[];
  decision: DecisionStatus;
  decisionNote?: string;
  decidedDaysAgo?: number;
  inBank?: boolean;
  messaged?: boolean;
  deep?: boolean;
}

const CANDIDATES: DemoCandidate[] = [
  {
    name: 'سارا محمدی',
    fileName: 'sara-mohammadi-resume.pdf',
    kind: 'pdf',
    lastRole: 'کارشناس ارشد جذب و استخدام',
    years: 6,
    education: 'کارشناسی ارشد مدیریت منابع انسانی — دانشگاه تهران',
    city: 'تهران',
    phone: '09121234567',
    email: 'sara.mohammadi@example.com',
    skills: ['مصاحبه شایستگی‌محور', 'ATS', 'کارگزینی', 'قانون کار', 'برند کارفرمایی', 'اکسل'],
    salary: '۴۵ میلیون تومان',
    score: 88,
    recommendation: 'INTERVIEW',
    summary:
      'شش سال سابقه پیوسته در جذب و استخدام دو شرکت تولیدی، با نمونه‌های عددی از کاهش زمان استخدام و تسلط بر مصاحبه شایستگی‌محور و سامانه‌های ATS.',
    why: 'هم سابقه تخصصی جذب دارد، هم با محیط کارخانه آشناست؛ برای این شغل کاملاً منطبق است.',
    strengths: [
      ['سابقه تخصصی در جذب و استخدام صنعتی', '«۴ سال فعالیت در واحد جذب هلدینگ تولیدی با میانگین ۳۵ استخدام در ماه»'],
      ['نتایج عددی و قابل راستی‌آزمایی', '«کاهش میانگین زمان استخدام از ۴۲ به ۲۶ روز در سال ۱۴۰۲»'],
      ['تسلط بر ابزارهای تخصصی', '«پیاده‌سازی و مدیریت سامانه ATS (دیدگاه) برای ۳ شعبه»'],
    ],
    weaknesses: [
      ['فاصله زمانی کوتاه بین دو شغل آخر', '«از اسفند ۱۴۰۱ تا خرداد ۱۴۰۲ سابقه‌ای ذکر نشده است»', 'minor'],
    ],
    tags: ['جذب و استخدام', 'ATS', 'منابع انسانی', 'ارشد'],
    decision: 'approved',
    decidedDaysAgo: 1,
    inBank: true,
    messaged: true,
    deep: true,
  },
  {
    name: 'امیر رضایی',
    fileName: 'amir-rezaei-resume.pdf',
    kind: 'pdf',
    lastRole: 'کارشناس منابع انسانی',
    years: 4,
    education: 'کارشناسی مدیریت صنعتی — دانشگاه آزاد کرج',
    city: 'کرج',
    phone: '09351112233',
    email: 'amir.rezaei@example.com',
    skills: ['کارگزینی', 'بیمه و مالیات حقوق', 'جذب', 'اکسل پیشرفته'],
    salary: null,
    score: 81,
    recommendation: 'INTERVIEW',
    summary:
      'چهار سال سابقه کارگزینی و امور اداری با تجربه مشخص در فرایند جذب؛ حقوق درخواستی ذکر نکرده و آمادگی کار در تهران را دارد.',
    why: 'سابقه کارگزینی قوی است و بخشی از کار جذب را هم انجام داده؛ برای مصاحبه مناسب است.',
    strengths: [
      ['تسلط بر امور کارگزینی و بیمه', '«ارسال ماهانه لیست بیمه ۱۸۰ نفره و رسیدگی به پرونده‌های بازرسی»'],
      ['تجربه جذب در مقیاس متوسط', '«همکاری در جذب ۶۰ نیروی خط تولید در دو فصل»'],
    ],
    weaknesses: [
      ['سابقه مستقل در مصاحبه شایستگی‌محور دیده نمی‌شود', 'در رزومه به این مورد اشاره نشده', 'major'],
    ],
    tags: ['کارگزینی', 'بیمه', 'جذب', 'کارشناس'],
    decision: 'none',
  },
  {
    name: 'نگار کریمی',
    fileName: 'negar-karimi-resume.pdf',
    kind: 'pdf',
    lastRole: 'سرپرست جذب و استخدام',
    years: 8,
    education: 'کارشناسی ارشد روان‌شناسی سازمانی',
    city: 'تهران',
    phone: '09127654321',
    email: 'negar.karimi@example.com',
    skills: ['کانون ارزیابی', 'مصاحبه', 'جانشین‌پروری', 'ATS'],
    salary: '۷۰ میلیون تومان',
    score: 74,
    recommendation: 'REVIEW',
    summary:
      'تخصص و سابقه بسیار خوب است اما حقوق درخواستی حدود ۵۵٪ بالاتر از بازه این موقعیت شغلی است و سطح نقش فعلی از عنوان شغل ما بالاتر است.',
    why: 'از نظر توانمندی مناسب است، ولی بودجه و سطح نقش با این موقعیت هم‌خوانی ندارد.',
    strengths: [
      ['سابقه سرپرستی تیم جذب', '«سرپرستی تیم ۶ نفره جذب در هلدینگ دارویی»'],
      ['تخصص در کانون ارزیابی', '«طراحی و اجرای کانون ارزیابی برای ۴۰ مدیر میانی»'],
    ],
    weaknesses: [
      ['حقوق درخواستی بالاتر از بودجه', '«حقوق درخواستی: ۷۰ میلیون تومان»', 'major'],
      ['احتمال بیش‌صلاحیتی برای نقش کارشناسی', '«سمت فعلی: سرپرست جذب و استخدام»', 'minor'],
    ],
    tags: ['جذب و استخدام', 'کانون ارزیابی', 'سرپرست'],
    decision: 'rejected',
    decisionNote: 'حقوق درخواستی بالاتر از بودجه — برای فرصت‌های آتی در بانک نگه داشته شد',
    decidedDaysAgo: 4,
    inBank: true,
  },
  {
    name: 'محمد حسینی',
    fileName: 'mohammad-hosseini-resume.pdf',
    kind: 'pdf',
    lastRole: 'کارشناس آموزش و توسعه',
    years: 3,
    education: 'کارشناسی علوم تربیتی',
    city: 'قم',
    phone: '09193334455',
    email: null,
    skills: ['آموزش', 'نیازسنجی آموزشی', 'جذب (پاره‌ای)'],
    salary: '۳۰ میلیون تومان',
    score: 62,
    recommendation: 'REVIEW',
    summary:
      'سابقه عمدتاً در آموزش و توسعه است و فقط بخشی از فعالیت‌ها به جذب مربوط می‌شود؛ برای نقش جذب تخصصی نیاز به بررسی بیشتر دارد.',
    why: 'نزدیک به نیمی از سابقه به آموزش مربوط است نه جذب؛ تصمیم‌گیری درباره‌اش سخت است.',
    strengths: [
      ['تجربه نیازسنجی و اجرای دوره', '«نیازسنجی و اجرای ۴۸ دوره آموزشی در سال ۱۴۰۳»'],
    ],
    weaknesses: [
      ['سابقه جذب محدود است', '«همکاری پاره‌وقت در فرایند جذب»', 'major'],
      ['ایمیل در رزومه ذکر نشده', 'در رزومه به این مورد اشاره نشده', 'minor'],
    ],
    tags: ['آموزش', 'توسعه', 'منابع انسانی'],
    decision: 'review',
    decidedDaysAgo: 9,
  },
  {
    name: 'زهرا عباسی',
    fileName: 'zahra-abbasi-resume.txt',
    kind: 'txt',
    lastRole: 'کارشناس اداری',
    years: 2,
    education: 'کارشناسی مدیریت بازرگانی',
    city: 'تهران',
    phone: '09012223344',
    email: 'zahra.abbasi@example.com',
    skills: ['امور اداری', 'بایگانی', 'هماهنگی مصاحبه'],
    salary: null,
    score: 55,
    recommendation: 'REVIEW',
    summary:
      'دو سال سابقه امور اداری با تجربه هماهنگی مصاحبه؛ سابقه تخصصی جذب ندارد ولی پتانسیل رشد در همین واحد را دارد.',
    why: 'رزومه کوتاه و کم‌جزئیات است؛ برای رد کردن زود است و برای تایید هم شاهد کافی نیست.',
    strengths: [['آشنایی با هماهنگی فرایند مصاحبه', '«هماهنگی ۱۲۰ مصاحبه حضوری و آنلاین در سال گذشته»']],
    weaknesses: [
      ['سابقه تخصصی جذب ندارد', 'در رزومه به این مورد اشاره نشده', 'major'],
      ['جزئیات دستاوردها ذکر نشده', 'در رزومه به این مورد اشاره نشده', 'minor'],
    ],
    tags: ['امور اداری', 'جوان', 'قابل رشد'],
    decision: 'none',
  },
  {
    name: 'رضا نوری',
    fileName: 'reza-nouri-resume.pdf',
    kind: 'pdf',
    lastRole: 'کارشناس جذب (قراردادی)',
    years: 5,
    education: 'کاردانی کامپیوتر',
    city: 'اصفهان',
    phone: '09131239876',
    email: 'reza.nouri@example.com',
    skills: ['منبع‌یابی', 'لینکدین ریکروتر', 'مصاحبه تلفنی'],
    salary: '۳۸ میلیون تومان',
    score: 68,
    recommendation: 'REVIEW',
    summary:
      'پنج سال سابقه منبع‌یابی و جذب، اما بیشتر به‌صورت قرارداد پروژه‌ای و در صنعت خدمات؛ پایداری شغلی نیاز به بررسی دارد.',
    why: 'مهارت منبع‌یابی خوبی دارد ولی جابه‌جایی‌های پرتکرار و تفاوت صنعت جای بررسی دارد.',
    strengths: [['منبع‌یابی فعال و شبکه‌سازی', '«شناسایی ۳۰۰ کاندید در ۶ ماه از طریق لینکدین ریکروتر»']],
    weaknesses: [
      ['جابه‌جایی پرتکرار شغلی', '«چهار کارفرما در پنج سال اخیر»', 'major'],
      ['سابقه صنعت تولید ندارد', 'در رزومه به این مورد اشاره نشده', 'minor'],
    ],
    tags: ['منبع‌یابی', 'پروژه‌ای', 'جذب'],
    decision: 'approved',
    decidedDaysAgo: 14,
    deep: true,
  },
  {
    name: 'مریم صادقی',
    fileName: 'maryam-sadeghi-resume.pdf',
    kind: 'pdf',
    lastRole: 'فروشنده فروشگاه',
    years: 1,
    education: 'دیپلم تجربی',
    city: 'تهران',
    phone: '09199887766',
    email: null,
    skills: ['فروش حضوری'],
    salary: '۲۰ میلیون تومان',
    score: 38,
    recommendation: 'REJECT',
    summary:
      'سابقه کاری نامرتبط با منابع انسانی است و هیچ شاهدی درباره فرایندهای جذب، کارگزینی یا قوانین کار در رزومه وجود ندارد.',
    why: 'رزومه با شغل منابع انسانی انطباق ندارد؛ سابقه فقط در فروش حضوری است.',
    strengths: [],
    weaknesses: [
      ['عدم انطباق حوزه سابقه با شغل', '«یک سال فروشندگی در فروشگاه پوشاک»', 'knockout'],
      ['نبود مهارت‌های تخصصی مورد نیاز', 'در رزومه به این مورد اشاره نشده', 'major'],
    ],
    tags: ['نامرتبط'],
    decision: 'rejected',
    decisionNote: 'عدم تطابق سابقه با شغل',
    decidedDaysAgo: 21,
  },
  {
    name: 'علی موسوی',
    fileName: 'ali-mousavi-resume.pdf',
    kind: 'none',
    lastRole: 'کارآموز منابع انسانی',
    years: 1,
    education: 'کارشناسی مدیریت دولتی',
    city: 'رشت',
    phone: '09111223344',
    email: 'ali.mousavi@example.com',
    skills: ['اکسل', 'بایگانی'],
    salary: null,
    score: 44,
    recommendation: 'REJECT',
    summary:
      'فقط یک دوره کارآموزی کوتاه در منابع انسانی دارد و شاهد کافی برای نقش کارشناس مستقل وجود ندارد.',
    why: 'سابقه در حد کارآموزی است و برای این موقعیت کافی نیست.',
    strengths: [['آشنایی اولیه با فرایندهای اداری', '«دوره کارآموزی ۳ ماهه در واحد اداری»']],
    weaknesses: [['سابقه مستقل ندارد', 'در رزومه به این مورد اشاره نشده', 'major']],
    tags: ['کارآموز', 'جوان'],
    decision: 'none',
  },
];

const PDF_BODY: Record<string, string[]> = {
  'sara-mohammadi-resume.pdf': [
    'SARA MOHAMMADI - Senior Talent Acquisition Specialist',
    'Tehran, Iran | 09121234567 | sara.mohammadi@example.com',
    '',
    'EXPERIENCE',
    'Senior Recruitment Specialist - Manufacturing Holding (1401 - present)',
    '  - 35 hires per month on average across plant and HQ roles',
    '  - Reduced average time-to-hire from 42 to 26 days in 1402',
    '  - Owner of the ATS rollout (Didgah) for 3 sites',
    'Recruitment Expert - Food Industries Co. (1398 - 1401)',
    '  - Competency-based interviewing for 12 job families',
    '  - Built the employer branding calendar and campus program',
    '',
    'EDUCATION',
    'M.Sc. Human Resource Management - University of Tehran',
    '',
    'SKILLS',
    'Competency interviewing, ATS, labor law, personnel affairs, Excel',
    'Expected salary: 45,000,000 IRR net (agreed range)',
  ],
  'amir-rezaei-resume.pdf': [
    'AMIR REZAEI - Human Resources Expert',
    'Karaj, Iran | 09351112233 | amir.rezaei@example.com',
    '',
    'EXPERIENCE',
    'HR Expert - Polymer Parts Co. (1400 - present)',
    '  - Monthly social security list for 180 employees',
    '  - Supported 60 production hires across two seasons',
    '  - Payroll, insurance and tax files, personnel archive',
    '',
    'EDUCATION',
    'B.Sc. Industrial Management - Azad University of Karaj',
    '',
    'SKILLS',
    'Personnel affairs, insurance and salary tax, recruitment support, Excel',
  ],
  'negar-karimi-resume.pdf': [
    'NEGAR KARIMI - Recruitment Supervisor',
    'Tehran, Iran | 09127654321 | negar.karimi@example.com',
    '',
    'EXPERIENCE',
    'Recruitment Supervisor - Pharmaceutical Holding (1399 - present)',
    '  - Leading a 6-person talent acquisition team',
    '  - Designed and ran assessment centers for 40 middle managers',
    'Talent Acquisition Expert - Retail Group (1396 - 1399)',
    '',
    'EDUCATION',
    'M.Sc. Organizational Psychology',
    '',
    'EXPECTED SALARY',
    '70,000,000 per month (net)',
  ],
  'mohammad-hosseini-resume.pdf': [
    'MOHAMMAD HOSSEINI - Training and Development Expert',
    'Qom, Iran | 09193334455',
    '',
    'EXPERIENCE',
    'Training Expert - Industrial Group (1401 - present)',
    '  - Training needs assessment and 48 courses delivered in 1403',
    '  - Part-time cooperation in the recruitment process',
    '',
    'EDUCATION',
    'B.Sc. Educational Sciences',
    '',
    'EXPECTED SALARY',
    '30,000,000 per month',
  ],
  'reza-nouri-resume.pdf': [
    'REZA NOURI - Talent Sourcer (Contract)',
    'Isfahan, Iran | 09131239876 | reza.nouri@example.com',
    '',
    'EXPERIENCE',
    'Contract Sourcer - Services Holding (1402 - present)',
    '  - 300 candidates sourced in 6 months via LinkedIn Recruiter',
    'Contract Sourcer - IT Company (1401 - 1402)',
    'Recruiter - Retail Chain (1400 - 1401)',
    'HR Assistant - Startup (1399 - 1400)',
    '',
    'EXPECTED SALARY',
    '38,000,000 per month',
  ],
  'maryam-sadeghi-resume.pdf': [
    'MARYAM SADGHI',
    'Tehran, Iran | 09199887766',
    '',
    'EXPERIENCE',
    'Shop Assistant - Clothing Store (1403 - present)',
    '  - In-person sales and shelf arrangement',
    '',
    'EDUCATION',
    'High school diploma (experimental sciences)',
    '',
    'EXPECTED SALARY',
    '20,000,000 per month',
  ],
};

function evaluationFor(c: DemoCandidate, understanding: ReturnType<typeof buildDefaultUnderstanding>): CandidateEvaluation {
  const points = (list: [string, string][], severity: EvidencePoint['severity']): EvidencePoint[] =>
    list.map(([point, evidence]) => ({ point, evidence, severity }));

  const spread = understanding.criteria.map((crit, i) => {
    // Deterministic pseudo-variation around the headline score.
    const delta = [8, -9, 5, -4, 3][i % 5];
    const score = Math.max(5, Math.min(100, c.score + delta));
    return {
      criterionId: crit.id,
      title: crit.title,
      score,
      rationale:
        score >= 70
          ? `شواهد رزومه برای «${crit.title}» روشن و قابل اتکاست.`
          : score >= 45
          ? `شواهد نسبی برای «${crit.title}» وجود دارد اما کامل نیست.`
          : `در رزومه شاهد مشخصی برای «${crit.title}» دیده نشد.`,
      evidence: c.strengths[0]?.[1] || 'در رزومه به این مورد اشاره نشده',
    };
  });

  return {
    candidateName: c.name,
    contact: { phone: c.phone, email: c.email, city: c.city },
    facts: {
      yearsExperience: c.years,
      education: c.education,
      lastRole: c.lastRole,
      skills: c.skills,
      expectedSalary: c.salary,
    },
    criterionScores: spread,
    score: c.score,
    confidence: c.score >= 75 ? 'high' : c.score >= 50 ? 'medium' : 'low',
    engine: 'ai',
    recommendation: c.recommendation,
    summary: c.summary,
    whyCategory: c.why,
    strengths: points(c.strengths, 'minor'),
    weaknesses: c.weaknesses.map(([point, evidence, severity]) => ({ point, evidence, severity })),
    knockoutMisses: c.weaknesses.filter((w) => w[2] === 'knockout').map((w) => w[0]),
    tags: c.tags,
    bankSuggested: c.score >= 60,
    flags: { irrelevant: c.score < 40, insufficientInfo: false, scannedNoText: false },
    deepFindings: c.deep
      ? {
          focusPoints: [
            'جزئیات دستاوردها با عدد و بازه زمانی آمده و قابل راستی‌آزمایی در مصاحبه است.',
            'توالی زمانی سوابق بدون هم‌پوشانی غیرعادی است؛ فقط یک فاصله کوتاه دیده می‌شود.',
            'عنوان‌های شغلی با شرح وظایف نوشته‌شده هم‌خوانی دارد و بزرگ‌نمایی دیده نمی‌شود.',
          ],
          interviewQuestions: [
            'در سخت‌ترین موقعیت جذب، کدام کانال منبع‌یابی را انتخاب کردید و چرا؟',
            'معیار شما برای رد کردن یک کاندید در مرحله اول چیست؟ یک نمونه واقعی بگویید.',
            'چطور کیفیت استخدام را بعد از سه ماه می‌سنجید؟',
          ],
          risks: ['حقوق درخواستی باید در همان جلسه اول شفاف شود تا زمان دو طرف هدر نرود.'],
        }
      : null,
  };
}

function fileFor(c: DemoCandidate): { base64?: string; extractedText: string } {
  if (c.kind === 'pdf') {
    const lines = PDF_BODY[c.fileName] || [c.name.toUpperCase(), c.lastRole, `${c.years} years of experience`];
    return {
      base64: makeSamplePdf(c.name.toUpperCase(), lines),
      extractedText: lines.join('\n'),
    };
  }
  if (c.kind === 'txt') {
    const text = [
      `رزومه ${c.name}`,
      `سمت: ${c.lastRole}`,
      `سابقه: ${c.years} سال`,
      `تحصیلات: ${c.education}`,
      `شهر: ${c.city} — تلفن: ${c.phone}`,
      '',
      'سوابق کاری:',
      '- کارشناس امور اداری و بایگانی در شرکت پخش (۱۴۰۲ تاکنون)',
      '- هماهنگی ۱۲۰ مصاحبه حضوری و آنلاین در سال گذشته',
      '',
      'مهارت‌ها: امور اداری، بایگانی، اکسل، هماهنگی مصاحبه',
    ].join('\n');
    return { extractedText: text };
  }
  return { extractedText: `${c.name} — ${c.lastRole} — ${c.years} سال سابقه` };
}

/**
 * Creates (once per user) a demo screening session owned by `userId`.
 * Idempotent: if a batch tagged as demo already exists, it is returned as-is.
 */
export async function seedDemoData(userId: string): Promise<{ batchId: string; created: number }> {
  const existing = store
    .listRecentBatches(20, userId)
    .find((b) => (b.extraNotes || '').includes('[demo-seed]'));
  if (existing) {
    return { batchId: existing.id, created: 0 };
  }

  const departmentId = 'hr';
  const roleTitle = 'کارشناس جذب و استخدام';
  const understanding = buildDefaultUnderstanding(departmentId, roleTitle);

  const batch = store.createBatch({
    departmentId,
    departmentName: understanding.department,
    roleTitle,
    extraNotes: '[demo-seed] داده نمونه برای پیش‌نمایش سامانه',
    understanding,
    answers: {},
    userId,
  });

  const now = tehranNow();
  let created = 0;

  for (const c of CANDIDATES) {
    const file = fileFor(c);
    const record = await store.saveEvaluation({
      batchId: batch.id,
      fileName: c.fileName,
      extractedText: file.extractedText,
      unjudgeableReason: null,
      fileBase64: file.base64,
      evaluation: evaluationFor(c, understanding),
    });
    created += 1;

    if (c.decision !== 'none') {
      const daysAgo = c.decidedDaysAgo ?? 0;
      const jalali = addJalaliDays(now.jalali, -daysAgo);
      const g = jalaliToGregorian(jalali.year, jalali.month, jalali.day);
      store.setDecision(record.id, c.decision, c.decisionNote ?? null, {
        jalaliString: formatJalaliDate(jalali, true),
        iso: new Date(g.year, g.month - 1, g.day, 10, 30).toISOString(),
      });
    }
    if (c.inBank) {
      store.addToBank(record.id, departmentId, 'کاندید نمونه برای پیش‌نمایش بانک رزومه', c.tags.slice(0, 4));
    }
    if (c.messaged) store.markMessageSent(record.id);
    if (c.deep) {
      const rec = store.getResume(record.id);
      if (rec) rec.deepAnalysisAtJalali = now.jalaliString;
    }
  }

  store.recomputeBatch(batch.id);
  return { batchId: batch.id, created };
}
