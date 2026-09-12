/**
 * Department definitions — pure data, zero UI dependencies.
 *
 * The Express server needs the exact same department list as the frontend
 * (request validation + AI prompts + talent-bank grouping). Importing
 * `src/lib/departments.ts` on the server used to drag in `lucide-react`,
 * which loads ~1,500 icon modules (~60 MB RSS / ~250 ms) at boot — painful on
 * small hosts such as Render's free tier (512 MB).
 *
 * So: this module holds only serializable data, and `departments.ts` maps
 * `iconName` to the real lucide component for the browser bundle.
 */

/** Names of the lucide-react icons used by the department cards. */
export type DepartmentIconName =
  | 'Factory'
  | 'ShoppingCart'
  | 'Megaphone'
  | 'Calculator'
  | 'Users'
  | 'Code2'
  | 'Wrench'
  | 'Truck'
  | 'ShieldCheck'
  | 'HardHat'
  | 'FlaskConical'
  | 'LayoutGrid';

export interface DepartmentData {
  id: string;
  name: string;
  hint: string; // short hint used in AI prompts and card subtitle
  iconName: DepartmentIconName;
  accent: string; // tailwind-ish static classes for the card icon chip
}

const ACCENT = 'bg-surface-2 text-text-2 border-border-default';

/**
 * Fixed department list for Seilaneh Sabz Holding.
 * The AI generates job-specific criteria/questions; this list is the stable
 * navigation and talent-bank grouping backbone.
 */
export const DEPARTMENTS_DATA: DepartmentData[] = [
  {
    id: 'manufacturing',
    name: 'تولید و کارخانه',
    hint: 'تولید، اپراتوری خط، سرپرستی شیفت، کار با ماشین‌آلات، محیط کارگاهی و کار شیفتی',
    iconName: 'Factory',
    accent: ACCENT,
  },
  {
    id: 'sales',
    name: 'فروش و پخش مویرگی',
    hint: 'فروش حضوری و میدانی، ویزیتوری، مذاکره با مشتری، تارگت و پورسانت، پخش FMCG',
    iconName: 'ShoppingCart',
    accent: ACCENT,
  },
  {
    id: 'marketing',
    name: 'بازاریابی و برند',
    hint: 'دیجیتال مارکتینگ، تبلیغات، برندینگ، محتوا، شبکه‌های اجتماعی، تحقیقات بازار',
    iconName: 'Megaphone',
    accent: ACCENT,
  },
  {
    id: 'finance',
    name: 'مالی و حسابداری',
    hint: 'حسابداری صنعتی، بهای تمام‌شده، مالیات، بیمه، سپیدار/همکاران، دقت و نظم',
    iconName: 'Calculator',
    accent: ACCENT,
  },
  {
    id: 'hr',
    name: 'منابع انسانی و امور اداری',
    hint: 'جذب و استخدام، کارگزینی، قوانین کار، آموزش، امور اداری و هوش هیجانی',
    iconName: 'Users',
    accent: ACCENT,
  },
  {
    id: 'it',
    name: 'فناوری اطلاعات',
    hint: 'برنامه‌نویسی، زیرساخت شبکه، پشتیبانی IT، سامانه‌ها، دیتابیس و امنیت',
    iconName: 'Code2',
    accent: ACCENT,
  },
  {
    id: 'engineering',
    name: 'فنی، مهندسی و نگهداشت',
    hint: 'نگهداری و تعمیرات، مکانیک، برق، اتوماسیون خط، نقشه‌فنی و پروژه‌های فنی',
    iconName: 'Wrench',
    accent: ACCENT,
  },
  {
    id: 'logistics',
    name: 'لجستیک و زنجیره تأمین',
    hint: 'انبارش، موجودی، حمل‌ونقل، توزیع، برنامه‌ریزی بار و هماهنگی رانندگان',
    iconName: 'Truck',
    accent: ACCENT,
  },
  {
    id: 'qc',
    name: 'کنترل کیفیت (QA/QC)',
    hint: 'کنترل کیفیت مواد و محصول، آزمایشگاه، استانداردها، مستندسازی و ممیزی',
    iconName: 'ShieldCheck',
    accent: ACCENT,
  },
  {
    id: 'hse',
    name: 'بهداشت، ایمنی و محیط‌زیست (HSE)',
    hint: 'ایمنی کارگاه، HSE، ارزیابی ریسک، تجهیزات حفاظتی و محیط‌زیست',
    iconName: 'HardHat',
    accent: ACCENT,
  },
  {
    id: 'rd',
    name: 'تحقیق و توسعه (R&D)',
    hint: 'توسعه محصول و فرمولاسیون، پژوهش، آزمایش، نوآوری و دانش فنی',
    iconName: 'FlaskConical',
    accent: ACCENT,
  },
  {
    id: 'other',
    name: 'سایر',
    hint: 'سایر نقش‌های ستادی، اداری و پشتیبانی',
    iconName: 'LayoutGrid',
    accent: ACCENT,
  },
];

/** Department lookup used by the server (no icon component involved). */
export function getDepartmentData(id: string): DepartmentData {
  return (
    DEPARTMENTS_DATA.find((d) => d.id === id) || DEPARTMENTS_DATA[DEPARTMENTS_DATA.length - 1]
  );
}

/** True when `id` is one of the 12 known departments. */
export function isKnownDepartment(id: unknown): boolean {
  return typeof id === 'string' && DEPARTMENTS_DATA.some((d) => d.id === id);
}
