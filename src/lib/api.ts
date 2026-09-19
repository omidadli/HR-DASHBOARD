import type {
  BankDepartmentCount,
  DecisionFilters,
  DecisionStatus,
  DecisionsMeta,
  DecisionsPage,
  DraftMessage,
  JobUnderstanding,
  MessageKind,
  PagedResult,
  ResumeRecord,
  ScreeningAnswers,
  ScreeningBatch,
} from '../types/screening';
import { getUserId } from './user';

/** Header that scopes screening history & the talent bank to this device's user. */
export function scopedHeaders(): Record<string, string> {
  const id = getUserId();
  return id ? { 'x-user-id': id } : {};
}

export interface RequestOptions {
  /** Hard wall-clock budget for the request. */
  timeoutMs?: number;
  /** Caller-supplied cancellation (the screening "لغو" button). */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * fetch() never rejects on a stalled connection and it does not inherit any
 * caller signal unless one is passed explicitly. Both of those used to be true
 * here, which is why a single unresponsive request froze an entire screening
 * batch forever. Every call now has a deadline and honours the caller's abort.
 */
async function fetchWithTimeout(url: string, init: RequestInit, opts: RequestOptions): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // Already cancelled before we even started: bail out deterministically rather
  // than depending on every fetch implementation to re-check the signal.
  if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort, { once: true });
  timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err: any) {
    // Distinguish "user cancelled" from "the request timed out" so the UI can
    // report an honest reason instead of a generic failure.
    if (opts.signal?.aborted) throw err;
    if (err?.name === 'AbortError') {
      throw new Error(
        `پاسخ سرور بیش از ${Math.round(timeoutMs / 1000)} ثانیه طول کشید (اتصال قطع یا سرور شلوغ است)`
      );
    }
    throw new Error('ارتباط با سرور برقرار نشد؛ اتصال اینترنت را بررسی کنید.');
  } finally {
    if (timer) clearTimeout(timer);
    if (opts.signal) opts.signal.removeEventListener('abort', onAbort);
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit, opts: RequestOptions = {}): Promise<T> {
  const res = await fetchWithTimeout(
    url,
    {
      ...init,
      headers: { 'Content-Type': 'application/json', ...scopedHeaders(), ...(init?.headers || {}) },
    },
    opts
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `خطای سرور (${res.status})`);
  return data as T;
}

export async function checkHealth(
  opts: RequestOptions = {}
): Promise<{ available: boolean; error?: string }> {
  try {
    const h = await jsonFetch<{ hasGeminiKey: boolean }>('/api/screening/health', undefined, {
      timeoutMs: 15_000,
      ...opts,
    });
    if (!h.hasGeminiKey) {
      return {
        available: false,
        error: 'کلید GEMINI_API_KEY روی سرور تعریف نشده؛ هوشا فعلاً در دسترس نیست.',
      };
    }
    return { available: true };
  } catch (e: any) {
    return { available: false, error: 'خطا در برقراری ارتباط با سرور: ' + (e?.message || '') };
  }
}

export function fetchUnderstanding(
  departmentId: string,
  roleTitle: string,
  extraNotes: string,
  opts: RequestOptions = {}
): Promise<JobUnderstanding> {
  return jsonFetch(
    '/api/screening/understand',
    { method: 'POST', body: JSON.stringify({ departmentId, roleTitle, extraNotes }) },
    { timeoutMs: 60_000, ...opts }
  );
}

export function createBatch(
  input: {
    departmentId: string;
    roleTitle: string;
    extraNotes: string;
    understanding: JobUnderstanding;
    answers: ScreeningAnswers;
  },
  opts: RequestOptions = {}
): Promise<ScreeningBatch> {
  return jsonFetch(
    '/api/screening/batches',
    { method: 'POST', body: JSON.stringify(input) },
    { timeoutMs: 30_000, ...opts }
  );
}

