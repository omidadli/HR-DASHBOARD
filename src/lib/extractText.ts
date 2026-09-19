import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { normalizePersianText } from './normalizeFa';

export interface TextExtractionResult {
  text: string;
  success: boolean;
  unjudgeableReason?: string;
  isVisualDocument?: boolean;
}

export interface UnpackedFile {
  name: string;
  file: File;
  size: number;
}

/** Upper bound on parsed PDF pages: a 300-page scan must not freeze the queue. */
const MAX_PDF_PAGES = 40;
/** Hard wall-clock budget for opening + reading a single document. */
const DOCUMENT_TIMEOUT_MS = 45_000;

/** pdf.js is heavy (~1.2 MB); load it only when a PDF actually shows up. */
type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
let pdfjsPromise: Promise<PdfJsModule> | null = null;

function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs')
      .then((mod) => {
        const lib = (mod as any).default ?? mod;
        // Same-origin worker only. The previous cdnjs.cloudflare.com fallback
        // pointed at a pdf.js version that does not exist there for v6 and is
        // frequently blocked on Iranian networks, which made extraction hang.
        try {
          lib.GlobalWorkerOptions.workerSrc = pdfWorker;
        } catch (e) {
          console.warn('Could not set pdf.js workerSrc:', e);
        }
        return lib as PdfJsModule;
      })
      .catch((err) => {
        pdfjsPromise = null; // allow a retry on the next file
        throw err;
      });
  }
  return pdfjsPromise;
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

/** Rejects with a readable Persian error once `ms` elapses. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} بیش از ${Math.round(ms / 1000)} ثانیه طول کشید`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

/**
 * Lightweight binary text extractor for legacy .doc (Word 97-2003)
 */
