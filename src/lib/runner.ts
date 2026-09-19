import {
  JobUnderstanding,
  ResumeFileItem,
  ScreeningAnswers,
  ScreeningProgressUpdate,
} from '../types/screening';
import { extractResumeContent, TextExtractionResult } from './extractText';
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
 * A base64 body is ~37% larger than the file itself. Above this size we stop
 * attaching the original document (the text is still analysed) so a single
 * huge scan cannot blow up the request payload and stall the queue.
 */
const MAX_INLINE_FILE_BYTES = 20 * 1024 * 1024;

/** If nothing has moved for this long, tell the user instead of spinning silently. */
const STALL_WARNING_MS = 45_000;

const isLikelyMobile = (): boolean =>
  typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent || '');

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function extractConcurrency(total: number): number {
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const base = isLikelyMobile() ? 2 : clamp(Math.floor(cores / 2), 2, 4);
  return clamp(base, 1, Math.max(1, total));
}

function evalConcurrency(total: number): number {
  // 4 parallel Gemini calls used to trip rate limits and make the whole batch
  // look frozen. 2–3 in flight is both faster in practice and kinder to memory.
  const base = isLikelyMobile() ? 2 : 3;
  return clamp(base, 1, Math.max(1, total));
}

/**
 * Runs a full screening batch:
 *  1) create server batch (persists job understanding + answers)
 *  2) extract text client-side (PDF/DOCX/ZIP already unpacked at upload time)
 *  3) send each resume to the AI evaluator with bounded concurrency
 *  4) calibrate top & borderline candidates
 *
 * Robustness contract: a single bad file, a dead network or a slow model must
 * never be able to hang the batch. Every awaited call carries the caller's
 * AbortSignal and a deadline, and worker failures are captured per item.
 */
