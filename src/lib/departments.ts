import {
  Factory,
  ShoppingCart,
  Megaphone,
  Calculator,
  Users,
  Code2,
  Wrench,
  Truck,
  ShieldCheck,
  HardHat,
  FlaskConical,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';

export interface DepartmentDef {
  id: string;
  name: string;
  hint: string; // short hint used in AI prompts and card subtitle
  icon: LucideIcon;
  accent: string; // tailwind-ish static classes for the card icon chip
}

/**
 * Fixed department list for Seilaneh Sabz Holding.
 * The AI generates job-specific criteria/questions; this list is the stable
 * navigation and talent-bank grouping backbone.
 */
export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: 'manufacturing',
    name: 'تولید و کارخانه',
    hint: 'تولید، اپراتوری خط، سرپرستی شیفت، کار با ماشین‌آلات، محیط کارگاهی و کار شیفتی',
    icon: Factory,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'sales',
    name: 'فروش و پخش مویرگی',
    hint: 'فروش حضوری و میدانی، ویزیتوری، مذاکره با مشتری، تارگت و پورسانت، پخش FMCG',
    icon: ShoppingCart,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'marketing',
    name: 'بازاریابی و برند',
    hint: 'دیجیتال مارکتینگ، تبلیغات، برندینگ، محتوا، شبکه‌های اجتماعی، تحقیقات بازار',
    icon: Megaphone,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'finance',
    name: 'مالی و حسابداری',
    hint: 'حسابداری صنعتی، بهای تمام‌شده، مالیات، بیمه، سپیدار/همکاران، دقت و نظم',
    icon: Calculator,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'hr',
    name: 'منابع انسانی و امور اداری',
    hint: 'جذب و استخدام، کارگزینی، قوانین کار، آموزش، امور اداری و هوش هیجانی',
    icon: Users,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'it',
    name: 'فناوری اطلاعات',
    hint: 'برنامه‌نویسی، زیرساخت شبکه، پشتیبانی IT، سامانه‌ها، دیتابیس و امنیت',
    icon: Code2,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'engineering',
    name: 'فنی، مهندسی و نگهداشت',
    hint: 'نگهداری و تعمیرات، مکانیک، برق، اتوماسیون خط، نقشه‌فنی و پروژه‌های فنی',
    icon: Wrench,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'logistics',
    name: 'لجستیک و زنجیره تأمین',
    hint: 'انبارش، موجودی، حمل‌ونقل، توزیع، برنامه‌ریزی بار و هماهنگی رانندگان',
    icon: Truck,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'qc',
    name: 'کنترل کیفیت (QA/QC)',
    hint: 'کنترل کیفیت مواد و محصول، آزمایشگاه، استانداردها، مستندسازی و ممیزی',
    icon: ShieldCheck,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'hse',
    name: 'بهداشت، ایمنی و محیط‌زیست (HSE)',
    hint: 'ایمنی کارگاه، HSE، ارزیابی ریسک، تجهیزات حفاظتی و محیط‌زیست',
    icon: HardHat,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'rd',
    name: 'تحقیق و توسعه (R&D)',
    hint: 'توسعه محصول و فرمولاسیون، پژوهش، آزمایش، نوآوری و دانش فنی',
    icon: FlaskConical,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
  {
    id: 'other',
    name: 'سایر',
    hint: 'سایر نقش‌های ستادی، اداری و پشتیبانی',
    icon: LayoutGrid,
    accent: 'bg-surface-2 text-text-2 border-border-default',
  },
];

export function getDepartment(id: string): DepartmentDef {
  return DEPARTMENTS.find((d) => d.id === id) || DEPARTMENTS[DEPARTMENTS.length - 1];
}