export async function evaluateResume(
  input: {
    batchId: string;
    fileName: string;
    extractedText: string;
    unjudgeableReason: string | null;
    fileBase64?: string;
    errorMessage?: string;
  },
  opts: RequestOptions = {}
): Promise<{ record: ResumeRecord; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(
    `/api/screening/batches/${input.batchId}/evaluate`,
    { method: 'POST', body: JSON.stringify(input) },
    // Longest call in the app: the server may try several Gemini models before
    // falling back to the local engine. It is still bounded (see the server's
    // circuit breaker), so this is a safety net rather than the main limiter.
    { timeoutMs: 150_000, ...opts }
  );
}

export function calibrateBatch(
  batchId: string,
  opts: RequestOptions = {}
): Promise<{ batch: ScreeningBatch; resumes: ResumeRecord[]; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(
    `/api/screening/batches/${batchId}/calibrate`,
    { method: 'POST' },
    { timeoutMs: 90_000, ...opts }
  );
}

export function fetchBatch(
  batchId: string,
  opts: RequestOptions = {}
): Promise<{ batch: ScreeningBatch; resumes: ResumeRecord[] }> {
  return jsonFetch(`/api/screening/batches/${batchId}`, undefined, opts);
}

export function fetchRecentBatches(limit = 3, opts: RequestOptions = {}): Promise<ScreeningBatch[]> {
  return jsonFetch(`/api/screening/batches?limit=${limit}`, undefined, opts);
}

export function deleteBatch(batchId: string, opts: RequestOptions = {}): Promise<{ ok: boolean }> {
  return jsonFetch(`/api/screening/batches/${batchId}`, { method: 'DELETE' }, opts);
}

export function rerunResume(
  id: string,
  opts: RequestOptions = {}
): Promise<{ record: ResumeRecord; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(`/api/resumes/${id}/rerun`, { method: 'POST' }, { timeoutMs: 150_000, ...opts });
}

export interface RerunResult {
  record: ResumeRecord;
  stats?: ScreeningBatch['stats'];
  mode?: 'standard' | 'deep';
  /** 'local' means هوشا was unavailable and the keyword engine answered instead. */
  engine?: 'ai' | 'local';
}

/**
 * «بازبینی» — asks the AI to re-read the resume carefully (original file +
 * extracted text, higher reasoning budget, extra findings). Slower by design.
 */
export function deepRerunResume(id: string, opts: RequestOptions = {}): Promise<RerunResult> {
  return jsonFetch(`/api/resumes/${id}/deep-rerun`, { method: 'POST' }, { timeoutMs: 180_000, ...opts });
}

/** Sets (or with 'none' clears) the HR decision on a resume. */
export function setResumeDecision(
  id: string,
  status: DecisionStatus,
  note?: string,
  opts: RequestOptions = {}
): Promise<{ record: ResumeRecord; stats?: ScreeningBatch['stats'] }> {
  return jsonFetch(
    `/api/resumes/${id}`,
    { method: 'PATCH', body: JSON.stringify({ action: 'decision', status, note: note ?? null }) },
    opts
  );
}

export function fetchDecisionsMeta(opts: RequestOptions = {}): Promise<DecisionsMeta> {
  return jsonFetch('/api/decisions/meta', undefined, opts);
}

export function fetchDecisionResumes(
  params: Omit<DecisionFilters, 'userId'> & { page?: number },
  opts: RequestOptions = {}
): Promise<DecisionsPage> {
  const qs = new URLSearchParams();
  const map: Record<string, string | number | undefined> = {
    status: params.status,
    departmentId: params.departmentId,
    roleTitle: params.roleTitle,
    query: params.query,
    from: params.fromJalali,
    to: params.toJalali,
    minScore: params.minScore,
    sort: params.sort,
    page: params.page,
  };
  Object.entries(map).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
  });
  return jsonFetch(`/api/decisions/resumes?${qs.toString()}`, undefined, opts);
}

export interface ResumeFileInfo {
  hasFile: boolean;
  fileName: string;
  ext: string;
  mimeType: string;
  previewable: boolean;
}

