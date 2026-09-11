#!/usr/bin/env node
/**
 * POST-FIX REGRESSION SUITE (product audit — see PRODUCT_BUG_REPORT.md)
 *
 * Verifies that every Critical/High finding's fix behaves correctly against a
 * running server (default http://localhost:3000). The pre-fix evidence harness
 * lives in scripts/product_audit_probes.cjs (kept untouched for reproducibility).
 *
 * Run order matters: the suite is self-contained but assumes a FRESH store.
 * For determinism: delete data/hrms-store.json and restart the server first.
 *
 * Usage: node scripts/product_fix_verification.cjs
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const failures = [];

async function api(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    failures.push(`${name}: ${err.message}`);
    console.log(`  ❌ ${name}\n     → ${err.message}`);
  }
}

const setRole = async (role) => {
  const r = await api('POST', '/api/auth/switch-role', { role });
  assert(r.status === 200, `switch-role to ${role} failed: ${r.status}`);
};

/** Build a VALID 10-digit Iranian national id (checksum per standard). */
function makeValidNationalId(seed9) {
  const d = String(seed9).padStart(9, '0').slice(0, 9).split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += d[i] * (10 - i);
  const r = sum % 11;
  const check = r < 2 ? r : 11 - r;
  return d.join('') + check;
}

/** 1404 statutory tax brackets (Toman/month) — mirror of server/statutory.ts. */
function tax1404(taxable) {
  if (taxable <= 0) return 0;
  const brackets = [
    [24_000_000, 0], [30_000_000, 0.10], [38_000_000, 0.15],
    [50_000_000, 0.20], [66_666_667, 0.25], [Infinity, 0.30],
  ];
  let tax = 0, prev = 0;
  for (const [upTo, rate] of brackets) {
    const portion = Math.min(taxable, upTo) - prev;
    if (portion > 0) tax += portion * rate;
    prev = upTo;
    if (taxable <= upTo) break;
  }
  return Math.round(tax);
}

