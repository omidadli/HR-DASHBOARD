import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Scale,
  Bot,
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RotateCcw,
  Briefcase,
  Layers,
  ShieldAlert,
  Lightbulb,
  Play,
  TrendingUp,
  Percent,
  Check,
} from 'lucide-react';
import { JobPosting, JobCriteria, ScoringMethod, AIRigor, CandidateCategory, Candidate } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';

interface EvaluationCriteriaManagerProps {
  jobs: JobPosting[];
  activeJobId: string;
  onSelectJob: (jobId: string) => void;
  onJobUpdated?: (updatedJob: JobPosting) => void;
}

// Pre-built Industry Presets for Seilaneh Sabz Holding Categories
const INDUSTRY_PRESETS: Record<string, {
  label: string;
  scoringMethod: ScoringMethod;
  aiRigor: AIRigor;
  instructions: string;
  criteria: Array<Omit<JobCriteria, 'id'> & { id?: string }>;
}> = {
  manufacturing: {
    label: '🏭 خطوط تولید و کارخانجات اشتهارد (GMP & 5S)',
    scoringMethod: 'THRESHOLD_VETO',
    aiRigor: 'STRICT',
    instructions: 'الزام اکید به آشنایی با اصول GMP، استانداردهای بهداشتی صنایع آرایشی-بهداشتی و تجربه کار با خطوط بسته‌بندی مکانیزه. سابقه کار در کارخانجات تولید محصولات سلولزی و شوینده امتیاز ویژه دارد. کارجو باید توانایی هماهنگی در ۳ نوبت کاری چرخشی را داشته باشد.',
    criteria: [
      { title: 'تسلط بر الزامات بهداشتی GMP و استاندارد 5S', weight: 35, description: 'رعایت پروتکل‌های بهداشتی تولید و مدارک بازرسی', thresholdScore: 6, isMandatory: true },
      { title: 'سابقه سرپرستی و راهبری خطوط تولید مکانیزه', weight: 30, description: 'سابقه کار در کارخانجات سلولزی، آرایشی، شوینده یا دارویی', thresholdScore: 5, isMandatory: true },
      { title: 'مدیریت پرسنل شیفت و کاهش ضایعات (OEE)', weight: 20, description: 'توانایی ثبت لاگ‌های تولید و برنامه‌ریزی تعمیرات دوره‌ای' },
      { title: 'انطباق مکانی و آمادگی کار شیفتی در اشتهارد', weight: 15, description: 'امکان تردد منظم به شهرک صنعتی اشتهارد و آمادگی شیفت شب' },
    ],
  },
  rnd_lab: {
    label: '🔬 تحقیق، توسعه و لابراتوار (R&D & Formulation)',
    scoringMethod: 'WEIGHTED_AVG',
    aiRigor: 'STRICT',
    instructions: 'اولویت با فارغ‌التحصیلان رشته‌های شیمی کاربردی، مهندسی شیمی یا داروسازی است. تسلط به فرمولاسیون کرم، لوسیون، ژل و شوینده‌های پوست و مو و آشنایی با مواد موثره دافی و کامان مد نظر است. تسلط به جستجوی مقالات علمی و استانداردهای INCI الزامی است.',
    criteria: [
      { title: 'تسلط بر شیمی فرمولاسیون محصولات آرایشی و بهداشتی', weight: 40, description: 'فرموله‌کردن بافت‌های ژل، لوسیون، سرم و فوم', thresholdScore: 6, isMandatory: true },
      { title: 'تست‌های پایداری، رئولوژی و سازگاری بسته‌بندی', weight: 25, description: 'انجام آزمون‌های تسریع‌شده حرارتی و تست‌های پایداری فرمول' },
      { title: 'آشنایی با رگولاتوری غذا و دارو و کدهای INCI', weight: 20, description: 'تهیه پرونده فنی (CTD) و ثبت پروانه‌های ساخت' },
      { title: 'زبان انگلیسی تخصصی و مرور مقالات پژوهشی', weight: 15, description: 'بررسی ترندهای جهانی مراقبت پوست و تامین‌کنندگان مواد اولیه' },
    ],
  },
  marketing_brand: {
    label: '📢 مارکتینگ و مدیریت برندهای دافی، کامان، میس‌ویک',
    scoringMethod: 'WEIGHTED_AVG',
    aiRigor: 'BALANCED',
    instructions: 'ارزیابی بر مبنای درک عمیق رفتار مصرف‌کننده ایرانی در حوزه FMCG و زیبایی، خلاقیت در کمپین‌های ۳۶۰ درجه (دیجیتال، ATL، BTL)، هماهنگی با اینفلوئنسرها و پایش سهم بازار (Nielsen).',
    criteria: [
      { title: 'استراتژی برندینگ و کمپین‌های ۳۶۰ درجه FMCG', weight: 35, description: 'سابقه هدایت کمپین‌های اثرگذار در بازار لوازم بهداشتی و آرایشی' },
      { title: 'تحلیل داده‌های فروش، تحقیقات بازار و رقبا', weight: 25, description: 'استفاده از شاخص‌های سهم بازار، Brand Awareness و NPS' },
      { title: 'مدیریت رسانه‌های اجتماعی و همکاری با اینفلوئنسرها', weight: 25, description: 'تولید محتوای وایرال و اجرای رویدادهای رونمایی محصول' },
      { title: 'خلاقیت بصری و نظارت بر بسته‌بندی و طراحی آرت‌ورک', weight: 15, description: 'تسلط بر هویت بصری برند و زیبایی‌شناسی قفسه فروشگاهی' },
    ],
  },
  sales_fmcg: {
    label: '💼 فروش مویرگی، بازاریابی داروخانه‌ای و FMCG',
    scoringMethod: 'THRESHOLD_VETO',
    aiRigor: 'BALANCED',
    instructions: 'تجربه کار مستقیم در شرکت‌های پخش سراسری آرایشی و دارویی، تسلط به پوشش داروخانه‌ها و گالری‌های زیبایی، مهارت قوی در وصول مطالبات و انگیزش تیم ویزیتورها.',
    criteria: [
      { title: 'سابقه فروش مویرگی در صنعت آرایشی، بهداشتی یا دارویی', weight: 35, description: 'شناخت شبکه توزیع داروخانه‌ها و فروشگاه‌های زنجیره‌ای', thresholdScore: 6, isMandatory: true },
      { title: 'تکنیک‌های مذاکره تجاری و تارگت‌گذاری منطقه‌ای', weight: 30, description: 'تحقق اهداف ماهانه فروش و توسعه سبد محصولات جدید' },
      { title: 'رهبری تیم ویزیتورها و نظارت بر مسیربندی', weight: 20, description: 'توانایی مربی‌گری، ردیابی GPS و مدیریت مغایرت‌های سفارش' },
      { title: 'اصول اعتبارسنجی و پیگیری مطالبات مالی', weight: 15, description: 'کاهش دوره وصول مطالبات و بررسی چک‌های تضمینی مشتریان' },
    ],
  },
  qc_qa: {
    label: '🛡️ کنترل کیفیت و میکروبیولوژی (QC & QA)',
    scoringMethod: 'THRESHOLD_VETO',
    aiRigor: 'STRICT',
    instructions: 'دقت بالا و عدم مسامحه در کنترل کیفیت اقلام ورودی، فرآیند و محصول نهایی الزامی است. سابقه کار در آزمایشگاه میکروبی و شیمیایی بهداشتی، تسلط به نمونه‌برداری طبق جدول Military Standard و کالیبراسیون تجهیزات ضروری است.',
    criteria: [
      { title: 'آزمون‌های شیمیایی و میکروبی مواد اولیه و محصول نهایی', weight: 40, description: 'سنجش pH، ویسکوزیته، بار میکروبی و تست چالش', thresholdScore: 7, isMandatory: true },
      { title: 'مستندسازی عدم انطباق‌ها (CAPA) و ممیزی داخلی', weight: 25, description: 'تحلیل علت ریشه‌ای خطاها (RCA) و پیگیری اقدامات اصلاحی' },
      { title: 'کنترل کیفیت بسته‌بندی و آزمون‌های کارکردی پمپ و اسپری', weight: 20, description: 'تست نشتی، درزبندی و سازگاری قوطی و پمپ‌ها' },
      { title: 'دقت و انضباط کاری در انطباق با چک‌لیست‌های بازرسی', weight: 15, description: 'صداقت حرفه‌ای و دقت در ثبت داده‌های آزمایشگاهی' },
    ],
  },
  tech_software: {
    label: '💻 فناوری اطلاعات و مهندسی نرم‌افزار',
    scoringMethod: 'WEIGHTED_AVG',
    aiRigor: 'BALANCED',
    instructions: 'کدنویسی تمیز، درک اصول مهندسی نرم‌افزار و معماری مقیاس‌پذیر مد نظر است. بررسی نمونه کدهای متن‌باز، گیت‌هاب و تجارب پیاده‌سازی سیستم‌های بدون خطا.',
    criteria: [
      { title: 'تسلط عمیق بر پشته فناوری تخصصی (React / Node / TS)', weight: 35, description: 'تسلط بر کامپوننت‌نویسی، تایپینگ و مدیریت وضعیت' },
      { title: 'طراحی معماری نرم‌افزار، مقیاس‌پذیری و بهینه‌سازی', weight: 25, description: 'طراحی ماژولار و کدهای قابل نگهداری' },
      { title: 'کار تیمی، اسکرام، کد ریویو و ارتباط موثر', weight: 25, description: 'تعامل سازنده در جلسات و پذیرش بازخورد' },
      { title: 'آشنایی با تست خودکار و خطوط بیلد CI/CD', weight: 15, description: 'نگارش تست‌های واحد و اتوماسیون استقرار' },
    ],
  },
};

