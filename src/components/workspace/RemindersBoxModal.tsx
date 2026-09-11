import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  AlertTriangle,
  X,
  Volume2,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { HRReminderItem, HRTaskPriority, HRWorkspaceTask } from '../../types';
import { toPersianDigits, getTodayJalali, formatJalaliDate } from '../../utils/jalali';
import { playChimeSound } from '../../utils/audio';
import { showToast } from '../common/Toast';

interface RemindersBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminders: HRReminderItem[];
  onAddReminder: (reminder: HRReminderItem) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onSnoozeReminder: (id: string, minutes: number) => void;
  tasks?: HRWorkspaceTask[];
}

export const RemindersBoxModal: React.FC<RemindersBoxModalProps> = ({
  isOpen,
  onClose,
  reminders,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onSnoozeReminder,
  tasks = [],
}) => {
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDueDate, setNewDueDate] = useState<string>(() => {
    const today = getTodayJalali();
    return formatJalaliDate(today, false);
  });
  const [newDueTime, setNewDueTime] = useState<string>('11:00');
  const [newPriority, setNewPriority] = useState<HRTaskPriority>('HIGH');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  if (!isOpen) return null;

  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showToast('لطفاً عنوان یادآوری را وارد کنید', 'error');
      return;
    }

    const item: HRReminderItem = {
      id: `rem-${Date.now()}`,
      title: newTitle.trim(),
      dueDateJalali: newDueDate,
      dueTime: newDueTime,
      taskId: selectedTaskId || undefined,
      isCompleted: false,
      priority: newPriority,
      category: 'GENERAL_ADMIN',
    };

    onAddReminder(item);
    playChimeSound('alert');
    showToast('یادآوری جدید با موفقیت ثبت شد', 'success');

    // Reset
    setNewTitle('');
    setIsAddingNew(false);
  };

  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const completedReminders = reminders.filter((r) => r.isCompleted);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface-1 border border-border-default rounded-[20px] shadow-2xl p-6 space-y-4 text-right animate-scaleUp max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-[12px] bg-amber-500/15 text-amber-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-text-1">باکس یادآوری‌ها و هشدارهای سررسید</h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500/15 text-amber-700 border border-amber-500/30">
                  {toPersianDigits(activeReminders.length)} هشدار فعال
                </span>
              </div>
              <p className="text-[11px] text-text-3">مدیریت هشدارهای زمان‌دار مصاحبه‌ها، بیمه، تمدیدها و جلسات منابع انسانی</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => playChimeSound('bell')}
              className="p-2 rounded-[8px] text-text-3 hover:text-brand hover:bg-surface-2 cursor-pointer"
              title="تست صدای زنگ هشدار"
            >
              <Volume2 className="w-4 h-4" />
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

        {/* Quick Add Toggle / Form */}
        <div>
          {!isAddingNew ? (
            <button
              type="button"
              onClick={() => setIsAddingNew(true)}
              className="w-full py-2.5 px-4 rounded-[12px] bg-surface-2 hover:bg-brand hover:text-white border border-border-default text-xs font-black text-text-1 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن یادآوری اختصاصی جدید</span>
            </button>
          ) : (
            <form onSubmit={handleCreateReminder} className="p-4 rounded-[14px] bg-surface-2 border border-border-default space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-text-1">تعریف یادآوری جدید</span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-text-3 hover:text-text-1 text-xs cursor-pointer"
                >
                  انصراف
                </button>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="موضوع یادآوری (مثال: تماس با نماینده تامین اجتماعی اشتهارد)..."
                  className="w-full px-3 py-2 rounded-[10px] bg-surface-1 border border-border-default text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:border-brand"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] font-black text-text-3 mb-1">تاریخ (شمسی)</label>
                  <input
                    type="text"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    placeholder="۱۴۰۳/۱۲/۲۸"
                    className="w-full px-2 py-1.5 rounded-[8px] bg-surface-1 border border-border-default text-text-1 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-3 mb-1">ساعت یادآوری</label>
                  <input
                    type="text"
                    value={newDueTime}
                    onChange={(e) => setNewDueTime(e.target.value)}
                    placeholder="10:30"
                    className="w-full px-2 py-1.5 rounded-[8px] bg-surface-1 border border-border-default text-text-1 font-mono text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-text-3 mb-1">اولویت</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as HRTaskPriority)}
                    className="w-full px-2 py-1.5 rounded-[8px] bg-surface-1 border border-border-default text-text-1 text-xs focus:outline-none font-bold"
                  >
                    <option value="URGENT">فوری و حیاتی</option>
                    <option value="HIGH">بالا</option>
                    <option value="MEDIUM">متوسط</option>
                    <option value="LOW">عادی</option>
                  </select>
                </div>
              </div>

              {tasks.length > 0 && (
                <div>
                  <label className="block text-[10px] font-black text-text-3 mb-1">ارتباط با وظیفه (اختیاری):</label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-[8px] bg-surface-1 border border-border-default text-text-1 text-xs focus:outline-none"
                  >
                    <option value="">-- بدون پیوند به وظیفه مشخص --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  ذخیره یادآوری
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Reminders List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {activeReminders.length === 0 && completedReminders.length === 0 ? (
            <div className="p-8 text-center text-xs text-text-3 rounded-[12px] border border-dashed border-border-default">
              هیچ یادآوری فعالی ثبت نشده است.
            </div>
          ) : (
            <>
              {activeReminders.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-[12px] bg-surface-2 border border-border-default hover:border-amber-500/40 transition-all flex items-start gap-3 group"
                >
                  <button
                    type="button"
                    onClick={() => onToggleReminder(r.id)}
                    className="mt-0.5 text-text-3 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                    title="علامت‌گذاری به عنوان انجام‌شده"
                  >
                    <Circle className="w-4 h-4" />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-xs text-text-1">{r.title}</span>
                      {r.priority === 'URGENT' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-500/15 text-rose-600">
                          فوری
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-text-3 flex-wrap">
                      <span className="flex items-center gap-1 font-bold">
                        <Calendar className="w-3 h-3 text-brand" />
                        {toPersianDigits(r.dueDateJalali)}
                      </span>
                      <span className="flex items-center gap-1 font-bold">
                        <Clock className="w-3 h-3 text-amber-500" />
                        {toPersianDigits(r.dueTime)}
                      </span>
                      {r.note && <span>{r.note}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onSnoozeReminder(r.id, 60);
                        showToast('یادآوری برای ۱ ساعت به تعویق افتاد', 'info');
                      }}
                      className="px-2 py-1 rounded-[6px] bg-surface-1 border border-border-default text-[10px] font-bold text-text-3 hover:text-text-1 cursor-pointer"
                      title="به تعویق انداختن (۱ ساعت)"
                    >
                      تعویق ۱ ساعته
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteReminder(r.id)}
                      className="p-1.5 rounded-[6px] text-text-3 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="حذف یادآوری"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {completedReminders.length > 0 && (
                <div className="pt-3 border-t border-border-default/60 space-y-2">
                  <span className="text-[11px] font-bold text-text-3 block">
                    انجام‌شده‌ها ({toPersianDigits(completedReminders.length)} مورد):
                  </span>
                  {completedReminders.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-[10px] bg-surface-2/50 border border-border-default/60 flex items-center justify-between text-xs opacity-60"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className="w-4 h-4 text-emerald-600 cursor-pointer"
                          onClick={() => onToggleReminder(r.id)}
                        />
                        <span className="line-through text-text-3">{r.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteReminder(r.id)}
                        className="text-text-3 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border-default text-xs text-text-3">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>آلارم‌ها به صورت صوتی و اعلان در محیط کارتابل فعال هستند</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[8px] bg-surface-2 hover:bg-surface-3 text-text-1 font-black cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
