import React, { useState } from 'react';
import { PerformanceGoal } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import {
  TrendingUp,
  Target,
  Plus,
  CheckCircle,
  Calendar,
  Award,
  Sliders,
} from 'lucide-react';

interface PerformanceModuleProps {
  goals: PerformanceGoal[];
  onUpdateProgress: (goalId: string, progress: number) => void;
  onCreateGoal: (newGoal: Partial<PerformanceGoal>) => void;
}

export const PerformanceModule: React.FC<PerformanceModuleProps> = ({
  goals,
  onUpdateProgress,
  onCreateGoal,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [targetMetric, setTargetMetric] = useState('');
  const [weight, setWeight] = useState(25);
  const [employeeName, setEmployeeName] = useState('مریم فتاحی');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    onCreateGoal({
      title,
      targetMetric: targetMetric || 'تحقق ۱۰۰٪ تارگت فصلی',
      weight: Number(weight) || 20,
      employeeName,
      currentProgress: 0,
      deadlineJalali: '۱۴۰۳/۰۹/۳۰',
    });

    setIsModalOpen(false);
    setTitle('');
    setTargetMetric('');
  };

  const avgProgress =
    goals.length > 0
      ? Math.round(goals.reduce((acc, g) => acc + g.currentProgress, 0) / goals.length)
      : 0;

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">مدیریت عملکرد و اهداف کلیدی (OKR / KPI)</h2>
          <p className="text-xs text-slate-500">
            پیگیری اهداف دوره‌ای، سنجه‌های کلیدی و درصد تحقق عملکرد کارکنان
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <Target className="w-4 h-4 text-emerald-600" />
            <span>میانگین تحقق: {toPersianDigits(avgProgress)}٪</span>
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت هدف جدید</span>
          </button>
        </div>
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400">
          <Target className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-bold text-slate-600">هنوز هدفی برای این دوره تعریف نشده است.</p>
          <p className="text-[11px] text-slate-400 mt-1">با کلیک بر روی «ثبت هدف جدید»، اولین هدف یا شاخص کلیدی را اضافه کنید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{goal.title}</h3>
                  <div className="text-[11px] text-slate-500 font-medium">{goal.employeeName}</div>
                </div>

                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  وزن: {toPersianDigits(goal.weight)}٪
                </span>
              </div>

              <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-bold text-slate-700">نتیجه کلیدی: </span>
                <span>{goal.targetMetric}</span>
              </div>

              {/* Progress Slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">میزان پیشرفت:</span>
                  <span className="font-extrabold text-emerald-800">
                    {toPersianDigits(goal.currentProgress)}٪
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={goal.currentProgress}
                  onChange={(e) => onUpdateProgress(goal.id, Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>مهلت: {toPersianDigits(goal.deadlineJalali)}</span>
                </div>

                {goal.currentProgress >= 100 && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>تکمیل شد</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Goal Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-200 mb-4">
              ثبت هدف عملکردی (OKR)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان هدف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: کاهش زمان پاسخگویی به درخواست‌ها"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">مسئول هدف</label>
                <input
                  type="text"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نتیجه کلیدی
                </label>
                <input
                  type="text"
                  value={targetMetric}
                  onChange={(e) => setTargetMetric(e.target.value)}
                  placeholder="مثال: رساندن زمان پاسخگویی به کمتر از ۱۵ دقیقه"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  وزن ارزیابی (٪)
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={weight}
                  onChange={(e) => setWeight(parseInt(e.target.value, 10) || 20)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  انصراف
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  ثبت هدف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
