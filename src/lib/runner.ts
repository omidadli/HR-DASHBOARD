import {
  JobUnderstanding,
  ResumeFileItem,
  ScreeningAnswers,
  ScreeningProgressUpdate,
} from '../types/screening';
import { extractResumeContent } from './extractText';
import { calibrateBatch, createBatch, evaluateResume, fileToBase64 } from './api';

export interface RunnerInput {
  departmentId: string;
  departmentName: string;
  roleTitle: string;
  extraNotes: string;
  understanding: JobUnderstanding;
  answers: ScreeningAnswers;
  files: ResumeFileItem[];
}

/**
 * Runs a full screening batch:
 *  1) create server batch (persists job understanding + answers)
 *  2) extract text client-side (PDF/DOCX/ZIP already unpacked at upload time)
 *  3) send each resume (with the original file) to the AI evaluator, 2 at a time
 *  4) calibrate top & borderline candidates
 */
export async function runScreeningBatch(
  input: RunnerInput,
  onProgress: (u: ScreeningProgressUpdate) => void,
  signal?: AbortSignal
): Promise<{ batchId: string; aiCount: number; localCount: number }> {
  const batch = await createBatch({
    departmentId: input.departmentId,
    roleTitle: input.roleTitle,
    extraNotes: input.extraNotes,
    understanding: input.understanding,
    answers: input.answers,
  });

  const items: ResumeFileItem[] = input.files.map((f) => ({ ...f, status: 'queued' }));
  const total = items.length;
  let processed = 0;
  let extractedCount = 0;
  let aiCount = 0;
  let localCount = 0;
  let currentPhase: 'extracting' | 'evaluating' | 'calibrating' | 'done' = 'extracting';
  const activeEvaluating = new Set<string>();

  const startTime = Date.now();
  let activeTick = 0;
  let highWatermarkPercent = 0;

  const computeOverallPercent = (): number => {
    if (currentPhase === 'done') return 100;
    if (total <= 0) return 0;

    let computed = 0;
    if (currentPhase === 'extracting') {
      const extRatio = Math.min(1, extractedCount / total);
      computed = Math.min(15, Math.max(3, Math.round(extRatio * 15)));
    } else if (currentPhase === 'evaluating') {
      // Proportional completion across the 75% evaluation window
      const completedRatio = Math.min(1, processed / total);
      const completedPart = completedRatio * 75;

      // Smooth monotonic asymptotic in-flight advance for active items (never oscillates backward)
      const activeCount = Math.min(activeEvaluating.size, Math.max(0, total - processed));
      if (activeCount > 0 && processed < total) {
        const itemSlotWeight = 75 / total;
        // Asymptotic progression up to 65% of an item's slot as ticks accumulate
        const inFlightRatio = (1 - Math.exp(-activeTick * 0.06)) * 0.65;
        const activeBonus = inFlightRatio * itemSlotWeight;
        computed = Math.min(90, Math.round(15 + completedPart + activeBonus));
      } else {
        computed = Math.min(90, Math.round(15 + completedPart));
      }
    } else if (currentPhase === 'calibrating') {
      computed = 94;
    }

    // Mathematical guarantee of monotonicity: progress never decreases
    highWatermarkPercent = Math.max(highWatermarkPercent, computed);
    return Math.min(highWatermarkPercent, 98);
  };

  const emit = (statusText: string, current?: string, subStatusText?: string) => {
    let speedPerMinute: number | undefined;
    let estimatedSecondsRemaining: number | undefined;

    const EVAL_CONCURRENCY = Math.min(4, Math.max(1, total));

    if (currentPhase === 'done') {
      estimatedSecondsRemaining = 0;
    } else if (currentPhase === 'calibrating') {
      estimatedSecondsRemaining = 1;
    } else if (currentPhase === 'extracting') {
      const remainingExt = Math.max(0, total - extractedCount);
      estimatedSecondsRemaining = Math.max(2, Math.ceil(remainingExt * 0.2 + (total * 2.5) / EVAL_CONCURRENCY));
    } else if (currentPhase === 'evaluating') {
      const remaining = Math.max(0, total - processed);
      if (processed > 0) {
        const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
        const ratePerSec = processed / elapsedSeconds;
        speedPerMinute = Math.round(ratePerSec * 60);
        estimatedSecondsRemaining = Math.max(1, Math.round(remaining / (ratePerSec || 0.35)));
      } else {
        const effectiveWorkers = Math.min(EVAL_CONCURRENCY, Math.max(1, remaining));
        estimatedSecondsRemaining = Math.max(2, Math.ceil((remaining * 2.8) / effectiveWorkers));
      }
    }

    onProgress({
      items: [...items],
      processedCount: processed,
      totalCount: total,
      statusText,
      subStatusText,
      currentEvaluatingName: current,
      activeEvaluatingNames: Array.from(activeEvaluating),
      phase: currentPhase,
      extractedCount,
      estimatedSecondsRemaining,
      speedPerMinute,
      overallPercent: computeOverallPercent(),
    });
  };

  // ---- Step A: Concurrent text extraction (6 parallel workers) ----
  currentPhase = 'extracting';
  emit(`در حال بازخوانی و استخراج محتوای ${total} فایل…`);

  const EXTRACT_CONCURRENCY = Math.min(6, items.length);
  let extractNext = 0;

  async function extractWorker() {
    while (extractNext < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const idx = extractNext++;
      const item = items[idx];
      item.status = 'extracting';
      emit(`در حال استخراج محتوا: ${item.name} (${extractedCount + 1} از ${total})`, item.name);

      if (item.file) {
        const [extraction, base64] = await Promise.all([
          extractResumeContent(item.file, item.name),
          fileToBase64(item.file).catch(() => undefined),
        ]);
        item.extractedText = extraction.text;
        (item as any).cachedBase64 = base64;

        if (extraction.isVisualDocument) {
          // Visual document (image or scanned PDF) - queue for Gemini native vision processing
          item.status = 'queued';
        } else if (!extraction.success) {
          item.status = 'unjudgeable';
          item.unjudgeableReason = extraction.unjudgeableReason || 'امکان استخراج محتوا وجود ندارد';
        } else {
          item.status = 'queued';
        }
      } else {
        item.status = 'queued';
      }

      extractedCount++;
      emit(`استخراج محتوا: ${extractedCount} از ${total} رزومه پایان یافت…`, item.name);
    }
  }

  await Promise.all(Array.from({ length: EXTRACT_CONCURRENCY }, () => extractWorker()));
  emit('استخراج محتوا با موفقیت به پایان رسید؛ آغاز تحلیل هوشا…');

  // ---- Step B: AI evaluation with 4 parallel workers ----
  currentPhase = 'evaluating';
  const EVAL_CONCURRENCY = Math.min(4, Math.max(1, items.length));
  let next = 0;

  const microSteps = [
    'در حال بررسی ساختار و بازخوانی سوابق…',
    'سنجش مهارت‌های تخصصی و شرایط احراز…',
    'انطباق با چک‌باکس‌ها و سوالات مصوب…',
    'محاسبه امتیاز شایستگی و رتبه‌بندی نهایی…',
  ];

  const heartbeat = setInterval(() => {
    if (activeEvaluating.size > 0 && currentPhase === 'evaluating') {
      activeTick++;
      const currentName = Array.from(activeEvaluating)[0];
      const stepText = microSteps[activeTick % microSteps.length];
      emit(`هوشا در حال تحلیل «${currentName}»…`, currentName, stepText);
    }
  }, 400);

  async function evalWorker() {
    while (next < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const idx = next++;
      const item = items[idx];

      if (item.status === 'unjudgeable') {
        // Persist extraction failures too (gray "unjudgeable" section)
        if (item.file) {
          try {
            const base64 = await fileToBase64(item.file);
            const { record } = await evaluateResume({
              batchId: batch.id,
              fileName: item.name,
              extractedText: '',
              unjudgeableReason: item.unjudgeableReason || 'فایل قابل‌تحلیل نیست',
              fileBase64: base64,
            });
            item.recordId = record.id;
            item.category = record.category;
          } catch {
            item.status = 'error';
            item.errorMessage = 'ثبت فایل ناموفق بود';
          }
        }
        processed++;
        emit(`بررسی ${processed} از ${total} انجام شد…`);
        continue;
      }

      item.status = 'evaluating';
      activeEvaluating.add(item.name);
      emit(`هوشا در حال تحلیل «${item.name}»…`, item.name, microSteps[0]);

      try {
        const base64 =
          (item as any).cachedBase64 ||
          (item.file ? await fileToBase64(item.file).catch(() => undefined) : undefined);
        const { record } = await evaluateResume({
          batchId: batch.id,
          fileName: item.name,
          extractedText: item.extractedText || '',
          unjudgeableReason: null,
          fileBase64: base64,
        });

        item.recordId = record.id;
        item.category = record.category;
        item.score = record.score;
        if (record.engine === 'local') localCount++;
        else if (record.category !== 'UNJUDGEABLE') aiCount++;

        item.status =
          record.category === 'UNJUDGEABLE'
            ? 'unjudgeable'
            : record.category === 'ERROR'
            ? 'error'
            : 'success';

        if (record.category === 'UNJUDGEABLE') {
          item.unjudgeableReason = record.unjudgeableReason || 'اطلاعات رزومه برای قضاوت کافی نیست';
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        // Try to persist the failure as an ERROR record so the file stays
        // visible (and retryable) in the results instead of disappearing.
        try {
          const base64 =
            (item as any).cachedBase64 ||
            (item.file ? await fileToBase64(item.file).catch(() => undefined) : undefined);
          const { record } = await evaluateResume({
            batchId: batch.id,
            fileName: item.name,
            extractedText: item.extractedText || '',
            unjudgeableReason: null,
            fileBase64: base64,
            errorMessage: err?.message || 'خطا در تحلیل',
          });
          item.recordId = record.id;
          item.category = record.category;
        } catch {
          // Server unreachable: fall back to the local-only error state.
        }
        item.status = 'error';
        item.errorMessage = err?.message || 'خطا در تحلیل';
      } finally {
        activeEvaluating.delete(item.name);
        processed++;
        emit(`تحلیل هوشا ${processed} از ${total} تمام شد…`, item.name);
      }
    }
  }

  const evalWorkers = Array.from({ length: EVAL_CONCURRENCY }, () => evalWorker());
  try {
    await Promise.all(evalWorkers);
  } finally {
    clearInterval(heartbeat);
  }

  // ---- Step C: relative calibration (only needed if > 1 candidate) ----
  if (!signal?.aborted && items.length > 1) {
    currentPhase = 'calibrating';
    emit('در حال کالیبراسیون نهایی و رتبه‌بندی عادلانه داوطلبان…');
    await calibrateBatch(batch.id).catch((e) => console.warn('calibration skipped', e));
  }

  currentPhase = 'done';
  emit('فرآیند تحلیل و غربالگری با موفقیت کامل شد.');

  return { batchId: batch.id, aiCount, localCount };
}
