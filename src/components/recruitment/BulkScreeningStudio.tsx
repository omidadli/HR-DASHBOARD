import React, { useState, useMemo } from 'react';
import { Candidate, CandidateCategory, CandidateStage, JobPosting } from '../../types';
import { toPersianDigits, nowJalaliString } from '../../utils/jalali';
import {
  Sparkles,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Award,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  PhoneCall,
  UserCheck,
  UserX,
  FileText,
  Quote,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Layers,
  Copy,
  Check,
  Info,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  Share2,
  SlidersHorizontal,
  Mail,
  Plus,
  RefreshCw,
  X,
  Printer,
  ChevronDown,
} from 'lucide-react';

interface BulkScreeningStudioProps {
  job: JobPosting;
  candidates: Candidate[];
  onClose?: () => void;
  onUpdateCandidateStage: (candidateId: string, nextStage: CandidateStage) => Promise<void> | void;
  onToggleTalentPool: (candidateId: string, inPool: boolean) => Promise<void> | void;
  onUploadMore?: () => void;
  onDraftEmail?: (candidate: Candidate, type: 'INVITATION' | 'REJECTION') => void;
  aiAvailable?: boolean;
  batchTimestamp?: string;
  skippedFiles?: Array<{ name: string; reason: string }>;
}

export const STAGE_LABELS: Record<CandidateStage, string> = {
  [CandidateStage.INITIAL_SCREENING]: 'بررسی اولیه',
  [CandidateStage.PHONE_INTERVIEW]: 'مصاحبه تلفنی',
  [CandidateStage.IN_PERSON_INTERVIEW]: 'مصاحبه حضوری',
  [CandidateStage.OFFER]: 'پیشنهاد همکاری',
  [CandidateStage.HIRED]: 'استخدام شده',
  [CandidateStage.REJECTED]: 'رد شده',
};

const STAGE_TRANSITIONS: Record<CandidateStage, CandidateStage[]> = {
  [CandidateStage.INITIAL_SCREENING]: [CandidateStage.PHONE_INTERVIEW, CandidateStage.IN_PERSON_INTERVIEW, CandidateStage.REJECTED],
  [CandidateStage.PHONE_INTERVIEW]: [CandidateStage.IN_PERSON_INTERVIEW, CandidateStage.OFFER, CandidateStage.REJECTED],
  [CandidateStage.IN_PERSON_INTERVIEW]: [CandidateStage.OFFER, CandidateStage.REJECTED],
  [CandidateStage.OFFER]: [CandidateStage.HIRED, CandidateStage.REJECTED],
  [CandidateStage.HIRED]: [],
  [CandidateStage.REJECTED]: [CandidateStage.INITIAL_SCREENING],
};

