/**
 * In-memory repository with comprehensive Iranian seed data for all 8 HR modules
 * Provides live CRUD operations and serves as the active data layer.
 *
 * PERSISTENCE (audit fix SEC-05): the store is still in-memory at request time,
 * but every mutation-marked interval is snapshotted to data/hrms-store.json and
 * reloaded on boot, so approved leaves / finalized payroll / hired candidates
 * survive a server restart. (A real PostgreSQL wiring via prisma/schema.prisma
 * remains a product decision — the schema is now honestly documented as
 * "designed, not yet connected" instead of being claimed in the README.)
 */

import fs from 'fs';
import path from 'path';
import {
  JobPosting,
  Candidate,
  CandidateStage,
  CandidateCategory,
  Employee,
  AttendanceRecord,
  LeaveRequest,
  LeaveType,
  LeaveStatus,
  PayrollSlip,
  PayrollStatus,
  PerformanceGoal,
  TrainingCourse,
  SkillMatrixItem,
  ChecklistItem,
  HRDashboardMetrics,
  UserRole,
  VideoInterviewQuestion,
  VideoInterviewSubmission,
  CandidateSkillMatch,
  InternalMobilityMatch,
  SourcedCandidate,
  JobSyndicationChannel,
  KnockoutQuestion,
  JobHistoryItem,
} from '../src/types';
import { isDatabaseConfigured } from './db';
import {
  loadAllEmployees,
  countEmployees,
  seedEmployees,
  createEmployeeInDb,
  updateEmployeeInDb,
  deleteEmployeeInDb,
} from './employeeRepo';

export class HRMSStore {
  public currentUserRole: UserRole = UserRole.HR_DIRECTOR;
  /**
   * Demo identity binding (audit fix LEA-03 / P16): the acting user
   * (see /api/auth/me — «مهندس کیوان سهرابی») maps to this employee record.
   * EMPLOYEE-role self-service actions (leave, check-in) are attributed to
   * this id instead of the old "employees[0] fallback".
   */
  public sessionEmployeeId: string = 'emp-1';

