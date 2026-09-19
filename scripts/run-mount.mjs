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
// A fresh id per run: the decision cases below assert on demo data that must not
// have been mutated by an earlier run.
const MOUNT_USER = 'usr_mounttest_' + Date.now().toString(36);
window.localStorage.setItem(
  'seilaneh.app.user.v1',
  JSON.stringify({id: MOUNT_USER, name: 'مریم', createdAtISO: new Date().toISOString()})
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

// ================ the HR decision workspace (new screens) ================
// The demo seeder gives this user one realistic screening session, so the new
// tabs, cards and the analysis+resume page can be exercised without a Gemini key.
const seeded = await nodeFetch(SERVER + '/api/demo/seed', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'x-user-id': MOUNT_USER},
});
const seedBody = await seeded.json().catch(() => ({}));
assert(seeded.status === 200 && seedBody.batchId, 'demo session seeded for the mount user', JSON.stringify(seedBody));

const buttonsOf = (root) => Array.from(root.querySelectorAll('button'));
const text2 = () => root2.textContent || '';
const titles2 = () => buttonsOf(root2).map((b) => b.getAttribute('title') || '');
const click = (el) => el && el.dispatchEvent(new window.MouseEvent('click', {bubbles: true}));

// ---------------- case 5: header section + the three lists ----------------
const decisionsTab = buttonsOf(root2).find((b) => (b.textContent || '').includes('تایید/رد شده'));
assert(Boolean(decisionsTab), 'the header has a «رزومه‌های تایید/رد شده» section');
click(decisionsTab);
await sleep(1500);

assert(text2().includes('رزومه‌های تایید/رد شده'), 'the decisions page renders');
for (const label of ['تایید شده', 'رد شده', 'نیاز به بررسی']) {
  assert(text2().includes(label), `the «${label}» list is reachable`);
}
assert(text2().includes('بازه زمانی (شمسی)'), 'the Jalali date-range filter renders');
assert(text2().includes('موقعیت شغلی'), 'the position quick-pick renders');
assert(
  text2().includes('کارشناس جذب و استخدام'),
  'the seeded job position is offered as a one-click filter'
);
assert(text2().includes('سارا محمدی'), 'an approved resume card is listed');

// ---------------- case 6: card actions ----------------
const viewButtons = buttonsOf(root2).filter((b) =>
  (b.textContent || '').includes('مشاهده تحلیل و رزومه')
);
assert(viewButtons.length >= 1, `every card leads with «مشاهده تحلیل و رزومه» (${viewButtons.length} found)`);
assert(
  buttonsOf(root2).some((b) => (b.textContent || '').includes('ارسال پیام')),
  '«ارسال پیام» is still on the card'
);
assert(titles2().includes('حذف رزومه'), 'the trash (delete) action is on the card');
assert(titles2().includes('رد رزومه'), 'the cross (reject) action is on the card');
assert(
  titles2().some((t) => t.includes('بانک رزومه')),
  'the save/bookmark (bank) action is on the card'
);

// ---------------- case 7: the analysis + original resume page ----------------
// Pick a card that carries the «بازبینی‌شده» badge so the deep findings exist.
const cardOf = (el) => el.closest('.rounded-card');
const deepCardBtn =
  viewButtons.find((b) => (cardOf(b)?.textContent || '').includes('بازبینی‌شده')) || viewButtons[0];
assert(
  Boolean(viewButtons.find((b) => (cardOf(b)?.textContent || '').includes('بازبینی‌شده'))),
  'a deep-reviewed resume is marked on its card'
);
click(deepCardBtn);
await sleep(1200);
assert(text2().includes('تحلیل هوش مصنوعی (هوشا)'), 'the page shows هوشا\'s analysis');
assert(text2().includes('فایل اصلی بارگذاری‌شده'), 'the page shows the original uploaded file');
assert(text2().includes('دانلود رزومه'), 'the page offers a download of the original resume');
assert(text2().includes('چرا این دسته؟'), 'the analysis explains the category');
assert(text2().includes('امتیاز تفصیلی معیارها'), 'the per-criterion scores render');
assert(text2().includes('یافته‌های بازبینی دقیق'), 'the deep-review findings render');
assert(
  buttonsOf(root2).some((b) => (b.textContent || '').includes('فایل رزومه')),
  'mobile gets a switch between analysis and file'
);

