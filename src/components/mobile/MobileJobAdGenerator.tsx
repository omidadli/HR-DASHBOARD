import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  FileText,
  Loader2,
  Briefcase,
  Building2,
  BookmarkPlus,
  Coins,
  Gift,
  ArrowRight,
  ArrowLeft,
  Share2,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { HoldingDepartment, JobAdGenerationRequest, JobAdGenerationResult } from '../../types';

interface MobileJobAdGeneratorProps {
  departments: HoldingDepartment[];
  initialDeptId?: string | null;
  onJobCreated?: (newJob: any) => void;
  onBack?: () => void;
}

export const MobileJobAdGenerator: React.FC<MobileJobAdGeneratorProps> = ({
  departments,
  initialDeptId,
  onJobCreated,
  onBack,
}) => {
  // Current Wizard Step (1: Job & Dept, 2: Requirements & Tone, 3: Perks & Generation)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [jobTitle, setJobTitle] = useState('مدیر برند - محصولات مراقبت از پوست');
  const [selectedDeptId, setSelectedDeptId] = useState(
    initialDeptId || departments[2]?.id || departments[0]?.id || 'dept-mkt'
  );

  useEffect(() => {
    if (initialDeptId) {
      setSelectedDeptId(initialDeptId);
    }
  }, [initialDeptId]);

  const [seniority, setSeniority] = useState<'کارآموز' | 'کارشناس' | 'کارشناس ارشد' | 'سرپرست' | 'مدیر'>('مدیر');
  const [workType, setWorkType] = useState<'تمام‌وقت' | 'پاره‌وقت' | 'پروژه‌ای' | 'شیفتی کارخانه'>('تمام‌وقت');
  const [location, setLocation] = useState('تهران، ستاد مرکزی هلدینگ');
  const [brandFocus, setBrandFocus] = useState('دافی و کامان');
  const [keySkills, setKeySkills] = useState('تحلیل بازار FMCG، تدوین استراتژی کمپین‌ها، بودجه‌ریزی برند، مدیریت تیم');
  const [selectedPerks, setSelectedPerks] = useState<string[]>([
    'بسته ماهانه محصولات بهداشتی برندهای دافی و کامان',
    'بیمه تکمیلی برای کارمندان و خانواده',
    'پاداش عملکرد و بهره‌وری فصلی',
  ]);
  const [tone, setTone] = useState<'حرفه‌ای و سازمانی' | 'پرانرژی و استارتاپی' | 'کاریزماتیک و الهام‌بخش'>('پرانرژی و استارتاپی');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<JobAdGenerationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'ad' | 'jd' | 'questions'>('ad');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const perksOptions = [
    'بسته ماهانه محصولات بهداشتی برندهای دافی و کامان',
    'بیمه تکمیلی برای کارمندان و خانواده',
    'پاداش عملکرد و بهره‌وری فصلی',
    'سرویس ایاب و ذهاب از میادین اصلی تهران و کرج',
    'وعده غذایی گرم (صبحانه و ناهار سازمانی)',
    'وام و تسهیلات قرض‌الحسنه سازمانی',
    'دوره‌های آموزشی آکادمی سیلانه',
  ];

  const togglePerk = (perk: string) => {
    if (selectedPerks.includes(perk)) {
      setSelectedPerks(selectedPerks.filter((p) => p !== perk));
    } else {
      setSelectedPerks([...selectedPerks, perk]);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setSavedSuccess(false);

    const selectedDept = departments.find((d) => d.id === selectedDeptId);
    const departmentName = selectedDept ? selectedDept.name : 'مارکتینگ و برندها';

    const payload: JobAdGenerationRequest = {
      jobTitle,
      departmentId: selectedDeptId,
      departmentName,
      seniority,
      workType,
      location,
      brandFocus,
      keySkills,
      perks: selectedPerks,
      tone,
    };

    try {
      const res = await fetch('/api/ai/generate-job-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
      showToast('شرح شغل و آگهی با موفقیت تدوین شد.');
    } catch (err) {
      console.error('Job Ad generation error:', err);
      showToast('خطا در برقراری ارتباط با سرویس.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`متن ${label} کپی شد.`);
  };

  const handleSaveAsJob = () => {
    if (!result) return;
    const selectedDept = departments.find((d) => d.id === selectedDeptId);
    const newJob = {
      id: `job-${Date.now()}`,
      title: `${seniority} ${jobTitle}`,
      department: selectedDept ? selectedDept.name : 'دپارتمان هلدینگ سیلانه سبز',
      employmentType: workType,
      location,
      description: result.jobDescriptionMarkdown,
      requirements: keySkills,
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۴/۰۶/۱۸',
      applicationsCount: 0,
      criteria: [
        { id: 'c1', title: 'شایستگی‌های تخصصی نقش', weight: 40 },
        { id: 'c2', title: 'سابقه در صنعت FMCG و بهداشتی', weight: 35 },
        { id: 'c3', title: 'تطابق با فرهنگ سازمانی سیلانه سبز', weight: 25 },
      ],
    };

    if (onJobCreated) {
      onJobCreated(newJob);
      setSavedSuccess(true);
      showToast('موقعیت شغلی با موفقیت ثبت شد.');
      setTimeout(() => setSavedSuccess(false), 3500);
    }
  };

  return (
    <div dir="rtl" className="space-y-4 pb-12 relative">
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed top-16 inset-x-4 max-w-sm mx-auto z-50 p-3 rounded-[12px] bg-brand text-white shadow-xl flex items-center gap-2 animate-fadeIn border border-white/20 text-xs font-bold"
        >
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span className="flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-4 rounded-[18px] bg-gradient-to-r from-brand via-emerald-800 to-teal-900 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-10 -translate-y-10 blur-xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                type="button"
                id="btn-jobad-back"
                onClick={onBack}
                className="min-h-[44px] min-w-[44px] rounded-[10px] bg-white/15 flex items-center justify-center cursor-pointer hover:bg-white/25 active:scale-95 transition-all"
                title="بازگشت"
              >
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <h1 className="text-sm sm:text-base font-black">
                  تدوین آگهی و شرح شغل
                </h1>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                نگارش شرح شغل و متن آگهی بر اساس استانداردهای هلدینگ
              </p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-[12px] bg-white/15 flex items-center justify-center border border-white/20 shrink-0">
            <FileText className="w-5 h-5 text-emerald-200" />
          </div>
        </div>
      </div>

      {/* If No Result Generated Yet: Show Step Wizard */}
      {!result ? (
        <div className="bg-surface-1 rounded-[20px] p-4 sm:p-5 border border-border-default shadow-xs space-y-4">
          {/* Step Wizard Progress Dots */}
          <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-border-default">
            {/* Step 1 Indicator */}
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  currentStep === 1
                    ? 'bg-brand text-white shadow-xs scale-105 ring-2 ring-brand/30'
                    : currentStep > 1
                    ? 'bg-brand-soft text-brand'
                    : 'bg-surface-2 text-text-3'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4" /> : '۱'}
              </div>
              <span
                className={`text-xs font-bold ${
                  currentStep === 1 ? 'text-brand' : 'text-text-3'
                }`}
              >
                شغل و برند
              </span>
            </button>

            {/* Connecting Line 1 */}
            <div
              className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                currentStep >= 2 ? 'bg-brand' : 'bg-border-default'
              }`}
            />

            {/* Step 2 Indicator */}
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  currentStep === 2
                    ? 'bg-brand text-white shadow-xs scale-105 ring-2 ring-brand/30'
                    : currentStep > 2
                    ? 'bg-brand-soft text-brand'
                    : 'bg-surface-2 text-text-3'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4" /> : '۲'}
              </div>
              <span
                className={`text-xs font-bold ${
                  currentStep === 2 ? 'text-brand' : 'text-text-3'
                }`}
              >
                مهارت‌ها
              </span>
            </button>

            {/* Connecting Line 2 */}
            <div
              className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                currentStep === 3 ? 'bg-brand' : 'bg-border-default'
              }`}
            />

            {/* Step 3 Indicator */}
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                  currentStep === 3
                    ? 'bg-brand text-white shadow-xs scale-105 ring-2 ring-brand/30'
                    : 'bg-surface-2 text-text-3'
                }`}
              >
                ۳
              </div>
              <span
                className={`text-xs font-bold ${
                  currentStep === 3 ? 'text-brand' : 'text-text-3'
                }`}
              >
                مزایا و تولید
              </span>
            </button>
          </div>

          {/* Wizard Step 1: Job & Department */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="block text-xs font-black text-text-1 mb-1.5">
                  عنوان شغل:
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 text-xs border border-border-default rounded-[12px] bg-surface-1 text-text-1 focus:ring-2 focus:ring-brand outline-none"
                  placeholder="مثال: سرپرست تولید کارخانه اشتهارد، مدیر برند دافی..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-text-1 mb-1.5">
                    دپارتمان:
                  </label>
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs border border-border-default rounded-[12px] bg-surface-1 text-text-1 focus:ring-2 focus:ring-brand outline-none"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-text-1 mb-1.5">
                    برند مربوطه:
                  </label>
                  <input
                    type="text"
                    value={brandFocus}
                    onChange={(e) => setBrandFocus(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs border border-border-default rounded-[12px] bg-surface-1 text-text-1 focus:ring-2 focus:ring-brand outline-none"
                    placeholder="مثال: دافی، کامان، میس‌ویک..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-text-1 mb-1.5">
                  سطح ارشدیت:
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(['کارآموز', 'کارشناس', 'کارشناس ارشد', 'سرپرست', 'مدیر'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeniority(s)}
                      className={`min-h-[44px] px-2 py-1.5 rounded-[10px] text-xs font-bold border transition-all cursor-pointer select-none ${
                        seniority === s
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-surface-2 text-text-2 border-border-default hover:bg-surface-3'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Wizard Step 2: Requirements & Tone */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-text-1 mb-1.5">
                    نوع همکاری:
                  </label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value as any)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs border border-border-default rounded-[12px] bg-surface-1 text-text-1 focus:ring-2 focus:ring-brand outline-none"
                  >
                    <option value="تمام‌وقت">تمام‌وقت (ستاد)</option>
                    <option value="پاره‌وقت">پاره‌وقت / پروژه‌ای</option>
                    <option value="شیفتی کارخانه">نوبت‌کاری (کارخانجات اشتهارد)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-text-1 mb-1.5">
                    محل خدمت:
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 text-xs border border-border-default rounded-[12px] bg-surface-1 text-text-1 focus:ring-2 focus:ring-brand outline-none"
                    placeholder="تهران یا کارخانجات اشتهارد..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-text-1 mb-1.5">
                  لحن نگارش آگهی:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      'پرانرژی و استارتاپی',
                      'حرفه‌ای و سازمانی',
                      'کاریزماتیک و الهام‌بخش',
                    ] as const
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`min-h-[44px] px-3 py-2 rounded-[10px] text-xs font-bold border text-right transition-all cursor-pointer select-none ${
                        tone === t
                          ? 'bg-brand text-white border-brand shadow-xs'
                          : 'bg-surface-2 text-text-2 border-border-default hover:bg-surface-3'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-text-1 mb-1.5">
                  مهارت‌ها و سوابق مورد نیاز:
                </label>
                <textarea
                  rows={3}
                  value={keySkills}
                  onChange={(e) => setKeySkills(e.target.value)}
                  className="w-full p-3 text-xs border border-border-default rounded-[12px] bg-surface-1 text-text-1 focus:ring-2 focus:ring-brand outline-none leading-relaxed"
                  placeholder="مهارت‌های فنی، سوابق کاری در صنعت FMCG و نرم‌افزارهای مرتبط..."
                />
              </div>
            </div>
          )}

          {/* Wizard Step 3: Perks & Generation */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div>
                <label className="block text-xs font-black text-text-1 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-4 h-4 text-brand" />
                    مزایا و تسهیلات رفاهی:
                  </span>
                  <span className="text-[10px] text-text-3">انتخاب گزینه‌ها</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {perksOptions.map((perk, idx) => {
                    const isSelected = selectedPerks.includes(perk);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => togglePerk(perk)}
                        className={`min-h-[44px] text-xs px-3 py-2 rounded-[12px] border transition-all cursor-pointer select-none flex items-center gap-1.5 active:scale-95 ${
                          isSelected
                            ? 'bg-brand text-white border-brand font-bold shadow-xs'
                            : 'bg-surface-2 text-text-2 border-border-default hover:bg-surface-3'
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <span>+</span>}
                        <span>{perk}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Final Step Generation CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-generate-jobad"
                  onClick={handleGenerate}
                  disabled={isLoading || !jobTitle}
                  className="w-full min-h-[50px] py-3 px-4 rounded-[14px] bg-brand hover:bg-brand-hover text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 select-none"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال تنظیم شرح شغل و آگهی...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>تولید شرح شغل و آگهی</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Wizard Navigation Controls (Bottom Thumb-Zone Friendly) */}
          <div className="flex items-center justify-between pt-3 border-t border-border-default">
            {currentStep > 1 ? (
              <button
                type="button"
                id="btn-wizard-prev"
                onClick={() => setCurrentStep((currentStep - 1) as any)}
                className="min-h-[44px] px-4 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-2 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              >
                <ArrowRight className="w-4 h-4" />
                <span>گام قبلی</span>
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 && (
              <button
                type="button"
                id="btn-wizard-next"
                onClick={() => setCurrentStep((currentStep + 1) as any)}
                className="min-h-[44px] px-5 rounded-[10px] bg-brand hover:bg-brand-hover text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <span>گام بعدی</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* 2. Generated Ad Preview in a Clean Document Card */
        <div
          id="jobad-document-card"
          className="bg-surface-1 rounded-[20px] border border-border-default shadow-lg overflow-hidden animate-fadeIn space-y-0"
        >
          {/* Document Top Bar with Tab Switcher */}
          <div className="p-3 bg-surface-2 border-b border-border-default flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-surface-1 p-1 rounded-[10px] border border-border-default">
              <button
                type="button"
                onClick={() => setActiveTab('ad')}
                className={`min-h-[40px] px-3 rounded-[8px] text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'ad'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                آگهی انتشار
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('jd')}
                className={`min-h-[40px] px-3 rounded-[8px] text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'jd'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                شرح شغل
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('questions')}
                className={`min-h-[40px] px-3 rounded-[8px] text-xs font-black transition-all cursor-pointer ${
                  activeTab === 'questions'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-text-3 hover:text-text-1'
                }`}
              >
                پرسش‌های مصاحبه
              </button>
            </div>

            {/* Restart Button */}
            <button
              type="button"
              onClick={() => {
                setResult(null);
                setCurrentStep(1);
              }}
              className="min-h-[40px] px-3 rounded-[10px] bg-surface-1 hover:bg-surface-3 text-text-2 text-xs font-bold border border-border-default flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              title="تنظیم موقعیت جدید"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>موقعیت جدید</span>
            </button>
          </div>

          {/* Salary Benchmark Banner */}
          <div className="px-4 py-2.5 bg-brand-soft border-b border-brand/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-brand font-bold">
              <Coins className="w-4 h-4 text-brand" />
              <span>حقوق پیشنهادی:</span>
              <span className="font-mono">{result.salaryBenchmarkToman}</span>
            </div>
            <span className="text-[11px] text-text-2 font-medium">
              برند: {result.brandFocus}
            </span>
          </div>

          {/* AI Advisory Note */}
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
            محتوای تولیدشده توسط هوش مصنوعی جنبه پیشنهادی دارد و نیازمند بررسی و تأیید نهایی توسط مدیر مربوطه است.
          </div>

          {/* Document Content View */}
          <div className="p-4 sm:p-5 space-y-3">
            {/* Tab 1: Social Media Recruitment Ad */}
            {activeTab === 'ad' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-text-1">
                    متن آگهی برای انتشار در شبکه‌های اجتماعی و شغلی:
                  </span>
                  <button
                    type="button"
                    id="btn-copy-social-ad"
                    onClick={() => handleCopy(result.recruitmentAdSocial, 'آگهی شبکه‌ها')}
                    className="min-h-[44px] px-3 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-1 text-xs font-bold flex items-center gap-1.5 border border-border-default cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand" />
                    <span>کپی آگهی</span>
                  </button>
                </div>

                <div className="p-4 rounded-[14px] bg-surface-2/60 border border-border-default text-text-1 text-xs leading-relaxed font-sans whitespace-pre-wrap selection:bg-brand/20">
                  {result.recruitmentAdSocial}
                </div>
              </div>
            )}

            {/* Tab 2: Official Job Description Markdown */}
            {activeTab === 'jd' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-text-1">
                    سند شرح شغل سازمانی:
                  </span>
                  <button
                    type="button"
                    id="btn-copy-jd"
                    onClick={() => handleCopy(result.jobDescriptionMarkdown, 'شرح شغل')}
                    className="min-h-[44px] px-3 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-1 text-xs font-bold flex items-center gap-1.5 border border-border-default cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand" />
                    <span>کپی متن</span>
                  </button>
                </div>

                <div className="p-4 rounded-[14px] bg-surface-2/60 border border-border-default text-text-1 text-xs leading-relaxed whitespace-pre-wrap">
                  {result.jobDescriptionMarkdown}
                </div>
              </div>
            )}

            {/* Tab 3: STAR Interview Questions */}
            {activeTab === 'questions' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-text-1">
                    پرسش‌های مصاحبه تخصصی و رفتاری (روش STAR):
                  </span>
                  <button
                    type="button"
                    id="btn-copy-questions"
                    onClick={() =>
                      handleCopy(result.interviewQuestions.join('\n\n'), 'سوالات مصاحبه')
                    }
                    className="min-h-[44px] px-3 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-1 text-xs font-bold flex items-center gap-1.5 border border-border-default cursor-pointer transition-all active:scale-95 shadow-2xs"
                  >
                    <Copy className="w-3.5 h-3.5 text-brand" />
                    <span>کپی سوالات</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {result.interviewQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[12px] bg-surface-2/70 border border-border-default flex items-start gap-2.5 text-xs text-text-1 leading-relaxed"
                    >
                      <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="flex-1">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions in Document Card: Save to Open Positions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                id="btn-save-as-job"
                onClick={handleSaveAsJob}
                className="flex-1 min-h-[48px] px-4 rounded-[12px] bg-brand hover:bg-brand-hover text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-xs"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>موقعیت شغلی ثبت شد</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-4 h-4" />
                    <span>ثبت در فرصت‌های شغلی</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
