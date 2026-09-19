import { ResumeRecord } from '../types/screening';
import { fileDownloadUrl, scopedHeaders } from './api';

/**
 * Downloads the original resume file.
 *
 * Fetching as a blob (instead of navigating to the URL) keeps the scoped
 * x-user-id header on the request; if that fails for any reason we fall back to
 * a plain navigation, which still works because the API accepts ?uid=.
 */
export async function downloadResumeFile(record: ResumeRecord): Promise<void> {
  if (!record.filePath) return;
  try {
    const res = await fetch(fileDownloadUrl(record.id), { headers: scopedHeaders() });
    if (!res.ok) throw new Error(`خطا در دریافت فایل (${res.status})`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = record.fileName || 'resume';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.warn('Blob download failed, using direct navigation:', err);
    window.location.href = fileDownloadUrl(record.id);
  }
}
