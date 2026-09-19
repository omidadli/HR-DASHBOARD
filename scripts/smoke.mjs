/* End-to-end smoke test against the running production server (dist/server.cjs). */
const BASE = process.env.BASE || 'http://127.0.0.1:3111';
const USER_A = 'usr_testuser_aaaaaaaaaa';
const USER_B = 'usr_testuser_bbbbbbbbbb';

const t0 = Date.now();
const log = (...a) => console.log(`[+${((Date.now() - t0) / 1000).toFixed(2)}s]`, ...a);

async function call(method, path, { body, user } = {}) {
  const start = Date.now();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { 'x-user-id': user } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text.slice(0, 120);
  }
  return { status: res.status, json, ms: Date.now() - start };
}

function assert(cond, label, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) process.exitCode = 1;
}

const understanding = {
  seniority: 'کارشناسی',
  plainExplanation: 'تست',
  thresholds: { interview: 75, review: 50 },
  criteria: [
    { id: 'c1', title: 'سابقه مرتبط', weight: 50, mustHave: true },
    { id: 'c2', title: 'مهارت فنی', weight: 50, mustHave: false },
  ],
  questions: [
    { id: 'q1', type: 'boolean', kind: 'knockout', label: 'سابقه کارگاهی', defaultChecked: true },
  ],
};