export function fetchResumeFileInfo(resumeId: string, opts: RequestOptions = {}): Promise<ResumeFileInfo> {
  return jsonFetch(`/api/resumes/${resumeId}/file-info`, undefined, opts);
}

export function uploadResumeFileAsync(
  recordId: string,
  fileName: string,
  fileBase64: string
): Promise<{ ok: boolean; filePath?: string | null }> {
  return jsonFetch<{ ok: boolean; filePath?: string | null }>(
    `/api/resumes/${recordId}/file`,
    {
      method: 'POST',
      body: JSON.stringify({ fileName, fileBase64 }),
    },
    { timeoutMs: 60_000 }
  ).catch(() => ({ ok: false, filePath: null }));
}

export function deleteResume(
  id: string,
  opts: RequestOptions = {}
): Promise<{ ok: boolean; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(
    `/api/resumes/${id}`,
    { method: 'PATCH', body: JSON.stringify({ action: 'delete' }) },
    opts
  );
}

export function markMessageSent(
  id: string,
  opts: RequestOptions = {}
): Promise<{ record: ResumeRecord }> {
  return jsonFetch(
    `/api/resumes/${id}`,
    { method: 'PATCH', body: JSON.stringify({ action: 'message-sent' }) },
    opts
  );
}

export function addToBank(
  id: string,
  bankDepartmentId: string,
  note: string,
  tags: string[],
  opts: RequestOptions = {}
): Promise<{ record: ResumeRecord }> {
  return jsonFetch(
    `/api/resumes/${id}/bank`,
    { method: 'POST', body: JSON.stringify({ bankDepartmentId, note, tags }) },
    opts
  );
}

export function removeFromBank(id: string, opts: RequestOptions = {}): Promise<{ record: ResumeRecord }> {
  return jsonFetch(`/api/resumes/${id}/bank`, { method: 'DELETE' }, opts);
}

export function draftMessage(
  resumeId: string,
  kind: MessageKind,
  opts: RequestOptions = {}
): Promise<DraftMessage> {
  return jsonFetch(
    '/api/messages/draft',
    { method: 'POST', body: JSON.stringify({ resumeId, kind }) },
    { timeoutMs: 45_000, ...opts }
  );
}

export function fetchBankDepartments(
  opts: RequestOptions = {}
): Promise<{ departments: BankDepartmentCount[]; tags: string[] }> {
  return jsonFetch('/api/bank/departments', undefined, opts);
}

export function fetchDepartmentBankBatches(
  departmentId: string,
  opts: RequestOptions = {}
): Promise<{ batches: { id: string; roleTitle: string; createdAtJalali: string }[] }> {
  return jsonFetch(`/api/bank/departments/${departmentId}/batches`, undefined, opts);
}

export function fetchBankResumes(
  departmentId: string,
  params: Record<string, string | number | undefined>,
  opts: RequestOptions = {}
): Promise<PagedResult<ResumeRecord>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
  });
  return jsonFetch(`/api/bank/departments/${departmentId}/resumes?${qs.toString()}`, undefined, opts);
}

export function fileDownloadUrl(resumeId: string): string {
  const uid = getUserId();
  return uid ? `/api/resumes/${resumeId}/file?uid=${encodeURIComponent(uid)}` : `/api/resumes/${resumeId}/file`;
}

/** Same endpoint rendered in the browser (PDF/image preview) instead of downloaded. */
export function filePreviewUrl(resumeId: string): string {
  const uid = getUserId();
  const base = `/api/resumes/${resumeId}/file?inline=1`;
  return uid ? `${base}&uid=${encodeURIComponent(uid)}` : base;
}

/** Preview/QA helper: creates one demo screening session for the current user. */
export function seedDemoData(
  opts: RequestOptions = {}
): Promise<{ batchId: string; created: number }> {
  return jsonFetch('/api/demo/seed', { method: 'POST' }, { timeoutMs: 90_000, ...opts });
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error || new Error('خواندن فایل ممکن نشد'));
    reader.onabort = () => reject(new Error('خواندن فایل لغو شد'));
    reader.readAsDataURL(file);
  });
}
