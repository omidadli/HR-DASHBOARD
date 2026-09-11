import React, { useState, useRef, useEffect, useMemo } from 'react';
import { JobPosting } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import JSZip from 'jszip';
import { extractResumeText } from '../../utils/resumeTextExtraction';
import { HierarchicalJobPicker } from './HierarchicalJobPicker';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Loader2,
  FolderArchive,
  Trash2,
  Building2,
  FileCode,
  Copy,
  Clock,
  ArrowRight,
  ArrowLeft,
  Search,
  Filter,
  ShieldCheck,
  Check,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

export type ExtractionStatus = 'QUEUED' | 'EXTRACTING' | 'SUCCESS' | 'FAILED';

export interface StagedResumeFile {
  id: string;
  name: string;
  size: number;
  type: string;
  sourceZip?: string;
  status: ExtractionStatus;
  text?: string;
  charCount?: number;
  extractionError?: string;
  errorCategory?: 'SCAN_NO_TEXT' | 'PASSWORD_PROTECTED' | 'CORRUPTED' | 'UNSUPPORTED' | 'EMPTY' | 'OTHER';
}

export type WizardStep = 1 | 2 | 3;

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobs: JobPosting[];
  activeJobId: string;
  onUploadComplete: (result: any) => void;
  onJobCreated?: (newJob: JobPosting) => void;
  onOpenStudio?: (jobId: string) => void;
}

// Categorize failure reasons honestly
function categorizeExtractionError(errStr: string = ''): {
  category: StagedResumeFile['errorCategory'];
  label: string;
} {
  const lower = errStr.toLowerCase();
  if (
    lower.includes('اسکن تصویری') ||
    lower.includes('لایه متنی') ||
    lower.includes('فاقد لایه') ||
    lower.includes('no text') ||
    lower.includes('image')
  ) {
    return { category: 'SCAN_NO_TEXT', label: 'اسکن تصویری بدون متن' };
  }
  if (
    lower.includes('password') ||
    lower.includes('رمز') ||
    lower.includes('encrypted') ||
    lower.includes('قفل')
  ) {
    return { category: 'PASSWORD_PROTECTED', label: 'فایل رمزدار' };
  }
  if (
    lower.includes('doc قدیمی') ||
    lower.includes('پشتیبانی نمی‌شود') ||
    lower.includes('unsupported')
  ) {
    return { category: 'UNSUPPORTED', label: 'فرمت نامعتبر یا doc قدیمی' };
  }
  if (lower.includes('خالی') || lower.includes('empty')) {
    return { category: 'EMPTY', label: 'فایل خالی' };
  }
  if (
    lower.includes('خراب') ||
    lower.includes('corrupt') ||
    lower.includes('invalid pdf') ||
    lower.includes('failed to parse')
  ) {
    return { category: 'CORRUPTED', label: 'فایل خراب یا ناقص' };
  }
  return { category: 'OTHER', label: errStr || 'خطا در استخراج متن' };
}