export const BulkScreeningStudio: React.FC<BulkScreeningStudioProps> = ({
  job,
  candidates,
  onClose,
  onUpdateCandidateStage,
  onToggleTalentPool,
  onUploadMore,
  onDraftEmail,
  aiAvailable = true,
  batchTimestamp = nowJalaliString(),
  skippedFiles = [],
}) => {
  // Active Filter Tab: 'ALL' | 'PRIORITY' | 'REVIEW' | 'REJECTED' | 'TALENT_POOL'
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PRIORITY' | 'REVIEW' | 'REJECTED' | 'TALENT_POOL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'SCORE_ASC' | 'NAME_ASC'>('SCORE_DESC');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);

  // Selection for Batch Actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [isPerformingBatchAction, setIsPerformingBatchAction] = useState(false);
  const [batchActionFeedback, setBatchActionFeedback] = useState<string | null>(null);

  // Selected Candidate for Detailed Scorecard Dossier Drawer
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null);
  const [copiedResumeText, setCopiedResumeText] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState<'SCORECARD' | 'RESUME_TEXT' | 'NOTES'>('SCORECARD');

  // Operational States for Stage Transitions
  const [transitionLoadingId, setTransitionLoadingId] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<{ id: string; message: string } | null>(null);

  // Filter candidates specifically for this job (or all passed in if already scoped)
  const jobCandidates = useMemo(() => {
    return candidates.filter((c) => !c.jobId || c.jobId === job.id);
  }, [candidates, job.id]);

  // Executive KPI Statistics
  const stats = useMemo(() => {
    const total = jobCandidates.length;
    const priority = jobCandidates.filter((c) => c.category === CandidateCategory.INTERVIEW_PRIORITY).length;
    const review = jobCandidates.filter((c) => c.category === CandidateCategory.NEEDS_REVIEW).length;
    const rejected = jobCandidates.filter((c) => c.category === CandidateCategory.INITIAL_REJECTION).length;
    const talentPool = jobCandidates.filter((c) => c.inTalentPool).length;

    const scoredCandidates = jobCandidates.filter((c) => typeof c.overallScore === 'number');
    const avgScore = scoredCandidates.length > 0
      ? (scoredCandidates.reduce((acc, c) => acc + (c.overallScore || 0), 0) / scoredCandidates.length).toFixed(1)
      : '۰.۰';

    const priorityPercent = total > 0 ? Math.round((priority / total) * 100) : 0;
    const reviewPercent = total > 0 ? Math.round((review / total) * 100) : 0;
    const rejectedPercent = total > 0 ? Math.round((rejected / total) * 100) : 0;

    return {
      total,
      priority,
      priorityPercent,
      review,
      reviewPercent,
      rejected,
      rejectedPercent,
      talentPool,
      avgScore,
    };
  }, [jobCandidates]);

  // Filtered and Sorted Candidates List
  const displayCandidates = useMemo(() => {
    return jobCandidates
      .filter((c) => {
        // Tab filter
        if (activeFilter === 'PRIORITY' && c.category !== CandidateCategory.INTERVIEW_PRIORITY) return false;
        if (activeFilter === 'REVIEW' && c.category !== CandidateCategory.NEEDS_REVIEW) return false;
        if (activeFilter === 'REJECTED' && c.category !== CandidateCategory.INITIAL_REJECTION) return false;
        if (activeFilter === 'TALENT_POOL' && !c.inTalentPool) return false;

        // Min score filter
        if (minScoreFilter > 0 && (c.overallScore || 0) < minScoreFilter) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchName = c.fullName.toLowerCase().includes(q);
          const matchFile = c.resumeFileName?.toLowerCase().includes(q);
          const matchQuotes = c.resumeQuotes?.some((quote) => quote.toLowerCase().includes(q));
          const matchStrength = c.strengths?.some((s) => s.toLowerCase().includes(q));
          if (!matchName && !matchFile && !matchQuotes && !matchStrength) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'SCORE_DESC') {
          return (b.overallScore || 0) - (a.overallScore || 0);
        }
        if (sortBy === 'SCORE_ASC') {
          return (a.overallScore || 0) - (b.overallScore || 0);
        }
        if (sortBy === 'NAME_ASC') {
          return a.fullName.localeCompare(b.fullName, 'fa');
        }
        return 0;
      });
  }, [jobCandidates, activeFilter, minScoreFilter, searchQuery, sortBy]);

  // Selection handlers
  const handleSelectAllInView = () => {
    if (selectedCandidateIds.length === displayCandidates.length) {
      setSelectedCandidateIds([]);
    } else {
      setSelectedCandidateIds(displayCandidates.map((c) => c.id));
    }
  };

  const handleToggleSelectCandidate = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single Candidate Stage Transition with Legal Checking & Optimistic Feedback
  const handleTransitionCandidate = async (candidateId: string, nextStage: CandidateStage) => {
    setTransitionLoadingId(candidateId);
    setTransitionError(null);
    try {
      await onUpdateCandidateStage(candidateId, nextStage);
      if (selectedCandidateForDetails?.id === candidateId) {
        setSelectedCandidateForDetails((prev) => prev ? { ...prev, stage: nextStage } : null);
      }
    } catch (err: any) {
      console.error('Stage transition error:', err);
      setTransitionError({
        id: candidateId,
        message: err?.message || 'خطا در تغییر مرحله کارجو. انتقال انتخابی ممکن است طبق ضوابط مجاز نباشد.',
      });
    } finally {
      setTransitionLoadingId(null);
    }
  };

  // Batch Transition to Phone Interview
  const handleBatchPromoteToPhoneInterview = async () => {
    if (selectedCandidateIds.length === 0) return;
    const confirmMove = confirm(
      `آیا از انتقال گروهی ${toPersianDigits(selectedCandidateIds.length)} کارجو به مرحله «مصاحبه تلفنی» اطمینان دارید؟`
    );
    if (!confirmMove) return;

    setIsPerformingBatchAction(true);
    setBatchActionFeedback(null);
    let successCount = 0;
    let failCount = 0;

    for (const candId of selectedCandidateIds) {
      const cand = jobCandidates.find((c) => c.id === candId);
      if (!cand) continue;
      // Check legal transition
      const allowed = STAGE_TRANSITIONS[cand.stage] || [];
      if (!allowed.includes(CandidateStage.PHONE_INTERVIEW)) {
        failCount += 1;
        continue;
      }
      try {
        await onUpdateCandidateStage(candId, CandidateStage.PHONE_INTERVIEW);
        successCount += 1;
      } catch (err) {
        failCount += 1;
      }
    }

    setIsPerformingBatchAction(false);
    setSelectedCandidateIds([]);
    setBatchActionFeedback(
      `انتقال انجام شد: ${toPersianDigits(successCount)} کارجو به مصاحبه تلفنی منتقل شدند` +
        (failCount > 0 ? ` (${toPersianDigits(failCount)} کارجو قابل انتقال نبودند)` : '')
    );
  };

  // Batch Add to Talent Pool
  const handleBatchAddToTalentPool = async () => {
    if (selectedCandidateIds.length === 0) return;
    setIsPerformingBatchAction(true);
    setBatchActionFeedback(null);
    let count = 0;

    for (const candId of selectedCandidateIds) {
      try {
        await onToggleTalentPool(candId, true);
        count += 1;
      } catch (err) {
        console.error(err);
      }
    }

    setIsPerformingBatchAction(false);
    setSelectedCandidateIds([]);
    setBatchActionFeedback(`${toPersianDigits(count)} کارجو به بانک استعدادها اضافه شدند.`);
  };

  // Export CSV Report with UTF-8 BOM
  const handleExportCSV = () => {
    const headers = [
      'نام و نام خانوادگی',
      'عنوان موقعیت شغلی',
      'امتیاز کلی (از ۱۰)',
      'پیشنهاد ارزیابی',
      'مرحله فعلی',
      'بانک استعداد',
      'نقاط قوت',
      'نقل قول رزومه',
      'نام فایل رزومه',
    ];

    const rows = displayCandidates.map((c) => {
      const categoryText =
        c.category === CandidateCategory.INTERVIEW_PRIORITY
          ? 'اولویت مصاحبه'
          : c.category === CandidateCategory.NEEDS_REVIEW
          ? 'نیازمند بررسی'
          : 'رد اولیه';

      const stageText = STAGE_LABELS[c.stage] || c.stage;
      const strengths = (c.strengths || []).join(' | ');
      const quote = (c.resumeQuotes || []).join(' | ');

      return [
        `"${c.fullName.replace(/"/g, '""')}"`,
        `"${(c.jobTitle || job.title).replace(/"/g, '""')}"`,
        `"${c.overallScore !== undefined ? c.overallScore : ''}"`,
        `"${categoryText}"`,
        `"${stageText}"`,
        `"${c.inTalentPool ? 'بله' : 'خیر'}"`,
        `"${strengths.replace(/"/g, '""')}"`,
        `"${quote.replace(/"/g, '""')}"`,
        `"${(c.resumeFileName || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bulk_Screening_${job.title.replace(/\s+/g, '_')}_${nowJalaliString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy extracted text
  const handleCopyResumeText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedResumeText(true);
    setTimeout(() => setCopiedResumeText(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* ── Studio Top Header Bar ────────────────────────────────────────── */}
      <div className="bg-surface-1 p-4 sm:p-5 rounded-[16px] border border-border-default shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-extrabold bg-brand-soft text-brand px-2.5 py-0.5 rounded-md border border-brand/20 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>غربالگری رزومه‌ها</span>
              </span>
              <span className="text-xs text-text-3 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاریخ ارزیابی: {toPersianDigits(batchTimestamp)}</span>
              </span>
              {/* AI Engine Indicator */}
              {aiAvailable ? (
                <span className="text-[11px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2.5 py-0.5 rounded-md border border-purple-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                  <span>ارزیابی هوشمند (Gemini)</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-slate-500/10 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-md border border-slate-500/20 flex items-center gap-1">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  <span>ارزیابی محلی</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <h1 className="text-xl sm:text-2xl font-black text-text-1 flex items-center gap-2">
                <span>نتایج غربالگری: {job.title}</span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-text-3">
              <span className="flex items-center gap-1 font-medium text-text-2">
                <Building2 className="w-3.5 h-3.5 text-brand" />
                <span>{job.department}</span>
              </span>
              <span>•</span>
              <span>محل خدمت: {job.location}</span>
              <span>•</span>
              <span>نوع همکاری: {job.employmentType}</span>
              <span>•</span>
              <span className="text-brand font-bold">
                {toPersianDigits(stats.total)} کارجو در این ردیف شغلی
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onUploadMore && (
              <button
                type="button"
                onClick={onUploadMore}
                className="px-3.5 py-2 bg-brand text-white hover:bg-brand-hover rounded-[10px] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>بارگذاری رزومه‌های جدید</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 bg-surface-2 hover:bg-surface-0 text-text-1 border border-border-default rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="دریافت فایل اکسل و CSV گزارش ارزیابی"
            >
              <Download className="w-3.5 h-3.5 text-text-3" />
              <span>دریافت فایل خروجی</span>
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-text-3 hover:text-text-1 hover:bg-surface-2 rounded-[10px] transition-colors cursor-pointer"
                title="بستن استودیو و بازگشت"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* ── Strict Policy Disclaimer Banner: Categories are Recommendations ── */}
        <div className="mt-3.5 bg-amber-500/10 border border-amber-500/25 rounded-[12px] p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold">دسته‌بندی‌ها جنبه پیشنهادی دارند:</strong>{' '}
            وضعیت استخدامی کارجویان تغییر نکرده و تصمیم‌گیری برای انتقال به مصاحبه یا رد بر عهده شماست.
          </div>
        </div>

        {/* Skipped Unreadable Files Notice (if any) */}
        {skippedFiles.length > 0 && (
          <div className="mt-2.5 bg-rose-500/10 border border-rose-500/25 rounded-[12px] p-3 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5">
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">
                {toPersianDigits(skippedFiles.length)} فایل بدون متن خوانا کنار گذاشته شدند:
              </strong>{' '}
              رزومه‌هایی با اسکن تصویری یا متون مخدوش در ارزیابی وارد نشدند تا از تولید داده‌های فاقد استناد جلوگیری شود.
            </div>
          </div>
        )}
      </div>

      {/* ── Executive KPI Metric Cards (Phase 2) ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Processed */}
        <div
          onClick={() => setActiveFilter('ALL')}
          className={`p-3.5 rounded-[14px] border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'ALL'
              ? 'bg-brand-soft/40 border-brand ring-2 ring-brand/20'
              : 'bg-surface-1 border-border-default hover:border-brand/40'
          }`}
        >
          <div className="text-[11px] text-text-3 font-semibold mb-1">کل رزومه‌ها</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-text-1">{toPersianDigits(stats.total)}</span>
            <span className="text-[10px] bg-brand-soft text-brand font-bold px-1.5 py-0.5 rounded">
              ۱۰۰٪
            </span>
          </div>
          <div className="text-[10px] text-text-3 mt-1 truncate">رزومه‌های دریافتی</div>
        </div>

        {/* Card 2: Interview Priority (اولویت مصاحبه) */}
        <div
          onClick={() => setActiveFilter('PRIORITY')}
          className={`p-3.5 rounded-[14px] border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'PRIORITY'
              ? 'bg-success-soft/60 border-success ring-2 ring-success/20'
              : 'bg-surface-1 border-border-default hover:border-success/40'
          }`}
        >
          <div className="text-[11px] text-success font-bold mb-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>اولویت مصاحبه</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-success">{toPersianDigits(stats.priority)}</span>
            <span className="text-[10px] bg-success-soft text-success font-bold px-1.5 py-0.5 rounded">
              {toPersianDigits(stats.priorityPercent)}٪
            </span>
          </div>
          <div className="text-[10px] text-text-3 mt-1 truncate">نمره بالای ۷</div>
        </div>

        {/* Card 3: Needs Review (نیازمند بررسی) */}
        <div
          onClick={() => setActiveFilter('REVIEW')}
          className={`p-3.5 rounded-[14px] border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'REVIEW'
              ? 'bg-warning-soft/60 border-warning ring-2 ring-warning/20'
              : 'bg-surface-1 border-border-default hover:border-warning/40'
          }`}
        >
          <div className="text-[11px] text-warning font-bold mb-1 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>نیازمند بررسی</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-warning">{toPersianDigits(stats.review)}</span>
            <span className="text-[10px] bg-warning-soft text-warning font-bold px-1.5 py-0.5 rounded">
              {toPersianDigits(stats.reviewPercent)}٪
            </span>
          </div>
          <div className="text-[10px] text-text-3 mt-1 truncate">نمره ۵ تا ۷</div>
        </div>

        {/* Card 4: Initial Rejection (رد اولیه) */}
        <div
          onClick={() => setActiveFilter('REJECTED')}
          className={`p-3.5 rounded-[14px] border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'REJECTED'
              ? 'bg-danger-soft/60 border-danger ring-2 ring-danger/20'
              : 'bg-surface-1 border-border-default hover:border-danger/40'
          }`}
        >
          <div className="text-[11px] text-danger font-bold mb-1 flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            <span>رد اولیه</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-danger">{toPersianDigits(stats.rejected)}</span>
            <span className="text-[10px] bg-danger-soft text-danger font-bold px-1.5 py-0.5 rounded">
              {toPersianDigits(stats.rejectedPercent)}٪
            </span>
          </div>
          <div className="text-[10px] text-text-3 mt-1 truncate">نمره زیر ۵</div>
        </div>

        {/* Card 5: Talent Pool (بانک استعدادها) */}
        <div
          onClick={() => setActiveFilter('TALENT_POOL')}
          className={`p-3.5 rounded-[14px] border transition-all cursor-pointer shadow-2xs ${
            activeFilter === 'TALENT_POOL'
              ? 'bg-purple-500/15 border-purple-500 ring-2 ring-purple-500/20'
              : 'bg-surface-1 border-border-default hover:border-purple-500/40'
          }`}
        >
          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-bold mb-1 flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>بانک استعدادها</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-purple-700 dark:text-purple-300">
              {toPersianDigits(stats.talentPool)}
            </span>
            <span className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
              ذخیره
            </span>
          </div>
          <div className="text-[10px] text-text-3 mt-1 truncate">مناسب همکاری‌های آتی</div>
        </div>

        {/* Card 6: Average Score */}
        <div className="p-3.5 rounded-[14px] border border-border-default bg-surface-1 shadow-2xs">
          <div className="text-[11px] text-text-3 font-semibold mb-1">میانگین امتیاز کل</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-black text-brand">{toPersianDigits(stats.avgScore)}</span>
            <span className="text-[10px] text-text-3 font-medium">از ۱۰.۰</span>
          </div>
          <div className="text-[10px] text-text-3 mt-1 truncate">بر اساس شاخص‌های شغل</div>
        </div>
      </div>

      {/* ── Toolbar: Interactive Filters, Search, Sort & Batch Actions ─────── */}
      <div className="bg-surface-1 p-3.5 rounded-[14px] border border-border-default shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'bg-surface-2 text-text-2 hover:bg-surface-0'
              }`}
            >
              همه ({toPersianDigits(stats.total)})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('PRIORITY')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeFilter === 'PRIORITY'
                  ? 'bg-success text-white shadow-2xs'
                  : 'bg-success-soft text-success hover:bg-success/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>اولویت مصاحبه ({toPersianDigits(stats.priority)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('REVIEW')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeFilter === 'REVIEW'
                  ? 'bg-warning text-white shadow-2xs'
                  : 'bg-warning-soft text-warning hover:bg-warning/20'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>نیازمند بررسی ({toPersianDigits(stats.review)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('REJECTED')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeFilter === 'REJECTED'
                  ? 'bg-danger text-white shadow-2xs'
                  : 'bg-danger-soft text-danger hover:bg-danger/20'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>رد اولیه ({toPersianDigits(stats.rejected)})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('TALENT_POOL')}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                activeFilter === 'TALENT_POOL'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>بانک استعدادها ({toPersianDigits(stats.talentPool)})</span>
            </button>
          </div>

          {/* Search Input & Sort Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-text-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام کارجو، مهارت یا سوابق..."
                className="w-full bg-surface-2 border border-border-default rounded-[8px] pr-8 pl-7 py-1.5 text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-surface-2 px-2.5 py-1.5 rounded-[8px] border border-border-default text-xs text-text-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-3" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-text-1 font-medium focus:outline-none cursor-pointer"
              >
                <option value="SCORE_DESC">بالاترین امتیاز</option>
                <option value="SCORE_ASC">پایین‌ترین امتیاز</option>
                <option value="NAME_ASC">نام کارجو (الفبایی)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch Actions Bar (Visible when candidates are selected) */}
        {selectedCandidateIds.length > 0 && (
          <div className="bg-brand-soft/50 border border-brand/30 p-2.5 rounded-[10px] flex flex-wrap items-center justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-brand">
              <CheckCircle2 className="w-4 h-4" />
              <span>{toPersianDigits(selectedCandidateIds.length)} کارجو انتخاب شده‌اند</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPerformingBatchAction}
                onClick={handleBatchPromoteToPhoneInterview}
                className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>انتقال گروهی به مصاحبه تلفنی</span>
              </button>

              <button
                type="button"
                disabled={isPerformingBatchAction}
                onClick={handleBatchAddToTalentPool}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Award className="w-3.5 h-3.5" />
                <span>افزودن به بانک استعدادها</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCandidateIds([])}
                className="px-2.5 py-1.5 text-xs text-text-3 hover:text-text-1 rounded-[8px]"
              >
                لغو انتخاب
              </button>
            </div>
          </div>
        )}

        {/* Batch Action Toast Feedback */}
        {batchActionFeedback && (
          <div className="bg-success-soft border border-success/30 text-success p-2.5 rounded-[8px] text-xs font-bold flex items-center justify-between animate-in fade-in">
            <span>{batchActionFeedback}</span>
            <button
              type="button"
              onClick={() => setBatchActionFeedback(null)}
              className="text-success hover:underline text-[11px]"
            >
              بستن
            </button>
          </div>
        )}

        {/* Transition Error Alert */}
        {transitionError && (
          <div className="bg-danger-soft border border-danger/30 text-danger p-2.5 rounded-[8px] text-xs font-bold flex items-center justify-between animate-in fade-in">
            <span>{transitionError.message}</span>
            <button
              type="button"
              onClick={() => setTransitionError(null)}
              className="text-danger hover:underline text-[11px]"
            >
              متوجه شدم
            </button>
          </div>
        )}
      </div>

      {/* ── Candidates Screening Grid (Phase 3 & 4) ───────────────────────── */}
      <div className="space-y-3">
        {/* Table/List Header with "Select All" Checkbox */}
        <div className="flex items-center justify-between px-2 text-xs text-text-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="select-all-candidates"
              checked={
                displayCandidates.length > 0 &&
                selectedCandidateIds.length === displayCandidates.length
              }
              onChange={handleSelectAllInView}
              className="w-4 h-4 rounded text-brand border-border-default focus:ring-brand cursor-pointer"
            />
            <label htmlFor="select-all-candidates" className="font-semibold text-text-2 cursor-pointer">
              انتخاب همه ({toPersianDigits(displayCandidates.length)} کارجو)
            </label>
          </div>
          <span className="text-[11px]">
            با انتخاب هر کارت، جزئیات ارزیابی و متن رزومه نمایش داده می‌شود.
          </span>
        </div>

        {displayCandidates.length === 0 ? (
          <div className="bg-surface-1 rounded-[16px] border border-border-default p-12 text-center space-y-3 shadow-2xs">
            <FileText className="w-10 h-10 text-text-3 mx-auto" />
            <div className="text-sm font-bold text-text-1">کارجویی با فیلترهای انتخابی یافت نشد</div>
            <p className="text-xs text-text-3 max-w-sm mx-auto">
              می‌توانید فیلترهای دسته‌بندی را تغییر دهید یا عبارت جستجو را پاک کنید.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('ALL');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-surface-2 hover:bg-surface-0 text-text-1 text-xs font-bold rounded-[8px] border border-border-default cursor-pointer"
            >
              نمایش همه کارجویان
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {displayCandidates.map((candidate) => {
              const score = candidate.overallScore ?? 0;
              const isPriority = candidate.category === CandidateCategory.INTERVIEW_PRIORITY;
              const isReview = candidate.category === CandidateCategory.NEEDS_REVIEW;
              const isRejected = candidate.category === CandidateCategory.INITIAL_REJECTION;
              const isSelected = selectedCandidateIds.includes(candidate.id);
              const isLoadingTransition = transitionLoadingId === candidate.id;

              // Color classes based on score & category
              const borderClass = isPriority
                ? 'border-success/40 hover:border-success'
                : isReview
                ? 'border-warning/40 hover:border-warning'
                : 'border-danger/30 hover:border-danger';

              const scoreBgClass =
                score >= 7.0
                  ? 'bg-success text-white'
                  : score >= 5.0
                  ? 'bg-warning text-white'
                  : 'bg-danger text-white';

              return (
                <div
                  key={candidate.id}
                  className={`bg-surface-1 rounded-[14px] border ${borderClass} p-4 transition-all shadow-2xs flex flex-col justify-between space-y-3 relative ${
                    isSelected ? 'ring-2 ring-brand/30 bg-brand-soft/10' : ''
                  }`}
                >
                  {/* Card Header: Checkbox + Name + Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectCandidate(candidate.id)}
                          className="w-4 h-4 rounded text-brand border-border-default focus:ring-brand mt-1 cursor-pointer shrink-0"
                          aria-label={`انتخاب ${candidate.fullName}`}
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              onClick={() => setSelectedCandidateForDetails(candidate)}
                              className="text-sm font-extrabold text-text-1 hover:text-brand cursor-pointer truncate"
                            >
                              {candidate.fullName}
                            </h3>

                            {/* Recommendation Category Badge */}
                            {isPriority && (
                              <span className="text-[10px] font-bold bg-success-soft text-success px-2 py-0.5 rounded-md border border-success/20 flex items-center gap-1 shrink-0">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>پیشنهاد: اولویت مصاحبه</span>
                              </span>
                            )}
                            {isReview && (
                              <span className="text-[10px] font-bold bg-warning-soft text-warning px-2 py-0.5 rounded-md border border-warning/20 flex items-center gap-1 shrink-0">
                                <AlertTriangle className="w-3 h-3" />
                                <span>پیشنهاد: نیازمند بررسی</span>
                              </span>
                            )}
                            {isRejected && (
                              <span className="text-[10px] font-bold bg-danger-soft text-danger px-2 py-0.5 rounded-md border border-danger/20 flex items-center gap-1 shrink-0">
                                <XCircle className="w-3 h-3" />
                                <span>پیشنهاد: رد اولیه</span>
                              </span>
                            )}

                            {/* Current Real Stage Badge */}
                            <span className="text-[10px] font-medium bg-surface-2 text-text-2 px-2 py-0.5 rounded-md border border-border-default shrink-0">
                              مرحله فعلی: {STAGE_LABELS[candidate.stage] || candidate.stage}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-text-3 mt-1 truncate">
                            <span className="truncate">{candidate.resumeFileName || 'رزومه بدون عنوان'}</span>
                            {candidate.appliedAtJalali && (
                              <>
                                <span>•</span>
                                <span>{toPersianDigits(candidate.appliedAtJalali)}</span>
                              </>
                            )}
                            {candidate.inTalentPool && (
                              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                                در بانک استعدادها
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Overall Score Badge */}
                      <div className="text-left shrink-0">
                        <div
                          className={`px-2.5 py-1 rounded-[8px] text-xs font-black shadow-2xs ${scoreBgClass} flex items-center gap-1`}
                        >
                          <span>{toPersianDigits(score.toFixed(1))}</span>
                          <span className="text-[9px] opacity-80">/ ۱۰</span>
                        </div>
                        <div className="text-[9px] text-text-3 text-center mt-0.5">امتیاز کل</div>
                      </div>
                    </div>

                    {/* Criteria Mini Scores (Phase 3) */}
                    {candidate.criteriaScores && Object.keys(candidate.criteriaScores).length > 0 && (
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-surface-2/60 p-2 rounded-[10px] border border-border-default/60">
                        {Object.entries(candidate.criteriaScores).slice(0, 3).map(([title, val]) => (
                          <div key={title} className="text-[10px]">
                            <div className="text-text-3 truncate font-medium">{title}</div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-full bg-surface-0 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    val >= 7 ? 'bg-success' : val >= 5 ? 'bg-warning' : 'bg-danger'
                                  }`}
                                  style={{ width: `${Math.min(100, val * 10)}%` }}
                                />
                              </div>
                              <span className="font-bold text-text-1 text-[10px]">
                                {toPersianDigits(val)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Verbatim Resume Quote (Strictly zero hallucination) */}
                    {candidate.resumeQuotes && candidate.resumeQuotes.length > 0 && (
                      <div className="mt-2.5 bg-brand-soft/20 border-r-2 border-brand pr-2 py-1 text-[11px] text-text-2 italic flex items-start gap-1.5">
                        <Quote className="w-3 h-3 text-brand shrink-0 mt-0.5" />
                        <span className="line-clamp-2">«{candidate.resumeQuotes[0]}»</span>
                      </div>
                    )}

                    {/* Strengths Chips */}
                    {candidate.strengths && candidate.strengths.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {candidate.strengths.slice(0, 3).map((st, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-success-soft text-success font-medium px-2 py-0.5 rounded-full border border-success/20 flex items-center gap-0.5"
                          >
                            <Check className="w-2.5 h-2.5" />
                            <span>{st}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Quick Actions Bar (Phase 4) */}
                  <div className="pt-2.5 border-t border-border-default flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {/* Detailed Scorecard Dossier Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedCandidateForDetails(candidate)}
                        className="px-2.5 py-1 text-[11px] font-bold text-brand hover:bg-brand-soft rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>مشاهده جزئیات رزومه</span>
                      </button>

                      {/* Talent Pool Toggle */}
                      <button
                        type="button"
                        onClick={() => onToggleTalentPool(candidate.id, !candidate.inTalentPool)}
                        className={`p-1.5 rounded-[6px] text-xs transition-colors cursor-pointer ${
                          candidate.inTalentPool
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'text-text-3 hover:text-purple-600 hover:bg-purple-500/10'
                        }`}
                        title={candidate.inTalentPool ? 'حذف از بانک استعدادها' : 'افزودن به بانک استعدادها'}
                      >
                        <Award className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Single-Click Legal Stage Transitions */}
                    <div className="flex items-center gap-1.5">
                      {/* If in INITIAL_SCREENING, allow advancing to PHONE_INTERVIEW */}
                      {candidate.stage === CandidateStage.INITIAL_SCREENING && (
                        <button
                          type="button"
                          disabled={isLoadingTransition}
                          onClick={() => handleTransitionCandidate(candidate.id, CandidateStage.PHONE_INTERVIEW)}
                          className="px-2.5 py-1 bg-brand hover:bg-brand-hover text-white rounded-[6px] text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>مصاحبه تلفنی</span>
                        </button>
                      )}

                      {/* If in PHONE_INTERVIEW, allow advancing to IN_PERSON_INTERVIEW */}
                      {candidate.stage === CandidateStage.PHONE_INTERVIEW && (
                        <button
                          type="button"
                          disabled={isLoadingTransition}
                          onClick={() => handleTransitionCandidate(candidate.id, CandidateStage.IN_PERSON_INTERVIEW)}
                          className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-[6px] text-[11px] font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>مصاحبه حضوری</span>
                        </button>
                      )}

                      {/* Reject button (if not already rejected or hired) */}
                      {candidate.stage !== CandidateStage.REJECTED && candidate.stage !== CandidateStage.HIRED && (
                        <button
                          type="button"
                          disabled={isLoadingTransition}
                          onClick={() => handleTransitionCandidate(candidate.id, CandidateStage.REJECTED)}
                          className="px-2 py-1 text-[11px] text-danger hover:bg-danger-soft rounded-[6px] font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="رد کارجو در فرآیند استخدام"
                        >
                          <UserX className="w-3 h-3" />
                          <span>رد</span>
                        </button>
                      )}

                      {/* Re-activate button if rejected */}
                      {candidate.stage === CandidateStage.REJECTED && (
                        <button
                          type="button"
                          disabled={isLoadingTransition}
                          onClick={() => handleTransitionCandidate(candidate.id, CandidateStage.INITIAL_SCREENING)}
                          className="px-2.5 py-1 bg-surface-2 hover:bg-surface-0 text-text-1 rounded-[6px] text-[11px] font-medium border border-border-default transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className="w-3 h-3 text-text-3" />
                          <span>بررسی مجدد</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Candidate Detailed Scorecard Dossier Modal / Drawer (Phase 5) ─── */}
      {selectedCandidateForDetails && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
        >
          <div className="bg-surface-1 rounded-[16px] max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-border-default my-auto max-h-[95vh] flex flex-col animate-in fade-in zoom-in-95">
            {/* Dossier Header */}
            <div className="flex items-start justify-between pb-3 border-b border-border-default shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-[14px] flex items-center justify-center font-black text-lg shadow-2xs ${
                    (selectedCandidateForDetails.overallScore ?? 0) >= 7
                      ? 'bg-success-soft text-success border border-success/30'
                      : (selectedCandidateForDetails.overallScore ?? 0) >= 5
                      ? 'bg-warning-soft text-warning border border-warning/30'
                      : 'bg-danger-soft text-danger border border-danger/30'
                  }`}
                >
                  {toPersianDigits((selectedCandidateForDetails.overallScore ?? 0).toFixed(1))}
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-text-1 flex items-center gap-2">
                    <span>ارزیابی شایستگی: {selectedCandidateForDetails.fullName}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-text-3 mt-0.5">
                    <span>ردیف شغلی: {selectedCandidateForDetails.jobTitle || job.title}</span>
                    <span>•</span>
                    <span>فایل: {selectedCandidateForDetails.resumeFileName}</span>
                    <span>•</span>
                    <span className="text-brand font-bold">
                      وضعیت: {STAGE_LABELS[selectedCandidateForDetails.stage] || selectedCandidateForDetails.stage}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCandidateForDetails(null)}
                className="text-text-3 hover:text-text-1 p-1 rounded-md"
                aria-label="بستن کارنامه"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Tabs: Scorecard, Extracted Resume Text, Evaluation Notes */}
            <div className="flex items-center gap-2 pt-3 border-b border-border-default shrink-0">
              <button
                type="button"
                onClick={() => setActiveDossierTab('SCORECARD')}
                className={`px-3.5 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDossierTab === 'SCORECARD'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-2 hover:text-text-1'
                }`}
              >
                شاخص‌ها و امتیازها
              </button>

              <button
                type="button"
                onClick={() => setActiveDossierTab('RESUME_TEXT')}
                className={`px-3.5 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  activeDossierTab === 'RESUME_TEXT'
                    ? 'border-brand text-brand'
                    : 'border-transparent text-text-2 hover:text-text-1'
                }`}
              >
                متن استخراج‌شده رزومه
              </button>
            </div>

            {/* Dossier Body (Scrollable) */}
            <div className="mt-3.5 overflow-y-auto space-y-4 pr-1 flex-1 text-xs">
              {activeDossierTab === 'SCORECARD' && (
                <>
                  {/* Executive Summary Narrative */}
                  {selectedCandidateForDetails.executiveSummary && (
                    <div className="bg-surface-2 p-3.5 rounded-[12px] border border-border-default space-y-1.5">
                      <div className="text-xs font-bold text-text-1 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-brand" />
                        <span>جمع‌بندی ارزیابی</span>
                      </div>
                      <p className="text-text-2 leading-relaxed">
                        {selectedCandidateForDetails.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* Criteria Scores & Feedback Matrix */}
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold text-text-1 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <SlidersHorizontal className="w-4 h-4 text-brand" />
                        <span>امتیاز شاخص‌ها و توضیحات</span>
                      </span>
                      <span className="text-[11px] text-text-3">
                        نمره از ۱۰ • متناسب با وزن شاخص‌ها
                      </span>
                    </div>

                    <div className="space-y-2">
                      {job.criteria.map((crit) => {
                        const critScore = selectedCandidateForDetails.criteriaScores?.[crit.title] ?? 0;
                        const critFeedback = selectedCandidateForDetails.criteriaFeedback?.[crit.title];

                        const barColor =
                          critScore >= 7
                            ? 'bg-success'
                            : critScore >= 5
                            ? 'bg-warning'
                            : 'bg-danger';

                        return (
                          <div
                            key={crit.id}
                            className="bg-surface-2 p-3 rounded-[10px] border border-border-default space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-text-1 flex items-center gap-1.5">
                                <span>{crit.title}</span>
                                <span className="text-[10px] bg-brand-soft text-brand px-1.5 py-0.2 rounded">
                                  وزن: {toPersianDigits(crit.weight)}٪
                                </span>
                              </div>
                              <span className="font-extrabold text-sm text-text-1">
                                {toPersianDigits(critScore)} / ۱۰
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-surface-0 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.min(100, critScore * 10)}%` }}
                              />
                            </div>

                            {/* AI justification text */}
                            {critFeedback && (
                              <div className="text-[11px] text-text-2 pt-1 border-t border-border-default/60 leading-relaxed">
                                <span className="font-semibold text-text-1">استدلال ارزیابی:</span>{' '}
                                {critFeedback}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Verbatim Quotes Provenance */}
                  {selectedCandidateForDetails.resumeQuotes &&
                    selectedCandidateForDetails.resumeQuotes.length > 0 && (
                      <div className="bg-brand-soft/20 p-3.5 rounded-[12px] border border-brand/25 space-y-2">
                        <div className="text-xs font-bold text-brand flex items-center gap-1.5">
                          <Quote className="w-4 h-4" />
                          <span>شواهد متنی استخراج‌شده از رزومه</span>
                        </div>
                        <ul className="space-y-1.5">
                          {selectedCandidateForDetails.resumeQuotes.map((q, idx) => (
                            <li
                              key={idx}
                              className="text-text-2 italic bg-surface-1/70 p-2 rounded-[8px] border border-border-default"
                            >
                              «{q}»
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  {/* Strengths & Weaknesses Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Strengths */}
                    <div className="bg-success-soft/30 p-3 rounded-[10px] border border-success/20 space-y-1.5">
                      <div className="font-bold text-success flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>نقاط قوت</span>
                      </div>
                      <ul className="space-y-1">
                        {(selectedCandidateForDetails.strengths || []).map((s, i) => (
                          <li key={i} className="text-text-2 flex items-start gap-1.5">
                            <span className="text-success">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weaknesses */}
                    <div className="bg-warning-soft/30 p-3 rounded-[10px] border border-warning/20 space-y-1.5">
                      <div className="font-bold text-warning flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        <span>زمینه‌های نیازمند بهبود</span>
                      </div>
                      <ul className="space-y-1">
                        {(selectedCandidateForDetails.weaknesses || []).map((w, i) => (
                          <li key={i} className="text-text-2 flex items-start gap-1.5">
                            <span className="text-warning">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </>
              )}

              {activeDossierTab === 'RESUME_TEXT' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-text-3">
                      متن رزومه کارجو جهت بررسی و تطبیق مستقیم.
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyResumeText(selectedCandidateForDetails.resumeText || '')}
                      className="px-3 py-1 bg-surface-2 hover:bg-surface-0 border border-border-default rounded-[8px] text-[11px] font-bold text-text-1 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedResumeText ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedResumeText ? 'کپی شد' : 'کپی کل متن'}</span>
                    </button>
                  </div>

                  <div className="bg-surface-2 p-3.5 rounded-[12px] border border-border-default font-mono text-[11px] text-text-2 leading-relaxed max-h-[350px] overflow-y-auto whitespace-pre-wrap select-all">
                    {selectedCandidateForDetails.resumeText || 'متنی برای این رزومه ثبت نشده است.'}
                  </div>
                </div>
              )}
            </div>

            {/* Dossier Footer Actions: Stage Transition & Draft Email */}
            <div className="pt-3.5 border-t border-border-default flex flex-wrap items-center justify-between gap-2 shrink-0 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-1">تغییر مرحله کارجو:</span>
                <select
                  value={selectedCandidateForDetails.stage}
                  onChange={(e) => handleTransitionCandidate(selectedCandidateForDetails.id, e.target.value as CandidateStage)}
                  className="bg-surface-2 border border-border-default rounded-[8px] px-2.5 py-1.5 text-xs text-text-1 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                >
                  {/* Show current + legally allowed transitions */}
                  <option value={selectedCandidateForDetails.stage}>
                    {STAGE_LABELS[selectedCandidateForDetails.stage]} (فعلی)
                  </option>
                  {(STAGE_TRANSITIONS[selectedCandidateForDetails.stage] || []).map((st) => (
                    <option key={st} value={st}>
                      انتقال به: {STAGE_LABELS[st]}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => onToggleTalentPool(selectedCandidateForDetails.id, !selectedCandidateForDetails.inTalentPool)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                    selectedCandidateForDetails.inTalentPool
                      ? 'bg-purple-600 text-white'
                      : 'bg-surface-2 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-border-default'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>{selectedCandidateForDetails.inTalentPool ? 'در بانک استعدادها' : 'افزودن به بانک استعدادها'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onDraftEmail && (
                  <>
                    <button
                      type="button"
                      onClick={() => onDraftEmail(selectedCandidateForDetails, 'INVITATION')}
                      className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>پیش‌نویس دعوت‌نامه</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDraftEmail(selectedCandidateForDetails, 'REJECTION')}
                      className="px-3 py-1.5 bg-surface-2 hover:bg-danger-soft text-danger border border-border-default rounded-[8px] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>پیش‌نویس عدم پذیرش</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedCandidateForDetails(null)}
                  className="px-3.5 py-1.5 bg-surface-2 hover:bg-surface-0 text-text-1 rounded-[8px] text-xs font-semibold cursor-pointer"
                >
                  بستن
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
