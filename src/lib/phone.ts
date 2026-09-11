import { toEnglishDigits } from './normalizeFa';

/** Normalize an Iranian mobile number to the wa.me format 989xxxxxxxxx. */
export function normalizeIranMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = toEnglishDigits(raw).replace(/[^\d]/g, '');
  // Common patterns: 09xxxxxxxxx, 989xxxxxxxxx, 00989xxxxxxxxx, 9xxxxxxxxx
  const m = s.match(/(?:0098|98|0)?(9\d{9})$/);
  if (m) return '98' + m[1];
  return null;
}

export function whatsappLink(raw: string | null | undefined, text?: string): string | null {
  const n = normalizeIranMobile(raw);
  if (!n) return null;
  const t = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${n}${t}`;
}

export function smsLink(raw: string | null | undefined, body?: string): string | null {
  if (!raw) return null;
  const n = normalizeIranMobile(raw);
  if (!n) return null;
  const b = body ? `?&body=${encodeURIComponent(body)}` : '';
  return `sms:${n.startsWith('98') ? '0' + n.slice(2) : n}${b}`;
}

export function mailLink(email: string | null | undefined, subject?: string, body?: string): string | null {
  if (!email) return null;
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  const qs = params.toString();
  return `mailto:${email}${qs ? '?' + qs : ''}`;
}
