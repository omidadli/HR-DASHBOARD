/**
 * Normalization utilities for Persian language text and numerals.
 */

// Convert Persian and Arabic digits to English digits (for internal matching/parsing)
export function toEnglishDigits(str: string): string {
  if (!str) return '';
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(fa[i], i.toString()).replaceAll(ar[i], i.toString());
  }
  return res;
}

// Convert English digits to Persian digits for display
export function toPersianDigits(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '';
  const str = num.toString();
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/\d/g, (d) => fa[parseInt(d, 10)]);
}

// Format file size in readable Persian format
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${toPersianDigits(bytes)} بایت`;
  if (bytes < 1024 * 1024) return `${toPersianDigits((bytes / 1024).toFixed(1))} کیلوبایت`;
  return `${toPersianDigits((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
}

// Normalize Persian text: Arabic letters to Persian, zero-width spaces, multiple spaces
export function normalizePersianText(raw: string): string {
  if (!raw) return '';

  return raw
    // Arabic Yeh and Alef Maksura to Persian Ye
    .replace(/[\u064A\u0649]/g, 'ی')
    // Arabic Kaf to Persian Ke
    .replace(/\u0643/g, 'ک')
    // Arabic Heh with Yeh to Heh + ZWNJ
    .replace(/\u06C0/g, 'هٔ')
    // Remove tatweel (kashida)
    .replace(/\u0640/g, '')
    // Standardize zero-width non-joiner (half-space)
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '\u200C')
    // Collapse repeated whitespace
    .replace(/[ \t]+/g, ' ')
    // Collapse repeated newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Normalize Iranian phone numbers (+98, 0098, 98, 9xx -> 09xxxxxxxxx)
export function normalizeIranianPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  const eng = toEnglishDigits(raw).replace(/[^\d+]/g, '');
  if (eng.startsWith('+98')) return '0' + eng.slice(3);
  if (eng.startsWith('0098')) return '0' + eng.slice(4);
  if (eng.startsWith('98') && eng.length === 12) return '0' + eng.slice(2);
  if (eng.startsWith('9') && eng.length === 10) return '0' + eng;
  return eng;
}