function extractFromDocBinary(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    // Large legacy .doc files produce huge intermediate strings; cap the scan
    // so a single file cannot stall the main thread on a phone.
    const window = bytes.length > 4_000_000 ? bytes.subarray(0, 4_000_000) : bytes;
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    // Look for UTF-16LE text streams common in Word FIB structures
    const utf16Decoder = new TextDecoder('utf-16le', { fatal: false });
    const utf16Text = utf16Decoder.decode(window);
    // Filter out control and noise characters
    const cleanU16 = utf16Text.replace(/[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s.,;:!?@#%&*()_\-+=/]/g, ' ').replace(/\s{2,}/g, ' ');
    if (cleanU16.trim().length > 100) {
      return cleanU16.trim();
    }
    const plainText = textDecoder.decode(window);
    const cleanPlain = plainText.replace(/[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s.,;:!?@#%&*()_\-+=/]/g, ' ').replace(/\s{2,}/g, ' ');
    return cleanPlain.trim();
  } catch {
    return '';
  }
}

/**
 * PDF Text extraction with coordinate-aware layout sorting.
 * Detects two-column resumes and sorts items reading-order (Y descending, X ascending or right-to-left for Persian).
 */
async function extractFromPdfWithCoordinates(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await loadPdfJs();

  // getDocument never rejects when the worker cannot be fetched — it just
  // hangs. The timeout is what keeps a single bad PDF from freezing the batch.
  const loadingTask = pdfjsLib.getDocument({ data: buffer, useSystemFonts: true });
  const pdf = await withTimeout(loadingTask.promise, DOCUMENT_TIMEOUT_MS, 'باز کردن فایل PDF');

  try {
    const pageTexts: string[] = [];
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.0 });
      const content = await page.getTextContent();

      interface TextItemPos {
        str: string;
        x: number;
        y: number; // in PDF coords, y is from bottom, so viewport.height - y is from top
        height: number;
      }

      const items: TextItemPos[] = [];
      for (const item of content.items) {
        if ('str' in item && item.str.trim()) {
          const tx = item.transform[4];
          const ty = viewport.height - item.transform[5]; // top-down coordinate
          items.push({
            str: item.str,
            x: tx,
            y: ty,
            height: item.height || 10,
          });
        }
      }

      if (items.length === 0) continue;

      // Check if the page looks like a 2-column layout
      // Midpoint along page width
      const midX = viewport.width / 2;
      const leftCount = items.filter((it) => it.x < midX - 20).length;
      const rightCount = items.filter((it) => it.x > midX + 20).length;
      const isTwoColumn = leftCount > 15 && rightCount > 15;

      let sortedText = '';

      if (isTwoColumn) {
        // In RTL Persian layouts, right column is read first, then left column (or vice versa for English)
        // Check Persian text ratio on right side vs left side
        const rightItems = items.filter((it) => it.x >= midX - 20);
        const leftItems = items.filter((it) => it.x < midX - 20);

        // Sort by Y ascending (from top to bottom), then X
        const sortColumn = (colItems: TextItemPos[]) => {
          return colItems
            .sort((a, b) => {
              const yDiff = a.y - b.y;
              if (Math.abs(yDiff) > 6) return yDiff; // Different lines
              return b.x - a.x; // RTL line reading
            })
            .map((i) => i.str)
            .join(' ');
        };

        // Right column first (Persian RTL reading order), then Left column
        const rightText = sortColumn(rightItems);
        const leftText = sortColumn(leftItems);
        sortedText = `${rightText}\n\n${leftText}`;
      } else {
        // Standard single column: sort lines top to bottom
        // Group items with similar Y into lines
        items.sort((a, b) => {
          const yDiff = a.y - b.y;
          if (Math.abs(yDiff) > 6) return yDiff;
          return b.x - a.x; // Right to left
        });
        sortedText = items.map((i) => i.str).join(' ');
      }

      pageTexts.push(sortedText);
      // Release the page proxy so long PDFs do not pile up in memory.
      try {
        await page.cleanup();
      } catch {
        /* ignore */
      }
    }

    return pageTexts.join('\n\n').trim();
  } finally {
    // Frees the worker + the document buffer; without this, a batch of large
    // PDFs keeps every document alive until the tab is closed.
    try {
      await loadingTask.destroy();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Extract text from DOCX
 */
async function extractFromDocx(buffer: ArrayBuffer): Promise<string> {
  const result = await withTimeout(
    mammoth.extractRawText({ arrayBuffer: buffer }),
    DOCUMENT_TIMEOUT_MS,
    'باز کردن فایل Word'
  );
  return (result.value || '').trim();
}

/**
 * Extract text from TXT or other plain formats
 */
function extractFromPlainText(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(buffer).trim();
}

/**
 * Main extractor: returns clean normalized text or reasons for unjudgeability.
 */
export async function extractResumeContent(file: File | Blob, fileName: string): Promise<TextExtractionResult> {
  const ext = getExtension(fileName);

  try {
    const buffer = await withTimeout(
      file.arrayBuffer(),
      DOCUMENT_TIMEOUT_MS,
      'خواندن فایل'
    );

    if (ext === 'pdf') {
      const rawText = await extractFromPdfWithCoordinates(buffer);
      const normalized = normalizePersianText(rawText);
      // If PDF has readable text layer, use it. If not (scanned or image-based),
      // mark isVisualDocument = true so Gemini multimodal can evaluate directly!
      if (!normalized || normalized.length < 30) {
        return {
          text: normalized || '',
          success: true,
          isVisualDocument: true,
        };
      }
      return { text: normalized, success: true, isVisualDocument: false };
    }

    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      // Direct visual document supported via Gemini multimodal vision
      return {
        text: '',
        success: true,
        isVisualDocument: true,
      };
    }

    if (ext === 'docx') {
      const rawText = await extractFromDocx(buffer);
      const normalized = normalizePersianText(rawText);
      if (!normalized || normalized.length < 20) {
        return {
          text: '',
          success: false,
          unjudgeableReason: 'فایل Word فاقد متن کافی یا خالی است (کمتر از ۲۰ کاراکتر)',
        };
      }
      return { text: normalized, success: true };
    }

    if (ext === 'doc') {
      const rawText = extractFromDocBinary(buffer);
      const normalized = normalizePersianText(rawText);
      if (normalized && normalized.length >= 30) {
        return { text: normalized, success: true };
      }
      return {
        text: '',
        success: false,
        unjudgeableReason: 'فایل doc قدیمی متن استخراج‌پذیری ندارد (لطفاً به docx یا pdf تبدیل فرمایید)',
      };
    }

    if (['txt', 'rtf', 'md'].includes(ext)) {
      const rawText = extractFromPlainText(buffer);
      const normalized = normalizePersianText(rawText);
      if (!normalized || normalized.length < 20) {
        return {
          text: '',
          success: false,
          unjudgeableReason: 'فایل متنی خالی است یا محتوای کافی ندارد',
        };
      }
      return { text: normalized, success: true };
    }

    return {
      text: '',
      success: false,
      unjudgeableReason: `فرمت فایل (${ext}) معتبر نیست (فرمت‌های مجاز: PDF, Word, تصاویر رزومه, TXT, ZIP)`,
    };
  } catch (err: any) {
    return {
      text: '',
      success: false,
      unjudgeableReason: `خطا در باز کردن فایل: ${err?.message || 'فایل خراب است'}`,
    };
  }
}

/**
 * Handles multi-file unpacking including ZIP files.
 * Recursively extracts files from ZIP archives with real-time progress callbacks.
 */
export async function processUploadFiles(
  rawFiles: File[],
  onProgress?: (unpackedCount: number, totalEntries: number, currentName: string) => void
): Promise<File[]> {
  const flattened: File[] = [];

  for (const f of rawFiles) {
    const ext = getExtension(f.name);
    if (ext === 'zip') {
      try {
        const zip = new JSZip();
        const loaded = await withTimeout(zip.loadAsync(f), 120_000, 'باز کردن فایل فشرده');
        const entries = Object.keys(loaded.files);

        // Filter valid resume entries
        const validKeys = entries.filter((relPath) => {
          const entry = loaded.files[relPath];
          if (entry.dir || relPath.includes('__MACOSX') || relPath.startsWith('.') || relPath.includes('/.')) {
            return false;
          }
          const entryExt = getExtension(entry.name);
          return ['pdf', 'docx', 'doc', 'txt', 'rtf', 'md', 'jpg', 'jpeg', 'png', 'webp'].includes(entryExt);
        });

        let count = 0;
        for (const relativePath of validKeys) {
          const zipEntry = loaded.files[relativePath];
          const blob = await zipEntry.async('blob');
          const innerFileName = zipEntry.name.split('/').pop() || zipEntry.name;
          const unpackedFile = new File([blob], innerFileName, {
            type: blob.type || 'application/octet-stream',
            lastModified: zipEntry.date?.getTime() || Date.now(),
          });
          flattened.push(unpackedFile);
          count++;
          if (onProgress) {
            onProgress(count, validKeys.length, innerFileName);
          }
          // Yield to the event loop so the progress UI stays responsive on
          // phones while a large archive is being unpacked.
          await new Promise((r) => setTimeout(r, 0));
        }
      } catch (err) {
        console.error('Error unpacking zip file:', err);
        flattened.push(f);
      }
    } else {
      flattened.push(f);
    }
  }

  return flattened;
}
