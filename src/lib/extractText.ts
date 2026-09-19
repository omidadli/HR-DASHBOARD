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
 * Fails gracefully so visual or complex PDFs proceed to Gemini multimodal vision.
 */
async function extractFromPdfWithCoordinates(buffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await loadPdfJs();

  // Make a defensive copy of buffer slice so original arrayBuffer isn't detached
  const dataCopy = new Uint8Array(buffer.slice(0));

  let loadingTask: any;
  try {
    loadingTask = pdfjsLib.getDocument({
      data: dataCopy,
      useSystemFonts: true,
    } as any);
  } catch (initErr) {
    // If worker init failed, try in main thread mode
    try {
      (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
      loadingTask = pdfjsLib.getDocument({
        data: dataCopy,
        useSystemFonts: true,
      } as any);
    } catch {
      return '';
    }
  }

  try {
    const pdf: any = await withTimeout(loadingTask.promise, 20_000, 'باز کردن فایل PDF');
    const pageTexts: string[] = [];
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
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
        const midX = viewport.width / 2;
        const leftCount = items.filter((it) => it.x < midX - 20).length;
        const rightCount = items.filter((it) => it.x > midX + 20).length;
        const isTwoColumn = leftCount > 15 && rightCount > 15;

        let sortedText = '';

        if (isTwoColumn) {
          const rightItems = items.filter((it) => it.x >= midX - 20);
          const leftItems = items.filter((it) => it.x < midX - 20);

          const sortColumn = (colItems: TextItemPos[]) => {
            return colItems
              .sort((a, b) => {
                const yDiff = a.y - b.y;
                if (Math.abs(yDiff) > 6) return yDiff;
                return b.x - a.x;
              })
              .map((i) => i.str)
              .join(' ');
          };

          const rightText = sortColumn(rightItems);
          const leftText = sortColumn(leftItems);
          sortedText = `${rightText}\n\n${leftText}`;
        } else {
          items.sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > 6) return yDiff;
            return b.x - a.x;
          });
          sortedText = items.map((i) => i.str).join(' ');
        }

        pageTexts.push(sortedText);
        try {
          await page.cleanup();
        } catch {
          /* ignore */
        }
      } catch (pageErr) {
        console.warn(`Error reading PDF page ${pageNum}:`, pageErr);
      }
    }

    return pageTexts.join('\n\n').trim();
  } catch (err) {
    console.warn('PDF text extraction caught error, falling back to multimodal:', err);
    return '';
  } finally {
    try {
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        await loadingTask.destroy();
      }
    } catch {
      /* ignore */
    }
  }
}

/**
 * Extract text from DOCX using mammoth with fallback to direct XML extraction
 */
async function extractFromDocx(buffer: ArrayBuffer): Promise<string> {
  try {
    const result = await withTimeout(
      mammoth.extractRawText({ arrayBuffer: buffer.slice(0) }),
      15_000,
      'باز کردن فایل Word'
    );
    if (result?.value && result.value.trim().length > 10) {
      return result.value.trim();
    }
  } catch (mErr) {
    console.warn('Mammoth extraction failed, trying zip xml fallback:', mErr);
  }

  // Fallback: direct ZIP parsing of word/document.xml
  return extractDocxViaZip(buffer);
}

/**
 * Direct XML text extraction from DOCX archive (bypasses mammoth formatting errors)
 */
async function extractDocxViaZip(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    const loaded = await zip.loadAsync(buffer.slice(0));
    const docXml = loaded.files['word/document.xml'];
    if (!docXml) return '';
    const xmlText = await docXml.async('string');
    const paragraphs = xmlText.split(/<\/w:p>/);
    const lines: string[] = [];
    for (const p of paragraphs) {
      const matches = p.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
      if (matches) {
        const line = matches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join('')
          .trim();
        if (line) lines.push(line);
      }
    }
    return lines.join('\n');
  } catch (zipErr) {
    console.warn('Docx direct XML extraction error:', zipErr);
    return '';
  }
}

/**
 * Extract text from TXT or other plain formats with UTF-8 and Persian Windows-1256 fallback
 */