  public jobs: JobPosting[] = [
    {
      id: 'job-1',
      title: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      department: 'فناوری اطلاعات و مهندسی نرم‌افزار',
      employmentType: 'تمام‌وقت (حضوری / منعطف)',
      location: 'تهران، پارک فناوری پردیس / ستاد مرکزی',
      description: 'ما در جستجوی یک توسعه‌دهنده باتجربه فرانت‌اند با تسلط عمیق بر اکوسیستم مدرن React، تایپ‌اسکریپت و اصول طراحی رابط کاربری RTL هستیم.',
      requirements: 'تسلط بر React 19، TypeScript، Tailwind CSS، مدیریت وضعیت، معماری Clean و بهینه‌سازی عملکرد وب اپلیکیشن‌های سازمانی.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۵/۱۰',
      applicationsCount: 8,
      criteria: [
        { id: 'c1', title: 'تسلط بر React و معماری کلاینت', weight: 30, description: 'تجربه کامپوننت‌نویسی تمیز و هوک‌های اختصاصی' },
        { id: 'c2', title: 'تایپ‌اسکریپت پیشرفته و مدیریت خطا', weight: 25, description: 'طراحی تایپ‌های ایزوله و Type-Safety کامل' },
        { id: 'c3', title: 'طراحی واکنش‌گرا و سازگاری کامل RTL', weight: 20, description: 'پیاده‌سازی روان قالب‌های راست‌چین فارسی' },
        { id: 'c4', title: 'روحیه کار تیمی و مهارت‌های ارتباطی', weight: 15, description: 'مشارکت فعال در بررسی کد و متدولوژی چابک' },
        { id: 'c5', title: 'سابقه کار با تست‌نویسی و ابزارهای CI/CD', weight: 10, description: 'آشنایی با تست واحد و ابزارهای بیلد مدرن' },
      ],
    },
    {
      id: 'job-2',
      title: 'مدیر محصول ارشد (Senior Product Manager)',
      department: 'مدیریت محصول و نوآوری',
      employmentType: 'تمام‌وقت',
      location: 'تهران، ونک',
      description: 'هدایت نقشه راه محصولات سازمانی، کشف نیازهای مشتریان B2B ایرانی و هماهنگی میان تیم‌های بازاریابی، طراحی و مهندسی.',
      requirements: 'حداقل ۴ سال سابقه مدیریت محصول در شرکت‌های مقیاس‌بالا، تسلط بر چارچوب اسکرام، تحلیل داده با SQL و مصاحبه با کاربران.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۱',
      applicationsCount: 5,
      criteria: [
        { id: 'c21', title: 'تفکر محصولی و استراتژی بازار ایران', weight: 35, description: 'شناخت نیازمندی‌های سازمانی و رگولاتوری داخلی' },
        { id: 'c22', title: 'تحلیل داده و شاخص‌های کلیدی (KPIs)', weight: 25, description: 'توانایی کار با سنجه‌های نگهداشت و رشد کاربر' },
        { id: 'c23', title: 'رهبری تیم متقاطع و ارتباط با ذینفعان', weight: 25, description: 'مذاکره اثربخش و حل تعارضات تیمی' },
        { id: 'c24', title: 'آشنایی با تجربه کاربری (UX Research)', weight: 15, description: 'طراحی سفر کاربر و پروتوتایپ سریع' },
      ],
    },
    {
      id: 'job-3',
      title: 'کارشناس منابع انسانی و جذب استعداد (Tech Recruiter)',
      department: 'منابع انسانی',
      employmentType: 'تمام‌وقت',
      location: 'تهران، میدان ونک',
      description: 'مدیریت فرایند سرچ، غربالگری رزومه‌ها، مصاحبه‌های اولیه و توسعه برند کارفرمایی سازمان در حوزه فناوری.',
      requirements: 'تسلط بر فنون مصاحبه مبتنی بر شایستگی، شبکه‌سازی فعال در لینکدین و آشنایی با قوانین کار و تامین اجتماعی.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۱۲',
      applicationsCount: 3,
      criteria: [
        { id: 'c31', title: 'تکنیک‌های مصاحبه مبتنی بر شایستگی', weight: 35, description: 'ارزیابی مدل رفتاری STAR و صلاحیت‌های نرم' },
        { id: 'c32', title: 'استعدادیابی در حوزه IT و مهندسی', weight: 30, description: 'درک اصطلاحات فنی و کانال‌های جذب متخصصین' },
        { id: 'c33', title: 'آشنایی با قانون کار و قراردادهای استخدامی', weight: 20, description: 'قرارداد کار معین، آزمایشی و الزامات قانونی' },
        { id: 'c34', title: 'انرژی مثبت و مهارت‌های ارتباطی قوی', weight: 15, description: 'تجربه تعامل همدلانه با متقاضیان' },
      ],
    },
    {
      id: 'job-4',
      title: 'سرپرست خطوط تولید و بسته‌بندی مکانیزه سلولزی و آرایشی',
      department: 'کارخانجات و صنایع تولیدی اشتهارد و سیمین‌دشت',
      employmentType: '۳ نوبت کاری چرخشی',
      location: 'البرز، شهرک صنعتی اشتهارد',
      description: 'سرپرستی و پایش پیوسته خطوط تولید و بسته‌بندی مکانیزه محصولات دستمال مرطوب دافی و کرم‌های کامان منطبق با استاندارد GMP.',
      requirements: 'حداقل ۵ سال سابقه سرپرستی شیفت در صنایع بهداشتی و سلولزی، تسلط بر برنامه‌ریزی تولید و اصول 5S.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۵',
      applicationsCount: 12,
      criteria: [
        { id: 'c41', title: 'تجربه سرپرستی شیفت در صنایع FMCG و آرایشی', weight: 40 },
        { id: 'c42', title: 'آشنایی کامل با استاندارد GMP و اصول بهداشتی', weight: 30 },
        { id: 'c43', title: 'مدیریت و انگیزش تیم اپراتورها و کارگران خط', weight: 30 },
      ],
    },
    {
      id: 'job-5',
      title: 'کارشناس ارشد فرمولاسیون و R&D محصولات مراقبت از پوست',
      department: 'لابراتوارهای تحقیق، توسعه و فرمولاسیون (R&D)',
      employmentType: 'تمام‌وقت روزکار',
      location: 'مجتمع آزمایشگاهی البرز',
      description: 'طراحی، تست و بهینه‌سازی فرمولاسیون‌های جدید محصولات ضدآفتاب و آبرسان کامان و آمبرلا با استانداردهای فارماکوپه.',
      requirements: 'کارشناسی ارشد یا دکتری شیمی دارویی/کاربردی، حداقل ۳ سال سابقه کار در لابراتوار آرایشی و تست‌های پایداری.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۸',
      applicationsCount: 7,
      criteria: [
        { id: 'c51', title: 'تسلط بر فرمولاسیون امولسیون‌ها و پایدارکننده‌ها', weight: 45 },
        { id: 'c52', title: 'آشنایی با تست‌های پایداری شتاب‌یافته و آنالیز دستگاهی', weight: 30 },
        { id: 'c53', title: 'زبان انگلیسی تخصصی و مطالعه مقالات بین‌المللی', weight: 25 },
      ],
    },
    {
      id: 'job-6',
      title: 'مدیر برند (Brand Manager) محصولات مراقبت شخصی دافی و کامان',
      department: 'مارکتینگ، روابط عمومی و مدیریت برندها (PR & Brands)',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران، خیابان ولیعصر',
      description: 'تدوین استراتژی بازاریابی ۳۶۰ درجه برندها، نظارت بر کمپین‌های تبلیغاتی محیطی و دیجیتال و تحلیل سهم بازار.',
      requirements: 'حداقل ۴ سال سابقه Brand Management در برندهای شناخته‌شده FMCG ایران، تسلط بر تحقیقات بازار و کار با آژانس‌ها.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۱۰',
      applicationsCount: 9,
      criteria: [
        { id: 'c61', title: 'تجربه هدایت کمپین‌های بزرگ ۳۶۰ درجه FMCG', weight: 40 },
        { id: 'c62', title: 'تحلیل داده‌های فروش و تحقیقات رفتار مصرف‌کننده', weight: 35 },
        { id: 'c63', title: 'خلاقیت در پیام‌رسانی برند و مدیریت ذینفعان', weight: 25 },
      ],
    },
    {
      id: 'job-7',
      title: 'سرپرست فروش مویرگی داروخانه‌ای و فروشگاه‌های زنجیره‌ای',
      department: 'فروش سراسری، زنجیره‌ای و توزیع مویرگی (FMCG Sales)',
      employmentType: 'تمام‌وقت میدانی',
      location: 'شعبه مرکزی تهران و پوشش داروخانه‌های کشور',
      description: 'مدیریت تیم ویزیتورهای علمی و داروخانه‌ای، تحقق تارگت‌های فروش سبد محصولات دافی، کامان، میس‌ویک و کاپوت.',
      requirements: 'حداقل ۴ سال سابقه فروش مویرگی در شرکت‌های پخش معتبر بهداشتی-دارویی و شناخت داروخانه‌های کلیدی.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۱۱',
      applicationsCount: 16,
      criteria: [
        { id: 'c71', title: 'تسلط بر فنون مذاکره و فروش مویرگی به داروخانه‌ها', weight: 45 },
        { id: 'c72', title: 'توانایی هدایت، پایش و انگیزش تیم ویزیتورها', weight: 35 },
        { id: 'c73', title: 'تحلیل گزارش‌های تارگت و پوشش مناطق فروش', weight: 20 },
      ],
    },
    {
      id: 'job-8',
      title: 'کارشناس ارشد آزمایشگاه میکروبیولوژی و کنترل کیفیت (QC)',
      department: 'کنترل کیفیت و تضمین کیفیت (QA & QC)',
      employmentType: 'تمام‌وقت منطبق با شیفت تولید',
      location: 'آزمایشگاه کارخانجات اشتهارد',
      description: 'انجام آزمون‌های بار میکروبی مواد اولیه، آب دیونیزه و محصول نهایی منطبق با الزامات سازمان غذا و دارو.',
      requirements: 'کارشناسی ارشد میکروبیولوژی یا زیست‌شناسی، تسلط بر تکنیک‌های کشت سلولی و مستندسازی GMP.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۷',
      applicationsCount: 6,
      criteria: [
        { id: 'c81', title: 'تسلط بر آزمون‌های میکروبیولوژی محصولات آرایشی', weight: 45 },
        { id: 'c82', title: 'مستندسازی استاندارد آزمایشگاهی GLP و GMP', weight: 30 },
        { id: 'c83', title: 'دقت در نمونه‌برداری و سرعت عمل در گزارش‌دهی', weight: 25 },
      ],
    },
    {
      id: 'job-9',
      title: 'کارشناس بازرگانی خارجی و تامین مواد اولیه آرایشی',
      department: 'زنجیره تامین، بازرگانی خارجی و لجستیک (Supply Chain)',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران / انبار شورآباد',
      description: 'سورسینگ و خرید اسانس‌ها و مواد موثره از تامین‌کنندگان معتبر اروپایی و آسیایی، تخصیص ارز و ثبت سفارش در سامانه جامع تجارت.',
      requirements: 'تسلط بر اینکوترمز، فرایندهای نیما، ثبت سفارش و مکاتبات بین‌المللی به زبان انگلیسی.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۲',
      applicationsCount: 11,
      criteria: [
        { id: 'c91', title: 'تسلط بر سامانه جامع تجارت، ثبت سفارش و گمرک', weight: 40 },
        { id: 'c92', title: 'زبان انگلیسی بازرگانی و مذاکره با شرکت‌های خارجی', weight: 35 },
        { id: 'c93', title: 'آشنایی با مواد اولیه صنعت کازمتیک و بهداشتی', weight: 25 },
      ],
    },
    {
      id: 'job-10',
      title: 'رئیس حسابداری صنعتی و بهای تمام‌شده کارخانجات',
      department: 'امور مالی، بهای تمام‌شده و حسابداری صنعتی',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران و حضور دوره‌ای در کارخانه اشتهارد',
      description: 'محاسبه دقیق بهای تمام‌شده استاندارد و واقعی محصولات بهداشتی، تسهیم سربار، انحراف‌گیری مواد و کنترل ضایعات.',
      requirements: 'تسلط بر سیستم‌های حسابداری بهای تمام‌شده در کارخانجات تولیدی، نرم‌افزارهای یکپارچه و گزارش‌گری مالیاتی.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۳',
      applicationsCount: 8,
      criteria: [
        { id: 'c101', title: 'تسلط بر محاسبه بهای تمام‌شده در خطوط تولید پیوسته', weight: 45 },
        { id: 'c102', title: 'انحراف‌گیری نرخ و مصرف مواد اولیه و سربار کارخانه', weight: 35 },
        { id: 'c103', title: 'تحلیل صورت‌های مالی و بستن دوره‌های مالیاتی', weight: 20 },
      ],
    },
    {
      id: 'job-11',
      title: 'کارشناس ارشد ثبت پروانه‌ها و رگولاتوری سازمان غذا و دارو',
      department: 'امور حقوقی، قراردادها و رگولاتوری غذا و دارو',
      employmentType: 'تمام‌وقت',
      location: 'ستاد مرکزی تهران',
      description: 'پیگیری پرونده‌های تمدید و صدور پروانه‌های ساخت بهداشتی در سازمان غذا و دارو، سامانه TTAC و اخذ مجوزهای ترخیص.',
      requirements: 'حداقل ۳ سال سابقه کار رگولاتوری در حوزه کازمتیک و دارویی، تسلط بر سامانه‌های وزارت بهداشت و مستندات CTD.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۴',
      applicationsCount: 5,
      criteria: [
        { id: 'c111', title: 'تسلط بر سامانه TTAC و الزامات سازمان غذا و دارو', weight: 45 },
        { id: 'c112', title: 'تنظیم مدارک فنی، بالینی و پرونده‌های فرمولاسیون', weight: 35 },
        { id: 'c113', title: 'مهارت‌های پیگیری اداری و ارتباط اثربخش با کارشناسان', weight: 20 },
      ],
    },
    {
      id: 'job-12',
      title: 'مهندس برق صنعتی، تابلوهای قدرت و اتوماسیون PLC',
      department: 'مهندسی، تاسیسات و نگهداری و تعمیرات (نت صنعتی - PM)',
      employmentType: 'تمام‌وقت شیفت آماده‌باش',
      location: 'کارخانجات اشتهارد',
      description: 'عیب‌یابی، تعمیر و نگهداری سیستم‌های برق صنعتی، کنترل‌کننده‌های PLC خطوط بسته‌بندی مکانیزه و درایوهای فرکانسی.',
      requirements: 'مهندسی برق قدرت یا کنترل، تسلط بر PLC زیمنس S7 و عیب‌یابی نقشه‌های مدار فرمان و قدرت.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۹',
      applicationsCount: 8,
      criteria: [
        { id: 'c121', title: 'تسلط بر برنامه‌نویسی و عیب‌یابی PLC زیمنس و اینورترها', weight: 45 },
        { id: 'c122', title: 'اجرای برنامه‌های PM و کاهش توقفات خط تولید', weight: 35 },
        { id: 'c123', title: 'رعایت پروتکل‌های ایمنی برق فشار قوی کارخانه', weight: 20 },
      ],
    },
    {
      id: 'job-13',
      title: 'سرپرست بهداشت حرفه‌ای، ایمنی کار و محیط زیست (HSE)',
      department: 'بهداشت، ایمنی و محیط زیست (HSE کارخانجات)',
      employmentType: 'تمام‌وقت',
      location: 'کارخانجات اشتهارد و سیمین‌دشت',
      description: 'نظارت بر ایمنی اماکن تولیدی، کنترل آلاینده‌های زیست‌محیطی، برگزاری دوره‌های ایمنی کارگران و پایش حوادث ناشی از کار.',
      requirements: 'کارشناسی یا ارشد مهندسی بهداشت حرفه‌ای یا ایمنی صنعتی، گواهینامه‌های ممیزی OHSAS 18001 و ISO 14001.',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۰۱',
      applicationsCount: 4,
      criteria: [
        { id: 'c131', title: 'شناسایی خطرات، ارزیابی ریسک و واکنش در شرایط اضطراری', weight: 45 },
        { id: 'c132', title: 'آموزش ایمنی پرسنل و انطباق با قوانین وزارت کار', weight: 30 },
        { id: 'c133', title: 'مدیریت پسماندهای صنعتی و پایش خروجی تصفیه‌خانه', weight: 25 },
      ],
    },
  ];

