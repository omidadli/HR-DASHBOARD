import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  CheckCircle2,
  Clock,
  Sparkles,
  Minimize2,
  Maximize2,
  CheckSquare,
} from 'lucide-react';
import { HRWorkspaceTask } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { playChimeSound } from '../../utils/audio';
import { showToast } from '../common/Toast';

export type PomodoroMode = 'work' | 'short_break' | 'long_break';

const MODE_DURATIONS: Record<PomodoroMode, { label: string; durationSec: number; color: string }> = {
  work: { label: 'تمرکز عمیق (کار)', durationSec: 25 * 60, color: 'text-rose-500' },
  short_break: { label: 'استراحت کوتاه', durationSec: 5 * 60, color: 'text-emerald-500' },
  long_break: { label: 'استراحت طولانی', durationSec: 15 * 60, color: 'text-blue-500' },
};

interface PomodoroFocusModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: HRWorkspaceTask[];
  selectedTaskId?: string;
  onSelectTaskId?: (id: string) => void;
  onMarkTaskCompleted?: (id: string) => void;
}

export const PomodoroFocusModal: React.FC<PomodoroFocusModalProps> = ({
  isOpen,
  onClose,
  tasks,
  selectedTaskId,
  onSelectTaskId,
  onMarkTaskCompleted,
}) => {
  const [mode, setMode] = useState<PomodoroMode>('work');
  const [timeLeft, setTimeLeft] = useState<number>(MODE_DURATIONS.work.durationSec);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [completedSessions, setCompletedSessions] = useState<number>(() => {
    const saved = localStorage.getItem('hr_pomodoro_sessions');
    return saved ? parseInt(saved, 10) : 2;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const activeTask = tasks.find((t) => t.id === selectedTaskId);

  // Interval timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (soundEnabled) {
              playChimeSound('bell');
            }
            if (mode === 'work') {
              const newCount = completedSessions + 1;
              setCompletedSessions(newCount);
              localStorage.setItem('hr_pomodoro_sessions', String(newCount));
              showToast('🎉 تبریک! یک دور ۲۵ دقیقه‌ای تمرکز پومودورو با موفقیت انجام شد.', 'success');
            } else {
              showToast('☕ زمان استراحت به پایان رسید. آماده تمرکز بعدی شوید!', 'info');
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeLeft, mode, soundEnabled, completedSessions]);

  const handleSwitchMode = (newMode: PomodoroMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(MODE_DURATIONS[newMode].durationSec);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(MODE_DURATIONS[mode].durationSec);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = MODE_DURATIONS[mode].durationSec;
  const progressPct = ((totalDuration - timeLeft) / totalDuration) * 100;

  if (!isOpen) return null;

  // Minimized Floating Widget in Corner
  if (isMinimized) {
    return createPortal(
      <div
        className="fixed bottom-6 left-6 z-[99999] bg-surface-1 border-2 border-brand/50 rounded-[18px] p-3 shadow-2xl flex items-center gap-3 animate-scaleUp text-right"
        dir="rtl"
      >
        <div className="w-10 h-10 rounded-full bg-brand-soft text-brand flex items-center justify-center font-black text-xs">
          🍅 {toPersianDigits(completedSessions)}
        </div>
        <div>
          <div className="text-xs font-black text-text-1">
            {MODE_DURATIONS[mode].label}
          </div>
          <div className="text-sm font-black font-mono text-brand">
            {toPersianDigits(timeFormatted)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 border-r border-border-default pr-2">
          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className="p-2 rounded-[10px] bg-brand text-white hover:bg-brand-hover cursor-pointer"
            title={isRunning ? 'توقف' : 'شروع'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-[10px] bg-surface-2 text-text-3 hover:text-text-1 cursor-pointer"
            title="بزرگ‌نمایی"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-[10px] bg-surface-2 text-text-3 hover:text-rose-600 cursor-pointer"
            title="بستن"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // Full Screen Centered Modal (Using createPortal to document.body so zero scroll is required!)
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface-1 border border-border-default rounded-[20px] shadow-2xl p-6 space-y-5 text-right relative animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-default">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍅</span>
            <div>
              <h3 className="text-base font-black text-text-1">تایمر تمرکز پومودورو منابع انسانی</h3>
              <p className="text-[11px] text-text-3">برای تمرکز عمیق روی تسک‌های مهم و پرمسئولیت</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-[8px] text-text-3 hover:text-text-1 hover:bg-surface-2 cursor-pointer"
              title="کوچک کردن به گوشه تصویر"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[8px] text-text-3 hover:text-text-1 hover:bg-surface-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-[12px] bg-surface-2 text-xs font-black">
          <button
            type="button"
            onClick={() => handleSwitchMode('work')}
            className={`py-2 rounded-[10px] transition-all cursor-pointer ${
              mode === 'work'
                ? 'bg-surface-1 text-rose-600 shadow-xs border border-border-default'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            تمرکز (۲۵ دقیقه)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('short_break')}
            className={`py-2 rounded-[10px] transition-all cursor-pointer ${
              mode === 'short_break'
                ? 'bg-surface-1 text-emerald-600 shadow-xs border border-border-default'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            استراحت (۵ دقیقه)
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('long_break')}
            className={`py-2 rounded-[10px] transition-all cursor-pointer ${
              mode === 'long_break'
                ? 'bg-surface-1 text-blue-600 shadow-xs border border-border-default'
                : 'text-text-3 hover:text-text-1'
            }`}
          >
            استراحت طولانی (۱۵)
          </button>
        </div>

        {/* Timer Display Display */}
        <div className="py-6 flex flex-col items-center justify-center rounded-[18px] bg-surface-2/60 border border-border-default relative overflow-hidden">
          {/* Progress fill */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1.5 bg-brand transition-all duration-1000"
            style={{ width: `${progressPct}%` }}
          />

          <div className="text-5xl sm:text-6xl font-black font-mono tracking-widest text-text-1 mb-2">
            {toPersianDigits(timeFormatted)}
          </div>
          <span className="text-xs font-bold text-text-3">
            {isRunning ? 'در حال اجرا...' : 'متوقف'}
          </span>
        </div>

        {/* Task Assignment Context */}
        <div className="p-3 rounded-[12px] bg-surface-2 border border-border-default text-xs space-y-1.5">
          <span className="text-text-3 font-bold block">وظیفه در حال تمرکز:</span>
          <select
            value={selectedTaskId || ''}
            onChange={(e) => onSelectTaskId?.(e.target.value)}
            className="w-full p-2 rounded-[8px] bg-surface-1 border border-border-default text-text-1 font-bold focus:outline-none"
          >
            <option value="">-- تمرکز عمومی روی امور منابع انسانی --</option>
            {tasks
              .filter((t) => t.status !== 'DONE')
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.dueDateJalali})
                </option>
              ))}
          </select>

          {activeTask && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-text-3 font-bold truncate max-w-[220px]">
                مسئول: {activeTask.assigneeName}
              </span>
              {onMarkTaskCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    onMarkTaskCompleted(activeTask.id);
                    showToast('وظیفه انتخابی تکمیل شد', 'success');
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-bold hover:underline cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>تکمیل این تسک</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="p-3 rounded-[12px] bg-surface-2 hover:bg-surface-3 text-text-3 hover:text-text-1 border border-border-default transition-all cursor-pointer"
            title="بازنشانی تایمر"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsRunning(!isRunning)}
            className="flex-1 py-3 px-6 rounded-[14px] bg-brand hover:bg-brand-hover text-white font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span>مکث و توقف</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>شروع تمرکز</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const nextSound = !soundEnabled;
              setSoundEnabled(nextSound);
              if (nextSound) playChimeSound('alert');
            }}
            className={`p-3 rounded-[12px] border transition-all cursor-pointer ${
              soundEnabled
                ? 'bg-brand-soft text-brand border-brand/30'
                : 'bg-surface-2 text-text-3 border-border-default'
            }`}
            title={soundEnabled ? 'صدای زنگ فعال است' : 'بی‌صدا'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs pt-3 border-t border-border-default text-text-3">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>پومودوروهای تکمیل‌شده امروز:</span>
          </span>
          <span className="font-black text-text-1 bg-surface-2 px-2.5 py-0.5 rounded-full">
            🍅 {toPersianDigits(completedSessions)} دور تمرکز
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
};
