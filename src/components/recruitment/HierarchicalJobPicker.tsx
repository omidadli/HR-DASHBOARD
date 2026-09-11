import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JobPosting, JobCriteria } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Plus,
  Clock,
  Sparkles,
  Layers,
  MapPin,
  Scale,
  FlaskConical,
  Factory,
  TrendingUp,
  Server,
  Users,
  X,
  Briefcase,
  SlidersHorizontal,
  Loader2,
  HelpCircle,
} from 'lucide-react';

/**
 * 6 Main Strategic Categories of Seilaneh Sabz Holding
 * with their mapped 13 Departments, Icons, and Accent Styling.
 */
export interface HoldingCategory {
  id: string;
  name: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: {
    bg: string;
    text: string;
    border: string;
    badge: string;
    accent: string;
  };
  departments: string[];
}

export const SEILANEH_CATEGORIES: HoldingCategory[] = [
  {
    id: 'manufacturing-engineering',
    name: 'تولید و مهندسی',
    shortDesc: 'کارخانجات تولیدی، نت صنعتی و HSE',
    icon: Factory,
    color: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800/40',
      badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
      accent: '#f59e0b',
    },
    departments: [
      'کارخانجات و صنایع تولیدی اشتهارد و سیمین‌دشت',
      'مهندسی، تاسیسات و نگهداری و تعمیرات (نت صنعتی - PM)',
      'بهداشت، ایمنی و محیط زیست (HSE کارخانجات)',
    ],
  },
  {
    id: 'quality-rd',
    name: 'کیفیت و تحقیق و توسعه',
    shortDesc: 'فرمولاسیون دارویی/آرایشی، R&D و کنترل کیفیت',
    icon: FlaskConical,
    color: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-400',
      border: 'border-purple-200 dark:border-purple-800/40',
      badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
      accent: '#a855f7',
    },
    departments: [
      'لابراتوارهای تحقیق، توسعه و فرمولاسیون (R&D)',
      'کنترل کیفیت و تضمین کیفیت (QA & QC)',
    ],
  },
  {
    id: 'commercial-marketing-scm',
    name: 'فروش، مارکتینگ و زنجیره تامین',
    shortDesc: 'توزیع مویرگی FMCG، مدیریت برندها، لجستیک و CRM',
    icon: TrendingUp,
    color: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800/40',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
      accent: '#3b82f6',
    },
    departments: [
      'مارکتینگ، روابط عمومی و مدیریت برندها (PR & Brands)',
      'فروش سراسری، زنجیره‌ای و توزیع مویرگی (FMCG Sales)',
      'زنجیره تامین، بازرگانی خارجی و لجستیک (Supply Chain)',
      'خدمات مشتریان، امور نمایندگی‌ها و صدای مشتری (CRM)',
    ],
  },
  {
    id: 'finance-legal',
    name: 'مالی و حقوقی',
    shortDesc: 'حسابداری صنعتی، بهای تمام‌شده و رگولاتوری غذا و دارو',
    icon: Scale,
    color: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
      accent: '#10b981',
    },
    departments: [
      'امور مالی، بهای تمام‌شده و حسابداری صنعتی',
      'امور حقوقی، قراردادها و رگولاتوری غذا و دارو',
    ],
  },
  {
    id: 'it-digital',
    name: 'فناوری اطلاعات',
    shortDesc: 'زیرساخت ابری، سامانه‌های سازمانی و تحول دیجیتال',
    icon: Server,
    color: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      text: 'text-cyan-700 dark:text-cyan-400',
      border: 'border-cyan-200 dark:border-cyan-800/40',
      badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
      accent: '#06b6d4',
    },
    departments: [
      'فناوری اطلاعات، زیرساخت و تحول دیجیتال',
    ],
  },
  {
    id: 'human-capital',
    name: 'سرمایه انسانی',
    shortDesc: 'جذب استعداد، آموزش، جبران خدمت و فرهنگ سازمانی',
    icon: Users,
    color: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      text: 'text-rose-700 dark:text-rose-400',
      border: 'border-rose-200 dark:border-rose-800/40',
      badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
      accent: '#f43f5e',
    },
    departments: [
      'مدیریت منابع انسانی، آموزش و فرهنگ سازمانی',
    ],
  },
];

export const OTHER_CATEGORY: HoldingCategory = {
  id: 'other-departments',
  name: 'سایر دپارتمان‌ها و واحدها',
  shortDesc: 'سایر موقعیت‌های شغلی عمومی هلدینگ',
  icon: Layers,
  color: {
    bg: 'bg-slate-50 dark:bg-slate-900/40',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
    accent: '#64748b',
  },
  departments: [],
};

const RECENT_JOBS_STORAGE_KEY = 'kara_recent_job_ids_v1';

/**
 * Normalizes Persian text for search matching (Yeh, Kaf, Nim-space, Diacritics)
 */
