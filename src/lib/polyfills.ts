/**
 * Essential browser polyfills for iOS Safari (WebKit) and older mobile browsers.
 * Fixes missing ECMAScript features:
 * - Promise.withResolvers (iOS < 17.4 - critical for pdfjs-dist)
 * - Object.hasOwn (iOS < 15.4)
 * - Array.prototype.at, findLast, findLastIndex (iOS < 15.4)
 * - crypto.randomUUID (iOS < 15.4 and insecure contexts)
 * - structuredClone (iOS < 15.4)
 * - requestIdleCallback (iOS < 15.4)
 */

declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: any) => void;
    };
  }
}

export function installPolyfills(): void {
  // 1. Promise.withResolvers (Critical fix for iOS Safari < 17.4)
  if (typeof (Promise as any).withResolvers === 'undefined') {
    (Promise as any).withResolvers = function <T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: any) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  // 2. Object.hasOwn (iOS < 15.4)
  if (typeof Object.hasOwn === 'undefined') {
    Object.hasOwn = function (object: object, property: PropertyKey): boolean {
      return Object.prototype.hasOwnProperty.call(object, property);
    };
  }

  // 3. Array.prototype.at (iOS < 15.4)
  if (!Array.prototype.at) {
    Array.prototype.at = function <T>(this: T[], index: number): T | undefined {
      const k = Math.trunc(index) || 0;
      const actualIndex = k < 0 ? this.length + k : k;
      if (actualIndex < 0 || actualIndex >= this.length) return undefined;
      return this[actualIndex];
    };
  }

  // 4. Array.prototype.findLast and findLastIndex (iOS < 15.4)
  if (!(Array.prototype as any).findLast) {
    (Array.prototype as any).findLast = function <T>(
      this: T[],
      predicate: (value: T, index: number, obj: T[]) => boolean,
      thisArg?: any
    ): T | undefined {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return this[i];
      }
      return undefined;
    };
  }

  if (!(Array.prototype as any).findLastIndex) {
    (Array.prototype as any).findLastIndex = function <T>(
      this: T[],
      predicate: (value: T, index: number, obj: T[]) => boolean,
      thisArg?: any
    ): number {
      for (let i = this.length - 1; i >= 0; i--) {
        if (predicate.call(thisArg, this[i], i, this)) return i;
      }
      return -1;
    };
  }

  // 5. crypto.randomUUID (iOS Safari in non-https or older iOS)
  if (typeof window !== 'undefined') {
    if (!window.crypto) {
      (window as any).crypto = {};
    }
    if (typeof window.crypto.randomUUID !== 'function') {
      window.crypto.randomUUID = function (): `${string}-${string}-${string}-${string}-${string}` {
        return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => {
          const n = Number(c);
          const r =
            (window.crypto.getRandomValues
              ? window.crypto.getRandomValues(new Uint8Array(1))[0]
              : Math.floor(Math.random() * 256)) &
            (15 >> (n / 4));
          return (n ^ r).toString(16);
        }) as `${string}-${string}-${string}-${string}-${string}`;
      };
    }
  }

  // 6. structuredClone (iOS < 15.4)
  if (typeof globalThis.structuredClone === 'undefined') {
    globalThis.structuredClone = function <T>(value: T): T {
      if (value === undefined) return undefined as unknown as T;
      return JSON.parse(JSON.stringify(value));
    };
  }

  // 7. requestIdleCallback (iOS Safari < 15.4)
  if (typeof window !== 'undefined' && !window.requestIdleCallback) {
    window.requestIdleCallback = function (cb: IdleRequestCallback): number {
      const start = Date.now();
      return window.setTimeout(() => {
        cb({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        });
      }, 1);
    };
    window.cancelIdleCallback = function (id: number): void {
      clearTimeout(id);
    };
  }
}

// Run immediately upon module import
installPolyfills();