  public candidates: Candidate[] = [
    {
      id: 'cand-1',
      jobId: 'job-1',
      jobTitle: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      fullName: 'نیلوفر رضوانی',
      email: 'n.rezvani@example.com',
      phone: '09123456789',
      resumeFileName: 'Niloufar_Rezvani_Resume.pdf',
      resumeText: `سوابق تحصیلی: کارشناسی ارشد مهندسی نرم‌افزار دانشگاه صنعتی شریف.
سوابق شغلی:
- توسعه‌دهنده ارشد فرانت‌اند در شرکت داده‌پردازی آریا (۱۴۰۰ تاکنون): بازطراحی داشبورد سازمانی با React 18 و TypeScript، کاهش زمان لود صفحه به میزان ۴۰٪، هدایت تیم ۴ نفره فرانت‌اند.
- برنامه‌نویس وب در استارتاپ پیشرو (۱۳۹۸ تا ۱۴۰۰): پیاده‌سازی سیستم دیزاین سیستم کامل با Tailwind CSS و طراحی ریسپانسیو RTL.
مهارت‌ها: React, TypeScript, Next.js, Redux Toolkit, Tailwind CSS, Jest, RTL UI/UX.`,
      overallScore: 9.2,
      category: CandidateCategory.INTERVIEW_PRIORITY,
      stage: CandidateStage.IN_PERSON_INTERVIEW,
      strengths: [
        'تسلط عمیق و اثبات‌شده بر React و تایپ‌اسکریپت در مقیاس‌های سازمانی بالا',
        'سابقه رهبری فنی و بازطراحی سیستم دیزاین با تمرکز بر RTL فارسی',
        'تحصیلات ممتاز مهندسی از دانشگاه شریف با پایه علمی مستحکم',
      ],
      weaknesses: [
        'تجربه کمتر در تست‌های End-to-End پیشرفته با Cypress نسبت به سایر بخش‌ها',
      ],
      resumeQuotes: [
        '«بازطراحی داشبورد سازمانی با React 18 و TypeScript، کاهش زمان لود صفحه به میزان ۴۰٪»',
        '«پیاده‌سازی سیستم دیزاین سیستم کامل با Tailwind CSS و طراحی ریسپانسیو RTL»',
      ],
      criteriaScores: {
        'تسلط بر React و معماری کلاینت': 9.5,
        'تایپ‌اسکریپت پیشرفته و مدیریت خطا': 9.2,
        'طراحی واکنش‌گرا و سازگاری کامل RTL': 9.8,
        'روحیه کار تیمی و مهارت‌های ارتباطی': 9.0,
        'سابقه کار با تست‌نویسی و ابزارهای CI/CD': 8.0,
      },
      inTalentPool: false,
      scheduledInterview: '2026-09-12T10:00:00Z',
      interviewJalali: '۱۴۰۳/۰۶/۲۲ ساعت ۱۰:۰۰',
      interviewType: 'مصاحبه فنی و کدنویسی زنده (حضوری)',
      interviewNotes: 'تسلط عالی روی مفاهیم همزمانی و معماری هوک‌ها دارد. آماده ارزیابی نهایی در جلسه حضوری.',
      appliedAtJalali: '۱۴۰۳/۰۶/۰۵',
    },
    {
      id: 'cand-2',
      jobId: 'job-1',
      jobTitle: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      fullName: 'امیرحسین کاظمی',
      email: 'a.kazemi@example.com',
      phone: '09351234567',
      resumeFileName: 'Amirhossein_Kazemi_CV.pdf',
      resumeText: `سوابق: کارشناسی فناوری اطلاعات دانشگاه تهران.
۳ سال سابقه برنامه‌نویسی React و جاوااسکریپت در شرکت فناوران نوین.
پروژه‌ها: پنل فروشگاهی، وب‌اپلیکیشن سفارش آنلاین غذا.
مهارت‌ها: React, JavaScript ES6+, HTML5, CSS3, Bootstrap, REST APIs.
علاقه‌مند به یادگیری عمیق‌تر تایپ‌اسکریپت و اصول مهندسی نرم‌افزار.`,
      overallScore: 6.4,
      category: CandidateCategory.NEEDS_REVIEW,
      stage: CandidateStage.PHONE_INTERVIEW,
      strengths: [
        'تجربه خوب کار عملی با React و پیاده‌سازی رابط کاربری فروشگاهی',
        'آشنایی با نیازهای روزمره فرانت‌اند و کار با APIهای RESTful',
      ],
      weaknesses: [
        'سابقه کار با تایپ‌اسکریپت محدود است و به تازگی شروع به یادگیری کرده',
        'آشنایی کم با ابزارهای تست‌نویسی خودکار و استانداردهای اینترپرایز',
      ],
      resumeQuotes: [
        '«۳ سال سابقه برنامه‌نویسی React و جاوااسکریپت در شرکت فناوران نوین»',
        '«علاقه‌مند به یادگیری عمیق‌تر تایپ‌اسکریپت و اصول مهندسی نرم‌افزار»',
      ],
      criteriaScores: {
        'تسلط بر React و معماری کلاینت': 7.0,
        'تایپ‌اسکریپت پیشرفته و مدیریت خطا': 5.0,
        'طراحی واکنش‌گرا و سازگاری کامل RTL': 7.5,
        'روحیه کار تیمی و مهارت‌های ارتباطی': 7.2,
        'سابقه کار با تست‌نویسی و ابزارهای CI/CD': 4.5,
      },
      inTalentPool: false,
      scheduledInterview: '2026-09-14T14:30:00Z',
      interviewJalali: '۱۴۰۳/۰۶/۲۴ ساعت ۱۴:۳۰',
      interviewType: 'مصاحبه غربالگری تلفنی',
      interviewNotes: 'برای موقعیت ارشد شاید نیاز به تسلط بیشتر در TS داشته باشد، برای موقعیت Mid-Level بسیار مستعد است.',
      appliedAtJalali: '۱۴۰۳/۰۶/۰۷',
    },
    {
      id: 'cand-3',
      jobId: 'job-1',
      jobTitle: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      fullName: 'سارا مهدی‌پور',
      email: 'sara.mehdipour@example.com',
      phone: '09198765432',
      resumeFileName: 'Sara_Mehdipour_Resume.pdf',
      resumeText: `سوابق: فارغ‌التحصیل رشته گرافیک رایانه.
۶ ماه کارآموزی طراحی رابط کاربری با فیگما و ساخت قالب‌های وردپرسی ساده با HTML و کدهای جی‌کوئری (jQuery).
بدون سابقه کار با React سازمانی یا تایپ‌اسکریپت.`,
      overallScore: 3.8,
      category: CandidateCategory.INITIAL_REJECTION,
      stage: CandidateStage.REJECTED,
      strengths: [
        'تسلط خوب بر ابزارهای طراحی بصری مانند Figma و سلیقه بصری مناسب',
      ],
      weaknesses: [
        'عدم تسلط بر React و عدم سابقه کار با زبان TypeScript',
        'فاصله زیاد با نیازمندی‌های عنوان شغلی کارشناس ارشد مهندسی نرم‌افزار',
      ],
      resumeQuotes: [
        '«۶ ماه کارآموزی طراحی رابط کاربری با فیگما و ساخت قالب‌های وردپرسی»',
        '«بدون سابقه کار با React سازمانی یا تایپ‌اسکریپت»',
      ],
      criteriaScores: {
        'تسلط بر React و معماری کلاینت': 3.0,
        'تایپ‌اسکریپت پیشرفته و مدیریت خطا': 2.0,
        'طراحی واکنش‌گرا و سازگاری کامل RTL': 6.0,
        'روحیه کار تیمی و مهارت‌های ارتباطی': 6.5,
        'سابقه کار با تست‌نویسی و ابزارهای CI/CD': 2.0,
      },
      inTalentPool: true,
      talentPoolNotes: 'برای موقعیت‌های آینده در زمینه طراحی رابط کاربری (UI/UX Junior) یا کارآموزی بسیار مناسب است.',
      appliedAtJalali: '۱۴۰۳/۰۶/۰۲',
      emailDraft: {
        type: 'REJECTION',
        subject: 'نتیجه ارزیابی اولیه رزومه شما برای فرصت شغلی توسعه فرانت‌اند - هلدینگ سیلانه سبز',
        body: `سرکار خانم سارا مهدی‌پور گرامی،

با سلام و احترام،
از اینکه وقت ارزشمند خود را صرف ارسال رزومه برای موقعیت «کارشناس ارشد توسعه فرانت‌اند» در مجموعه ما نمودید، صمیمانه سپاسگزاریم.

پس از بررسی کارشناسی سوابق تحصیلی و تجربیات ارزنده شما در زمینه طراحی گرافیک و رابط کاربری، به اطلاع می‌رسانیم که با توجه به نیازمندی‌های فنی فوری این موقعیت به تسلط عمیق بر معماری React و زبان TypeScript، در این مقطع امکان ادامه فرایند ارزیابی مقدور نمی‌باشد.

با این وجود، با توجه به استعداد و ذوق هنری مشهود در نمونه‌کارهای شما، رزومه شما با کمال افتخار در «استخر استعدادهای سازمانی ما» محفوظ خواهد ماند تا در صورت گشایش موقعیت‌های متناسب با زمینه طراحی UI، بی‌درنگ با شما تماس حاصل نماییم.

با آرزوی توفیق و بهروزی روزافزون برای شما،
تیم جذب و استخدام منابع انسانی`,
        status: 'DRAFT_ONLY',
        createdAtJalali: '۱۴۰۳/۰۶/۰۳',
      },
    },
    {
      id: 'cand-4',
      jobId: 'job-1',
      jobTitle: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      fullName: 'محمدرضا سلطانی',
      email: 'm.soltani@example.com',
      phone: '09121112233',
      resumeFileName: 'Mohammadreza_Soltani.pdf',
      resumeText: `سوابق: مهندسی کامپیوتر دانشگاه علم و صنعت.
۵ سال سابقه در توسعه وب‌سرویس‌ها و برنامه‌های تحت وب بزرگ.
مسلط بر React, TypeScript, Next.js App Router, TanStack Query, Docker.
سوابق کاری در شرکت داده‌ورزی سدید و زرین‌پال.`,
      overallScore: 8.8,
      category: CandidateCategory.INTERVIEW_PRIORITY,
      stage: CandidateStage.OFFER,
      strengths: [
        'تسلط عالی بر اکوسیستم مدرن React، Next.js و State Management',
        'سابقه درخشان در سیستم‌های پرترافیک فین‌تک و پرداخت الکترونیک',
      ],
      weaknesses: [
        'درخواست حقوق پیشنهادی بالاتر از میانگین بودجه پیش‌بینی‌شده',
      ],
      resumeQuotes: [
        '«۵ سال سابقه در توسعه وب‌سرویس‌ها و برنامه‌های تحت وب بزرگ»',
        '«سوابق کاری در شرکت داده‌ورزی سدید و زرین‌پال»',
      ],
      criteriaScores: {
        'تسلط بر React و معماری کلاینت': 9.0,
        'تایپ‌اسکریپت پیشرفته و مدیریت خطا': 9.0,
        'طراحی واکنش‌گرا و سازگاری کامل RTL': 8.5,
        'روحیه کار تیمی و مهارت‌های ارتباطی': 8.8,
        'سابقه کار با تست‌نویسی و ابزارهای CI/CD': 8.5,
      },
      inTalentPool: false,
      appliedAtJalali: '۱۴۰۳/۰۵/۲۵',
    },
    {
      id: 'cand-5',
      jobId: 'job-2',
      jobTitle: 'مدیر محصول ارشد (Senior Product Manager)',
      fullName: 'پریسا اعتمادی',
      email: 'parisa.etemadi@example.com',
      phone: '09129998877',
      resumeFileName: 'Parisa_Etemadi_CV.pdf',
      resumeText: `کارشناسی ارشد مدیریت کسب‌وکار (MBA) از دانشگاه تهران.
۴ سال تجربه به عنوان مدیر محصول در شرکت اسنپ‌فود و دیجی‌کالا.
تسلط بر OKR، آنالیز متریک‌های CAC و LTV، طراحی داستان‌های کاربر و تحلیل عمیق داده با SQL و Tableau.`,
      overallScore: 9.0,
      category: CandidateCategory.INTERVIEW_PRIORITY,
      stage: CandidateStage.INITIAL_SCREENING,
      strengths: [
        'تجربه عملی در دو تا از بزرگ‌ترین پلتفرم‌های دیجیتال مقیاس‌بالای کشور',
        'تسلط هم‌زمان بر زبان فنی، نیازمندی‌های بیزنس و زبان مشتریان',
      ],
      weaknesses: [
        'سابقه کار کمتر در محصولات تخصصی سازمانی (B2B Enterprise) نسبت به B2C',
      ],
      resumeQuotes: [
        '«۴ سال تجربه به عنوان مدیر محصول در شرکت اسنپ‌فود و دیجی‌کالا»',
        '«تسلط بر OKR، آنالیز متریک‌های CAC و LTV و تحلیل عمیق داده»',
      ],
      criteriaScores: {
        'تفکر محصولی و استراتژی بازار ایران': 9.2,
        'تحلیل داده و شاخص‌های کلیدی (KPIs)': 9.5,
        'رهبری تیم متقاطع و ارتباط با ذینفعان': 8.8,
        'آشنایی با تجربه کاربری (UX Research)': 8.5,
      },
      inTalentPool: false,
      appliedAtJalali: '۱۴۰۳/۰۶/۱۰',
    },
  ];

