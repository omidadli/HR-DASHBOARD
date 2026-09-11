import React, { useState, useMemo } from 'react';
import { Candidate, CandidateStage, CandidateCategory, JobPosting, UserRole } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { KanbanBoard } from './KanbanBoard';
import { AIAgentChat } from './AIAgentChat';
import { BulkUploadModal } from './BulkUploadModal';
import { JobPostingsView } from './JobPostingsView';
import { InterviewCalendarView } from './InterviewCalendarView';
import { TalentPoolView } from './TalentPoolView';
import { CandidateCompareModal } from './CandidateCompareModal';
import { EvaluationCriteriaManager } from './EvaluationCriteriaManager';
import { HireVueVideoStudio } from './HireVueVideoStudio';
import { EightfoldTalentIntelligence } from './EightfoldTalentIntelligence';
import { ZipRecruiterSmartSourcing } from './ZipRecruiterSmartSourcing';
import { BulkScreeningStudio } from './BulkScreeningStudio';
import {
  LayoutDashboard,
  Bot,
  Briefcase,
  Calendar,
  Award,
  UploadCloud,
  Sparkles,
  Users,
  Search,
  Filter,
  SlidersHorizontal,
  Video,
  Network,
  Zap,
  UserPlus,
  X,
  Check,
} from 'lucide-react';

interface RecruitmentModuleProps {
  currentRole: UserRole;
  jobs: JobPosting[];
  candidates: Candidate[];
  onUpdateCandidateStage: (candidateId: string, nextStage: CandidateStage) => void;
  onScheduleInterview: (
    candidateId: string,
    interviewJalali: string,
    interviewType: string,
    notes?: string
  ) => void;
  onToggleTalentPool: (candidateId: string, inPool: boolean) => void;
  onCreateJob: (newJob: Partial<JobPosting>) => void;
  onBulkUploadSuccess: (data: any) => void;
  onDraftEmail: (candidate: Candidate, type: 'INVITATION' | 'REJECTION') => void;
  onJobUpdated?: (updatedJob: JobPosting) => void;
}

export type RecruitmentTab =
  | 'kanban'
  | 'screening_studio'
  | 'hirevue_video'
  | 'eightfold_skills'
  | 'ziprecruiter_sourcing'
  | 'ai_agent'
  | 'evaluation_criteria'
  | 'jobs'
  | 'interviews'
  | 'talent_pool';

