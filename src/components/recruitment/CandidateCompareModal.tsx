import React from 'react';
import { Candidate } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { Modal } from '../ui/Modal';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import { Sparkles, Star, Mail, CheckCircle2, User } from 'lucide-react';

interface CandidateCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidates: Candidate[];
  onDraftEmail: (candidate: Candidate, type: 'INVITATION' | 'REJECTION') => void;
}

export const CandidateCompareModal: React.FC<CandidateCompareModalProps> = ({
  isOpen,
  onClose,
  candidates,
  onDraftEmail,
}) => {
  if (!isOpen || candidates.length === 0) return null;

  // Extract all distinct criteria across candidates
  const allCriteria = new Set<string>();
  candidates.forEach((c) => {
    if (c.criteriaScores) {
      Object.keys(c.criteriaScores).forEach((crit) => allCriteria.add(crit));
    }
  });

  const criteriaList = Array.from(allCriteria);
  if (criteriaList.length === 0) {
    criteriaList.push(
      'تسلط فنی و تخصصی',
      'سابقه کار و پروژه‌های مرتبط',
      'کار تیمی و تعامل سازمانی',
      'حل مسئله و ابتکار عمل'
    );
  }

  const radarData = criteriaList.map((crit) => {
    const row: any = { criterion: crit };
    candidates.forEach((c) => {
      row[c.fullName] = c.criteriaScores?.[crit] || c.overallScore || 7.0;
    });
    return row;
  });

  const radarColors = ['#0f766e', '#2563eb', '#d97706', '#9333ea', '#dc2626'];

  const getInitials = (fullName: string) => {
    if (!fullName) return 'ک';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2);
    return `${parts[0][0] || ''} ${parts[1][0] || ''}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-brand-soft text-brand flex items-center justify-center font-bold border border-brand/20">
            <Sparkles className="w-5 h-5 text-brand" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-text-1">
              مقایسه تطبیقی کارجویان
            </h3>
            <p className="text-xs text-text-3">
              مقایسه شاخص‌های شایستگی، شواهد رزومه و نمرات تطابق
            </p>
          </div>
        </div>
      }
    >
      <div className="space-y-5 text-text-1">
        {/* Radar Chart Restyled with Brand Colors */}
        <div className="bg-surface-2/60 p-4 rounded-[14px] border border-border-default">
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#94a3b8" strokeOpacity={0.25} />
                <PolarAngleAxis
                  dataKey="criterion"
                  tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Vazirmatn' }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#94a3b8" strokeOpacity={0.25} />
                {candidates.map((cand, idx) => (
                  <Radar
                    key={cand.id}
                    name={cand.fullName}
                    dataKey={cand.fullName}
                    stroke={radarColors[idx % radarColors.length]}
                    fill={radarColors[idx % radarColors.length]}
                    fillOpacity={0.22}
                  />
                ))}
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    fontFamily: 'Vazirmatn',
                    paddingTop: '12px',
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-1, #ffffff)',
                    borderColor: 'var(--border-default, #e2e8f0)',
                    borderRadius: '10px',
                    fontFamily: 'Vazirmatn',
                    fontSize: '11px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Side-by-side Detailed Matrix Table */}
        <div className="overflow-x-auto border border-border-default rounded-[12px] shadow-2xs">
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-2 text-text-1 font-bold border-b border-border-default">
              <tr>
                <th className="p-3">شاخص ارزیابی</th>
                {candidates.map((c) => (
                  <th key={c.id} className="p-3 text-center">
                    <div className="font-extrabold text-text-1">{c.fullName}</div>
                    <div className="text-[11px] text-text-3 font-normal">{c.jobTitle}</div>
                    <div className="mt-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-brand-soft text-brand font-bold text-[10px] border border-brand/20">
                      <Star className="w-3 h-3 fill-current" />
                      <span>امتیاز کل: {toPersianDigits(c.overallScore || '-')}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default text-text-2">
              {criteriaList.map((crit) => (
                <tr key={crit} className="hover:bg-surface-2/50">
                  <td className="p-3 font-semibold text-text-1">{crit}</td>
                  {candidates.map((c) => {
                    const score = c.criteriaScores?.[crit] || c.overallScore || 7;
                    const isHigh = score >= 7;
                    const isMid = score >= 5 && score < 7;
                    return (
                      <td key={c.id} className="p-3 text-center font-bold">
                        <span
                          className={`px-2 py-1 rounded-[8px] text-[11px] border ${
                            isHigh
                              ? 'bg-success-soft text-success border-success/30'
                              : isMid
                              ? 'bg-warning-soft text-warning border-warning/30'
                              : 'bg-danger-soft text-danger border-danger/30'
                          }`}
                        >
                          {toPersianDigits(score)} از ۱۰
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Textual Quote evidence comparison */}
              <tr className="bg-surface-2/30">
                <td className="p-3 font-semibold text-text-1">نقل‌قول از رزومه</td>
                {candidates.map((c) => (
                  <td key={c.id} className="p-3 text-xs italic text-text-2 leading-relaxed">
                    «{c.resumeQuotes?.[0] || 'سابقه فعالیت در موقعیت مشابه'}»
                  </td>
                ))}
              </tr>

              {/* Actions row */}
              <tr>
                <td className="p-3 font-semibold text-text-1">اقدام</td>
                {candidates.map((c) => (
                  <td key={c.id} className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => onDraftEmail(c, 'INVITATION')}
                      className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-[8px] text-xs font-bold transition-colors inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Mail className="w-3 h-3" />
                      <span>تنظیم دعوت‌نامه</span>
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Candidate Summary Cards Below */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-bold text-text-1 flex items-center gap-1.5">
            <User className="w-4 h-4 text-brand" />
            <span>خلاصه ارزیابی کارجویان:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {candidates.map((c, idx) => {
              const isLocalEngine = (c as any).aiAvailable === false;
              const isHigh = (c.overallScore || 0) >= 7;
              const isMid = (c.overallScore || 0) >= 5 && (c.overallScore || 0) < 7;
              const badgeClass = isHigh
                ? 'bg-success-soft text-success border-success/30'
                : isMid
                ? 'bg-warning-soft text-warning border-warning/30'
                : 'bg-danger-soft text-danger border-danger/30';

              return (
                <div
                  key={c.id}
                  className="bg-surface-2/70 p-3.5 rounded-[12px] border border-border-default space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[8px] bg-brand-soft text-brand font-bold text-xs flex items-center justify-center border border-brand/20">
                        {getInitials(c.fullName)}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-text-1">{c.fullName}</div>
                        <div className="text-[10px] text-text-3">{c.jobTitle}</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-0.5">
                      <div className={`px-2 py-0.5 rounded-md border text-[11px] font-extrabold flex items-center gap-1 ${badgeClass}`}>
                        <Star className="w-3 h-3 fill-current" />
                        <span>{toPersianDigits(c.overallScore || '-')} / ۱۰</span>
                      </div>
                      {isLocalEngine && (
                        <span className="text-[8.5px] font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 px-1 rounded border border-amber-500/20">
                          موتور محلی
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Strengths preview */}
                  {c.strengths && c.strengths.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-text-2">نقاط قوت:</div>
                      <ul className="text-[10px] text-text-2 space-y-0.5 pr-2">
                        {c.strengths.slice(0, 2).map((s, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-1">
                            <span className="text-brand font-bold">•</span>
                            <span className="line-clamp-1">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Text evidence excerpt */}
                  {c.resumeQuotes && c.resumeQuotes[0] && (
                    <div className="text-[10px] italic text-text-2 bg-surface-1 p-2 rounded-[8px] border border-border-default line-clamp-2">
                      «{c.resumeQuotes[0]}»
                    </div>
                  )}

                  <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs">
                    <span className="text-[10px] text-text-3">
                      وضعیت: {c.stage}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDraftEmail(c, 'INVITATION')}
                      className="text-xs text-brand hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span>دعوت به مصاحبه</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal footer */}
        <div className="pt-3 border-t border-border-default flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-surface-2 hover:bg-surface-0 text-text-1 border border-border-default rounded-[10px] transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </Modal>
  );
};