  // ---------------- Module 2: Employees ----------------
  public employees: Employee[] = [
    {
      id: 'emp-1',
      personnelCode: '۱۰۰۲۴',
      nationalId: '۰۰۱۸۲۳۴۵۶۷',
      fullName: 'مهندس کیوان سهرابی',
      fatherName: 'احمد',
      birthDateJalali: '۱۳۶۵/۰۴/۱۸',
      phone: '09121114455',
      email: 'k.sohrabi@company.ir',
      department: 'منابع انسانی',
      jobTitle: 'مدیر ارشد منابع انسانی',
      hireDateJalali: '۱۴۰۰/۰۱/۱۵',
      baseSalaryToman: 48000000,
      maritalStatus: 'MARRIED',
      childrenCount: 2,
      bankIban: 'IR550120000000001234567890',
      status: 'ACTIVE',
      ssoContributionDays: 2000,
      commuteAllowanceToman: 1500000,
      documents: [
        { id: 'doc-1', title: 'قرارداد کار معین سال ۱۴۰۳', fileType: 'PDF', fileUrl: '#', uploadedAtJalali: '۱۴۰۳/۰۱/۱۰' },
        { id: 'doc-2', title: 'تصویر شناسنامه و کارت ملی', fileType: 'PDF', fileUrl: '#', uploadedAtJalali: '۱۴۰۰/۰۱/۱۵' },
      ],
      jobHistories: [
        { id: 'jh-1', changeType: 'PROMOTION', previousTitle: 'سرپرست جذب و استخدام', newTitle: 'مدیر ارشد منابع انسانی', effectiveDateJalali: '۱۴۰۲/۰۱/۰۱', description: 'ارتقای سازمانی پس از ارزیابی سالانه' },
      ],
    },
    {
      id: 'emp-2',
      personnelCode: '۱۰۱۵۵',
      nationalId: '۰۴۵۱۱۲۳۴۸۹',
      fullName: 'مریم فتاحی',
      fatherName: 'رضا',
      birthDateJalali: '۱۳۷۱/۰۸/۲۲',
      phone: '09367778899',
      email: 'm.fattahi@company.ir',
      department: 'فناوری اطلاعات',
      jobTitle: 'معمار ارشد نرم‌افزار',
      hireDateJalali: '۱۴۰۱/۰۳/۰۱',
      baseSalaryToman: 42000000,
      maritalStatus: 'MARRIED',
      childrenCount: 1,
      bankIban: 'IR120170000000009876543210',
      directManagerId: 'emp-1',
      status: 'ACTIVE',
      ssoContributionDays: 1600,
      commuteAllowanceToman: 1500000,
      documents: [
        { id: 'doc-3', title: 'قرارداد کار تمام‌وقت', fileType: 'PDF', fileUrl: '#', uploadedAtJalali: '۱۴۰۱/۰۳/۰۱' },
      ],
      jobHistories: [],
    },
    {
      id: 'emp-3',
      personnelCode: '۱۰۲۴۰',
      nationalId: '۰۰۷۹۹۸۸۷۷۱',
      fullName: 'علی مرادی',
      fatherName: 'حسین',
      birthDateJalali: '۱۳۷۴/۱۱/۰۴',
      phone: '09193332211',
      email: 'a.moradi@company.ir',
      department: 'فناوری اطلاعات',
      jobTitle: 'کارشناس دواپس و زیرساخت',
      hireDateJalali: '۱۴۰۲/۰۶/۰۱',
      baseSalaryToman: 34000000,
      maritalStatus: 'SINGLE',
      childrenCount: 0,
      bankIban: 'IR890560000000005544332211',
      directManagerId: 'emp-2',
      status: 'ACTIVE',
      ssoContributionDays: 1100,
      commuteAllowanceToman: 1500000,
      documents: [],
      jobHistories: [],
    },
  ];

  // ---------------- Module 3: Attendance & Leave ----------------
  public attendances: AttendanceRecord[] = [
    {
      id: 'att-1',
      employeeId: 'emp-2',
      employeeName: 'مریم فتاحی',
      dateJalali: '۱۴۰۳/۰۶/۱۵',
      checkIn: '۰۷:۵۸',
      checkOut: '۱۷:۰۲',
      delayMinutes: 0,
      overtimeHours: 1.0,
      status: 'PRESENT',
    },
    {
      id: 'att-2',
      employeeId: 'emp-3',
      employeeName: 'علی مرادی',
      dateJalali: '۱۴۰۳/۰۶/۱۵',
      checkIn: '۰۸:۲۵',
      checkOut: '۱۶:۴۵',
      delayMinutes: 25,
      overtimeHours: 0,
      status: 'PRESENT',
    },
  ];

  public leaveRequests: LeaveRequest[] = [
    {
      id: 'leave-1',
      employeeId: 'emp-3',
      employeeName: 'علی مرادی',
      leaveType: LeaveType.ANNUAL,
      startDateJalali: '۱۴۰۳/۰۶/۲۵',
      endDateJalali: '۱۴۰۳/۰۶/۲۷',
      daysCount: 2,
      reason: 'سفر خانوادگی و امور شخصی',
      status: LeaveStatus.PENDING_MANAGER,
      createdAtJalali: '۱۴۰۳/۰۶/۱۴',
    },
    {
      id: 'leave-2',
      employeeId: 'emp-2',
      employeeName: 'مریم فتاحی',
      leaveType: LeaveType.SICK,
      startDateJalali: '۱۴۰۳/۰۶/۰۵',
      endDateJalali: '۱۴۰۳/۰۶/۰۶',
      daysCount: 1,
      reason: 'گواهی پزشک معتمد تامین اجتماعی (سرماخوردگی شدید)',
      status: LeaveStatus.APPROVED,
      managerApproved: true,
      hrApproved: true,
      createdAtJalali: '۱۴۰۳/۰۶/۰۴',
    },
  ];

  // ---------------- Module 4: Payroll ----------------
  public payrollSlips: PayrollSlip[] = [
    {
      id: 'pay-1',
      employeeId: 'emp-2',
      employeeName: 'مریم فتاحی',
      personnelCode: '۱۰۱۵۵',
      monthJalali: 5,
      monthName: 'مرداد',
      yearJalali: 1403,
      baseSalaryToman: 42000000,
      housingAllowanceToman: 900000,      // مصوب حق مسکن
      bonKargariToman: 1400000,          // بن خواربار و اقلام مصرفی
      childAllowanceToman: 716618,       // حق ۱ اولاد
      commuteAllowanceToman: 2000000,
      overtimePayToman: 3500000,
      grossSalaryToman: 50516618,
      ssoInsurance7PctToman: 3088163,    // سهم بیمه شده (۷٪ از آیتم‌های مشمول)
      incomeTaxToman: 3820000,           // مالیات بر حقوق طبق پله‌های مصوب
      otherDeductionsToman: 0,
      netSalaryToman: 43608455,
      sanavatReserveToman: 3500000,      // ذخیره سنوات (یک ماه به ازای سال)
      eidiReserveToman: 7000000,         // ذخیره عیدی و پاداش (دو برابر پایه ماهانه)
      status: PayrollStatus.FINALIZED,
      paidAtJalali: '۱۴۰۳/۰۵/۳۱',
    },
  ];

  // ---------------- Module 5: Performance ----------------
  public performanceGoals: PerformanceGoal[] = [
    {
      id: 'goal-1',
      employeeId: 'emp-2',
      employeeName: 'مریم فتاحی',
      title: 'معماری مجدد میکروسرویس‌های پرداخت با پایداری ۹۹.۹٪',
      targetMetric: 'Uptime > 99.9%',
      currentProgress: 85,
      weight: 35,
      deadlineJalali: '۱۴۰۳/۰۷/۳۰',
    },
    {
      id: 'goal-2',
      employeeId: 'emp-3',
      employeeName: 'علی مرادی',
      title: 'استقرار پایپ‌لاین اتوماتیک تست و بیلد با ابزارهای بومی',
      targetMetric: 'زمان بیلد زیر ۵ دقیقه',
      currentProgress: 60,
      weight: 25,
      deadlineJalali: '۱۴۰۳/۰۸/۱۵',
    },
  ];

  // ---------------- Module 6: Training ----------------
  public trainingCourses: TrainingCourse[] = [
    {
      id: 'train-1',
      title: 'دوره جامع امنیت وب در ابعاد سازمانی (OWASP Top 10)',
      instructor: 'دکتر علیرضا کاوشگر',
      durationHours: 24,
      department: 'فناوری اطلاعات و شبکه',
      status: 'IN_PROGRESS',
      participantsCount: 14,
      completionRate: 68,
    },
    {
      id: 'train-2',
      title: 'کارگاه آشنایی با تغییرات جدید قانون کار و تامین اجتماعی',
      instructor: 'استاد فریدون حسینی (مشاور ارشد اداره کار)',
      durationHours: 8,
      department: 'منابع انسانی و اداری',
      status: 'COMPLETED',
      participantsCount: 9,
      completionRate: 100,
    },
  ];

