import React, { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, X, CheckCircle, Loader2 } from 'lucide-react';
import { ResumeFileItem } from '../../types/screening';
import { formatFileSize, toPersianDigits } from '../../lib/normalizeFa';
import { processUploadFiles } from '../../lib/extractText';

interface UploadZoneProps {
  files: ResumeFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<ResumeFileItem[]>>;
  disabled?: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ files, setFiles, disabled }) => {
  const [dragging, setDragging] = useState(false);
  const [unpacking, setUnpacking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | File[]) => {
    const raw = Array.from(list);
    if (!raw.length) return;
    setUnpacking(true);
    try {
      const unpacked = await processUploadFiles(raw);
      setFiles((prev) => {
        const keys = new Set(prev.map((f) => `${f.name}_${f.size}`));
        const added: ResumeFileItem[] = [];
        for (const file of unpacked) {
          const key = `${file.name}_${file.size}`;
          if (!keys.has(key)) {
            keys.add(key);
            added.push({
              id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              file,
              name: file.name,
              size: file.size,
              status: 'idle',
            });
          }
        }
        return [...prev, ...added];
      });
    } finally {
      setUnpacking(false);
    }
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled && e.dataTransfer.files?.length) await addFiles(e.dataTransfer.files);
  };

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) await addFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-card p-5 sm:p-7 text-center cursor-pointer transition-all flex flex-col items-center gap-2.5 ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${dragging ? 'border-brand bg-brand-soft/60 scale-[1.01]' : 'border-border-default bg-surface-1 hover:border-brand/50'}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.zip,.txt,.rtf,.md"
          onChange={onPick}
          className="hidden"
          disabled={disabled}
        />
        <div className="w-11 h-11 rounded-control bg-brand-soft text-brand flex items-center justify-center shadow-xs">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div className="text-sm sm:text-base font-bold text-text-1">
          رزومه‌ها را اینجا رها کنید یا برای انتخاب کلیک کنید
        </div>
        <div className="text-xs text-text-3">
          کشیدن و رها کردن یا کلیک برای انتخاب — PDF، Word، ZIP و TXT — بدون سقف تعداد
        </div>
      </div>

      {unpacking && (
        <div className="p-2.5 rounded-control bg-info-soft border border-info/30 text-info text-xs font-bold text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          در حال بازگشایی فایل فشرده…
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-surface-1 rounded-card border border-border-default p-3 flex flex-col gap-1.5 shadow-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-border-default text-xs text-text-3">
            <span className="font-bold text-text-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-brand" />
              {toPersianDigits(files.length)} رزومه آماده
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-danger font-bold hover:underline cursor-pointer"
              >
                حذف همه
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 pl-1">
            {files.map((f, i) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-surface-2/60 border border-border-default/70 text-[11px]"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="font-mono text-text-3 shrink-0">{toPersianDigits(i + 1)}.</span>
                  <FileText className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="font-bold text-text-1 truncate" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-text-3 font-mono shrink-0">({formatFileSize(f.size)})</span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-text-3 hover:text-danger hover:bg-danger-soft cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