export function normalizePersianText(str: string): string {
  if (!str) return '';
  return str
    .replace(/[\u200c\u200b\s]+/g, ' ')
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u064b-\u065f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Highlights matches in Persian text
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <span>{text}</span>;

  const normQuery = normalizePersianText(query);
  const normText = normalizePersianText(text);
  const idx = normText.indexOf(normQuery);

  if (idx === -1) return <span>{text}</span>;

  // Approximate character boundary for highlighting
  const start = Math.max(0, idx);
  const end = Math.min(text.length, start + query.length);

  const before = text.slice(0, start);
  const matched = text.slice(start, end);
  const after = text.slice(end);

  return (
    <span>
      {before}
      <mark className="bg-amber-200/90 text-amber-950 dark:bg-amber-400/30 dark:text-amber-200 px-0.5 rounded font-bold">
        {matched}
      </mark>
      {after}
    </span>
  );
}

export interface HierarchicalJobPickerProps {
  jobs: JobPosting[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  onJobCreated?: (newJob: JobPosting) => void;
  disabled?: boolean;
  className?: string;
  showSummaryCard?: boolean;
  id?: string;
}

export const HierarchicalJobPicker: React.FC<HierarchicalJobPickerProps> = ({
  jobs,
  selectedJobId,
  onSelectJob,
  onJobCreated,
  disabled = false,
  className = '',
  showSummaryCard = true,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
  const [isInlineJobFormOpen, setIsInlineJobFormOpen] = useState(false);

  // Form states for inline job creation
  const [newTitle, setNewTitle] = useState('');
  const [newEmploymentType, setNewEmploymentType] = useState('تمام‌وقت');
  const [newLocation, setNewLocation] = useState('تهران');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmittingJob, setIsSubmittingJob] = useState(false);
  const [jobCreationError, setJobCreationError] = useState<string | null>(null);

  // Recently used job IDs from localStorage
  const [recentJobIds, setRecentJobIds] = useState<string[]>([]);

  // Keyboard navigation index
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Load recently used jobs on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_JOBS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentJobIds(parsed);
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }
  }, []);

  // Save selected job to recent list
  const markJobAsRecent = (jobId: string) => {
    try {
      setRecentJobIds((prev) => {
        const next = [jobId, ...prev.filter((id) => id !== jobId)].slice(0, 5);
        localStorage.setItem(RECENT_JOBS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    } catch {
      // Ignore localStorage write errors
    }
  };

  // Find currently selected job
  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || jobs[0];
  }, [jobs, selectedJobId]);

  // Helper to find category and department for any job
  const getJobCategoryAndDept = (job: JobPosting): { category: HoldingCategory; department: string } => {
    const jobDept = job.department || '';
    for (const cat of SEILANEH_CATEGORIES) {
      if (cat.departments.includes(jobDept)) {
        return { category: cat, department: jobDept };
      }
    }
    // If not matched directly, check substring or fallback
    for (const cat of SEILANEH_CATEGORIES) {
      for (const d of cat.departments) {
        if (jobDept.includes(d) || d.includes(jobDept)) {
          return { category: cat, department: d };
        }
      }
    }
    return { category: OTHER_CATEGORY, department: jobDept || 'دپارتمان عمومی' };
  };

  const selectedJobContext = useMemo(() => {
    if (!selectedJob) return null;
    return getJobCategoryAndDept(selectedJob);
  }, [selectedJob]);

  // Sync initial drill-down path when opening popover
  useEffect(() => {
    if (isOpen) {
      if (selectedJobContext) {
        setActiveCategoryId(selectedJobContext.category.id);
        setActiveDepartment(selectedJobContext.department);
      }
      setSearchQuery('');
      setHighlightedIndex(0);
      setIsInlineJobFormOpen(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Group all jobs by department
  const jobsByDepartment = useMemo(() => {
    const map = new Map<string, JobPosting[]>();
    for (const job of jobs) {
      const dept = job.department || 'سایر واحدها';
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(job);
    }
    return map;
  }, [jobs]);

  // Count jobs per category
  const categoryJobCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cat of SEILANEH_CATEGORIES) {
      let sum = 0;
      for (const dept of cat.departments) {
        sum += (jobsByDepartment.get(dept) || []).length;
      }
      counts.set(cat.id, sum);
    }
    // Also other categories
    let otherSum = 0;
    const allKnownDepts = new Set(SEILANEH_CATEGORIES.flatMap((c) => c.departments));
    for (const [dept, deptJobs] of jobsByDepartment.entries()) {
      if (!allKnownDepts.has(dept)) {
        otherSum += deptJobs.length;
      }
    }
    counts.set(OTHER_CATEGORY.id, otherSum);
    return counts;
  }, [jobsByDepartment]);

  // Flattened search items for instant search across ALL levels
  interface SearchItem {
    id: string;
    type: 'job' | 'department' | 'category';
    title: string;
    subtitle: string;
    path: string;
    category: HoldingCategory;
    department?: string;
    job?: JobPosting;
    matchScore: number;
  }

  const searchResults = useMemo<SearchItem[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = normalizePersianText(searchQuery);
    const results: SearchItem[] = [];

    // Search within Jobs
    for (const job of jobs) {
      const { category, department } = getJobCategoryAndDept(job);
      const titleNorm = normalizePersianText(job.title);
      const descNorm = normalizePersianText(job.description || '');
      const locNorm = normalizePersianText(job.location || '');
      const criteriaNorm = (job.criteria || []).map((c) => normalizePersianText(c.title)).join(' ');

      let score = 0;
      if (titleNorm.includes(q)) score += 100;
      if (titleNorm.startsWith(q)) score += 50;
      if (descNorm.includes(q)) score += 20;
      if (locNorm.includes(q)) score += 15;
      if (criteriaNorm.includes(q)) score += 15;

      if (score > 0) {
        results.push({
          id: `search-job-${job.id}`,
          type: 'job',
          title: job.title,
          subtitle: `${job.location} • ${job.employmentType} • ${toPersianDigits(job.criteria?.length || 0)} شاخص`,
          path: `${category.name} › ${department}`,
          category,
          department,
          job,
          matchScore: score,
        });
      }
    }

    // Search within Departments
    for (const cat of SEILANEH_CATEGORIES) {
      for (const dept of cat.departments) {
        const deptNorm = normalizePersianText(dept);
        if (deptNorm.includes(q)) {
          const deptJobsCount = (jobsByDepartment.get(dept) || []).length;
          results.push({
            id: `search-dept-${dept}`,
            type: 'department',
            title: dept,
            subtitle: `${toPersianDigits(deptJobsCount)} ردیف شغلی فعال`,
            path: cat.name,
            category: cat,
            department: dept,
            matchScore: 60,
          });
        }
      }
    }

    // Search within Categories
    for (const cat of SEILANEH_CATEGORIES) {
      const catNorm = normalizePersianText(cat.name + ' ' + cat.shortDesc);
      if (catNorm.includes(q)) {
        const catJobsCount = categoryJobCounts.get(cat.id) || 0;
        results.push({
          id: `search-cat-${cat.id}`,
          type: 'category',
          title: cat.name,
          subtitle: `${cat.shortDesc} • ${toPersianDigits(catJobsCount)} شغل`,
          path: 'دسته‌بندی کلان',
          category: cat,
          matchScore: 40,
        });
      }
    }

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }, [searchQuery, jobs, jobsByDepartment, categoryJobCounts]);

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      if (isInlineJobFormOpen) {
        setIsInlineJobFormOpen(false);
      } else if (searchQuery) {
        setSearchQuery('');
      } else if (activeDepartment) {
        setActiveDepartment(null);
      } else if (activeCategoryId) {
        setActiveCategoryId(null);
      } else {
        setIsOpen(false);
      }
      return;
    }

    // In Search Mode keyboard nav
    if (searchQuery.trim() && searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedItem = searchResults[highlightedIndex];
        if (selectedItem) {
          handleSelectSearchResult(selectedItem);
        }
      }
      return;
    }

    // Backspace to step back a level when search query is empty
    if (e.key === 'Backspace' && !searchQuery) {
      if (activeDepartment) {
        e.preventDefault();
        setActiveDepartment(null);
      } else if (activeCategoryId) {
        e.preventDefault();
        setActiveCategoryId(null);
      }
    }
  };

  const handleSelectSearchResult = (item: SearchItem) => {
    if (item.type === 'job' && item.job) {
      onSelectJob(item.job.id);
      markJobAsRecent(item.job.id);
      setIsOpen(false);
    } else if (item.type === 'department' && item.department) {
      setActiveCategoryId(item.category.id);
      setActiveDepartment(item.department);
      setSearchQuery('');
    } else if (item.type === 'category') {
      setActiveCategoryId(item.category.id);
      setActiveDepartment(null);
      setSearchQuery('');
    }
  };

  const handleSelectJob = (jobId: string) => {
    onSelectJob(jobId);
    markJobAsRecent(jobId);
    setIsOpen(false);
  };

  // Inline creation of a new job position at level 3
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setJobCreationError('عنوان شغلی الزامی است');
      return;
    }
    const targetDepartment = activeDepartment || selectedJobContext?.department || SEILANEH_CATEGORIES[0].departments[0];

    setIsSubmittingJob(true);
    setJobCreationError(null);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          department: targetDepartment,
          employmentType: newEmploymentType,
          location: newLocation,
          description: newDescription.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'خطا در ثبت موقعیت شغلی جدید');
      }

      const createdJob: JobPosting = await res.json();
      if (onJobCreated) {
        onJobCreated(createdJob);
      }
      onSelectJob(createdJob.id);
      markJobAsRecent(createdJob.id);
      setIsInlineJobFormOpen(false);
      setNewTitle('');
      setNewDescription('');
      setIsOpen(false);
    } catch (err: any) {
      setJobCreationError(err.message || 'خطا در برقراری ارتباط با سرور');
    } finally {
      setIsSubmittingJob(false);
    }
  };

  // Active category object in drill-down
  const currentCategory = useMemo(() => {
    if (!activeCategoryId) return null;
    return (
      SEILANEH_CATEGORIES.find((c) => c.id === activeCategoryId) ||
      (activeCategoryId === OTHER_CATEGORY.id ? OTHER_CATEGORY : null)
    );
  }, [activeCategoryId]);

  // Jobs in active department
  const departmentJobs = useMemo(() => {
    if (!activeDepartment) return [];
    return jobsByDepartment.get(activeDepartment) || [];
  }, [activeDepartment, jobsByDepartment]);

  // Recent jobs list
  const recentJobs = useMemo(() => {
    return recentJobIds
      .map((id) => jobs.find((j) => j.id === id))
      .filter((j): j is JobPosting => Boolean(j))
      .slice(0, 4);
  }, [recentJobIds, jobs]);

  // Method & Rigor Persian translations for summary card
  const scoringMethodLabel: Record<string, string> = {
    WEIGHTED_AVG: 'میانگین وزنی شاخص‌ها',
    THRESHOLD_VETO: 'وتوی آستانه حداقلی',
    GEOMETRIC_MEAN: 'میانگین هندسی ترکیبی',
  };

  const aiRigorLabel: Record<string, string> = {
    STRICT: 'سخت‌گیرانه و موشکافانه',
    BALANCED: 'متعادل و منطقی',
    LENIENT: 'آسان‌گیر و توسعه‌پذیر',
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} id={id}>
      {/* Quick Recent Jobs Chips */}
      {recentJobs.length > 0 && !disabled && (
        <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <span className="flex items-center gap-1 text-text-3 font-semibold shrink-0">
            <Clock className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
            <span>انتخاب‌های اخیر:</span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {recentJobs.map((rj) => {
              const isSelected = rj.id === selectedJobId;
              return (
                <button
                  key={rj.id}
                  type="button"
                  onClick={() => onSelectJob(rj.id)}
                  aria-pressed={isSelected}
                  className={`px-2.5 py-1 rounded-[8px] border transition-all text-xs font-medium cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-brand text-white border-brand shadow-2xs font-bold'
                      : 'bg-surface-1 hover:bg-surface-2 text-text-2 border-border-default hover:border-border-strong'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{rj.title}</span>
                  <span className="text-[10px] opacity-75 truncate max-w-[80px]">({rj.department})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`انتخاب ردیف شغلی: ${selectedJob ? selectedJob.title : 'انتخاب نشده'}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-3 p-3 text-right bg-surface-1 border rounded-[12px] shadow-2xs transition-all cursor-pointer select-none outline-none ${
          disabled
            ? 'opacity-60 cursor-not-allowed bg-surface-2 border-border-default'
            : isOpen
            ? 'border-brand ring-2 ring-brand/20 shadow-md'
            : 'border-border-default hover:border-border-strong hover:bg-surface-2/40'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Category Icon / Badge */}
          <div
            className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 border ${
              selectedJobContext?.category.color.bg || 'bg-brand-soft'
            } ${selectedJobContext?.category.color.border || 'border-brand/20'}`}
          >
            {selectedJobContext?.category ? (
              <selectedJobContext.category.icon
                className={`w-5 h-5 ${selectedJobContext.category.color.text}`}
              />
            ) : (
              <Briefcase className="w-5 h-5 text-brand" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* Breadcrumb Hierarchy Path */}
            <div className="flex items-center gap-1 text-[11px] text-text-3 truncate mb-0.5">
              <span className="font-semibold text-text-2">
                {selectedJobContext?.category.name || 'هلدینگ سیلانه سبز'}
              </span>
              <ChevronLeft className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{selectedJob?.department || 'دپارتمان'}</span>
            </div>

            {/* Job Title */}
            <div className="text-xs sm:text-sm font-extrabold text-text-1 truncate flex items-center gap-2">
              <span>{selectedJob ? selectedJob.title : 'موقعیت شغلی را انتخاب کنید...'}</span>
              {selectedJob?.status === 'ACTIVE' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  فعال
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Info & Chevron */}
        <div className="flex items-center gap-2 shrink-0">
          {selectedJob && (
            <div className="hidden sm:flex flex-col items-end text-[11px] text-text-3">
              <span className="font-semibold text-text-2">
                {selectedJob.location} • {selectedJob.employmentType}
              </span>
              <span className="text-[10px] text-brand font-bold">
                {toPersianDigits(selectedJob.criteria?.length || 0)} شاخص ارزیابی
              </span>
            </div>
          )}
          <div className="p-1 rounded-lg text-text-3 group-hover:text-text-1">
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`}
              aria-hidden="true"
            />
          </div>
        </div>
      </button>

      {/* Popover Dropdown (Cascading / 3-Level Drill-Down + Fuzzy Search) */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-modal="true"
          aria-label="انتخابگر ۳ سطحی موقعیت‌های شغلی و دپارتمان‌های سیلانه سبز"
          className="absolute z-50 mt-2 w-full min-w-[320px] sm:min-w-[460px] max-w-2xl bg-surface-1 border border-border-default rounded-[16px] shadow-2xl overflow-hidden right-0 origin-top-right animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[580px]"
        >
          {/* Header & Instant Search Bar */}
          <div className="p-3 border-b border-border-default bg-surface-2/40 shrink-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[8px] bg-brand-soft text-brand flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-text-1">
                    درخت ساختار سازمانی و ردیف‌های شغلی
                  </h4>
                  <p className="text-[10px] text-text-3">
                    سطح ۱: حوزه کلان › سطح ۲: دپارتمان › سطح ۳: ردیف شغلی
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="بستن پنجره انتخاب ردیف شغلی"
                className="p-1 rounded-lg text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-text-3 absolute right-3 top-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="جستجوی سریع در عنوان شغل، دپارتمان، مهارت یا محل خدمت..."
                className="w-full pr-9 pl-8 py-2 text-xs bg-surface-1 border border-border-default rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-text-1 placeholder:text-text-3"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="پاک کردن جستجو"
                  className="absolute left-2.5 top-2.5 text-text-3 hover:text-text-1 p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Breadcrumb path indicator when navigating without search */}
            {!searchQuery && (
              <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(null);
                    setActiveDepartment(null);
                    setIsInlineJobFormOpen(false);
                  }}
                  className={`hover:underline font-semibold cursor-pointer ${
                    !activeCategoryId ? 'text-brand font-bold' : 'text-text-3'
                  }`}
                >
                  همه حوزه‌ها (۶ حوزه)
                </button>

                {currentCategory && (
                  <>
                    <ChevronLeft className="w-3 h-3 text-text-3 shrink-0" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => {
                        setActiveDepartment(null);
                        setIsInlineJobFormOpen(false);
                      }}
                      className={`hover:underline truncate max-w-[150px] font-semibold cursor-pointer ${
                        activeCategoryId && !activeDepartment ? 'text-brand font-bold' : 'text-text-3'
                      }`}
                    >
                      {currentCategory.name}
                    </button>
                  </>
                )}

                {activeDepartment && (
                  <>
                    <ChevronLeft className="w-3 h-3 text-text-3 shrink-0" aria-hidden="true" />
                    <span className="font-extrabold text-brand truncate max-w-[180px]">
                      {activeDepartment}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Body Section (Search Results OR 3-Level Drill-Down) */}
          <div className="overflow-y-auto p-3 flex-1 min-h-[260px] max-h-[420px]">
            {searchQuery.trim() ? (
              /* Search Results List */
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-text-3 px-1">
                  <span>
                    نتایج جستجو برای «{searchQuery}»: ({toPersianDigits(searchResults.length)} مورد)
                  </span>
                  <span className="text-[10px]">استفاده از کلیدهای ↑↓ و Enter جهت انتخاب سریع</span>
                </div>

                {searchResults.length > 0 ? (
                  <div className="space-y-1.5">
                    {searchResults.map((item, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      const isSelectedJob = item.job?.id === selectedJobId;

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectSearchResult(item)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`p-2.5 rounded-[12px] border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isHighlighted
                              ? 'bg-brand-soft/70 border-brand/40 ring-1 ring-brand/30'
                              : 'bg-surface-2/40 border-border-default hover:bg-surface-2'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div
                              className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border ${item.category.color.bg} ${item.category.color.border}`}
                            >
                              <item.category.icon className={`w-4 h-4 ${item.category.color.text}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] text-text-3 flex items-center gap-1 mb-0.5 truncate">
                                <span>{item.path}</span>
                                {item.type === 'job' && (
                                  <span className="px-1 py-0.2 rounded bg-surface-1 text-brand font-bold text-[9px] border border-brand/20">
                                    ردیف شغلی
                                  </span>
                                )}
                                {item.type === 'department' && (
                                  <span className="px-1 py-0.2 rounded bg-surface-1 text-purple-700 dark:text-purple-300 font-bold text-[9px] border border-purple-300">
                                    دپارتمان
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-extrabold text-text-1 truncate">
                                <HighlightedText text={item.title} query={searchQuery} />
                              </div>

                              <div className="text-[11px] text-text-3 truncate mt-0.5">
                                {item.subtitle}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSelectedJob && (
                              <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                            <ChevronLeft className="w-4 h-4 text-text-3" aria-hidden="true" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-surface-2 text-text-3 flex items-center justify-center mx-auto">
                      <Search className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-1">
                        هیچ عنوان شغلی یا دپارتمانی منطبق با «{searchQuery}» پیدا نشد.
                      </p>
                      <p className="text-[11px] text-text-3 mt-1">
                        می‌توانید همین عنوان را به عنوان موقعیت شغلی جدید تعریف کنید.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setNewTitle(searchQuery);
                        setSearchQuery('');
                        setActiveCategoryId(SEILANEH_CATEGORIES[0].id);
                        setActiveDepartment(SEILANEH_CATEGORIES[0].departments[0]);
                        setIsInlineJobFormOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-[10px] bg-brand text-white text-xs font-bold hover:bg-brand-hover transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>تعریف «{searchQuery}» به عنوان شغل جدید</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Drill-Down Hierarchical Views */
              <div>
                {/* LEVEL 1: Strategic Categories */}
                {!activeCategoryId && (
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold text-text-3 px-1 mb-1">
                      حوزه کلان سازمان را انتخاب فرمایید:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SEILANEH_CATEGORIES.map((cat) => {
                        const jobCount = categoryJobCounts.get(cat.id) || 0;
                        const deptCount = cat.departments.length;

                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setActiveCategoryId(cat.id);
                              setActiveDepartment(null);
                            }}
                            className={`p-3 rounded-[12px] border text-right transition-all cursor-pointer flex items-start gap-3 group hover:shadow-sm ${cat.color.bg} ${cat.color.border} hover:border-brand/40`}
                          >
                            <div
                              className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 border bg-surface-1 ${cat.color.border}`}
                            >
                              <cat.icon className={`w-5 h-5 ${cat.color.text}`} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-extrabold text-text-1 group-hover:text-brand transition-colors flex items-center justify-between">
                                <span className="truncate">{cat.name}</span>
                                <ChevronLeft className="w-3.5 h-3.5 text-text-3 group-hover:translate-x-[-2px] transition-transform" />
                              </div>
                              <p className="text-[10px] text-text-3 mt-0.5 line-clamp-1">
                                {cat.shortDesc}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-text-2 mt-2 font-semibold">
                                <span className="px-1.5 py-0.5 rounded-md bg-surface-1/80 border border-border-default">
                                  {toPersianDigits(deptCount)} دپارتمان
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-md font-bold ${cat.color.badge}`}>
                                  {toPersianDigits(jobCount)} موقعیت شغلی
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LEVEL 2: Departments in Active Category */}
                {activeCategoryId && !activeDepartment && currentCategory && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] px-1 mb-1">
                      <span className="font-bold text-text-2">
                        دپارتمان‌های {currentCategory.name}:
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveCategoryId(null)}
                        className="text-brand font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>بازگشت به همه حوزه‌ها</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {currentCategory.departments.map((dept) => {
                        const deptJobs = jobsByDepartment.get(dept) || [];
                        const isCurrentDept = selectedJobContext?.department === dept;

                        return (
                          <button
                            key={dept}
                            type="button"
                            onClick={() => setActiveDepartment(dept)}
                            className={`w-full p-2.5 rounded-[12px] border text-right transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                              isCurrentDept
                                ? 'bg-surface-2 border-brand/40 shadow-2xs'
                                : 'bg-surface-1 border-border-default hover:bg-surface-2 hover:border-border-strong'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-[8px] bg-brand-soft text-brand flex items-center justify-center shrink-0">
                                <Building2 className="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-text-1 group-hover:text-brand transition-colors truncate">
                                  {dept}
                                </div>
                                <div className="text-[10px] text-text-3">
                                  {deptJobs.length > 0 ? (
                                    <span className="text-brand font-semibold">
                                      {toPersianDigits(deptJobs.length)} ردیف شغلی فعال
                                    </span>
                                  ) : (
                                    <span>فاقد ردیف شغلی فعال</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 text-text-3 group-hover:text-brand">
                              <span className="text-[11px] font-semibold">مشاهده شغل‌ها</span>
                              <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* LEVEL 3: Jobs in Selected Department & Inline Add Job */}
                {activeCategoryId && activeDepartment && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[11px] px-1 border-b border-border-default pb-2">
                      <div>
                        <span className="text-text-3">دپارتمان: </span>
                        <span className="font-extrabold text-text-1">{activeDepartment}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveDepartment(null)}
                        className="text-brand font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>تغییر دپارتمان</span>
                      </button>
                    </div>

                    {/* Jobs List */}
                    <div className="space-y-2">
                      {departmentJobs.length > 0 ? (
                        departmentJobs.map((job) => {
                          const isSelected = job.id === selectedJobId;
                          const criteriaCount = job.criteria?.length || 0;
                          const priorityThreshold = job.interviewPriorityThreshold ?? 7.0;
                          const rejectThreshold = job.initialRejectionThreshold ?? 5.0;

                          return (
                            <div
                              key={job.id}
                              onClick={() => handleSelectJob(job.id)}
                              className={`p-3 rounded-[12px] border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-brand-soft/80 border-brand ring-2 ring-brand/20 shadow-xs'
                                  : 'bg-surface-1 border-border-default hover:bg-surface-2 hover:border-border-strong'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs sm:text-sm font-extrabold text-text-1 truncate">
                                    {job.title}
                                  </span>
                                  {isSelected && (
                                    <span className="px-2 py-0.5 rounded-md bg-brand text-white text-[10px] font-bold">
                                      انتخاب‌شده
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-3">
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-text-3" />
                                    <span>{job.location}</span>
                                  </span>
                                  <span>•</span>
                                  <span>{job.employmentType}</span>
                                  <span>•</span>
                                  <span className="text-brand font-bold">
                                    {toPersianDigits(criteriaCount)} شاخص ارزیابی
                                  </span>
                                </div>

                                {/* Meta Thresholds badge */}
                                <div className="flex items-center gap-2 text-[10px] pt-1">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold">
                                    مصاحبه ≥ {toPersianDigits(priorityThreshold.toFixed(1))}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-semibold">
                                    رد &lt; {toPersianDigits(rejectThreshold.toFixed(1))}
                                  </span>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isSelected ? (
                                  <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center">
                                    <Check className="w-4 h-4" />
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="px-2.5 py-1 rounded-[8px] bg-surface-2 hover:bg-brand hover:text-white text-text-2 text-xs font-bold transition-colors cursor-pointer border border-border-default"
                                  >
                                    انتخاب
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 bg-surface-2/40 rounded-[12px] border border-dashed border-border-default">
                          <p className="text-xs text-text-2 font-bold">
                            ردیف شغلی فعالی در این دپارتمان ثبت نشده است.
                          </p>
                          <p className="text-[11px] text-text-3 mt-0.5">
                            می‌توانید همین حالا اولین ردیف شغلی را ایجاد و انتخاب کنید.
                          </p>
                        </div>
                      )}

                      {/* Button to toggle inline Job Creation Form */}
                      {!isInlineJobFormOpen ? (
                        <button
                          type="button"
                          onClick={() => setIsInlineJobFormOpen(true)}
                          className="w-full py-2.5 px-3 rounded-[10px] border border-dashed border-brand/50 text-brand hover:bg-brand-soft/40 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ عنوان شغلی جدید در دپارتمان «{activeDepartment}»</span>
                        </button>
                      ) : (
                        /* Compact Inline Form for creating a new job */
                        <form
                          onSubmit={handleCreateJob}
                          className="p-3.5 rounded-[12px] bg-surface-2/70 border border-brand/40 shadow-xs space-y-3 mt-2"
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-border-default text-xs font-bold text-brand">
                            <span className="flex items-center gap-1.5">
                              <Plus className="w-4 h-4" />
                              <span>تعریف ردیف شغلی جدید</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => setIsInlineJobFormOpen(false)}
                              className="text-text-3 hover:text-text-1 p-0.5 rounded cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {jobCreationError && (
                            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                              {jobCreationError}
                            </div>
                          )}

                          <div className="space-y-2">
                            <div>
                              <label className="block text-[11px] font-bold text-text-2 mb-1">
                                عنوان موقعیت شغلی <span className="text-danger">*</span>
                              </label>
                              <input
                                type="text"
                                required
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="مثلاً: کارشناس ارشد فرمولاسیون R&D"
                                className="w-full px-3 py-1.5 text-xs bg-surface-1 border border-border-default rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-text-1"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[11px] font-bold text-text-2 mb-1">
                                  نوع همکاری
                                </label>
                                <select
                                  value={newEmploymentType}
                                  onChange={(e) => setNewEmploymentType(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-surface-1 border border-border-default rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand/30 text-text-1"
                                >
                                  <option value="تمام‌وقت">تمام‌وقت</option>
                                  <option value="پاره‌وقت">پاره‌وقت</option>
                                  <option value="پروژه‌ای / قراردادی">پروژه‌ای / قراردادی</option>
                                  <option value="کارآموزی">کارآموزی</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-bold text-text-2 mb-1">
                                  محل خدمت
                                </label>
                                <select
                                  value={newLocation}
                                  onChange={(e) => setNewLocation(e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-surface-1 border border-border-default rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand/30 text-text-1"
                                >
                                  <option value="تهران (دفتر مرکزی)">تهران (دفتر مرکزی)</option>
                                  <option value="البرز، شهرک صنعتی اشتهارد">البرز، شهرک صنعتی اشتهارد</option>
                                  <option value="البرز، سیمین‌دشت">البرز، سیمین‌دشت</option>
                                  <option value="مراکز توزیع استانی">مراکز توزیع استانی</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-text-2 mb-1">
                                توضیح کوتاه (اختیاری)
                              </label>
                              <input
                                type="text"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="شرح مختصر وظایف یا تخصص مورد نیاز"
                                className="w-full px-3 py-1.5 text-xs bg-surface-1 border border-border-default rounded-[8px] focus:outline-none focus:ring-2 focus:ring-brand/30 text-text-1"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsInlineJobFormOpen(false)}
                              disabled={isSubmittingJob}
                              className="px-3 py-1.5 rounded-[8px] text-xs text-text-3 hover:text-text-1 bg-surface-1 border border-border-default hover:bg-surface-2 font-medium cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmittingJob || !newTitle.trim()}
                              className="px-3.5 py-1.5 rounded-[8px] text-xs font-bold text-white bg-brand hover:bg-brand-hover disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              {isSubmittingJob && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                              <span>ثبت و انتخاب ردیف شغلی</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Popover Footer Info */}
          <div className="p-2.5 bg-surface-2 border-t border-border-default shrink-0 flex items-center justify-between text-[11px] text-text-3">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand" />
              <span>موتور ارزیابی هوشمند منطبق با شاخص‌های اختصاصی هر ردیف شغلی</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-text-2 hover:text-text-1 font-bold cursor-pointer"
            >
              بستن
            </button>
          </div>
        </div>
      )}

      {/* Selected Job Summary Card */}
      {showSummaryCard && selectedJob && (
        <div className="mt-2.5 p-3 rounded-[12px] bg-surface-2/60 border border-border-default space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-1">
                  خلاصه پیکربندی ارزیابی هوشمند برای «{selectedJob.title}»
                </span>
              </div>
              <p className="text-[11px] text-text-3 mt-0.5">
                {selectedJob.department} • {selectedJob.location} • {selectedJob.employmentType}
              </p>
            </div>

            {/* Applications count badge */}
            <div className="px-2 py-0.5 rounded-full bg-brand-soft text-brand text-[10px] font-bold shrink-0 border border-brand/20">
              {toPersianDigits(selectedJob.applicationsCount || 0)} پرونده متقاضی
            </div>
          </div>

          {/* Thresholds & Method Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            {/* Interview Priority Threshold */}
            <div className="p-2 rounded-[8px] bg-surface-1 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between">
              <span className="text-text-3">حد نصاب اولویت مصاحبه:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                ≥ {toPersianDigits((selectedJob.interviewPriorityThreshold ?? 7.0).toFixed(1))} از ۱۰
              </span>
            </div>

            {/* Initial Rejection Threshold */}
            <div className="p-2 rounded-[8px] bg-surface-1 border border-rose-200 dark:border-rose-800/40 flex items-center justify-between">
              <span className="text-text-3">حد نصاب رد اولیه:</span>
              <span className="font-extrabold text-rose-700 dark:text-rose-400">
                &lt; {toPersianDigits((selectedJob.initialRejectionThreshold ?? 5.0).toFixed(1))} از ۱۰
              </span>
            </div>

            {/* Method / Rigor */}
            <div className="p-2 rounded-[8px] bg-surface-1 border border-border-default flex items-center justify-between">
              <span className="text-text-3">متد امتیازدهی:</span>
              <span className="font-bold text-text-1">
                {scoringMethodLabel[selectedJob.scoringMethod || 'WEIGHTED_AVG']}
              </span>
            </div>
          </div>

          {/* Criteria Breakdown Visual Bar & Chips */}
          {selectedJob.criteria && selectedJob.criteria.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-border-default/60">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-text-2 flex items-center gap-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
                  <span>شاخص‌های ارزیابی و وزن‌دهی (مجموع ۱۰۰٪):</span>
                </span>
                <span className="text-[10px] text-text-3">
                  سخت‌گیری هوش مصنوعی: {aiRigorLabel[selectedJob.aiRigor || 'BALANCED']}
                </span>
              </div>

              {/* Progress Bar with Proportional Segments */}
              <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden flex" dir="ltr">
                {selectedJob.criteria.map((c, idx) => {
                  const colors = [
                    'bg-emerald-500',
                    'bg-blue-500',
                    'bg-purple-500',
                    'bg-amber-500',
                    'bg-rose-500',
                    'bg-cyan-500',
                  ];
                  const barColor = colors[idx % colors.length];
                  return (
                    <div
                      key={c.id || idx}
                      style={{ width: `${c.weight}%` }}
                      className={`${barColor} h-full transition-all`}
                      title={`${c.title}: ${toPersianDigits(c.weight)}٪`}
                    />
                  );
                })}
              </div>

              {/* Criteria Chips */}
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {selectedJob.criteria.map((c, idx) => {
                  const tagColors = [
                    'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40',
                    'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40',
                    'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40',
                    'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40',
                    'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40',
                    'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/40',
                  ];
                  const colorClass = tagColors[idx % tagColors.length];

                  return (
                    <span
                      key={c.id || idx}
                      className={`px-2 py-0.5 rounded-[6px] text-[10px] font-bold border flex items-center gap-1 ${colorClass}`}
                    >
                      <span>{c.title}</span>
                      <span className="opacity-75 font-mono">({toPersianDigits(c.weight)}٪)</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