  public skillMatrix: SkillMatrixItem[] = [
    { skillName: 'React & Front-End Architecture', category: 'تخصصی IT', requiredLevel: 4.5, teamAverageLevel: 4.2 },
    { skillName: 'TypeScript & Type Safety', category: 'تخصصی IT', requiredLevel: 4.0, teamAverageLevel: 3.8 },
    { skillName: 'قانون کار و محاسبات دستمزد', category: 'منابع انسانی', requiredLevel: 4.8, teamAverageLevel: 4.6 },
    { skillName: 'مهارت‌های مذاکره و مدیریت تعارض', category: 'مهارت‌های نرم', requiredLevel: 4.0, teamAverageLevel: 3.5 },
  ];

  // ---------------- Module 7: Checklists ----------------
  public checklistItems: ChecklistItem[] = [
    {
      id: 'chk-1',
      employeeId: 'emp-3',
      employeeName: 'علی مرادی',
      type: 'ONBOARDING',
      title: 'تحویل سیستم کاری، مانیتور دوم و هدست اداری',
      department: 'پشتیبانی فناوری اطلاعات',
      dueDateJalali: '۱۴۰۲/۰۶/۰۲',
      isCompleted: true,
      completedAtJalali: '۱۴۰۲/۰۶/۰۱',
    },
    {
      id: 'chk-2',
      employeeId: 'emp-3',
      employeeName: 'علی مرادی',
      type: 'ONBOARDING',
      title: 'ایجاد حساب کاربری ایمیل سازمانی و دسترسی Gitlab',
      department: 'امنیت و شبکه',
      dueDateJalali: '۱۴۰۲/۰۶/۰۲',
      isCompleted: true,
      completedAtJalali: '۱۴۰۲/۰۶/۰۲',
    },
    {
      id: 'chk-3',
      employeeId: 'emp-3',
      employeeName: 'علی مرادی',
      type: 'ONBOARDING',
      title: 'جلسه معارفه فرهنگ سازمانی با مدیر منابع انسانی',
      department: 'منابع انسانی',
      dueDateJalali: '۱۴۰۲/۰۶/۰۷',
      isCompleted: true,
      completedAtJalali: '۱۴۰۲/۰۶/۰۶',
    },
  ];

  // ---------------- Module 8: Metrics ----------------
  public metrics: HRDashboardMetrics = {
    turnoverRatePct: 3.8,                // نرخ خروج پرسنل (درصد سالانه)
    averageTimeToHireDays: 16,           // میانگین زمان استخدام (روز)
    costPerHireToman: 6800000,           // هزینه هر استخدام (تومان)
    activeHeadcount: 1350,               // پرسنل کل هلدینگ سیلانه سبز
    openPositionsCount: 39,              // ردیف‌های شغلی باز دپارتمان‌ها
    pendingLeavesCount: 7,               // مرخصی‌های در انتظار بررسی
    monthlyPayrollTotalToman: 42500000000,// مجموع حقوق پرداختی هلدینگ (تومان)
  };

  // ---------------- Seilaneh Sabz Holding Departments ----------------
  public departments: any[] = [
    {
      id: 'dept-mfg',
      name: 'کارخانجات و صنایع تولیدی اشتهارد و سیمین‌دشت',
      englishName: 'Manufacturing & Industrial Plant',
      category: 'MANUFACTURING',
      headName: 'مهندس بهروز یزدانی',
      headTitle: 'مدیر ارشد کارخانجات و خطوط تولید',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      headcount: 420,
      vacancies: 6,
      brands: ['دافی (Dafi)', 'کامان (Comeon)', 'میس‌ویک (Misswake)', 'کاپوت (Kapoot)', 'زنون (Zenon)'],
      location: 'البرز، شهرک صنعتی اشتهارد، بلوار ملاصدرا غربی',
      kpiScore: 96,
      pendingLeaves: 3,
      shiftType: '۳ نوبت کاری چرخشی (صبح، عصر، شب)',
      colorTheme: 'emerald',
      activeProjects: ['اتوماسیون خط تولید دستمال مرطوب دافی', 'توسعه سالن فرمولاسیون کرم‌های تخصصی کامان'],
      description: 'مرکز اصلی تولید و بسته‌بندی مکانیزه محصولات بهداشتی، آرایشی و سلولزی هلدینگ سیلانه سبز مجهز به جدیدترین ماشین‌آلات استاندارد GMP.',
    },
    {
      id: 'dept-rnd',
      name: 'لابراتوارهای تحقیق، توسعه و فرمولاسیون (R&D)',
      englishName: 'R&D and Formulation Labs',
      category: 'R_AND_D',
      headName: 'دکتر مونا کاظمی',
      headTitle: 'دکترای داروسازی و مدیر ارشد تحقیق و فرمولاسیون',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      headcount: 34,
      vacancies: 2,
      brands: ['کامان تخصصی', 'میس‌ویک دهان و دندان', 'آمبرلا (Umbrella)'],
      location: 'آزمایشگاه جامع فرمولاسیون - مجتمع صنعتی البرز',
      kpiScore: 98,
      pendingLeaves: 1,
      shiftType: 'تخصصی روزکار (۸:۰۰ الی ۱۶:۳۰)',
      colorTheme: 'teal',
      activeProjects: ['فرمولاسیون لاین ضدآفتاب ضدآلودگی کامان', 'خمیردندان نانوهیدروکسی آپاتیت میس‌ویک'],
      description: 'طراحی، تست و توسعه فرمولاسیون‌های اختصاصی پوست، مو و دهان و دندان منطبق با استاندارد بین‌المللی فارماکوپه.',
    },
    {
      id: 'dept-mkt',
      name: 'مارکتینگ، روابط عمومی و مدیریت برندها (PR & Brands)',
      englishName: 'Marketing, Branding & PR',
      category: 'MARKETING',
      headName: 'سرکار خانم صدف آریافر',
      headTitle: 'معاونت مارکتینگ و توسعه برندهای هلدینگ',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      headcount: 68,
      vacancies: 5,
      brands: ['دافی', 'کامان', 'میس‌ویک', 'زنون', 'کدکس'],
      location: 'ستاد مرکزی تهران، خیابان ولیعصر',
      kpiScore: 92,
      pendingLeaves: 2,
      shiftType: 'تمام‌وقت شناور',
      colorTheme: 'indigo',
      activeProjects: ['کمپین سراسری ۳۶۰ درجه تابستانه دافی', 'ری‌برندینگ بسته‌بندی‌های صادراتی کامان'],
      description: 'مدیریت کمپین‌های رسانه‌ای، تبلیغات محیطی، رسانه‌های دیجیتال، برندسازی و سنجش رضایت مصرف‌کنندگان نهایی.',
    },
    {
      id: 'dept-sales',
      name: 'فروش سراسری، زنجیره‌ای و توزیع مویرگی (FMCG Sales)',
      englishName: 'National Sales & Distribution',
      category: 'SALES',
      headName: 'مهندس محمدرضا شایگان',
      headTitle: 'معاونت فروش سازمانی و شعب مویرگی کشور',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      headcount: 580,
      vacancies: 14,
      brands: ['سبد کامل محصولات هلدینگ سیلانه سبز'],
      location: 'شعبه مرکزی تهران و ۳۱ شعبه استانی فعال سراسر ایران',
      kpiScore: 95,
      pendingLeaves: 4,
      shiftType: 'تیم‌های میدانی و شیفت فروشگاهی',
      colorTheme: 'amber',
      activeProjects: ['طرح یکپارچه‌سازی ویزیتوری دیجیتال داروخانه‌ها', 'توسعه شلف محصولات در هایپرمی و افق کوروش'],
      description: 'بزرگترین ناوگان ویزیتوری و توزیع مویرگی صنعت بهداشتی به بیش از ۳۵ هزار داروخانه و فروشگاه زنجیره‌ای.',
    },
    {
      id: 'dept-scm',
      name: 'زنجیره تامین، بازرگانی خارجی و لجستیک (Supply Chain)',
      englishName: 'Supply Chain, Logistics & Procurement',
      category: 'SUPPLY_CHAIN',
      headName: 'مهندس کامران جمشیدی',
      headTitle: 'مدیر ارشد بازرگانی، تدارکات و لجستیک',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
      headcount: 95,
      vacancies: 3,
      brands: ['تامین کلیه مواد اولیه و بسته‌بندی هلدینگ'],
      location: 'انبار مکانیزه مرکزی شورآباد و گمرکات ورودی',
      kpiScore: 91,
      pendingLeaves: 1,
      shiftType: 'نوبت‌کاری انبارداری و اداری',
      colorTheme: 'blue',
      activeProjects: ['خرید اسانس‌های معطر طبیعی سوئیسی', 'راه‌اندازی سیستم WMS هوشمند انبار شورآباد'],
      description: 'تامین پیوسته مواد اولیه وارداتی و داخلی، ترخیص گمرکی، مدیریت موجودی انبارها و ناوگان لجستیک هلدینگ.',
    },
    {
      id: 'dept-qc',
      name: 'کنترل کیفیت و تضمین کیفیت (QA & QC)',
      englishName: 'Quality Assurance & Quality Control',
      category: 'QUALITY',
      headName: 'مهندس شیما رستمی',
      headTitle: 'مدیر تضمین کیفیت و تاییدیه غذا و دارو',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      headcount: 45,
      vacancies: 2,
      brands: ['تمامی محصولات و خطوط تولید'],
      location: 'آزمایشگاه میکروبیولوژی و شیمیایی اشتهارد',
      kpiScore: 99,
      pendingLeaves: 0,
      shiftType: 'شیفت تطبیق با ساعات تولید',
      colorTheme: 'emerald',
      activeProjects: ['ممیزی سالانه استاندارد ISO 22716 آرایشی', 'پایش پیوسته آلودگی‌های بار میکروبی آب دیونیزه'],
      description: 'تضمین سلامت، بهداشت و انطباق فرمولاسیون با بالاترین الزامات وزارت بهداشت و سازمان غذا و داروی ایران.',
    },
    {
      id: 'dept-hr',
      name: 'مدیریت منابع انسانی، آموزش و فرهنگ سازمانی (People Ops)',
      englishName: 'Human Resources & People Operations',
      category: 'HR',
      headName: 'مهندس کیوان سهرابی',
      headTitle: 'معاونت منابع انسانی و توسعه سرمایه انسانی هلدینگ',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      headcount: 24,
      vacancies: 2,
      brands: ['حمایت از بیش از ۱۳۵۰ همکار در تمامی واحدهای هلدینگ'],
      location: 'ستاد مرکزی هلدینگ سیلانه سبز - طبقه ۴',
      kpiScore: 97,
      pendingLeaves: 0,
      shiftType: 'روزکار ستادی',
      colorTheme: 'rose',
      activeProjects: ['استقرار سوپراپ موبایلی هوشمند منابع انسانی', 'آکادمی آموزش تخصصی فروش ویزیتوری سیلانه'],
      description: 'جذب استعدادهای نخبه، آموزش مداوم، جبران خدمات منصفانه، سنجش رضایت شغلی و تسهیلات رفاهی کارکنان.',
    },
    {
      id: 'dept-fin',
      name: 'امور مالی، بهای تمام‌شده و حسابداری صنعتی',
      englishName: 'Finance, Costing & Accounting',
      category: 'FINANCE',
      headName: 'حمیدرضا نیک‌بین',
      headTitle: 'مدیر ارشد مالی و حسابداری صنعتی کارخانجات',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
      headcount: 38,
      vacancies: 1,
      brands: ['کلیه واحدهای تابعه هلدینگ سیلانه سبز'],
      location: 'ستاد مرکزی تهران',
      kpiScore: 94,
      pendingLeaves: 1,
      shiftType: 'روزکار',
      colorTheme: 'amber',
      activeProjects: ['سیستم لحظه‌ای بهای تمام‌شده بر اساس نوسان ارز', 'تسویه صورت‌حساب‌های پخش سراسری'],
      description: 'مدیریت جریان وجوه نقد، کنترل هزینه‌های تولید و بهای تمام‌شده، پرداخت حقوق و صورت‌های مالی حسابرسی‌شده.',
    },
    {
      id: 'dept-it',
      name: 'فناوری اطلاعات، زیرساخت و تحول دیجیتال (IT & Digital)',
      englishName: 'IT Infrastructure & Digital Transformation',
      category: 'IT',
      headName: 'مهندس پوریا راد',
      headTitle: 'مدیر ارشد فناوری اطلاعات و تحول دیجیتال',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
      headcount: 31,
      vacancies: 3,
      brands: ['پشتیبانی فنی ستاد، کارخانجات و شعب استانی'],
      location: 'ستاد مرکزی تهران - واحد فناوری',
      kpiScore: 96,
      pendingLeaves: 1,
      shiftType: 'روزکار و آماده‌باش شیفت کارخانجات',
      colorTheme: 'cyan',
      activeProjects: ['اتصال فیبر نوری بین کارخانجات اشتهارد و ستاد', 'توسعه اپلیکیشن سفارش‌گیری ویزیتورها'],
      description: 'پشتیبانی زیرساخت ابری، توسعه نرم‌افزارهای داخلی، امنیت سایبری داده‌های هلدینگ و هدایت تحول هوشمند.',
    },
    {
      id: 'dept-legal',
      name: 'امور حقوقی، قراردادها و رگولاتوری غذا و دارو',
      englishName: 'Legal, Contracts & Regulatory Affairs',
      category: 'LEGAL',
      headName: 'دکتر علیرضا معتمد',
      headTitle: 'مشاور ارشد حقوقی و مدیر قراردادهای تجاری',
      avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      headcount: 14,
      vacancies: 1,
      brands: ['حفظ مالکیت معنوی و پروانه‌های بهداشتی'],
      location: 'ستاد مرکزی تهران',
      kpiScore: 98,
      pendingLeaves: 0,
      shiftType: 'روزکار',
      colorTheme: 'violet',
      activeProjects: ['تمدید پروانه‌های بهداشتی سالانه محصولات دافی', 'تنظیم قراردادهای نمایندگی انحصاری صادرات'],
      description: 'حمایت از حقوق معنوی برندها، تنظیم قراردادهای پرسنلی و تامین‌کنندگان و دریافت پروانه‌های ساخت وزارت بهداشت.',
    },
  ];

