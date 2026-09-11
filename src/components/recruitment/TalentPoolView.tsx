import React, { useState } from 'react';
import { Candidate } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { Award, Search, Mail, ArrowRight, Star } from 'lucide-react';

interface TalentPoolViewProps {
  candidates: Candidate[];
  onReactivateCandidate: (candidateId: string) => void;
  onDraftEmail: (candidate: Candidate, type: 'INVITATION' | 'REJECTION') => void;
}

export const TalentPoolView: React.FC<TalentPoolViewProps> = ({
  candidates,
  onReactivateCandidate,
  onDraftEmail,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const poolCandidates = candidates.filter((c) => c.inTalentPool);
  const filtered = poolCandidates.filter(
    (c) =>
      c.fullName.includes(searchTerm) ||
      (c.jobTitle ?? '').includes(searchTerm) ||
      (c.talentPoolNotes?.includes(searchTerm) ?? false)
  );

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-surface-1 p-4 rounded-[16px] border border-border-default shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center font-bold border border-brand/20">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-text-1">استخر نخبگان و استعدادهای آینده (Talent Pool)</h2>
            <p className="text-xs text-text-3">
              رزومه‌های شایسته‌ای که در مصاحبه‌های قبلی حد نصاب را کسب کرده‌اند جهت موقعیت‌های توسعه‌ای آتی
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-text-3 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجوی نام یا مهارت..."
            className="w-full pr-9 pl-3 py-1.5 text-xs bg-surface-2 text-text-1 border border-border-default rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-sans placeholder:text-text-3"
          />
        </div>
      </div>

      {/* Grid of talent pool candidates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((cand) => (
          <div
            key={cand.id}
            className="bg-surface-1 rounded-[16px] p-4 border border-border-default shadow-2xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border-default">
              <div>
                <div className="font-extrabold text-sm text-text-1">{cand.fullName}</div>
                <div className="text-xs text-text-3">{cand.jobTitle}</div>
              </div>

              {cand.overallScore !== undefined && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-soft text-brand border border-brand/20 text-xs font-bold">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{toPersianDigits(cand.overallScore)}</span>
                </div>
              )}
            </div>

            {/* Talent pool note */}
            <div className="bg-surface-2 p-2.5 rounded-[10px] border border-border-default text-xs text-text-2">
              <div className="font-bold text-[11px] text-text-1 mb-1">علت ذخیره در استخر:</div>
              <p className="leading-relaxed font-medium">
                {cand.talentPoolNotes || 'شایستگی فنی بالا در ابزارهای مدرن؛ مناسب برای پروژه‌های توسعه‌ای جدید.'}
              </p>
            </div>

            {/* Strengths tags */}
            {cand.strengths && cand.strengths.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {cand.strengths.map((s, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 border border-border-default text-text-2 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => onDraftEmail(cand, 'INVITATION')}
                className="text-xs text-brand hover:underline font-bold flex items-center gap-1 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>ارسال دعوت مجدد</span>
              </button>

              <button
                type="button"
                onClick={() => onReactivateCandidate(cand.id)}
                className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <span>بازگشت به پایپ‌لاین</span>
                <ArrowRight className="w-3 h-3 rotate-180" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-surface-1 rounded-[16px] p-8 border border-dashed border-border-default text-center text-text-3 text-xs">
            <Award className="w-8 h-8 text-text-3/50 mx-auto mb-2" />
            <p>موردی مطابق با جستجوی شما در استخر استعدادها یافت نشد.</p>
          </div>
        )}
      </div>
    </div>
  );
};
