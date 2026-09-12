import React, { useEffect, useState } from 'react';
import { BookmarkPlus, X, Plus } from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { DEPARTMENTS } from '../../lib/departments';
import { Modal } from '../common/Modal';
import { toast } from '../common/Toast';
import { addToBank, removeFromBank } from '../../lib/api';

interface AddToBankModalProps {
  record: ResumeRecord | null;
  defaultDepartmentId: string;
  onClose: () => void;
  onSaved: (r: ResumeRecord) => void;
}

export const AddToBankModal: React.FC<AddToBankModalProps> = ({
  record,
  defaultDepartmentId,
  onClose,
  onSaved,
}) => {
  const [deptId, setDeptId] = useState(defaultDepartmentId);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setDeptId(record.bankDepartmentId || defaultDepartmentId);
      setNote(record.bankNote || '');
      setTags(record.bankTags && record.bankTags.length > 0 ? record.bankTags : record.tags.slice(0, 6));
      setTagInput('');
    }
  }, [record, defaultDepartmentId]);

  if (!record) return null;

  const addTag = (raw?: string) => {
    const v = (raw ?? tagInput).trim();
    if (v && !tags.includes(v) && tags.length < 10) setTags([...tags, v]);
    setTagInput('');
  };

  const save = async () => {
    setSaving(true);
    try {
      const { record: updated } = await addToBank(record.id, deptId, note, tags);
      toast(record.inBank ? 'اطلاعات در بانک به‌روزرسانی و منتقل شد' : 'به بانک رزومه اضافه شد ✓');
      onSaved(updated);
      onClose();
    } catch (e: any) {
      toast(e?.message || 'ثبت در بانک ممکن نشد', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      const { record: updated } = await removeFromBank(record.id);
      toast('از بانک رزومه خارج شد');
      onSaved(updated);
      onClose();
    } catch (e: any) {
      toast(e?.message || 'خروج از بانک ممکن نشد', 'error');
    } finally {
      setSaving(false);
    }
  };

  const isAlreadyInBank = Boolean(record.inBank);
  const currentDept = DEPARTMENTS.find((d) => d.id === record.bankDepartmentId);

  return (
    <Modal
      open={Boolean(record)}
      onClose={onClose}
      title={isAlreadyInBank ? 'مدیریت و جابه‌جایی در بانک رزومه' : 'افزودن به بانک رزومه'}
      icon={<BookmarkPlus className="w-5 h-5 text-brand" />}
      footer={
        <div className="w-full flex items-center justify-between gap-2">
          {isAlreadyInBank ? (
            <button
              type="button"
              onClick={remove}
              disabled={saving}
              className="px-3.5 py-2 rounded-control bg-danger-soft text-danger border border-[var(--danger-border)] text-xs font-bold cursor-pointer hover:bg-danger/10 disabled:opacity-60 transition-colors"
            >
              خروج از بانک
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-control bg-surface-2 text-text-2 text-xs font-bold cursor-pointer hover:bg-surface-3 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-5 py-2 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover disabled:opacity-60 shadow-xs"
            >
              {saving ? 'در حال ثبت…' : isAlreadyInBank ? 'به‌روزرسانی و جابه‌جایی' : 'افزودن به بانک'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {isAlreadyInBank && (
          <div className="p-3 rounded-control bg-warning-soft border border-warning/30 text-warning text-xs font-medium leading-relaxed">
            این رزومه قبلاً در بانک دپارتمان <strong className="font-bold">«{currentDept?.name || 'نامشخص'}»</strong> ذخیره شده است. با انتخاب دپارتمان زیر می‌توانید آن را جابه‌جا کرده و یادداشت یا برچسب‌های آن را به‌روز کنید.
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-text-1 block mb-1.5">دپارتمان مقصد</label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="w-full p-2.5 rounded-control bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs font-bold"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-text-1 block mb-1.5">
            برچسب‌ها <span className="text-text-3 font-normal">(پیشنهاد هوشا، قابل ویرایش)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs font-bold bg-brand-soft text-brand border border-brand/20 rounded-full pl-2 pr-2.5 py-1"
              >
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="cursor-pointer hover:opacity-75">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="برچسب جدید…"
              className="flex-1 p-2.5 rounded-control bg-surface-1 border border-border-default focus:border-brand outline-none text-xs"
            />
            <button
              type="button"
              onClick={() => addTag()}
              className="w-10 h-10 rounded-control bg-surface-2 border border-border-default flex items-center justify-center text-text-2 cursor-pointer hover:text-brand"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-text-1 block mb-1.5">
            یادداشت <span className="text-text-3 font-normal">(اختیاری)</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="مثلاً: برای فرصت سرپرستی فروش پاییز مناسب است…"
            className="w-full p-2.5 rounded-control bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs resize-y"
          />
        </div>
      </div>
    </Modal>
  );
};