  // ---------------- Automated HR Tasks ----------------
  public automationTasks: any[] = [
    {
      id: 'auto-payroll',
      title: 'نهایی‌سازی فیش‌های پیش‌نویس حقوقی',
      category: 'PAYROLL',
      description: 'فیش‌های DRAFT تولیدشده را نهایی (FINALIZED) می‌کند. تولید فیش همچنان با بخشنامه سال، اضافه‌کاری واقعی و کسورات قانونی در ماژول حقوق انجام می‌شود؛ فیش‌های پرداخت‌شده هرگز تغییر نمی‌کنند.',
      estimatedTimeSaved: '۲۸ ساعت در ماه',
      status: 'IDLE',
      lastRunJalali: '۱۴۰۳/۰۶/۰۱',
      successCount: 1350,
      badge: 'مالی و حقوق',
    },
    {
      id: 'auto-screening',
      title: 'بازبینی دسته‌بندی کارجویان ارزیابی‌شده',
      category: 'SCREENING',
      description: 'دسته کارجویان دارای نمره واقعی را بر اساس حد نصاب‌های موقعیت شغلی بازبینی می‌کند. هیچ رزومه‌ای تصادفی امتیازدهی یا رد نمی‌شود و هیچ مرحله استخدامی خودکار تغییر نمی‌کند.',
      estimatedTimeSaved: '۴۵ ساعت در ماه',
      status: 'IDLE',
      lastRunJalali: '۱۴۰۳/۰۶/۱۵',
      successCount: 240,
      badge: 'جذب و استخدام',
    },
    {
      id: 'auto-contracts',
      title: 'تنظیم خودکار پیش‌نویس قراردادهای کار قانونی',
      category: 'CONTRACT',
      description: 'تولید قرارداد رسمی قانون کار ایران برای نیروهای کارخانجات و ستاد با درج شروط محرمانگی و سفته ضمانت.',
      estimatedTimeSaved: '۱۸ ساعت در ماه',
      status: 'IDLE',
      lastRunJalali: '۱۴۰۳/۰۶/۱۰',
      successCount: 18,
      badge: 'امور اداری',
    },
    {
      id: 'auto-leaves',
      title: 'گزارش مرخصی‌های معوقه (فقط گزارش)',
      category: 'LEAVES',
      description: 'فهرست درخواست‌های در انتظار بررسی را گزارش می‌کند. تایید مرخصی صرفاً از جریان کاری تایید مدیر/منابع انسانی با کنترل مانده استحقاقی (ماده ۶۴) ممکن است — این وظیفه هیچ درخواستی را تایید نمی‌کند.',
      estimatedTimeSaved: '۱۲ ساعت در ماه',
      status: 'IDLE',
      lastRunJalali: 'امروز - ۱۰:۳۰',
      successCount: 14,
      badge: 'تردد و مرخصی',
    },
    {
      id: 'auto-onboarding',
      title: 'تخصیص مکانیزه چک‌لیست و بسته ان‌بوردینگ سیلانه سبز',
      category: 'ONBOARDING',
      description: 'هماهنگی خودکار تحویل پکیج محصولات بهداشتی، تجهیزات IT، سیم‌کارت سازمانی و زمان‌بندی جلسه معارفه.',
      estimatedTimeSaved: '۱۵ ساعت در ماه',
      status: 'IDLE',
      lastRunJalali: '۱۴۰۳/۰۶/۰۸',
      successCount: 9,
      badge: 'جامعه‌پذیری',
    },
    {
      id: 'auto-alerts',
      title: 'پایش خودکار انقضای قراردادها، تولدها و معاینات طب کار',
      category: 'ALERTS',
      description: 'هشدار ۳۰ روز قبل از اتمام قراردادهای پرسنلی کارخانجات و ثبت پیام تبریک سالگرد همکاری و معاینات ادواری.',
      estimatedTimeSaved: '۱۰ ساعت در ماه',
      status: 'IDLE',
      lastRunJalali: 'امروز - ۰۸:۰۰',
      successCount: 32,
      badge: 'هشدارهای هوشمند',
    },
  ];

  // -------------------------------------------------------------
  // Competitor Intelligence 1: HireVue AI Video Interview Submissions & Rubrics
  // -------------------------------------------------------------
  public videoQuestions: VideoInterviewQuestion[] = [
    {
      id: 'vq-1',
      questionText: 'در شرایطی که در شیفت شب کارخانه اشتهارد توقف ناگهانی در خط بسته‌بندی برند دافی رخ دهد، اولویت‌بندی شما برای مدیریت ضایعات و برقراری ارتباط با مدیر فنی چیست؟',
      category: 'SITUATIONAL',
      maxDurationSeconds: 120,
      preparationSeconds: 30,
      rubricCriteria: 'ارزیابی تصمیم‌گیری در شرایط استرس، رعایت استانداردهای کیفی GMP و ارتباط موثر.',
    },
    {
      id: 'vq-2',
      questionText: 'یک نمونه از پروژه‌های توسعه برند یا کمپین‌های بازاریابی محصولات مراقبت از پوست (نظیر کامان) که در آن با محدودیت بودجه مواجه شدید را شرح داده و نتیجه را بیان کنید.',
      category: 'COMPETENCY',
      maxDurationSeconds: 150,
      preparationSeconds: 45,
      rubricCriteria: 'مهارت تحلیل ROI، تفکر خلاق و داده‌محوری در سنجش اثربخشی کمپین.',
    },
    {
      id: 'vq-3',
      questionText: 'چگونه انگیزه تیم اپراتورها و کارشناسان خط تولید را در فصول اوج تقاضا و شیفت‌های اضافه کاری بالا حفظ می‌کنید؟',
      category: 'CULTURE_FIT',
      maxDurationSeconds: 90,
      preparationSeconds: 30,
      rubricCriteria: 'هوش هیجانی، اصول رهبری مربی‌گرایانه و تطابق با منشور رفتاری سیلانه سبز.',
    },
  ];

