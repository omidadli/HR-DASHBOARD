/**
 * jsdom smoke test: mounts the REAL <App/> and asserts that
 *   - React commits into #root (i.e. the site is not a blank page),
 *   - the pre-React boot overlay is dismissed,
 *   - the splash screen can never trap the user (the "does not open" bug),
 *   - the welcome gate and the first step render real content.
 *
 * Requires the production server on http://127.0.0.1:3000 for the API calls.
 * Run with: node scripts/run-mount.mjs
 */
import {JSDOM} from 'jsdom';
import path from 'path';

const SERVER = process.env.BASE || 'http://127.0.0.1:3000';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: SERVER + '/',
  pretendToBeVisual: true,
});

const {window} = dom;

let failures = 0;
function assert(cond, label, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- globals React and the app expect ---
globalThis.window = window;
globalThis.document = window.document;
// Node 22 exposes `navigator` as a getter-only global.
Object.defineProperty(globalThis, 'navigator', {
  value: window.navigator,
  configurable: true,
  writable: true,
});
globalThis.location = window.location;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Element = window.Element;
globalThis.Node = window.Node;
globalThis.Event = window.Event;
globalThis.CustomEvent = window.CustomEvent;
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
globalThis.MutationObserver = window.MutationObserver;
globalThis.localStorage = window.localStorage;
globalThis.DOMException = window.DOMException || globalThis.DOMException;
if (!window.AbortController) window.AbortController = globalThis.AbortController;
if (!window.AbortSignal) window.AbortSignal = globalThis.AbortSignal;

// Route relative API calls at the real local server.
const nodeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = typeof input === 'string' && input.startsWith('/') ? SERVER + input : input;
  return nodeFetch(url, init);
};
window.fetch = globalThis.fetch;

// The inline boot script from index.html, emulated.
let bootHidden = false;
let bootFailure = null;
window.__hooshaBoot = {
  hide: () => {
    bootHidden = true;
  },
  fail: (msg) => {
    bootFailure = msg;
  },
};
globalThis.window.__hooshaBoot = window.__hooshaBoot;

const root = window.document.getElementById('root');

const {mount} = await import(path.resolve('dist-mount/mount-entry.js'));

// ---------------- case 1: first-time visitor (welcome gate) ----------------
window.localStorage.removeItem('seilaneh.app.user.v1');
mount(root);
await sleep(400);

assert(bootHidden === true, 'React committed and dismissed the pre-React boot overlay');
assert(bootFailure === null, 'no fatal boot error', bootFailure || '');
assert(root.childElementCount > 0, '#root is not empty (the page is not blank)');
assert(
  window.document.body.textContent.includes('هوشا'),
  'the welcome gate renders (first-visit overlay is on screen)'
);

// ---------------- case 2: returning user (splash must not trap them) --------
window.localStorage.setItem(
  'seilaneh.app.user.v1',
  JSON.stringify({id: 'usr_mounttest_12345', name: 'مریم', createdAtISO: new Date().toISOString()})
);

const root2 = window.document.createElement('div');
window.document.body.appendChild(root2);
mount(root2);
await sleep(400);

const overlayText = () => window.document.body.textContent || '';
assert(overlayText().includes('برای کدام دپارتمان'), 'the screening home renders behind the splash');

// The splash has a 6s watchdog + a 200ms fade. It must be gone well inside 10s
// even though the typewriter greeting drives the normal path.
let goneAt = null;
for (let i = 0; i < 100; i++) {
  const overlay = root2.querySelector('.fixed.inset-0');
  const stillBlocking =
    overlay && window.getComputedStyle(overlay).pointerEvents !== 'none' && overlay.style.opacity !== '0';
  if (!stillBlocking) {
    goneAt = i * 100;
    break;
  }
  await sleep(100);
}
assert(goneAt !== null && goneAt < 9000, `splash releases the UI (took ~${goneAt}ms)`, 'was able to hang forever');

// ---------------- case 3: real content is usable ----------------
const deptButtons = Array.from(root2.querySelectorAll('button')).filter((b) =>
  /تولید و کارخانه|فروش و پخش|منابع انسانی/.test(b.textContent || '')
);
assert(deptButtons.length >= 3, `department buttons rendered (${deptButtons.length} found)`);

assert(
  overlayText().includes('بانک رزومه'),
  'the top navigation renders'
);

// ---------------- case 4: the splash watchdog itself ----------------
// Typing two greeting lines takes ~1.5s, so with maxDurationMs=500 the watchdog
// must win. This is the exact path that used to leave the app invisible forever.
const {SplashScreen} = await import(path.resolve('dist-mount/mount-entry.js'));
const React = (await import('react')).default;
const root3 = window.document.createElement('div');
window.document.body.appendChild(root3);
const {createRoot} = await import('react-dom/client');

let splashCompletedAt = null;
const splashT0 = Date.now();
createRoot(root3).render(
  React.createElement(SplashScreen, {
    userName: 'مریم',
    maxDurationMs: 500,
    onComplete: () => {
      if (splashCompletedAt === null) splashCompletedAt = Date.now() - splashT0;
    },
  })
);
await sleep(2500);
assert(
  splashCompletedAt !== null && splashCompletedAt < 1500,
  `splash watchdog dismisses the overlay even if the greeting stalls: ${splashCompletedAt}ms`,
  'this overlay used to be able to trap the app forever'
);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
