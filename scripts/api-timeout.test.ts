/**
 * Test for the client API layer's timeout + abort plumbing.
 *
 * Before the fix, `jsonFetch` called bare `fetch()` with no deadline and never
 * forwarded the caller's AbortSignal. A single unresponsive request therefore
 * froze an entire screening batch forever — the UI spun, nothing errored, and
 * even the «لغو» button could not stop the in-flight work.
 *
 * Run with: npx tsx scripts/api-timeout.test.ts
 */
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
store.set(
  'seilaneh.app.user.v1',
  JSON.stringify({ id: 'usr_timeouttest_1234', name: 'تست', createdAtISO: new Date().toISOString() })
);

let failures = 0;
function assert(cond: boolean, label: string, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

let lastInit: RequestInit | undefined;
let lastUrl: string | undefined;

/** A server that accepts the request and then never answers. */
function installHangingFetch() {
  (globalThis as any).fetch = (url: string, init?: RequestInit) => {
    lastUrl = url;
    lastInit = init;
    return new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('This operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
  };
}

function installOkFetch(body: unknown) {
  (globalThis as any).fetch = (url: string, init?: RequestInit) => {
    lastUrl = url;
    lastInit = init;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    });
  };
}

async function main() {
  const { checkHealth, fetchRecentBatches, evaluateResume } = await import('../src/lib/api');

  // ---- 1. every request carries an AbortSignal ----
  installOkFetch([]);
  await fetchRecentBatches(3);
  assert(
    lastInit?.signal instanceof AbortSignal,
    'a plain request is given an AbortSignal (it had none before)',
    `signal=${lastInit?.signal ? 'present' : 'missing'}`
  );
  assert(
    (lastInit?.headers as Record<string, string>)?.['x-user-id'] === 'usr_timeouttest_1234',
    'the user scope header is still sent'
  );

  // ---- 2. a hung request hits the deadline instead of hanging forever ----
  installHangingFetch();
  const t0 = Date.now();
  const health = await checkHealth({ timeoutMs: 400 });
  assert(
    health.available === false && /بیش از|ثانیه/.test(health.error || ''),
    'a hung request surfaces as a readable timeout, not an endless spinner',
    `error="${health.error}" (${Date.now() - t0}ms)`
  );

  // ---- 3. the deadline really is enforced on the screening call ----
  installHangingFetch();
  const t1 = Date.now();
  try {
    await evaluateResume(
      { batchId: 'bat_x', fileName: 'a.pdf', extractedText: 'x', unjudgeableReason: null },
      { timeoutMs: 500 }
    );
    assert(false, 'evaluate should have rejected');
  } catch (e: any) {
    const ms = Date.now() - t1;
    assert(ms >= 450 && ms < 2500, `evaluate rejects at its deadline: ${ms}ms`, e?.message);
    assert(/بیش از/.test(String(e?.message)), 'the timeout error is in Persian and honest', e?.message);
  }

  // ---- 4. the caller's abort wins over the deadline ----
  installHangingFetch();
  const controller = new AbortController();
  const t2 = Date.now();
  const pending = evaluateResume(
    { batchId: 'bat_x', fileName: 'a.pdf', extractedText: 'x', unjudgeableReason: null },
    { timeoutMs: 30_000, signal: controller.signal }
  );
  setTimeout(() => controller.abort(), 120);
  try {
    await pending;
    assert(false, 'evaluate should have rejected on abort');
  } catch (e: any) {
    const ms = Date.now() - t2;
    assert(ms < 2000, `caller abort stops the request immediately: ${ms}ms (deadline was 30s)`);
    assert(e?.name === 'AbortError', 'abort propagates as AbortError so the runner can distinguish it', e?.name);
  }

  // ---- 5. an already-aborted signal never reaches the network ----
  installOkFetch({ ok: true });
  const dead = new AbortController();
  dead.abort();
  try {
    await fetchRecentBatches(3, { signal: dead.signal });
    assert(false, 'an already-aborted call should not resolve');
  } catch {
    assert(true, 'an already-aborted signal rejects before hitting the network');
  }

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('TEST CRASHED:', e);
  process.exit(1);
});