  public videoSubmissions: VideoInterviewSubmission[] = [
    {
      id: 'vis-1',
      candidateId: 'cand-1',
      candidateName: 'سارا تهرانی',
      jobId: 'job-1',
      jobTitle: 'کارشناس ارشد توسعه فرانت‌اند (React / TypeScript)',
      brand: 'هلدینگ سیلانه سبز',
      submittedAtJalali: '۱۴۰۳/۰۶/۱۴',
      status: 'COMPLETED',
      overallScore: 92,
      confidenceScore: 89,
      clarityScore: 95,
      fairnessAuditScore: 99,
      aiRecommendation: 'STRONG_RECOMMEND',
      summaryInsight: 'بیان مسلط و شیوا به زبان فارسی، ساختاردهی منطقی بر پایه چارچوب STAR، تفکر عمیق معماری در حل مسائل مقیاس‌بالا بدون هیچ‌گونه سوگیری ساختاری.',
      answers: [
        {
          questionId: 'vq-1',
          questionText: 'مدیریت شرایط بحرانی در زمان قطعی سرویس‌های ابری یا دیتابیس در زمان پروموشن‌های آنلاین',
          videoDurationSeconds: 112,
          transcript: 'در پروژه پیشین، در جریان فروش ویژه با افت عملکرد سرور مواجه شدیم. بلافاصله Circuit Breaker فعال شد و کلاینت به مود آفلاین رفت تا داده‌های سفارش بدون خطا کش شوند. پس از اطلاع‌رسانی به تیم دوآپس، توانستیم بدون قطعی برای مشتریان بحران را پشت سر بگذاریم.',
          score: 9.5,
          sentiment: 'CONFIDENT',
          aiFeedback: 'پاسخ کاملاً عمل‌گرایانه، حفظ آرامش روانی و تشریح مرحله‌به‌مرحله اقدامات فنی.',
          keyCompetencies: ['مدیریت بحران', 'تفکر سیستماتیک', 'پایداری نرم‌افزار'],
        },
        {
          questionId: 'vq-2',
          questionText: 'تجربه کار با تیم‌های چابک و تعامل با مدیران محصول و طراحان تجربه کاربری',
          videoDurationSeconds: 88,
          transcript: 'همواره سعی می‌کنم در جلسات Refinement شرکت فعال داشته باشم تا امکان‌سنجی طراحی با معماری فرانت‌اند تطبیق داده شود و از بازکاری‌های مکرر جلوگیری کنیم.',
          score: 9.0,
          sentiment: 'POSITIVE',
          aiFeedback: 'درک بالا از چرخه تولید محصول و همدلی با طراحان محصول.',
          keyCompetencies: ['ارتباطات بین‌فردی', 'همکاری تیمی چابک'],
        },
      ],
    },
    {
      id: 'vis-2',
      candidateId: 'cand-3',
      candidateName: 'مریم صالحی',
      jobId: 'job-2',
      jobTitle: 'مدیر محصول ارشد (Senior Product Manager)',
      brand: 'کامان (Come\'on)',
      submittedAtJalali: '۱۴۰۳/۰۶/۱۳',
      status: 'COMPLETED',
      overallScore: 88,
      confidenceScore: 91,
      clarityScore: 86,
      fairnessAuditScore: 98,
      aiRecommendation: 'RECOMMEND',
      summaryInsight: 'تسلط چشمگیر بر رفتار مصرف‌کننده در بازار آرایشی بهداشتی ایران، درک دقیق فیچرهای محصول و رهبری مبتنی بر داده.',
      answers: [
        {
          questionId: 'vq-2',
          questionText: 'رویکرد قیمت‌گذاری و معرفی خط تولید سرم‌های مراقبت پوستی کامان',
          videoDurationSeconds: 135,
          transcript: 'ابتدا بازخورد ۱۰۰۰ خریدار در فروشگاه‌های دیجی‌کالا و روژا را با آنالیز متن استخراج کردیم. سپس قیمت را رقابتی با برندهای وارداتی تعیین کردیم تا سهم بازار داخلی را هدف بگیریم.',
          score: 8.8,
          sentiment: 'CONFIDENT',
          aiFeedback: 'استفاده عالی از آمار، نگرش بازارمحور و ارائه سنجه‌های ملموس موفقیت.',
          keyCompetencies: ['تحقیقات بازار', 'استراتژی محصول', 'قیمت‌گذاری'],
        },
      ],
    },
    {
      id: 'vis-3',
      candidateId: 'cand-4',
      candidateName: 'امیرحسین رضایی',
      jobId: 'job-1',
      jobTitle: 'مهندس شیمی و فرمولاسیون محصولات آرایشی',
      brand: 'دافی (Dafi)',
      submittedAtJalali: '۱۴۰۳/۰۶/۱۵',
      status: 'PENDING_REVIEW',
      overallScore: 84,
      confidenceScore: 82,
      clarityScore: 86,
      fairnessAuditScore: 100,
      aiRecommendation: 'CONSIDER',
      summaryInsight: 'دانش عمیق استانداردهای آزمایشگاهی وزارت بهداشت و فرمولاسیون‌های پایدار بدون پارابن؛ نیازمند بررسی تجارب کارگاهی صنعتی.',
      answers: [
        {
          questionId: 'vq-1',
          questionText: 'پروتکل‌های ایمنی خط تولید هنگام نوسان غلظت در بچ‌های تولیدی دافی',
          videoDurationSeconds: 95,
          transcript: 'توقف تزریق اتوماتیک، نمونه‌برداری فوری ۳ نقطه و ارسال به آزمایشگاه میکروبی اشتهارد اولین گام غیرقابل مذاکره است.',
          score: 8.5,
          sentiment: 'NEUTRAL',
          aiFeedback: 'پایبندی بدون تنازل به استانداردهای بهداشتی و ایمنی سلامت مصرف‌کننده.',
          keyCompetencies: ['کنترل کیفیت GMP', 'فرمولاسیون', 'تعهد سازمانی'],
        },
      ],
    },
  ];

  // -------------------------------------------------------------
  // Competitor Intelligence 2: Eightfold AI Skill Graph & Internal Mobility
  // -------------------------------------------------------------
  public candidateSkillMatches: CandidateSkillMatch[] = [
    {
      candidateId: 'cand-1',
      candidateName: 'سارا تهرانی',
      targetJobTitle: 'کارشناس ارشد توسعه فرانت‌اند',
      brand: 'هلدینگ',
      overallMatchPct: 94,
      matchedSkills: ['React 19', 'TypeScript', 'Tailwind CSS', 'Redux Toolkit', 'Clean Architecture', 'Next.js'],
      learnableSkills30Days: ['WebAssembly', 'Micro-Frontends', 'GraphQL Apollo'],
      skillGap: ['معماری کلاود AWS'],
      trajectoryScore: 92,
      suggestedUpskillingCourses: ['طراحی سیستم‌های توزیع‌شده', 'بهینه‌سازی Core Web Vitals'],
    },
    {
      candidateId: 'cand-2',
      candidateName: 'علیرضا اسدی',
      targetJobTitle: 'مدیر کارخانه و لجستیک زنجیره تامین',
      brand: 'دافی',
      overallMatchPct: 88,
      matchedSkills: ['مدیریت انبارداری WMS', 'استانداردهای بهداشتی GMP', 'برنامه‌ریزی تولید خطی', 'ارزیابی OEE'],
      learnableSkills30Days: ['اتوماسیون انبارداری مکانیزه', 'سیستم‌های کانبان صنعتی'],
      skillGap: ['تحلیل داده پیشرفته با پایتون'],
      trajectoryScore: 86,
      suggestedUpskillingCourses: ['مدیریت زنجیره تامین چابک در صنایع بهداشتی'],
    },
    {
      candidateId: 'cand-3',
      candidateName: 'مریم صالحی',
      targetJobTitle: 'مدیر محصول ارشد برند کامان',
      brand: 'کامان',
      overallMatchPct: 91,
      matchedSkills: ['تحقیقات بازار FMCG', 'OKR Management', 'طراحی تست A/B', 'تحلیل پرسونای مصرف‌کننده'],
      learnableSkills30Days: ['ابزارهای هوش مصنوعی تولید پرامپت محصولات', 'تحلیل رفتار مشتری با Amplitude'],
      skillGap: ['آشنایی عمیق با قوانین بازرگانی گمرکی'],
      trajectoryScore: 95,
      suggestedUpskillingCourses: ['استراتژی دیجیتال مارکتینگ ۳۶۰ درجه'],
    },
  ];

  public internalMobilityMatches: InternalMobilityMatch[] = [
    {
      employeeId: 'emp-2',
      employeeName: 'نیلوفر رحمانی',
      currentTitle: 'سرپرست بازاریابی برند میس‌ویک',
      currentDepartment: 'بازاریابی و برندینگ',
      currentBrand: 'میس‌ویک',
      targetJobId: 'job-2',
      targetJobTitle: 'مدیر محصول ارشد برند کامان',
      readinessLevel: 'READY_NOW',
      retentionImpact: 'CRITICAL_HIGH',
      internalMatchPct: 93,
      managerRecommendationNote: 'عملکرد فوق‌العاده در رشد ۴۰ درصدی سهم بازار دهان‌شویه‌های میس‌ویک و انطباق فرهنگی ۱۰۰٪ با هلدینگ.',
    },
    {
      employeeId: 'emp-5',
      employeeName: 'احسان محمدی',
      currentTitle: 'کارشناس کنترل کیفیت خطوط دستمال مرطوب دافی',
      currentDepartment: 'کنترل کیفیت و آزمایشگاه',
      currentBrand: 'دافی',
      targetJobId: 'job-qclab',
      targetJobTitle: 'سرپرست آزمایشگاه میکروبی و تضمین کیفیت اشتهارد',
      readinessLevel: 'READY_IN_3_MONTHS',
      retentionImpact: 'MODERATE',
      internalMatchPct: 87,
      managerRecommendationNote: 'تسلط کامل بر استانداردهای بازرسی ایزو ۲۲۷۱۶ و پتانسیل رهبری فنی بالا.',
    },
    {
      employeeId: 'emp-7',
      employeeName: 'بهنام کریمی',
      currentTitle: 'کارشناس فروش سازمانی کاپوت',
      currentDepartment: 'فروش و توزیع مویرگی',
      currentBrand: 'کاپوت',
      targetJobId: 'job-sales-mgr',
      targetJobTitle: 'مدیر فروش زنجیره‌ای هلدینگ سیلانه سبز',
      readinessLevel: 'READY_NOW',
      retentionImpact: 'CRITICAL_HIGH',
      internalMatchPct: 89,
      managerRecommendationNote: 'رکورددار فروش هایپرمارکت‌ها در استان تهران و البرز طی ۳ فصل متوالی.',
    },
  ];