export const RecruitmentModule: React.FC<RecruitmentModuleProps> = ({
  currentRole,
  jobs,
  candidates,
  onUpdateCandidateStage,
  onScheduleInterview,
  onToggleTalentPool,
  onCreateJob,
  onBulkUploadSuccess,
  onDraftEmail,
  onJobUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<RecruitmentTab>('kanban');
  const [activeJobId, setActiveJobId] = useState<string>(jobs[0]?.id || 'job-1');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Search & Filter state for the Toolbar
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilters, setSelectedStageFilters] = useState<CandidateStage[]>([]);
  const [selectedCategoryFilters, setSelectedCategoryFilters] = useState<CandidateCategory[]>([]);
  const [onlyTalentPool, setOnlyTalentPool] = useState(false);

  // Candidates filtered by job, search, and multi-select chips
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      // Job filter
      if (activeJobId && c.jobId !== activeJobId) return false;

      // Search query (name, role, phone, email)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchesName = c.fullName.toLowerCase().includes(query);
        const matchesRole = c.jobTitle?.toLowerCase().includes(query);
        const matchesPhone = c.phone?.includes(query);
        const matchesEmail = c.email?.toLowerCase().includes(query);
        if (!matchesName && !matchesRole && !matchesPhone && !matchesEmail) {
          return false;
        }
      }

      // Stage multi-select chips
      if (selectedStageFilters.length > 0 && !selectedStageFilters.includes(c.stage)) {
        return false;
      }

      // Category multi-select chips
      if (
        selectedCategoryFilters.length > 0 &&
        (!c.category || !selectedCategoryFilters.includes(c.category))
      ) {
        return false;
      }

      // Talent pool filter
      if (onlyTalentPool && !c.inTalentPool) {
        return false;
      }

      return true;
    });
  }, [
    candidates,
    activeJobId,
    searchQuery,
    selectedStageFilters,
    selectedCategoryFilters,
    onlyTalentPool,
  ]);

  const toggleStageFilter = (stage: CandidateStage) => {
    setSelectedStageFilters((prev) =>
      prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]
    );
  };

  const toggleCategoryFilter = (cat: CandidateCategory) => {
    setSelectedCategoryFilters((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedStageFilters([]);
    setSelectedCategoryFilters([]);
    setOnlyTalentPool(false);
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedStageFilters.length > 0 ||
    selectedCategoryFilters.length > 0 ||
    onlyTalentPool;

  const handleToggleCompare = (candidate: Candidate) => {
    if (selectedCompareIds.includes(candidate.id)) {
      setSelectedCompareIds(selectedCompareIds.filter((id) => id !== candidate.id));
    } else {
      if (selectedCompareIds.length >= 4) {
        alert('امکان مقایسه همزمان حداکثر ۴ کارجو وجود دارد.');
        return;
      }
      setSelectedCompareIds([...selectedCompareIds, candidate.id]);
    }
  };

  const selectedCompareCandidates = candidates.filter((c) => selectedCompareIds.includes(c.id));

  // KPI Quick Stat Counters
  const totalResumes = candidates.length;
  const inInterviewCount = candidates.filter(
    (c) =>
      c.stage === CandidateStage.PHONE_INTERVIEW || c.stage === CandidateStage.IN_PERSON_INTERVIEW
  ).length;
  const hiredCount = candidates.filter((c) => c.stage === CandidateStage.HIRED).length;
  const talentPoolCount = candidates.filter((c) => c.inTalentPool).length;

  return (
    <div className="space-y-4">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs">
          <div className="text-xs text-text-3 font-medium mb-1">آگهی‌های فعال</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-text-1">
              {toPersianDigits(jobs.filter((j) => j.status === 'ACTIVE').length)}
            </span>
            <span className="text-[11px] text-success font-bold bg-success-soft px-2 py-0.5 rounded-md border border-success/20">
              در حال جذب
            </span>
          </div>
        </div>

        <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs">
          <div className="text-xs text-text-3 font-medium mb-1">رزومه‌های بررسی‌شده</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-text-1">
              {toPersianDigits(totalResumes)}
            </span>
            <span className="text-[11px] text-brand font-bold bg-brand-soft px-2 py-0.5 rounded-md border border-brand/20">
              ارزیابی هوشمند
            </span>
          </div>
        </div>

        <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs">
          <div className="text-xs text-text-3 font-medium mb-1">مصاحبه‌های فعال</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-text-1">
              {toPersianDigits(inInterviewCount)}
            </span>
            <span className="text-[11px] text-purple-700 dark:text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
              تقویم فعال
            </span>
          </div>
        </div>

        <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs">
          <div className="text-xs text-text-3 font-medium mb-1">بانک استعدادها</div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-text-1">
              {toPersianDigits(talentPoolCount)}
            </span>
            <span className="text-[11px] text-warning font-bold bg-warning-soft px-2 py-0.5 rounded-md border border-warning/20">
              ذخیره برای آینده
            </span>
          </div>
        </div>
      </div>

      {/* Main Module Sub-Tabs Navigation */}
      <div className="bg-surface-1 p-2 rounded-[14px] border border-border-default shadow-2xs overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <button
            type="button"
            onClick={() => setActiveTab('kanban')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'kanban'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>مراحل جذب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('screening_studio')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'screening_studio'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>غربالگری رزومه‌ها</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-900 font-black">
              ارزیابی هوشمند
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hirevue_video')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'hirevue_video'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Video className="w-4 h-4 text-brand" />
            <span>مصاحبه ویدیویی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('eightfold_skills')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'eightfold_skills'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Network className="w-4 h-4 text-brand" />
            <span>تطبیق مهارت‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ziprecruiter_sourcing')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'ziprecruiter_sourcing'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>انتشار و جذب</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai_agent')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'ai_agent'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Bot className="w-4 h-4 text-brand" />
            <span>دستیار استخدام (Gemini)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluation_criteria')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'evaluation_criteria'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-brand" />
            <span>معیارهای ارزیابی</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'jobs'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>آگهی‌های شغلی ({toPersianDigits(jobs.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('interviews')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'interviews'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>تقویم مصاحبه‌ها</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('talent_pool')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-xs font-bold transition-all ${
              activeTab === 'talent_pool'
                ? 'bg-brand text-white shadow-2xs'
                : 'text-text-2 hover:bg-surface-2'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>بانک استعدادها</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Multi-Select Filter Chips & Primary CTA "افزودن کارجو" */}
      <div className="bg-surface-1 p-3.5 rounded-[14px] border border-border-default shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Search input & Job selector */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 text-text-3 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجوی نام، عنوان شغل، شماره تماس..."
                className="w-full bg-surface-2 border border-border-default rounded-[10px] pr-9 pl-8 py-2 text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Job Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-surface-2 px-3 py-2 rounded-[10px] border border-border-default text-xs">
              <Briefcase className="w-3.5 h-3.5 text-text-3" />
              <select
                value={activeJobId}
                onChange={(e) => setActiveJobId(e.target.value)}
                className="bg-transparent text-text-1 font-bold focus:outline-none cursor-pointer"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id} className="bg-surface-1 text-text-1">
                    {j.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button if any active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] text-danger hover:underline flex items-center gap-1 px-2 py-1"
              >
                <X className="w-3 h-3" />
                <span>حذف فیلترها</span>
              </button>
            )}
          </div>

          {/* Right: Actions (Compare Radar, Bulk Upload, and Primary CTA "افزودن کارجو") */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Candidate Compare Button (active when 2+ selected) */}
            {selectedCompareIds.length >= 2 && (
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-[10px] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>مقایسه ({toPersianDigits(selectedCompareIds.length)} کارجو)</span>
              </button>
            )}

            {/* Bulk Upload Button */}
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-3.5 py-2 bg-surface-2 hover:bg-surface-0 text-text-1 border border-border-default rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-brand" />
              <span>بارگذاری گروهی (ZIP / PDF)</span>
            </button>

            {/* PRIMARY CTA: افزودن کارجو */}
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>افزودن کارجو</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-border-default text-xs">
          <span className="text-[11px] font-bold text-text-3 ml-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            فیلترها:
          </span>

          {/* Category Chips */}
          <button
            type="button"
            onClick={() => toggleCategoryFilter(CandidateCategory.INTERVIEW_PRIORITY)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              selectedCategoryFilters.includes(CandidateCategory.INTERVIEW_PRIORITY)
                ? 'bg-success text-white border-success shadow-2xs'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-success/50'
            }`}
          >
            {selectedCategoryFilters.includes(CandidateCategory.INTERVIEW_PRIORITY) && (
              <Check className="w-3 h-3" />
            )}
            <span>اولویت مصاحبه (بالای ۷)</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategoryFilter(CandidateCategory.NEEDS_REVIEW)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              selectedCategoryFilters.includes(CandidateCategory.NEEDS_REVIEW)
                ? 'bg-warning text-white border-warning shadow-2xs'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-warning/50'
            }`}
          >
            {selectedCategoryFilters.includes(CandidateCategory.NEEDS_REVIEW) && (
              <Check className="w-3 h-3" />
            )}
            <span>نیازمند بررسی (۵-۷)</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCategoryFilter(CandidateCategory.INITIAL_REJECTION)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              selectedCategoryFilters.includes(CandidateCategory.INITIAL_REJECTION)
                ? 'bg-danger text-white border-danger shadow-2xs'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-danger/50'
            }`}
          >
            {selectedCategoryFilters.includes(CandidateCategory.INITIAL_REJECTION) && (
              <Check className="w-3 h-3" />
            )}
            <span>رد اولیه (زیر ۵)</span>
          </button>

          <span className="h-3 w-px bg-border-default mx-1" />

          {/* Stage Chips */}
          <button
            type="button"
            onClick={() => toggleStageFilter(CandidateStage.INITIAL_SCREENING)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              selectedStageFilters.includes(CandidateStage.INITIAL_SCREENING)
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-border-strong'
            }`}
          >
            {selectedStageFilters.includes(CandidateStage.INITIAL_SCREENING) && (
              <Check className="w-3 h-3" />
            )}
            <span>بررسی اولیه</span>
          </button>

          <button
            type="button"
            onClick={() => toggleStageFilter(CandidateStage.PHONE_INTERVIEW)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              selectedStageFilters.includes(CandidateStage.PHONE_INTERVIEW)
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-border-strong'
            }`}
          >
            {selectedStageFilters.includes(CandidateStage.PHONE_INTERVIEW) && (
              <Check className="w-3 h-3" />
            )}
            <span>مصاحبه تلفنی</span>
          </button>

          <button
            type="button"
            onClick={() => toggleStageFilter(CandidateStage.IN_PERSON_INTERVIEW)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              selectedStageFilters.includes(CandidateStage.IN_PERSON_INTERVIEW)
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-border-strong'
            }`}
          >
            {selectedStageFilters.includes(CandidateStage.IN_PERSON_INTERVIEW) && (
              <Check className="w-3 h-3" />
            )}
            <span>مصاحبه حضوری</span>
          </button>

          <button
            type="button"
            onClick={() => toggleStageFilter(CandidateStage.OFFER)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              selectedStageFilters.includes(CandidateStage.OFFER)
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-border-strong'
            }`}
          >
            {selectedStageFilters.includes(CandidateStage.OFFER) && (
              <Check className="w-3 h-3" />
            )}
            <span>پیشنهاد همکاری</span>
          </button>

          <button
            type="button"
            onClick={() => toggleStageFilter(CandidateStage.HIRED)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all flex items-center gap-1 cursor-pointer ${
              selectedStageFilters.includes(CandidateStage.HIRED)
                ? 'bg-brand text-white border-brand'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-border-strong'
            }`}
          >
            {selectedStageFilters.includes(CandidateStage.HIRED) && (
              <Check className="w-3 h-3" />
            )}
            <span>استخدام شده</span>
          </button>

          <button
            type="button"
            onClick={() => setOnlyTalentPool(!onlyTalentPool)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
              onlyTalentPool
                ? 'bg-warning text-white border-warning shadow-2xs'
                : 'bg-surface-2 text-text-2 border-border-default hover:border-warning/50'
            }`}
          >
            {onlyTalentPool && <Check className="w-3 h-3" />}
            <span>بانک استعدادها</span>
          </button>

          {/* Results counter badge */}
          <span className="mr-auto text-[11px] text-text-3 font-bold">
            نمایش {toPersianDigits(filteredCandidates.length)} از {toPersianDigits(candidates.length)} کارجو
          </span>
        </div>
      </div>

      {/* Main Tab Content */}
      <div>
        {/* Bulk Screening Studio */}
        {activeTab === 'screening_studio' && (
          <BulkScreeningStudio
            job={jobs.find((j) => j.id === activeJobId) || jobs[0]}
            candidates={candidates}
            onUpdateCandidateStage={onUpdateCandidateStage}
            onToggleTalentPool={onToggleTalentPool}
            onDraftEmail={onDraftEmail}
            onUploadMore={() => setIsBulkModalOpen(true)}
            onClose={() => setActiveTab('kanban')}
          />
        )}

        {activeTab === 'kanban' && (
          <KanbanBoard
            candidates={filteredCandidates}
            onMoveStage={onUpdateCandidateStage}
            onScheduleInterview={(cand) => {
              setActiveTab('interviews');
            }}
            onDraftEmail={onDraftEmail}
            onToggleTalentPool={onToggleTalentPool}
            onSelectCompare={handleToggleCompare}
            selectedCompareIds={selectedCompareIds}
          />
        )}

        {/* Competitor 1: HireVue AI Video Studio */}
        {activeTab === 'hirevue_video' && (
          <HireVueVideoStudio
            jobs={jobs}
            activeJobId={activeJobId}
          />
        )}

        {/* Competitor 2: Eightfold AI Talent Intelligence & Skill Graph */}
        {activeTab === 'eightfold_skills' && (
          <EightfoldTalentIntelligence
            jobs={jobs}
            activeJobId={activeJobId}
          />
        )}

        {/* Competitor 3: ZipRecruiter Smart Sourcing & Syndication */}
        {activeTab === 'ziprecruiter_sourcing' && (
          <ZipRecruiterSmartSourcing
            jobs={jobs}
            activeJobId={activeJobId}
          />
        )}

        {activeTab === 'ai_agent' && (
          <AIAgentChat
            candidates={candidates}
            jobs={jobs}
            activeJobId={activeJobId}
            onApproveEmailDraft={(draft) => {
              alert(`پیش‌نویس ایمیل برای ${draft.candidateName} تایید و در کارتابل ذخیره شد.`);
            }}
          />
        )}

        {activeTab === 'evaluation_criteria' && (
          <EvaluationCriteriaManager
            jobs={jobs}
            activeJobId={activeJobId}
            onSelectJob={(id) => setActiveJobId(id)}
            onJobUpdated={(updatedJob) => {
              if (onJobUpdated) onJobUpdated(updatedJob);
            }}
          />
        )}

        {activeTab === 'jobs' && (
          <JobPostingsView
            jobs={jobs}
            activeJobId={activeJobId}
            onSelectJob={(id) => {
              setActiveJobId(id);
              setActiveTab('kanban');
            }}
            onCreateJob={onCreateJob}
            onConfigureCriteria={(id) => {
              setActiveJobId(id);
              setActiveTab('evaluation_criteria');
            }}
          />
        )}

        {activeTab === 'interviews' && (
          <InterviewCalendarView
            candidates={candidates}
            onScheduleInterview={onScheduleInterview}
          />
        )}

        {activeTab === 'talent_pool' && (
          <TalentPoolView
            candidates={candidates}
            onReactivateCandidate={(candId) => {
              onToggleTalentPool(candId, false);
              onUpdateCandidateStage(candId, CandidateStage.INITIAL_SCREENING);
              setActiveTab('kanban');
            }}
            onDraftEmail={onDraftEmail}
          />
        )}
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        jobs={jobs}
        activeJobId={activeJobId}
        onUploadComplete={(result) => {
          onBulkUploadSuccess(result);
        }}
        onJobCreated={(newJob) => {
          onCreateJob(newJob);
        }}
        onOpenStudio={(jobId) => {
          setActiveJobId(jobId);
          setActiveTab('screening_studio');
          setIsBulkModalOpen(false);
        }}
      />

      {/* Candidate Compare Modal */}
      <CandidateCompareModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        candidates={selectedCompareCandidates}
        onDraftEmail={onDraftEmail}
      />
    </div>
  );
};
