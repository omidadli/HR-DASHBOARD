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
  let aiCount = 0;
  let localCount = 0;

  const emit = (statusText: string, current?: string) =>
    onProgress({
      items: [...items],
      processedCount: processed,
      totalCount: total,
      statusText,
      currentEvaluatingName: current,
    });

  // ---- Step A: extract text for every file ----
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const item = items[i];
    item.status = 'extracting';
    emit(`در حال خواندن «${item.name}»… (${i + 1} از ${total})`, item.name);
    if (item.file) {
      const extraction = await extractResumeContent(item.file, item.name);
      if (!extraction.success) {
        item.status = 'unjudgeable';
        item.unjudgeableReason = extraction.unjudgeableReason || 'امکان استخراج متن وجود ندارد';
      } else {
        item.extractedText = extraction.text;
        item.status = 'queued';
      }
    }
  }
  emit('استخراج متن پایان یافت؛ آغاز تحلیل هوشمند…');

  // ---- Step B: AI evaluation with a 2-worker pool ----
  const CONCURRENCY = 2;
  let next = 0;

  async function worker() {
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
        emit(`بررسی ${processed} از ${total} تمام شد…`, item.name);
        continue;
      }

      item.status = 'evaluating';
      emit(`در حال تحلیل «${item.name}»…`, item.name);
      try {
        const base64 = item.file ? await fileToBase64(item.file) : undefined;
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
        item.status = 'error';
        item.errorMessage = err?.message || 'خطا در تحلیل';
      } finally {
        processed++;
        emit(`بررسی ${processed} از ${total} تمام شد…`, item.name);
      }
    }
  }

  const workers = Array.from({ length: Math.min(CONCURRENCY, items.length) }, () => worker());
  await Promise.all(workers);

  // ---- Step C: relative calibration ----
  if (!signal?.aborted) {
    emit('در حال کالیبراسیون نهایی و چیدمان اولویت‌ها…');
    await calibrateBatch(batch.id).catch((e) => console.warn('calibration skipped', e));
  }

  return { batchId: batch.id, aiCount, localCount };
}
