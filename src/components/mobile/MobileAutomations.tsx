import React, { useState } from 'react';
import {
  Zap,
  CheckCircle2,
  Clock,
  Play,
  RotateCw,
  Sparkles,
  ShieldCheck,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { HRAutomationTask } from '../../types';

interface MobileAutomationsProps {
  tasks: HRAutomationTask[];
  onRunTask: (taskId: string) => Promise<void>;
  onBack?: () => void;
}

export const MobileAutomations: React.FC<MobileAutomationsProps> = ({
  tasks,
  onRunTask,
  onBack,
}) => {
  const [runningTaskId, setRunningTaskId] = useState<string | null>(null);
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const handleExecute = async (taskId: string, title: string) => {
    setRunningTaskId(taskId);
    setRecentNotification(null);

    try {
      await onRunTask(taskId);
      setRecentNotification(`وظیفه «${title}» با موفقیت اجرا شد.`);
    } catch (err) {
      console.error(err);
      setRecentNotification(`خطا در اجرای وظیفه خودکار.`);
    } finally {
      setRunningTaskId(null);
      setTimeout(() => setRecentNotification(null), 4000);
    }
  };

  return (
    <div className="space-y-4 pb-14">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center cursor-pointer hover:bg-white/25"
              >
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-300" />
                <h1 className="text-sm sm:text-base font-black">
                  وظایف خودکار منابع انسانی
                </h1>
              </div>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                اجرای سریع فرایندهای پرتکرار منابع انسانی
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Metric Card */}
      <div className="bg-white rounded-2xl p-4 border border-emerald-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block">صرفه‌جویی ماهانه:</span>
            <span className="text-sm font-black text-emerald-800 font-mono">۱۲۸ ساعت</span>
          </div>
        </div>
        <div className="text-left bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <span className="text-[10px] text-emerald-700 font-bold block">دقت عملیاتی:</span>
          <span className="text-xs font-black text-emerald-800 font-mono">۹۹.۸٪</span>
        </div>
      </div>

      {/* Execution Notification Banner */}
      {recentNotification && (
        <div className="p-3 rounded-xl bg-emerald-700 text-white text-xs font-medium flex items-center gap-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
          <span>{recentNotification}</span>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const isRunning = runningTaskId === task.id;
          return (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 hover:border-emerald-300 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 inline-block mb-1">
                    {task.badge}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {task.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecute(task.id, task.title)}
                  disabled={isRunning}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer transition-all disabled:opacity-50 flex-shrink-0"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>در حال اجرا...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>اجرا</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {task.description}
              </p>

              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>صرفه‌جویی در زمان: </span>
                  <strong className="text-slate-700">{task.estimatedTimeSaved}</strong>
                </span>

                <span className="text-slate-400">
                  آخرین اجرا: {task.lastRunJalali || 'آماده اجرا'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
