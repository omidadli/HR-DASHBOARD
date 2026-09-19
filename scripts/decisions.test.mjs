/*
 * API test for the decision workspace («رزومه‌های تایید/رد شده»), the deep
 * review («بازبینی») and the resume preview/download endpoints.
 *
 * Needs a running server:  BASE=http://127.0.0.1:3000 node scripts/decisions.test.mjs
 * (npm run dev). It seeds its own demo data, so no Gemini key is required —
 * without a key the deep review honestly reports the local engine.
 */
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
// Fresh users per run: this test mutates (and deletes) demo records, so it must
// not depend on the state a previous run left behind.
const RUN = Date.now().toString(36);
const USER_A = `usr_decisions_test_${RUN}_a`;
const USER_B = `usr_decisions_test_${RUN}_b`;

let failures = 0;
function assert(cond, label, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures += 1;
}

async function call(method, path, { body, user } = {}) {
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
    json = text.slice(0, 200);
  }
  return { status: res.status, json, headers: res.headers };
}

const toEn = (s) => String(s || '').replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

(async () => {
  // ---- 1. demo seed (idempotent) ----
  const seed = await call('POST', '/api/demo/seed', { user: USER_A });
  assert(seed.status === 200 && seed.json.batchId, 'POST /api/demo/seed creates a session', JSON.stringify(seed.json));
  const seedAgain = await call('POST', '/api/demo/seed', { user: USER_A });
  assert(
    seedAgain.json.batchId === seed.json.batchId && seedAgain.json.created === 0,
    'POST /api/demo/seed is idempotent per user',
    JSON.stringify(seedAgain.json)
  );
  const noUser = await call('POST', '/api/demo/seed');
  assert(noUser.status === 400, 'demo seed without x-user-id is rejected', `status=${noUser.status}`);

  const batchId = seed.json.batchId;
  const batch = await call('GET', `/api/screening/batches/${batchId}`, { user: USER_A });
  assert(batch.status === 200 && Array.isArray(batch.json.resumes), 'seeded batch is readable');
  const resumes = batch.json.resumes || [];
  assert(resumes.length >= 8, `batch holds the sample resumes (${resumes.length})`);
  assert(
    resumes.every((r) => r.roleTitle === 'کارشناس جذب و استخدام'),
    'every resume carries its job position (roleTitle) for cross-batch filters'
  );

  const withFile = resumes.find((r) => r.filePath && r.fileName.endsWith('.pdf'));
  const withoutFile = resumes.find((r) => !r.filePath);
  assert(Boolean(withFile), 'at least one sample resume has a stored PDF');
  assert(Boolean(withoutFile), 'at least one sample resume has no stored file (fallback path)');

  // ---- 2. decisions meta ----
  const metaUnauth = await call('GET', '/api/decisions/meta');
  assert(metaUnauth.status === 401, 'GET /api/decisions/meta requires x-user-id', `status=${metaUnauth.status}`);

  const meta = await call('GET', '/api/decisions/meta', { user: USER_A });
  assert(meta.status === 200, 'GET /api/decisions/meta');
  const counts = meta.json.counts || {};
  assert(
    counts.approved >= 1 && counts.rejected >= 1 && counts.review >= 1,
    'counts cover all three lists',
    JSON.stringify(counts)
  );
  assert(
    (meta.json.positions || []).some((p) => p.roleTitle && p.count > 0),
    'quick-access positions are exposed',
    JSON.stringify(meta.json.positions)
  );

  const metaB = await call('GET', '/api/decisions/meta', { user: USER_B });
  assert(
    metaB.json.counts.approved === 0 && metaB.json.counts.rejected === 0 && metaB.json.counts.review === 0,
    'another user sees none of these decisions (multi-user scoping)'
  );

  // ---- 3. lists ----
  const approved = await call('GET', '/api/decisions/resumes?status=approved', { user: USER_A });
  assert(approved.status === 200 && Array.isArray(approved.json.items), 'GET approved list');
  assert(
    approved.json.items.every((r) => r.decisionStatus === 'approved'),
    'approved list only holds approved resumes'
  );
  assert(approved.json.counts && approved.json.counts.rejected >= 1, 'list response carries the tab counts');

  const rejected = await call('GET', '/api/decisions/resumes?status=rejected', { user: USER_A });
  assert(
    rejected.json.items.every((r) => r.decisionStatus === 'rejected'),
    'rejected list only holds rejected resumes'
  );
  assert(
    rejected.json.items.some((r) => r.decisionNote),
    'a rejected resume keeps the reason the user typed',
    JSON.stringify(rejected.json.items.map((r) => r.decisionNote))
  );

  const review = await call('GET', '/api/decisions/resumes?status=review', { user: USER_A });
  assert(
    review.json.items.some((r) => r.decisionStatus === 'review') &&
      review.json.items.some((r) => r.decisionStatus === 'none' && r.category === 'REVIEW'),
    'needs-review list mixes explicit marks with undecided AI «REVIEW» resumes'
  );

  // ---- 4. Jalali range filter ----
  const today = resumes
    .map((r) => r.decidedAtJalali)
    .filter(Boolean)
    .sort()
    .pop();
  assert(Boolean(today), 'sample decisions are Jalali-stamped');
  const ranged = await call(
    `GET`,
    `/api/decisions/resumes?status=approved&from=${encodeURIComponent(today)}&to=${encodeURIComponent(today)}`,
    { user: USER_A }
  );
  assert(
    ranged.json.items.every((r) => toEn(r.decidedAtJalali) === toEn(today)),
    'Jalali from/to filters the approved list',
    JSON.stringify(ranged.json.items.map((r) => r.decidedAtJalali))
  );
  const empty = await call('GET', '/api/decisions/resumes?status=approved&from=1390/01/01&to=1390/01/02', {
    user: USER_A,
  });
  assert(empty.json.total === 0, 'an out-of-range Jalali window returns nothing');

  // ---- 5. position + department filters ----
  const byRole = await call(
    'GET',
    `/api/decisions/resumes?status=approved&roleTitle=${encodeURIComponent('کارشناس جذب و استخدام')}`,
    { user: USER_A }
  );
  assert(byRole.json.total === approved.json.total, 'filtering by the exact position keeps the same set');
  const wrongRole = await call(
    'GET',
    `/api/decisions/resumes?status=approved&roleTitle=${encodeURIComponent('مدیر مالی')}`,
    { user: USER_A }
  );
  assert(wrongRole.json.total === 0, 'an unknown position returns nothing');
  const byDept = await call('GET', '/api/decisions/resumes?status=approved&departmentId=hr', { user: USER_A });
  assert(byDept.json.total === approved.json.total, 'department filter matches the seeded department');
  const wrongDept = await call('GET', '/api/decisions/resumes?status=approved&departmentId=sales', {
    user: USER_A,
  });
  assert(wrongDept.json.total === 0, 'another department returns nothing');

  // ---- 6. decision lifecycle ----
  const target = resumes.find((r) => (r.decisionStatus || 'none') === 'none' && r.category === 'INTERVIEW');
  assert(Boolean(target), 'there is an undecided resume to work with');
  if (!target) throw new Error('no undecided sample resume — cannot continue');

  const approve = await call('PATCH', `/api/resumes/${target.id}`, {
    user: USER_A,
    body: { action: 'decision', status: 'approved' },
  });
  assert(
    approve.status === 200 && approve.json.record.decisionStatus === 'approved' && approve.json.record.decidedAtJalali,
    'PATCH decision=approved stamps the Jalali date',
    JSON.stringify(approve.json.record?.decidedAtJalali)
  );
  const inList = await call('GET', '/api/decisions/resumes?status=approved', { user: USER_A });
  assert(
    inList.json.items.some((r) => r.id === target.id),
    'the approved resume shows up in the approved list'
  );

  const reject = await call('PATCH', `/api/resumes/${target.id}`, {
    user: USER_A,
    body: { action: 'decision', status: 'rejected', note: 'حقوق درخواستی بالاتر از بودجه' },
  });
  assert(
    reject.json.record.decisionStatus === 'rejected' &&
      reject.json.record.decisionNote === 'حقوق درخواستی بالاتر از بودجه',
    'PATCH decision=rejected stores the reason'
  );
  const goneFromApproved = await call('GET', '/api/decisions/resumes?status=approved', { user: USER_A });
  assert(
    !goneFromApproved.json.items.some((r) => r.id === target.id),
    'a rejected resume leaves the approved list'
  );

  const badStatus = await call('PATCH', `/api/resumes/${target.id}`, {
    user: USER_A,
    body: { action: 'decision', status: 'hired' },
  });
  assert(badStatus.status === 400, 'an unknown decision status is rejected', `status=${badStatus.status}`);

  const clear = await call('PATCH', `/api/resumes/${target.id}`, {
    user: USER_A,
    body: { action: 'decision', status: 'none' },
  });
  assert(
    clear.json.record.decisionStatus === 'none' && clear.json.record.decidedAtJalali === null,
    'decision=none clears the decision and its stamps'
  );

  const crossUser = await call('PATCH', `/api/resumes/${target.id}`, {
    user: USER_B,
    body: { action: 'decision', status: 'approved' },
  });
  assert(crossUser.status === 404, 'another user cannot decide on this resume', `status=${crossUser.status}`);

  // ---- 7. deep review («بازبینی») ----
  const deep = await call('POST', `/api/resumes/${target.id}/deep-rerun`, { user: USER_A });
  assert(deep.status === 200 && deep.json.record, 'POST /api/resumes/:id/deep-rerun answers', `status=${deep.status}`);
  assert(deep.json.mode === 'deep', 'the response reports the deep mode');
  assert(
    ['ai', 'local'].includes(deep.json.engine),
    'the response is honest about which engine answered',
    deep.json.engine
  );
  const history = deep.json.record.analysisHistory || [];
  assert(
    history.some((h) => h.reason === 'deep'),
    'the deep pass is recorded in the analysis history',
    JSON.stringify(history.map((h) => h.reason))
  );
  if (deep.json.engine === 'ai') {
    assert(
      Boolean(deep.json.record.deepAnalysisAtJalali),
      'an AI deep review stamps deepAnalysisAtJalali'
    );
  } else {
    assert(
      !deep.json.record.deepAnalysisAtJalali,
      'a local-engine fallback is NOT presented as a deep AI review'
    );
  }

  const deepCross = await call('POST', `/api/resumes/${target.id}/deep-rerun`, { user: USER_B });
  assert(deepCross.status === 404, 'another user cannot re-analyse this resume', `status=${deepCross.status}`);

  // ---- 8. resume preview & download ----
  const info = await call('GET', `/api/resumes/${withFile.id}/file-info`, { user: USER_A });
  assert(
    info.status === 200 && info.json.hasFile === true && info.json.previewable === true,
    'file-info marks the PDF as previewable',
    JSON.stringify(info.json)
  );
  const infoNone = await call('GET', `/api/resumes/${withoutFile.id}/file-info`, { user: USER_A });
  assert(infoNone.json.hasFile === false, 'file-info reports a missing file honestly');

  const inline = await fetch(BASE + `/api/resumes/${withFile.id}/file?inline=1&uid=${USER_A}`);
  const inlineBuf = Buffer.from(await inline.arrayBuffer());
  assert(inline.status === 200, 'inline preview responds 200', `status=${inline.status}`);
  assert(
    inline.headers.get('content-type') === 'application/pdf',
    'inline preview sends the PDF content type',
    inline.headers.get('content-type')
  );
  assert(
    (inline.headers.get('content-disposition') || '').startsWith('inline'),
    'inline preview sends Content-Disposition: inline',
    inline.headers.get('content-disposition')
  );
  assert(inlineBuf.subarray(0, 5).toString() === '%PDF-', 'the seeded file is a real PDF', inlineBuf.subarray(0, 8).toString());

  const attach = await fetch(BASE + `/api/resumes/${withFile.id}/file?uid=${USER_A}`);
  assert(
    (attach.headers.get('content-disposition') || '').startsWith('attachment'),
    'the same endpoint still downloads by default',
    attach.headers.get('content-disposition')
  );

  const missing = await call('GET', `/api/resumes/${withoutFile.id}/file?inline=1`, { user: USER_A });
  assert(missing.status === 404, 'preview of a file-less resume returns 404', `status=${missing.status}`);

  // ---- 9. delete removes the resume from every list ----
  const del = await call('PATCH', `/api/resumes/${target.id}`, { user: USER_A, body: { action: 'delete' } });
  assert(del.status === 200 && del.json.ok, 'PATCH action=delete');
  const afterDelete = await call('GET', '/api/decisions/resumes?status=review', { user: USER_A });
  assert(
    !afterDelete.json.items.some((r) => r.id === target.id),
    'a deleted resume disappears from the decision lists'
  );

  // ---- 10. cleanup: the demo session is deletable, and everything goes with it ----
  const delBatch = await call('DELETE', `/api/screening/batches/${batchId}`, { user: USER_A });
  assert(delBatch.status === 200 && delBatch.json.ok, 'DELETE /api/screening/batches/:id');
  const afterBatch = await call('GET', '/api/decisions/meta', { user: USER_A });
  assert(
    afterBatch.json.counts.approved === 0 &&
      afterBatch.json.counts.rejected === 0 &&
      afterBatch.json.counts.review === 0,
    'deleting a session also clears its decisions',
    JSON.stringify(afterBatch.json.counts)
  );

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error('DECISIONS TEST CRASHED:', e);
  process.exit(1);
});