export async function runScreeningBatch(
  input: RunnerInput,
  onProgress: (u: ScreeningProgressUpdate) => void,
  signal?: AbortSignal
): Promise<{ batchId: string; aiCount: number; localCount: number }> {
  const throwIfAborted = () => {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  };

  const batch = await createBatch(
    {
      departmentId: input.departmentId,
      roleTitle: input.roleTitle,
      extraNotes: input.extraNotes,
      understanding: input.understanding,
      answers: input.answers,
    },
    { signal }
  );

  const items: ResumeFileItem[] = input.files.map((f) => ({ ...f, status: 'queued' }));
  const total = items.length;
  const extractionByItem = new Map<string, TextExtractionResult>();
  const base64ByItem = new Map<string, string>();
  let processed = 0;
  let extractedCount = 0;
  let aiCount = 0;
  let localCount = 0;
  let currentPhase: 'extracting' | 'evaluating' | 'calibrating' | 'done' = 'extracting';
  const activeEvaluating = new Set<string>();

  const startTime = Date.now();
  /** Touched only on real progress, so a stall can actually be detected. */
  let lastProgressAt = Date.now();
  const markProgress = () => {
    lastProgressAt = Date.now();
  };
  let activeTick = 0;
  let highWatermarkPercent = 0;
  let lastEmitAt = 0;

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

  const emit = (statusText: string, current?: string, subStatusText?: string, force = true) => {
    // Coalesce high-frequency updates (ZIP unpacking, 200-file batches) so the
    // UI thread is never flooded; meaningful transitions always pass through.
    const now = Date.now();
    if (!force && now - lastEmitAt < 120) return;
    lastEmitAt = now;

    let speedPerMinute: number | undefined;
    let estimatedSecondsRemaining: number | undefined;

    const workers = evalConcurrency(total);

    if (currentPhase === 'done') {
      estimatedSecondsRemaining = 0;
    } else if (currentPhase === 'calibrating') {
      estimatedSecondsRemaining = 1;
    } else if (currentPhase === 'extracting') {
      const remainingExt = Math.max(0, total - extractedCount);
      const extWorkers = extractConcurrency(total);
      estimatedSecondsRemaining = Math.max(
        2,
        Math.ceil((remainingExt * 1.5) / extWorkers + (total * 2.5) / workers)
      );
    } else if (currentPhase === 'evaluating') {
      const remaining = Math.max(0, total - processed);
      if (processed > 0) {
        const elapsedSeconds = Math.max(1, (Date.now() - startTime) / 1000);
        const ratePerSec = processed / elapsedSeconds;
        speedPerMinute = Math.round(ratePerSec * 60);
        estimatedSecondsRemaining = Math.max(1, Math.round(remaining / (ratePerSec || 0.35)));
      } else {
        const effectiveWorkers = Math.min(workers, Math.max(1, remaining));
        estimatedSecondsRemaining = Math.max(2, Math.ceil((remaining * 2.8) / effectiveWorkers));
      }
    }

    const stalledFor = Date.now() - lastProgressAt;
    const warningText =
      currentPhase !== 'done' && stalledFor > STALL_WARNING_MS
        ? 'پاسخ سرور طولانی شده است؛ هوشا همچنان در تلاش است. در صورت نیاز می‌توانید لغو کنید.'
        : undefined;

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
      warningText,
    });
  };

  // ---- Step A: bounded, fault-isolated text extraction ----
  currentPhase = 'extracting';
  emit(`در حال بازخوانی و استخراج محتوای ${total} فایل…`);

  const EXTRACT_CONCURRENCY = extractConcurrency(items.length);
  let extractNext = 0;

  async function extractWorker() {
    while (extractNext < items.length) {
      throwIfAborted();
      const idx = extractNext++;
      const item = items[idx];
      item.status = 'extracting';
      emit(
        `در حال استخراج محتوا: ${item.name} (${extractedCount + 1} از ${total})`,
        item.name,
        undefined,
        false
      );

      try {
        if (item.file) {
          // Extraction and base64 run in parallel
          const wantsAttachment = item.file.size <= MAX_INLINE_FILE_BYTES;
          const [extraction, base64] = await Promise.all([
            extractResumeContent(item.file, item.name),
            wantsAttachment ? fileToBase64(item.file).catch(() => undefined) : Promise.resolve(undefined),
          ]);
          item.extractedText = extraction.text;
          extractionByItem.set(item.id, extraction);
          if (base64) base64ByItem.set(item.id, base64);

          if (item.file.size === 0) {
            item.status = 'unjudgeable';
            item.unjudgeableReason = 'فایل خالی و بدون محتواست (حجم صفر بایت)';
          } else {
            // Non-empty file: always queue for evaluation so Gemini vision or server can analyze it
            item.status = 'queued';
          }
        } else {
          item.status = 'queued';
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') throw err;
        // Never stall or drop a file before server gets to try
        item.status = 'queued';
      }

      extractedCount++;
      markProgress();
      emit(`استخراج محتوا: ${extractedCount} از ${total} رزومه پایان یافت…`, item.name, undefined, false);
    }
  }

  const extractResults = await Promise.allSettled(
    Array.from({ length: EXTRACT_CONCURRENCY }, () => extractWorker())
  );
  const extractAbort = extractResults.find(
    (r) => r.status === 'rejected' && (r.reason as any)?.name === 'AbortError'
  );
  if (extractAbort) throw (extractAbort as PromiseRejectedResult).reason;
  // Any other worker failure leaves its items marked; keep going.
  extractResults.forEach((r) => {
    if (r.status === 'rejected') console.warn('[runner] extraction worker failed:', r.reason);
  });

  throwIfAborted();
  markProgress();
  emit('استخراج محتوا با موفقیت به پایان رسید؛ آغاز تحلیل هوشا…');

  // ---- Step B: AI evaluation with bounded parallelism ----
  currentPhase = 'evaluating';
  const EVAL_CONCURRENCY = evalConcurrency(items.length);
  let next = 0;

  const microSteps = [
    'در حال بررسی ساختار و بازخوانی سوابق…',
    'سنجش مهارت‌های تخصصی و شرایط احراز…',
    'انطباق با چک‌باکس‌ها و سوالات مصوب…',
    'محاسبه امتیاز شایستگی و رتبه‌بندی نهایی…',
  ];

  // Kept at 1s (was 400ms): it only drives the cosmetic in-flight animation,
  // and every tick re-renders the whole progress view.
  const heartbeat = setInterval(() => {
    if (activeEvaluating.size > 0 && currentPhase === 'evaluating') {
      activeTick++;
      const currentName = Array.from(activeEvaluating)[0];
      const stepText = microSteps[activeTick % microSteps.length];
      emit(`هوشا در حال تحلیل «${currentName}»…`, currentName, stepText);
    } else if (currentPhase !== 'done' && Date.now() - lastProgressAt > STALL_WARNING_MS) {
      // Nothing in flight but nothing finished either — surface the stall.
      emit('در انتظار پاسخ سرور…', undefined, undefined);
    }
  }, 1000);

  async function evalWorker() {
    while (next < items.length) {
      throwIfAborted();
      const idx = next++;
      const item = items[idx];

      const attachment = base64ByItem.get(item.id);

      if (item.status === 'unjudgeable') {
        // Persist extraction failures too (gray "unjudgeable" section)
        if (item.file) {
          try {
            const { record } = await evaluateResume(
              {
                batchId: batch.id,
                fileName: item.name,
                extractedText: '',
                unjudgeableReason: item.unjudgeableReason || 'فایل قابل‌تحلیل نیست',
                fileBase64: attachment,
              },
              { signal }
            );
            item.recordId = record.id;
            item.category = record.category;
          } catch (err: any) {
            if (err?.name === 'AbortError') throw err;
            item.status = 'error';
            item.errorMessage = err?.message || 'ثبت فایل ناموفق بود';
          } finally {
            base64ByItem.delete(item.id);
          }
        }
        processed++;
        markProgress();
        emit(`بررسی ${processed} از ${total} انجام شد…`);
        continue;
      }

      item.status = 'evaluating';
      activeEvaluating.add(item.name);
      emit(`هوشا در حال تحلیل «${item.name}»…`, item.name, microSteps[0]);

      try {
        const { record } = await evaluateResume(
          {
            batchId: batch.id,
            fileName: item.name,
            extractedText: item.extractedText || '',
            unjudgeableReason: null,
            fileBase64: attachment,
          },
          { signal }
        );

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
        if (err?.name === 'AbortError' || signal?.aborted) throw err;
        // Try to persist the failure as an ERROR record so the file stays
        // visible (and retryable) in the results instead of disappearing.
        try {
          const { record } = await evaluateResume(
            {
              batchId: batch.id,
              fileName: item.name,
              extractedText: item.extractedText || '',
              unjudgeableReason: null,
              fileBase64: attachment,
              errorMessage: err?.message || 'خطا در تحلیل',
            },
            { signal }
          );
          item.recordId = record.id;
          item.category = record.category;
        } catch {
          // Server unreachable: fall back to the local-only error state.
        }
        item.status = 'error';
        item.errorMessage = err?.message || 'خطا در تحلیل';
      } finally {
        // Release the base64 copy as soon as it is no longer needed; holding
        // every file in memory is what killed the tab on phones.
        base64ByItem.delete(item.id);
        activeEvaluating.delete(item.name);
        processed++;
        markProgress();
        emit(`تحلیل هوشا ${processed} از ${total} تمام شد…`, item.name);
      }
    }
  }

  const evalResults = await Promise.allSettled(
    Array.from({ length: EVAL_CONCURRENCY }, () => evalWorker())
  ).finally(() => clearInterval(heartbeat));

  const evalAbort = evalResults.find(
    (r) => r.status === 'rejected' && (r.reason as any)?.name === 'AbortError'
  );
  if (evalAbort) throw (evalAbort as PromiseRejectedResult).reason;
  evalResults.forEach((r) => {
    if (r.status === 'rejected') console.warn('[runner] evaluation worker failed:', r.reason);
  });

  // ---- Step C: relative calibration (only needed if > 1 candidate) ----
  if (!signal?.aborted && items.length > 1) {
    currentPhase = 'calibrating';
    markProgress();
    emit('در حال کالیبراسیون نهایی و رتبه‌بندی عادلانه داوطلبان…');
    await calibrateBatch(batch.id, { signal }).catch((e) => console.warn('calibration skipped', e));
  }

  currentPhase = 'done';
  emit('فرآیند تحلیل و غربالگری با موفقیت کامل شد.');

  // Free the caches once the batch is over.
  extractionByItem.clear();
  base64ByItem.clear();

  return { batchId: batch.id, aiCount, localCount };
}