function extractFromPlainText(buffer: ArrayBuffer): string {
  try {
    const utf8Text = new TextDecoder('utf-8').decode(buffer).trim();
    if (utf8Text && !utf8Text.includes('\uFFFD')) {
      return utf8Text;
    }
    // Try Persian Windows-1256 if UTF-8 has replacement characters
    try {
      const winDecoder = new TextDecoder('windows-1256');
      const winText = winDecoder.decode(buffer).trim();
      if (winText && !winText.includes('\uFFFD')) {
        return winText;
      }
    } catch {
      /* ignore */
    }
    return utf8Text;
  } catch {
    return '';
  }
}

/**
 * Main extractor: returns clean normalized text or marks for multimodal AI processing.
 * NEVER rejects a non-empty file: visual PDFs, scanned files, images, and documents
 * will proceed to Gemini multimodal analysis.
 */
export async function extractResumeContent(file: File | Blob, fileName: string): Promise<TextExtractionResult> {
  const ext = getExtension(fileName);

  if (file.size === 0) {
    return {
      text: '',
      success: false,
      unjudgeableReason: 'فایل خالی و بدون محتواست (حجم صفر بایت)',
    };
  }

  try {
    const buffer = await withTimeout(
      file.arrayBuffer(),
      DOCUMENT_TIMEOUT_MS,
      'خواندن فایل'
    );

    // 1. PDF
    if (ext === 'pdf') {
      let rawText = '';
      try {
        rawText = await extractFromPdfWithCoordinates(buffer);
      } catch (pdfErr) {
        console.warn('PDF text extraction error, proceeding with vision:', pdfErr);
      }
      const normalized = normalizePersianText(rawText);
      // If we extracted good text, use it. If text is sparse (scanned or image-only PDF),
      // mark isVisualDocument = true so Gemini multimodal reads the full file!
      const hasGoodText = Boolean(normalized && normalized.trim().length >= 50);
      return {
        text: normalized || '',
        success: true,
        isVisualDocument: !hasGoodText,
      };
    }

    // 2. Images (JPG, PNG, WEBP, HEIC, HEIF, BMP, TIFF, GIF)
    if (['png', 'jpg', 'jpeg', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'gif'].includes(ext)) {
      return {
        text: '',
        success: true,
        isVisualDocument: true,
      };
    }

    // 3. Word DOCX
    if (ext === 'docx') {
      let rawText = '';
      try {
        rawText = await extractFromDocx(buffer);
      } catch (docxErr) {
        console.warn('DOCX extraction error:', docxErr);
      }
      const normalized = normalizePersianText(rawText);
      return {
        text: normalized || '',
        success: true,
        isVisualDocument: !normalized || normalized.trim().length < 30,
      };
    }

    // 4. Legacy Word DOC (97-2003)
    if (ext === 'doc') {
      let rawText = '';
      try {
        rawText = extractFromDocBinary(buffer);
      } catch (docErr) {
        console.warn('Legacy DOC binary extraction error:', docErr);
      }
      const normalized = normalizePersianText(rawText);
      return {
        text: normalized || '',
        success: true,
        isVisualDocument: !normalized || normalized.trim().length < 30,
      };
    }

    // 5. Plain / Rich Text (TXT, RTF, MD, CSV, LOG, ODT)
    if (['txt', 'rtf', 'md', 'text', 'csv', 'log', 'odt'].includes(ext)) {
      const rawText = extractFromPlainText(buffer);
      const normalized = normalizePersianText(rawText);
      return {
        text: normalized || rawText,
        success: true,
      };
    }

    // 6. Any other non-empty file format:
    // Pass along to Gemini multimodal / server evaluation
    return {
      text: '',
      success: true,
      isVisualDocument: true,
    };
  } catch (err: any) {
    console.warn('Extraction caught fallback for file:', fileName, err);
    // Never fail a file if it has bytes; allow server / Gemini to evaluate
    return {
      text: '',
      success: true,
      isVisualDocument: true,
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
          return ['pdf', 'docx', 'doc', 'txt', 'rtf', 'md', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'odt'].includes(entryExt);
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
