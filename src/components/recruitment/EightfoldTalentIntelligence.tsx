/**
 * سامانه هوش استعداد و گراف مهارت‌ها (الهام‌گرفته از Eightfold AI با طراحی لوکس سازمانی)
 * Deep Skill Graph, Predictive Candidate Matching, Learnability Index & Internal Talent Mobility
 */

import React, { useState, useEffect } from 'react';
import {
  CandidateSkillMatch,
  InternalMobilityMatch,
  JobPosting,
} from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { showToast } from '../common/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import {
  Network,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Users,
  Compass,
  Briefcase,
  Layers,
  ChevronLeft,
  Building2,
  GraduationCap,
  ShieldAlert,
} from 'lucide-react';

interface EightfoldTalentIntelligenceProps {
  jobs: JobPosting[];
  activeJobId: string;
}

export const EightfoldTalentIntelligence: React.FC<EightfoldTalentIntelligenceProps> = ({
  jobs,
  activeJobId,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'skills_graph' | 'internal_mobility'>('skills_graph');
  const [skillMatches, setSkillMatches] = useState<CandidateSkillMatch[]>([]);
  const [mobilityMatches, setMobilityMatches] = useState<InternalMobilityMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<CandidateSkillMatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [skillsRes, mobRes] = await Promise.all([
        fetch('/api/competitor/eightfold/skills').then((r) => r.json()),
        fetch('/api/competitor/eightfold/internal-mobility').then((r) => r.json()),
      ]);
      setSkillMatches(skillsRes || []);
      setMobilityMatches(mobRes || []);
      if (skillsRes && skillsRes.length > 0) {
        setSelectedMatch(skillsRes[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePromoteInternal = (mob: InternalMobilityMatch) => {
    showToast(
      `پیشنهاد ارتقای سازمانی ${mob.employeeName} برای موقعیت ${mob.targetJobTitle} به کمیته جذب هلدینگ ارسال شد`,
      'success'
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} className="h-28" />
            ))}
          </div>
          <div className="lg:col-span-7">
            <SkeletonCard className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-teal-950 to-slate-900 text-white p-5 sm:p-7 rounded-3xl border border-teal-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-300 text-xs font-bold">
              <Network className="w-3.5 h-3.5" />
              <span>پلتفرم هوش استعداد و پیش‌بینی مسیر شغلی (Eightfold AI Benchmark)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              گراف عمیق مهارت‌ها، پتانسیل یادگیری و جابجایی داخلی استعدادها
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              هوش مصنوعی با تحلیل مهارت‌های مجاور (Adjacent Skills)، سرعت یادگیری ۳۰ روزه کارجو را پیش‌بینی کرده
              و پیش از هرگونه استخدام بیرونی، کارمندان ۱,۳۵۰ نفری دافی، کامان، میس‌ویک و کاپوت را برای ارتقا اسکن می‌کند.
            </p>
          </div>

          {/* Sub-tab Switches */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab('skills_graph')}
              className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'skills_graph'
                  ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>گراف مهارت‌ها و تطابق هوشمند</span>
            </button>
            <button
              onClick={() => setActiveSubTab('internal_mobility')}
              className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeSubTab === 'internal_mobility'
                  ? 'bg-teal-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4 shrink-0" />
              <span>ارتقا و جابجایی داخلی هلدینگ</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black">
                ۳ مورد
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: Skills Graph & Learnability Hub */}
      {activeSubTab === 'skills_graph' && (
        skillMatches.length === 0 ? (
          <div className="bg-surface-1 rounded-3xl border border-border-default p-8">
            <EmptyState
              icon={<Network className="w-8 h-8 text-text-3" />}
              title="داده‌های گراف مهارت یافت نشد"
              description="ارزیابی مهارت‌های کارجویان برای این موقعیت شغلی هنوز تکمیل نشده است."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Candidates Fit List */}
            <div className="lg:col-span-5 space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-text-1 flex items-center gap-2">
                  <Network className="w-4 h-4 text-teal-600" />
                  <span>رتبه‌بندی تطابق شایستگی‌ها ({toPersianDigits(skillMatches.length)})</span>
                </h3>
                <span className="text-[11px] text-text-3">شاخص شایستگی عمیق</span>
              </div>

              <div className="space-y-3">
              {skillMatches.map((match) => {
                const isSelected = selectedMatch?.candidateId === match.candidateId;
                return (
                  <div
                    key={match.candidateId}
                    onClick={() => setSelectedMatch(match)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-teal-500 shadow-md ring-2 ring-teal-500/20'
                        : 'bg-white hover:bg-slate-50 border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="text-sm font-black text-slate-900">{match.candidateName}</div>
                        <div className="text-xs text-slate-500">{match.targetJobTitle}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-teal-600">
                          {toPersianDigits(match.overallMatchPct)}٪
                        </div>
                        <span className="text-[10px] text-slate-400 block">تطابق کل مهارت‌ها</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      {match.matchedSkills.slice(0, 3).map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] font-bold border border-teal-200"
                        >
                          ✓ {skill}
                        </span>
                      ))}
                      {match.matchedSkills.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          +{toPersianDigits(match.matchedSkills.length - 3)} مهارت دیگر
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Interactive Skill Graph & Learnability Roadmap */}
          <div className="lg:col-span-7">
            {selectedMatch ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-7 shadow-xs space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-black text-slate-900">{selectedMatch.candidateName}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[11px] font-bold">
                        برند هدف: {selectedMatch.brand}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      پست هدف: {selectedMatch.targetJobTitle}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-center min-w-[90px]">
                      <div className="text-[10px] text-teal-700 font-bold">انطباق کل</div>
                      <div className="text-xl font-black text-teal-800">
                        {toPersianDigits(selectedMatch.overallMatchPct)}٪
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center min-w-[90px]">
                      <div className="text-[10px] text-emerald-700 font-bold">رشد مسیر شغلی</div>
                      <div className="text-xl font-black text-emerald-800">
                        {toPersianDigits(selectedMatch.trajectoryScore)}٪
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acquired Verified Skills */}
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>مهارت‌های احرازشده و تاییدشده (Verified Core Skills)</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.matchedSkills.map((skill, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs font-bold flex items-center gap-1.5 shadow-2xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Learnability & 30-Day Adjacent Skills (The Eightfold Killer Feature) */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border border-amber-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      <span>مهارت‌های مجاور و قابلیت یادگیری ۳۰ روزه (Learnability Index)</span>
                    </div>
                    <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                      پتانسیل رشد بالا
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    کارجو هم‌اکنون فاقد این مهارت‌ها در رزومه است، اما الگوریتم Eightfold با بررسی دانش پایه‌ای تشخیص
                    داده که ظرف کمتر از ۱ ماه قادر به تسلط کامل بر آن‌ها است:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMatch.learnableSkills30Days.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-bold shadow-2xs"
                      >
                        ⚡ {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skill Gap & Suggested Upskilling Courses */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <span>شکاف مهارتی (Skill Gap)</span>
                    </div>
                    <div className="space-y-1">
                      {selectedMatch.skillGap.map((gap, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>{gap}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-emerald-600" />
                      <span>دوره‌های پیشنهادی ارتقا</span>
                    </div>
                    <div className="space-y-1">
                      {selectedMatch.suggestedUpskillingCourses.map((course, idx) => (
                        <div key={idx} className="text-xs text-emerald-900 font-medium flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>{course}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-80 bg-surface-1 rounded-3xl border border-border-default flex flex-col items-center justify-center text-text-3 gap-2">
                <Network className="w-8 h-8 text-text-3" />
                <span className="text-xs font-bold">برای مشاهده گراف مهارت‌ها، یک کارجو را انتخاب کنید</span>
              </div>
            )}
          </div>
        </div>
        )
      )}

      {/* Mode 2: Internal Talent Mobility & Succession Planning */}
      {activeSubTab === 'internal_mobility' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-1">
                استعدادهای داخلی هلدینگ واجد شرایط ارتقا (Internal Career Progression)
              </h3>
              <p className="text-xs text-text-3 mt-0.5">
                تطابق هوشمند همکاران شاغل در دافی، کامان، میس‌ویک و کاپوت با موقعیت‌های خالی سازمانی
              </p>
            </div>
            <div className="text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-xl font-bold">
              صرفه‌جویی تخمینی در هزینه جذب بیرونی: ۴۵,۰۰۰,۰۰۰ تومان
            </div>
          </div>

          {mobilityMatches.length === 0 ? (
            <div className="bg-surface-1 rounded-3xl border border-border-default p-8">
              <EmptyState
                icon={<Compass className="w-8 h-8 text-text-3" />}
                title="موردی برای ارتقای داخلی یافت نشد"
                description="در حال حاضر هیچ کارمند واجد شرایطی برای انتقال یا ارتقا به این ردیف شغلی شناسایی نشده است."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mobilityMatches.map((mob) => (
                <div
                  key={mob.employeeId}
                  className="bg-surface-1 rounded-3xl border border-border-default p-5 shadow-xs hover:border-teal-400 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-base font-black text-text-1">{mob.employeeName}</div>
                        <div className="text-xs text-text-3">{mob.currentTitle}</div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-black">
                        {toPersianDigits(mob.internalMatchPct)}٪ تطابق
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface-2 border border-border-default space-y-2 text-xs">
                      <div className="flex items-center justify-between text-text-2">
                        <span>برند جاری:</span>
                        <span className="font-bold text-text-1">{mob.currentBrand}</span>
                      </div>
                      <div className="flex items-center justify-between text-text-2">
                        <span>موقعیت هدف جدید:</span>
                        <span className="font-bold text-teal-700 dark:text-teal-400">{mob.targetJobTitle}</span>
                      </div>
                      <div className="flex items-center justify-between text-text-2">
                        <span>سطح آمادگی ارتقا:</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                          {mob.readinessLevel === 'READY_NOW'
                            ? 'آماده انتصاب فوری'
                            : 'نیازمند دوره ۳ ماهه'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-text-2 leading-relaxed italic bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                      «{mob.managerRecommendationNote}»
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border-default flex items-center justify-between gap-2">
                    <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>ریسک خروج: {mob.retentionImpact === 'CRITICAL_HIGH' ? 'بالا (نیازمند نگهداشت)' : 'متوسط'}</span>
                    </span>

                    <button
                      onClick={() => handlePromoteInternal(mob)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-98 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                    >
                      <span>ارسال پیشنهاد ارتقا</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
