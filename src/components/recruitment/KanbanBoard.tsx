import React, { useState } from 'react';
import { Candidate, CandidateStage, CandidateCategory } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { Modal } from '../ui/Modal';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  Phone,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Quote,
  Star,
  Mail,
  GripVertical,
  AlertCircle,
  Lock,
  User,
  RotateCcw,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface KanbanBoardProps {
  candidates: Candidate[];
  onMoveStage: (candidateId: string, nextStage: CandidateStage) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onDraftEmail: (candidate: Candidate, type: 'INVITATION' | 'REJECTION') => void;
  onToggleTalentPool: (candidateId: string, inPool: boolean) => void;
  onSelectCompare: (candidate: Candidate) => void;
  selectedCompareIds: string[];
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  candidates,
  onMoveStage,
  onScheduleInterview,
  onDraftEmail,
  onToggleTalentPool,
  onSelectCompare,
  selectedCompareIds,
}) => {
  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null);
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<CandidateStage | null>(null);
  const [invalidCandidateId, setInvalidCandidateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stages: {
    key: CandidateStage;
    title: string;
    topAccent: string;
    badgeBg: string;
    icon: React.ElementType;
  }[] = [
    {
      key: CandidateStage.INITIAL_SCREENING,
      title: 'بررسی اولیه',
      topAccent: 'border-t-blue-500',
      badgeBg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
      icon: Clock,
    },
    {
      key: CandidateStage.PHONE_INTERVIEW,
      title: 'مصاحبه تلفنی',
      topAccent: 'border-t-amber-500',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      icon: Phone,
    },
    {
      key: CandidateStage.IN_PERSON_INTERVIEW,
      title: 'مصاحبه حضوری',
      topAccent: 'border-t-purple-500',
      badgeBg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
      icon: Calendar,
    },
    {
      key: CandidateStage.OFFER,
      title: 'پیشنهاد همکاری',
      topAccent: 'border-t-teal-500',
      badgeBg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
      icon: Award,
    },
    {
      key: CandidateStage.HIRED,
      title: 'استخدام شده',
      topAccent: 'border-t-emerald-600',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      icon: CheckCircle2,
    },
    {
      key: CandidateStage.REJECTED,
      title: 'رد شده',
      topAccent: 'border-t-rose-500',
      badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
      icon: XCircle,
    },
  ];

  const getInitials = (fullName: string) => {
    if (!fullName) return 'ک';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0] || ''} ${parts[1][0] || ''}`;
  };

  const getCategoryBadge = (category?: CandidateCategory) => {
    switch (category) {
      case CandidateCategory.INTERVIEW_PRIORITY:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-success-soft text-success border border-success/30 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            اولویت مصاحبه (بالای ۷)
          </span>
        );
      case CandidateCategory.NEEDS_REVIEW:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-warning-soft text-warning border border-warning/30">
            نیازمند بررسی (۵-۷)
          </span>
        );
      case CandidateCategory.INITIAL_REJECTION:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-danger-soft text-danger border border-danger/30">
            رد اولیه (زیر ۵)
          </span>
        );
      default:
        return null;
    }
  };

  const getScoreBadge = (score?: number, isLocal?: boolean) => {
    if (score === undefined || score === null) return null;
    const isHigh = score >= 7;
    const isMid = score >= 5 && score < 7;
    const colorClass = isHigh
      ? 'bg-success-soft text-success border-success/30'
      : isMid
      ? 'bg-warning-soft text-warning border-warning/30'
      : 'bg-danger-soft text-danger border-danger/30';

    return (
      <div className="flex flex-col items-end gap-0.5">
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-extrabold ${colorClass}`}>
          <Star className="w-3 h-3 fill-current" />
          <span>{toPersianDigits(score)}</span>
          <span className="text-[9px] font-normal opacity-70">/۱۰</span>
        </div>
        {isLocal && (
          <span className="text-[8.5px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20 whitespace-nowrap">
            ارزیابی محلی
          </span>
        )}
      </div>
    );
  };

  const validateStageMove = (cand: Candidate, targetStage: CandidateStage): { valid: boolean; reason?: string } => {
    if (cand.stage === targetStage) {
      return { valid: false };
    }

    // Moving to REJECTED: allowed from any stage except HIRED
    if (targetStage === CandidateStage.REJECTED) {
      if (cand.stage === CandidateStage.HIRED) {
        return { valid: false, reason: 'امکان رد کارجوی استخدام شده وجود ندارد.' };
      }
      return { valid: true };
    }

    // From REJECTED: can only move back to INITIAL_SCREENING ("بررسی مجدد")
    if (cand.stage === CandidateStage.REJECTED) {
      if (targetStage === CandidateStage.INITIAL_SCREENING) {
        return { valid: true };
      }
      return { valid: false, reason: 'پرونده رد شده فقط می‌تواند به بررسی اولیه بازگردد.' };
    }

    // Progression pipeline order
    const stageOrder = [
      CandidateStage.INITIAL_SCREENING,
      CandidateStage.PHONE_INTERVIEW,
      CandidateStage.IN_PERSON_INTERVIEW,
      CandidateStage.OFFER,
      CandidateStage.HIRED,
    ];

    const currentIdx = stageOrder.indexOf(cand.stage);
    const targetIdx = stageOrder.indexOf(targetStage);

    if (currentIdx === -1 || targetIdx === -1) {
      return { valid: false, reason: 'مرحله نامعتبر است.' };
    }

    // Cannot move backwards
    if (targetIdx < currentIdx) {
      return { valid: false, reason: 'بازگشت به مراحل قبلی امکان‌پذیر نیست.' };
    }

    // Cannot skip stages forward
    if (targetIdx > currentIdx + 1) {
      return { valid: false, reason: 'پرش از مراحل استخدام مجاز نیست؛ مراحل باید به ترتیب طی شوند.' };
    }

    // Moving to HIRED requires completed evaluation
    if (targetStage === CandidateStage.HIRED) {
      const evaluated =
        typeof cand.overallScore === 'number' &&
        !!cand.criteriaScores &&
        Object.keys(cand.criteriaScores).length > 0;
      if (!evaluated) {
        return { valid: false, reason: 'استخدام فقط پس از تکمیل ارزیابی و ثبت نمرات مجاز است.' };
      }
    }

    return { valid: true };
  };

  const handleDropOnStage = (targetStage: CandidateStage) => {
    if (!draggedCandidateId) return;
    const cand = candidates.find((c) => c.id === draggedCandidateId);
    setDragOverStage(null);
    setDraggedCandidateId(null);
    if (!cand) return;

    const validation = validateStageMove(cand, targetStage);
    if (!validation.valid) {
      if (validation.reason) {
        setErrorMessage(validation.reason);
        setInvalidCandidateId(cand.id);
        setTimeout(() => {
          setInvalidCandidateId(null);
        }, 700);
        setTimeout(() => {
          setErrorMessage(null);
        }, 4500);
      }
      return;
    }

    onMoveStage(cand.id, targetStage);
  };

  return (
    <div className="space-y-4">
      {/* Toast notification for invalid stage transitions */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="flex items-center justify-between gap-3 p-3.5 bg-danger-soft border border-danger/30 text-danger rounded-[12px] shadow-sm text-xs font-bold"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-danger" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-danger hover:opacity-80 px-2 py-0.5 text-xs font-normal"
            >
              بستن
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Horizontal RTL-scrollable board */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div className="flex gap-4 min-w-[1240px] xl:min-w-full items-start">
          {stages.map((stg) => {
            const Icon = stg.icon;
            const stageCandidates = candidates.filter((c) => c.stage === stg.key);
            const isDragOver = dragOverStage === stg.key;

            return (
              <div
                key={stg.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragOverStage !== stg.key) setDragOverStage(stg.key);
                }}
                onDragLeave={() => {
                  if (dragOverStage === stg.key) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnStage(stg.key);
                }}
                className={`flex-1 min-w-[215px] max-w-[260px] xl:max-w-none rounded-[14px] bg-surface-1 border border-border-default p-3 min-h-[520px] flex flex-col transition-all duration-200 ${stg.topAccent} border-t-4 ${
                  isDragOver
                    ? 'ring-2 ring-brand border-brand/50 bg-brand-soft/20 scale-[1.015] shadow-md'
                    : 'shadow-2xs'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-default">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-4 h-4 text-text-2 shrink-0" />
                    <span className="text-xs font-bold text-text-1 truncate">{stg.title}</span>
                  </div>
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full border ${stg.badgeBg}`}>
                    {toPersianDigits(stageCandidates.length)}
                  </span>
                </div>

                {/* Candidates List in Column */}
                <div className="space-y-2.5 flex-1">
                  {stageCandidates.map((cand) => {
                    const isSelectedForCompare = selectedCompareIds.includes(cand.id);
                    const isInvalid = invalidCandidateId === cand.id;
                    const isLocalEngine = (cand as any).aiAvailable === false;

                    return (
                      <motion.div
                        key={cand.id}
                        animate={
                          isInvalid
                            ? {
                                x: [-8, 8, -6, 6, -3, 3, 0],
                                transition: { duration: 0.5 },
                              }
                            : {}
                        }
                        draggable
                        onDragStart={(e: any) => {
                          setDraggedCandidateId(cand.id);
                          if (e.dataTransfer) {
                            e.dataTransfer.setData('text/plain', cand.id);
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedCandidateId(null);
                          setDragOverStage(null);
                        }}
                        className={`bg-surface-1 rounded-[12px] p-3 border shadow-2xs transition-all duration-200 relative cursor-grab active:cursor-grabbing hover:-translate-y-1 hover:shadow-md ${
                          isSelectedForCompare
                            ? 'border-brand ring-2 ring-brand/30'
                            : draggedCandidateId === cand.id
                            ? 'opacity-40 border-brand'
                            : isInvalid
                            ? 'border-danger ring-2 ring-danger/40 bg-danger-soft/10'
                            : 'border-border-default hover:border-border-strong'
                        }`}
                      >
                        {/* Top row: Drag Grip, Avatar, Name & Score */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-text-3 hover:text-text-2 cursor-grab shrink-0">
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <div className="w-7 h-7 rounded-full bg-brand-soft text-brand font-bold text-[10px] flex items-center justify-center shrink-0 border border-brand/20">
                              {getInitials(cand.fullName)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-text-1 truncate" title={cand.fullName}>
                                {cand.fullName}
                              </div>
                              <div className="text-[10px] text-text-3 truncate" title={cand.jobTitle}>
                                {cand.jobTitle || 'کارشناس تخصصی'}
                              </div>
                            </div>
                          </div>

                          {/* AI Score Badge */}
                          {cand.overallScore !== undefined && (
                            <div className="shrink-0">
                              {getScoreBadge(cand.overallScore, isLocalEngine)}
                            </div>
                          )}
                        </div>

                        {/* Category Badge */}
                        <div className="mb-2">{getCategoryBadge(cand.category)}</div>

                        {/* Evidence quote preview */}
                        {cand.resumeQuotes && cand.resumeQuotes.length > 0 && (
                          <div className="text-[10px] text-text-2 bg-surface-2 p-2 rounded-[8px] border border-border-default mb-2 italic line-clamp-2 leading-relaxed">
                            «{cand.resumeQuotes[0]}»
                          </div>
                        )}

                        {/* Scheduled interview badge if set */}
                        {cand.interviewJalali && (
                          <div className="text-[10px] font-medium text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-1 rounded-[8px] border border-purple-500/20 mb-2 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="truncate">{toPersianDigits(cand.interviewJalali)}</span>
                          </div>
                        )}

                        {/* Quick action buttons */}
                        <div className="pt-2 border-t border-border-default flex items-center justify-between gap-1 text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedCandidateForDetails(cand)}
                            className="text-[11px] text-brand hover:underline font-bold"
                          >
                            مشاهده جزئیات
                          </button>

                          <div className="flex items-center gap-1">
                            {/* Add to compare toggle */}
                            <button
                              type="button"
                              onClick={() => onSelectCompare(cand)}
                              className={`p-1 rounded-[8px] transition-colors ${
                                isSelectedForCompare
                                    ? 'bg-brand text-white shadow-2xs'
                                    : 'text-text-3 hover:text-text-1 hover:bg-surface-2'
                              }`}
                              title="انتخاب برای مقایسه"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>

                            {/* Schedule interview */}
                            <button
                              type="button"
                              onClick={() => onScheduleInterview(cand)}
                              className="p-1 text-text-3 hover:text-purple-600 hover:bg-purple-500/10 rounded-[8px] transition-colors"
                              title="تنظیم جلسه مصاحبه"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>

                            {/* Draft email */}
                            <button
                              type="button"
                              onClick={() =>
                                onDraftEmail(
                                  cand,
                                  cand.category === CandidateCategory.INITIAL_REJECTION ? 'REJECTION' : 'INVITATION'
                                )
                              }
                              className="p-1 text-text-3 hover:text-blue-600 hover:bg-blue-500/10 rounded-[8px] transition-colors"
                              title="تنظیم پیش‌نویس ایمیل"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Stage transition controls (forward-only, honest locked states) */}
                        <div className="mt-2 pt-2 border-t border-border-default flex items-center justify-between text-[10px] text-text-3">
                          {stg.key === CandidateStage.REJECTED ? (
                            <button
                              type="button"
                              onClick={() => onMoveStage(cand.id, CandidateStage.INITIAL_SCREENING)}
                              className="flex items-center gap-1 text-brand hover:underline font-bold"
                              title="بازگرداندن پرونده به بررسی اولیه"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>بررسی مجدد</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onMoveStage(cand.id, CandidateStage.REJECTED)}
                              className="text-text-3 hover:text-danger flex items-center gap-0.5 transition-colors"
                              title="رد کارجو"
                            >
                              <XCircle className="w-3 h-3 text-danger/70" />
                              <span>رد</span>
                            </button>
                          )}

                          {stg.key !== CandidateStage.REJECTED && stg.key !== CandidateStage.HIRED && (() => {
                            const currIdx = stages.findIndex((st) => st.key === stg.key);
                            const nextStage = stages[currIdx + 1]?.key;
                            if (!nextStage || nextStage === CandidateStage.REJECTED) return null;
                            const evaluated =
                              typeof cand.overallScore === 'number' &&
                              !!cand.criteriaScores &&
                              Object.keys(cand.criteriaScores).length > 0;
                            const hireBlocked = nextStage === CandidateStage.HIRED && !evaluated;

                            return (
                              <button
                                type="button"
                                disabled={hireBlocked}
                                title={
                                  hireBlocked
                                    ? 'استخدام فقط پس از تکمیل ارزیابی ممکن است'
                                    : undefined
                                }
                                onClick={() => onMoveStage(cand.id, nextStage)}
                                className={`flex items-center gap-1 font-bold transition-colors ${
                                  hireBlocked
                                    ? 'text-text-3 opacity-50 cursor-not-allowed'
                                    : 'text-brand hover:opacity-80'
                                }`}
                              >
                                {hireBlocked && <Lock className="w-2.5 h-2.5 text-text-3" />}
                                <span>{nextStage === CandidateStage.HIRED ? 'استخدام' : 'مرحله بعد'}</span>
                                <ArrowLeft className="w-3 h-3" />
                              </button>
                            );
                          })()}
                        </div>
                      </motion.div>
                    );
                  })}

                  {stageCandidates.length === 0 && (
                    <div className="h-32 flex flex-col items-center justify-center text-text-3 text-xs border border-dashed border-border-default rounded-[12px] p-3 text-center">
                      <span>موردی در این مرحله وجود ندارد</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate Details & Evidence Modal using standard Modal primitive */}
      {selectedCandidateForDetails && (
        <Modal
          isOpen={!!selectedCandidateForDetails}
          onClose={() => setSelectedCandidateForDetails(null)}
          size="xl"
          title={
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-brand-soft text-brand font-bold text-xs flex items-center justify-center border border-brand/30">
                {getInitials(selectedCandidateForDetails.fullName)}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-text-1">
                  {selectedCandidateForDetails.fullName}
                </h3>
                <p className="text-xs text-text-3">
                  {selectedCandidateForDetails.jobTitle || 'کارشناس تخصصی'} • {selectedCandidateForDetails.email} •{' '}
                  {toPersianDigits(selectedCandidateForDetails.phone)}
                </p>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-text-1">
            {/* AI Score and Category */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-2 rounded-[12px] border border-border-default">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-2">وضعیت ارزیابی:</span>
                {getCategoryBadge(selectedCandidateForDetails.category)}
              </div>

              {selectedCandidateForDetails.overallScore !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-2 font-medium">امتیاز ارزیابی:</span>
                  <span className="px-2.5 py-1 rounded-[10px] bg-brand-soft text-brand font-extrabold text-xs border border-brand/20">
                    {toPersianDigits(selectedCandidateForDetails.overallScore)} از ۱۰
                  </span>
                </div>
              )}
            </div>

            {/* Strengths */}
            {selectedCandidateForDetails.strengths?.length > 0 && (
              <div className="bg-success-soft/30 rounded-[12px] p-3.5 border border-success/30">
                <div className="text-xs font-bold text-success mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>نقاط قوت (ارزیابی هوشمند):</span>
                </div>
                <ul className="space-y-1.5 text-xs text-text-2">
                  {selectedCandidateForDetails.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-success font-bold shrink-0">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {selectedCandidateForDetails.weaknesses?.length > 0 && (
              <div className="bg-warning-soft/30 rounded-[12px] p-3.5 border border-warning/30">
                <div className="text-xs font-bold text-warning mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-warning" />
                  <span>زمینه‌های نیازمند بهبود:</span>
                </div>
                <ul className="space-y-1.5 text-xs text-text-2">
                  {selectedCandidateForDetails.weaknesses.map((w, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-warning font-bold shrink-0">•</span>
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quoted textual evidence from resume */}
            {selectedCandidateForDetails.resumeQuotes?.length > 0 && (
              <div className="bg-surface-2 rounded-[12px] p-3.5 border border-border-default">
                <div className="text-xs font-bold text-text-1 mb-2 flex items-center gap-1.5">
                  <Quote className="w-4 h-4 text-brand" />
                  <span>شواهد استخراج‌شده از رزومه:</span>
                </div>
                <div className="space-y-2 text-xs text-text-2">
                  {selectedCandidateForDetails.resumeQuotes.map((q, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-[10px] bg-surface-1 border border-border-default italic text-text-1 leading-relaxed"
                    >
                      «{q}»
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full resume excerpt */}
            <div className="bg-surface-2 rounded-[12px] p-3.5 border border-border-default">
              <div className="text-xs font-bold text-text-1 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-text-3" />
                <span>متن رزومه ({selectedCandidateForDetails.resumeFileName}):</span>
              </div>
              <p className="text-xs text-text-2 leading-relaxed whitespace-pre-wrap font-sans max-h-36 overflow-y-auto pr-1">
                {selectedCandidateForDetails.resumeText}
              </p>
            </div>

            {/* Talent pool toggle & Close */}
            <div className="pt-3 border-t border-border-default flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onToggleTalentPool(
                    selectedCandidateForDetails.id,
                    !selectedCandidateForDetails.inTalentPool
                  );
                  setSelectedCandidateForDetails({
                    ...selectedCandidateForDetails,
                    inTalentPool: !selectedCandidateForDetails.inTalentPool,
                  });
                }}
                className={`px-4 py-2 rounded-[10px] text-xs font-bold transition-colors flex items-center gap-2 ${
                  selectedCandidateForDetails.inTalentPool
                    ? 'bg-warning-soft text-warning border border-warning/30'
                    : 'bg-surface-2 hover:bg-surface-1 text-text-1 border border-border-default'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>
                  {selectedCandidateForDetails.inTalentPool
                    ? 'ذخیره شده در بانک استعدادها'
                    : 'افزودن به بانک استعدادها'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCandidateForDetails(null)}
                className="px-5 py-2 bg-brand text-white rounded-[10px] text-xs font-bold hover:bg-brand-hover shadow-sm transition-colors"
              >
                بستن
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
