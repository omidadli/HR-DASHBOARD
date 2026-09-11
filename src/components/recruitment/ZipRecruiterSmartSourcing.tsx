/**
 * سامانه جذب هوشمند، انتشار همزمان و غربالگری سریع (الهام‌گرفته از ZipRecruiter با کاربری فوق‌العاده سریع)
 * AI Smart Sourcing ("Phil" Assistant), 1-Click "Invite to Apply", Multi-Channel Syndication & Knockout Questions
 */

import React, { useState, useEffect } from 'react';
import {
  SourcedCandidate,
  JobSyndicationChannel,
  KnockoutQuestion,
  JobPosting,
} from '../../types';
import { toPersianDigits, formatToman } from '../../utils/jalali';
import { showToast } from '../common/Toast';
import { Skeleton, SkeletonCard } from '../ui/Skeleton';
import { EmptyState } from '../ui/EmptyState';
import {
  Zap,
  Send,
  Share2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Plus,
  Filter,
  Eye,
  MousePointer,
  Users,
  Building2,
  Briefcase,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  BadgeAlert,
  MessageSquare,
} from 'lucide-react';

interface ZipRecruiterSmartSourcingProps {
  jobs: JobPosting[];
  activeJobId: string;
}

export const ZipRecruiterSmartSourcing: React.FC<ZipRecruiterSmartSourcingProps> = ({
  jobs,
  activeJobId,
}) => {
  const [activeTab, setActiveTab] = useState<'sourcing' | 'syndication' | 'knockout'>('sourcing');
  const [sourcedList, setSourcedList] = useState<SourcedCandidate[]>([]);
  const [channels, setChannels] = useState<JobSyndicationChannel[]>([]);
  const [knockoutList, setKnockoutList] = useState<KnockoutQuestion[]>([]);
  const [selectedCandidateForInvite, setSelectedCandidateForInvite] = useState<SourcedCandidate | null>(null);
  const [inviteCustomText, setInviteCustomText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // New knockout question modal
  const [isAddingKq, setIsAddingKq] = useState(false);
  const [newKqText, setNewKqText] = useState('');
  const [newKqExplanation, setNewKqExplanation] = useState('');

  const activeJob = jobs.find((j) => j.id === activeJobId) || jobs[0];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [srcRes, synRes, kqRes] = await Promise.all([
        fetch('/api/competitor/ziprecruiter/sourced-candidates').then((r) => r.json()),
        fetch('/api/competitor/ziprecruiter/syndication').then((r) => r.json()),
        fetch('/api/competitor/ziprecruiter/knockout-questions').then((r) => r.json()),
      ]);
      setSourcedList(srcRes || []);
      setChannels(synRes || []);
      setKnockoutList(kqRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInvite = (candidate: SourcedCandidate) => {
    setSelectedCandidateForInvite(candidate);
    setInviteCustomText(
      `جناب/سرکار ${candidate.fullName} عزیز، سوابق درخشان شما در شرکت ${candidate.currentCompany} توجه تیم منابع انسانی هلدینگ سیلانه سبز (برندهای دافی، کامان، میس‌ویک و کاپوت) را جلب کرده است. مایلیم شما را به بررسی فرصت شغلی «${activeJob?.title || 'کارشناس ارشد'}» دعوت کنیم.`
    );
  };

  const handleSendInvite = async () => {
    if (!selectedCandidateForInvite) return;
    try {
      const res = await fetch('/api/competitor/ziprecruiter/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: selectedCandidateForInvite.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSourcedList((prev) =>
          prev.map((c) =>
            c.id === selectedCandidateForInvite.id
              ? { ...c, status: 'INVITED', invitedAtJalali: 'امروز - لحظاتی پیش' }
              : c
          )
        );
        showToast(
          `دعوت‌نامه اختصاصی هلدینگ سیلانه سبز برای ${selectedCandidateForInvite.fullName} ارسال شد`,
          'success'
        );
        setSelectedCandidateForInvite(null);
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در ارسال دعوت‌نامه', 'error');
    }
  };

  const handleToggleChannel = async (channel: JobSyndicationChannel) => {
    const nextStatus = channel.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch('/api/competitor/ziprecruiter/toggle-syndication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.id, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setChannels((prev) =>
          prev.map((c) => (c.id === channel.id ? data.channel : c))
        );
        showToast(
          `وضعیت انتشار در پلتفرم ${channel.platformName} به روزرسانی شد`,
          'info'
        );
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در تغییر وضعیت کانال انتشار', 'error');
    }
  };

  const handleAddKnockout = async () => {
    if (!newKqText.trim()) return;
    try {
      const res = await fetch('/api/competitor/ziprecruiter/knockout-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newKqText,
          requiredAnswer: true,
          isDealBreaker: true,
          explanation: newKqExplanation || 'الزام موقعیت شغلی کارخانجات سیلانه سبز',
        }),
      });
      const newKq = await res.json();
      setKnockoutList((prev) => [...prev, newKq]);
      setNewKqText('');
      setNewKqExplanation('');
      setIsAddingKq(false);
      showToast('سوال حذفی جدید با موفقیت به فرآیند غربالگری اضافه شد', 'success');
    } catch (err) {
      console.error(err);
      showToast('خطا در ذخیره سوال حذفی', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-56 rounded-lg" />
            <Skeleton className="h-6 w-32 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white p-5 sm:p-7 rounded-3xl border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 fill-emerald-300" />
              <span>موتور جذب هوشمند و انتشار چندکاناله (ZipRecruiter Smart Benchmark)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              سورسینگ آنی استعدادهای برتر، دعوت با ۱ کلیک و انتشار همزمان
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              با الهام از الگوریتم هوشمند ZipRecruiter، کارجویان برتر خارج از سازمان شناسایی شده، با ۱ کلیک دعوت‌نامه
              دریافت می‌کنند و آگهی استخدام با یک لمس در جابینجا، جاب‌ویژن، ایران‌تلنت و لینکدین منتشر می‌گردد.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('sourcing')}
              className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'sourcing'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>استعدادهای شکارشده (AI Sourcing)</span>
            </button>
            <button
              onClick={() => setActiveTab('syndication')}
              className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'syndication'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>انتشار همزمان آگهی</span>
            </button>
            <button
              onClick={() => setActiveTab('knockout')}
              className={`flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'knockout'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4 shrink-0" />
              <span>سوالات حذفی غربالگری</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: AI Smart Sourcing ("Phil" Assistant) */}
      {activeTab === 'sourcing' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>پیشنهادات هوشمند منطبق بر موقعیت «{activeJob?.title || 'موقعیت فعال'}»</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                استعدادهای کلیدی بازار که هنوز رزومه نفرستاده‌اند اما صلاحیت بیش از ۸۵٪ دارند
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
              {toPersianDigits(sourcedList.length)} استعداد برتر شناسایی‌شده
            </span>
          </div>

          {sourcedList.length === 0 ? (
            <div className="bg-surface-1 rounded-3xl border border-border-default p-8">
              <EmptyState
                icon={<Users className="w-8 h-8 text-text-3" />}
                title="استعدادی در این موقعیت یافت نشد"
                description="موتور هوشمند ZipRecruiter هنوز رزومه یا کاندیدای خارجی مناسبی برای این ردیف شغلی پیدا نکرده است."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {sourcedList.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-surface-1 rounded-3xl border border-border-default p-5 shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-border-default overflow-hidden flex items-center justify-center font-black text-text-1 text-sm">
                          {cand.fullName.split(' ')[0][0]}
                          {cand.fullName.split(' ')[1]?.[0]}
                        </div>
                        <div>
                          <div className="text-sm font-black text-text-1">{cand.fullName}</div>
                          <div className="text-xs text-text-3">{cand.currentRole}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-600">
                          {toPersianDigits(cand.matchScorePct)}٪
                        </div>
                        <span className="text-[10px] text-text-3 block">انطباق آنی</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-surface-2 border border-border-default space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-text-2">
                        <span>شرکت فعلی:</span>
                        <span className="font-bold text-text-1">{cand.currentCompany}</span>
                      </div>
                      <div className="flex items-center justify-between text-text-2">
                        <span>سابقه کار تخصصی:</span>
                        <span className="font-bold text-text-1">{toPersianDigits(cand.experienceYears)} سال</span>
                      </div>
                      <div className="flex items-center justify-between text-text-2">
                        <span>سکونت:</span>
                        <span className="font-bold text-text-1">{cand.location}</span>
                      </div>
                    </div>

                    {/* Top Skills */}
                    <div className="flex flex-wrap gap-1.5">
                      {cand.topSkills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border-default flex items-center justify-between gap-2">
                    <span className="text-[10px] text-text-3">{cand.lastActive}</span>

                    {cand.status === 'INVITED' ? (
                      <span className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>دعوت‌شده ({cand.invitedAtJalali})</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleOpenInvite(cand)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>دعوت به همکاری (۱ کلیک)</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Multi-Channel Job Syndication */}
      {activeTab === 'syndication' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                وضعیت انتشار همزمان در بسترهای برتر کاریابی (Multi-Job Board Syndication)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                مدیریت متمرکز آگهی‌های هلدینگ سیلانه سبز در سایت‌های معتبر ایران
              </p>
            </div>
            <div className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              کل رزومه‌های ورودی جذب همزمان: ۲۷۱ نفر
            </div>
          </div>

          {channels.length === 0 ? (
            <div className="bg-surface-1 rounded-3xl border border-border-default p-8">
              <EmptyState
                icon={<Share2 className="w-8 h-8 text-text-3" />}
                title="کانال انتشاری فعال نیست"
                description="هنوز هیچ کانال انتشاری برای ارسال خودکار آگهی در بسترهای کاریابی ثبت نشده است."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channels.map((chan) => {
                const isActive = chan.status === 'ACTIVE';
                return (
                  <div
                    key={chan.id}
                    className="bg-surface-1 rounded-3xl border border-border-default p-5 shadow-xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl">{chan.platformLogo}</span>
                          <div>
                            <div className="text-sm font-black text-text-1">{chan.platformName}</div>
                            <div className="text-[11px] text-text-3">همگام‌سازی: {chan.lastSyncJalali}</div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleChannel(chan)}
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors active:scale-98 ${
                            isActive
                              ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-surface-2 text-text-3 border border-border-default'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                          <span>{isActive ? 'فعال و منتشر' : 'متوقف‌شده'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-surface-2 border border-border-default text-center">
                        <div>
                          <div className="text-[10px] text-text-3 flex items-center justify-center gap-0.5">
                            <Eye className="w-3 h-3" />
                            <span>بازدید</span>
                          </div>
                          <div className="text-xs font-black text-text-1 mt-1">
                            {toPersianDigits(chan.impressionsCount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-text-3 flex items-center justify-center gap-0.5">
                            <MousePointer className="w-3 h-3" />
                            <span>کلیک</span>
                          </div>
                          <div className="text-xs font-black text-text-1 mt-1">
                            {toPersianDigits(chan.clicksCount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                            <Users className="w-3 h-3" />
                            <span>رزومه</span>
                          </div>
                          <div className="text-xs font-black text-emerald-700 dark:text-emerald-400 mt-1">
                            {toPersianDigits(chan.applicationsReceived)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border-default flex items-center justify-between text-xs">
                      <span className="text-text-3">
                        هزینه درج آگهی: {formatToman(chan.costToman)} تومان
                      </span>
                      <button
                        onClick={() => showToast(`لینک آگهی در ${chan.platformName} کپی شد`, 'info')}
                        className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 font-bold flex items-center gap-1 text-[11px]"
                      >
                        <span>مشاهده در سایت</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Knockout Questions & Screening */}
      {activeTab === 'knockout' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                سوالات حذفی و غربالگری خودکار (Knockout Pre-screening Rules)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                رزومه‌هایی که به این شروط الزامی پاسخ منفی دهند به صورت خودکار به مرحله عدم تایید اولیه منتقل می‌شوند
              </p>
            </div>
            <button
              onClick={() => setIsAddingKq(true)}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن شرط حذفی جدید</span>
            </button>
          </div>

          {knockoutList.length === 0 ? (
            <div className="bg-surface-1 rounded-3xl border border-border-default p-8">
              <EmptyState
                icon={<Filter className="w-8 h-8 text-text-3" />}
                title="هیچ شرط حذفی تعریف نشده است"
                description="می‌توانید با تعریف شروط حذفی الزامی (مانند سابقه کار در کارخانجات یا امکان حضور شیفتی)، رزومه‌های غیرمنطبق را در ثانیه اول غربالگری کنید."
                actionLabel="افزودن شرط حذفی جدید"
                onAction={() => setIsAddingKq(true)}
              />
            </div>
          ) : (
            <div className="space-y-3">
              {knockoutList.map((kq) => (
                <div
                  key={kq.id}
                  className="p-4 rounded-2xl bg-surface-1 border border-border-default shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-[10px] font-black border border-rose-200 dark:border-rose-800">
                        شرط حذفی الزامی (Deal-Breaker)
                      </span>
                      <span className="text-xs font-bold text-text-1">{kq.question}</span>
                    </div>
                    <p className="text-xs text-text-3">{kq.explanation}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                      پاسخ مجاز: تایید کامل
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Modal */}
          {isAddingKq && (
            <div className="p-5 rounded-3xl bg-slate-50 border border-emerald-300 space-y-4 animate-in fade-in">
              <div className="text-sm font-black text-slate-900">تعریف سوال حذفی جدید</div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">متن سوال غربالگری:</label>
                  <input
                    type="text"
                    value={newKqText}
                    onChange={(e) => setNewKqText(e.target.value)}
                    placeholder="مثال: آیا دارای سابقه کار در کارخانجات دارویی یا آرایشی بهداشتی هستید؟"
                    className="w-full bg-surface-1 border border-border-default rounded-xl px-3.5 py-2 text-xs text-text-1 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-2 block mb-1">علت و الزام قانونی/سازمانی:</label>
                  <input
                    type="text"
                    value={newKqExplanation}
                    onChange={(e) => setNewKqExplanation(e.target.value)}
                    placeholder="الزام استانداردهای GMP و مقررات سازمان غذا و دارو"
                    className="w-full bg-surface-1 border border-border-default rounded-xl px-3.5 py-2 text-xs text-text-1 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsAddingKq(false)}
                  className="px-4 py-2 rounded-xl text-xs text-text-2 bg-surface-1 border border-border-default active:scale-98 transition-all"
                >
                  انصراف
                </button>
                <button
                  onClick={handleAddKnockout}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs active:scale-98 transition-all"
                >
                  افزودن و فعال‌سازی
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Modal (1-Click Invite to Apply) */}
      {selectedCandidateForInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-surface-1 rounded-3xl border border-border-default p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300">
                  <Send className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-black text-text-1">
                  ارسال دعوت‌نامه استخدامی به {selectedCandidateForInvite.fullName}
                </h4>
              </div>
              <button
                onClick={() => setSelectedCandidateForInvite(null)}
                className="text-text-3 hover:text-text-1 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-2 leading-relaxed">
              این پیام از طریق پیامک رسمی و ایمیل سازمانی هلدینگ سیلانه سبز همراه با لینک ویژه ثبت‌نام بدون نیاز به پر کردن فرم‌های تکراری برای کارجو ارسال خواهد شد:
            </p>

            <textarea
              value={inviteCustomText}
              onChange={(e) => setInviteCustomText(e.target.value)}
              rows={4}
              className="w-full bg-surface-2 border border-border-default rounded-2xl p-3.5 text-xs text-text-1 focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
            />

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                تطابق پیش‌بینی‌شده: {toPersianDigits(selectedCandidateForInvite.matchScorePct)}٪
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedCandidateForInvite(null)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-text-2 text-xs font-bold active:scale-98 transition-all"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSendInvite}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-98 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ارسال فوری دعوت‌نامه</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
