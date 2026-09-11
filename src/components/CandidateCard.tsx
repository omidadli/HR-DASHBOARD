import React from 'react';
import { CheckCircle2, AlertTriangle, FileText, Quote } from 'lucide-react';
import { CandidateEvaluation, JobUnderstanding } from '../types/screening';
import { toPersianDigits } from '../lib/normalizeFa';

interface CandidateCardProps {
  rank: number;
  fileName: string;
  evaluation: CandidateEvaluation;
  jobUnderstanding: JobUnderstanding;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  rank,
  fileName,
  evaluation,
  jobUnderstanding,
}) => {
  const { interview, review } = jobUnderstanding.thresholds;
  const score = evaluation.score;

  // Determine visual color scheme based on dynamic thresholds
  let scoreColorClass = 'text-danger bg-danger-soft border-danger/30';
  let badgeClass = 'bg-danger-soft text-danger border-danger/30';
  let badgeLabel = 'رد شود 🔴';

  if (score >= interview) {
    scoreColorClass = 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500/40';
    badgeClass = 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-500/40';
    badgeLabel = 'مصاحبه شود ✅';
  } else if (score >= review) {
    scoreColorClass = 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-500/40';
    badgeClass = 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-500/40';
    badgeLabel = 'بررسی بیشتر 🟡';
  }

  const displayName = evaluation.candidateName || `کاندید ${toPersianDigits(rank)}`;

  return (
    <div
      className="w-full bg-surface-1 rounded-2xl border border-border-default p-4 sm:p-5 flex flex-col gap-4 shadow-xs hover:border-brand/40 transition-all text-right print-break-inside-avoid"
      dir="rtl"
    >
      {/* Top Header: Rank, Candidate Name & File, Score, Recommendation Badge */}
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Rank Badge */}
          <div className="w-8 h-8 rounded-xl bg-surface-2 text-text-2 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-border-default">
            {toPersianDigits(rank)}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-text-1 truncate">
                {displayName}
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-text-3 font-mono mt-0.5">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate max-w-[280px]" title={fileName}>
                {fileName}
              </span>
            </div>
          </div>
        </div>

        {/* Big Score Box */}
        <div className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl border shrink-0 ${scoreColorClass}`}>
          <span className="text-2xl sm:text-3xl font-black font-mono leading-none">
            {toPersianDigits(score)}
          </span>
          <span className="text-[10px] font-bold mt-1 opacity-85">از ۱۰۰</span>
        </div>
      </div>

      {/* 2-3 line plain summary "چرا این امتیاز؟" */}
      <div className="bg-surface-2/60 p-3 sm:p-3.5 rounded-xl border border-border-default/70">
        <span className="text-xs font-bold text-text-2 block mb-1">
          چرا این امتیاز؟
        </span>
        <p className="text-xs sm:text-sm text-text-1 leading-relaxed">
          {evaluation.summary}
        </p>
      </div>

      {/* Strengths & Weaknesses Grid (Each with required evidence quote) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Strengths ✅ */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            <span>نقاط قوت کلیدی:</span>
          </span>

          {evaluation.strengths.length === 0 ? (
            <span className="text-xs text-text-3 italic">مورد شاخصی یافت نشد.</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {evaluation.strengths.slice(0, 4).map((str, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-surface-2/40 border border-border-default text-xs flex flex-col gap-1"
                >
                  <span className="font-bold text-text-1 leading-snug">
                    • {str.point}
                  </span>
                  {str.evidence && (
                    <div className="flex items-start gap-1 text-[11px] text-text-3 bg-surface-1 p-1.5 rounded-lg border border-border-default/60">
                      <Quote className="w-3 h-3 text-brand shrink-0 mt-0.5" />
                      <span className="italic leading-normal">«{str.evidence}»</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weaknesses ⚠️ */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            <span>کمبودها و موارد نیازمند بررسی:</span>
          </span>

          {evaluation.weaknesses.length === 0 ? (
            <span className="text-xs text-text-3 italic">کمبود شاخصی ثبت نشده است.</span>
          ) : (
            <div className="flex flex-col gap-1.5">
              {evaluation.weaknesses.slice(0, 4).map((wk, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-surface-2/40 border border-border-default text-xs flex flex-col gap-1"
                >
                  <span className="font-bold text-text-1 leading-snug">
                    • {wk.point}
                  </span>
                  {wk.evidence && (
                    <div className="flex items-start gap-1 text-[11px] text-text-3 bg-surface-1 p-1.5 rounded-lg border border-border-default/60">
                      <Quote className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                      <span className="italic leading-normal">{wk.evidence}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