const SUGGESTED_CHIPS = [
  'تسلط به استانداردهای GMP',
  'سابقه در صنعت FMCG و شوینده',
  'آشنایی با سامانه TTAC و غذا و دارو',
  'تسلط بر تحلیل اکسل و آمار فروش',
  'فرمولاسیون محصولات آرایشی',
  'مهارت رهبری تیم و حل تعارض',
  'آشنایی با قوانین کار و تامین اجتماعی',
  'زبان انگلیسی پیشرفته',
];

const INSTRUCTION_SNIPPETS = [
  'حداقل ۳ سال سابقه کار مستقیم در صنایع آرایشی، بهداشتی یا دارویی الزامی است.',
  'سکونت در استان البرز یا غرب تهران برای دسترسی به کارخانجات اشتهارد امتیاز ویژه دارد.',
  'در صورت نداشتن تسلط به زبان انگلیسی، حداکثر نمره شاخصه ارتباطی ۶ لحاظ گردد.',
  'فارغ‌التحصیلان دانشگاه‌های معتبر دولتی در رشته‌های مرتبط در اولویت بررسی قرار گیرند.',
  'سابقه کار با برندهای دافی، کامان یا شرکت‌های معتبر رقیب امتیاز مضاعف دارد.',
];

export const EvaluationCriteriaManager: React.FC<EvaluationCriteriaManagerProps> = ({
  jobs,
  activeJobId,
  onSelectJob,
  onJobUpdated,
}) => {
  const selectedJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  // Local state for editing criteria and weights
  const [criteriaList, setCriteriaList] = useState<JobCriteria[]>([]);
  const [scoringMethod, setScoringMethod] = useState<ScoringMethod>('WEIGHTED_AVG');
  const [aiRigor, setAiRigor] = useState<AIRigor>('BALANCED');
  const [instructions, setInstructions] = useState<string>('');
  const [priorityThreshold, setPriorityThreshold] = useState<number>(7.0);
  const [rejectionThreshold, setRejectionThreshold] = useState<number>(5.0);

  // Status & Feedback
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  // AI Live Evaluation Sandbox State
  const [candidatesForJob, setCandidatesForJob] = useState<Candidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [customResumeText, setCustomResumeText] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationResult, setEvaluationResult] = useState<any>(null);
  const [evalError, setEvalError] = useState<string>('');

  // Initialize state whenever selectedJob changes
  useEffect(() => {
    if (selectedJob) {
      const initialCriteria = (selectedJob.criteria && selectedJob.criteria.length > 0)
        ? selectedJob.criteria.map((c, idx) => ({
            id: c.id || `crit-${idx + 1}`,
            title: c.title,
            weight: Number(c.weight) || 20,
            description: c.description || '',
            thresholdScore: c.thresholdScore || 5,
            isMandatory: Boolean(c.isMandatory),
          }))
        : [
            { id: 'c1', title: 'شایستگی و تخصص فنی', weight: 40, description: 'انطباق مهارت‌های تخصصی با نیازمندی‌های این موقعیت', thresholdScore: 6, isMandatory: true },
            { id: 'c2', title: 'سابقه کار مرتبط در FMCG / تولید', weight: 35, description: 'تجربه کار در صنایع مرتبط با سبد محصولات هلدینگ', thresholdScore: 5, isMandatory: false },
            { id: 'c3', title: 'کار تیمی و انطباق سازمانی', weight: 25, description: 'روحیه همکاری بین‌دپارتمانی و یادگیری مستمر', thresholdScore: 5, isMandatory: false },
          ];

      setCriteriaList(initialCriteria);
      setScoringMethod(selectedJob.scoringMethod || 'WEIGHTED_AVG');
      setAiRigor(selectedJob.aiRigor || 'BALANCED');
      setInstructions(selectedJob.evaluationInstructions || '');
      setPriorityThreshold(selectedJob.interviewPriorityThreshold ?? 7.0);
      setRejectionThreshold(selectedJob.initialRejectionThreshold ?? 5.0);
      setEvaluationResult(null);

      // Fetch candidates for this job for live testing
      fetch(`/api/candidates?jobId=${selectedJob.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setCandidatesForJob(data);
            if (data.length > 0) {
              setSelectedCandidateId(data[0].id);
              setCustomResumeText(data[0].resumeText || '');
            } else {
              setSelectedCandidateId('');
              setCustomResumeText('مهندس صنایع با ۵ سال سابقه در کارخانجات تولیدی، مسلط به استانداردهای GMP و 5S، دارای سابقه سرپرستی شیفت و کنترل OEE در صنایع بهداشتی.');
            }
          }
        })
        .catch(() => {
          setCustomResumeText('کارشناس ارشد شیمی با ۴ سال سابقه در لابراتوار تحقیق و توسعه محصولات مراقبت پوست و مو.');
        });
    }
  }, [selectedJob?.id]);

  // When candidate selection changes, update resume text
  const handleSelectCandidate = (candId: string) => {
    setSelectedCandidateId(candId);
    const cand = candidatesForJob.find((c) => c.id === candId);
    if (cand && cand.resumeText) {
      setCustomResumeText(cand.resumeText);
    }
  };

  // Calculate sum of weights
  const totalWeight = criteriaList.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
  const isWeightBalanced = totalWeight === 100;

  // Criteria manipulation handlers
  const handleWeightChange = (index: number, newWeight: number) => {
    const clamped = Math.max(0, Math.min(100, newWeight));
    setCriteriaList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], weight: clamped };
      return updated;
    });
  };

  const handleTitleChange = (index: number, newTitle: string) => {
    setCriteriaList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], title: newTitle };
      return updated;
    });
  };

  const handleDescriptionChange = (index: number, newDesc: string) => {
    setCriteriaList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], description: newDesc };
      return updated;
    });
  };

  const handleMandatoryToggle = (index: number) => {
    setCriteriaList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], isMandatory: !updated[index].isMandatory };
      return updated;
    });
  };

  const handleThresholdChange = (index: number, score: number) => {
    const clamped = Math.max(1, Math.min(10, score));
    setCriteriaList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], thresholdScore: clamped };
      return updated;
    });
  };

  const handleAddCriterion = (initialTitle: string = 'شاخصه جدید ارزیابی') => {
    const newId = `crit-${Date.now()}`;
    setCriteriaList((prev) => [
      ...prev,
      {
        id: newId,
        title: initialTitle,
        weight: 15,
        description: 'شرح نحوه بررسی شواهد در رزومه کارجو توسط هوش مصنوعی',
        thresholdScore: 5,
        isMandatory: false,
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteriaList.length <= 1) {
      alert('حداقل یک شاخصه ارزیابی الزامی است.');
      return;
    }
    setCriteriaList((prev) => prev.filter((_, i) => i !== index));
  };

  // Normalize weights automatically to sum exactly 100
  const handleNormalizeWeights = () => {
    if (criteriaList.length === 0) return;
    const count = criteriaList.length;
    const baseWeight = Math.floor(100 / count);
    const remainder = 100 - baseWeight * count;

    setCriteriaList((prev) =>
      prev.map((crit, idx) => ({
        ...crit,
        weight: baseWeight + (idx === 0 ? remainder : 0),
      }))
    );
  };

  // Load a preset template
  const handleApplyPreset = (presetKey: string) => {
    const preset = INDUSTRY_PRESETS[presetKey];
    if (!preset) return;

    setScoringMethod(preset.scoringMethod);
    setAiRigor(preset.aiRigor);
    setInstructions(preset.instructions);
    setCriteriaList(
      preset.criteria.map((c, i) => ({
        id: `preset-${presetKey}-${i + 1}`,
        title: c.title,
        weight: c.weight,
        description: c.description || '',
        thresholdScore: c.thresholdScore || 5,
        isMandatory: Boolean(c.isMandatory),
      }))
    );
  };

  // Save criteria configuration to backend
  const handleSaveConfiguration = async () => {
    if (!selectedJob) return;
    setSaveStatus('saving');
    setStatusMessage('در حال ذخیره شاخصه‌ها و تنظیمات هوش مصنوعی...');

    try {
      const response = await fetch(`/api/jobs/${selectedJob.id}/criteria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criteria: criteriaList,
          scoringMethod,
          aiRigor,
          evaluationInstructions: instructions,
          interviewPriorityThreshold: priorityThreshold,
          initialRejectionThreshold: rejectionThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error('خطا در ذخیره تنظیمات روی سرور');
      }

      const data = await response.json();
      setSaveStatus('saved');
      setStatusMessage('شاخصه‌ها، اوزان و فرمول ارزیابی برای این موقعیت شغلی ذخیره شد.');
      if (onJobUpdated && data.job) {
        onJobUpdated(data.job);
      }
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      setSaveStatus('error');
      setStatusMessage(err.message || 'خطا در برقراری ارتباط');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  // Execute AI Live Evaluation Test
  const handleRunEvaluation = async () => {
    if (!selectedJob) return;
    if (!customResumeText.trim()) {
      setEvalError('لطفاً متن رزومه را وارد فرمایید.');
      return;
    }

    setIsEvaluating(true);
    setEvalError('');
    setEvaluationResult(null);

    try {
      const selectedCand = candidatesForJob.find((c) => c.id === selectedCandidateId);
      const res = await fetch('/api/jobs/evaluate-candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          candidateId: selectedCandidateId || undefined,
          candidateName: selectedCand?.fullName || 'کارجوی متقاضی',
          jobTitle: selectedJob.title,
          department: selectedJob.department,
          resumeText: customResumeText,
          criteria: criteriaList,
          scoringMethod,
          aiRigor,
          evaluationInstructions: instructions,
          interviewPriorityThreshold: priorityThreshold,
          initialRejectionThreshold: rejectionThreshold,
          saveCandidateResult: Boolean(selectedCandidateId),
        }),
      });

      if (!res.ok) {
        throw new Error('پاسخی از سرویس هوش مصنوعی دریافت نشد.');
      }

      const data = await res.json();
      setEvaluationResult(data);
    } catch (err: any) {
      setEvalError(err.message || 'خطا در ارزیابی هوش مصنوعی');
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!selectedJob) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-500 font-medium">موقعیت شغلی برای پیکربندی یافت نشد.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Job Selector Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
                <SlidersHorizontal className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg font-black text-slate-900">
                  ماتریس شاخصه‌ها، وزن‌دهی و متدولوژی ارزیابی هوش مصنوعی
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  تعیین شاخص‌های ارزیابی، وزن‌های درصدی، فرمول محاسباتی و دستورالعمل‌های خاص دستیار Gemini برای ردیف‌های شغلی هلدینگ سیلانه سبز
                </p>
              </div>
            </div>
          </div>

          {/* Job Selection Dropdown & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
              <Briefcase className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold">دسته موقعیت شغلی:</span>
                <select
                  value={activeJobId}
                  onChange={(e) => onSelectJob(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer max-w-[260px] truncate"
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} ({job.department})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveConfiguration}
              disabled={saveStatus === 'saving'}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                saveStatus === 'saved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {saveStatus === 'saving' ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'saved' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{saveStatus === 'saved' ? 'ذخیره شد' : 'ذخیره تنظیمات'}</span>
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mt-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              saveStatus === 'error'
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {saveStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Preset Quick Loader Buttons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>الگوهای استاندارد دپارتمان‌های هلدینگ سیلانه سبز (یک کلیک برای بارگذاری):</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">قابل ویرایش و سفارشی‌سازی</span>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {Object.entries(INDUSTRY_PRESETS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleApplyPreset(key)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5"
            >
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Top Controls Grid: Scoring Method, AI Rigor & Thresholds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Box 1: Scoring Method & Calculation Formula */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
                <Scale className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-black text-slate-900">نوع محاسبه و شیوه امتیازدهی</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
              فرمول ریاضی
            </span>
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                scoringMethod === 'WEIGHTED_AVG'
                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="scoringMethod"
                value="WEIGHTED_AVG"
                checked={scoringMethod === 'WEIGHTED_AVG'}
                onChange={() => setScoringMethod('WEIGHTED_AVG')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <div className="font-black text-xs">میانگین وزنی خطی استاندارد</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  مجموع حاصل‌ضرب نمره هر شاخصه در وزن آن تقسیم بر ۱۰۰
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                scoringMethod === 'THRESHOLD_VETO'
                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="scoringMethod"
                value="THRESHOLD_VETO"
                checked={scoringMethod === 'THRESHOLD_VETO'}
                onChange={() => setScoringMethod('THRESHOLD_VETO')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <span>ماتریس وتو و حد نصاب قبولی</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-black">
                    پیشنهادی صنایع
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  در صورت عدم احراز نمره در شاخصه الزامی، کاندیدا رد یا مشروط می‌شود
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                scoringMethod === 'GEOMETRIC_MEAN'
                  ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="scoringMethod"
                value="GEOMETRIC_MEAN"
                checked={scoringMethod === 'GEOMETRIC_MEAN'}
                onChange={() => setScoringMethod('GEOMETRIC_MEAN')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="space-y-0.5">
                <div className="font-black text-xs">میانگین هندسی وزنی (Geometric)</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  سنجش متوازن بدون امکان پوشش ضعف مفرط یک شاخص با نمره بالای دیگری
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Box 2: AI Rigor & Evaluation Depth */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
                <Bot className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-black text-slate-900">درجه سخت‌گیری ارزیابی هوش مصنوعی</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">
              قضاوت مدل
            </span>
          </div>

          <div className="space-y-2">
            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                aiRigor === 'STRICT'
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="aiRigor"
                value="STRICT"
                checked={aiRigor === 'STRICT'}
                onChange={() => setAiRigor('STRICT')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <div className="font-black text-xs">سخت‌گیرانه (Strict - ویژه کارخانجات و R&D)</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  کسر نمره جدی برای عدم سابقه در FMCG یا نبود گواهینامه‌های الزامی
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                aiRigor === 'BALANCED'
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="aiRigor"
                value="BALANCED"
                checked={aiRigor === 'BALANCED'}
                onChange={() => setAiRigor('BALANCED')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <div className="font-black text-xs">متوازن و استاندارد سازمانی (Balanced)</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  تطبیق عینی سوابق با شاخصه‌ها و قضاوت منصفانه بر اساس مستندات
                </div>
              </div>
            </label>

            <label
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                aiRigor === 'LENIENT'
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-bold'
                  : 'bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="aiRigor"
                value="LENIENT"
                checked={aiRigor === 'LENIENT'}
                onChange={() => setAiRigor('LENIENT')}
                className="mt-0.5 text-amber-600 focus:ring-amber-500"
              />
              <div className="space-y-0.5">
                <div className="font-black text-xs">منعطف و استعدادمحور (Growth & Potential)</div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  وزن‌دهی به پتانسیل یادگیری، اشتیاق و مهارت‌های پایه‌ای متقاضی
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Box 3: Screening Cutoffs & Thresholds */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-black text-slate-900">آستانه‌های دسته‌بندی نمرات</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
              پایپ‌لاین
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {/* Priority Cutoff */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  حداقل نمره «اولویت مصاحبه»:
                </span>
                <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {toPersianDigits(priorityThreshold)} از ۱۰
                </span>
              </div>
              <input
                type="range"
                min="5.0"
                max="9.0"
                step="0.5"
                value={priorityThreshold}
                onChange={(e) => setPriorityThreshold(parseFloat(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>۵.۰ (آسان‌گیر)</span>
                <span>۹.۰ (نخبه‌گزینی)</span>
              </div>
            </div>

            {/* Rejection Cutoff */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-800 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  سقف نمره «رد اولیه»:
                </span>
                <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  کمتر از {toPersianDigits(rejectionThreshold)}
                </span>
              </div>
              <input
                type="range"
                min="3.0"
                max="6.0"
                step="0.5"
                value={rejectionThreshold}
                onChange={(e) => setRejectionThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                <span>۳.۰ (حداقلی)</span>
                <span>۶.۰ (استاندارد بالا)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria & Weighting Boxes Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Section Header with Weight Sum Indicator & Balance Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Layers className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                باکس‌های مشخص کردن شاخصه‌ها و وزن‌دهی‌ها ({toPersianDigits(criteriaList.length)} شاخصه)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                هر شاخصه شامل وزن درصدی، راهنمای ارزیابی هوش مصنوعی و امکان فعال‌سازی وتوی الزامی است.
              </p>
            </div>
          </div>

          {/* Weight Indicator & Auto Balance */}
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${
                isWeightBalanced
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              <span>مجموع اوزان: {toPersianDigits(totalWeight)}٪</span>
              {isWeightBalanced ? (
                <span className="text-[10px] text-emerald-600 font-bold">(تراز کامل)</span>
              ) : (
                <span className="text-[10px] text-amber-600 font-bold">(نامتعادل)</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleNormalizeWeights}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              title="تقسیم متوازن اوزان تا مجموع دقیقاً ۱۰۰٪ شود"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>تراز خودکار ۱۰۰٪</span>
            </button>
          </div>
        </div>

        {/* List of Criteria Boxes */}
        {criteriaList.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-border-default p-6">
            <EmptyState
              icon={<SlidersHorizontal className="w-8 h-8 text-text-3" />}
              title="هیچ شاخصه ارزیابی تعریف نشده است"
              description="برای سنجش هوشمند کارجویان، حداقل یک شاخصه ارزیابی با وزن درصدی اضافه نمایید."
              actionLabel="افزودن شاخصه جدید"
              onAction={() => handleAddCriterion()}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criteriaList.map((crit, index) => (
            <div
              key={crit.id || index}
              className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                crit.isMandatory
                  ? 'bg-amber-50/20 border-amber-200 shadow-2xs'
                  : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header: Title & Remove */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center shrink-0">
                    {toPersianDigits(index + 1)}
                  </span>
                  <input
                    type="text"
                    value={crit.title}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                    placeholder="عنوان شاخصه ارزیابی..."
                    className="w-full text-xs font-black text-slate-900 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(index)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="حذف این شاخصه"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Weight Slider & Numeric Input */}
              <div className="bg-white p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-slate-400" />
                    وزن درصدی در ارزیابی:
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={crit.weight}
                      onChange={(e) => handleWeightChange(index, parseInt(e.target.value) || 0)}
                      className="w-14 text-center font-black text-slate-900 bg-slate-50 py-0.5 rounded border border-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-slate-500 font-bold text-xs">٪</span>
                  </div>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={crit.weight}
                  onChange={(e) => handleWeightChange(index, parseInt(e.target.value) || 0)}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* Mandatory / Veto Checkbox & Passing Threshold */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(crit.isMandatory)}
                    onChange={() => handleMandatoryToggle(index)}
                    className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                  />
                  <span className="flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    شاخصه الزامی / شرط وتو
                  </span>
                </label>

                {crit.isMandatory && (
                  <div className="flex items-center gap-1 text-[11px] bg-amber-50 text-amber-900 px-2 py-1 rounded-lg border border-amber-200">
                    <span>حداقل نمره قبولی:</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={crit.thresholdScore || 5}
                      onChange={(e) => handleThresholdChange(index, parseInt(e.target.value) || 5)}
                      className="w-10 text-center font-black bg-white rounded border border-amber-300 py-0.2 focus:outline-none"
                    />
                    <span>از ۱۰</span>
                  </div>
                )}
              </div>

              {/* Description Box for this Criterion */}
              <div className="space-y-1">
                <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  راهنمای سنجش شاخصه برای هوش مصنوعی:
                </div>
                <textarea
                  rows={2}
                  value={crit.description || ''}
                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                  placeholder="مشخص کنید هوش مصنوعی چه کلمات کلیدی، مدارک یا شواهدی را در رزومه جستجو کند..."
                  className="w-full text-xs text-slate-800 bg-white p-2 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Add Criterion & Quick Suggested Chips */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => handleAddCriterion()}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ افزودن شاخصه ارزیابی جدید</span>
          </button>

          {/* Quick Chip Inserters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              افزودن سریع شاخصه:
            </span>
            {SUGGESTED_CHIPS.slice(0, 4).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddCriterion(chip)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Instructions Box (باکس توضیحات و دستورالعمل ارزیابی هوش مصنوعی) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Bot className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                باکس توضیحات و دستورالعمل‌های اختصاصی برای دستیار هوش مصنوعی (Gemini Instructions)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                تمامی خطوط قرمز، دانشگاه‌ها یا شرکت‌های ترجیحی، شروط مکانی، نکات فرهنگ سازمانی و ضوابط خاص در این کادر قرار می‌گیرند.
              </p>
            </div>
          </div>
          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 font-bold border border-blue-100">
            پرامپت مستقیم ارزیابی
          </span>
        </div>

        {/* Textarea for Instructions */}
        <div className="space-y-2">
          <textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="مثال: اولویت اکید با داوطلبانی است که در شرکت‌های معتبر آرایشی و بهداشتی فعالیت داشته‌اند. عدم آشنایی با زبان انگلیسی نمره نهایی را کسر کند. در صورت نبود گواهینامه معتبر، وضعیت بررسی مدیر ثبت شود..."
            className="w-full text-xs text-slate-900 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 focus:bg-white leading-relaxed"
          />

          {/* Quick Snippet Inserters */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              درج شروط پرکاربرد با یک کلیک:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {INSTRUCTION_SNIPPETS.map((snip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() =>
                    setInstructions((prev) => (prev ? `${prev}\n${snip}` : snip))
                  }
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-all text-right"
                >
                  + {snip}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Live Evaluation Sandbox (تست و ارزیابی زنده هوش مصنوعی) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Play className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                شبیه‌ساز و تست زنده ارزیابی هوش مصنوعی بر اساس شاخص‌ها و وزن‌ها
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                یک کارجو یا متن رزومه را انتخاب کنید تا دستیار Gemini فوراً با شاخص‌ها، اوزان و فرمول این بخش ارزیابی کند.
              </p>
            </div>
          </div>

          {/* Run Button */}
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {isEvaluating ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-300" />
            )}
            <span>{isEvaluating ? 'در حال اجرای ارزیابی هوشمند...' : 'اجرای ارزیابی هوش مصنوعی'}</span>
          </button>
        </div>

        {/* Candidate Selector or Custom Resume Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">انتخاب از کارجویان این ردیف شغلی:</label>
            <select
              value={selectedCandidateId}
              onChange={(e) => handleSelectCandidate(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none"
            >
              {candidatesForJob.length > 0 ? (
                candidatesForJob.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} (نمره فعلی: {toPersianDigits(c.overallScore || '—')})
                  </option>
                ))
              ) : (
                <option value="">کارجویی در این موقعیت ثبت نشده است</option>
              )}
            </select>
            <p className="text-[11px] text-slate-400 font-medium">
              با انتخاب کارجو، متن رزومه استخراج‌شده در کادر مقابل قرار می‌گیرد.
            </p>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-slate-700 block">متن رزومه برای ارزیابی دستیار هوش مصنوعی:</label>
            <textarea
              rows={3}
              value={customResumeText}
              onChange={(e) => setCustomResumeText(e.target.value)}
              placeholder="متن سوابق، مهارت‌ها و رزومه کارجو را اینجا وارد یا ویرایش کنید..."
              className="w-full text-xs text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:bg-white resize-none leading-relaxed"
            />
          </div>
        </div>

        {evalError && (
          <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold flex items-center gap-2 border border-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{evalError}</span>
          </div>
        )}

        {/* Loading State when evaluating */}
        {isEvaluating && (
          <div className="p-6 rounded-2xl bg-surface-2 border border-border-default space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48 rounded" />
                <Skeleton className="h-3 w-72 rounded" />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Evaluation Results Card */}
        {!isEvaluating && evaluationResult && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 border border-slate-200 space-y-4">
            {/* Result Top Summary Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                    evaluationResult.overallScore >= priorityThreshold
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : evaluationResult.overallScore < rejectionThreshold
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {toPersianDigits(evaluationResult.overallScore)}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      نتیجه ارزیابی هوشمند برای {evaluationResult.candidateName}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-black ${
                        evaluationResult.category === CandidateCategory.INTERVIEW_PRIORITY
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : evaluationResult.category === CandidateCategory.NEEDS_REVIEW
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {evaluationResult.category === CandidateCategory.INTERVIEW_PRIORITY
                        ? 'اولویت مصاحبه'
                        : evaluationResult.category === CandidateCategory.NEEDS_REVIEW
                        ? 'نیازمند بررسی مدیر'
                        : 'رد اولیه'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                    {evaluationResult.formulaExplanation}
                  </p>
                </div>
              </div>

              {evaluationResult.vetoTriggered && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200">
                  <ShieldAlert className="w-4 h-4" />
                  <span>شرط وتو فعال شد: {evaluationResult.vetoReason}</span>
                </div>
              )}
            </div>

            {/* Criteria Breakdown Table & Bars */}
            <div className="space-y-2 bg-white p-4 rounded-xl border border-slate-200">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                تفکیک نمرات و تحلیل مستند شاخصه‌ها (Criteria Breakdown):
              </h4>

              <div className="space-y-3 pt-2">
                {criteriaList.map((crit) => {
                  const score = evaluationResult.criteriaScores?.[crit.title] ?? 0;
                  const feedback = evaluationResult.criteriaFeedback?.[crit.title] ?? '';
                  const percent = Math.min(100, Math.max(0, score * 10));

                  return (
                    <div key={crit.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800">{crit.title}</span>
                          <span className="text-[10px] text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                            وزن: {toPersianDigits(crit.weight)}٪
                          </span>
                          {crit.isMandatory && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              الزامی (حداقل {toPersianDigits(crit.thresholdScore || 5)})
                            </span>
                          )}
                        </div>

                        <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {toPersianDigits(score)} از ۱۰
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            score >= 7
                              ? 'bg-emerald-500'
                              : score >= 5
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>

                      {/* AI Feedback for this criterion */}
                      {feedback && (
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed pt-0.5">
                          💬 {feedback}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  نقاط قوت مستخرج از رزومه:
                </div>
                <ul className="space-y-1 text-[11px] text-slate-700">
                  {evaluationResult.strengths?.map((str: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-black">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  نقاط نیازمند بررسی و ریسک‌ها:
                </div>
                <ul className="space-y-1 text-[11px] text-slate-700">
                  {evaluationResult.weaknesses?.map((w: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-black">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Executive AI Summary Box */}
            {evaluationResult.executiveSummary && (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-indigo-600" />
                  جمع‌بندی تحلیلی دستیار هوش مصنوعی (Executive AI Summary):
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {evaluationResult.executiveSummary}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default EvaluationCriteriaManager;
