import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  CalendarDays,
  CalendarRange,
  Kanban,
  Table as TableIcon,
  FileText,
  Plus,
  Search,
  Filter,
  Flame,
  AlertCircle,
  MoreVertical,
  Trash2,
  CheckSquare,
  ChevronRight,
  ChevronLeft,
  User,
  Tag,
  ArrowUpRight,
  Sparkles,
  Layers,
  RotateCcw,
  X,
  Building2,
  Check,
  Percent,
  Bell,
  BellPlus,
  CalendarClock,
  GripVertical,
  Play,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  Employee,
  HRReminderItem,
  HRTaskCategory,
  HRTaskPriority,
  HRTaskStatus,
  HRWorkspaceTask,
  UserRole,
} from '../../types';
import {
  getTodayJalali,
  formatJalaliDate,
  toPersianDigits,
  JALALI_MONTH_NAMES,
  JALALI_WEEK_DAYS,
} from '../../utils/jalali';
import { showToast } from '../common/Toast';
import { PomodoroFocusModal } from './PomodoroFocusModal';
import { RemindersBoxModal } from './RemindersBoxModal';
import { RescheduleTaskModal } from './RescheduleTaskModal';

export type WorkspaceViewMode = 'day' | 'week' | 'month' | 'board' | 'table' | 'docs';

interface HRWorkspaceModuleProps {
  employees?: Employee[];
  currentRole?: UserRole;
  onNavigateToModule?: (moduleKey: string) => void;
}