(async () => {
  // ---- 1. static + health ----
  const health = await call('GET', '/api/health');
  assert(health.status === 200 && health.json.status === 'ok', 'GET /api/health', JSON.stringify(health.json));

  const sHealth = await call('GET', '/api/screening/health');
  assert(sHealth.status === 200 && sHealth.json.hasGeminiKey === true, 'GET /api/screening/health (key present)');

  const index = await fetch(BASE + '/');
  const html = await index.text();
  assert(index.status === 200 && html.includes('id="root"'), 'GET / serves the SPA shell');
  assert(html.includes('/fonts/Vazirmatn-var.woff2'), 'index.html references the self-hosted font');
  assert(!html.includes('fonts.googleapis'), 'index.html has no Google Fonts dependency');
  assert(html.includes('polyfills-'), 'index.html loads the core-js polyfill chunk');

  const font = await fetch(BASE + '/fonts/Vazirmatn-var.woff2');
  assert(font.status === 200, 'GET /fonts/Vazirmatn-var.woff2', `status=${font.status}`);

  // ---- 2. understand must fail fast + honestly with an unusable key ----
  const understand = await call('POST', '/api/screening/understand', {
    body: { departmentId: 'manufacturing', roleTitle: 'اپراتور خط', extraNotes: '' },
    user: USER_A,
  });
  assert(understand.status === 503, 'POST /understand returns 503 with a bad key', `status=${understand.status}`);
  assert(understand.ms < 20000, `POST /understand fails within 20s (was up to ~320s): ${understand.ms}ms`);
  log('understand error:', JSON.stringify(understand.json).slice(0, 160));

  // ---- 3. batch + 5 resumes, in parallel, like the runner does ----
  const batch = await call('POST', '/api/screening/batches', {
    body: {
      departmentId: 'manufacturing',
      roleTitle: 'اپراتور خط تولید',
      extraNotes: '',
      understanding,
      answers: { q1: true },
    },
    user: USER_A,
  });
  assert(batch.status === 200 && batch.json.id, 'POST /batches creates a batch', batch.json.id);
  const batchId = batch.json.id;

  const sampleText =
    'علی محمدی — کارشناس تولید. ۶ سال سابقه کار در خط تولید دارویی. آشنایی با GMP و مستندسازی. ' +
    'مدرک کارشناسی مهندسی شیمی از دانشگاه تهران. شهر: کرج. تلفن ۰۹۱۲۳۴۵۶۷۸۹.';

  const evalStart = Date.now();
  const results = await Promise.all(
    [1, 2, 3, 4, 5].map((i) =>
      call('POST', `/api/screening/batches/${batchId}/evaluate`, {
        body: {
          batchId,
          fileName: `resume-${i}.txt`,
          extractedText: sampleText,
          unjudgeableReason: null,
        },
        user: USER_A,
      })
    )
  );
  const evalMs = Date.now() - evalStart;
  const okCount = results.filter((r) => r.status === 200 && r.json.record?.id).length;
  assert(okCount === 5, `5/5 parallel evaluations persisted (${okCount}/5)`, `total ${evalMs}ms`);
  assert(
    evalMs < 60000,
    `batch of 5 finishes in under 60s with a dead AI key: ${evalMs}ms`,
    'circuit breaker + local fallback engaged'
  );
  const engines = results.map((r) => r.json.record?.engine);
  log('engines:', JSON.stringify(engines), 'categories:', JSON.stringify(results.map((r) => r.json.record?.category)));

  // ---- 4. calibration must not throw even with no AI ----
  const cal = await call('POST', `/api/screening/batches/${batchId}/calibrate`, { user: USER_A });
  assert(cal.status === 200 && Array.isArray(cal.json.resumes), 'POST /calibrate succeeds', `resumes=${cal.json.resumes?.length}`);

  // ---- 5. owner-scoped reads ----
  const asOwner = await call('GET', `/api/screening/batches/${batchId}`, { user: USER_A });
  assert(asOwner.status === 200 && asOwner.json.resumes.length === 5, 'owner can read their batch', `${asOwner.json.resumes?.length} resumes`);

  const asOther = await call('GET', `/api/screening/batches/${batchId}`, { user: USER_B });
  assert(asOther.status === 404, "another user's batch is hidden (was 200)", `status=${asOther.status}`);

  const recId = asOwner.json.resumes[0].id;
  const delOther = await call('PATCH', `/api/resumes/${recId}`, {
    body: { action: 'delete' },
    user: USER_B,
  });
  assert(delOther.status === 404, 'another user cannot delete a resume (was 200)', `status=${delOther.status}`);

  const delOwner = await call('PATCH', `/api/resumes/${recId}`, {
    body: { action: 'delete' },
    user: USER_A,
  });
  assert(delOwner.status === 200 && delOwner.json.ok === true, 'owner can delete their resume');

  // ---- 6. bank round-trip (idempotent: measured as a delta, the store persists) ----
  const bankBefore = await call('GET', '/api/bank/departments/manufacturing/resumes?page=1', { user: USER_A });
  const bankAdd = await call('POST', `/api/resumes/${asOwner.json.resumes[1].id}/bank`, {
    body: { bankDepartmentId: 'manufacturing', note: 'یادداشت تست', tags: ['تولید'] },
    user: USER_A,
  });
  assert(bankAdd.status === 200 && bankAdd.json.record?.inBank === true, 'add to bank works');

  const bankList = await call('GET', '/api/bank/departments/manufacturing/resumes?page=1', { user: USER_A });
  assert(
    bankList.status === 200 && bankList.json.total === bankBefore.json.total + 1,
    'bank listing grows by exactly one for the owner',
    `${bankBefore.json.total} → ${bankList.json.total}`
  );
  assert(
    bankList.json.items.every((r) => r.userId === USER_A || r.userId === null),
    'bank listing never contains another user\'s records'
  );

  const bankOther = await call('GET', '/api/bank/departments/manufacturing/resumes?page=1', { user: USER_B });
  assert(bankOther.json.total === 0, "bank listing hides other users' entries", `total=${bankOther.json.total}`);

  const bankRemove = await call('DELETE', `/api/resumes/${asOwner.json.resumes[1].id}/bank`, { user: USER_A });
  assert(bankRemove.status === 200 && bankRemove.json.record?.inBank === false, 'remove from bank works');

  // ---- 7. oversized body must answer JSON, not HTML ----
  const big = await fetch(BASE + `/api/screening/batches/${batchId}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': USER_A },
    body: JSON.stringify({ batchId, fileName: 'huge.pdf', extractedText: 'x'.repeat(31 * 1024 * 1024) }),
  });
  const bigBody = await big.text();
  assert(big.status === 413, 'oversized payload returns 413', `status=${big.status}`);
  assert(bigBody.trim().startsWith('{'), 'oversized payload returns a JSON error body', bigBody.slice(0, 80));

  // ---- 8. unknown API route ----
  const nf = await call('GET', '/api/nope');
  assert(nf.status === 404 && nf.json.error, 'unknown API route returns JSON 404');

  console.log('\nexit code:', process.exitCode || 0);
})().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e);
  process.exit(1);
});