  // -------------------------------------------------------------
  // Competitor Intelligence 3: ZipRecruiter Smart Sourcing & Syndication
  // -------------------------------------------------------------
  public sourcedCandidates: SourcedCandidate[] = [
    {
      id: 'src-1',
      fullName: 'دکتر مهدی کاظمی',
      currentRole: 'مدیر فرمولاسیون و R&D آرایشی بهداشتی',
      currentCompany: 'لابراتوار داروسازی دکتر عبیدی',
      experienceYears: 9,
      matchScorePct: 96,
      location: 'تهران / کرج',
      topSkills: ['فرمولاسیون کرم‌های ضدآفتاب', 'استاندارد GMP', 'تست‌های کلینیکی پایداری', 'طراحی اسکین‌کر'],
      status: 'RECOMMENDED',
      lastActive: '۲ ساعت پیش در لینکدین',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    {
      id: 'src-2',
      fullName: 'پریناز افشار',
      currentRole: 'سرپرست بازاریابی دیجیتال و پرفورمنس',
      currentCompany: 'اسنپ اکسپرس',
      experienceYears: 6,
      matchScorePct: 92,
      location: 'تهران',
      topSkills: ['پرفورمنس مارکتینگ FMCG', 'کمپین‌های اینفلوئنسری', 'تحلیل نرخ تبدیل CRO', 'Google Ads'],
      status: 'INVITED',
      invitedAtJalali: '۱۴۰۳/۰۶/۱۵',
      lastActive: 'دیروز',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    },
    {
      id: 'src-3',
      fullName: 'مهندس نوید سلیمانی',
      currentRole: 'سرپرست تعمیرات و نگهداری خطوط بسته‌بندی پرسرعت',
      currentCompany: 'شرکت کاله / بانی‌چاو',
      experienceYears: 8,
      matchScorePct: 89,
      location: 'البرز / هشتگرد',
      topSkills: ['نت پیشگیرانه PM', 'ماشین‌آلات بسته‌بندی روتاگراور', 'PLC زیمنس', 'کاهش زمان توقفات خط'],
      status: 'RECOMMENDED',
      lastActive: '۴ روز پیش',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
  ];

  public syndicationChannels: JobSyndicationChannel[] = [
    {
      id: 'jobinja',
      platformName: 'جابینجا (Jobinja)',
      platformLogo: '💼',
      status: 'ACTIVE',
      impressionsCount: 4820,
      clicksCount: 890,
      applicationsReceived: 42,
      costToman: 3500000,
      lastSyncJalali: 'امروز - ۱۲:۳۰',
    },
    {
      id: 'jobvision',
      platformName: 'جاب‌ویژن (Jobvision)',
      platformLogo: '🎯',
      status: 'ACTIVE',
      impressionsCount: 6140,
      clicksCount: 1120,
      applicationsReceived: 58,
      costToman: 4200000,
      lastSyncJalali: 'امروز - ۱۱:۱۵',
    },
    {
      id: 'irantalent',
      platformName: 'ایران‌تلنت (IranTalent)',
      platformLogo: '💎',
      status: 'ACTIVE',
      impressionsCount: 3200,
      clicksCount: 450,
      applicationsReceived: 21,
      costToman: 5500000,
      lastSyncJalali: 'دیروز - ۱۸:۰۰',
    },
    {
      id: 'linkedin',
      platformName: 'لینکدین (LinkedIn Recruiter)',
      platformLogo: '🌐',
      status: 'ACTIVE',
      impressionsCount: 9400,
      clicksCount: 1840,
      applicationsReceived: 67,
      costToman: 12000000,
      lastSyncJalali: 'امروز - ۰۹:۴۵',
    },
    {
      id: 'telegram_bale',
      platformName: 'کانال‌های استخدامی بله و تلگرام',
      platformLogo: '📱',
      status: 'ACTIVE',
      impressionsCount: 14200,
      clicksCount: 2310,
      applicationsReceived: 83,
      costToman: 1800000,
      lastSyncJalali: 'امروز - ۱۰:۰۰',
    },
  ];

  // ---------------- Module 6b: Training enrollments (audit fix MOD-04) ----------------
  public trainingEnrollments: Array<{
    id: string;
    courseId: string;
    employeeId: string;
    employeeName: string;
    enrolledAtJalali: string;
    status: 'ENROLLED' | 'COMPLETED';
  }> = [];

  public knockoutQuestions: KnockoutQuestion[] = [
    {
      id: 'kq-1',
      question: 'آیا حداقل ۳ سال سابقه کار مستقیم در صنایع آرایشی، بهداشتی یا دارویی (FMCG) دارید؟',
      requiredAnswer: true,
      isDealBreaker: true,
      explanation: 'به دلیل الزامات تخصصی فرآیندهای تولید برندهای دافی و کامان، این شرط الزامی است.',
    },
    {
      id: 'kq-2',
      question: 'آیا امکان تردد روزانه با سرویس ایاب‌وذهاب هلدینگ به کارخانجات واقع در شهرک صنعتی اشتهارد را دارید؟',
      requiredAnswer: true,
      isDealBreaker: true,
      explanation: 'برای موقعیت‌های مستقر در سایت تولیدی اشتهارد غیرقابل اغماض است.',
    },
    {
      id: 'kq-3',
      question: 'وضعیت نظام وظیفه (برای آقایان)',
      requiredAnswer: 'کارت پایان خدمت یا معافیت دائم',
      isDealBreaker: true,
      explanation: 'طبق قوانین وزارت کار و تامین اجتماعی جهت عقد قرارداد استخدامی رسمی.',
    },
  ];

  // -----------------------------------------------------------------
  // JSON snapshot persistence (audit fix SEC-05)
  // -----------------------------------------------------------------
  private static readonly PERSIST_KEYS = [
    'jobs', 'candidates', 'employees', 'attendances', 'leaveRequests',
    'payrollSlips', 'performanceGoals', 'trainingCourses', 'skillMatrix',
    'checklistItems', 'metrics', 'automationTasks', 'departments',
    'trainingEnrollments', 'videoSubmissions', 'sourcedCandidates',
    'syndicationChannels', 'knockoutQuestions', 'candidateSkillMatches',
    'internalMobilityMatches', 'sessionEmployeeId',
  ] as const;

  private snapshotPath = path.join(process.cwd(), 'data', 'hrms-store.json');
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Load after field initializers: a snapshot entry replaces the seed value.
    this.loadSnapshot();
    const interval = setInterval(() => {
      if (this.dirty) this.saveSnapshot();
    }, 4000);
    if (typeof interval.unref === 'function') interval.unref();
    const onExit = () => { if (this.dirty) this.saveSnapshot(); };
    process.on('exit', onExit);
    process.on('SIGINT', () => { onExit(); process.exit(0); });
    process.on('SIGTERM', () => { onExit(); process.exit(0); });
  }

  /**
   * Phase 1 of the Supabase persistence work (employees only).
   * Called once at boot, after loadSnapshot(). If DATABASE_URL isn't set,
   * or the database is unreachable, this is a no-op and the app keeps
   * running on the in-memory/JSON-snapshot data exactly as before —
   * it must never prevent the server from starting.
   */
  public async initEmployeesFromDb(): Promise<void> {
    if (!isDatabaseConfigured) return;
    try {
      const existing = await countEmployees();
      if (existing === 0 && this.employees.length > 0) {
        console.log(`[db] Employee table is empty — migrating ${this.employees.length} demo employee(s) into Supabase...`);
        await seedEmployees(this.employees);
      }
      this.employees = await loadAllEmployees();
      console.log(`[db] Loaded ${this.employees.length} employee(s) from Supabase.`);
    } catch (err) {
      console.warn('[db] Could not load employees from Supabase — continuing on in-memory data:', err);
    }
  }

  /** Write-through helpers: best-effort mirror of an in-memory employee mutation into Supabase. */
  public async dbCreateEmployee(e: Employee): Promise<void> {
    if (!isDatabaseConfigured) return;
    try { await createEmployeeInDb(e); } catch (err) { console.warn('[db] Failed to persist new employee to Supabase:', err); }
  }

  public async dbUpdateEmployee(id: string, patch: Partial<Employee>, newJobHistory?: JobHistoryItem): Promise<void> {
    if (!isDatabaseConfigured) return;
    try { await updateEmployeeInDb(id, patch, newJobHistory as any); } catch (err) { console.warn('[db] Failed to persist employee update to Supabase:', err); }
  }

  public async dbDeleteEmployee(id: string): Promise<void> {
    if (!isDatabaseConfigured) return;
    try { await deleteEmployeeInDb(id); } catch (err) { console.warn('[db] Failed to delete employee from Supabase:', err); }
  }

  /** Mark state mutated; a debounced write follows. Call from every mutating endpoint. */
  public markDirty(): void {
    this.dirty = true;
    if (!this.saveTimer) {
      this.saveTimer = setTimeout(() => {
        this.saveTimer = null;
        this.saveSnapshot();
      }, 1500);
      if (typeof this.saveTimer.unref === 'function') this.saveTimer.unref();
    }
  }

  private loadSnapshot(): void {
    try {
      if (!fs.existsSync(this.snapshotPath)) return;
      const raw = JSON.parse(fs.readFileSync(this.snapshotPath, 'utf-8'));
      for (const key of HRMSStore.PERSIST_KEYS) {
        if (raw[key] !== undefined) (this as any)[key] = raw[key];
      }
      console.log('بازیابی داده‌های سامانه از snapshot محلی انجام شد.');
    } catch (err) {
      console.warn('Snapshot load failed, starting from seed data:', err);
    }
  }

  private saveSnapshot(): void {
    try {
      const dir = path.dirname(this.snapshotPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const data: Record<string, unknown> = {};
      for (const key of HRMSStore.PERSIST_KEYS) data[key] = (this as any)[key];
      const tmp = this.snapshotPath + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, this.snapshotPath);
      this.dirty = false;
    } catch (err) {
      console.warn('Snapshot save failed:', err);
    }
  }
}

export const dbStore = new HRMSStore();

