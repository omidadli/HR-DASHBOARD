import type {
  BankDepartmentCount,
  DraftMessage,
  JobUnderstanding,
  MessageKind,
  PagedResult,
  ResumeRecord,
  ScreeningAnswers,
  ScreeningBatch,
} from '../types/screening';

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `خطای سرور (${res.status})`);
  return data as T;
}

export async function checkHealth(): Promise<{ available: boolean; error?: string }> {
  try {
    const h = await jsonFetch<{ hasGeminiKey: boolean }>('/api/screening/health');
    if (!h.hasGeminiKey) {
      return {
        available: false,
        error: 'کلید هوش مصنوعی (GEMINI_API_KEY) روی سرور تعریف نشده است.',
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
  extraNotes: string
): Promise<JobUnderstanding> {
  return jsonFetch('/api/screening/understand', {
    method: 'POST',
    body: JSON.stringify({ departmentId, roleTitle, extraNotes }),
  });
}

export function createBatch(input: {
  departmentId: string;
  roleTitle: string;
  extraNotes: string;
  understanding: JobUnderstanding;
  answers: ScreeningAnswers;
}): Promise<ScreeningBatch> {
  return jsonFetch('/api/screening/batches', { method: 'POST', body: JSON.stringify(input) });
}

export async function evaluateResume(input: {
  batchId: string;
  fileName: string;
  extractedText: string;
  unjudgeableReason: string | null;
  fileBase64?: string;
}): Promise<{ record: ResumeRecord; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(`/api/screening/batches/${input.batchId}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function calibrateBatch(
  batchId: string
): Promise<{ batch: ScreeningBatch; resumes: ResumeRecord[]; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(`/api/screening/batches/${batchId}/calibrate`, { method: 'POST' });
}

export function fetchBatch(
  batchId: string
): Promise<{ batch: ScreeningBatch; resumes: ResumeRecord[] }> {
  return jsonFetch(`/api/screening/batches/${batchId}`);
}

export function fetchRecentBatches(limit = 5): Promise<ScreeningBatch[]> {
  return jsonFetch(`/api/screening/batches?limit=${limit}`);
}

export function rerunResume(id: string): Promise<{ record: ResumeRecord; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(`/api/resumes/${id}/rerun`, { method: 'POST' });
}

export function deleteResume(id: string): Promise<{ ok: boolean; stats: ScreeningBatch['stats'] }> {
  return jsonFetch(`/api/resumes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'delete' }),
  });
}

export function markMessageSent(id: string): Promise<{ record: ResumeRecord }> {
  return jsonFetch(`/api/resumes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'message-sent' }),
  });
}

export function addToBank(
  id: string,
  bankDepartmentId: string,
  note: string,
  tags: string[]
): Promise<{ record: ResumeRecord }> {
  return jsonFetch(`/api/resumes/${id}/bank`, {
    method: 'POST',
    body: JSON.stringify({ bankDepartmentId, note, tags }),
  });
}

export function removeFromBank(id: string): Promise<{ record: ResumeRecord }> {
  return jsonFetch(`/api/resumes/${id}/bank`, { method: 'DELETE' });
}

export function draftMessage(resumeId: string, kind: MessageKind): Promise<DraftMessage> {
  return jsonFetch('/api/messages/draft', {
    method: 'POST',
    body: JSON.stringify({ resumeId, kind }),
  });
}

export function fetchBankDepartments(): Promise<{
  departments: BankDepartmentCount[];
  tags: string[];
}> {
  return jsonFetch('/api/bank/departments');
}

export function fetchDepartmentBankBatches(
  departmentId: string
): Promise<{ batches: { id: string; roleTitle: string; createdAtJalali: string }[] }> {
  return jsonFetch(`/api/bank/departments/${departmentId}/batches`);
}

export function fetchBankResumes(
  departmentId: string,
  params: Record<string, string | number | undefined>
): Promise<PagedResult<ResumeRecord>> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== 'all') qs.set(k, String(v));
  });
  return jsonFetch(`/api/bank/departments/${departmentId}/resumes?${qs.toString()}`);
}

export function fileDownloadUrl(resumeId: string): string {
  return `/api/resumes/${resumeId}/file`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
