import React, { useState } from 'react';
import { JobPosting } from '../../types';
import { toPersianDigits, getTodayJalali, formatJalaliDate } from '../../utils/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { Modal } from '../ui/Modal';
import {
  Briefcase,
  Plus,
  MapPin,
  Building,
  Users,
  Calendar,
  Sparkles,
  Trash2,
  SlidersHorizontal,
} from 'lucide-react';

interface JobPostingsViewProps {
  jobs: JobPosting[];
  activeJobId: string;
  onSelectJob: (id: string) => void;
  onCreateJob: (newJob: Partial<JobPosting>) => void;
  onConfigureCriteria?: (id: string) => void;
}

export const JobPostingsView: React.FC<JobPostingsViewProps> = ({
  jobs,
  activeJobId,
  onSelectJob,
  onCreateJob,
  onConfigureCriteria,
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('فناوری اطلاعات');
  const [employmentType, setEmploymentType] = useState('تمام‌وقت');
  const [location, setLocation] = useState('تهران');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [dateJalali, setDateJalali] = useState(formatJalaliDate(getTodayJalali(), true));

  const [criteriaList, setCriteriaList] = useState<{ title: string; weight: number }[]>([
    { title: 'مهارت فنی تخصصی و معماری کد', weight: 40 },
    { title: 'سابقه کار و پروژه‌های مشابه', weight: 35 },
    { title: 'مهارت‌های ارتباطی و کار تیمی', weight: 25 },
  ]);

  const handleAddCriterion = () => {
    setCriteriaList([...criteriaList, { title: 'شاخص ارزیابی جدید', weight: 10 }]);
  };

  const handleRemoveCriterion = (idx: number) => {
    setCriteriaList(criteriaList.filter((_, i) => i !== idx));
  };

  const handleUpdateCriterion = (idx: number, field: 'title' | 'weight', val: any) => {
    const next = [...criteriaList];
    next[idx] = { ...next[idx], [field]: val };
    setCriteriaList(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onCreateJob({
      title,
      department,
      employmentType,
      location,
      description,
      requirements,
      createdAtJalali: dateJalali,
      criteria: criteriaList.map((c, i) => ({
        id: `c-custom-${Date.now()}-${i}`,
        title: c.title,
        weight: c.weight,
      })),
    });

    setIsCreateModalOpen(false);
    setTitle('');
    setDescription('');
    setRequirements('');
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-1 p-4 rounded-[16px] border border-border-default shadow-2xs">
        <div>
          <h2 className="text-sm font-extrabold text-text-1">موقعیت‌های شغلی فعال و بایگانی</h2>
          <p className="text-xs text-text-3">
            مدیریت ردیف‌های استخدامی و تنظیم وزن معیارهای ارزیابی هوش مصنوعی
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تعریف موقعیت شغلی جدید</span>
        </button>
      </div>

      {/* Jobs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((job) => {
          const isSelected = activeJobId === job.id;

          return (
            <div
              key={job.id}
              onClick={() => onSelectJob(job.id)}
              className={`bg-surface-1 rounded-[16px] p-4 border transition-all cursor-pointer shadow-2xs relative ${
                isSelected
                  ? 'border-brand ring-2 ring-brand/20'
                  : 'border-border-default hover:border-border-default/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-extrabold text-sm text-text-1 line-clamp-1">{job.title}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">
                  {job.status === 'ACTIVE' ? 'فعال' : 'بایگانی'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-text-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-text-3 shrink-0" />
                  <span className="truncate">{job.department}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-text-3 shrink-0" />
                  <span>{job.location} • {job.employmentType}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-3 shrink-0" />
                  <span>تاریخ ایجاد: {toPersianDigits(job.createdAtJalali)}</span>
                </div>
              </div>

              {/* Evaluation criteria preview */}
              {job.criteria && job.criteria.length > 0 && (
                <div className="bg-surface-2 p-2.5 rounded-[10px] border border-border-default mb-3">
                  <div className="text-[11px] font-bold text-text-1 mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-brand" />
                    <span>شاخص‌های وزنی هوش مصنوعی ({toPersianDigits(job.criteria.length)} معیار):</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {job.criteria.map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-surface-1 border border-border-default text-text-2 font-medium"
                      >
                        {c.title} ({toPersianDigits(c.weight)}٪)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="pt-2.5 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1 text-text-2 font-medium">
                  <Users className="w-3.5 h-3.5 text-brand" />
                  <span>{toPersianDigits(job.applicationsCount)} رزومه دریافت شده</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onConfigureCriteria) {
                        onConfigureCriteria(job.id);
                      } else {
                        onSelectJob(job.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-brand-soft hover:bg-brand-soft/80 text-brand text-[11px] font-bold transition-all border border-brand/20 cursor-pointer"
                    title="تنظیم شاخصه‌ها، وزن‌ها و دستورالعمل هوش مصنوعی"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-brand" />
                    <span>ماتریس شاخص‌ها و وزن‌دهی AI</span>
                  </button>

                  <span
                    className={`text-[11px] font-bold ${
                      isSelected ? 'text-brand' : 'text-text-3'
                    }`}
                  >
                    {isSelected ? 'موقعیت فعال' : 'انتخاب'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Job Modal standardized with Modal primitive */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand" />
            <span>تعریف ردیف شغلی جدید با معیارهای ارزیابی Gemini</span>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-text-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-1 mb-1">
                عنوان شغل <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثلاً: مهندس ارشد دواپس و زیرساخت"
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-1 mb-1">
                واحد سازمانی / دپارتمان
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-1 mb-1">
                نوع همکاری
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="تمام‌وقت">تمام‌وقت</option>
                <option value="پاره‌وقت">پاره‌وقت</option>
                <option value="پروژه‌ای / قراردادی">پروژه‌ای / قراردادی</option>
                <option value="دورکاری">دورکاری</option>
              </select>
            </div>

            <div>
              <JalaliDatePicker
                label="تاریخ انتشار آگهی"
                value={dateJalali}
                onChange={(v) => setDateJalali(v)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-1 mb-1">
              شرح موقعیت شغلی و ماموریت‌ها
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح انتظارات و وظایف اصلی موقعیت..."
              className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            />
          </div>

          {/* Evaluation criteria & weights */}
          <div className="bg-surface-2 p-4 rounded-[12px] border border-border-default">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-text-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-brand" />
                <span>شاخص‌های وزنی ارزیابی هوش مصنوعی (مجموع وزن‌ها ۱۰۰٪):</span>
              </span>

              <button
                type="button"
                onClick={handleAddCriterion}
                className="text-[11px] font-bold text-brand hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>افزودن معیار</span>
              </button>
            </div>

            <div className="space-y-2">
              {criteriaList.map((crit, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={crit.title}
                    onChange={(e) => handleUpdateCriterion(idx, 'title', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs bg-surface-1 border border-border-default rounded-[8px] text-text-1 focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-text-3 font-medium">وزن:</span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={crit.weight}
                      onChange={(e) =>
                        handleUpdateCriterion(idx, 'weight', parseInt(e.target.value, 10) || 10)
                      }
                      className="w-14 px-2 py-1 text-xs bg-surface-1 border border-border-default rounded-[8px] text-center font-bold text-brand"
                    />
                    <span className="text-[11px] text-text-3">٪</span>
                  </div>
                  {criteriaList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCriterion(idx)}
                      className="p-1 text-text-3 hover:text-danger cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-text-2 hover:bg-surface-2 rounded-[10px] transition-colors cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white rounded-[10px] shadow-2xs transition-colors cursor-pointer"
            >
              ثبت و فعال‌سازی آگهی
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
