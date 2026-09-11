import React, { useState, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Play,
  FileText,
  Building2,
  Cpu,
  Layers,
  Sliders,
  ShieldAlert,
  Plus,
  Trash2,
  Upload,
  ArrowRight,
  Info,
  Clock,
  Gauge,
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Zap,
  BookOpen,
  Award,
  Users,
  Target,
  FileCode,
  HelpCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import {
  AIBotGovernanceConfig,
  DepartmentEvaluationPipeline,
  PipelineStep,
  PipelineCriteriaWeight,
  PipelineEvaluationTestResult,
  Candidate,
  JobPosting,
} from '../../types';
import { Skeleton, SkeletonCard, SkeletonText } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import { toPersianDigits } from '../../utils/jalali';

interface AIBotGovernanceModuleProps {
  candidates?: Candidate[];
  jobs?: JobPosting[];
}

export const AIBotGovernanceModule: React.FC<AIBotGovernanceModuleProps> = ({
  candidates = [],
  jobs = [],
}) => {
  // Config state
  const [config, setConfig] = useState<AIBotGovernanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active Tab: 'overview' | 'culture' | 'pipelines' | 'weights' | 'sandbox'
  const [activeTab, setActiveTab] = useState<'overview' | 'culture' | 'pipelines' | 'weights' | 'sandbox'>('overview');

  // Selected Department Pipeline for editing in pipelines and weights tab
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-rd');

  // Gemini Live Connection State
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    connected: boolean;
    model: string;
    latencyMs: number;
    message: string;
    apiKeyPresent: boolean;
    capabilities?: string[];
  } | null>(null);

  // Sandbox simulation state
  const [sandboxCandidateName, setSandboxCandidateName] = useState('مهندس سارا نیک‌پیام');
  const [sandboxDeptId, setSandboxDeptId] = useState('dept-rd');
  const [sandboxResumeText, setSandboxResumeText] = useState(
`سارا نیک‌پیام
تحصیلات: کارشناسی ارشد شیمی کاربردی از دانشگاه تهران (معدل ۱۸.۴)
سوابق شغلی:
- کارشناس ارشد فرمولاسیون محصولات پوستی در شرکت پخش و تولید دارویی البرز (۴ سال)
- مسئول طراحی فرمولاسیون لوسیون‌ها، کرم‌های ضدآفتاب SPF50 با فیلترهای نانو، و میسلار واتر
- نظارت بر آزمون‌های پایداری تسریع‌شده (Accelerated Stability) در دمای ۴۰ درجه و رطوبت ۷۵٪
- مسلط به استانداردهای GMP، الزامات سازمان غذا و دارو (IFDA) و پرونده‌های ثبت IRC
- تجربه در کاهش هزینه‌های بچ و جایگزینی امولسیفایرهای طبیعی و پایدار
- روحیه تیمی بالا، تجربه همکاری نزدیک با کارشناسان کنترل کیفی و بازاریابی`);
  const [runningEvaluation, setRunningEvaluation] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<PipelineEvaluationTestResult | null>(null);

  // File upload state for culture doc
  const [isDragging, setIsDragging] = useState(false);

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ai-governance/config');
      if (!res.ok) throw new Error('خطا در دریافت تنظیمات حاکمیت هوش مصنوعی');
      const data = await res.json();
      setConfig(data.config);
      if (data.config?.departmentPipelines?.length > 0) {
        setSelectedDeptId(data.config.departmentPipelines[0].departmentId);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    try {
      setSaving(true);
      setSaveSuccessMessage(null);
      setErrorMessage(null);
      const res = await fetch('/api/ai-governance/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ذخیره‌سازی');
      setConfig(data.config);
      setSaveSuccessMessage('تنظیمات دستیار هوش مصنوعی و معیارهای ارزیابی ذخیره شد.');
      setTimeout(() => setSaveSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در ذخیره پیکربندی');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setConnectionResult(null);
      const res = await fetch('/api/ai-governance/test-connection', { method: 'POST' });
      const data = await res.json();
      setConnectionResult(data);
    } catch (err: any) {
      setConnectionResult({
        connected: false,
        model: config?.modelName || 'gemini-3.8-flash',
        latencyMs: 0,
        apiKeyPresent: false,
        message: 'ارتباط با سرور برقرار نشد: ' + err.message,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRunSandboxEvaluation = async () => {
    if (!sandboxResumeText.trim()) {
      alert('لطفاً متن رزومه را وارد فرمایید.');
      return;
    }
    try {
      setRunningEvaluation(true);
      setEvaluationResult(null);
      const currentPipeline = config?.departmentPipelines.find(p => p.departmentId === sandboxDeptId);
      const res = await fetch('/api/ai-governance/test-evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: sandboxCandidateName,
          departmentId: sandboxDeptId,
          resumeText: sandboxResumeText,
          pipelineOverride: currentPipeline,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در ارزیابی رزومه');
      setEvaluationResult(data.result);
    } catch (err: any) {
      alert('خطا در ارزیابی: ' + err.message);
    } finally {
      setRunningEvaluation(false);
    }
  };

  // Sample resumes for quick testing
  const sampleResumes = [
    {
      title: 'رزومه ۱: فرمولاتور ارشد R&D (پوست و مو)',
      deptId: 'dept-rd',
      name: 'مهندس سارا نیک‌پیام',
      text: `سارا نیک‌پیام
تحصیلات: کارشناسی ارشد شیمی کاربردی از دانشگاه تهران (معدل ۱۸.۴)
سوابق شغلی:
- کارشناس ارشد فرمولاسیون محصولات پوستی در شرکت پخش و تولید دارویی البرz (۴ سال)
- مسئول طراحی فرمولاسیون لوسیون‌ها، کرم‌های ضدآفتاب SPF50 با فیلترهای نانو، و میسلار واتر
- نظارت بر آزمون‌های پایداری تسریع‌شده (Accelerated Stability) در دمای ۴۰ درجه و رطوبت ۷۵٪
- مسلط به استانداردهای GMP، الزامات سازمان غذا و دارو (IFDA) و پرونده‌های ثبت IRC
- تجربه در کاهش هزینه‌های بچ و جایگزینی امولسیفایرهای طبیعی و پایدار
- روحیه تیمی بالا، تجربه همکاری نزدیک با کارشناسان کنترل کیفی و بازاریابی`,
    },
    {
      title: 'رزومه ۲: سرپرست شیفت تولید کارخانجات اشتهارد',
      deptId: 'dept-mfg',
      name: 'مهندس کامران رستمی',
      text: `کامران رستمی
محل سکونت: کرج (میدان شهدا) - آماده استفاده از سرویس‌های اشتهارد
تحصیلات: کارشناسی مهندسی صنایع
سوابق شغلی:
- سرپرست شیفت تولید و بسته‌بندی در صنایع شوینده اکتیو (۵ سال)
- هدایت شیفت‌های چرخشی ۳۵ نفره در خطوط پرکن تیوپ و قوطی‌های لوسیون و شامپو
- مسلط به متدولوژی نگهداری و تعمیرات بهره‌ور فراگیر (TPM) و ارتقای شاخص OEE به ۸۲٪
- سابقه صفر حادثه شغلی ناشی از خطای انسانی با اجرای سفت‌وسخت مقررات ایمنی HSE
- توانایی بالا در حل تعارض پرسنلی، گزارش‌دهی ضایعات به صورت برخط و نظم شیفتی`,
    },
    {
      title: 'رزومه ۳: سرپرست فروش مویرگی FMCG و داروخانه‌ای',
      deptId: 'dept-sales',
      name: 'علیرضا اسدی',
      text: `علیرضا اسدی
تحصیلات: کارشناسی مدیریت بازرگانی
سوابق شغلی:
- سرپرست فروش منطقه شرق تهران در شرکت پخش سراسری گلرنگ (۴ سال)
- تحقق میانگین ۱۰۸٪ تارگت‌های ماهیانه فروش برندهای بهداشتی در داروخانه‌ها و هایپرمارکت‌ها
- مدیریت تیم ۸ نفره ویزیتور، آموزش تکنیک‌های مذاکره و متقاعدسازی مشتریان دشوار
- وصول ۹۸.۵٪ مطالبات در دوره موعد با کنترل دقیق اعتبارسنجی داروخانه‌ها
- مسلط به نرم‌افزارهای پخش وریا و سپیدار، روابط عمومی بالا و انگیزه برای ارتقای سهم بازار برندهای سیلانه سبز`,
    },
    {
      title: 'رزومه ۴: کارشناس دارای خط قرمز و نقص الزامات (جهت تست وتو)',
      deptId: 'dept-rd',
      name: 'امیرحسین رضایی',
      text: `امیرحسین رضایی
تحصیلات: کارشناسی زبان انگلیسی
سوابق: ۲ سال فروشندگی متفرقه بدون هیچ تجربه آزمایشگاهی یا شیمی.
علاقمند به حضور در آزمایشگاه تحقیق و توسعه و یادگیری در حین کار.
فاقد هرگونه آشنایی با استانداردهای دارویی، بهداشتی یا قوانین سازمان غذا و دارو.`,
    },
  ];

  // Selected pipeline object
  const currentPipeline = config?.departmentPipelines.find(p => p.departmentId === selectedDeptId) || config?.departmentPipelines[0];

  // Helper to handle text upload into culture doc
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (config && content) {
        setConfig({
          ...config,
          culture: {
            ...config.culture,
            companyCultureDoc: content,
          },
        });
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-12 animate-fadeIn" dir="rtl">
        {/* Header Skeleton */}
        <div className="bg-surface-1 rounded-2xl p-6 sm:p-8 border border-border-default space-y-4">
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-8 w-80 rounded-xl" />
          <SkeletonText lines={2} />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Tab Pills Skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-xl" />
          ))}
        </div>

        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <SkeletonCard className="h-72" />
            <SkeletonCard className="h-64" />
          </div>
          <div className="space-y-4">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-80" />
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="p-8 text-center bg-surface-1 border border-danger/30 rounded-2xl shadow-xs" dir="rtl">
        <EmptyState
          icon={<AlertTriangle className="w-8 h-8 text-danger" />}
          title="پیکربندی هوش مصنوعی یافت نشد"
          description="ارتباط با پایگاه پیکربندی حاکمیت هوش مصنوعی هلدینگ برقرار نشد یا هنوز تنظیماتی ثبت نشده است."
          actionLabel="تلاش مجدد جهت بارگذاری"
          onAction={fetchConfig}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12" dir="rtl">
      {/* ================= Master Header ================= */}
      <div className="bg-gradient-to-l from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 -mt-8 -ml-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>تنظیمات دستیار هوش مصنوعی</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              تنظیمات رفتار دستیار و مراحل ارزیابی کارجویان
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              تعیین رفتار، فرهنگ سازمانی و معیارهای بررسی رزومه کارجویان در دپارتمان‌های مختلف سیلانه سبز.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-600/60 rounded-xl text-xs sm:text-sm font-medium text-slate-200 shadow-sm transition-all"
            >
              <Cpu className={`w-4 h-4 text-emerald-400 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'در حال بررسی...' : 'بررسی اتصال به Gemini'}</span>
            </button>

            <button
              onClick={handleSaveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
              <span>{saving ? 'در حال ذخیره...' : 'ذخیره تنظیمات'}</span>
            </button>
          </div>
        </div>

        {/* Live Status Indicators Banner */}
        <div className="mt-6 pt-6 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <div>
              <p className="text-slate-400 font-medium">موتور هوش مصنوعی</p>
              <p className="text-white font-bold">{config.modelName}</p>
            </div>
          </div>
          <div>
            <p className="text-slate-400 font-medium">دپارتمان‌های فعال</p>
            <p className="text-white font-bold">{toPersianDigits(config.departmentPipelines.length)} دپارتمان</p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">سطح سخت‌گیری</p>
            <p className="text-emerald-300 font-bold">
              {config.strictnessLevel === 'STRICT' ? 'سخت‌گیرانه' : config.strictnessLevel === 'BALANCED' ? 'متعادل' : 'منعطف'}
            </p>
          </div>
          <div>
            <p className="text-slate-400 font-medium">آخرین به‌روزرسانی</p>
            <p className="text-white font-bold">{toPersianDigits(config.lastUpdatedJalali)}</p>
          </div>
        </div>

        {/* Gemini Connection Test Result Banner */}
        {connectionResult && (
          <div
            className={`mt-4 p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm animate-in fade-in ${
              connectionResult.connected
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
            }`}
          >
            {connectionResult.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">
                  {connectionResult.connected
                    ? `اتصال زنده به Google Gemini برقرار است (مدل: ${connectionResult.model})`
                    : 'خطا در ارتباط زنده با Gemini API'}
                </span>
                {connectionResult.latencyMs > 0 && (
                  <span className="bg-slate-800/80 px-2 py-0.5 rounded text-xs text-slate-300 font-mono">
                    تاخیر: {toPersianDigits(connectionResult.latencyMs)} میلی‌ثانیه
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">{connectionResult.message}</p>
              {connectionResult.capabilities && connectionResult.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {connectionResult.capabilities.map((cap, i) => (
                    <span key={i} className="bg-emerald-500/20 px-2 py-0.5 rounded text-[11px] text-emerald-200">
                      ✓ {cap}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notification Alert */}
        {saveSuccessMessage && (
          <div className="mt-4 p-3.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 p-3.5 bg-rose-500/20 border border-rose-400/40 rounded-xl text-rose-200 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* ================= Navigation Tabs ================= */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-white rounded-xl p-1.5 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>۱. هویت و تنظیمات عمومی دستیار</span>
        </button>

        <button
          onClick={() => setActiveTab('culture')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'culture'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>۲. ارزش‌های سازمانی و معیارها</span>
        </button>

        <button
          onClick={() => setActiveTab('pipelines')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'pipelines'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>۳. مراحل ارزیابی دپارتمان‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('weights')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'weights'
              ? 'bg-slate-900 text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>۴. ضرایب و معیارهای ارزیابی</span>
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
            activeTab === 'sandbox'
              ? 'bg-emerald-700 text-white shadow'
              : 'text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>۵. شبیه‌ساز بررسی رزومه</span>
        </button>
      </div>

      {/* ================= TAB 1: Bot Identity, Model & Persona ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">هویت و نقش دستیار</h2>
                  <p className="text-xs text-slate-500">تنظیم لحن، مدل و مشخصات دستیار هوش مصنوعی</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نام رسمی دستیار</label>
                <input
                  type="text"
                  value={config.botName}
                  onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نقش سازمانی دستیار</label>
                <input
                  type="text"
                  value={config.botRole}
                  onChange={(e) => setConfig({ ...config, botRole: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">مدل هوش مصنوعی (Google Gemini)</label>
                <div className="flex items-center gap-2">
                  <select
                    value={config.modelName || 'gemini-3.8-flash'}
                    onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 font-mono focus:bg-white focus:border-emerald-600 font-semibold"
                  >
                    <option value="gemini-3.8-flash">gemini-3.8-flash (پیش‌فرض)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (سبک و سریع)</option>
                    <option value="gemini-flash-latest">gemini-flash-latest (جدیدترین نسخه)</option>
                  </select>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-2.5 rounded-lg font-semibold whitespace-nowrap">
                    نسخه فعال
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">مدل مناسب جهت تحلیل دقیق، استخراج شواهد رزومه و خروجی ساختاریافته</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">لحن پاسخ‌دهی</label>
                <select
                  value={config.culture.toneOfVoice}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      culture: { ...config.culture, toneOfVoice: e.target.value as any },
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-emerald-600"
                >
                  <option value="PROFESSIONAL">حرفه‌ای و تحلیلی (پیشنهادی)</option>
                  <option value="FORMAL">کاملاً رسمی و اداری</option>
                  <option value="STRICT">سخت‌گیرانه و صریح</option>
                  <option value="EMPATHETIC">همدلانه و توسعه‌محور</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                دستورالعمل پایه سیستم
              </label>
              <textarea
                rows={5}
                value={config.systemPromptTemplate}
                onChange={(e) => setConfig({ ...config, systemPromptTemplate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 font-sans leading-relaxed focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                این دستورالعمل به عنوان چارچوب رفتاری دستیار در بررسی‌ها به کار می‌رود.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700">قوانین رفتاری دستیار</label>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      generalEvaluationRules: [...config.generalEvaluationRules, 'قانون رفتاری جدید'],
                    })
                  }
                  className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن قانون</span>
                </button>
              </div>
              <div className="space-y-2">
                {config.generalEvaluationRules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400 w-6 text-center">{toPersianDigits(idx + 1)}.</span>
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => {
                        const updated = [...config.generalEvaluationRules];
                        updated[idx] = e.target.value;
                        setConfig({ ...config, generalEvaluationRules: updated });
                      }}
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.generalEvaluationRules.filter((_, i) => i !== idx);
                        setConfig({ ...config, generalEvaluationRules: updated });
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                دستورالعمل نگارش پیش‌نویس ایمیل‌ها به کارجویان
              </label>
              <textarea
                rows={2}
                value={config.emailDraftingGuidelines}
                onChange={(e) => setConfig({ ...config, emailDraftingGuidelines: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-emerald-600"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: Organizational Culture & Red Lines ================= */}
      {activeTab === 'culture' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Company Vision & Holding Brands */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">چشم‌انداز و برندهای هلدینگ سیلانه سبز</h2>
                  <p className="text-xs text-slate-500">تنظیم شناخت دستیار از موقعیت و هویت کارفرما</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">چشم‌انداز و ماموریت کلان سازمانی</label>
              <textarea
                rows={3}
                value={config.culture.companyVision}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    culture: { ...config.culture, companyVision: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 leading-relaxed focus:bg-white focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">برندهای تجاری و زیرمجموعه‌های هلدینگ</label>
              <div className="flex flex-wrap gap-2">
                {config.culture.holdingBrands.map((b, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{b}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Upload and Edit Culture Book Markdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">کتابچه فرهنگ سازمانی و اصول راهبردی</h2>
                  <p className="text-xs text-slate-500">سند راهنما برای بررسی تطابق کارجویان با ارزش‌های سازمانی</p>
                </div>
              </div>

              {/* Upload Culture File */}
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-semibold cursor-pointer transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>بارگذاری سند فرهنگ سازمانی (TXT / MD)</span>
                <input type="file" accept=".txt,.md,.markdown" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                متن کامل سند فرهنگ سازمانی
              </label>
              <textarea
                rows={10}
                value={config.culture.companyCultureDoc}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    culture: { ...config.culture, companyCultureDoc: e.target.value },
                  })
                }
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 font-mono leading-relaxed focus:bg-white focus:border-emerald-600"
                placeholder="متن سند فرهنگ سازمانی..."
              />
              <p className="text-[11px] text-slate-500 mt-1">
                این سند در ارزیابی برای بررسی تطابق رفتاری کارجو به کار می‌رود.
              </p>
            </div>
          </div>

          {/* Core Cultural Values & Weights */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">ارزش‌های سازمانی و اوزان ارزیابی</h2>
                  <p className="text-xs text-slate-500">شاخص‌های فرهنگی مورد انتظار از کارجو</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newVals = [
                    ...config.culture.coreValues,
                    {
                      id: `val-${Date.now()}`,
                      title: 'ارزش سازمانی جدید',
                      description: 'توضیحات و مصادیق رفتاری این ارزش',
                      weight: 15,
                    },
                  ];
                  setConfig({
                    ...config,
                    culture: { ...config.culture, coreValues: newVals },
                  });
                }}
                className="text-xs text-blue-700 font-semibold hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن ارزش سازمانی</span>
              </button>
            </div>

            <div className="space-y-4">
              {config.culture.coreValues.map((val, idx) => (
                <div key={val.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      type="text"
                      value={val.title}
                      onChange={(e) => {
                        const updated = [...config.culture.coreValues];
                        updated[idx].title = e.target.value;
                        setConfig({
                          ...config,
                          culture: { ...config.culture, coreValues: updated },
                        });
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800"
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 font-medium">وزن اثرگذاری:</span>
                      <input
                        type="number"
                        min="5"
                        max="50"
                        value={val.weight}
                        onChange={(e) => {
                          const updated = [...config.culture.coreValues];
                          updated[idx].weight = Number(e.target.value) || 10;
                          setConfig({
                            ...config,
                            culture: { ...config.culture, coreValues: updated },
                          });
                        }}
                        className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800"
                      />
                      <span className="text-xs text-slate-500">٪</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = config.culture.coreValues.filter((_, i) => i !== idx);
                        setConfig({
                          ...config,
                          culture: { ...config.culture, coreValues: updated },
                        });
                      }}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <textarea
                    rows={2}
                    value={val.description}
                    onChange={(e) => {
                      const updated = [...config.culture.coreValues];
                      updated[idx].description = e.target.value;
                      setConfig({
                        ...config,
                        culture: { ...config.culture, coreValues: updated },
                      });
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                    placeholder="توضیحات و مصادیق شواهد رفتاری مرتبط در رزومه..."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Organizational Red Lines (Dealbreakers) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">خطوط قرمز و رفتارهای غیرقابل قبول سازمانی</h2>
                  <p className="text-xs text-slate-500">مواردی که در صورت احراز در رزومه، بلافاصله اخطار قرمز وتو صادر می‌شود</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const updated = [...config.culture.unacceptableBehaviors, 'خط قرمز جدید'];
                  setConfig({
                    ...config,
                    culture: { ...config.culture, unacceptableBehaviors: updated },
                  });
                }}
                className="text-xs text-rose-700 font-semibold hover:text-rose-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن خط قرمز</span>
              </button>
            </div>

            <div className="space-y-2">
              {config.culture.unacceptableBehaviors.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const updated = [...config.culture.unacceptableBehaviors];
                      updated[idx] = e.target.value;
                      setConfig({
                        ...config,
                        culture: { ...config.culture, unacceptableBehaviors: updated },
                      });
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs sm:text-sm text-slate-800 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = config.culture.unacceptableBehaviors.filter((_, i) => i !== idx);
                      setConfig({
                        ...config,
                        culture: { ...config.culture, unacceptableBehaviors: updated },
                      });
                    }}
                    className="text-rose-400 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: Department & Industry Pipelines ================= */}
      {activeTab === 'pipelines' && currentPipeline && (
        <div className="space-y-6 animate-in fade-in">
          {/* Department Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-slate-800">انتخاب دپارتمان برای ویرایش مراحل ارزیابی:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {config.departmentPipelines.map((p) => (
                <button
                  key={p.departmentId}
                  onClick={() => setSelectedDeptId(p.departmentId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedDeptId === p.departmentId
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.departmentName}
                </button>
              ))}
            </div>
          </div>

          {/* Active Pipeline Header Details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-md">
                  صنعت: {currentPipeline.industrySector}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-2">
                  مراحل ارزیابی {currentPipeline.departmentName}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{currentPipeline.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">حداقل نمره قبولی در این دپارتمان</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={currentPipeline.minimumPassingScore}
                    onChange={(e) => {
                      const updated = config.departmentPipelines.map(p =>
                        p.departmentId === currentPipeline.departmentId
                          ? { ...p, minimumPassingScore: Number(e.target.value) || 7.0 }
                          : p
                      );
                      setConfig({ ...config, departmentPipelines: updated });
                    }}
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-center text-slate-800"
                  />
                  <span className="text-xs text-slate-500">از ۱۰ نمره</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">سطح سخت‌گیری ارزیابی</label>
                <select
                  value={currentPipeline.airigor}
                  onChange={(e) => {
                    const updated = config.departmentPipelines.map(p =>
                      p.departmentId === currentPipeline.departmentId
                        ? { ...p, airigor: e.target.value as any }
                        : p
                    );
                    setConfig({ ...config, departmentPipelines: updated });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800"
                >
                  <option value="STRICT">سخت‌گیرانه - استانداردهای بالا</option>
                  <option value="BALANCED">متعادل - منصفانه و عینی</option>
                  <option value="LENIENT">منعطف - تمرکز بر پتانسیل رشد</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">روش نمره‌دهی و محاسباتی</label>
                <select
                  value={currentPipeline.scoringMethod}
                  onChange={(e) => {
                    const updated = config.departmentPipelines.map(p =>
                      p.departmentId === currentPipeline.departmentId
                        ? { ...p, scoringMethod: e.target.value as any }
                        : p
                    );
                    setConfig({ ...config, departmentPipelines: updated });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800"
                >
                  <option value="THRESHOLD_VETO">ماتریس وتو و میانگین وزنی</option>
                  <option value="WEIGHTED_AVG">میانگین وزنی خطی استاندارد</option>
                  <option value="GEOMETRIC_MEAN">میانگین هندسی اوزان</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                دستورالعمل‌های اختصاصی پرامپت هوش مصنوعی برای این دپارتمان
              </label>
              <textarea
                rows={2}
                value={currentPipeline.customPromptInstructions}
                onChange={(e) => {
                  const updated = config.departmentPipelines.map(p =>
                    p.departmentId === currentPipeline.departmentId
                      ? { ...p, customPromptInstructions: e.target.value }
                      : p
                  );
                  setConfig({ ...config, departmentPipelines: updated });
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800"
                placeholder="مثلا: در این دپارتمان حتما تسلط بر فرمولاسیون کرم‌ها و استانداردهای غذا و دارو بررسی شود..."
              />
            </div>
          </div>

          {/* Sequential Pipeline Steps */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">مراحل ارزیابی رزومه</h3>
                  <p className="text-xs text-slate-500">مراحلی که دستیار هوش مصنوعی برای هر رزومه طی می‌کند</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newStep: PipelineStep = {
                    id: `s-custom-${Date.now()}`,
                    stepNumber: (currentPipeline.steps?.length || 0) + 1,
                    name: 'مرحله جدید',
                    description: 'شرح جزئیات بررسی در این مرحله',
                    evaluationType: 'SKILL_MATCH',
                    isAutomated: true,
                    failAction: 'FLAG_FOR_MANAGER',
                  };
                  const updated = config.departmentPipelines.map(p =>
                    p.departmentId === currentPipeline.departmentId
                      ? { ...p, steps: [...p.steps, newStep] }
                      : p
                  );
                  setConfig({ ...config, departmentPipelines: updated });
                }}
                className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن مرحله</span>
              </button>
            </div>

            <div className="space-y-4">
              {currentPipeline.steps.map((step, idx) => (
                <div
                  key={step.id || idx}
                  className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 relative group space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                        {toPersianDigits(step.stepNumber)}
                      </span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) => {
                          const updatedSteps = [...currentPipeline.steps];
                          updatedSteps[idx].name = e.target.value;
                          const updated = config.departmentPipelines.map(p =>
                            p.departmentId === currentPipeline.departmentId ? { ...p, steps: updatedSteps } : p
                          );
                          setConfig({ ...config, departmentPipelines: updated });
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 min-w-[240px]"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-xs text-slate-500 ml-1">نوع:</span>
                        <select
                          value={step.evaluationType}
                          onChange={(e) => {
                            const updatedSteps = [...currentPipeline.steps];
                            updatedSteps[idx].evaluationType = e.target.value as any;
                            const updated = config.departmentPipelines.map(p =>
                              p.departmentId === currentPipeline.departmentId ? { ...p, steps: updatedSteps } : p
                            );
                            setConfig({ ...config, departmentPipelines: updated });
                          }}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        >
                          <option value="KNOCKOUT">حذفی و وتو</option>
                          <option value="EXPERIENCE_VERIFY">راستی‌آزمایی سوابق</option>
                          <option value="SKILL_MATCH">سنجش مهارت تخصصی</option>
                          <option value="CULTURE_FIT">تناسب فرهنگی هلدینگ</option>
                          <option value="BEHAVIORAL">رفتاری و تارگت‌محوری</option>
                          <option value="FINAL_DECISION">تصمیم‌گیری نهایی</option>
                        </select>
                      </div>

                      <div>
                        <span className="text-xs text-slate-500 ml-1">در صورت رد:</span>
                        <select
                          value={step.failAction}
                          onChange={(e) => {
                            const updatedSteps = [...currentPipeline.steps];
                            updatedSteps[idx].failAction = e.target.value as any;
                            const updated = config.departmentPipelines.map(p =>
                              p.departmentId === currentPipeline.departmentId ? { ...p, steps: updatedSteps } : p
                            );
                            setConfig({ ...config, departmentPipelines: updated });
                          }}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        >
                          <option value="REJECT">رد اولیه</option>
                          <option value="FLAG_FOR_MANAGER">هشدار به مدیر</option>
                          <option value="DOWNGRADE_SCORE">کاهش نمره</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updatedSteps = currentPipeline.steps
                            .filter((_, i) => i !== idx)
                            .map((s, i) => ({ ...s, stepNumber: i + 1 }));
                          const updated = config.departmentPipelines.map(p =>
                            p.departmentId === currentPipeline.departmentId ? { ...p, steps: updatedSteps } : p
                          );
                          setConfig({ ...config, departmentPipelines: updated });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={step.description}
                      onChange={(e) => {
                        const updatedSteps = [...currentPipeline.steps];
                        updatedSteps[idx].description = e.target.value;
                        const updated = config.departmentPipelines.map(p =>
                          p.departmentId === currentPipeline.departmentId ? { ...p, steps: updatedSteps } : p
                        );
                        setConfig({ ...config, departmentPipelines: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                      placeholder="توضیح مرحله..."
                    />

                    <input
                      type="text"
                      value={step.promptHint || ''}
                      onChange={(e) => {
                        const updatedSteps = [...currentPipeline.steps];
                        updatedSteps[idx].promptHint = e.target.value;
                        const updated = config.departmentPipelines.map(p =>
                          p.departmentId === currentPipeline.departmentId ? { ...p, steps: updatedSteps } : p
                        );
                        setConfig({ ...config, departmentPipelines: updated });
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                      placeholder="راهنما برای پرامپت هوش مصنوعی (اختیاری)..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Department Specific Veto Rules */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>خطوط قرمز و شرایط وتو اختصاصی دپارتمان {currentPipeline.departmentName}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  const updatedVeto = [...currentPipeline.vetoRules, 'شرط وتوی جدید'];
                  const updated = config.departmentPipelines.map(p =>
                    p.departmentId === currentPipeline.departmentId ? { ...p, vetoRules: updatedVeto } : p
                  );
                  setConfig({ ...config, departmentPipelines: updated });
                }}
                className="text-xs text-rose-700 font-semibold hover:text-rose-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن شرط وتو</span>
              </button>
            </div>

            <div className="space-y-2">
              {currentPipeline.vetoRules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-rose-50 p-2 rounded-xl border border-rose-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                  <input
                    type="text"
                    value={rule}
                    onChange={(e) => {
                      const updatedVeto = [...currentPipeline.vetoRules];
                      updatedVeto[idx] = e.target.value;
                      const updated = config.departmentPipelines.map(p =>
                        p.departmentId === currentPipeline.departmentId ? { ...p, vetoRules: updatedVeto } : p
                      );
                      setConfig({ ...config, departmentPipelines: updated });
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-rose-200 rounded-lg text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updatedVeto = currentPipeline.vetoRules.filter((_, i) => i !== idx);
                      const updated = config.departmentPipelines.map(p =>
                        p.departmentId === currentPipeline.departmentId ? { ...p, vetoRules: updatedVeto } : p
                      );
                      setConfig({ ...config, departmentPipelines: updated });
                    }}
                    className="text-rose-400 hover:text-rose-700 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: Scoring Weights & Rubrics ================= */}
      {activeTab === 'weights' && currentPipeline && (
        <div className="space-y-6 animate-in fade-in">
          {/* Department Selector */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-bold text-slate-800">انتخاب دپارتمان برای تنظیم اوزان ارزیابی:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {config.departmentPipelines.map((p) => (
                <button
                  key={p.departmentId}
                  onClick={() => setSelectedDeptId(p.departmentId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    selectedDeptId === p.departmentId
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.departmentName}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  ماتریس اوزان شاخص‌ها: {currentPipeline.departmentName}
                </h2>
                <p className="text-xs text-slate-500">
                  مجموع درصد اوزان باید دقیقاً ۱۰۰٪ باشد. هوش مصنوعی نمرات ۱ تا ۱۰ را بر این مبنا وزن‌دهی می‌کند.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  const newWeightItem: PipelineCriteriaWeight = {
                    id: `cw-${Date.now()}`,
                    name: 'شاخصه تخصصی جدید',
                    weight: 20,
                    targetDescription: 'شرح معیارهای نمره‌دهی و حداقل انتظارات',
                    thresholdScore: 6,
                  };
                  const updated = config.departmentPipelines.map(p =>
                    p.departmentId === currentPipeline.departmentId
                      ? { ...p, criteriaWeights: [...p.criteriaWeights, newWeightItem] }
                      : p
                  );
                  setConfig({ ...config, departmentPipelines: updated });
                }}
                className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن شاخصه جدید</span>
              </button>
            </div>

            {/* Total Weight Alert */}
            {(() => {
              const totalW = currentPipeline.criteriaWeights.reduce((s, c) => s + (Number(c.weight) || 0), 0);
              return (
                <div
                  className={`p-3 rounded-xl flex items-center justify-between text-xs font-bold ${
                    totalW === 100
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span>مجموع اوزان فعلی: {toPersianDigits(totalW)}٪</span>
                  <span>{totalW === 100 ? '✓ مجموع اوزان استاندارد است' : 'هشدار: مجموع اوزان باید ۱۰۰٪ باشد'}</span>
                </div>
              );
            })()}

            <div className="space-y-4">
              {currentPipeline.criteriaWeights.map((criterion, idx) => (
                <div key={criterion.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <input
                      type="text"
                      value={criterion.name}
                      onChange={(e) => {
                        const updatedWeights = [...currentPipeline.criteriaWeights];
                        updatedWeights[idx].name = e.target.value;
                        const updated = config.departmentPipelines.map(p =>
                          p.departmentId === currentPipeline.departmentId ? { ...p, criteriaWeights: updatedWeights } : p
                        );
                        setConfig({ ...config, departmentPipelines: updated });
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-800 min-w-[260px]"
                    />

                    <div className="flex items-center gap-4">
                      {/* Weight Slider & Input */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-medium">وزن:</span>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={criterion.weight}
                          onChange={(e) => {
                            const updatedWeights = [...currentPipeline.criteriaWeights];
                            updatedWeights[idx].weight = Number(e.target.value);
                            const updated = config.departmentPipelines.map(p =>
                              p.departmentId === currentPipeline.departmentId ? { ...p, criteriaWeights: updatedWeights } : p
                            );
                            setConfig({ ...config, departmentPipelines: updated });
                          }}
                          className="w-24 accent-emerald-600"
                        />
                        <span className="text-xs font-bold text-slate-800 w-8">{toPersianDigits(criterion.weight)}٪</span>
                      </div>

                      {/* Threshold score */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 font-medium">حداقل قبولی:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={criterion.thresholdScore}
                          onChange={(e) => {
                            const updatedWeights = [...currentPipeline.criteriaWeights];
                            updatedWeights[idx].thresholdScore = Number(e.target.value);
                            const updated = config.departmentPipelines.map(p =>
                              p.departmentId === currentPipeline.departmentId ? { ...p, criteriaWeights: updatedWeights } : p
                            );
                            setConfig({ ...config, departmentPipelines: updated });
                          }}
                          className="w-14 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-center text-slate-800"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const updatedWeights = currentPipeline.criteriaWeights.filter((_, i) => i !== idx);
                          const updated = config.departmentPipelines.map(p =>
                            p.departmentId === currentPipeline.departmentId ? { ...p, criteriaWeights: updatedWeights } : p
                          );
                          setConfig({ ...config, departmentPipelines: updated });
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    value={criterion.targetDescription}
                    onChange={(e) => {
                      const updatedWeights = [...currentPipeline.criteriaWeights];
                      updatedWeights[idx].targetDescription = e.target.value;
                      const updated = config.departmentPipelines.map(p =>
                        p.departmentId === currentPipeline.departmentId ? { ...p, criteriaWeights: updatedWeights } : p
                      );
                      setConfig({ ...config, departmentPipelines: updated });
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700"
                    placeholder="شرح انتظارات و شواهد قبولی در این شاخص..."
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 5: Live Bot Interactive Sandbox ================= */}
      {activeTab === 'sandbox' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Play className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">شبیه‌ساز ارزیابی رزومه با هوش مصنوعی</h2>
                  <p className="text-xs text-slate-500">
                    بررسی نحوه تصمیم‌گیری و ارزیابی دستیار هوش مصنوعی بر اساس تنظیمات فعال
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Sample Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                انتخاب نمونه رزومه:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {sampleResumes.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSandboxCandidateName(sample.name);
                      setSandboxDeptId(sample.deptId);
                      setSandboxResumeText(sample.text);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-right transition-all"
                  >
                    <p className="text-xs font-bold text-slate-800 truncate">{sample.title}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{sample.name}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">نام کارجو</label>
                <input
                  type="text"
                  value={sandboxCandidateName}
                  onChange={(e) => setSandboxCandidateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">دپارتمان و مراحل ارزیابی</label>
                <select
                  value={sandboxDeptId}
                  onChange={(e) => setSandboxDeptId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800"
                >
                  {config.departmentPipelines.map((p) => (
                    <option key={p.departmentId} value={p.departmentId}>
                      {p.departmentName} ({p.industrySector})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                متن رزومه برای ارزیابی
              </label>
              <textarea
                rows={8}
                value={sandboxResumeText}
                onChange={(e) => setSandboxResumeText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 font-sans leading-relaxed focus:bg-white focus:border-emerald-600"
                placeholder="متن رزومه کارجو را وارد کنید..."
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRunSandboxEvaluation}
                disabled={runningEvaluation}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/20 transition-all"
              >
                <Zap className={`w-4 h-4 ${runningEvaluation ? 'animate-spin' : ''}`} />
                <span>{runningEvaluation ? 'در حال ارزیابی...' : 'اجرای ارزیابی رزومه'}</span>
              </button>
            </div>
          </div>

          {/* ================= Evaluation Output Dashboard ================= */}
          {evaluationResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md space-y-6 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                      {evaluationResult.aiAvailable ? 'موتور زنده Gemini' : 'موتور ارزیابی محلی'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      تاخیر پردازش: {toPersianDigits(evaluationResult.latencyMs)}ms
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    گزارش ارزیابی کارجو: {evaluationResult.candidateName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    دپارتمان: {evaluationResult.departmentName} | صنعت: {evaluationResult.industrySector}
                  </p>
                </div>

                {/* Score Big Badge */}
                <div className="flex items-center gap-4">
                  <div className="text-center bg-slate-900 text-white px-5 py-3 rounded-2xl shadow">
                    <p className="text-[11px] text-slate-400">نمره نهایی ارزیابی</p>
                    <p className="text-3xl font-extrabold text-emerald-400">
                      {toPersianDigits(evaluationResult.totalScore.toFixed(1))}
                      <span className="text-xs font-normal text-slate-400 mr-1">/۱۰</span>
                    </p>
                  </div>

                  <div className="space-y-1 text-right">
                    <span
                      className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                        evaluationResult.passed
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {evaluationResult.passed ? 'تایید اولیه' : 'عدم احراز شرایط'}
                    </span>
                    <p className="text-xs text-slate-600 font-medium">
                      دسته‌بندی:{' '}
                      {evaluationResult.category === 'INTERVIEW_PRIORITY'
                        ? 'اولویت مصاحبه'
                        : evaluationResult.category === 'NEEDS_REVIEW'
                        ? 'نیازمند بررسی مدیر'
                        : 'رد اولیه'}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Advisory Note */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>تحلیل دستیار هوش مصنوعی جنبه مشورتی دارد و تصمیم نهایی با مدیر استخدام است.</span>
              </div>

              {/* Veto Alert */}
              {evaluationResult.vetoTriggered && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs sm:text-sm flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">هشدار شرط وتو</p>
                    <p className="mt-1">{evaluationResult.vetoReason || 'کارجو حداقل یکی از خطوط قرمز یا الزامات پایه این دپارتمان را نقض کرده است.'}</p>
                  </div>
                </div>
              )}

              {/* Cultural Fit Score Box */}
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>تناسب با فرهنگ سازمانی و ارزش‌های سیلانه سبز</span>
                  </span>
                  <span className="text-sm font-extrabold text-amber-800">
                    نمره تطابق: {toPersianDigits(evaluationResult.culturalFitScore)} از ۱۰
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  {evaluationResult.culturalFitAnalysis}
                </p>
              </div>

              {/* Sequential Steps Trace */}
              {evaluationResult.stepResults && evaluationResult.stepResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <span>نتیجه مراحل ارزیابی دپارتمان</span>
                  </h4>
                  <div className="space-y-2">
                    {evaluationResult.stepResults.map((st, i) => (
                      <div
                        key={i}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${
                              st.passed ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          >
                            {toPersianDigits(st.stepNumber)}
                          </span>
                          <div>
                            <p className="font-bold text-slate-800">{st.stepName}</p>
                            <p className="text-slate-500 text-[11px]">{st.notes}</p>
                          </div>
                        </div>

                        {st.evidence && (
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 max-w-sm truncate">
                            شاهد: {st.evidence}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Criteria Scores Grid */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  <span>نمرات تفکیکی شاخص‌های ارزیابی</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(evaluationResult.criteriaScores || {}).map(([cName, score]) => (
                    <div key={cName} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                        <span>{cName}</span>
                        <span className="text-emerald-700 font-mono text-sm">{toPersianDigits(score)} / ۱۰</span>
                      </div>
                      {evaluationResult.criteriaFeedback?.[cName] && (
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {evaluationResult.criteriaFeedback[cName]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths and Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>نقاط قوت شناسایی‌شده در رزومه</span>
                  </p>
                  <ul className="space-y-1 text-xs text-emerald-950 list-disc list-inside">
                    {(evaluationResult.strengths || []).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>نقاط نیازمند بررسی و ریسک‌ها</span>
                  </p>
                  <ul className="space-y-1 text-xs text-rose-950 list-disc list-inside">
                    {(evaluationResult.weaknesses || []).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Executive Summary */}
              {evaluationResult.executiveSummary && (
                <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                  <p className="text-xs font-bold text-emerald-400">جمع‌بندی دستیار هوش مصنوعی:</p>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                    {evaluationResult.executiveSummary}
                  </p>
                </div>
              )}

              {/* Raw Model Reasoning Log */}
              {evaluationResult.rawModelReasoning && (
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">شرح استدلال هوش مصنوعی:</p>
                  <p className="font-mono text-[11px] leading-relaxed text-slate-600">
                    {evaluationResult.rawModelReasoning}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
