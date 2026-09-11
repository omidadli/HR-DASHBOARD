import {
  CandidateEvaluation,
  JobUnderstanding,
  ResumeFileItem,
} from '../types/screening';
import { extractResumeContent } from './extractText';

export interface ScreeningProgressUpdate {
  items: ResumeFileItem[];
  currentEvaluatingName?: string;
  processedCount: number;
  totalCount: number;
  statusText: string;
}

export type ProgressCallback = (update: ScreeningProgressUpdate) => void;

/**
 * Checks backend health and Gemini API key availability
 */
export async function checkScreeningHealth(): Promise<{ available: boolean; error?: string }> {
  try {
    const res = await fetch('/api/screening/health');
    if (!res.ok) {
      return { available: false, error: 'سرور در دسترس نیست' };
    }
    const data = await res.json();
    if (!data.hasGeminiKey) {
      return {
        available: false,
        error: 'کلید دسترسی هوش مصنوعی (GEMINI_API_KEY) روی سرور تعریف نشده است. لطفاً متغیر محیطی را در تنظیمات وارد نمایید.',
      };
    }
    return { available: true };
  } catch (err: any) {
    return { available: false, error: 'خطا در برقراری ارتباط با سرور: ' + (err?.message || '') };
  }
}

/**
 * Pass 0: Understand the job description
 */
export async function fetchJobUnderstanding(
  jobDescription: string,
  signal?: AbortSignal
): Promise<JobUnderstanding> {
  const res = await fetch('/api/screening/understand-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobDescription }),
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'خطا در تحلیل نیازمندی‌های شغلی');
  }

  return await res.json();
}

/**
 * Pass 1: Evaluate a single resume
 */
async function evaluateSingleResume(
  jobDescription: string,
  jobUnderstanding: JobUnderstanding,
  resumeText: string,
  fileName: string,
  signal?: AbortSignal
): Promise<CandidateEvaluation> {
  const MAX_RETRIES = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    try {
      const res = await fetch('/api/screening/evaluate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          jobUnderstanding,
          resumeText,
          fileName,
        }),
        signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error || `خطا در ارزیابی رزومه (کد ${res.status})`);
        (err as any).status = res.status;
        throw err;
      }

      return await res.json();
    } catch (err: any) {
      if (signal?.aborted) throw err;
      lastError = err;

      // If rate limited or server temporarily unavailable, wait and retry
      const isRetryable =
        err?.status === 429 ||
        err?.status === 503 ||
        err?.name === 'TypeError' || // Failed to fetch / network glitch
        String(err?.message || '').includes('Failed to fetch');

      if (isRetryable && attempt < MAX_RETRIES) {
        const backoffMs = (attempt + 1) * 2000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('خطا در ارزیابی رزومه');
}

/**
 * Pass 2: Calibrate top and borderline candidates
 */
async function calibrateCandidates(
  jobUnderstanding: JobUnderstanding,
  items: ResumeFileItem[],
  signal?: AbortSignal
): Promise<ResumeFileItem[]> {
  const validEvaluated = items.filter(
    (it) => it.status === 'success' && it.result && !it.result.insufficientInfo && !it.result.irrelevant
  );

  if (validEvaluated.length <= 1) {
    return items;
  }

  // Sort descending by score
  const sorted = [...validEvaluated].sort((a, b) => (b.result?.score || 0) - (a.result?.score || 0));

  // Select top 15 + borderline cases (score within ±5 of thresholds)
  const interviewThresh = jobUnderstanding.thresholds.interview;
  const reviewThresh = jobUnderstanding.thresholds.review;

  const candidatePoolMap = new Map<string, ResumeFileItem>();

  // Add top 15
  sorted.slice(0, 15).forEach((item) => candidatePoolMap.set(item.id, item));

  // Add borderline cases
  sorted.forEach((item) => {
    const sc = item.result?.score || 0;
    const isBorderlineInterview = Math.abs(sc - interviewThresh) <= 5;
    const isBorderlineReview = Math.abs(sc - reviewThresh) <= 5;
    if (isBorderlineInterview || isBorderlineReview) {
      candidatePoolMap.set(item.id, item);
    }
  });

  const candidatesToCalibrate = Array.from(candidatePoolMap.values()).map((item) => ({
    id: item.id,
    name: item.result?.candidateName || item.name,
    score: item.result?.score || 0,
    summary: item.result?.summary || '',
  }));

  if (candidatesToCalibrate.length === 0) {
    return items;
  }

  try {
    const res = await fetch('/api/screening/calibrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobUnderstanding,
        candidates: candidatesToCalibrate,
      }),
      signal,
    });

    if (!res.ok) return items;

    const data = await res.json();
    const adjustments: Record<string, number> = data.adjustments || {};

    return items.map((item) => {
      if (adjustments[item.id] !== undefined && item.result) {
        const newScore = adjustments[item.id];
        let newRec: 'INTERVIEW' | 'REVIEW' | 'REJECT' = 'REJECT';
        if (newScore >= jobUnderstanding.thresholds.interview) {
          newRec = 'INTERVIEW';
        } else if (newScore >= jobUnderstanding.thresholds.review) {
          newRec = 'REVIEW';
        }

        return {
          ...item,
          result: {
            ...item.result,
            score: newScore,
            recommendation: newRec,
          },
        };
      }
      return item;
    });
  } catch (err) {
    console.warn('Calibration pass skipped:', err);
    return items;
  }
}

