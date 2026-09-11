import React, { useState } from 'react';
import { Candidate } from '../../types';
import { toPersianDigits, getTodayJalali, formatJalaliDate } from '../../utils/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { Modal } from '../ui/Modal';
import {
  Calendar,
  Phone,
  Plus,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';

interface InterviewCalendarViewProps {
  candidates: Candidate[];
  onScheduleInterview: (
    candidateId: string,
    interviewJalali: string,
    interviewType: string,
    notes?: string
  ) => void;
}

export const InterviewCalendarView: React.FC<InterviewCalendarViewProps> = ({
  candidates,
  onScheduleInterview,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState(candidates[0]?.id || '');
  const [interviewDate, setInterviewDate] = useState(formatJalaliDate(getTodayJalali(), true));
  const [interviewTime, setInterviewTime] = useState('۱۰:۳۰');
  const [interviewType, setInterviewType] = useState('مصاحبه فنی حضوری');
  const [interviewNotes, setInterviewNotes] = useState('');

  // Candidates that have an interview scheduled
  const scheduledList = candidates.filter((c) => c.interviewJalali);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidateId) return;

    const fullScheduleStr = `${interviewDate} ساعت ${interviewTime}`;
    onScheduleInterview(selectedCandidateId, fullScheduleStr, interviewType, interviewNotes);
    setIsModalOpen(false);
    setInterviewNotes('');
  };

  return (
    <div className="space-y-4">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-1 p-4 rounded-[16px] border border-border-default shadow-2xs">
        <div>
          <h2 className="text-sm font-extrabold text-text-1">تقویم جلسات مصاحبه و ارزیابی شایستگی</h2>
          <p className="text-xs text-text-3">
            برنامه‌ریزی جلسات ارزیابی با تقویم شمسی و ارسال یادآوری به داوطلبان
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تنظیم زمان مصاحبه جدید</span>
        </button>
      </div>

      {/* Scheduled interviews grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scheduledList.map((cand) => (
          <div
            key={cand.id}
            className="bg-surface-1 rounded-[16px] p-4 border border-border-default shadow-2xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-border-default">
              <div>
                <div className="font-extrabold text-sm text-text-1">{cand.fullName}</div>
                <div className="text-xs text-text-3">{cand.jobTitle}</div>
              </div>

              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">
                {cand.interviewType || 'مصاحبه فنی'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-text-2">
              <div className="flex items-center gap-2 text-brand font-bold bg-brand-soft/60 p-2.5 rounded-[10px] border border-brand/20">
                <Calendar className="w-4 h-4 text-brand shrink-0" />
                <span>زمان جلسه: {toPersianDigits(cand.interviewJalali)}</span>
              </div>

              <div className="flex items-center gap-2 text-text-2 px-1">
                <Phone className="w-3.5 h-3.5 text-text-3 shrink-0" />
                <span>تلفن تماس: {toPersianDigits(cand.phone)}</span>
              </div>

              {cand.interviewNotes && (
                <div className="bg-surface-2 p-2.5 rounded-[10px] border border-border-default text-[11px] text-text-2">
                  <div className="font-semibold text-text-1 mb-0.5">یادداشت مصاحبه‌کننده:</div>
                  <p className="line-clamp-2 leading-relaxed">{cand.interviewNotes}</p>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border-default flex items-center justify-between text-xs">
              <span className="text-[11px] text-success font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>هماهنگ‌شده با کارجو</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setSelectedCandidateId(cand.id);
                  setIsModalOpen(true);
                }}
                className="text-xs text-text-3 hover:text-text-1 font-semibold transition-colors cursor-pointer"
              >
                تغییر زمان
              </button>
            </div>
          </div>
        ))}

        {scheduledList.length === 0 && (
          <div className="col-span-full bg-surface-1 rounded-[16px] p-8 border border-dashed border-border-default text-center text-text-3 text-xs">
            <Calendar className="w-8 h-8 text-text-3/60 mx-auto mb-2" />
            <p>در حال حاضر هیچ مصاحبه‌ای زمان‌بندی نشده است.</p>
          </div>
        )}
      </div>

      {/* Schedule Interview Modal standardized with Modal primitive */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand" />
            <span>برنامه‌ریزی جلسه مصاحبه استخدامی (تقویم جلالی)</span>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-text-1">
          <div>
            <label className="block text-xs font-semibold text-text-1 mb-1">
              انتخاب کارجو <span className="text-danger">*</span>
            </label>
            <select
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-medium text-text-1"
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} - {c.jobTitle} (امتیاز: {toPersianDigits(c.overallScore || '-')})
                </option>
              ))}
            </select>
          </div>

          <div>
            <JalaliDatePicker
              label="تاریخ جلسه مصاحبه (شمسی)"
              value={interviewDate}
              onChange={(v) => setInterviewDate(v)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-1 mb-1">ساعت جلسه</label>
              <input
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-1 mb-1">نوع مصاحبه</label>
              <select
                value={interviewType}
                onChange={(e) => setInterviewType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30"
              >
                <option value="مصاحبه فنی حضوری">مصاحبه فنی حضوری</option>
                <option value="مصاحبه تلفنی اولیه">مصاحبه تلفنی اولیه</option>
                <option value="مصاحبه آنلاین ویدیویی">مصاحبه آنلاین ویدیویی</option>
                <option value="مصاحبه منابع انسانی و فرهنگ سازمانی">منابع انسانی و فرهنگ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-1 mb-1">
              ملاحظات و اعضای پنل مصاحبه
            </label>
            <textarea
              rows={2}
              value={interviewNotes}
              onChange={(e) => setInterviewNotes(e.target.value)}
              placeholder="مثلاً: هماهنگی با مدیر تیم فرانت‌اند جهت ارزیابی معماری کد..."
              className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-text-3"
            />
          </div>

          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-text-2 hover:bg-surface-2 rounded-[10px] transition-colors cursor-pointer"
            >
              انصراف
            </button>

            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white rounded-[10px] shadow-2xs transition-colors cursor-pointer"
            >
              ثبت قطعی در تقویم
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