// Category Configuration & Colors
export const CATEGORY_CONFIG: Record<
  HRTaskCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  RECRUITMENT: {
    label: 'جذب و استخدام',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-500/30',
  },
  PAYROLL: {
    label: 'حقوق و دستمزد',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-500/30',
  },
  LEGAL_CONTRACTS: {
    label: 'قراردادها و امور حقوقی',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  FACTORY_OPS: {
    label: 'تردد و کارخانجات',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-500/30',
  },
  TRAINING_GMP: {
    label: 'آموزش و استاندارد GMP',
    bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-500/30',
  },
  WELFARE_EVENTS: {
    label: 'رفاهی و مناسبت‌ها',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  PERFORMANCE: {
    label: 'ارزیابی عملکرد و OKR',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-500/30',
  },
  GENERAL_ADMIN: {
    label: 'امور اداری و هلدینگ',
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-500/30',
  },
};

// Priority Configuration
export const PRIORITY_CONFIG: Record<
  HRTaskPriority,
  { label: string; color: string; badge: string }
> = {
  URGENT: {
    label: 'فوری و حیاتی',
    color: 'text-rose-600 dark:text-rose-400',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  HIGH: {
    label: 'اولویت بالا',
    color: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  MEDIUM: {
    label: 'متوسط',
    color: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
  },
  LOW: {
    label: 'عادی',
    color: 'text-slate-500',
    badge: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
  },
};

// Status Configuration (Notion Board Columns)
export const STATUS_CONFIG: Record<
  HRTaskStatus,
  { label: string; bg: string; dot: string; border: string }
> = {
  TODO: {
    label: 'در انتظار انجام (To Do)',
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    dot: 'bg-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
  },
  IN_PROGRESS: {
    label: 'در حال انجام (In Progress)',
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    dot: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-900',
  },
  IN_REVIEW: {
    label: 'بررسی و تایید (In Review)',
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    dot: 'bg-amber-500',
    border: 'border-amber-200 dark:border-amber-900',
  },
  DONE: {
    label: 'تکمیل شده (Done)',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-900',
  },
  BLOCKED: {
    label: 'نیازمند پیگیری / مسدود',
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    dot: 'bg-rose-500',
    border: 'border-rose-200 dark:border-rose-900',
  },
};

// Initial Seed Tasks tailored for Seylaneh Sabz Holding (Dafi, Come'on, Misswake)
const INITIAL_TASKS: HRWorkspaceTask[] = [
  {
    id: 'task-1',
    title: 'بررسی و ارسال دیسکت ماهانه بیمه تامین اجتماعی کارخانجات اشتهارد',
    description: 'تطبیق کارکرد پرسنل کارخانه تولیدی دافی و کامان با شعب تامین اجتماعی کرج پیش از پایان مهلت قانونی ماده ۳۹.',
    category: 'PAYROLL',
    status: 'IN_PROGRESS',
    priority: 'URGENT',
    dueDateJalali: '۱۴۰۳/۱۲/۲۸',
    dueTime: '۱۱:۰۰',
    timeframe: 'TODAY',
    assigneeName: 'مهرداد صالحی',
    assigneeRole: 'کارشناس ارشد حقوق و دستمزد',
    tags: ['بیمه تامین اجتماعی', 'کارخانه اشتهارد', 'مهلت قانونی'],
    subtasks: [
      { id: 'sub-1-1', title: 'خروجی کارکرد دستگاه‌های بیومتریک خطوط تولید دافی', completed: true },
      { id: 'sub-1-2', title: 'محاسبه اضافه‌کاری‌های شیفت شب کارخانه', completed: true },
      { id: 'sub-1-3', title: 'تطبیق نرخ ۷٪ سهم بیمه کارگر و ۲۳٪ کارفرما', completed: false },
      { id: 'sub-1-4', title: 'بارگذاری نهایی فایل در پرتال تامین اجتماعی', completed: false },
    ],
    notes: 'توجه: جریمه تاخیر ۲٪ در ماه است، حتما قبل از ظهر تایید مدیر مالی اخذ گردد.',
    createdAtJalali: '۱۴۰۳/۱۲/۲۵',
  },
  {
    id: 'task-2',
    title: 'مصاحبه حضوری مرحله نهایی با کاندیداهای مدیر کنترل کیفیت (QC)',
    description: 'مصاحبه فنی و شایستگی با ۲ نفر برگزیده آزمون غربالگری هوشمند برای برند میسویک.',
    category: 'RECRUITMENT',
    status: 'TODO',
    priority: 'HIGH',
    dueDateJalali: '۱۴۰۳/۱۲/۲۸',
    dueTime: '۱۴:۳۰',
    timeframe: 'TODAY',
    assigneeName: 'سارا تهرانی',
    assigneeRole: 'سرپرست جذب و استخدام',
    tags: ['استخدام', 'کنترل کیفیت', 'میسویک'],
    subtasks: [
      { id: 'sub-2-1', title: 'بررسی گزارش هوش مصنوعی نمره رزومه کاندیداها', completed: true },
      { id: 'sub-2-2', title: 'هماهنگی اتاق کنفرانس طبقه سوم دفتر مرکزی', completed: false },
      { id: 'sub-2-3', title: 'ارسال دعوت‌نامه همراه با لوکیشن و پروتکل ورود', completed: false },
    ],
    notes: 'حضور مدیر محترم تولید در این جلسه الزامی است.',
    createdAtJalali: '۱۴۰۳/۱۲/۲۶',
  },
  {
    id: 'task-3',
    title: 'تهیه و انعقاد متمم قرارداد کارمزد و پاداش فروش فصلی تیم مارکتینگ کامان',
    description: 'تنظیم الحاقیه قرارداد سال جدید با تایید مدیر منابع انسانی و مدیر ارشد فروش برند کامان.',
    category: 'LEGAL_CONTRACTS',
    status: 'IN_REVIEW',
    priority: 'MEDIUM',
    dueDateJalali: '۱۴۰۳/۱۲/۲۹',
    dueTime: '۱۶:۰۰',
    timeframe: 'THIS_WEEK',
    assigneeName: 'علیرضا راد',
    assigneeRole: 'مشاور حقوقی و روابط کار',
    tags: ['قرارداد کار', 'برند کامان', 'الحاقیه'],
    subtasks: [
      { id: 'sub-3-1', title: 'بررسی بندهای پورسانت طبق آیین‌نامه داخلی', completed: true },
      { id: 'sub-3-2', title: 'چاپ فرم‌های متمم در سربرگ هلدینگ', completed: true },
      { id: 'sub-3-3', title: 'اخذ امضای پرسنل و ثبت در بایگانی پرسنلی', completed: false },
    ],
    createdAtJalali: '۱۴۰۳/۱۲/۲۲',
  },
  {
    id: 'task-4',
    title: 'ممیزی ادواری استانداردهای GMP و آموزش بهداشت شغلی کارگران بسته‌بندی دافی',
    description: 'برگزاری کارگاه ۲ ساعته الزامات بهداشت فردی و استانداردهای سازمان غذا و دارو برای پرسنل جدید خط بسته‌بندی دستمال مرطوب.',
    category: 'TRAINING_GMP',
    status: 'TODO',
    priority: 'HIGH',
    dueDateJalali: '۱۴۰۳/۱۲/۲۹',
    dueTime: '۰۹:۳۰',
    timeframe: 'THIS_WEEK',
    assigneeName: 'دکتر کریمی',
    assigneeRole: 'مدیر آموزش و توسعه سرمایه انسانی',
    tags: ['استاندارد GMP', 'آموزش بهداشت', 'کارخانه دافی'],
    subtasks: [
      { id: 'sub-4-1', title: 'هماهنگی سالن آموزش کارخانه اشتهارد', completed: true },
      { id: 'sub-4-2', title: 'آماده‌سازی پمفلت‌های استاندارد اتاق تمیز (Cleanroom)', completed: false },
      { id: 'sub-4-3', title: 'ثبت حضور و غیاب و صدور گواهی پایان دوره', completed: false },
    ],
    createdAtJalali: '۱۴۰۳/۱۲/۲۴',
  },
  {
    id: 'task-5',
    title: 'توزیع هدایا و بن‌های رفاهی مناسبتی پایان سال پرسنل هلدینگ سیلانه سبز',
    description: 'تحویل بسته‌های بهداشتی برندهای دافی، کامان و میسویک همراه با کارتهای هدیه پرسنل کارخانه و دفتر مرکزی.',
    category: 'WELFARE_EVENTS',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDateJalali: '۱۴۰۳/۱۲/۳۰',
    dueTime: '۱۵:۰۰',
    timeframe: 'THIS_WEEK',
    assigneeName: 'مریم یزدانی',
    assigneeRole: 'کارشناس رفاه و انگیزش سازمانی',
    tags: ['بسته‌های رفاهی', 'مناسبتی', 'کلیه پرسنل'],
    subtasks: [
      { id: 'sub-5-1', title: 'تطبیق لیست ۱،۳۵۰ نفر همکاران شاغل با واحد انبار', completed: true },
      { id: 'sub-5-2', title: 'بسته‌بندی و تحویل به سرپرستان شیفت‌های تولیدی', completed: false },
      { id: 'sub-5-3', title: 'اخذ رسید دریافت از رابطین واحدهای ستادی', completed: false },
    ],
    createdAtJalali: '۱۴۰۳/۱۲/۲۰',
  },
  {
    id: 'task-6',
    title: 'جلسه کالیبراسیون و ارزیابی عملکرد پایان سال مدیران میانی (OKR Review)',
    description: 'بررسی شاخص‌های ارزیابی ۳۶۰ درجه و تعیین ارتقاهای سازمانی سال آینده.',
    category: 'PERFORMANCE',
    status: 'TODO',
    priority: 'HIGH',
    dueDateJalali: '۱۴۰۳/۱۲/۲۹',
    dueTime: '۱۳:۰۰',
    timeframe: 'THIS_WEEK',
    assigneeName: 'مهندس حسینی',
    assigneeRole: 'معاونت منابع انسانی',
    tags: ['ارزیابی عملکرد', 'کالیبراسیون', 'OKR'],
    subtasks: [
      { id: 'sub-6-1', title: 'جمع‌آوری نتایج ارزیابی خوداظهاری پرسنل', completed: true },
      { id: 'sub-6-2', title: 'آماده‌سازی نمودار توزیع نرمال نمرات', completed: false },
      { id: 'sub-6-3', title: 'صورت‌جلسه افزایش رتبه‌های شغلی برای هیئت مدیره', completed: false },
    ],
    createdAtJalali: '۱۴۰۳/۱۲/۲۲',
  },
  {
    id: 'task-7',
    title: 'آنبوردینگ و فرآیند خوش‌آمدگویی نیروهای جدید شیفت عصر کارخانه',
    description: 'تحویل کارت تردد، لباس کار سازمانی، کمد اختصاصی و معرفی به سرپرست خط تولید.',
    category: 'FACTORY_OPS',
    status: 'DONE',
    priority: 'MEDIUM',
    dueDateJalali: '۱۴۰۳/۱۲/۲۷',
    dueTime: '۱۶:۰۰',
    timeframe: 'TODAY',
    assigneeName: 'رضا کمالی',
    assigneeRole: 'سرپرست منابع انسانی مستقر در کارخانه',
    tags: ['آنبوردینگ', 'تردد', 'خط تولید'],
    subtasks: [
      { id: 'sub-7-1', title: 'صدور کارت تردد RFID با هماهنگی حراست', completed: true },
      { id: 'sub-7-2', title: 'تحویل چک‌لیست اقلام حفاظت فردی (PPE)', completed: true },
      { id: 'sub-7-3', title: 'توجیه شیفت‌ها و قوانین انضباطی کارگاه', completed: true },
    ],
    createdAtJalali: '۱۴۰۳/۱۲/۲۶',
  },
  {
    id: 'task-8',
    title: 'تجدید مناقصه بیمه درمان تکمیلی سال ۱۴۰۴ پرسنل و خانواده‌ها',
    description: 'استعلام قیمت از شرکت‌های معتبر بیمه (آسیا، ایران، البرز) با پوشش کامل پاراکلینیکی و دندانپزشکی.',
    category: 'WELFARE_EVENTS',
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    dueDateJalali: '۱۴۰۴/۰۱/۱۵',
    dueTime: '۱۲:۰۰',
    timeframe: 'THIS_MONTH',
    assigneeName: 'مریم یزدانی',
    assigneeRole: 'کارشناس رفاه و انگیزش سازمانی',
    tags: ['بیمه تکمیلی', 'مناقصه', 'رفاهی'],
    subtasks: [
      { id: 'sub-8-1', title: 'جمع‌آوری آمار خسارت درمان سال گذشته از بیمه‌گر قبلی', completed: true },
      { id: 'sub-8-2', title: 'تنظیم جدول مقایسه‌ای تعهدات و سقف پوشش‌ها', completed: false },
      { id: 'sub-8-3', title: 'ارائه پیشنهاد به مدیرعامل جهت انتخاب نهایی', completed: false },
    ],
    createdAtJalali: '۱۴۰۳/۱۲/۱۸',
  },
];

// Notion Doc Ready Templates
const NOTION_TEMPLATES = [
  {
    id: 'template-onboarding',
    title: 'چک‌لیست جامع ورود نیروی جدید (کارخانجات سیلانه سبز)',
    category: 'FACTORY_OPS',
    icon: '📋',
    items: [
      'تکمیل فرم اطلاعات فردی و بارگذاری مدارک سجلی و بانکی',
      'انجام معاینات طب کار و دریافت تاییدیه عدم سوء‌پیشینه و سلامت ریوی (ویژه خطوط آرایشی و بهداشتی)',
      'صدور کارت پرسنلی و تعریف اثر انگشت در دستگاه تردد کارخانه اشتهارد/دفتر مرکزی',
      'تحویل روپوش کار بهداشتی، کلاه، دستکش و کفش ایمنی دارای تاییدیه HSE',
      'جلسه توجیهی ۴۵ دقیقه‌ای فرهنگ سازمانی و قوانین داخلی هلدینگ سیلانه سبز',
      'معرفی رسمی به مدیر واحد و مربی راهنما (Buddy) برای هفته نخست',
    ],
  },
  {
    id: 'template-payroll-closing',
    title: 'دستورالعمل بستن حقوق پایان ماه و صدور دیسکت تامین اجتماعی',
    category: 'PAYROLL',
    icon: '💰',
    items: [
      'فراخوانی ترددهای روزانه از سرورهای کارخانه تا تاریخ ۲۴ هر ماه شمسی',
      'تطبیق و تایید مرخصی‌های ساعتی و روزانه ثبت‌شده با امضای سرپرست واحد',
      'اعمال نوبت‌کاری (صبح، عصر، شب) و کشیک‌های ادواری جمعه‌کاری',
      'محاسبه معافیت‌های مالیاتی بر اساس سقف قانون بودجه سالانه',
      'تولید فایل‌های استاندارد DSKKAR00.DBF و DSKWOR00.DBF برای شعبه تامین اجتماعی',
      'صدور و ارسال فیش‌های حقوق الکترونیکی به پنل پرسنلی کارکنان',
    ],
  },
  {
    id: 'template-gmp-audit',
    title: 'چک‌لیست ممیزی بهداشت حرفه‌ای و الزامات GMP کارخانه دافی و کامان',
    category: 'TRAINING_GMP',
    icon: '🧴',
    items: [
      'بررسی تمدید کارت بهداشت ۶ ماهه کلیه نیروهای شاغل در سالن‌های تولید',
      'پایش دما و رطوبت انبار مواد اولیه و انبار محصول نهایی طبق استاندارد cGMP',
      'بررسی عملکرد هوارسان‌ها و فیلترهای هپا در سالن پرکنی و فرمولاسیون',
      'ثبت و مستندسازی کالیبراسیون تجهیزات توزین و مخلوط‌کن‌های صنعتی',
      'توزیع چک‌لیست خودارزیابی روزانه بین سرپرستان خطوط بسته‌بندی',
    ],
  },
];

// Persistence Keys
const TASKS_STORAGE_KEY = 'seylaneh_hr_workspace_tasks_v1';
const REMINDERS_STORAGE_KEY = 'seylaneh_hr_reminders_v1';

const INITIAL_REMINDERS: HRReminderItem[] = [
  {
    id: 'rem-1',
    title: 'ارسال دیسکت بیمه تامین اجتماعی شعبه اشتهارد (مهلت قانونی)',
    dueDateJalali: '1403/12/28',
    dueTime: '10:00',
    isCompleted: false,
    priority: 'URGENT',
    category: 'PAYROLL',
    note: 'جلوگیری از جریمه ۱۰ درصدی عدم ارسال به موقع لیست پرسنل کارخانجات',
  },
  {
    id: 'rem-2',
    title: 'مصاحبه حضوری سرپرست شیفت شب کارخانه دافی',
    dueDateJalali: '1403/12/20',
    dueTime: '14:30',
    isCompleted: false,
    priority: 'HIGH',
    category: 'RECRUITMENT',
    note: 'اتاق جلسات اداری اشتهارد با حضور مدیر کارخانه',
  },
  {
    id: 'rem-3',
    title: 'تمدید قراردادهای ۳ ماهه دوره آزمایشی پرسنل جدید کامان',
    dueDateJalali: '1403/12/25',
    dueTime: '11:00',
    isCompleted: false,
    priority: 'HIGH',
    category: 'LEGAL_CONTRACTS',
    note: 'تطبیق با فرم‌های ارزیابی عملکرد سرپرستان خطوط تولید',
  },
  {
    id: 'rem-4',
    title: 'ممیزی ادواری گواهی سلامت و کارت بهداشت سالن بسته‌بندی میسویک',
    dueDateJalali: '1403/12/22',
    dueTime: '09:00',
    isCompleted: false,
    priority: 'MEDIUM',
    category: 'TRAINING_GMP',
    note: 'الزام بازرسی معاونت غذا و دارو استان البرز',
  },
];

export const HRWorkspaceModule: React.FC<HRWorkspaceModuleProps> = ({
  employees = [],
  currentRole = UserRole.HR_DIRECTOR,
  onNavigateToModule,
}) => {
  const [tasks, setTasks] = useState<HRWorkspaceTask[]>(() => {
    try {
      const saved = localStorage.getItem(TASKS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return INITIAL_TASKS;
  });

  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('day');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal / Drawer States
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [activeTaskDetail, setActiveTaskDetail] = useState<HRWorkspaceTask | null>(null);

  // Focus & Tools States
  const [isPomodoroOpen, setIsPomodoroOpen] = useState(false);
  const [pomodoroTaskId, setPomodoroTaskId] = useState<string>('');
  const [isRemindersOpen, setIsRemindersOpen] = useState(false);
  const [rescheduleTask, setRescheduleTask] = useState<HRWorkspaceTask | null>(null);

  // Drag and Drop state for Kanban
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<HRTaskStatus | null>(null);

  // Reminders list state
  const [reminders, setReminders] = useState<HRReminderItem[]>(() => {
    try {
      const saved = localStorage.getItem(REMINDERS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_REMINDERS;
  });

  // Save reminders to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to persist reminders:', e);
    }
  }, [reminders]);

  // Input ref for autofocus without page jumping
  const newTaskTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isNewTaskModalOpen) {
      setTimeout(() => {
        newTaskTitleInputRef.current?.focus();
      }, 50);
    }
  }, [isNewTaskModalOpen]);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<HRTaskCategory>('RECRUITMENT');
  const [newTaskPriority, setNewTaskPriority] = useState<HRTaskPriority>('MEDIUM');
  const [newTaskTimeframe, setNewTaskTimeframe] = useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER'>('TODAY');
  const [newTaskDueDate, setNewTaskDueDate] = useState(() => {
    const t = getTodayJalali();
    return `${t.year}/${String(t.month).padStart(2, '0')}/${String(t.day).padStart(2, '0')}`;
  });
  const [newTaskDueTime, setNewTaskDueTime] = useState('12:00');
  const [newTaskAssignee, setNewTaskAssignee] = useState('کارشناس منابع انسانی');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskSubtasksStr, setNewTaskSubtasksStr] = useState('');

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to persist tasks:', e);
    }
  }, [tasks]);

  const todayJalali = getTodayJalali();
  const todayFormatted = `${todayJalali.year}/${String(todayJalali.month).padStart(2, '0')}/${String(todayJalali.day).padStart(2, '0')}`;

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.title.toLowerCase().includes(q);
        const matchDesc = task.description?.toLowerCase().includes(q) || false;
        const matchAssignee = task.assigneeName.toLowerCase().includes(q);
        const matchTags = task.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchAssignee && !matchTags) return false;
      }
      // Category
      if (selectedCategory !== 'ALL' && task.category !== selectedCategory) {
        return false;
      }
      // Priority
      if (selectedPriority !== 'ALL' && task.priority !== selectedPriority) {
        return false;
      }
      // Status
      if (selectedStatus !== 'ALL' && task.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, selectedCategory, selectedPriority, selectedStatus]);

  // Quick statistics
  const stats = useMemo(() => {
    const todayTasks = tasks.filter((t) => t.timeframe === 'TODAY' || t.dueDateJalali.includes(String(todayJalali.day)));
    const todayDone = todayTasks.filter((t) => t.status === 'DONE').length;
    const todayTotal = todayTasks.length;
    const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

    const urgentCount = tasks.filter((t) => t.priority === 'URGENT' && t.status !== 'DONE').length;
    const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const completedTotal = tasks.filter((t) => t.status === 'DONE').length;

    return {
      todayTasks,
      todayDone,
      todayTotal,
      todayPct,
      urgentCount,
      inProgressCount,
      completedTotal,
      totalCount: tasks.length,
    };
  }, [tasks, todayJalali]);

  // Toggle single task completion
  const handleToggleTaskDone = (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const newStatus: HRTaskStatus = t.status === 'DONE' ? 'TODO' : 'DONE';
          const updated = {
            ...t,
            status: newStatus,
            subtasks: t.subtasks.map((s) => ({
              ...s,
              completed: newStatus === 'DONE',
            })),
          };
          if (activeTaskDetail?.id === taskId) {
            setActiveTaskDetail(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Change Task Status (e.g. from Board or Table)
  const handleChangeStatus = (taskId: string, newStatus: HRTaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, status: newStatus };
          if (activeTaskDetail?.id === taskId) {
            setActiveTaskDetail(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Toggle Subtask
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((s) =>
            s.id === subtaskId ? { ...s, completed: !s.completed } : s
          );
          const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((s) => s.completed);
          const updated = {
            ...t,
            subtasks: updatedSubtasks,
            status: allDone ? ('DONE' as HRTaskStatus) : t.status === 'DONE' ? ('IN_PROGRESS' as HRTaskStatus) : t.status,
          };
          if (activeTaskDetail?.id === taskId) {
            setActiveTaskDetail(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Delete task
  const handleDeleteTask = (taskId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('آیا از حذف این وظیفه از میز کار اطمینان دارید؟')) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (activeTaskDetail?.id === taskId) {
        setActiveTaskDetail(null);
      }
      showToast('وظیفه حذف شد', 'info');
    }
  };

  // Reschedule task to another date
  const handleRescheduleTask = (
    taskId: string,
    newDueDateJalali: string,
    newTimeframe: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER'
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updated = { ...t, dueDateJalali: newDueDateJalali, timeframe: newTimeframe };
          if (activeTaskDetail?.id === taskId) {
            setActiveTaskDetail(updated);
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Reminders Management Handlers
  const handleAddReminder = (item: HRReminderItem) => {
    setReminders((prev) => [item, ...prev]);
  };

  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    showToast('یادآوری حذف شد', 'info');
  };

  const handleSnoozeReminder = (id: string, _minutes: number) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, note: 'به تعویق افتاد' };
        }
        return r;
      })
    );
  };

  const activeRemindersCount = useMemo(() => {
    return reminders.filter((r) => !r.isCompleted).length;
  }, [reminders]);

  // Kanban status move next/prev
  const KANBAN_STATUSES: HRTaskStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

  const handleMoveTaskNext = (taskId: string, currentStatus: HRTaskStatus, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const idx = KANBAN_STATUSES.indexOf(currentStatus);
    if (idx < KANBAN_STATUSES.length - 1) {
      const nextStatus = KANBAN_STATUSES[idx + 1];
      handleChangeStatus(taskId, nextStatus);
      showToast(`وضعیت به «${STATUS_CONFIG[nextStatus].label}» تغییر یافت`, 'info');
    }
  };

  const handleMoveTaskPrev = (taskId: string, currentStatus: HRTaskStatus, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const idx = KANBAN_STATUSES.indexOf(currentStatus);
    if (idx > 0) {
      const prevStatus = KANBAN_STATUSES[idx - 1];
      handleChangeStatus(taskId, prevStatus);
      showToast(`وضعیت به «${STATUS_CONFIG[prevStatus].label}» تغییر یافت`, 'info');
    }
  };

  // Reset to default seed tasks
  const handleResetDefaults = () => {
    if (window.confirm('بازنشانی تمامی وظایف به داده‌های اولیه پیش‌فرض هلدینگ سیلانه سبز؟')) {
      setTasks(INITIAL_TASKS);
      showToast('میز کار با موفقیت به داده‌های استاندارد بازنشانی شد', 'success');
    }
  };

  // Create Task Form Submit
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      showToast('لطفاً عنوان وظیفه را وارد نمایید', 'warning');
      return;
    }

    const subtasksList = newTaskSubtasksStr
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: s.replace(/^[-*•]\s*/, ''),
        completed: false,
      }));

    const newTask: HRWorkspaceTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      category: newTaskCategory,
      status: 'TODO',
      priority: newTaskPriority,
      dueDateJalali: newTaskDueDate,
      dueTime: newTaskDueTime || undefined,
      timeframe: newTaskTimeframe,
      assigneeName: newTaskAssignee || 'مسئول منابع انسانی',
      tags: [CATEGORY_CONFIG[newTaskCategory].label],
      subtasks: subtasksList,
      createdAtJalali: todayFormatted,
    };

    setTasks([newTask, ...tasks]);
    showToast('وظیفه جدید با موفقیت به میز کار اضافه شد', 'success');
    setIsNewTaskModalOpen(false);

    // Reset fields
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskSubtasksStr('');
  };

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* 1. Header Banner & Workspace Identity */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-[16px] bg-surface-1 border border-border-default shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-3 rounded-[12px] bg-brand-soft border border-brand/20 text-brand shrink-0">
            <Kanban className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-text-1 tracking-tight">
                میز کار و مدیریت هوشمند وظایف منابع انسانی (Notion Workspace)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-soft text-brand border border-brand/20">
                {toPersianDigits(tasks.length)} تسک فعال
              </span>
            </div>
            <p className="text-xs sm:text-sm text-text-3 mt-1 leading-relaxed">
              کنترل یکپارچه امور روزانه، هفتگی و ماهانه منابع انسانی هلدینگ سیلانه سبز (دافی، کامان، میسویک و کارخانجات اشتهارد) با نماهای حرفه‌ای نوشن
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Pomodoro Focus Timer Trigger */}
          <button
            type="button"
            onClick={() => setIsPomodoroOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-xs font-black text-rose-600 border border-border-default hover:border-rose-500/40 transition-all cursor-pointer shadow-2xs"
            title="تایمر تمرکز پومودورو ۲۵ دقیقه‌ای"
          >
            <span className="text-sm">🍅</span>
            <span>پومودورو</span>
          </button>

          {/* Reminders Box Trigger */}
          <button
            type="button"
            onClick={() => setIsRemindersOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-xs font-black text-amber-600 border border-border-default hover:border-amber-500/40 transition-all cursor-pointer shadow-2xs"
            title="باکس یادآوری‌ها و هشدارهای سررسید"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>باکس یادآوری</span>
            {activeRemindersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white leading-none">
                {toPersianDigits(activeRemindersCount)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-bold text-text-3 hover:text-text-1 hover:bg-surface-2 border border-border-default transition-all cursor-pointer"
            title="بازنشانی به وظایف استاندارد هلدینگ"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">داده‌های پیش‌فرض</span>
          </button>

          <button
            type="button"
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-black shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن وظیفه جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Ribbon (Notion Insights) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Metric 1: Today Progress */}
        <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-3">پیشرفت کارهای امروز</span>
            <div className="p-1.5 rounded-[8px] bg-brand-soft text-brand">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-text-1 tracking-tight">
                ٪{toPersianDigits(stats.todayPct)}
              </span>
              <span className="text-xs text-text-3">
                {toPersianDigits(stats.todayDone)} از {toPersianDigits(stats.todayTotal)} وظیفه
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-2 mt-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${stats.todayPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Urgent Tasks */}
        <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-3">وظایف فوری و حیاتی</span>
            <div className="p-1.5 rounded-[8px] bg-rose-500/15 text-rose-600">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-600 tracking-tight">
                {toPersianDigits(stats.urgentCount)}
              </span>
              <span className="text-xs text-text-3">نیازمند پیگیری فوری امروز</span>
            </div>
            <p className="text-[11px] text-text-3 mt-2 truncate">
              ارسال دیسکت تامین اجتماعی و مصاحبه‌ها
            </p>
          </div>
        </div>

        {/* Metric 3: In Progress Tasks */}
        <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-3">تسک‌های در جریان</span>
            <div className="p-1.5 rounded-[8px] bg-blue-500/15 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-blue-600 tracking-tight">
                {toPersianDigits(stats.inProgressCount)}
              </span>
              <span className="text-xs text-text-3">وظیفه در حال اجرا</span>
            </div>
            <p className="text-[11px] text-text-3 mt-2 truncate">
              در دست اقدام کارشناسان منابع انسانی
            </p>
          </div>
        </div>

        {/* Metric 4: Completed Tasks Total */}
        <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-3">کل کارهای تکمیل‌شده</span>
            <div className="p-1.5 rounded-[8px] bg-emerald-500/15 text-emerald-600">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 tracking-tight">
                {toPersianDigits(stats.completedTotal)}
              </span>
              <span className="text-xs text-text-3">از مجموع {toPersianDigits(stats.totalCount)} تسک</span>
            </div>
            <p className="text-[11px] text-text-3 mt-2 truncate">
              بایگانی‌شده در کارتابل هلدینگ
            </p>
          </div>
        </div>
      </div>

      {/* 3. Notion View Switcher Tabs & Filters Toolbar */}
      <div className="p-3.5 rounded-[16px] bg-surface-1 border border-border-default shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Notion-style View Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto p-1 rounded-[10px] bg-surface-2 border border-border-default scrollbar-none">
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'day'
                  ? 'bg-surface-1 text-brand shadow-xs border border-border-default'
                  : 'text-text-3 hover:text-text-1'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>امروز و روزانه</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-soft text-brand font-black">
                {toPersianDigits(stats.todayTotal)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'week'
                  ? 'bg-surface-1 text-brand shadow-xs border border-border-default'
                  : 'text-text-3 hover:text-text-1'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>هفتگی (شنبه تا پنج‌شنبه)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'month'
                  ? 'bg-surface-1 text-brand shadow-xs border border-border-default'
                  : 'text-text-3 hover:text-text-1'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>تقویم ماهانه و ددلاین‌ها</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'board'
                  ? 'bg-surface-1 text-brand shadow-xs border border-border-default'
                  : 'text-text-3 hover:text-text-1'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>بورد کانبان (Notion Board)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'table'
                  ? 'bg-surface-1 text-brand shadow-xs border border-border-default'
                  : 'text-text-3 hover:text-text-1'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول دیتابیس (Table)</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('docs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                viewMode === 'docs'
                  ? 'bg-surface-1 text-brand shadow-xs border border-border-default'
                  : 'text-text-3 hover:text-text-1'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>دستورالعمل‌ها و الگوها</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-text-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، تگ یا فرد مسئول..."
              className="w-full pr-8 pl-3 py-1.5 rounded-[10px] bg-surface-2 border border-border-default text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:border-brand transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Row */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-border-default scrollbar-none text-xs">
          <div className="flex items-center gap-1 text-text-3 font-bold shrink-0 ml-1">
            <Filter className="w-3.5 h-3.5" />
            <span>فیلتر حوزه:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-brand text-white'
                : 'bg-surface-2 text-text-3 hover:text-text-1'
            }`}
          >
            همه حوزه‌ها
          </button>

          {(Object.keys(CATEGORY_CONFIG) as HRTaskCategory[]).map((cat) => {
            const conf = CATEGORY_CONFIG[cat];
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? 'ALL' : cat)}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-surface-2 text-text-3 hover:text-text-1'
                }`}
              >
                {conf.label}
              </button>
            );
          })}

          <div className="border-r border-border-default h-4 mx-1 shrink-0" />

          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-2 py-1 rounded-[8px] bg-surface-2 border border-border-default text-[11px] font-bold text-text-2 focus:outline-none cursor-pointer shrink-0"
          >
            <option value="ALL">اولویت: همه</option>
            <option value="URGENT">فوری و حیاتی</option>
            <option value="HIGH">اولویت بالا</option>
            <option value="MEDIUM">متوسط</option>
            <option value="LOW">عادی</option>
          </select>
        </div>
      </div>

      {/* 4. MAIN VIEW RENDERER */}

      {/* 4.1 VIEW: DAY (امروز و روزانه) */}
      {viewMode === 'day' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-brand-soft border border-brand/20">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand" />
              <span className="text-xs sm:text-sm font-black text-brand">
                برنامه کاری امروز: {toPersianDigits(todayJalali.day)} {JALALI_MONTH_NAMES[todayJalali.month - 1]} {toPersianDigits(todayJalali.year)}
              </span>
            </div>
            <span className="text-xs font-bold text-brand">
              {toPersianDigits(stats.todayDone)} از {toPersianDigits(stats.todayTotal)} وظیفه تکمیل شده
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left 2 Cols: Today Tasks List */}
            <div className="lg:col-span-2 space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="p-8 rounded-[14px] bg-surface-1 border border-border-default text-center text-text-3">
                  هیچ وظیفه‌ای با فیلترهای انتخابی یافت نشد.
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const catConf = CATEGORY_CONFIG[task.category];
                  const prioConf = PRIORITY_CONFIG[task.priority];
                  const isDone = task.status === 'DONE';
                  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

                  return (
                    <div
                      key={task.id}
                      onClick={() => setActiveTaskDetail(task)}
                      className={`p-4 rounded-[14px] bg-surface-1 border transition-all cursor-pointer group hover:shadow-md ${
                        isDone
                          ? 'border-emerald-500/30 opacity-75 bg-emerald-500/5'
                          : task.priority === 'URGENT'
                          ? 'border-rose-500/40'
                          : 'border-border-default hover:border-brand/40'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Interactive Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleTaskDone(task.id, e)}
                          className="mt-0.5 text-text-3 hover:text-brand transition-colors cursor-pointer shrink-0"
                          title={isDone ? 'تغییر به در انتظار' : 'تکمیل وظیفه'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-text-3 group-hover:text-brand" />
                          )}
                        </button>

                        {/* Task Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catConf.bg} ${catConf.text} ${catConf.border}`}
                            >
                              {catConf.label}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${prioConf.badge}`}
                            >
                              {prioConf.label}
                            </span>
                            {task.dueTime && (
                              <span className="flex items-center gap-1 text-[11px] text-text-3">
                                <Clock className="w-3 h-3" />
                                {toPersianDigits(task.dueTime)}
                              </span>
                            )}
                          </div>

                          <h3
                            className={`text-sm font-black text-text-1 leading-snug ${
                              isDone ? 'line-through text-text-3' : ''
                            }`}
                          >
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-xs text-text-3 mt-1 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Subtasks Progress Bar & Assignee & Quick Actions */}
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-border-default/60 text-xs flex-wrap">
                            <div className="flex items-center gap-2">
                              <User className="w-3.5 h-3.5 text-text-3" />
                              <span className="text-text-2 font-bold">{task.assigneeName}</span>
                              {task.subtasks.length > 0 && (
                                <span className="text-text-3 text-[11px]">
                                  ({toPersianDigits(completedSubtasks)}/{toPersianDigits(task.subtasks.length)} زیرکار)
                                </span>
                              )}
                            </div>

                            {/* Actions Group */}
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              {/* Quick Status Selector */}
                              <select
                                value={task.status}
                                onChange={(e) => handleChangeStatus(task.id, e.target.value as HRTaskStatus)}
                                className="px-2 py-0.5 rounded-[6px] bg-surface-2 border border-border-default text-[10px] font-black text-text-1 cursor-pointer focus:outline-none"
                              >
                                <option value="TODO">در انتظار</option>
                                <option value="IN_PROGRESS">در حال انجام</option>
                                <option value="IN_REVIEW">در حال بررسی</option>
                                <option value="DONE">تکمیل شده</option>
                                <option value="BLOCKED">مسدود</option>
                              </select>

                              {/* Reschedule Button */}
                              <button
                                type="button"
                                onClick={() => setRescheduleTask(task)}
                                className="flex items-center gap-1 px-2 py-0.5 rounded-[6px] bg-surface-2 hover:bg-surface-3 text-[10px] font-bold text-text-2 border border-border-default transition-colors cursor-pointer"
                                title="موکول کردن به تاریخ دیگر"
                              >
                                <CalendarClock className="w-3 h-3 text-amber-500" />
                                <span>موکول</span>
                              </button>

                              {/* Pomodoro Focus Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setPomodoroTaskId(task.id);
                                  setIsPomodoroOpen(true);
                                }}
                                className="p-1 rounded-[6px] bg-surface-2 hover:bg-rose-500/15 text-rose-500 transition-colors cursor-pointer"
                                title="شروع تمرکز پومودورو روی این وظیفه"
                              >
                                <span className="text-xs">🍅</span>
                              </button>

                              {/* Set Reminder Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsRemindersOpen(true);
                                }}
                                className="p-1 rounded-[6px] bg-surface-2 hover:bg-amber-500/15 text-amber-600 transition-colors cursor-pointer"
                                title="تنظیم یادآوری و آلارم"
                              >
                                <Bell className="w-3 h-3" />
                              </button>

                              {/* Delete Task Button */}
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTask(task.id, e)}
                                className="p-1 rounded-[6px] text-text-3 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="حذف این وظیفه"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Col: Daily Focus & Timebox Widget */}
            <div className="space-y-4">
              {/* Pomodoro Focus Fast Card */}
              <div className="p-4 rounded-[14px] bg-gradient-to-br from-rose-500/10 to-amber-500/10 border border-rose-500/20 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🍅</span>
                    <h3 className="text-xs font-black text-text-1">سیستم تمرکز پومودورو</h3>
                  </div>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-500/15 px-2 py-0.5 rounded-full">
                    ۲۵ دقیقه تمرکز
                  </span>
                </div>
                <p className="text-[11px] text-text-3 leading-relaxed">
                  تکنیک تمرکز عمیق برای انجام امور دقیق پرسنلی، احکام و استعلامات بیمه
                </p>
                <button
                  type="button"
                  onClick={() => setIsPomodoroOpen(true)}
                  className="w-full py-2 px-3 rounded-[10px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>شروع تایمر تمرکز پومودورو</span>
                </button>
              </div>

              {/* Reminders Fast Card */}
              <div className="p-4 rounded-[14px] bg-amber-500/10 border border-amber-500/20 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-600" />
                    <h3 className="text-xs font-black text-text-1">باکس یادآوری‌ها و هشدارها</h3>
                  </div>
                  <span className="text-[10px] font-black text-amber-700 bg-amber-500/20 px-2 py-0.5 rounded-full">
                    {toPersianDigits(activeRemindersCount)} فعال
                  </span>
                </div>
                <div className="space-y-1.5">
                  {reminders.slice(0, 2).map((r) => (
                    <div
                      key={r.id}
                      className="p-2 rounded-[8px] bg-surface-1 border border-border-default/80 flex items-center justify-between text-[11px]"
                    >
                      <span className="truncate max-w-[170px] font-bold text-text-1">{r.title}</span>
                      <span className="text-text-3 font-mono">{toPersianDigits(r.dueTime)}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsRemindersOpen(true)}
                  className="w-full py-2 px-3 rounded-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 text-xs font-black border border-amber-500/30 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>مدیریت کامل باکس یادآوری</span>
                </button>
              </div>

              {/* Quick Add Fast Input */}
              <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default shadow-xs">
                <div className="flex items-center gap-2 text-xs font-black text-text-1 mb-2">
                  <Sparkles className="w-4 h-4 text-brand" />
                  <span>ثبت سریع وظیفه برای امروز</span>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTaskTitle.trim()) return;
                    handleCreateTask(e);
                  }}
                  className="space-y-2.5"
                >
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="عنوان کار (مثلاً: تماس با تامین‌کننده طب کار)..."
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:border-brand"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as HRTaskCategory)}
                      className="flex-1 px-2 py-1.5 rounded-[8px] bg-surface-2 border border-border-default text-[11px] font-bold text-text-2 focus:outline-none"
                    >
                      <option value="RECRUITMENT">جذب و استخدام</option>
                      <option value="PAYROLL">حقوق و دستمزد</option>
                      <option value="LEGAL_CONTRACTS">قراردادها</option>
                      <option value="FACTORY_OPS">کارخانه و تردد</option>
                      <option value="TRAINING_GMP">آموزش GMP</option>
                      <option value="WELFARE_EVENTS">رفاهی</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-[8px] bg-brand hover:bg-brand-hover text-white text-xs font-black shadow-xs cursor-pointer"
                    >
                      ثبت سریع
                    </button>
                  </div>
                </form>
              </div>

              {/* Timebox Schedule for Today */}
              <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-text-1">زمان‌بندی ساعات کاری امروز</h3>
                  <span className="text-[10px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full">
                    شیفت عادی
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-[10px] bg-surface-2 border-r-4 border-brand">
                    <div className="flex items-center justify-between text-[11px] text-text-3 font-bold mb-0.5">
                      <span>۰۸:۰۰ - ۱۰:۳۰</span>
                      <span className="text-brand">پایش صبحگاهی</span>
                    </div>
                    <p className="font-bold text-text-1">بررسی تردد خطوط تولید و ثبت مغایرت‌های بیومتریک</p>
                  </div>

                  <div className="p-2.5 rounded-[10px] bg-surface-2 border-r-4 border-blue-500">
                    <div className="flex items-center justify-between text-[11px] text-text-3 font-bold mb-0.5">
                      <span>۱۱:۰۰ - ۱۳:۰۰</span>
                      <span className="text-blue-600">امور مالی و قرارداد</span>
                    </div>
                    <p className="font-bold text-text-1">تطبیق فیش‌های حقوق و تایید اضافه‌کار ماهانه</p>
                  </div>

                  <div className="p-2.5 rounded-[10px] bg-surface-2 border-r-4 border-purple-500">
                    <div className="flex items-center justify-between text-[11px] text-text-3 font-bold mb-0.5">
                      <span>۱۴:۰۰ - ۱۶:۳۰</span>
                      <span className="text-purple-600">مصاحبه و جلسات</span>
                    </div>
                    <p className="font-bold text-text-1">مصاحبه‌های فنی شایستگی‌محور و ممیزی ادواری</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4.2 VIEW: WEEK (هفتگی شنبه تا پنج‌شنبه) */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-[12px] bg-surface-1 border border-border-default flex items-center justify-between">
            <span className="text-xs sm:text-sm font-black text-text-1">
              اسپرینت هفتگی هلدینگ — شنبه تا پنج‌شنبه
            </span>
            <span className="text-xs text-text-3">
              نمای کارها به تفکیک روزهای هفته کاری کارخانجات و دفتر مرکزی
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه'].map((dayName, dayIdx) => {
              // Distribute tasks across week days deterministically for visualization
              const dayTasks = tasks.filter((t, idx) => idx % 6 === dayIdx);

              return (
                <div
                  key={dayName}
                  className="rounded-[14px] bg-surface-1 border border-border-default p-3 flex flex-col min-h-[380px]"
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border-default">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-brand" />
                      <span className="text-xs font-black text-text-1">{dayName}</span>
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-surface-2 text-text-2">
                      {toPersianDigits(dayTasks.length)}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {dayTasks.map((t) => {
                      const catConf = CATEGORY_CONFIG[t.category];
                      const isDone = t.status === 'DONE';

                      return (
                        <div
                          key={t.id}
                          onClick={() => setActiveTaskDetail(t)}
                          className={`p-2.5 rounded-[10px] bg-surface-2 border transition-all cursor-pointer hover:shadow-xs text-right ${
                            isDone ? 'opacity-60 border-emerald-500/30' : 'border-border-default hover:border-brand/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${catConf.bg} ${catConf.text} ${catConf.border}`}
                            >
                              {catConf.label}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleToggleTaskDone(t.id, e)}
                              className="text-text-3 hover:text-emerald-600 transition-colors cursor-pointer"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Circle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <p
                            className={`text-xs font-bold text-text-1 line-clamp-2 ${
                              isDone ? 'line-through text-text-3' : ''
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border-default/40 text-[10px] text-text-3">
                            <span className="truncate max-w-[100px]">{t.assigneeName}</span>
                            <span>{t.dueTime || '۱۴:۰۰'}</span>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => {
                        setIsNewTaskModalOpen(true);
                      }}
                      className="w-full py-1.5 rounded-[8px] border border-dashed border-border-default text-text-3 hover:text-brand hover:border-brand text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer mt-2"
                    >
                      <Plus className="w-3 h-3" />
                      <span>افزودن</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4.3 VIEW: MONTH (تقویم ماهانه و ددلاین‌های قانونی) */}
      {viewMode === 'month' && (
        <div className="space-y-4">
          <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-text-1">
                  تقویم وظایف و ددلاین‌های قانونی {JALALI_MONTH_NAMES[todayJalali.month - 1]} {toPersianDigits(todayJalali.year)}
                </h2>
                <p className="text-xs text-text-3 mt-0.5">
                  موعدهای مهم تامین اجتماعی، پایان قراردادها و پرداخت‌های هلدینگ
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-text-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                  ددلاین قانونی
                </span>
                <span className="flex items-center gap-1 text-text-3 mr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand inline-block" />
                  تسک سازمانی
                </span>
              </div>
            </div>

            {/* Jalali Calendar Grid (30/31 days) */}
            <div className="grid grid-cols-7 gap-1.5 pt-2">
              {['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'].map((d) => (
                <div key={d} className="text-center text-xs font-black text-text-3 py-1.5">
                  {d}
                </div>
              ))}

              {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
                const isToday = dayNum === todayJalali.day;
                // Check if any tasks fall on this day
                const dayTasks = tasks.filter((t) => t.dueDateJalali.endsWith(String(dayNum).padStart(2, '0')));
                const isStatutoryDeadline = dayNum === 30 || dayNum === 28;

                return (
                  <div
                    key={dayNum}
                    className={`min-h-[85px] p-1.5 rounded-[10px] border flex flex-col justify-between transition-all ${
                      isToday
                        ? 'border-brand bg-brand-soft/40 shadow-xs'
                        : isStatutoryDeadline
                        ? 'border-rose-500/30 bg-rose-500/5'
                        : 'border-border-default bg-surface-1 hover:bg-surface-2/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-black w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-brand text-white' : 'text-text-1'
                        }`}
                      >
                        {toPersianDigits(dayNum)}
                      </span>
                      {isStatutoryDeadline && (
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-500/15 px-1 rounded">
                          بیمه/مالیات
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1 overflow-hidden">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setActiveTaskDetail(t)}
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface-2 border border-border-default text-text-2 truncate cursor-pointer hover:border-brand"
                          title={t.title}
                        >
                          {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[9px] text-text-3 font-bold block text-center">
                          +{toPersianDigits(dayTasks.length - 2)} مورد دیگر
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4.4 VIEW: NOTION KANBAN BOARD (بورد کانبان نوشن) */}
      {viewMode === 'board' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-[12px] bg-surface-1 border border-border-default text-xs">
            <span className="font-bold text-text-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>می‌توانید کارت‌ها را با درگ و دراپ (Drag & Drop) یا دکمه‌های ناوبری روی کارت بین ستون‌ها جابه‌جا کنید.</span>
            </span>
            <span className="text-text-3 font-mono">
              {toPersianDigits(filteredTasks.length)} کارت کل
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 items-start">
            {(Object.keys(STATUS_CONFIG) as HRTaskStatus[]).map((statusKey) => {
              const statusConf = STATUS_CONFIG[statusKey];
              const columnTasks = filteredTasks.filter((t) => t.status === statusKey);

              return (
                <div
                  key={statusKey}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverCol(statusKey);
                  }}
                  onDragLeave={() => {
                    if (dragOverCol === statusKey) setDragOverCol(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverCol(null);
                    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
                    if (taskId) {
                      handleChangeStatus(taskId, statusKey);
                      setDraggedTaskId(null);
                      showToast(`کارت به ستون «${statusConf.label}» منتقل شد`, 'success');
                    }
                  }}
                  className={`rounded-[14px] bg-surface-1 border p-3 flex flex-col min-h-[500px] transition-all ${
                    dragOverCol === statusKey
                      ? 'border-brand ring-2 ring-brand/40 bg-brand-soft/20 shadow-md'
                      : 'border-border-default'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-border-default">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${statusConf.dot}`} />
                      <span className="text-xs font-black text-text-1">{statusConf.label}</span>
                    </div>
                    <span className="text-xs font-bold text-text-3 px-1.5 py-0.2 rounded-full bg-surface-2">
                      {toPersianDigits(columnTasks.length)}
                    </span>
                  </div>

                  {/* Cards List */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {columnTasks.map((t) => {
                      const catConf = CATEGORY_CONFIG[t.category];
                      const prioConf = PRIORITY_CONFIG[t.priority];
                      const completedSubtasks = t.subtasks.filter((s) => s.completed).length;

                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedTaskId(t.id);
                            e.dataTransfer.setData('text/plain', t.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverCol(null);
                          }}
                          onClick={() => setActiveTaskDetail(t)}
                          className={`p-3 rounded-[12px] bg-surface-2 border border-border-default hover:border-brand/40 transition-all cursor-grab active:cursor-grabbing shadow-xs hover:shadow-md space-y-2.5 group ${
                            draggedTaskId === t.id ? 'opacity-40 scale-95 border-dashed border-brand' : ''
                          }`}
                        >
                          {/* Drag grip + category + priority + quick delete */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <GripVertical className="w-3.5 h-3.5 text-text-3 group-hover:text-brand transition-colors shrink-0" />
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${catConf.bg} ${catConf.text} ${catConf.border}`}
                              >
                                {catConf.label}
                              </span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded-full border ${prioConf.badge}`}
                              >
                                {prioConf.label}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => handleDeleteTask(t.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-1 rounded-[6px] text-text-3 hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="حذف وظیفه"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>

                          <h4 className="text-xs font-black text-text-1 leading-snug">{t.title}</h4>

                          {t.subtasks.length > 0 && (
                            <div className="space-y-1 pt-0.5">
                              <div className="flex items-center justify-between text-[10px] text-text-3">
                                <span>زیرکارها</span>
                                <span>
                                  {toPersianDigits(completedSubtasks)} / {toPersianDigits(t.subtasks.length)}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-surface-1 overflow-hidden">
                                <div
                                  className="h-full bg-brand rounded-full transition-all"
                                  style={{
                                    width: `${(completedSubtasks / t.subtasks.length) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-border-default/50 text-[10px] text-text-3">
                            <span className="font-bold text-text-2 truncate max-w-[110px]">{t.assigneeName}</span>
                            <span>{t.dueDateJalali}</span>
                          </div>

                          {/* Card Action Controls: Move Next/Prev & Status & Reschedule */}
                          <div
                            className="flex items-center justify-between pt-1.5 border-t border-border-default/50 text-xs gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Move prev/next buttons (In RTL, ChevronRight moves back, ChevronLeft moves forward) */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleMoveTaskPrev(t.id, t.status, e)}
                                disabled={KANBAN_STATUSES.indexOf(t.status) === 0}
                                className="p-1 rounded-[6px] bg-surface-1 hover:bg-surface-3 disabled:opacity-30 text-text-2 border border-border-default cursor-pointer disabled:cursor-not-allowed transition-all"
                                title="انتقال به ستون قبلی"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>

                              <select
                                value={t.status}
                                onChange={(e) => handleChangeStatus(t.id, e.target.value as HRTaskStatus)}
                                className="px-1.5 py-0.5 rounded-[6px] bg-surface-1 border border-border-default text-[9px] font-black text-text-1 cursor-pointer focus:outline-none"
                              >
                                <option value="TODO">در انتظار</option>
                                <option value="IN_PROGRESS">در حال انجام</option>
                                <option value="IN_REVIEW">در بررسی</option>
                                <option value="DONE">تکمیل</option>
                                <option value="BLOCKED">مسدود</option>
                              </select>

                              <button
                                type="button"
                                onClick={(e) => handleMoveTaskNext(t.id, t.status, e)}
                                disabled={KANBAN_STATUSES.indexOf(t.status) === KANBAN_STATUSES.length - 1}
                                className="p-1 rounded-[6px] bg-surface-1 hover:bg-surface-3 disabled:opacity-30 text-text-2 border border-border-default cursor-pointer disabled:cursor-not-allowed transition-all"
                                title="انتقال به ستون بعدی"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Quick Tools: Reschedule, Pomodoro */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setRescheduleTask(t)}
                                className="p-1 rounded-[6px] bg-surface-1 hover:bg-amber-500/15 text-text-3 hover:text-amber-600 border border-border-default transition-colors cursor-pointer"
                                title="موکول کردن به تاریخ دیگر"
                              >
                                <CalendarClock className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPomodoroTaskId(t.id);
                                  setIsPomodoroOpen(true);
                                }}
                                className="p-1 rounded-[6px] bg-surface-1 hover:bg-rose-500/15 text-rose-500 border border-border-default transition-colors cursor-pointer"
                                title="شروع تمرکز پومودورو روی این کارت"
                              >
                                <span className="text-[11px] leading-none">🍅</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {columnTasks.length === 0 && (
                      <div className="py-8 text-center text-xs text-text-3 border border-dashed border-border-default rounded-[10px]">
                        وظیفه‌ای در این ستون نیست
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4.5 VIEW: NOTION DATABASE TABLE (جدول دیتابیس) */}
      {viewMode === 'table' && (
        <div className="rounded-[16px] bg-surface-1 border border-border-default overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-surface-2/80 text-text-3 font-black border-b border-border-default">
                <tr>
                  <th className="p-3.5 w-12 text-center">انجام</th>
                  <th className="p-3.5">عنوان وظیفه</th>
                  <th className="p-3.5">دپارتمان / حوزه</th>
                  <th className="p-3.5">وضعیت</th>
                  <th className="p-3.5">اولویت</th>
                  <th className="p-3.5">مسئول انجام</th>
                  <th className="p-3.5">مهلت انجام (شمسی)</th>
                  <th className="p-3.5 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {filteredTasks.map((t) => {
                  const catConf = CATEGORY_CONFIG[t.category];
                  const prioConf = PRIORITY_CONFIG[t.priority];
                  const isDone = t.status === 'DONE';

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setActiveTaskDetail(t)}
                      className="hover:bg-surface-2/60 transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-center" onClick={(e) => handleToggleTaskDone(t.id, e)}>
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                        ) : (
                          <Circle className="w-4 h-4 text-text-3 mx-auto" />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-text-1 line-clamp-1">{t.title}</div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${catConf.bg} ${catConf.text} ${catConf.border}`}
                        >
                          {catConf.label}
                        </span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleChangeStatus(t.id, e.target.value as HRTaskStatus)}
                          className="px-2 py-1 rounded-[8px] bg-surface-2 border border-border-default text-[11px] font-bold text-text-1 focus:outline-none cursor-pointer"
                        >
                          <option value="TODO">در انتظار</option>
                          <option value="IN_PROGRESS">در حال انجام</option>
                          <option value="IN_REVIEW">در حال بررسی</option>
                          <option value="DONE">تکمیل شده</option>
                          <option value="BLOCKED">مسدود</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${prioConf.badge}`}
                        >
                          {prioConf.label}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-text-2">{t.assigneeName}</td>
                      <td className="p-3 font-bold text-text-3">{t.dueDateJalali}</td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRescheduleTask(t)}
                            className="p-1.5 rounded-[8px] text-text-3 hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer"
                            title="موکول کردن به تاریخ دیگر"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPomodoroTaskId(t.id);
                              setIsPomodoroOpen(true);
                            }}
                            className="p-1.5 rounded-[8px] text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="تمرکز پومودورو"
                          >
                            <span className="text-xs leading-none">🍅</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTask(t.id, e)}
                            className="p-1.5 rounded-[8px] text-text-3 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="حذف وظیفه"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4.6 VIEW: NOTION READY TEMPLATES & DOCS (اسناد و چک‌لیست‌های پیش‌فرض) */}
      {viewMode === 'docs' && (
        <div className="space-y-4">
          <div className="p-4 rounded-[14px] bg-surface-1 border border-border-default">
            <h2 className="text-base font-black text-text-1 mb-1">
              دفترچه اسناد و الگوهای آماده منابع انسانی (Notion Standard Operating Procedures)
            </h2>
            <p className="text-xs text-text-3">
              الگوهای از پیش تنظیم‌شده متناسب با استاندارد کارخانجات دافی، کامان، میسویک و هلدینگ سیلانه سبز
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {NOTION_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-5 rounded-[16px] bg-surface-1 border border-border-default shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="text-3xl mb-2">{tmpl.icon}</div>
                  <h3 className="text-sm font-black text-text-1 leading-snug">{tmpl.title}</h3>
                  <div className="mt-3 space-y-2 border-t border-border-default pt-3">
                    {tmpl.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-text-2">
                        <CheckSquare className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newTask: HRWorkspaceTask = {
                      id: `task-tmpl-${Date.now()}`,
                      title: tmpl.title,
                      category: tmpl.category as HRTaskCategory,
                      status: 'TODO',
                      priority: 'HIGH',
                      dueDateJalali: todayFormatted,
                      timeframe: 'TODAY',
                      assigneeName: 'تیم منابع انسانی',
                      tags: ['الگوی آماده', 'Notion SOP'],
                      subtasks: tmpl.items.map((it, i) => ({
                        id: `sub-tmpl-${i}`,
                        title: it,
                        completed: false,
                      })),
                      createdAtJalali: todayFormatted,
                    };
                    setTasks([newTask, ...tasks]);
                    showToast('الگوی انتخابی به عنوان وظیفه جدید به میز کار افزوده شد', 'success');
                  }}
                  className="w-full py-2 rounded-[10px] bg-surface-2 hover:bg-brand hover:text-white border border-border-default text-xs font-black text-text-1 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>استفاده از این الگو به عنوان تسک جدید</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. TASK DETAIL DRAWER / MODAL (Notion Page View) */}
      {activeTaskDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setActiveTaskDetail(null)}
        >
          <div
            className="w-full max-w-2xl bg-surface-1 border border-border-default rounded-[16px] shadow-2xl p-6 max-h-[90vh] overflow-y-auto space-y-5 text-right animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-border-default pb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleTaskDone(activeTaskDetail.id)}
                  className="p-1 rounded-full text-text-3 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {activeTaskDetail.status === 'DONE' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-text-1">
                    {activeTaskDetail.title}
                  </h2>
                  <span className="text-xs text-text-3">
                    ایجاد شده در: {activeTaskDetail.createdAtJalali}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskDetail(null)}
                className="p-1.5 rounded-[8px] text-text-3 hover:text-text-1 hover:bg-surface-2 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Properties Grid (Notion style) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-[12px] bg-surface-2 text-xs">
              <div>
                <span className="text-text-3 font-medium block mb-1">وضعیت:</span>
                <select
                  value={activeTaskDetail.status}
                  onChange={(e) => handleChangeStatus(activeTaskDetail.id, e.target.value as HRTaskStatus)}
                  className="px-2 py-1 rounded-[6px] bg-surface-1 border border-border-default font-bold text-text-1"
                >
                  <option value="TODO">در انتظار (To Do)</option>
                  <option value="IN_PROGRESS">در حال انجام (In Progress)</option>
                  <option value="IN_REVIEW">در حال بررسی (In Review)</option>
                  <option value="DONE">تکمیل شده (Done)</option>
                  <option value="BLOCKED">مسدود (Blocked)</option>
                </select>
              </div>

              <div>
                <span className="text-text-3 font-medium block mb-1">دپارتمان:</span>
                <span className="font-bold text-text-1">
                  {CATEGORY_CONFIG[activeTaskDetail.category].label}
                </span>
              </div>

              <div>
                <span className="text-text-3 font-medium block mb-1">اولویت:</span>
                <span className="font-bold text-text-1">
                  {PRIORITY_CONFIG[activeTaskDetail.priority].label}
                </span>
              </div>

              <div>
                <span className="text-text-3 font-medium block mb-1">مسئول انجام:</span>
                <span className="font-bold text-text-1">{activeTaskDetail.assigneeName}</span>
              </div>

              <div>
                <span className="text-text-3 font-medium block mb-1">مهلت انجام:</span>
                <span className="font-bold text-text-1">{activeTaskDetail.dueDateJalali}</span>
              </div>

              <div>
                <span className="text-text-3 font-medium block mb-1">بازه زمانی:</span>
                <span className="font-bold text-text-1">
                  {activeTaskDetail.timeframe === 'TODAY'
                    ? 'امروز'
                    : activeTaskDetail.timeframe === 'THIS_WEEK'
                    ? 'این هفته'
                    : 'این ماه'}
                </span>
              </div>
            </div>

            {/* Description / Notes */}
            {activeTaskDetail.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-black text-text-2">شرح وظیفه</h4>
                <p className="text-xs text-text-2 leading-relaxed p-3 rounded-[10px] bg-surface-2">
                  {activeTaskDetail.description}
                </p>
              </div>
            )}

            {/* Subtasks Checklist */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-text-2">چک‌لیست زیرکارها (Subtasks)</h4>
                <span className="text-xs text-text-3">
                  {toPersianDigits(activeTaskDetail.subtasks.filter((s) => s.completed).length)} از{' '}
                  {toPersianDigits(activeTaskDetail.subtasks.length)}
                </span>
              </div>

              <div className="space-y-1.5">
                {activeTaskDetail.subtasks.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => handleToggleSubtask(activeTaskDetail.id, st.id)}
                    className="flex items-center gap-2.5 p-2 rounded-[8px] hover:bg-surface-2 transition-colors cursor-pointer text-xs"
                  >
                    {st.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-3 shrink-0" />
                    )}
                    <span className={st.completed ? 'line-through text-text-3' : 'text-text-1'}>
                      {st.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border-default gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleDeleteTask(activeTaskDetail.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-rose-500/10 text-xs text-rose-600 hover:bg-rose-500/20 font-bold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف وظیفه</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const task = activeTaskDetail;
                    setActiveTaskDetail(null);
                    setRescheduleTask(task);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-surface-2 hover:bg-surface-3 text-xs text-amber-600 font-bold border border-border-default cursor-pointer transition-colors"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>موکول به تاریخ دیگر</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const task = activeTaskDetail;
                    setActiveTaskDetail(null);
                    setPomodoroTaskId(task.id);
                    setIsPomodoroOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-surface-2 hover:bg-surface-3 text-xs text-rose-600 font-bold border border-border-default cursor-pointer transition-colors"
                >
                  <span>🍅</span>
                  <span>تمرکز پومودورو</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setActiveTaskDetail(null)}
                className="px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-black shadow-xs cursor-pointer transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. NEW TASK MODAL - Rendered via createPortal to be immediately centered and visible without scrolling */}
      {isNewTaskModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setIsNewTaskModalOpen(false)}
            style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <div
              className="relative w-full max-w-lg bg-surface-1 border border-border-default rounded-[16px] shadow-2xl p-5 sm:p-6 space-y-4 text-right my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-[8px] bg-brand-soft text-brand">
                    <Plus className="w-4 h-4" />
                  </span>
                  <h3 className="text-base font-black text-text-1">تعریف وظیفه جدید در میز کار</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewTaskModalOpen(false)}
                  className="p-1 rounded-[6px] text-text-3 hover:text-text-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-text-2 font-black mb-1">عنوان وظیفه *</label>
                  <input
                    ref={newTaskTitleInputRef}
                    type="text"
                    required
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="مثال: تسویه حساب پرسنل انتقالی خط دافی..."
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 placeholder:text-text-3 focus:outline-none focus:border-brand"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-2 font-black mb-1">دپارتمان / حوزه</label>
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as HRTaskCategory)}
                      className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 focus:outline-none"
                    >
                      <option value="RECRUITMENT">جذب و استخدام</option>
                      <option value="PAYROLL">حقوق و دستمزد</option>
                      <option value="LEGAL_CONTRACTS">قراردادها و امور حقوقی</option>
                      <option value="FACTORY_OPS">تردد و کارخانجات</option>
                      <option value="TRAINING_GMP">آموزش و استاندارد GMP</option>
                      <option value="WELFARE_EVENTS">رفاهی و مناسبت‌ها</option>
                      <option value="PERFORMANCE">ارزیابی عملکرد</option>
                      <option value="GENERAL_ADMIN">امور اداری عمومی</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-text-2 font-black mb-1">اولویت</label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as HRTaskPriority)}
                      className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 focus:outline-none"
                    >
                      <option value="URGENT">فوری و حیاتی</option>
                      <option value="HIGH">اولویت بالا</option>
                      <option value="MEDIUM">متوسط</option>
                      <option value="LOW">عادی</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-text-2 font-black mb-1">مهلت انجام (تاریخ شمسی)</label>
                    <input
                      type="text"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      placeholder="۱۴۰۳/۱۲/۲۸"
                      className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-text-2 font-black mb-1">مسئول انجام</label>
                    <input
                      type="text"
                      value={newTaskAssignee}
                      onChange={(e) => setNewTaskAssignee(e.target.value)}
                      placeholder="نام کارشناس یا سرپرست"
                      className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-text-2 font-black mb-1">توضیحات و یادداشت</label>
                  <textarea
                    rows={2}
                    value={newTaskDesc}
                    onChange={(e) => setNewTaskDesc(e.target.value)}
                    placeholder="جزییات، اقدامات لازم یا شماره پیگیری..."
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-text-2 font-black mb-1">
                    زیرکارها / چک‌لیست (هر مورد در یک خط)
                  </label>
                  <textarea
                    rows={3}
                    value={newTaskSubtasksStr}
                    onChange={(e) => setNewTaskSubtasksStr(e.target.value)}
                    placeholder="مرحله اول: استعلام مدارک&#10;مرحله دوم: هماهنگی حراست&#10;مرحله سوم: تایید مدیر..."
                    className="w-full px-3 py-2 rounded-[10px] bg-surface-2 border border-border-default text-text-1 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="px-4 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-2 font-bold cursor-pointer"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white font-black shadow-xs cursor-pointer"
                  >
                    ثبت وظیفه
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* 7. POMODORO FOCUS MODAL */}
      <PomodoroFocusModal
        isOpen={isPomodoroOpen}
        onClose={() => setIsPomodoroOpen(false)}
        tasks={tasks}
        selectedTaskId={pomodoroTaskId}
        onSelectTaskId={(id) => setPomodoroTaskId(id)}
        onMarkTaskCompleted={(id) => handleToggleTaskDone(id)}
      />

      {/* 8. RESCHEDULE TASK MODAL */}
      <RescheduleTaskModal
        isOpen={!!rescheduleTask}
        onClose={() => setRescheduleTask(null)}
        task={rescheduleTask}
        onReschedule={handleRescheduleTask}
      />

      {/* 9. REMINDERS BOX MODAL */}
      <RemindersBoxModal
        isOpen={isRemindersOpen}
        onClose={() => setIsRemindersOpen(false)}
        reminders={reminders}
        tasks={tasks}
        onAddReminder={handleAddReminder}
        onToggleReminder={handleToggleReminder}
        onDeleteReminder={handleDeleteReminder}
        onSnoozeReminder={handleSnoozeReminder}
      />
    </div>
  );
};
