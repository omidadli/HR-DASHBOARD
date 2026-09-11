import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileText, X, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { ResumeFileItem } from '../types/screening';
import { formatFileSize, toPersianDigits } from '../lib/normalizeFa';
import { processUploadFiles } from '../lib/extractText';

interface StartScreenProps {
  jobDescription: string;
  setJobDescription: (val: string) => void;
  files: ResumeFileItem[];
  setFiles: React.Dispatch<React.SetStateAction<ResumeFileItem[]>>;
  onStart: () => void;
  serverError?: string;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  jobDescription,
  setJobDescription,
  files,
  setFiles,
  onStart,
  serverError,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUnpackingZip, setIsUnpackingZip] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle addition of raw files (including ZIP unpacking)
  const handleAddFiles = async (rawFileList: FileList | File[]) => {
    const rawArray = Array.from(rawFileList);
    if (rawArray.length === 0) return;

    setIsUnpackingZip(true);
    try {
      // Unpack ZIPs if any
      const unpacked = await processUploadFiles(rawArray);

      setFiles((prev) => {
        // Smart Deduplication: check if already exists by name and size
        const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
        const newItems: ResumeFileItem[] = [];

        for (const file of unpacked) {
          const key = `${file.name}_${file.size}`;
          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            newItems.push({
              id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              file,
              name: file.name,
              size: file.size,
              status: 'idle',
            });
          }
        }
        return [...prev, ...newItems];
      });
    } finally {
      setIsUnpackingZip(false);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleAddFiles(e.dataTransfer.files);
    }
  };

  const onFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleAddFiles(e.target.files);
      // Reset input value so same files can be re-selected if deleted
      e.target.value = '';
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleClearAllFiles = () => {
    setFiles([]);
  };

  const isJobEmpty = !jobDescription.trim();
  const hasNoFiles = files.length === 0;
  const canStart = !isJobEmpty && !hasNoFiles && !isUnpackingZip;

  // Guide hint under button
  let guideText = '';
  if (isJobEmpty && hasNoFiles) {
    guideText = 'اول بگو شغل چیه و رزومه‌ها رو اضافه کن 👆';
  } else if (isJobEmpty) {
    guideText = 'اول بگو شغل چیه 👆';
  } else if (hasNoFiles) {
    guideText = 'هنوز رزومه‌ای اضافه نکردی 👆';
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-10 flex flex-col gap-6 sm:gap-8" dir="rtl">
      {/* Title & Introduction */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand text-xs font-bold border border-brand/20 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>غربالگری هوشمند و بدون محدودیت</span>
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-text-1 tracking-tight">
          کدوم رزومه‌ها به این شغل می‌خورن؟
        </h1>
        <p className="text-sm sm:text-base text-text-3 max-w-lg leading-relaxed">
          فقط بنویس چه نیرویی می‌خوای و رزومه‌ها رو بریز اینجا؛ هوش مصنوعی بهترین‌ها رو برات جدا می‌کنه.
        </p>
      </div>

      {serverError && (
        <div className="p-4 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs sm:text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">خطای اتصال به سرور:</span>
            <span>{serverError}</span>
          </div>
        </div>
      )}

      {/* Input: Job Description */}
      <div className="flex flex-col gap-2">
        <label htmlFor="job-description-input" className="text-sm font-bold text-text-1 flex items-center justify-between">
          <span>شرح موقعیت شغلی:</span>
          <span className="text-xs text-text-3 font-normal">حتی ۲ الی ۳ خط توضیح هم کافی است</span>
        </label>
        <textarea
          id="job-description-input"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="این شغل چیه و چی میخوای؟"
          rows={5}
          className="w-full p-4 text-sm sm:text-base rounded-2xl bg-surface-1 border border-border-default focus:border-brand focus:ring-3 focus:ring-brand/20 outline-none text-text-1 placeholder:text-text-3 transition-all leading-relaxed resize-y shadow-xs"
        />
      </div>

      {/* Multi-File Upload Zone */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-text-1">فایل‌های رزومه:</span>
          {files.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllFiles}
              className="text-xs text-danger hover:underline font-bold cursor-pointer"
            >
              حذف همه ({toPersianDigits(files.length)})
            </button>
          )}
        </div>

        {/* Drag & Drop Area */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 select-none ${
            isDragging
              ? 'border-brand bg-brand-soft/50 scale-[1.01]'
              : 'border-border-default bg-surface-1 hover:border-brand/50 hover:bg-surface-2/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.zip,.txt"
            onChange={onFileInputChange}
            className="hidden"
          />

          <div className="w-14 h-14 rounded-2xl bg-brand-soft text-brand flex items-center justify-center shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-base sm:text-lg font-black text-text-1">
              هر چند تا رزومه داری، همینجا بریز 📥
            </span>
            <span className="text-xs sm:text-sm text-text-3">
              فایل‌ها را بکشید و اینجا رها کنید، یا برای انتخاب از دستگاه کلیک کنید
            </span>
          </div>

          <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-surface-2 text-text-3 text-[11px] font-medium border border-border-default">
            <span>فرمت‌های مجاز: PDF، Word (docx)، فایل فشرده ZIP و فایل متنی TXT</span>
            <span className="text-brand font-bold">• بدون سقف تعداد</span>
          </div>
        </div>

        {isUnpackingZip && (
          <div className="p-3 rounded-xl bg-info-soft border border-info/30 text-info text-xs font-bold text-center animate-pulse">
            در حال بازگشایی و استخراج فایل‌های فشرده ZIP… لطفاً شکیبا باشید
          </div>
        )}

        {/* Ready Files List */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2 bg-surface-1 p-4 rounded-2xl border border-border-default">
            <div className="flex items-center justify-between pb-2 border-b border-border-default text-xs text-text-3">
              <span className="font-bold text-text-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>رزومه‌های آماده برای بررسی ({toPersianDigits(files.length)} فایل):</span>
              </span>
              <span>آماده پردازش هوشمند</span>
            </div>

            <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
              {files.map((fileItem, idx) => (
                <div
                  key={fileItem.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 hover:bg-surface-2 border border-border-default/80 text-xs transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-[11px] font-mono text-text-3 shrink-0">
                      {toPersianDigits(idx + 1)}.
                    </span>
                    <FileText className="w-4 h-4 text-brand shrink-0" />
                    <span className="font-bold text-text-1 truncate" title={fileItem.name}>
                      {fileItem.name}
                    </span>
                    <span className="text-[10px] text-text-3 font-mono shrink-0">
                      ({formatFileSize(fileItem.size)})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(fileItem.id);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-text-3 hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer shrink-0"
                    title="حذف این فایل"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Start Button & Guidance */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className={`w-full sm:w-auto min-w-[260px] py-3.5 px-8 rounded-2xl text-base sm:text-lg font-black transition-all flex items-center justify-center gap-2.5 shadow-md select-none ${
            canStart
              ? 'bg-brand hover:bg-brand-hover text-white cursor-pointer active:scale-98 ring-4 ring-brand/20'
              : 'bg-surface-2 text-text-3 border border-border-default cursor-not-allowed opacity-75'
          }`}
        >
          <span>شروع بررسی ✅</span>
          {files.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-mono">
              {toPersianDigits(files.length)} رزومه
            </span>
          )}
        </button>

        {guideText && (
          <span className="text-xs sm:text-sm font-bold text-warning flex items-center gap-1.5 animate-bounce">
            <span>{guideText}</span>
          </span>
        )}
      </div>
    </div>
  );
};
