import React, { useState, useMemo } from 'react';
import {
  Factory,
  Sparkles,
  Megaphone,
  TrendingUp,
  Truck,
  ShieldCheck,
  Users,
  Wallet,
  Cpu,
  Scale,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  MapPin,
  Clock,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { HoldingDepartment, JobPosting, Employee, UserRole } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { ModuleKey } from '../common/Sidebar';

export interface SubordinateJob {
  id: string;
  title: string;
  level: 'مدیریت' | 'سرپرستی' | 'کارشناسی ارشد' | 'کارشناسی' | 'تکنسین' | 'اپراتوری';
  employmentType: string;
  location: string;
  headcountEst: number;
  isOpenVacancy?: boolean;
  activeJobId?: string;
  applicationsCount?: number;
  code: string;
  summary: string;
  brands?: string[];
}

interface DepartmentJobsExplorerProps {
  departments: HoldingDepartment[];
  jobs: JobPosting[];
  employees: Employee[];
  onNavigate?: (module: ModuleKey) => void;
  className?: string;
}

// Icon mapping per department category or ID
const getDepartmentIcon = (category: string, id: string) => {
  switch (category) {
    case 'MANUFACTURING':
      return Factory;
    case 'R_AND_D':
      return Sparkles;
    case 'MARKETING':
      return Megaphone;
    case 'SALES':
      return TrendingUp;
    case 'SUPPLY_CHAIN':
      return Truck;
    case 'QUALITY':
      return ShieldCheck;
    case 'HR':
      return Users;
    case 'FINANCE':
      return Wallet;
    case 'IT':
      return Cpu;
    case 'LEGAL':
      return Scale;
    default:
      if (id.includes('prod')) return Factory;
      if (id.includes('rnd')) return Sparkles;
      if (id.includes('mkt')) return Megaphone;
      if (id.includes('sale')) return TrendingUp;
      if (id.includes('scm')) return Truck;
      if (id.includes('qc')) return ShieldCheck;
      if (id.includes('hr')) return Users;
      if (id.includes('fin')) return Wallet;
      if (id.includes('it')) return Cpu;
      if (id.includes('legal')) return Scale;
      return Building2;
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'MANUFACTURING':
      return { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' };
    case 'R_AND_D':
      return { bg: 'bg-teal-500/10 dark:bg-teal-500/20', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500', badge: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300' };
    case 'MARKETING':
      return { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500', badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' };
    case 'SALES':
      return { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' };
    case 'SUPPLY_CHAIN':
      return { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500', badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' };
    case 'QUALITY':
      return { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' };
    case 'HR':
      return { bg: 'bg-rose-500/10 dark:bg-rose-500/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500', badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300' };
    case 'FINANCE':
      return { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' };
    case 'IT':
      return { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500', badge: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300' };
    case 'LEGAL':
      return { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500', badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300' };
    default:
      return { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500', badge: 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300' };
  }
};

const getLevelBadgeClass = (level: SubordinateJob['level']) => {
  switch (level) {
    case 'مدیریت':
      return 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    case 'سرپرستی':
      return 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'کارشناسی ارشد':
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'کارشناسی':
      return 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
    case 'تکنسین':
      return 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'اپراتوری':
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

// Subordinate jobs dictionary for the 10 core holding departments
const DEFAULT_SUBORDINATE_JOBS: Record<string, SubordinateJob[]> = {
  // 1. Manufacturing & Production
  'dept-prod': [
    {
      id: 'job-prd-01',
      code: 'PRD-SUP-01',
      title: 'سرپرست خطوط تولید و بسته‌بندی مکانیزه دافی',
      level: 'سرپرستی',
      employmentType: '۳ نوبت کاری چرخشی',
      location: 'کارخانجات اشتهارد - سالن سلولزی',
      headcountEst: 4,
      isOpenVacancy: true,
      summary: 'هدایت اپراتورها، نظارت بر راندمان خط تولید دستمال مرطوب و پدهای بهداشتی و کاهش ضایعات تولید.',
      brands: ['دافی (Dafi)', 'کدکس'],
    },
    {
      id: 'job-prd-02',
      code: 'PRD-OPR-02',
      title: 'اپراتور ارشد دستگاه‌های بسته‌بندی پیلوپک',
      level: 'اپراتوری',
      employmentType: 'شیفتی چرخشی',
      location: 'کارخانه اشتهارد - خطوط پرکنی',
      headcountEst: 18,
      isOpenVacancy: false,
      summary: 'تنظیم پارامترهای حرارتی و سرعت بسته‌بندی فلوپک و پیلوپک و پایش مداوم تزریق لوسیون.',
      brands: ['دافی'],
    },
    {
      id: 'job-prd-03',
      code: 'PRD-MNT-03',
      title: 'تکنسین مکانیک و برق ماشین‌آلات صنعتی (PM)',
      level: 'تکنسین',
      employmentType: 'تمام‌وقت شیفتی',
      location: 'کارخانجات البرز و اشتهارد',
      headcountEst: 8,
      isOpenVacancy: true,
      summary: 'تعمیرات پیشگیرانه، رفع خرابی‌های اضطراری میکسرها و خطوط اتوماتیک تولید کرم و لوسیون.',
      brands: ['کلیه خطوط'],
    },
    {
      id: 'job-prd-04',
      code: 'PRD-MIX-04',
      title: 'اپراتور تخصصی ساخت بالک و میکسر هموژنایزر',
      level: 'اپراتوری',
      employmentType: 'روزکار با اضافه‌کاری',
      location: 'اتاق تمیز (Cleanroom) اشتهارد',
      headcountEst: 6,
      isOpenVacancy: false,
      summary: 'فرآوری بالک کرم‌های کامان و میس‌ویک طبق فرمولاسیون دارویی در مخازن تحت فشار استیل.',
      brands: ['کامان (Come on)', 'میس‌ویک'],
    },
    {
      id: 'job-prd-05',
      code: 'PRD-PLN-05',
      title: 'کارشناس برنامه‌ریزی تولید و مواد اولیه (MRP)',
      level: 'کارشناسی',
      employmentType: 'روزکار',
      location: 'دفتر مهندسی کارخانه اشتهارد',
      headcountEst: 3,
      isOpenVacancy: false,
      summary: 'محاسبه بچ‌های تولید، هماهنگی تامین مواد از انبار شورآباد و تطبیق سفارشات با ظرفیت اسمی ماشین‌آلات.',
      brands: ['هلدینگ سیلانه سبز'],
    },
  ],

  // 2. R&D & Formulation
  'dept-rnd': [
    {
      id: 'job-rnd-01',
      code: 'RND-DIR-01',
      title: 'مدیر ارشد فرمولاسیون دارویی و آرایشی (Pharm.D)',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'لابراتوار جامع - مجتمع صنعتی البرز',
      headcountEst: 1,
      isOpenVacancy: false,
      summary: 'طراحی فرمولاسیون‌های نسل جدید ضدآفتاب و محصولات درمانی پوست با استاندارد بین‌المللی فارماکوپه.',
      brands: ['کامان', 'آمبرلا (Umbrella)'],
    },
    {
      id: 'job-rnd-02',
      code: 'RND-EXP-02',
      title: 'کارشناس ارشد فرمولاسیون کرم‌های پوستی و لوسیون',
      level: 'کارشناسی ارشد',
      employmentType: 'تخصصی روزکار',
      location: 'لابراتوار فرمولاسیون البرز',
      headcountEst: 5,
      isOpenVacancy: true,
      summary: 'توسعه فرمول پایدار کرم‌های آبرسان ب کمپلکس و واتر بمب‌های کامان با عصاره‌های ارگانیک.',
      brands: ['کامان تخصصی'],
    },
    {
      id: 'job-rnd-03',
      code: 'RND-DEN-03',
      title: 'کارشناس فرمولاسیون بهداشت دهان و دندان',
      level: 'کارشناسی',
      employmentType: 'روزکار',
      location: 'لابراتوار دهان و دندان اشتهارد',
      headcountEst: 3,
      isOpenVacancy: false,
      summary: 'آزمون و بهینه‌سازی خمیردندان‌های تخصصی پمپی و نانوهیدروکسی آپاتیت میس‌ویک.',
      brands: ['میس‌ویک (Misswake)'],
    },
    {
      id: 'job-rnd-04',
      code: 'RND-STB-04',
      title: 'تکنسین آزمون‌های پایداری و فیزیکوشیمیایی',
      level: 'تکنسین',
      employmentType: 'تمام‌وقت',
      location: 'آزمایشگاه پایداری البرز',
      headcountEst: 4,
      isOpenVacancy: false,
      summary: 'تست‌های تسریع‌شده حرارتی، ویسکوزیته، pH و پایداری لایه‌ای بالک‌ها در شرایط تنش‌زا.',
      brands: ['کلیه برندها'],
    },
  ],

  // 3. Marketing & Brands
  'dept-mkt': [
    {
      id: 'job-mkt-01',
      code: 'MKT-BM-01',
      title: 'مدیر ارشد برند دافی (Brand Manager - Dafi)',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران - خیابان ولیعصر',
      headcountEst: 2,
      isOpenVacancy: false,
      summary: 'رهبری استراتژی ۳۶۰ درجه کمپین‌های تبلیغاتی، بسته‌بندی، سهم بازار و رویدادهای فصلی دافی.',
      brands: ['دافی (Dafi)'],
    },
    {
      id: 'job-mkt-02',
      code: 'MKT-DIG-02',
      title: 'کارشناس ارشد دیجیتال مارکتینگ و پرفورمنس',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت شناور',
      location: 'ستاد مرکزی تهران',
      headcountEst: 4,
      isOpenVacancy: true,
      summary: 'مدیریت بودجه کمپین‌های دیجیتال، سئو، اینفلوئنسر مارکتینگ و تحلیل نرخ بازگشت سرمایه تبلیغات.',
      brands: ['دافی', 'کامان', 'میس‌ویک'],
    },
    {
      id: 'job-mkt-03',
      code: 'MKT-DES-03',
      title: 'طراح گرافیک ارشد و بسته‌بندی محصولات (Packaging Designer)',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت',
      location: 'استودیو دیزاین دفتر مرکزی',
      headcountEst: 3,
      isOpenVacancy: false,
      summary: 'طراحی لیبل، بطری، جعبه‌های صادراتی و استندهای فروشگاهی منطبق با ترندهای روز بین‌المللی.',
      brands: ['تمامی محصولات'],
    },
    {
      id: 'job-mkt-04',
      code: 'MKT-CNT-04',
      title: 'کارشناس تولید محتوا و شبکه‌های اجتماعی',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'تیم رسانه دفتر مرکزی',
      headcountEst: 5,
      isOpenVacancy: false,
      summary: 'تولید سناریوهای ویدیویی، موشن‌گرافیک و پاسخگویی به تعاملات کاربران در شبکه‌های اجتماعی برندها.',
      brands: ['دافی', 'کامان'],
    },
  ],

  // 4. Sales & Distribution
  'dept-sales': [
    {
      id: 'job-sal-01',
      code: 'SAL-REG-01',
      title: 'مدیر فروش منطقه‌ای و شعب استانی (Regional Sales Manager)',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت و ماموریت استانی',
      location: 'ستاد فروش تهران و شعب کشور',
      headcountEst: 8,
      isOpenVacancy: false,
      summary: 'تحقق تارگت‌های ریالی و تعدادی ۳۱ شعبه استانی، نظارت بر ناوگان فروش و وصول مطالبات.',
      brands: ['سبد کامل محصولات'],
    },
    {
      id: 'job-sal-02',
      code: 'SAL-HYP-02',
      title: 'سرپرست فروش فروشگاه‌های زنجیره‌ای (Key Account Manager)',
      level: 'سرپرستی',
      employmentType: 'تمام‌وقت',
      location: 'شعبه مرکزی تهران',
      headcountEst: 6,
      isOpenVacancy: true,
      summary: 'مذاکره شلف و قرارداد با افق کوروش، هایپرمی، اتکا، رفاه و توسعه سهم قفسه محصولات.',
      brands: ['دافی', 'کامان', 'میس‌ویک'],
    },
    {
      id: 'job-sal-03',
      code: 'SAL-PHR-03',
      title: 'کارشناس ارشد فروش کانال داروخانه‌ای (Pharmacy Channel)',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت میدانی',
      location: 'تهران و مراکز استان‌ها',
      headcountEst: 14,
      isOpenVacancy: true,
      summary: 'ویزیت تخصصی داروخانه‌های ممتاز و درمانگاه‌ها جهت عرضه محصولات درمانی پوست و دهان.',
      brands: ['کامان درمانی', 'میس‌ویک'],
    },
    {
      id: 'job-sal-04',
      code: 'SAL-VIS-04',
      title: 'ویزیتور حضوری توزیع مویرگی (FMCG Sales Rep)',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت میدانی',
      location: 'شعب سراسر کشور (۳۱ استان)',
      headcountEst: 280,
      isOpenVacancy: true,
      summary: 'ویزیت منظم فروشگاه‌های آرایشی و بهداشتی، ثبت آنی سفارش با تبلت و پیگیری تحویل بار.',
      brands: ['محصولات سلولزی و بهداشتی'],
    },
  ],

  // 5. Supply Chain & Logistics
  'dept-scm': [
    {
      id: 'job-scm-01',
      code: 'SCM-BUY-01',
      title: 'مدیر تدارکات و خرید مواد اولیه خارجی (Procurement Manager)',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      headcountEst: 2,
      isOpenVacancy: false,
      summary: 'تامین اسانس‌های سوئیسی، مواد موثره فرمولاسیون و ماشین‌آلات مدرن بسته‌بندی با ارزیابی تامین‌کنندگان.',
      brands: ['کلیه مواد اولیه هلدینگ'],
    },
    {
      id: 'job-scm-02',
      code: 'SCM-CUS-02',
      title: 'کارشناس ارشد ترخیص گمرکی و بازرگانی خارجی',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت اداری و گمرکی',
      location: 'گمرکات ورودی و دفتر مرکزی',
      headcountEst: 4,
      isOpenVacancy: true,
      summary: 'ثبت آماری سفارشات در سامانه جامع تجارت، اخذ تخصیص ارز و ترخیص سریع مواد از بنادر و گمرکات.',
      brands: ['واردات هلدینگ'],
    },
    {
      id: 'job-scm-03',
      code: 'SCM-WMS-03',
      title: 'سرپرست انبار مکانیزه مرکزی شورآباد (WMS Supervisor)',
      level: 'سرپرستی',
      employmentType: 'نوبت‌کاری انبارداری',
      location: 'مجتمع انبارهای شورآباد',
      headcountEst: 5,
      isOpenVacancy: false,
      summary: 'مدیریت بارگیری روزانه تریلی‌ها به مقصد شعب استانی و کنترل موجودی انبار با سیستم بارکدینگ.',
      brands: ['محصولات نهایی و کارتن'],
    },
    {
      id: 'job-scm-04',
      code: 'SCM-LOG-04',
      title: 'کارشناس لجستیک و هماهنگی ناوگان باربری سراسری',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'انبار شورآباد / دفتر لجستیک',
      headcountEst: 6,
      isOpenVacancy: false,
      summary: 'هماهنگی روزانه صدها تن بار با پایانه‌های حمل‌ونقل و رصد لحظه‌ای تحویل کالا به شعب توزیع مویرگی.',
      brands: ['ناوگان سراسری هلدینگ'],
    },
  ],

  // 6. Quality Assurance & Control
  'dept-qc': [
    {
      id: 'job-qc-01',
      code: 'QC-DIR-01',
      title: 'مدیر تضمین کیفیت و استانداردهای غذا و دارو (QA Director)',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'کارخانجات اشتهارد',
      headcountEst: 1,
      isOpenVacancy: false,
      summary: 'پیاده‌سازی استانداردهای GMP آرایشی، پاسخگویی به ممیزی‌های وزارت بهداشت و تایید پروتکل‌های اعتبارسنجی.',
      brands: ['کلیه خطوط تولیدی'],
    },
    {
      id: 'job-qc-02',
      code: 'QC-MIC-02',
      title: 'کارشناس ارشد میکروبیولوژی و کنترل بهداشتی',
      level: 'کارشناسی ارشد',
      employmentType: 'شیفت هماهنگ با خطوط',
      location: 'آزمایشگاه میکروبی اشتهارد',
      headcountEst: 6,
      isOpenVacancy: true,
      summary: 'آزمون شمارش کلی بار میکروبی، کلی‌فرم، کپک و مخمر آب دیونیزه و بالک محصولات قبل از بسته‌بندی.',
      brands: ['دافی', 'کامان'],
    },
    {
      id: 'job-qc-03',
      code: 'QC-IPQ-03',
      title: 'کارشناس کنترل کیفیت حین فرآیند (IPQC Specialist)',
      level: 'کارشناسی',
      employmentType: '۳ نوبت کاری خطوط',
      location: 'سالن‌های تولید کارخانه اشتهارد',
      headcountEst: 14,
      isOpenVacancy: true,
      summary: 'نمونه‌برداری تصادفی ساعتی از خط تولید دافی، بررسی گرماژ، حجم لوسیون و سیلینگ صحیح بسته‌بندی.',
      brands: ['دافی', 'میس‌ویک'],
    },
    {
      id: 'job-qc-04',
      code: 'QC-LAB-04',
      title: 'تکنسین آزمایشگاه شیمی و سنجش فیزیکی مواد اولیه',
      level: 'تکنسین',
      employmentType: 'روزکار',
      location: 'آزمایشگاه شیمیایی اشتهارد',
      headcountEst: 5,
      isOpenVacancy: false,
      summary: 'سنجش چگالی، درصد خلوص، تست رسوب و انطباق اسانس‌ها و سورفکتانت‌های ورودی با استاندارد COA.',
      brands: ['مواد ورودی کارخانجات'],
    },
  ],

  // 7. Human Resources & People Ops
  'dept-hr': [
    {
      id: 'job-hr-01',
      code: 'HR-DIR-01',
      title: 'معاونت منابع انسانی و توسعه سرمایه انسانی هلدینگ',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت سازمانی',
      location: 'ستاد مرکزی - طبقه ۴',
      headcountEst: 1,
      isOpenVacancy: false,
      summary: 'هدایت استراتژی جذب، توانمندسازی، جبران خدمات و فرهنگ سازمانی برای بیش از ۱۳۵۰ همکار هلدینگ.',
      brands: ['ستاد و کارخانجات تابعه'],
    },
    {
      id: 'job-hr-02',
      code: 'HR-REC-02',
      title: 'سرپرست جذب، استخدام و مصاحبه شایستگی‌محور (Talent Acquisition)',
      level: 'سرپرستی',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      headcountEst: 3,
      isOpenVacancy: true,
      summary: 'غربالگری هوشمند رزومه‌ها، برگزاری کانون‌های ارزیابی مدیران و کارشناسان و جامعه‌پذیری نیروهای تازه.',
      brands: ['جذب ستاد و شعب'],
    },
    {
      id: 'job-hr-03',
      code: 'HR-CMP-03',
      title: 'کارشناس ارشد جبران خدمات و حقوق و دستمزد قانون کار (C&B)',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      headcountEst: 3,
      isOpenVacancy: false,
      summary: 'محاسبه دقیق فیش حقوقی طبق قانون کار، مالیات حقوق ماده ۸۴، بیمه تامین اجتماعی و طرح طبقه‌بندی مشاغل.',
      brands: ['پرسنل ستادی و تولیدی'],
    },
    {
      id: 'job-hr-04',
      code: 'HR-OPS-04',
      title: 'کارشناس امور اداری، قراردادها و رفاهیات پرسنلی',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'دفتر کارخانجات اشتهارد',
      headcountEst: 4,
      isOpenVacancy: false,
      summary: 'تنظیم قراردادهای کار، پیگیری معاینات طب کار، تمدید بیمه تکمیلی درمان و رسیدگی به امور رفاهی کارگران.',
      brands: ['کارخانجات اشتهارد'],
    },
  ],

  // 8. Finance & Accounting
  'dept-fin': [
    {
      id: 'job-fin-01',
      code: 'FIN-DIR-01',
      title: 'مدیر ارشد مالی و حسابداری صنعتی کارخانجات',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      headcountEst: 1,
      isOpenVacancy: false,
      summary: 'نظارت بر جریان وجوه نقد، گزارش‌های مالیاتی، دفاعیات هیئت حل اختلاف و بهای تمام‌شده محصولات.',
      brands: ['هلدینگ سیلانه سبز'],
    },
    {
      id: 'job-fin-02',
      code: 'FIN-CST-02',
      title: 'رئیس حسابداری صنعتی و بهای تمام‌شده کالا (Cost Accounting)',
      level: 'سرپرستی',
      employmentType: 'تمام‌وقت',
      location: 'کارخانجات اشتهارد و ستاد',
      headcountEst: 3,
      isOpenVacancy: true,
      summary: 'محاسبه دقیق بهای تمام‌شده هر قلم کالا بر پایه استاندارد مواد، دستمزد مستقیم و سربار جذب‌شده خطوط.',
      brands: ['دافی', 'کامان'],
    },
    {
      id: 'job-fin-03',
      code: 'FIN-TRZ-03',
      title: 'کارشناس ارشد خزانه‌داری و مدیریت نقدینگی بانکی',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      headcountEst: 3,
      isOpenVacancy: false,
      summary: 'مدیریت اسناد دریافتنی و پرداختنی، صدور چک‌های صیادی و تخصیص بهینه خطوط اعتباری بانکی.',
      brands: ['کلیه واحدهای تابعه'],
    },
    {
      id: 'job-fin-04',
      code: 'FIN-GEN-04',
      title: 'کارشناس حسابداری عمومی و اسناد مالی',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'ستاد تهران',
      headcountEst: 5,
      isOpenVacancy: false,
      summary: 'ثبت اسناد هزینه، تطبیق حساب‌های بانکی و بارگذاری صورت معاملات فصلی ماده ۱۶۹ مکرر.',
      brands: ['ستاد هلدینگ'],
    },
  ],

  // 9. IT & Digital Transformation
  'dept-it': [
    {
      id: 'job-it-01',
      code: 'IT-ARC-01',
      title: 'معمار ارشد نرم‌افزار و سامانه‌های یکپارچه سازمانی',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران - واحد فناوری',
      headcountEst: 2,
      isOpenVacancy: false,
      summary: 'طراحی معماری نرم‌افزارهای داخلی هلدینگ، یکپارچه‌سازی سرویس‌های ابری و استانداردسازی کدبیس.',
      brands: ['سامانه‌های یکپارچه کارا'],
    },
    {
      id: 'job-it-02',
      code: 'job-1', // maps to active job in jobs!
      title: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت (حضوری / منعطف)',
      location: 'تهران، پارک فناوری پردیس / ستاد مرکزی',
      headcountEst: 4,
      isOpenVacancy: true,
      activeJobId: 'job-1',
      applicationsCount: 8,
      summary: 'توسعه رابط‌های کاربری مدرن سامانه جامع منابع انسانی کارا، بهینه‌سازی وب‌اپلیکیشن‌ها و تعاملات راست‌چین RTL.',
      brands: ['پلتفرم جامع کارا'],
    },
    {
      id: 'job-it-03',
      code: 'IT-OPS-03',
      title: 'کارشناس ارشد دواپس و زیرساخت شبکه کارخانجات (DevOps)',
      level: 'کارشناسی ارشد',
      employmentType: 'روزکار و آماده‌باش شیفت',
      location: 'ستاد تهران و کارخانجات اشتهارد',
      headcountEst: 3,
      isOpenVacancy: false,
      summary: 'راه‌اندازی خطوط CI/CD، مانیتورینگ سرورها، ارتباط فیبر نوری پایدار و امنیت داده‌های پرسنلی.',
      brands: ['زیرساخت ابری و فیزیکی'],
    },
    {
      id: 'job-it-04',
      code: 'IT-SUP-04',
      title: 'کارشناس پشتیبانی شبکه، سخت‌افزار و دوربین مداربسته',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'کارخانجات اشتهارد و انبار شورآباد',
      headcountEst: 5,
      isOpenVacancy: true,
      summary: 'پشتیبانی تجهیزات سخت‌افزاری کاربران، سیستم‌های حضور و غیاب کارخانه و سامانه‌های نظارت تصویری.',
      brands: ['سایت‌های تولیدی و انبارها'],
    },
  ],

  // 10. Legal & Regulatory Affairs
  'dept-legal': [
    {
      id: 'job-leg-01',
      code: 'LEG-ADV-01',
      title: 'مشاور ارشد حقوقی و مدیر قراردادهای تجاری هلدینگ',
      level: 'مدیریت',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      headcountEst: 1,
      isOpenVacancy: false,
      summary: 'تنظیم قراردادهای نمایندگی انحصاری صادرات، قراردادهای خرید خطوط تولید و حراست از حقوق معنوی.',
      brands: ['حقوقی کل هلدینگ'],
    },
    {
      id: 'job-leg-02',
      code: 'LEG-REG-02',
      title: 'کارشناس پیگیری پروانه‌های بهداشتی و رگولاتوری غذا و دارو',
      level: 'کارشناسی ارشد',
      employmentType: 'تمام‌وقت',
      location: 'ستاد تهران و سازمان غذا و دارو',
      headcountEst: 3,
      isOpenVacancy: true,
      summary: 'اخذ پروانه‌های ساخت (IRC)، تمدید پروانه‌های بهداشتی دوره‌ای محصولات دافی، کامان و میس‌ویک.',
      brands: ['دافی', 'کامان', 'میس‌ویک'],
    },
    {
      id: 'job-leg-03',
      code: 'LEG-IP-03',
      title: 'کارشناس ثبت علائم تجاری و مالکیت معنوی برندها',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'دفتر حقوقی ستاد مرکزی',
      headcountEst: 2,
      isOpenVacancy: false,
      summary: 'ثبت برندها و اختراعات فرمولاسیون، مقابله با کالاهای تقلبی در بازار و دعاوی مالکیت فکری.',
      brands: ['کلیه علائم تجاری هلدینگ'],
    },
    {
      id: 'job-leg-04',
      code: 'LEG-LAB-04',
      title: 'کارشناس روابط کار و دعاوی کارگری (اداره کار)',
      level: 'کارشناسی',
      employmentType: 'تمام‌وقت',
      location: 'ستاد تهران و استان البرز',
      headcountEst: 2,
      isOpenVacancy: false,
      summary: 'پاسخگویی به دعاوی مطروحه در هیئت‌های تشخیص و حل اختلاف کارگری و تنظیم لوایح دفاعیه حقوقی.',
      brands: ['کارخانجات و شعب'],
    },
  ],
};

export const DepartmentJobsExplorer: React.FC<DepartmentJobsExplorerProps> = ({
  departments = [],
  jobs = [],
  employees = [],
  onNavigate,
  className = '',
}) => {
  // Use either the passed departments or fallback to a standard list if empty
  const displayDepartments = useMemo(() => {
    if (departments && departments.length > 0) return departments;
    return [
      { id: 'dept-prod', name: 'کارخانجات تولیدی و ساخت اشتهارد (دافی و کامان)', englishName: 'Manufacturing & Plants', category: 'MANUFACTURING' as const, headcount: 480, vacancies: 5, headName: 'مهندس فرشید خسروی', headTitle: 'مدیر ارشد کارخانجات', avatar: '', location: 'اشتهارد', brands: ['دافی', 'کامان'], kpiScore: 96, pendingLeaves: 3, activeProjects: [], description: '' },
      { id: 'dept-rnd', name: 'لابراتوارهای تحقیق، توسعه و فرمولاسیون (R&D)', englishName: 'R&D & Formulation', category: 'R_AND_D' as const, headcount: 34, vacancies: 2, headName: 'دکتر مونا کاظمی', headTitle: 'مدیر تحقیق و توسعه', avatar: '', location: 'البرز', brands: ['کامان', 'میس‌ویک'], kpiScore: 98, pendingLeaves: 1, activeProjects: [], description: '' },
      { id: 'dept-mkt', name: 'مارکتینگ، روابط عمومی و برندها', englishName: 'Marketing & Brands', category: 'MARKETING' as const, headcount: 68, vacancies: 5, headName: 'سرکار خانم صدف آریافر', headTitle: 'معاونت مارکتینگ', avatar: '', location: 'تهران ولیعصر', brands: ['دافی', 'کامان', 'میس‌ویک'], kpiScore: 92, pendingLeaves: 2, activeProjects: [], description: '' },
      { id: 'dept-sales', name: 'فروش سراسری و توزیع مویرگی (FMCG Sales)', englishName: 'National Sales', category: 'SALES' as const, headcount: 580, vacancies: 14, headName: 'مهندس محمدرضا شایگان', headTitle: 'معاونت فروش', avatar: '', location: '۳۱ استان', brands: ['سبد کامل محصولات'], kpiScore: 95, pendingLeaves: 4, activeProjects: [], description: '' },
      { id: 'dept-scm', name: 'زنجیره تامین، بازرگانی و لجستیک', englishName: 'Supply Chain & Logistics', category: 'SUPPLY_CHAIN' as const, headcount: 95, vacancies: 3, headName: 'مهندس کامران جمشیدی', headTitle: 'مدیر زنجیره تامین', avatar: '', location: 'شورآباد', brands: ['مواد اولیه و ناوگان'], kpiScore: 91, pendingLeaves: 1, activeProjects: [], description: '' },
      { id: 'dept-qc', name: 'کنترل کیفیت و تضمین کیفیت (QA & QC)', englishName: 'QA & QC', category: 'QUALITY' as const, headcount: 45, vacancies: 2, headName: 'مهندس شیما رستمی', headTitle: 'مدیر تضمین کیفیت', avatar: '', location: 'اشتهارد', brands: ['کلیه خطوط'], kpiScore: 99, pendingLeaves: 0, activeProjects: [], description: '' },
      { id: 'dept-hr', name: 'مدیریت منابع انسانی و فرهنگ سازمانی', englishName: 'HR & People Ops', category: 'HR' as const, headcount: 24, vacancies: 2, headName: 'مهندس کیوان سهرابی', headTitle: 'معاونت منابع انسانی', avatar: '', location: 'ستاد طبقه ۴', brands: ['کل هلدینگ'], kpiScore: 97, pendingLeaves: 0, activeProjects: [], description: '' },
      { id: 'dept-fin', name: 'امور مالی و حسابداری صنعتی', englishName: 'Finance & Accounting', category: 'FINANCE' as const, headcount: 38, vacancies: 1, headName: 'حمیدرضا نیک‌بین', headTitle: 'مدیر مالی', avatar: '', location: 'تهران', brands: ['واحدهای تابعه'], kpiScore: 94, pendingLeaves: 1, activeProjects: [], description: '' },
      { id: 'dept-it', name: 'فناوری اطلاعات و تحول دیجیتال', englishName: 'IT & Digital', category: 'IT' as const, headcount: 31, vacancies: 3, headName: 'مهندس پوریا راد', headTitle: 'مدیر ارشد فناوری', avatar: '', location: 'ستاد مرکزی', brands: ['سامانه کارا'], kpiScore: 96, pendingLeaves: 1, activeProjects: [], description: '' },
      { id: 'dept-legal', name: 'امور حقوقی و رگولاتوری غذا و دارو', englishName: 'Legal & Regulatory', category: 'LEGAL' as const, headcount: 14, vacancies: 1, headName: 'دکتر علیرضا معتمد', headTitle: 'مشاور حقوقی', avatar: '', location: 'تهران', brands: ['علائم و پروانه‌ها'], kpiScore: 98, pendingLeaves: 0, activeProjects: [], description: '' },
    ];
  }, [departments]);

  // Selected or active department (default to first department)
  const [activeDeptId, setActiveDeptId] = useState<string>(() => displayDepartments[0]?.id || 'dept-prod');
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'HIRING' | 'MGMT' | 'SPECIALIST' | 'TECH'>('ALL');

  // Active department object
  const activeDept = useMemo(() => {
    return displayDepartments.find((d) => d.id === activeDeptId) || displayDepartments[0];
  }, [displayDepartments, activeDeptId]);

  // Merge predefined subordinate jobs with any active jobs matching this department from the jobs prop
  const currentDepartmentJobs = useMemo(() => {
    if (!activeDept) return [];

    // Find predefined jobs for this dept
    let list: SubordinateJob[] = DEFAULT_SUBORDINATE_JOBS[activeDept.id] || [];

    // If not found by ID, try matching by category or keywords
    if (list.length === 0) {
      const matchKey = Object.keys(DEFAULT_SUBORDINATE_JOBS).find((k) => {
        if (activeDept.category && k.toLowerCase().includes(activeDept.category.toLowerCase().substring(0, 3))) return true;
        if (activeDept.name.includes('تولید') && k.includes('prod')) return true;
        if (activeDept.name.includes('تحقیق') && k.includes('rnd')) return true;
        if (activeDept.name.includes('مارکت') && k.includes('mkt')) return true;
        if (activeDept.name.includes('فروش') && k.includes('sale')) return true;
        if (activeDept.name.includes('تامین') && k.includes('scm')) return true;
        if (activeDept.name.includes('کیفیت') && k.includes('qc')) return true;
        if (activeDept.name.includes('انسانی') && k.includes('hr')) return true;
        if (activeDept.name.includes('مالی') && k.includes('fin')) return true;
        if (activeDept.name.includes('فناوری') && k.includes('it')) return true;
        if (activeDept.name.includes('حقوق') && k.includes('legal')) return true;
        return false;
      });
      if (matchKey) {
        list = DEFAULT_SUBORDINATE_JOBS[matchKey];
      }
    }

    // Clone list so we can enrich
    const enrichedList: SubordinateJob[] = list.map((job) => ({ ...job }));

    // Check if any job posting from `jobs` prop matches this department
    if (jobs && jobs.length > 0) {
      const matchingLiveJobs = jobs.filter((j) => {
        const jDept = (j.department || '').toLowerCase();
        const dName = (activeDept.name || '').toLowerCase();
        const dCategory = (activeDept.category || '').toLowerCase();
        return (
          jDept.includes(dName) ||
          dName.includes(jDept) ||
          (dCategory === 'it' && (jDept.includes('فناوری') || jDept.includes('نرم‌افزار'))) ||
          (dCategory === 'hr' && (jDept.includes('منابع انسانی') || jDept.includes('استخدام'))) ||
          (dCategory === 'manufacturing' && (jDept.includes('تولید') || jDept.includes('کارخانه'))) ||
          (dCategory === 'sales' && (jDept.includes('فروش') || jDept.includes('توزیع'))) ||
          (dCategory === 'marketing' && (jDept.includes('مارکتینگ') || jDept.includes('بازاریابی')))
        );
      });

      // Update or prepend live jobs
      matchingLiveJobs.forEach((lj) => {
        const existingIdx = enrichedList.findIndex(
          (item) => item.title.includes(lj.title) || lj.title.includes(item.title)
        );
        if (existingIdx !== -1) {
          enrichedList[existingIdx].isOpenVacancy = lj.status === 'ACTIVE';
          enrichedList[existingIdx].activeJobId = lj.id;
          enrichedList[existingIdx].applicationsCount = lj.applicationsCount;
        } else {
          // Add as a live active job card
          enrichedList.unshift({
            id: lj.id,
            code: `VAC-${lj.id.substring(0, 6).toUpperCase()}`,
            title: lj.title,
            level: lj.title.includes('مدیر') ? 'مدیریت' : lj.title.includes('سرپرست') ? 'سرپرستی' : lj.title.includes('ارشد') ? 'کارشناسی ارشد' : 'کارشناسی',
            employmentType: lj.employmentType || 'تمام‌وقت',
            location: lj.location || activeDept.location || 'ستاد مرکزی تهران',
            headcountEst: 1,
            isOpenVacancy: lj.status === 'ACTIVE',
            activeJobId: lj.id,
            applicationsCount: lj.applicationsCount,
            summary: lj.description?.substring(0, 110) || 'موقعیت شغلی فعال در سامانه جذب و استخدام هلدینگ.',
            brands: activeDept.brands,
          });
        }
      });
    }

    // Apply level filter
    let filtered = enrichedList;
    if (levelFilter === 'HIRING') {
      filtered = filtered.filter((j) => j.isOpenVacancy);
    } else if (levelFilter === 'MGMT') {
      filtered = filtered.filter((j) => j.level === 'مدیریت' || j.level === 'سرپرستی');
    } else if (levelFilter === 'SPECIALIST') {
      filtered = filtered.filter((j) => j.level === 'کارشناسی' || j.level === 'کارشناسی ارشد');
    } else if (levelFilter === 'TECH') {
      filtered = filtered.filter((j) => j.level === 'تکنسین' || j.level === 'اپراتوری');
    }

    // Filter by search term if typed
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      return filtered.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.level.toLowerCase().includes(q) ||
          j.summary.toLowerCase().includes(q) ||
          j.location.toLowerCase().includes(q) ||
          (j.brands && j.brands.some((b) => b.toLowerCase().includes(q)))
      );
    }

    return filtered;
  }, [activeDept, jobs, searchTerm, levelFilter]);

  // Calculate quick summary metrics for current department
  const totalSubJobs = currentDepartmentJobs.length;
  const hiringJobsCount = currentDepartmentJobs.filter((j) => j.isOpenVacancy).length;
  const CategoryIcon = getDepartmentIcon(activeDept.category, activeDept.id);
  const colorTheme = getCategoryColor(activeDept.category);

  return (
    <div className={`w-full flex flex-col gap-3.5 ${className}`} dir="rtl">
      {/* 1. Mobile Department Switcher (Horizontal Carousel for Phone/Tablet) */}
      <div className="lg:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-text-3 font-medium px-1">
          <span className="flex items-center gap-1.5 font-bold text-text-2">
            <Layers className="w-3.5 h-3.5 text-brand" />
            <span>انتخاب دپارتمان سازمانی (لمس کنید):</span>
          </span>
          <span className="text-[11px] font-bold text-brand">{toPersianDigits(displayDepartments.length)} واحد</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin" role="tablist">
          {displayDepartments.map((dept) => {
            const isSelected = dept.id === activeDeptId;
            const IconComponent = getDepartmentIcon(dept.category, dept.id);
            const colors = getCategoryColor(dept.category);

            return (
              <button
                key={dept.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                tabIndex={0}
                onClick={() => setActiveDeptId(dept.id)}
                onTouchStart={() => setActiveDeptId(dept.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer border text-right ${
                  isSelected
                    ? `${colors.bg} ${colors.text} ${colors.border} shadow-sm ring-2 ring-brand/30 font-black scale-102`
                    : 'bg-surface-2/60 hover:bg-surface-2 text-text-2 border-border-default/80'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? colors.bg : 'bg-surface-3/70'}`}>
                  <IconComponent className={`w-3.5 h-3.5 ${isSelected ? colors.text : 'text-text-3'}`} />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="whitespace-nowrap font-bold">
                    {dept.name.length > 20 ? `${dept.name.substring(0, 18)}...` : dept.name}
                  </span>
                  <span className="text-[10px] text-text-3 font-normal flex items-center gap-1">
                    <span>{toPersianDigits(dept.headcount || 0)} نفر</span>
                    {dept.vacancies > 0 && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        • {toPersianDigits(dept.vacancies)} استخدام
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Master-Detail Split Grid (Desktop: Side-by-Side 4:8, Mobile: Stacked) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* RIGHT COLUMN: 10 Main Departments (Instant mouse hover & click selection) */}
        <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 flex-col gap-2 bg-surface-2/30 p-2.5 rounded-2xl border border-border-default/80">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border-default/60 mb-0.5">
            <span className="text-xs font-black text-text-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand" />
              <span>دپارتمان‌های اصلی هلدینگ</span>
            </span>
            <span className="text-[10px] font-bold text-text-3 px-2 py-0.5 rounded-full bg-surface-1 border border-border-default">
              {toPersianDigits(displayDepartments.length)} واحد سازمانی
            </span>
          </div>

          {/* Department List with Instant Hover and Click */}
          <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1 scrollbar-thin">
            {displayDepartments.map((dept) => {
              const isSelected = dept.id === activeDeptId;
              const IconComponent = getDepartmentIcon(dept.category, dept.id);
              const colors = getCategoryColor(dept.category);

              return (
                <div
                  key={dept.id}
                  role="button"
                  tabIndex={0}
                  // Mouse hover immediately switches the view on desktop
                  onMouseEnter={() => setActiveDeptId(dept.id)}
                  // Click or touch also selects
                  onClick={() => setActiveDeptId(dept.id)}
                  onTouchStart={() => setActiveDeptId(dept.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl text-right transition-all duration-150 cursor-pointer border ${
                    isSelected
                      ? `bg-surface-1 ${colors.border} shadow-sm ring-2 ring-brand/25 font-black scale-[1.01]`
                      : 'bg-surface-1/60 hover:bg-surface-1 hover:border-brand/40 border-border-default/80 text-text-2'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? `${colors.bg} ${colors.text} shadow-xs` : 'bg-surface-2 text-text-3 group-hover:text-text-1'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className={`text-xs font-bold leading-tight truncate ${isSelected ? 'text-text-1' : 'text-text-2 group-hover:text-text-1'}`}>
                        {dept.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-3">
                        <span>{toPersianDigits(dept.headcount || 0)} نفر پرسنل</span>
                        {dept.brands && dept.brands.length > 0 && (
                          <span className="text-text-3/80 truncate">• {dept.brands.join('، ')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pr-1">
                    {dept.vacancies > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        <span>{toPersianDigits(dept.vacancies)} استخدام</span>
                      </span>
                    )}
                    <ChevronLeft
                      className={`w-4 h-4 transition-transform ${
                        isSelected ? 'text-brand translate-x-[-2px]' : 'text-text-3/40 group-hover:text-text-3'
                      }`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 text-[10px] text-text-3 bg-surface-1/70 rounded-xl border border-border-default/60 text-center leading-relaxed">
            💡 ماوس را روی هر دپارتمان ببرید تا شغل‌های زیرمجموعه آن فوری نمایش داده شود.
          </div>
        </div>

        {/* LEFT COLUMN: Subordinate Jobs Panel */}
        <div className="col-span-1 lg:col-span-8 xl:col-span-8 flex flex-col gap-3 bg-surface-2/20 p-3 sm:p-4 rounded-2xl border border-border-default">
          {/* Active Department Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorTheme.bg} ${colorTheme.text} border border-current/20 shadow-sm`}>
                <CategoryIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-text-1">
                    {activeDept.name}
                  </h4>
                  {activeDept.englishName && (
                    <span className="text-[10px] text-text-3 font-mono dir-ltr hidden sm:inline-block">
                      ({activeDept.englishName})
                    </span>
                  )}
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${colorTheme.badge}`}>
                    {toPersianDigits(totalSubJobs)} عنوان شغلی سازمانی
                  </span>
                  {hiringJobsCount > 0 && (
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span>{toPersianDigits(hiringJobsCount)} موقعیت در حال جذب</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[11px] text-text-3 flex-wrap">
                  {activeDept.headName && (
                    <span className="flex items-center gap-1 text-text-2">
                      <UserCheck className="w-3.5 h-3.5 text-brand" />
                      <span>مدیر واحد: <strong className="font-bold text-text-1">{activeDept.headName}</strong></span>
                      {activeDept.headTitle && <span className="opacity-80">({activeDept.headTitle})</span>}
                    </span>
                  )}
                  {activeDept.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-text-3" />
                      <span>{activeDept.location}</span>
                    </span>
                  )}
                  {activeDept.brands && activeDept.brands.length > 0 && (
                    <span className="flex items-center gap-1 text-brand font-medium">
                      <span>برندها: {activeDept.brands.join('، ')}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Search Input */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-text-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="جستجوی شغل یا سمت..."
                className="w-full pl-3 pr-8 py-1.5 text-xs bg-surface-1 rounded-xl border border-border-default focus:border-brand focus:ring-1 focus:ring-brand outline-none text-text-1 placeholder:text-text-3"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-text-3 hover:text-text-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
            <button
              type="button"
              onClick={() => setLevelFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                levelFilter === 'ALL'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface-1 text-text-3 hover:text-text-1 border border-border-default'
              }`}
            >
              همه رده‌ها
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('HIRING')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                levelFilter === 'HIRING'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-surface-1 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 border border-emerald-500/30'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              <span>در حال استخدام</span>
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('MGMT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                levelFilter === 'MGMT'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface-1 text-text-3 hover:text-text-1 border border-border-default'
              }`}
            >
              مدیریت و سرپرستی
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('SPECIALIST')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                levelFilter === 'SPECIALIST'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface-1 text-text-3 hover:text-text-1 border border-border-default'
              }`}
            >
              کارشناسی و کارشناسی ارشد
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter('TECH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                levelFilter === 'TECH'
                  ? 'bg-brand text-white shadow-xs'
                  : 'bg-surface-1 text-text-3 hover:text-text-1 border border-border-default'
              }`}
            >
              تکنسین و عملیاتی
            </button>
          </div>

          {/* Subordinate Jobs Grid */}
          {currentDepartmentJobs.length === 0 ? (
            <div className="text-center py-8 text-text-3 text-xs bg-surface-1/50 rounded-xl border border-dashed border-border-default">
              عنوانی مطابق با جستجو یا فیلتر انتخابی در این دپارتمان یافت نشد.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
              {currentDepartmentJobs.map((job) => {
                const levelBadge = getLevelBadgeClass(job.level);

                return (
                  <div
                    key={job.id}
                    className={`p-3 rounded-xl border transition-all text-right flex flex-col justify-between gap-2.5 ${
                      job.isOpenVacancy
                        ? 'bg-surface-1 hover:bg-surface-1/90 border-emerald-500/40 shadow-xs ring-1 ring-emerald-500/20'
                        : 'bg-surface-1/80 hover:bg-surface-1 border-border-default hover:border-brand/30'
                    }`}
                  >
                    {/* Top row: Title + Level + Hiring status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <span className="text-xs font-black text-text-1 leading-snug">
                          {job.title}
                        </span>
                        <span className="text-[10px] font-mono text-text-3 mt-0.5">
                          کد رده: {job.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 flex-col items-end">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${levelBadge}`}>
                          {job.level}
                        </span>
                        {job.isOpenVacancy ? (
                          <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                            در حال جذب
                          </span>
                        ) : (
                          <span className="text-[9px] text-text-3 font-medium">
                            تصدی فعال
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary / Responsibilities */}
                    <p className="text-[11px] text-text-3 leading-relaxed line-clamp-2">
                      {job.summary}
                    </p>

                    {/* Bottom Meta & Action */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-default/60 text-[10px] text-text-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-text-2">
                          <MapPin className="w-3 h-3 text-text-3" />
                          <span className="truncate max-w-[120px]">{job.location}</span>
                        </span>
                        <span className="hidden sm:inline-block">•</span>
                        <span className="flex items-center gap-1 text-text-3">
                          <Clock className="w-3 h-3" />
                          <span>{job.employmentType}</span>
                        </span>
                      </div>

                      {/* If open vacancy, show button to navigate to recruitment module */}
                      {job.isOpenVacancy && onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('recruitment')}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline cursor-pointer shrink-0"
                          title="مشاهده فرآیند استخدام این شغل"
                        >
                          <span>ثبت / رزومه‌ها</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-text-3 font-semibold">
                          {toPersianDigits(job.headcountEst)} شاغل فعال
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Help Tip & Link */}
          <div className="flex items-center justify-between text-[11px] text-text-3 pt-1 border-t border-border-default/50">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-brand" />
              <span>نکته: با بردن ماوس روی نام دپارتمان‌ها یا لمس آن‌ها، عناوین شغلی بلافاصله به‌روزرسانی می‌شوند.</span>
            </span>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('employees')}
                className="text-brand hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <span>مشاهده چارت پرسنلی کامل</span>
                <ChevronLeft className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