/**
 * Main Screening Queue Engine
 * Concurrency: 3-4 parallel requests
 * Resilient: Failure in one file doesn't block others
 * Real-time progress updates with no fake progress
 */
export async function runScreeningQueue(
  jobDescription: string,
  rawItems: ResumeFileItem[],
  onProgress: ProgressCallback,
  signal?: AbortSignal
): Promise<{ items: ResumeFileItem[]; jobUnderstanding: JobUnderstanding }> {
  // 1. Pass 0: Understand Job
  onProgress({
    items: rawItems,
    processedCount: 0,
    totalCount: rawItems.length,
    statusText: 'هوش مصنوعی در حال بررسی و درک شرایط شغل است… 🧠',
  });

  const jobUnderstanding = await fetchJobUnderstanding(jobDescription, signal);

  // Clone items to mutate safely
  const items: ResumeFileItem[] = rawItems.map((it) => ({
    ...it,
    status: 'queued',
  }));

  const totalCount = items.length;
  let processedCount = 0;

  // 2. Step 1: Extract texts for all files
  for (let i = 0; i < items.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

    const item = items[i];
    item.status = 'extracting';
    onProgress({
      items: [...items],
      currentEvaluatingName: item.name,
      processedCount: 0,
      totalCount,
      statusText: `در حال خواندن و استخراج محتوای «${item.name}»… 📖 (${i + 1} از ${totalCount})`,
    });

    if (item.file) {
      const extraction = await extractResumeContent(item.file, item.name);
      if (!extraction.success) {
        item.status = 'unjudgeable';
        item.unjudgeableReason = extraction.unjudgeableReason || 'امکان استخراج متن وجود نداشت';
      } else {
        item.extractedText = extraction.text;
        item.status = 'queued';
      }
    } else {
      item.status = 'queued';
    }
  }

  onProgress({
    items: [...items],
    processedCount: 0,
    totalCount,
    statusText: 'استخراج متن فایل‌ها پایان یافت. آغاز ارزیابی هوشمند… ⚖️',
  });

  // 3. Step 2: Concurrency Pool for AI Evaluations
  const CONCURRENCY_LIMIT = 2; // 2 parallel calls to stay within Gemini API quota and prevent 429 rate limits
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

      const currentIndex = nextIndex++;
      const currentItem = items[currentIndex];

      // If already marked unjudgeable (e.g., scanned PDF), increment and continue
      if (currentItem.status === 'unjudgeable') {
        processedCount++;
        onProgress({
          items: [...items],
          processedCount,
          totalCount,
          statusText: `بررسی رزومه ${processedCount} از ${totalCount}…`,
        });
        continue;
      }

      currentItem.status = 'evaluating';
      onProgress({
        items: [...items],
        currentEvaluatingName: currentItem.name,
        processedCount,
        totalCount,
        statusText: `در حال مقایسه «${currentItem.name}» با شرایط شغل… ⚖️`,
      });

      try {
        const evaluation = await evaluateSingleResume(
          jobDescription,
          jobUnderstanding,
          currentItem.extractedText || '',
          currentItem.name,
          signal
        );

        currentItem.result = evaluation;

        if (evaluation.insufficientInfo || evaluation.irrelevant) {
          currentItem.status = 'unjudgeable';
          currentItem.unjudgeableReason = evaluation.insufficientInfo
            ? 'اطلاعات رزومه برای قضاوت تخصصی کافی نیست'
            : 'رزومه کاملاً نامرتبط با حوزه و شرایط این شغل است';
        } else {
          currentItem.status = 'success';
        }
      } catch (err: any) {
        if (signal?.aborted) throw err;
        console.error(`Failed to evaluate resume ${currentItem.name}:`, err);
        currentItem.status = 'error';
        currentItem.errorMessage = err?.message || 'خطا در ارزیابی رزومه';
        currentItem.unjudgeableReason = 'خطا در دریافت پاسخ ارزیابی از سرور';
      } finally {
        processedCount++;
        onProgress({
          items: [...items],
          processedCount,
          totalCount,
          statusText: `بررسی ${processedCount} از ${totalCount} رزومه انجام شد… 🏆`,
        });
      }
    }
  }

  // Run workers concurrently
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(CONCURRENCY_LIMIT, items.length); w++) {
    workers.push(worker());
  }

  await Promise.all(workers);

  // 4. Pass 2: Calibration
  onProgress({
    items: [...items],
    processedCount: totalCount,
    totalCount,
    statusText: 'در حال کالیبراسیون نهایی و تراز نمرات برترین‌ها… 🎯',
  });

  const calibratedItems = await calibrateCandidates(jobUnderstanding, items, signal);

  return {
    items: calibratedItems,
    jobUnderstanding,
  };
}
