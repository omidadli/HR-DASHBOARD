/**
 * Opt-in demo mode.
 *
 * Opening the app with `?demo=1` seeds one sample screening session for the
 * current device user (server-side, non-production only) so every screen —
 * results, decisions, bank, the analysis+resume page — can be reviewed without
 * a Gemini key or real uploads. The flag and the "already seeded" marker live
 * in localStorage, so it never re-seeds behind the user's back.
 */
const FLAG_KEY = 'seilaneh.demo.requested.v1';
const SEEDED_KEY = 'seilaneh.demo.seeded.v1';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isDemoRequested(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('demo') === '1' || url.hash.indexOf('demo') >= 0) {
      storage()?.setItem(FLAG_KEY, '1');
    }
  } catch {
    // SSR / unsupported URL — fall back to the stored flag below.
  }
  return storage()?.getItem(FLAG_KEY) === '1';
}

export function hasSeededDemo(userId: string): boolean {
  const raw = storage()?.getItem(SEEDED_KEY);
  if (!raw) return false;
  try {
    return (JSON.parse(raw) as string[]).includes(userId);
  } catch {
    return false;
  }
}

export function markDemoSeeded(userId: string): void {
  const s = storage();
  if (!s) return;
  let list: string[] = [];
  try {
    list = JSON.parse(s.getItem(SEEDED_KEY) || '[]') as string[];
  } catch {
    list = [];
  }
  if (!list.includes(userId)) {
    s.setItem(SEEDED_KEY, JSON.stringify([...list, userId]));
  }
}