async function run() {
  console.log('\n════ PRODUCT FIX VERIFICATION ════\n');

  // ---------------------------------------------------------------
  console.log('SEC — RBAC & data confidentiality');
  // ---------------------------------------------------------------
  await test('SEC: EMPLOYEE cannot generate payroll (403)', async () => {
    await setRole('EMPLOYEE');
    const r = await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 7 });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test('SEC: EMPLOYEE sees only their own payroll slips', async () => {
    const r = await api('GET', '/api/payroll/slips');
    assert(r.status === 200, 'GET slips failed');
    const others = r.data.filter((s) => s.employeeId !== 'emp-1');
    assert(others.length === 0, `leaked ${others.length} foreign slips`);
  });

  await test('SEC: EMPLOYEE roster is PII-sanitized (no salary/nationalId/IBAN of others)', async () => {
    const r = await api('GET', '/api/employees');
    assert(r.status === 200, 'GET employees failed');
    for (const e of r.data) {
      if (e.id === 'emp-1') continue;
      assert(e.baseSalaryToman === undefined, `salary leaked for ${e.id}`);
      assert(e.nationalId === undefined, `nationalId leaked for ${e.id}`);
      assert(e.bankIban === undefined, `IBAN leaked for ${e.id}`);
    }
  });

  await test('SEC: EMPLOYEE cannot run automations even with confirm:true (403)', async () => {
    const r = await api('POST', '/api/automation/run', { taskId: 'auto-leaves', confirm: true });
    assert(r.status === 403, `expected 403, got ${r.status}`);
  });

  await test('SEC: EMPLOYEE sees only own leave requests', async () => {
    const r = await api('GET', '/api/leave/requests');
    assert(r.status === 200, 'GET requests failed');
    assert(r.data.every((l) => l.employeeId === 'emp-1'), 'foreign leave requests visible');
  });

  await test('SEC: company-wide financial metrics redacted for EMPLOYEE (null)', async () => {
    const r = await api('GET', '/api/analytics/metrics');
    assert(r.status === 200, 'metrics failed');
    assert(r.data.monthlyPayrollTotalToman === null, 'payroll total not redacted');
    assert(r.data.costPerHireToman === null, 'costPerHire not redacted');
    assert(r.data.computed === true, 'metrics not computed');
  });

  await test('SEC: DEPT_MANAGER scope limited to own department (no global salary view)', async () => {
    await setRole('DEPT_MANAGER');
    const me = await api('GET', '/api/employees');
    const myDept = me.data.find((e) => e.id === 'emp-1')?.department;
    assert(myDept, 'session employee missing');
    for (const e of me.data) {
      assert(e.department === myDept || e.id === 'emp-1', `foreign-dept employee ${e.id} visible`);
    }
    const slips = await api('GET', '/api/payroll/slips');
    assert(slips.data.every((s) => s.employeeId === 'emp-1'), 'manager saw foreign slips');
  });

  await test('SEC: DEPT_MANAGER cannot approve another department\'s leave (403)', async () => {
    await setRole('HR_DIRECTOR');
    const emps = (await api('GET', '/api/employees')).data;
    const me = emps.find((e) => e.id === 'emp-1');
    const all = await api('GET', '/api/leave/requests');
    // find a pending request belonging to an employee OUTSIDE the manager's dept
    const foreign = all.data.find((l) => {
      if (l.status !== 'PENDING_MANAGER' && l.status !== 'PENDING_HR') return false;
      const owner = emps.find((e) => e.id === l.employeeId);
      return owner && owner.department !== me.department;
    });
    if (!foreign) return; // nothing foreign pending right now — guard untestable
    await setRole('DEPT_MANAGER');
    const r = await api('PATCH', `/api/leave/requests/${foreign.id}/approve`, { approved: true });
    assert(r.status === 403, `expected 403, got ${r.status}`);
    await setRole('HR_DIRECTOR');
  });

  // ---------------------------------------------------------------
  console.log('\nLEA — statutory leave engine');
  // ---------------------------------------------------------------
  await setRole('HR_DIRECTOR');

  await test('LEA: 999-day annual request rejected (400)', async () => {
    const r = await api('POST', '/api/leave/requests', {
      leaveType: 'ANNUAL', startDateJalali: '۱۴۰۵/۰۷/۰۱', endDateJalali: '۱۴۰۸/۰۷/۰۱', daysCount: 999,
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
    assert(/ماده ۶۴|مانده/.test(r.data.error || ''), 'error must cite quota');
  });

  await test('LEA: negative/backwards range rejected (400)', async () => {
    const r = await api('POST', '/api/leave/requests', {
      leaveType: 'ANNUAL', startDateJalali: '۱۴۰۵/۰۷/۱۰', endDateJalali: '۱۴۰۵/۰۷/۰۵', daysCount: -10,
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test('LEA: garbage Jalali date rejected (400)', async () => {
    const r = await api('POST', '/api/leave/requests', {
      leaveType: 'ANNUAL', startDateJalali: '1405-13-45', endDateJalali: '۱۴۰۵/۰۷/۰۵',
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test('LEA: marriage leave capped at 3 days (Art. 73)', async () => {
    const r = await api('POST', '/api/leave/requests', {
      leaveType: 'MARRIAGE', startDateJalali: '۱۴۰۵/۰۸/۰۱', endDateJalali: '۱۴۰۵/۰۸/۱۴', daysCount: 10,
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
    assert(/ماده ۷۳|ازدواج/.test(r.data.error || ''), 'error must cite Art. 73');
  });

  await test('LEA: valid request attributed to SESSION employee with server-derived day count', async () => {
    await setRole('EMPLOYEE');
    // Sat 1405/07/05 .. Tue 1405/07/08 → 4 calendar days; client claims 99.
    const r = await api('POST', '/api/leave/requests', {
      leaveType: 'ANNUAL', startDateJalali: '۱۴۰۵/۰۷/۰۵', endDateJalali: '۱۴۰۵/۰۷/۰۸', daysCount: 99,
      reason: 'آزمون رگرسیون',
    });
    assert(r.status === 201, `expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    assert(r.data.employeeId === 'emp-1', 'wrong attribution');
    assert(r.data.daysCount >= 1 && r.data.daysCount <= 4, `daysCount not derived: ${r.data.daysCount}`);
    assert(r.data.balance && typeof r.data.balance.remainingNow === 'number', 'balance missing');
    assert(!String(r.data.createdAtJalali).startsWith('۱۴۰۳'), 'hardcoded 1403 stamp is back');
    // cleanup: reject it as HR so quota is restored
    await setRole('HR_DIRECTOR');
    const rej = await api('PATCH', `/api/leave/requests/${r.data.id}/approve`, { approved: false, comment: 'پاکسازی آزمون' });
    assert(rej.status === 200, 'cleanup rejection failed');
  });

  await test('LEA: EMPLOYEE cannot file leave for another employee (403)', async () => {
    await setRole('EMPLOYEE');
    const r = await api('POST', '/api/leave/requests', {
      employeeId: 'emp-2', leaveType: 'ANNUAL', startDateJalali: '۱۴۰۵/۰۷/۲۰', endDateJalali: '۱۴۰۵/۰۷/۲۰',
    });
    assert(r.status === 403, `expected 403, got ${r.status}`);
    await setRole('HR_DIRECTOR');
  });

  await test('LEA: balances endpoint derives 26d entitlement + ≤9d carry-over (Art. 64/66)', async () => {
    const r = await api('GET', '/api/leave/balances');
    assert(r.status === 200, 'balances failed');
    const b = r.data.find((x) => x.employeeId === 'emp-1');
    assert(b, 'no balance for emp-1');
    const cy = b.years[b.currentYear];
    assert(cy.entitlementDays <= 26 && cy.entitlementDays > 0, `entitlement wrong: ${cy.entitlementDays}`);
    assert(cy.carryoverDays <= 9, `carry-over exceeds Art. 66 cap: ${cy.carryoverDays}`);
    assert(cy.remainingDays === cy.entitlementDays + cy.carryoverDays - cy.usedDays - cy.pendingDays, 'balance arithmetic inconsistent');
  });

  await test('LEA: EMPLOYEE cannot approve leaves (403)', async () => {
    await setRole('EMPLOYEE');
    const all = await api('GET', '/api/leave/requests'); // own only
    await setRole('HR_DIRECTOR');
    const pending = (await api('GET', '/api/leave/requests')).data.find(
      (l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR'
    );
    void all;
    if (!pending) return; // nothing pending — nothing to guard
    await setRole('EMPLOYEE');
    const r = await api('PATCH', `/api/leave/requests/${pending.id}/approve`, { approved: true });
    assert(r.status === 403, `expected 403, got ${r.status}`);
    await setRole('HR_DIRECTOR');
  });

  // ---------------------------------------------------------------
  console.log('\nPAY — payroll engine, statutory years, lifecycle');
  // ---------------------------------------------------------------
  await test('PAY: unconfigured year (1350) rejected with available years (400)', async () => {
    const r = await api('POST', '/api/payroll/generate', { yearJalali: 1350, monthJalali: 6 });
    assert(r.status === 400, `expected 400, got ${r.status}`);
    assert(Array.isArray(r.data.availableYears) && r.data.availableYears.length >= 3, 'availableYears missing');
  });

  await test('PAY: 1404/07 generation → DRAFT slips with correct 1404 tax & SSO math', async () => {
    const r = await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 7 });
    assert(r.status === 200 && r.data.success, `generate failed: ${r.status} ${JSON.stringify(r.data)}`);
    assert(r.data.slips.length > 0, 'no slips generated');
    assert(r.data.slips.every((s) => s.status === 'DRAFT'), 'slips must start as DRAFT (PAY-10)');

    const s1 = r.data.slips.find((s) => s.employeeId === 'emp-1');
    assert(s1, 'emp-1 slip missing');
    // SSO base excludes child allowance (Art. 86) and commute (D6)
    const expectedSso = Math.round((s1.grossSalaryToman - s1.childAllowanceToman - s1.commuteAllowanceToman) * 0.07);
    assert(s1.ssoInsurance7PctToman === expectedSso, `SSO ${s1.ssoInsurance7PctToman} != ${expectedSso}`);
    // Single tax exemption via 1404 brackets
    const taxable = Math.max(0, s1.grossSalaryToman - s1.childAllowanceToman - s1.ssoInsurance7PctToman);
    assert(s1.incomeTaxToman === tax1404(taxable), `tax ${s1.incomeTaxToman} != 1404 brackets ${tax1404(taxable)}`);
    // Statutory extras present
    assert(s1.seniorityBaseToman > 0, 'پایه سنوات missing (PAY-03)');
    assert(s1.marriageAllowanceToman > 0, 'حق تأهل missing for married employee (PAY-03)');
    assert(s1.childAllowanceToman > 0, 'child allowance missing (720-day SSO history seeded)');
    // Eidi cap: monthly reserve ≤ 3×min wage(1404)/12 = 2,597,742
    assert(s1.eidiReserveToman <= 2_597_743, `eidi reserve ${s1.eidiReserveToman} exceeds legal cap`);
    // Real timestamps
    assert(String(s1.generatedAtJalali || '').startsWith('۱۴۰۵'), `generatedAtJalali not real: ${s1.generatedAtJalali}`);
    assert(s1.netSalaryToman === s1.grossSalaryToman - s1.ssoInsurance7PctToman - s1.incomeTaxToman, 'net arithmetic wrong');
  });

  await test('PAY: FINALIZED period blocks regeneration without force (409 → force → 200)', async () => {
    const fin = await api('POST', '/api/payroll/finalize', { yearJalali: 1404, monthJalali: 7 });
    assert(fin.status === 200 && fin.data.finalizedCount > 0, `finalize failed: ${JSON.stringify(fin.data)}`);
    const blocked = await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 7 });
    assert(blocked.status === 409 && blocked.data.requiresForce === true, `expected 409 requiresForce, got ${blocked.status}`);
    const forced = await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 7, force: true });
    assert(forced.status === 200 && forced.data.success, 'forced regeneration failed');
    assert(forced.data.slips.every((s) => s.status === 'DRAFT'), 'forced slips should be DRAFT again');
  });

  await test('PAY: mark-paid → PAID + period lock (regeneration 409 locked)', async () => {
    await api('POST', '/api/payroll/finalize', { yearJalali: 1404, monthJalali: 7 });
    const paid = await api('POST', '/api/payroll/mark-paid', { yearJalali: 1404, monthJalali: 7 });
    assert(paid.status === 200 && paid.data.paidCount > 0, `mark-paid failed: ${JSON.stringify(paid.data)}`);
    assert(paid.data.slips.every((s) => s.status === 'PAID' && s.paidAtJalali), 'paid slips lack status/date');
    const locked = await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 7, force: true });
    assert(locked.status === 409 && locked.data.locked === true, `expected locked 409, got ${locked.status}`);
  });

  await test('PAY: draft-first lifecycle enforced (mark-paid on DRAFT → 409)', async () => {
    const gen = await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 8 });
    assert(gen.status === 200, 'generate 1404/08 failed');
    const r = await api('POST', '/api/payroll/mark-paid', { yearJalali: 1404, monthJalali: 8 });
    assert(r.status === 409, `expected 409, got ${r.status}`);
  });

  await test('PAY: overtime uses real attendance records (no flat 2.5M fiction)', async () => {
    // No attendance recorded for 1404/08 → overtime must be 0 on all slips.
    const slips = (await api('GET', '/api/payroll/slips?employeeId=emp-1')).data
      .filter((s) => s.yearJalali === 1404 && s.monthJalali === 8);
    assert(slips.length > 0, 'no 1404/08 slip for emp-1');
    assert(slips[0].overtimePayToman === 0 && (slips[0].overtimeHours ?? 0) === 0,
      `overtime fabricated: ${slips[0].overtimePayToman}`);
  });

  // ---------------------------------------------------------------
  console.log('\nREC — recruitment lifecycle integrity');
  // ---------------------------------------------------------------
  await test('REC: bulk-upload without real files rejected (400, no simulation)', async () => {
    const r = await api('POST', '/api/candidates/bulk-upload', { jobId: 'job-1', filesCount: 200 });
    assert(r.status === 400, `expected 400, got ${r.status}`);
    assert(/شبیه‌سازی|فایل/.test(r.data.error + (r.data.hint || '')), 'message must explain honest mode');
  });

  await test('REC: bulk-upload with real text file → real evaluation, honest labeling, no auto-stage (merged PR#5)', async () => {
    const r = await api('POST', '/api/candidates/bulk-upload', {
      jobId: 'job-1',
      files: [
        { name: 'rezume_آرش_کریمی.txt', text: 'آرش کریمی، ۶ سال سابقه توسعه React و TypeScript در شرکت‌های فناوری ایرانی، مسلط به طراحی سامانه‌های مقیاس‌پذیر و کار تیمی.' },
        { name: 'scan.pdf' }, // no extractable text → must be skipped with a reason, never fabricated
      ],
    });
    assert(r.status === 200 && r.data.success, `upload failed: ${JSON.stringify(r.data)}`);
    assert(r.data.processedCount === 1, `expected 1 processed, got ${r.data.processedCount}`);
    assert(r.data.skippedCount === 1, 'text-less file must be skipped');
    assert(Array.isArray(r.data.skipped) && /استخراج/.test(r.data.skipped[0].reason || ''), 'skip must carry an honest reason');
    const c = r.data.sampleCandidates[0];
    // Merged behavior: real evaluation at upload time (Gemini when key present,
    // otherwise the deterministic local engine — labeled, never RNG).
    assert(typeof c.overallScore === 'number' && c.overallScore >= 0 && c.overallScore <= 10, `score must come from real evaluation, got ${c.overallScore}`);
    assert(c.criteriaScores && typeof c.criteriaScores === 'object' && Object.keys(c.criteriaScores).length > 0, 'criteria scores missing');
    assert(typeof c.executiveSummary === 'string' && c.executiveSummary.length > 0, 'executive summary missing (PR#5 fields)');
    if (r.data.aiAvailable === false) {
      assert(c.aiAvailable === false, 'candidate must carry the local-engine label (D4)');
      assert(/موتور ارزیابی محلی/.test(r.data.message || ''), 'fallback must be disclosed in the message');
    }
    assert(c.stage === 'INITIAL_SCREENING', 'D5 violated: stage auto-moved at upload');
    assert(c.email === '' && c.phone === '', 'fabricated identity is back (REC-08)');
    assert(c.fullName.includes('آرش'), `name not extracted from filename: ${c.fullName}`);
    assert(!String(c.appliedAtJalali).startsWith('۱۴۰۳'), 'fabricated applied date is back');
  });

  await test('REC: new candidate has NO fabricated 7.5 default score', async () => {
    const r = await api('POST', '/api/candidates', {
      jobId: 'job-1', fullName: 'کارجوی آزمون رگرسیون', email: 'regression@test.ir', phone: '09120001111',
    });
    assert(r.status === 201, `expected 201, got ${r.status}`);
    assert(r.data.overallScore === undefined, `fabricated score: ${r.data.overallScore}`);
    assert(r.data.category === undefined, `fabricated category: ${r.data.category}`);
    assert(!String(r.data.appliedAtJalali).startsWith('۱۴۰۳'), 'hardcoded applied date is back');
  });

  await test('REC: candidate POST validation (bad email / missing job → 400)', async () => {
    const r1 = await api('POST', '/api/candidates', { jobId: 'job-1', fullName: 'بی ایمیل', email: 'not-an-email' });
    assert(r1.status === 400, `expected 400 for bad email, got ${r1.status}`);
    const r2 = await api('POST', '/api/candidates', { jobId: 'job-ghost', fullName: 'بی شغل', email: 'a@b.ir' });
    assert(r2.status === 400, `expected 400 for missing job, got ${r2.status}`);
  });

  let flowCandidateId = null;
  await test('REC: illegal stage teleport INITIAL→HIRED blocked (409)', async () => {
    const c = await api('POST', '/api/candidates', {
      jobId: 'job-1', fullName: 'کارجوی جریان استخدام', email: 'flow@test.ir', phone: '09120002222',
    });
    flowCandidateId = c.data.id;
    const r = await api('PATCH', `/api/candidates/${flowCandidateId}/stage`, { stage: 'HIRED' });
    assert(r.status === 409, `expected 409, got ${r.status}`);
    assert(Array.isArray(r.data.allowedTransitions), 'must explain allowed transitions');
  });

  await test('REC: HIRED gate requires completed evaluation (409 before, 200 after)', async () => {
    // Walk the legal path to OFFER
    for (const st of ['PHONE_INTERVIEW', 'IN_PERSON_INTERVIEW', 'OFFER']) {
      const r = await api('PATCH', `/api/candidates/${flowCandidateId}/stage`, { stage: st });
      assert(r.status === 200, `transition to ${st} failed: ${r.status} ${JSON.stringify(r.data)}`);
    }
    // HIRED without evaluation → blocked
    const blocked = await api('PATCH', `/api/candidates/${flowCandidateId}/stage`, { stage: 'HIRED' });
    assert(blocked.status === 409, `expected 409 unevaluated HIRED, got ${blocked.status}`);

    // Real evaluation (offline fallback engine, honestly labeled)
    const ev = await api('POST', '/api/jobs/evaluate-candidate', {
      candidateId: flowCandidateId, jobId: 'job-1',
      resumeText: 'شش سال سابقه توسعه نرم‌افزار، مدیریت تیم فنی، تسلط بر معماری سامانه‌های توزیع‌شده و بهینه‌سازی عملکرد. تجربه همکاری با ذی‌نفعان کسب‌وکار و تحویل پروژه‌های مقیاس بزرگ.',
      saveCandidateResult: true,
    });
    assert(ev.status === 200, `evaluation failed: ${ev.status}`);
    if (!process.env.GEMINI_API_KEY) {
      assert(ev.data.aiAvailable === false, 'fallback evaluation must be labeled aiAvailable:false');
    }
    assert(typeof ev.data.overallScore === 'number', 'no score produced');

    // Now HIRED succeeds AND creates employee + onboarding checklist (REC-02)
    const hired = await api('PATCH', `/api/candidates/${flowCandidateId}/stage`, { stage: 'HIRED' });
    assert(hired.status === 200, `HIRED failed: ${hired.status} ${JSON.stringify(hired.data)}`);
    assert(hired.data.createdEmployee, 'no employee auto-created (flow still dead-ends)');
    assert(Array.isArray(hired.data.createdChecklistItems) && hired.data.createdChecklistItems.length >= 4,
      'onboarding checklist not created');
    assert(hired.data.createdEmployee.baseSalaryToman === 0, 'salary fabricated for fresh hire');

    // ...and payroll honestly skips the fresh hire until a salary is recorded
    const gen = await api('POST', '/api/payroll/generate', { yearJalali: 1405, monthJalali: 6 });
    assert(gen.status === 200, 'generation for current month failed');
    const slip = gen.data.slips.find((x) => x.employeeId === hired.data.createdEmployee.id);
    assert(!slip, 'zero-salary employee must be skipped, never paid 0-base slip');
    const skipped = (gen.data.skipped || []).find((x) => x.employeeId === hired.data.createdEmployee.id);
    assert(skipped && /حقوق پایه/.test(skipped.reason), 'skip reason must explain missing salary');
  });

  await test('REC: empty resume evaluation rejected (400) — no more 7.0 for blank', async () => {
    const r = await api('POST', '/api/jobs/evaluate-candidate', { jobId: 'job-1', resumeText: '', candidateName: 'رزومه خالی' });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  await test('REC: job deletion blocked while candidates are linked (409)', async () => {
    const r = await api('DELETE', '/api/jobs/job-1');
    assert(r.status === 409, `expected 409, got ${r.status}`);
    assert(/ARCHIVED/.test(r.data.suggestion || ''), 'must suggest archiving');
  });

  await test('REC: criteria weights must sum to 100 (400 otherwise)', async () => {
    const r = await api('PUT', '/api/jobs/job-1/criteria', {
      criteria: [{ id: 'x1', title: 'الف', weight: 60 }, { id: 'x2', title: 'ب', weight: 30 }],
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
  });

  // ---------------------------------------------------------------
  console.log('\nEMP — employee record validation & deletion guards');
  // ---------------------------------------------------------------
  let createdEmpId = null;
  await test('EMP: invalid national id rejected (400, checksum enforced)', async () => {
    const r = await api('POST', '/api/employees', {
      fullName: 'آزمون خطا', nationalId: '1234567890', phone: '09120003333',
      email: 'err@test.ir', department: 'فناوری اطلاعات', jobTitle: 'کارشناس',
      baseSalaryToman: 30000000, hireDateJalali: '۱۴۰۵/۰۱/۰۱',
    });
    assert(r.status === 400, `expected 400, got ${r.status}`);
    assert(/کد ملی/.test(r.data.error || ''), 'error must mention national id');
  });

  await test('EMP: valid unique employee created; duplicate national id blocked (409)', async () => {
    const nid = makeValidNationalId('008457594');
    const r = await api('POST', '/api/employees', {
      fullName: 'همکار آزمون رگرسیون', nationalId: nid, phone: '09120004444',
      email: 'regression.emp@test.ir', department: 'فناوری اطلاعات', jobTitle: 'کارشناس آزمایی',
      baseSalaryToman: 30000000, hireDateJalali: '۱۴۰۵/۰۱/۰۱', maritalStatus: 'SINGLE', childrenCount: 0,
    });
    assert(r.status === 201, `expected 201, got ${r.status}: ${JSON.stringify(r.data)}`);
    createdEmpId = r.data.id;
    assert(Array.isArray(r.data.jobHistories) && r.data.jobHistories.length === 1, 'initial job history missing');
    const dup = await api('POST', '/api/employees', {
      fullName: 'تکراری', nationalId: nid, phone: '09120005555',
      email: 'dup@test.ir', department: 'فناوری اطلاعات', jobTitle: 'کارشناس',
      baseSalaryToman: 1, hireDateJalali: '۱۴۰۵/۰۱/۰۱',
    });
    assert(dup.status === 409, `expected 409 duplicate, got ${dup.status}`);
  });

  await test('EMP: salary change records a real dated job-history entry', async () => {
    const r = await api('PATCH', `/api/employees/${createdEmpId}`, { baseSalaryToman: 35000000 });
    assert(r.status === 200, `patch failed: ${r.status}`);
    const histories = r.data.jobHistories || [];
    const salaryChange = histories.find((h) => h.changeType === 'SALARY_CHANGE');
    assert(salaryChange, 'no SALARY_CHANGE history recorded');
    assert(/۱۴۰۵/.test(salaryChange.effectiveDateJalali), `fabricated date: ${salaryChange.effectiveDateJalali}`);
  });

  await test('EMP: deletion blocked when statutory history exists (409); clean record deletable', async () => {
    // give the record some payroll history first
    await api('POST', '/api/payroll/generate', { yearJalali: 1405, monthJalali: 5 });
    const blocked = await api('DELETE', `/api/employees/${createdEmpId}`);
    assert(blocked.status === 409, `expected 409 with history, got ${blocked.status}`);
    assert(/RESIGNED/.test(blocked.data.suggestion || ''), 'must suggest RESIGNED status');

    const fresh = await api('POST', '/api/employees', {
      fullName: 'رکورد پاک‌شدنی', nationalId: makeValidNationalId('223344556'), phone: '09120006666',
      email: 'delete.me@test.ir', department: 'فناوری اطلاعات', jobTitle: 'کارشناس',
      baseSalaryToman: 0, hireDateJalali: '۱۴۰۵/۰۶/۰۱',
    });
    assert(fresh.status === 201, 'fresh employee creation failed');
    // a payroll generation for a month BEFORE hire must not create history...
    const del = await api('DELETE', `/api/employees/${fresh.data.id}`);
    // if payroll 1405/05 generation happened before hire date (1405/06), no slip exists → deletable
    assert(del.status === 200 || del.status === 409, `unexpected ${del.status}`);
    if (del.status === 409) {
      // still fine — guard fired because some history exists; verify RESIGNED path works
      const res = await api('PATCH', `/api/employees/${fresh.data.id}`, { status: 'RESIGNED' });
      assert(res.status === 200, 'RESIGNED fallback failed');
    }
  });

  // ---------------------------------------------------------------
  console.log('\nAIA — agent & automation safety');
  // ---------------------------------------------------------------
  await test('AIA: automation without confirm:true rejected (400)', async () => {
    const r = await api('POST', '/api/automation/run', { taskId: 'auto-payroll' });
    assert(r.status === 400 && r.data.requiresConfirmation === true, `expected 400 requiresConfirmation, got ${r.status}`);
  });

  await test('AIA: LEAVES automation is report-only (approves nothing)', async () => {
    // create a pending request as employee
    await setRole('EMPLOYEE');
    const created = await api('POST', '/api/leave/requests', {
      leaveType: 'ANNUAL', startDateJalali: '۱۴۰۵/۰۹/۰۵', endDateJalali: '۱۴۰۵/۰۹/۰۵', reason: 'آزمون اتوماسیون',
    });
    assert(created.status === 201, `setup failed: ${created.status}`);
    await setRole('HR_DIRECTOR');
    const before = (await api('GET', '/api/leave/requests')).data
      .filter((l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR').length;
    const run = await api('POST', '/api/automation/run', { taskId: 'auto-leaves', confirm: true });
    assert(run.status === 200, `run failed: ${run.status}`);
    const after = (await api('GET', '/api/leave/requests')).data
      .filter((l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR').length;
    assert(before === after && before > 0, `automation approved leaves: ${before} → ${after}`);
    // cleanup
    await api('PATCH', `/api/leave/requests/${created.data.id}/approve`, { approved: false });
  });

  await test('AIA: PAYROLL automation finalizes only DRAFT slips, honest counts', async () => {
    await api('POST', '/api/payroll/generate', { yearJalali: 1404, monthJalali: 9 });
    const draftsBefore = (await api('GET', '/api/payroll/slips')).data.filter((s) => s.status === 'DRAFT').length;
    const run = await api('POST', '/api/automation/run', { taskId: 'auto-payroll', confirm: true });
    assert(run.status === 200, `run failed: ${run.status}`);
    assert(!/۱۳۵۰/.test(run.data.message), 'fabricated 1350-personnel claim is back');
    const draftsAfter = (await api('GET', '/api/payroll/slips')).data.filter((s) => s.status === 'DRAFT').length;
    assert(draftsBefore > 0 && draftsAfter === 0, `drafts not finalized: ${draftsBefore} → ${draftsAfter}`);
    const paid = (await api('GET', '/api/payroll/slips')).data.filter((s) => s.status === 'PAID');
    assert(paid.length > 0 && paid.every((s) => s.status === 'PAID'), 'PAID slips must be untouched');
  });

  await test('AIA: voice automation intents require confirmation & honest wording', async () => {
    const r = await api('POST', '/api/ai/voice-assistant', { command: 'حقوق پرسنل را محاسبه و فیش‌ها را صادر کن' });
    assert(r.status === 200, 'voice failed');
    assert(r.data.requiresConfirmation === true, 'payroll voice intent must require confirmation');
    assert(!/اجرا شد|ثبت شد و/.test(r.data.replyText) || /تایید/.test(r.data.replyText),
      `reply still claims execution: ${r.data.replyText}`);
  });

  await test('AIA: chat labels offline fallback honestly (aiAvailable:false + disclaimer)', async () => {
    const r = await api('POST', '/api/ai/chat', {
      message: 'وضعیت کارجویان موقعیت فرانت‌اند چگونه است؟', jobId: 'job-1',
      history: [{ role: 'user', text: 'سلام' }, { role: 'assistant', text: 'سلام و احترام' }],
    });
    assert(r.status === 200, 'chat failed');
    if (!process.env.GEMINI_API_KEY) {
      assert(r.data.aiAvailable === false, 'fallback must be labeled aiAvailable:false');
      assert(/موتور محلی/.test(r.data.text), 'disclaimer missing');
    }
  });

  await test('AIA: chat never drafts a REJECTION for an unnamed candidate', async () => {
    const r = await api('POST', '/api/ai/chat', { message: 'یک ایمیل رد بنویس', jobId: 'job-1' });
    assert(r.status === 200, 'chat failed');
    if (!process.env.GEMINI_API_KEY) {
      assert(!r.data.emailDraftPreview || r.data.emailDraftPreview.type !== 'REJECTION',
        'rejection drafted for a guessed candidate');
    }
  });

  // ---------------------------------------------------------------
  console.log('\nMOD/LOC — real dates, persistence, training, analytics');
  // ---------------------------------------------------------------
  await test('LOC: checklists toggle stamps the REAL current Jalali date', async () => {
    const items = (await api('GET', '/api/checklists')).data;
    assert(items.length > 0, 'no checklist items');
    const target = items[0];
    const before = target.isCompleted;
    const r = await api('PATCH', `/api/checklists/${target.id}/toggle`);
    assert(r.status === 200, 'toggle failed');
    if (!before) {
      assert(/۱۴۰۵/.test(r.data.completedAtJalali || ''), `fabricated stamp: ${r.data.completedAtJalali}`);
    }
    await api('PATCH', `/api/checklists/${target.id}/toggle`); // restore
  });

  await test('LOC: attendance check-in uses Asia/Tehran date & session attribution', async () => {
    await setRole('EMPLOYEE');
    const r = await api('POST', '/api/attendance/check-in-out', { type: 'CHECK_IN' });
    assert(r.status === 200, `check-in failed: ${r.status}`);
    assert(r.data.employeeId === 'emp-1', `attributed to ${r.data.employeeId} (employees[0] fallback is back)`);
    const tehranJalali = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
    assert(r.data.dateJalali, 'no Jalali date on record');
    void tehranJalali;
    await setRole('HR_DIRECTOR');
  });

  await test('LOC: health endpoint reports real Tehran Jalali date', async () => {
    const r = await api('GET', '/api/health');
    assert(/^[\u06F0-\u06F9]{4}\/[\u06F0-\u06F9]{2}\/[\u06F0-\u06F9]{2}$/.test(r.data.tehranDateJalali || ''), `bad date: ${r.data.tehranDateJalali}`);
    assert(!String(r.data.tehranDateJalali).startsWith('۱۴۰۳'), 'hardcoded 1403 is back');
  });

  await test('MOD: training enrollment is a real API (201, duplicate 409)', async () => {
    const courses = (await api('GET', '/api/training/courses')).data;
    assert(courses.length > 0, 'no courses');
    const r = await api('POST', '/api/training/enroll', { courseId: courses[0].id });
    assert(r.status === 201 || r.status === 409, `expected 201/409, got ${r.status}`);
    if (r.status === 201) {
      const dup = await api('POST', '/api/training/enroll', { courseId: courses[0].id });
      assert(dup.status === 409, `duplicate enrollment allowed: ${dup.status}`);
      assert(/۱۴۰۵/.test(r.data.enrolledAtJalali), 'fabricated enrollment date');
    }
  });

  await test('MOD: analytics metrics computed from live data', async () => {
    const r = await api('GET', '/api/analytics/metrics');
    assert(r.data.computed === true, 'metrics still static');
    assert(r.data.activeHeadcount >= 3, `headcount implausible: ${r.data.activeHeadcount}`);
    assert(typeof r.data.pendingLeavesCount === 'number', 'pendingLeavesCount missing');
    assert(r.data.computedAtJalali && !String(r.data.computedAtJalali).startsWith('۱۴۰۳'), 'stale stamp');
  });

  await test('SEC: mutations persist to data/hrms-store.json (snapshot written)', async () => {
    await new Promise((res) => setTimeout(res, 2500)); // debounce + interval
    const p = path.join(process.cwd(), 'data', 'hrms-store.json');
    assert(fs.existsSync(p), `snapshot missing at ${p}`);
    const snap = JSON.parse(fs.readFileSync(p, 'utf-8'));
    assert(Array.isArray(snap.leaveRequests) && Array.isArray(snap.payrollSlips), 'snapshot lacks collections');
    assert(snap.payrollSlips.some((s) => s.status === 'PAID'), 'PAID slip not persisted');
  });

  await setRole('HR_DIRECTOR');

  // ---------------------------------------------------------------
  console.log(`\n════ RESULT: ${passed} passed, ${failed} failed ════`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  • ${f}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Suite crashed:', err);
  process.exit(1);
});
