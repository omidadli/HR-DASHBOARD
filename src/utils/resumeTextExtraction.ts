/**
 * Client-side resume text extraction.
 *
 * This is what makes AI resume screening real instead of simulated: before a
 * resume file is sent to the backend, we actually read its content here
 * (PDF text layer, DOCX XML, or plain text) so the AI Agent can evaluate the
 * real words in the resume, not just the filename.
 */
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Vite-friendly worker setup: bundles the pdf.js worker as a real asset URL.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export interface ExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

const PLAIN_TEXT_EXTENSIONS = ['txt', 'md', 'json', 'csv', 'rtf'];

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

async function extractFromPdf(data: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(pageText);
  }
  return pageTexts.join('\n').trim();
}

async function extractFromDocx(data: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: data });
  return (result.value || '').trim();
}

async function extractFromPlainText(data: ArrayBuffer): Promise<string> {
  return new TextDecoder('utf-8').decode(data).trim();
}

/**
 * Extracts text from a resume file (or a JSZip blob for a file inside a
 * .zip archive). Returns success: false with an error message when the
 * format can't be parsed (e.g. a scanned/image-only PDF with no text
 * layer) — callers must NOT invent fallback resume text in that case.
 */
export async function extractResumeText(fileOrBlob: Blob, fileName: string): Promise<ExtractionResult> {
  const ext = getExtension(fileName);
  try {
    const buffer = await fileOrBlob.arrayBuffer();

    if (ext === 'pdf') {
      const text = await extractFromPdf(buffer);
      if (!text || text.length < 10) {
        return { text: '', success: false, error: 'فایل PDF فاقد لایه متنی قابل استخراج است (احتمالاً اسکن تصویری)' };
      }
      return { text, success: true };
    }

    if (ext === 'docx') {
      const text = await extractFromDocx(buffer);
      if (!text || text.length < 10) {
        return { text: '', success: false, error: 'متنی در فایل Word یافت نشد' };
      }
      return { text, success: true };
    }

    if (ext === 'doc') {
      // Legacy binary .doc is not supported by mammoth (docx-only).
      return { text: '', success: false, error: 'فرمت doc قدیمی پشتیبانی نمی‌شود؛ لطفاً به docx یا pdf تبدیل کنید' };
    }

    if (PLAIN_TEXT_EXTENSIONS.includes(ext)) {
      const text = await extractFromPlainText(buffer);
      if (!text || text.length < 10) {
        return { text: '', success: false, error: 'فایل متنی خالی است' };
      }
      return { text, success: true };
    }

    return { text: '', success: false, error: `فرمت .${ext} پشتیبانی نمی‌شود` };
  } catch (err: any) {
    return { text: '', success: false, error: err?.message || 'خطا در استخراج متن فایل' };
  }
}
