/**
 * Client-side user identity (multi-user support).
 *
 * A lightweight account: { id, name } persisted in localStorage. The unique
 * id is sent with API calls (x-user-id header) so the server can scope
 * screening batches and the talent bank to the same person — no login
 * system, no passwords; the name is only used for هوشا's greeting.
 */

export interface StoredUser {
  id: string;
  name: string;
  createdAtISO: string;
}

const STORAGE_KEY = 'seilaneh.app.user.v1';
let memoryUser: StoredUser | null = null;

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // ignore
  }
  return null;
}

export function getStoredUser(): StoredUser | null {
  if (memoryUser) return memoryUser;
  try {
    const storage = getStorage();
    if (!storage) return null;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.id === 'string' &&
      parsed.id.length >= 8 &&
      typeof parsed.name === 'string' &&
      parsed.name.trim()
    ) {
      memoryUser = { id: parsed.id, name: parsed.name, createdAtISO: parsed.createdAtISO || '' };
      return memoryUser;
    }
    return null;
  } catch {
    return memoryUser;
  }
}

export function getUserId(): string | null {
  return getStoredUser()?.id || null;
}

/** Create a unique id for a new user and persist it on this device. */
export function registerUser(name: string): StoredUser {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
  const user: StoredUser = {
    id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
    name: clean,
    createdAtISO: new Date().toISOString(),
  };
  memoryUser = user;
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  } catch {
    // Private mode etc. — the in-memory identity still works for this session.
  }
  return user;
}

/**
 * Time-of-day greeting on the Iranian wall clock (Asia/Tehran), used by
 * هوشا to welcome back returning users, e.g. «سلام علی، ظهرت بخیر».
 */
export function timeGreeting(now: Date = new Date()): string {
  let hour: number;
  try {
    const h = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tehran',
      hour: '2-digit',
      hour12: false,
    }).format(now);
    const num = parseInt(h, 10);
    hour = !isNaN(num) ? num % 24 : now.getHours();
  } catch {
    hour = now.getHours();
  }
  if (hour >= 5 && hour < 12) return 'صبح بخیر';
  if (hour >= 12 && hour < 16) return 'ظهرت بخیر';
  if (hour >= 16 && hour < 19) return 'عصر بخیر';
  return 'شب بخیر';
}