// The file pane mounts the preview (jsdom has no createObjectURL, so the
// graceful fallback must show instead of crashing the page).
const filePane = buttonsOf(root2).find((b) => (b.textContent || '').includes('فایل رزومه'));
click(filePane);
await sleep(1200);
assert(
  /-resume\.(pdf|txt)/.test(text2()),
  'the preview toolbar names the original file'
);
assert(!text2().includes('is not a function'), 'the preview degrades gracefully in jsdom');

// back to the list
const backBtn = buttonsOf(root2).find((b) => b.getAttribute('title') === 'بازگشت');
click(backBtn);
await sleep(600);
assert(!text2().includes('فایل اصلی بارگذاری‌شده'), 'the analysis page closes again');

// ---------------- case 8: approve / reject a card ----------------
const reviewTab = buttonsOf(root2).find((b) => b.getAttribute('title') === 'نمایش فهرست نیاز به بررسی');
click(reviewTab);
await sleep(1500);
assert(text2().includes('زهرا عباسی'), 'the needs-review list shows an undecided AI «REVIEW» resume');

const approveBtn = buttonsOf(root2).find((b) => b.getAttribute('title') === 'تایید رزومه');
assert(Boolean(approveBtn), 'a pending resume can be approved with one click (tick)');
click(approveBtn);
await sleep(1500);
assert(
  (window.document.body.textContent || '').includes('رزومه تایید شد'),
  'approving confirms with a toast'
);

const rejectBtn = buttonsOf(root2).find((b) => b.getAttribute('title') === 'رد رزومه');
assert(Boolean(rejectBtn), 'a resume can be rejected with the cross action');
click(rejectBtn);
await sleep(800);
assert(
  (window.document.body.textContent || '').includes('رد کردن رزومه'),
  'rejecting asks for a reason first'
);
const reasonChip = buttonsOf(root2).find((b) => (b.textContent || '').includes('عدم تطابق سابقه با شغل'));
click(reasonChip);
const confirmReject = buttonsOf(root2).find((b) => (b.textContent || '').trim() === 'رد کردن رزومه');
click(confirmReject);
await sleep(1500);
assert(
  (window.document.body.textContent || '').includes('به بخش «رد شده‌ها» منتقل شد'),
  'the rejected resume is moved to the rejected list'
);

// ---------------- case 9: the deep review («بازبینی») ----------------
const rejectedTab = buttonsOf(root2).find((b) => b.getAttribute('title') === 'نمایش فهرست رد شده');
assert(Boolean(rejectedTab), 'the rejected list tab is clickable');
click(rejectedTab);
await sleep(1500);
const deepBtn = buttonsOf(root2).find((b) => b.getAttribute('title') === 'بازبینی دقیق با هوشا');
assert(Boolean(deepBtn), 'the magnifier (deep review) action is available');
click(deepBtn);
// The toast disappears after 3.6s, so check well inside that window.
await sleep(1500);
const bodyText = window.document.body.textContent || '';
assert(
  bodyText.includes('بازبینی دقیق انجام شد') || bodyText.includes('موتور محلی'),
  'the deep review reports honestly which engine answered',
  bodyText.slice(-160)
);

// ---------------- case 10: one-tap save into the talent bank ----------------
const approvedTab = buttonsOf(root2).find((b) => b.getAttribute('title') === 'نمایش فهرست تایید شده');
click(approvedTab);
await sleep(1500);
const saveBtn = buttonsOf(root2).find((b) => b.getAttribute('title') === 'ذخیره در بانک رزومه');
assert(Boolean(saveBtn), 'the bookmark action offers a one-tap save into the bank');
click(saveBtn);
await sleep(1500);
assert(
  (window.document.body.textContent || '').includes('در بانک رزومه ذخیره شد'),
  'one tap saves the resume in the talent bank'
);
assert(
  titles2().some((t) => t.includes('در بانک رزومه ذخیره شده')),
  'the saved state is shown on the card'
);

// ---------------- cleanup: drop the demo session again ----------------
const cleaned = await nodeFetch(SERVER + '/api/screening/batches/' + seedBody.batchId, {
  method: 'DELETE',
  headers: {'Content-Type': 'application/json', 'x-user-id': MOUNT_USER},
});
assert(cleaned.status === 200, 'the demo session can be deleted again', `status=${cleaned.status}`);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