// Helper: Format file size
function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '۰ بایت';
  const k = 1024;
  if (bytes < k) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < k * k) return `${toPersianDigits(Math.round(bytes / k))} کیلوبایت`;
  return `${toPersianDigits((bytes / (k * k)).toFixed(1))} مگابایت`;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  jobs: initialJobs,
  activeJobId,
  onUploadComplete,
  onJobCreated,
  onOpenStudio,
}) => {
  // Wizard State
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Job selection state
  const [localJobs, setLocalJobs] = useState<JobPosting[]>(initialJobs);
  const [selectedJobId, setSelectedJobId] = useState(activeJobId || initialJobs[0]?.id || 'job-1');

  // File states
  const [stagedFiles, setStagedFiles] = useState<StagedResumeFile[]>([]);
  const stagedFilesRef = useRef<StagedResumeFile[]>([]);
  stagedFilesRef.current = stagedFiles;

  // Deduplication tracking
  const [duplicateNoticeCount, setDuplicateNoticeCount] = useState<number>(0);

  // Queue & Concurrency Management (Max 4 concurrent workers)
  const MAX_CONCURRENCY = 4;
  const fileBlobsRef = useRef<Map<string, Blob>>(new Map());
  const pendingQueueRef = useRef<string[]>([]);
  const activeWorkersRef = useRef<number>(0);
  const extractionTimingRef = useRef<{ startTime: number; initialTotal: number }>({
    startTime: Date.now(),
    initialTotal: 0,
  });

  // Drag & ZIP state
  const [dragActive, setDragActive] = useState(false);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [zipMessage, setZipMessage] = useState<{ name: string; count: number } | null>(null);

  // Staged List View Controls (Filter & Search for 500+ items performance)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ExtractionStatus>('ALL');

  // Server Processing (Step 3)
  const [isProcessing, setIsProcessing] = useState(false);
  const [serverProgress, setServerProgress] = useState(0);
  const [serverProgressStageText, setServerProgressStageText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processedStats, setProcessedStats] = useState<{
    total: number;
    priority: number;
    review: number;
    rejected: number;
  } | null>(null);

  // Refs for file inputs
  const manualFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected job with props when modal opens
  useEffect(() => {
    if (isOpen && activeJobId) {
      setSelectedJobId(activeJobId);
    }
  }, [isOpen, activeJobId]);

  // Selected job entity
  const selectedJob = localJobs.find((j) => j.id === selectedJobId) || localJobs[0];

  // Extraction worker queue runner (strictly ≤ 4 concurrency)
  const drainExtractionQueue = () => {
    while (activeWorkersRef.current < MAX_CONCURRENCY && pendingQueueRef.current.length > 0) {
      const nextId = pendingQueueRef.current.shift();
      if (!nextId) break;

      activeWorkersRef.current++;

      // Set status to EXTRACTING
      setStagedFiles((prev) =>
        prev.map((f) => (f.id === nextId ? { ...f, status: 'EXTRACTING' } : f))
      );

      const blob = fileBlobsRef.current.get(nextId);

      (async (fileId: string, fileBlob?: Blob) => {
        try {
          if (!fileBlob) {
            throw new Error('فایل یافت نشد');
          }

          const currentItem = stagedFilesRef.current.find((f) => f.id === fileId);
          const fileName = currentItem?.name || 'resume.pdf';

          const result = await extractResumeText(fileBlob, fileName);

          if (result.success && result.text && result.text.trim().length >= 25) {
            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: 'SUCCESS',
                      text: result.text,
                      charCount: result.text.length,
                      extractionError: undefined,
                    }
                  : f
              )
            );
          } else {
            const rawError = !result.success
              ? result.error || 'خطا در استخراج متن'
              : 'فایل فاقد لایه متنی کافی است (احتمالاً اسکن تصویری)';
            const { category, label } = categorizeExtractionError(rawError);

            setStagedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      status: 'FAILED',
                      errorCategory: category,
                      extractionError: label,
                    }
                  : f
              )
            );
          }
        } catch (err: any) {
          const { category, label } = categorizeExtractionError(err?.message || '');
          setStagedFiles((prev) =>
            prev.map((f) =>
              f.id === fileId
                ? {
                    ...f,
                    status: 'FAILED',
                    errorCategory: category,
                    extractionError: label,
                  }
                : f
            )
          );
        } finally {
          activeWorkersRef.current--;
          // Free blob from memory to keep memory lean at 500+ files
          fileBlobsRef.current.delete(fileId);
          drainExtractionQueue();
        }
      })(nextId, blob);
    }
  };

  // Enqueue new unique files & trigger extraction
  const enqueueFilesForExtraction = (
    incoming: { fileOrBlob: Blob; name: string; size: number; sourceZip?: string }[]
  ) => {
    if (incoming.length === 0) return;

    // Deduplicate against existing staged files & within incoming batch by `${name.toLowerCase()}_${size}`
    const existingKeys = new Set(
      stagedFilesRef.current.map((f) => `${f.name.trim().toLowerCase()}_${f.size}`)
    );

    const uniqueIncoming: { fileOrBlob: Blob; name: string; size: number; sourceZip?: string }[] = [];
    let dups = 0;

    for (const item of incoming) {
      const key = `${item.name.trim().toLowerCase()}_${item.size}`;
      if (existingKeys.has(key)) {
        dups++;
      } else {
        existingKeys.add(key);
        uniqueIncoming.push(item);
      }
    }

    if (dups > 0) {
      setDuplicateNoticeCount((prev) => prev + dups);
    }

    if (uniqueIncoming.length === 0) return;

    const newStagedList: StagedResumeFile[] = [];
    const newIds: string[] = [];

    uniqueIncoming.forEach((item) => {
      const id = `resume-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const ext = item.name.split('.').pop()?.toLowerCase() || 'pdf';

      fileBlobsRef.current.set(id, item.fileOrBlob);
      newIds.push(id);

      newStagedList.push({
        id,
        name: item.name,
        size: item.size,
        type: ext,
        sourceZip: item.sourceZip,
        status: 'QUEUED',
      });
    });

    // Reset timing benchmark if queue was idle
    if (pendingQueueRef.current.length === 0 && activeWorkersRef.current === 0) {
      extractionTimingRef.current = {
        startTime: Date.now(),
        initialTotal: newStagedList.length,
      };
    }

    pendingQueueRef.current.push(...newIds);
    setStagedFiles((prev) => [...newStagedList, ...prev]);

    // Kick off concurrency loop
    setTimeout(() => {
      drainExtractionQueue();
    }, 10);
  };

  // Unpack ZIP archive using JSZip (skip __MACOSX, .DS_Store, thumbs.db, non-resume files)
  const handleExtractZip = async (zipFile: File) => {
    setIsExtractingZip(true);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile);

      const unpackedFiles: { fileOrBlob: Blob; name: string; size: number; sourceZip: string }[] = [];

      for (const [relativePath, entry] of Object.entries(loadedZip.files)) {
        if (entry.dir) continue;
        if (
          relativePath.startsWith('__MACOSX') ||
          relativePath.includes('/.') ||
          relativePath.endsWith('.DS_Store') ||
          relativePath.endsWith('Thumbs.db')
        ) {
          continue;
        }

        const fileName = relativePath.split('/').pop() || relativePath;
        const ext = fileName.split('.').pop()?.toLowerCase() || '';

        if (!['pdf', 'docx', 'doc', 'txt', 'md', 'json', 'csv', 'rtf'].includes(ext)) {
          continue;
        }

        const blob = await entry.async('blob');
        unpackedFiles.push({
          fileOrBlob: blob,
          name: fileName,
          size: blob.size,
          sourceZip: zipFile.name,
        });
      }

      if (unpackedFiles.length > 0) {
        setZipMessage({ name: zipFile.name, count: unpackedFiles.length });
        enqueueFilesForExtraction(unpackedFiles);
      } else {
        alert('فایل فشرده خالی است یا فایل رزومه معتبری در آن یافت نشد.');
      }
    } catch (err) {
      console.error('Failed to unpack zip:', err);
      alert('خطا در بازگشایی فایل فشرده ZIP. لطفاً از صحت و سالم بودن فایل اطمینان حاصل فرمایید.');
    } finally {
      setIsExtractingZip(false);
    }
  };

  // Intake files (drag-drop or manual picker)
  const processIncomingFiles = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList);
    const regularFiles: File[] = [];
    const zipFiles: File[] = [];

    filesArray.forEach((file) => {
      const isZip =
        file.name.toLowerCase().endsWith('.zip') ||
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed';
      if (isZip) {
        zipFiles.push(file);
      } else {
        regularFiles.push(file);
      }
    });

    if (regularFiles.length > 0) {
      enqueueFilesForExtraction(
        regularFiles.map((f) => ({
          fileOrBlob: f,
          name: f.name,
          size: f.size,
        }))
      );
    }

    // Unpack ZIP files sequentially
    for (const zipFile of zipFiles) {
      await handleExtractZip(zipFile);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processIncomingFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    pendingQueueRef.current = pendingQueueRef.current.filter((item) => item !== id);
    fileBlobsRef.current.delete(id);
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleRemoveAllFailed = () => {
    setStagedFiles((prev) => prev.filter((f) => f.status !== 'FAILED'));
  };

  const handleClearAllFiles = () => {
    pendingQueueRef.current = [];
    fileBlobsRef.current.clear();
    setStagedFiles([]);
    setZipMessage(null);
    setDuplicateNoticeCount(0);
  };

  // Real-time Extraction Counters
  const totalFiles = stagedFiles.length;
  const successCount = stagedFiles.filter((f) => f.status === 'SUCCESS').length;
  const extractingCount = stagedFiles.filter((f) => f.status === 'EXTRACTING').length;
  const failedCount = stagedFiles.filter((f) => f.status === 'FAILED').length;
  const queuedCount = stagedFiles.filter((f) => f.status === 'QUEUED').length;

  const completedCount = successCount + failedCount;
  const isExtracting = extractingCount > 0 || queuedCount > 0 || isExtractingZip;

  const percent = totalFiles > 0 ? Math.round((completedCount / totalFiles) * 100) : 0;

  // Dynamic ETA Estimation
  const etaText = useMemo(() => {
    if (totalFiles === 0 || completedCount === totalFiles) {
      return completedCount > 0 ? 'تکمیل شد' : 'در انتظار فایل';
    }
    if (!isExtracting) return 'متوقف';
    if (completedCount < 2) return 'در حال محاسبه...';

    const elapsedMs = Date.now() - extractionTimingRef.current.startTime;
    const avgMs = elapsedMs / Math.max(completedCount, 1);
    const remainingCount = totalFiles - completedCount;
    const remainingSec = Math.max(1, Math.ceil((remainingCount * avgMs) / 1000));

    if (remainingSec < 5) return 'کمتر از ۵ ثانیه';
    if (remainingSec < 60) return `حدود ${toPersianDigits(remainingSec)} ثانیه`;
    const min = Math.ceil(remainingSec / 60);
    return `حدود ${toPersianDigits(min)} دقیقه`;
  }, [totalFiles, completedCount, isExtracting]);

  // Failure reasons breakdown
  const failureBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    stagedFiles
      .filter((f) => f.status === 'FAILED')
      .forEach((f) => {
        const reason = f.extractionError || 'نامشخص';
        map[reason] = (map[reason] || 0) + 1;
      });
    return map;
  }, [stagedFiles]);

  // Filtered & Searched Staged List (Smooth for 500+ items)
  const filteredStagedFiles = useMemo(() => {
    return stagedFiles.filter((file) => {
      if (statusFilter !== 'ALL' && file.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        return (
          file.name.toLowerCase().includes(query) ||
          (file.sourceZip && file.sourceZip.toLowerCase().includes(query)) ||
          (file.extractionError && file.extractionError.toLowerCase().includes(query))
        );
      }
      return true;
    });
  }, [stagedFiles, statusFilter, searchQuery]);

  // Execute Final Server-Side Processing (Step 3)
  const handleStartServerEvaluation = async () => {
    setUploadError(null);
    const readyFiles = stagedFiles.filter(
      (f) => f.status === 'SUCCESS' && f.text && f.text.trim().length >= 25
    );

    if (readyFiles.length === 0) {
      setUploadError('هیچ رزومه‌ای با متن استخراج‌شده سالم جهت ارزیابی وجود ندارد.');
      return;
    }

    setIsProcessing(true);
    setServerProgress(10);
    setServerProgressStageText('در حال ارسال رزومه‌های استخراج‌شده به موتور سنجش هوشمند...');
    setProcessedStats(null);

    const stages = [
      { p: 30, text: 'استخراج متادیتا، مهارت‌ها و تجارب شغلی از رزومه‌ها...' },
      { p: 60, text: 'تطبیق شایستگی‌ها با الزامات شغلی و استخراج مستندات نقل‌قولی...' },
      { p: 85, text: 'تولید استدلال تحلیلی، رتبه‌بندی اولویت‌ها و محاسبه نمرات شایستگی...' },
    ];

    let stageIdx = 0;
    const interval = setInterval(() => {
      setServerProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        const next = prev + Math.floor(Math.random() * 12) + 6;
        if (stageIdx < stages.length && next >= stages[stageIdx].p) {
          setServerProgressStageText(stages[stageIdx].text);
          stageIdx++;
        }
        return next;
      });
    }, 250);

    try {
      const res = await fetch('/api/candidates/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJobId,
          files: readyFiles.map((f) => ({
            name: f.name,
            size: f.size,
            text: f.text,
            sourceZip: f.sourceZip,
          })),
        }),
      });

      clearInterval(interval);
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setServerProgress(0);
        setUploadError(data?.error || 'خطا در ارزیابی و ثبت کارجویان توسط سرور');
        return;
      }

      setServerProgress(100);
      setServerProgressStageText('ثبت و ارزیابی رزومه‌ها با موفقیت انجام شد.');
      setProcessedStats({
        total: data.processedCount ?? readyFiles.length,
        priority: data.interviewPriorityCount ?? 0,
        review: data.needsReviewCount ?? 0,
        rejected: data.initialRejectionCount ?? 0,
      });

      onUploadComplete(data);
    } catch (err: any) {
      clearInterval(interval);
      console.error(err);
      setUploadError(err?.message || 'خطای شبکه در ارسال فایل‌ها به سرور');
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper: File type icon
  const renderFileTypeIcon = (file: StagedResumeFile) => {
    if (file.sourceZip) {
      return <FolderArchive className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />;
    }
    if (file.type === 'pdf') {
      return <FileText className="w-4 h-4 text-rose-500 shrink-0" />;
    }
    if (file.type === 'docx' || file.type === 'doc') {
      return <FileCode className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="بارگذاری و غربالگری گروهی رزومه‌ها"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-surface-1 rounded-[16px] max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-border-default my-auto max-h-[95vh] flex flex-col">
        {/* Modal Header & Brand Badge */}
        <div className="flex items-start justify-between pb-3.5 border-b border-border-default shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-brand-soft text-brand flex items-center justify-center font-bold shadow-2xs border border-brand/20">
              <UploadCloud className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-text-1 flex items-center gap-2">
                <span>بارگذاری گروهی رزومه‌ها</span>
                <span className="text-[10px] bg-brand-soft text-brand font-bold px-2 py-0.5 rounded-md border border-brand/20">
                  سیلانه سبز
                </span>
              </h3>
              <p className="text-xs text-text-3 mt-0.5">
                بارگذاری فایل‌ها، استخراج متن و سنجش تطابق با شاخص‌های شغلی
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={onClose}
            aria-label="بستن پنجره"
            className="p-1.5 text-text-3 hover:text-text-1 hover:bg-surface-2 rounded-[10px] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* 3-Step Wizard Navigation Stepper Bar */}
        <div className="pt-3 pb-2 border-b border-border-default/60 shrink-0">
          <div className="flex items-center justify-between">
            {/* Step 1: Position */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setCurrentStep(1)}
              className={`flex-1 flex items-center gap-2.5 p-2 rounded-[10px] transition-all text-right cursor-pointer ${
                currentStep === 1
                  ? 'bg-brand/10 border border-brand/30 text-brand'
                  : currentStep > 1
                  ? 'text-emerald-700 dark:text-emerald-300 hover:bg-surface-2'
                  : 'text-text-3 hover:bg-surface-2'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  currentStep === 1
                    ? 'bg-brand text-white'
                    : currentStep > 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-2 text-text-3 border border-border-default'
                }`}
              >
                {currentStep > 1 ? <Check className="w-4 h-4" /> : '۱'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">گام ۱: موقعیت شغلی</div>
                <div className="text-[10px] text-text-3 truncate max-w-[140px] sm:max-w-[170px]">
                  {selectedJob ? selectedJob.title : 'انتخاب ردیف شغلی'}
                </div>
              </div>
            </button>

            <ChevronRight className="w-4 h-4 text-text-3/40 shrink-0 mx-1" />

            {/* Step 2: Files & Extraction */}
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => setCurrentStep(2)}
              className={`flex-1 flex items-center gap-2.5 p-2 rounded-[10px] transition-all text-right cursor-pointer ${
                currentStep === 2
                  ? 'bg-brand/10 border border-brand/30 text-brand'
                  : currentStep > 2
                  ? 'text-emerald-700 dark:text-emerald-300 hover:bg-surface-2'
                  : 'text-text-3 hover:bg-surface-2'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  currentStep === 2
                    ? 'bg-brand text-white'
                    : currentStep > 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-surface-2 text-text-3 border border-border-default'
                }`}
              >
                {currentStep > 2 ? <Check className="w-4 h-4" /> : '۲'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">گام ۲: فایل‌ها و استخراج</div>
                <div className="text-[10px] text-text-3 truncate">
                  {totalFiles > 0
                    ? `${toPersianDigits(successCount)} سالم از ${toPersianDigits(totalFiles)}`
                    : 'فایل‌های رزومه و ZIP'}
                </div>
              </div>
            </button>

            <ChevronRight className="w-4 h-4 text-text-3/40 shrink-0 mx-1" />

            {/* Step 3: Confirmation & Launch */}
            <button
              type="button"
              disabled={isProcessing || successCount === 0 || isExtracting}
              onClick={() => {
                if (successCount > 0 && !isExtracting) setCurrentStep(3);
              }}
              className={`flex-1 flex items-center gap-2.5 p-2 rounded-[10px] transition-all text-right ${
                currentStep === 3
                  ? 'bg-brand/10 border border-brand/30 text-brand'
                  : successCount > 0 && !isExtracting
                  ? 'text-text-2 hover:bg-surface-2 cursor-pointer'
                  : 'text-text-3 opacity-50 cursor-not-allowed'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                  currentStep === 3
                    ? 'bg-brand text-white'
                    : 'bg-surface-2 text-text-3 border border-border-default'
                }`}
              >
                ۳
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">گام ۳: تأیید و ارزیابی</div>
                <div className="text-[10px] text-text-3 truncate">بررسی نهایی</div>
              </div>
            </button>
          </div>
        </div>

        {/* Wizard Step 1: POSITION SELECTION */}
        {currentStep === 1 && (
          <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="bg-surface-2/60 p-4 rounded-[14px] border border-border-default space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-text-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-brand" />
                  <span>انتخاب موقعیت شغلی مقصد و ماتریس شاخص‌ها:</span>
                </label>
                <span className="text-[11px] text-text-3">
                  پیمایش در ۳ سطح: حوزه کلان › دپارتمان › ردیف شغلی
                </span>
              </div>

              <HierarchicalJobPicker
                jobs={localJobs}
                selectedJobId={selectedJobId}
                onSelectJob={(id) => setSelectedJobId(id)}
                onJobCreated={(newJob) => {
                  setLocalJobs((prev) => [newJob, ...prev]);
                  setSelectedJobId(newJob.id);
                  if (onJobCreated) onJobCreated(newJob);
                }}
                disabled={isProcessing}
                showSummaryCard={true}
              />
            </div>

            {/* Selected Position Details Overview */}
            {selectedJob && (
              <div className="bg-brand-soft/20 border border-brand/20 p-3.5 rounded-[12px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-1">مشخصات ارزیابی این ردیف:</span>
                  <span className="text-[11px] bg-brand-soft text-brand px-2 py-0.5 rounded-full font-bold">
                    کد شناسه: {selectedJob.id}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-surface-1 p-2 rounded-[8px] border border-border-default">
                    <div className="text-[10px] text-text-3">دپارتمان</div>
                    <div className="font-bold text-text-1 truncate">{selectedJob.department}</div>
                  </div>
                  <div className="bg-surface-1 p-2 rounded-[8px] border border-border-default">
                    <div className="text-[10px] text-text-3">محل خدمت</div>
                    <div className="font-bold text-text-1 truncate">{selectedJob.location}</div>
                  </div>
                  <div className="bg-surface-1 p-2 rounded-[8px] border border-border-default">
                    <div className="text-[10px] text-text-3">شاخص‌های سنجش</div>
                    <div className="font-bold text-text-1">
                      {toPersianDigits(selectedJob.criteria?.length || 4)} شاخص وزنی
                    </div>
                  </div>
                  <div className="bg-surface-1 p-2 rounded-[8px] border border-border-default">
                    <div className="text-[10px] text-text-3">آستانه اولویت مصاحبه</div>
                    <div className="font-bold text-emerald-600">
                      حداقل {toPersianDigits(selectedJob.interviewPriorityThreshold || 75)} امتیاز
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wizard Step 2: UNLIMITED INTAKE & EXTRACTION PROGRESS */}
        {currentStep === 2 && (
          <div className="mt-3 space-y-3.5 overflow-y-auto pr-1 flex-1">
            {/* Deduplication Notice Chip */}
            {duplicateNoticeCount > 0 && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 px-3 py-2 rounded-[10px] text-xs font-bold animate-in fade-in">
                <div className="flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    {toPersianDigits(duplicateNoticeCount)} فایل تکراری (نام و حجم یکسان) شناسایی و به طور خودکار حذف شد.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDuplicateNoticeCount(0)}
                  className="text-amber-700 hover:text-amber-900 dark:hover:text-white p-1"
                  title="بستن پیام"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ZIP Extract Banner */}
            {zipMessage && (
              <div className="bg-purple-500/10 border border-purple-500/30 text-purple-900 dark:text-purple-200 rounded-[10px] p-2.5 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center gap-2 font-bold">
                  <FolderArchive className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    فایل فشرده «{zipMessage.name}» با موفقیت اکسترکت شد ({toPersianDigits(zipMessage.count)} رزومه به صف اضافه گردید).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setZipMessage(null)}
                  className="text-purple-700 hover:text-purple-900 p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dropzone with UNLIMITED files & ZIP auto-unpack */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[14px] p-4 sm:p-5 text-center transition-all ${
                dragActive
                  ? 'border-brand bg-brand-soft/40 ring-4 ring-brand/20 scale-[1.008]'
                  : 'border-brand/40 bg-brand-soft/15 hover:border-brand hover:bg-brand-soft/25'
              }`}
            >
              <input
                ref={manualFileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.rtf,.zip"
                className="hidden"
                aria-label="انتخاب دستی فایل‌های رزومه"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processIncomingFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              <input
                ref={zipFileInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="hidden"
                aria-label="انتخاب فایل فشرده ZIP"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processIncomingFiles(e.target.files);
                    e.target.value = '';
                  }
                }}
              />

              {isExtractingZip ? (
                <div className="py-4 space-y-2">
                  <Loader2 className="w-7 h-7 text-brand animate-spin mx-auto" />
                  <div className="text-xs font-bold text-text-1">
                    در حال بازگشایی آرشیو فشرده ZIP و فیلتر فایل‌های نامعتبر...
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-center gap-2 text-brand">
                    <div className="w-9 h-9 rounded-[10px] bg-brand-soft flex items-center justify-center border border-brand/20">
                      <FileText className="w-4 h-4 text-brand" />
                    </div>
                    <div className="w-9 h-9 rounded-[10px] bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                      <FolderArchive className="w-4 h-4" />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-black text-text-1">
                      فایل‌های رزومه یا آرشیو ZIP را به هر تعداد اینجا بکشید و رها کنید
                    </div>
                    <p className="text-[11px] text-text-3 mt-0.5">
                      ظرفیت نامحدود (۵۰۰+ رزومه) • استخراج همزمان متن حداکثر ۴ فایل همزمان • حذف خودکار تکراری‌ها
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => manualFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-surface-1 hover:bg-surface-2 text-text-1 rounded-[8px] border border-border-default text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand" />
                      <span>انتخاب فایل‌ها (چندتایی)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => zipFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-[8px] border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <FolderArchive className="w-3.5 h-3.5 text-purple-600" />
                      <span>آپلود فایل فشرده ZIP</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* EXTRACTION PROGRESS AREA (Radial Ring + Segmented Linear Bar + Live Counters + ETA) */}
            {totalFiles > 0 && (
              <div className="bg-surface-2 p-3.5 rounded-[14px] border border-border-default space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Radial Ring */}
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="stroke-surface-1 dark:stroke-slate-800"
                        strokeWidth="8"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="38"
                        className="stroke-brand transition-all duration-300 ease-out"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 38}
                        strokeDashoffset={2 * Math.PI * 38 * (1 - percent / 100)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-base font-black text-text-1">{toPersianDigits(percent)}٪</span>
                      <span className="text-[9px] text-text-3 font-semibold">استخراج</span>
                    </div>
                  </div>

                  {/* Segmented Bar & Live Counters */}
                  <div className="flex-1 w-full space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-extrabold text-text-1">
                        {isExtracting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
                            <span>در حال استخراج موازی متن رزومه‌ها (حداکثر ۴ پردازش همزمان)...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>فرآیند استخراج متن پایان یافت</span>
                          </>
                        )}
                      </div>

                      <div className="text-[11px] font-bold text-text-3 bg-surface-1 px-2.5 py-0.5 rounded-full border border-border-default">
                        زمان تخمینی: <span className="text-brand font-black">{etaText}</span>
                      </div>
                    </div>

                    {/* Multi-color Segmented Linear Bar */}
                    <div className="w-full bg-surface-1 rounded-full h-2.5 p-0.5 flex gap-0.5 overflow-hidden border border-border-default">
                      {successCount > 0 && (
                        <div
                          style={{ width: `${(successCount / totalFiles) * 100}%` }}
                          className="bg-emerald-500 rounded-sm transition-all duration-300"
                          title={`استخراج موفق: ${toPersianDigits(successCount)}`}
                        />
                      )}
                      {extractingCount > 0 && (
                        <div
                          style={{ width: `${(extractingCount / totalFiles) * 100}%` }}
                          className="bg-brand rounded-sm animate-pulse transition-all duration-300"
                          title={`در حال استخراج: ${toPersianDigits(extractingCount)}`}
                        />
                      )}
                      {failedCount > 0 && (
                        <div
                          style={{ width: `${(failedCount / totalFiles) * 100}%` }}
                          className="bg-rose-500 rounded-sm transition-all duration-300"
                          title={`ناموفق: ${toPersianDigits(failedCount)}`}
                        />
                      )}
                      {queuedCount > 0 && (
                        <div
                          style={{ width: `${(queuedCount / totalFiles) * 100}%` }}
                          className="bg-border-default rounded-sm transition-all duration-300"
                          title={`در صف: ${toPersianDigits(queuedCount)}`}
                        />
                      )}
                    </div>

                    {/* 4 Live Counters */}
                    <div className="grid grid-cols-4 gap-1.5 text-center text-xs pt-1">
                      <div className="bg-surface-1 p-1.5 rounded-[8px] border border-border-default">
                        <div className="text-[10px] text-text-3">کل فایل‌ها</div>
                        <div className="font-extrabold text-text-1">{toPersianDigits(totalFiles)}</div>
                      </div>
                      <div className="bg-surface-1 p-1.5 rounded-[8px] border border-emerald-500/20">
                        <div className="text-[10px] text-emerald-600">استخراج‌شده</div>
                        <div className="font-extrabold text-emerald-600">{toPersianDigits(successCount)}</div>
                      </div>
                      <div className="bg-surface-1 p-1.5 rounded-[8px] border border-brand/20">
                        <div className="text-[10px] text-brand">در حال پردازش</div>
                        <div className="font-extrabold text-brand flex items-center justify-center gap-1">
                          {extractingCount > 0 && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {toPersianDigits(extractingCount + queuedCount)}
                        </div>
                      </div>
                      <div className="bg-surface-1 p-1.5 rounded-[8px] border border-rose-500/20">
                        <div className="text-[10px] text-rose-600">ناموفق</div>
                        <div className="font-extrabold text-rose-600">{toPersianDigits(failedCount)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HONEST FAILURES ALERT & DISMISS ALL */}
            {failedCount > 0 && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-[12px] p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                      {toPersianDigits(failedCount)} فایل به دلیل عدم دسترسی به متن خام کنار گذاشته شدند:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveAllFailed}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-[6px] font-bold text-[11px] shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>حذف همه ناموفق‌ها</span>
                  </button>
                </div>

                {/* Honest reason tags */}
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  {Object.entries(failureBreakdown).map(([reason, count]) => (
                    <span
                      key={reason}
                      className="bg-surface-1/90 px-2 py-0.5 rounded-[6px] border border-rose-500/30 text-rose-800 dark:text-rose-200 font-medium"
                    >
                      {reason}: {toPersianDigits(count)} فایل
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* STAGED LIST WITH VIRTUAL/SMOOTH RENDERING & FILTER BAR */}
            {totalFiles > 0 && (
              <div className="bg-surface-2 rounded-[12px] p-3 border border-border-default space-y-2">
                {/* List Header, Search & Filter Chips */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-1">فهرست فایل‌ها ({toPersianDigits(totalFiles)}):</span>
                    <button
                      type="button"
                      onClick={handleClearAllFiles}
                      className="text-[11px] text-danger hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>پاکسازی کل</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute right-2.5 top-2 text-text-3" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="جستجو در فایل‌ها..."
                        className="w-36 sm:w-44 pr-7 pl-2 py-1 text-[11px] bg-surface-1 border border-border-default rounded-[6px] text-text-1 focus:border-brand focus:outline-hidden"
                      />
                    </div>

                    {/* Filter Status */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ALL')}
                        className={`px-2 py-1 rounded-[6px] font-bold ${
                          statusFilter === 'ALL'
                            ? 'bg-brand text-white'
                            : 'bg-surface-1 text-text-3 border border-border-default'
                        }`}
                      >
                        همه
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('SUCCESS')}
                        className={`px-2 py-1 rounded-[6px] font-bold ${
                          statusFilter === 'SUCCESS'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-surface-1 text-emerald-600 border border-border-default'
                        }`}
                      >
                        سالم ({toPersianDigits(successCount)})
                      </button>
                      {failedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setStatusFilter('FAILED')}
                          className={`px-2 py-1 rounded-[6px] font-bold ${
                            statusFilter === 'FAILED'
                              ? 'bg-rose-600 text-white'
                              : 'bg-surface-1 text-rose-600 border border-border-default'
                          }`}
                        >
                          ناموفق ({toPersianDigits(failedCount)})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scrollable Container with Content-Visibility for 500+ items */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs divide-y divide-border-default/40">
                  {filteredStagedFiles.slice(0, 300).map((file) => (
                    <div
                      key={file.id}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '52px' }}
                      className="pt-1.5 first:pt-0 flex items-center justify-between hover:bg-surface-1/60 p-1.5 rounded-[8px] transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        {renderFileTypeIcon(file)}
                        <div className="min-w-0">
                          <div
                            className="font-semibold truncate text-xs text-text-1 max-w-[200px] sm:max-w-[340px]"
                            title={file.name}
                          >
                            {file.name}
                          </div>
                          <div className="text-[10px] text-text-3">
                            {formatFileSize(file.size)}
                            {file.sourceZip && ` • آرشیو: ${file.sourceZip}`}
                          </div>
                        </div>
                      </div>

                      {/* Live Status Chip per row */}
                      <div className="flex items-center gap-2 shrink-0">
                        {file.status === 'QUEUED' && (
                          <span className="text-[10px] bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>در صف استخراج</span>
                          </span>
                        )}

                        {file.status === 'EXTRACTING' && (
                          <span className="text-[10px] bg-brand-soft text-brand border border-brand/30 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>در حال استخراج...</span>
                          </span>
                        )}

                        {file.status === 'SUCCESS' && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>استخراج شد ({toPersianDigits(file.charCount || 0)} کاراکتر)</span>
                          </span>
                        )}

                        {file.status === 'FAILED' && (
                          <span
                            className="text-[10px] bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded-md flex items-center gap-1"
                            title={file.extractionError}
                          >
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>{file.extractionError}</span>
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveFile(file.id)}
                          className="text-text-3 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          title="حذف این فایل"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredStagedFiles.length > 300 && (
                    <div className="text-center text-[10px] text-text-3 py-2 font-medium">
                      نمایش ۳۰۰ فایل نخست از مجموع {toPersianDigits(filteredStagedFiles.length)} فایل جهت حفظ عملکرد روان رابط کاربری.
                    </div>
                  )}

                  {filteredStagedFiles.length === 0 && (
                    <div className="text-center text-xs text-text-3 py-4">
                      فایلی مطابق با فیلتر یا جستجوی واردشده یافت نشد.
                    </div>
                  )}
                </div>
              </div>
            )}

            {totalFiles === 0 && (
              <div className="bg-surface-2/60 px-4 py-8 rounded-[12px] border border-border-default text-xs text-text-3 text-center space-y-1">
                <FileText className="w-8 h-8 text-text-3/50 mx-auto mb-1" />
                <div className="font-bold text-text-2">رزومه‌ای انتخاب نشده است</div>
                <p>فایل‌های PDF، Word یا ZIP متقاضیان را جهت استخراج خودکار و غربالگری اضافه فرمایید.</p>
              </div>
            )}
          </div>
        )}

        {/* Wizard Step 3: CONFIRMATION & LAUNCH */}
        {currentStep === 3 && (
          <div className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
            {/* Pre-Flight Checklist */}
            <div className="bg-surface-2 p-4 rounded-[14px] border border-border-default space-y-3">
              <div className="flex items-center justify-between border-b border-border-default pb-2">
                <span className="text-xs font-extrabold text-text-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand" />
                  <span>تأییدیه پیش از اجرای غربالگری هوشمند:</span>
                </span>
                <span className="text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  {toPersianDigits(successCount)} رزومه سالم آماده ارزیابی
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-text-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>موقعیت شغلی هدف:</strong> «{selectedJob?.title}» (دپارتمان {selectedJob?.department})
                  </span>
                </div>

                <div className="flex items-start gap-2 text-text-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>تعداد رزومه‌های سالم:</strong> {toPersianDigits(successCount)} رزومه با استخراج موفق لایه متنی (فایل‌های خراب، اسکن تصویری و تکراری حذف شده‌اند).
                  </span>
                </div>

                <div className="flex items-start gap-2 text-text-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>ماتریس ارزیابی:</strong> سنجش امتیازات بر مبنای {toPersianDigits(selectedJob?.criteria?.length || 4)} شاخص وزنی این ردیف شغلی انجام می‌گیرد.
                  </span>
                </div>

                <div className="flex items-start gap-2 text-text-3 bg-surface-1 p-2.5 rounded-[8px] border border-border-default">
                  <HelpCircle className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                  <span>
                    <strong>توجه:</strong> رزومه‌ها در مرحله «بررسی اولیه» ثبت می‌شوند و اولویت‌ها جنبه پیشنهادی دارند.
                  </span>
                </div>
              </div>
            </div>

            {/* Server Processing Progress Bar */}
            {isProcessing && (
              <div className="space-y-2.5 bg-surface-2 p-4 rounded-[12px] border border-border-default animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-text-1">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-brand animate-spin" />
                    <span>{serverProgressStageText || 'در حال تطبیق و ارزیابی شایستگی‌ها...'}</span>
                  </span>
                  <span className="text-brand font-extrabold">{toPersianDigits(serverProgress)}٪</span>
                </div>

                <div className="w-full bg-surface-1 rounded-full h-2.5 overflow-hidden border border-border-default">
                  <div
                    className="bg-brand h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${serverProgress}%` }}
                  />
                </div>

                <div className="text-[11px] text-text-3 text-center">
                  ارزیابی و تطبیق متن رزومه‌ها برای موقعیت «{selectedJob?.title}» در حال انجام است.
                </div>
              </div>
            )}

            {/* Server Error Alert */}
            {uploadError && (
              <div className="flex items-start gap-2 bg-danger-soft border border-danger/30 text-danger px-3.5 py-2.5 rounded-[10px] text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Results Summary Card with Direct Link to Screening Studio */}
            {processedStats && (
              <div className="bg-brand-soft/40 rounded-[14px] p-4 border border-brand/40 space-y-3.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-text-1">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-brand" />
                    <span className="text-sm font-extrabold text-brand">
                      ارزیابی و ثبت {toPersianDigits(processedStats.total)} رزومه برای «{selectedJob?.title}» انجام شد
                    </span>
                  </span>
                </div>

                {/* 3 Category Recommendation Badges */}
                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="bg-surface-1 p-2.5 rounded-[10px] border border-success/30 shadow-2xs">
                    <div className="text-[11px] text-success font-bold mb-0.5">اولویت مصاحبه</div>
                    <div className="text-lg font-black text-success">
                      {toPersianDigits(processedStats.priority)}
                    </div>
                    <div className="text-[10px] text-text-3">پیشنهاد برتر</div>
                  </div>

                  <div className="bg-surface-1 p-2.5 rounded-[10px] border border-warning/30 shadow-2xs">
                    <div className="text-[11px] text-warning font-bold mb-0.5">نیازمند بررسی</div>
                    <div className="text-lg font-black text-warning">
                      {toPersianDigits(processedStats.review)}
                    </div>
                    <div className="text-[10px] text-text-3">نمرات میانی</div>
                  </div>

                  <div className="bg-surface-1 p-2.5 rounded-[10px] border border-danger/30 shadow-2xs">
                    <div className="text-[11px] text-danger font-bold mb-0.5">رد اولیه</div>
                    <div className="text-lg font-black text-danger">
                      {toPersianDigits(processedStats.rejected)}
                    </div>
                    <div className="text-[10px] text-text-3">زیر آستانه پذیرش</div>
                  </div>
                </div>

                {/* Direct CTA to Screening Studio */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setStagedFiles([]);
                      setProcessedStats(null);
                      setCurrentStep(2);
                    }}
                    className="px-3 py-1.5 bg-surface-1 hover:bg-surface-2 border border-border-default text-text-2 rounded-[8px] text-xs font-semibold cursor-pointer"
                  >
                    بارگذاری دسته جدید
                  </button>

                  {onOpenStudio ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenStudio(selectedJobId);
                        onClose();
                      }}
                      className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>ورود به بخش غربالگری</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-bold transition-all cursor-pointer"
                    >
                      مشاهده در مرحله مصاحبه
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer Wizard Navigation Actions */}
        <div className="pt-3.5 border-t border-border-default flex items-center justify-between shrink-0 mt-3">
          {/* Back Action / Cancel */}
          <div>
            {currentStep === 1 ? (
              <button
                type="button"
                disabled={isProcessing}
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-text-2 hover:bg-surface-2 rounded-[10px] transition-colors cursor-pointer"
              >
                انصراف
              </button>
            ) : (
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setCurrentStep((prev) => (prev - 1) as WizardStep)}
                className="px-3.5 py-2 text-xs font-bold text-text-2 hover:bg-surface-2 rounded-[10px] border border-border-default transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>گام قبلی</span>
              </button>
            )}
          </div>

          {/* Forward Wizard Actions */}
          <div className="flex items-center gap-2.5">
            {/* Step 1 Next Action */}
            {currentStep === 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-5 py-2.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white rounded-[10px] shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>بارگذاری فایل‌ها</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Step 2 Next Action: CTA «ادامه با N رزومه سالم» (Disabled while extracting) */}
            {currentStep === 2 && (
              <button
                type="button"
                disabled={isExtracting || successCount === 0}
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 text-xs font-bold bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-[10px] shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال استخراج متن ({toPersianDigits(completedCount)} از {toPersianDigits(totalFiles)})...</span>
                  </>
                ) : successCount > 0 ? (
                  <>
                    <span>ادامه ({toPersianDigits(successCount)} رزومه)</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                ) : (
                  <span>انتخاب فایل</span>
                )}
              </button>
            )}

            {/* Step 3 Execute Action */}
            {currentStep === 3 && !processedStats && (
              <button
                type="button"
                disabled={isProcessing || successCount === 0}
                onClick={handleStartServerEvaluation}
                className="px-6 py-2.5 text-xs font-black bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-[10px] shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال ارزیابی...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>شروع ارزیابی ({toPersianDigits(successCount)} رزومه)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
