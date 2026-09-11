/**
 * PRODUCT AUDIT PROBES (read-mostly evidence collector)
 * Runs adversarial scenarios against the live dev server on :3000 and prints
 * structured evidence for the Product Bug Report. This is an audit harness,
 * NOT part of the shipped product.
 */
const http = require('http');

const BASE = { host: 'localhost', port: 3000, headers: { 'Content-Type': 'application/json' } };

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const r = http.request({ ...BASE, path, method }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const out = [];
function log(name, evidence) {
  out.push({ name, evidence });
  console.log(`\n### ${name}\n${JSON.stringify(evidence, null, 1)}`);
}

(async () => {
  // ---------- P1: Payroll tax math (double exemption + missing brackets) ----------
  let res = await req('POST', '/api/payroll/generate', { monthJalali: 6, yearJalali: 1403 });
  const slip = res.body.slips.find((s) => s.employeeId === 'emp-2');
  // Correct 1403 law: taxable = gross - employee SSO 7%; brackets: 0%<=12M, 10% 12-16.67M, 15% 16.67-27M, 20% 27-33.3M, 25% >33.3M
  const gross = slip.grossSalaryToman;
  const correctTaxable = gross - slip.ssoInsurance7PctToman;
  const correctTax =
    Math.max(0, Math.min(correctTaxable, 16666667) - 12000000) * 0.10 +
    Math.max(0, Math.min(correctTaxable, 27000000) - 16666667) * 0.15 +
    Math.max(0, Math.min(correctTaxable, 33333333) - 27000000) * 0.20 +
    Math.max(0, correctTaxable - 33333333) * 0.25;
  log('P1 payroll tax for emp-2 (base 42M, 1403/06)', {
    gross, sso7: slip.ssoInsurance7PctToman, taxProducedByApp: slip.incomeTaxToman,
    taxPer1403Law_noDoubleExemption: Math.round(correctTax),
    underTaxationToman: Math.round(correctTax) - slip.incomeTaxToman,
    note: 'App subtracts 12M exemption TWICE (once before brackets, once as 0% bracket) and lacks 25% top bracket',
  });

  // ---------- P2: Payroll runs for ANY year with 1403 constants ----------
  res = await req('POST', '/api/payroll/generate', { monthJalali: 1, yearJalali: 1350 });
  log('P2 payroll for year 1350 (!)', {
    accepted: res.status === 200, count: res.body.count,
    sampleAllowances: res.body.slips && { housing: res.body.slips[0].housingAllowanceToman, bon: res.body.slips[0].bonKargariToman, child: res.body.slips[0].childAllowanceToman },
    note: 'Statutory 1403 constants used for any year 1300-1500; also no year selector in UI (hardcoded 1403)',
  });

  // ---------- P3: Mid-month hire gets FULL month pay ----------
  res = await req('POST', '/api/employees', { fullName: 'آزمون استخدام میانه ماه', jobTitle: 'کارشناس آزمایشی', hireDateJalali: '۱۴۰۳/۰۶/۲۵', baseSalaryToman: 30000000, childrenCount: 1 });
  const newEmpId = res.body.id;
  res = await req('POST', '/api/payroll/generate', { monthJalali: 6, yearJalali: 1403 });
  const midMonthSlip = res.body.slips.find((s) => s.employeeId === newEmpId);
  log('P3 employee hired 1403/06/25 paid for 1403/06', {
    baseSalaryPaid: midMonthSlip && midMonthSlip.baseSalaryToman,
    daysActuallyEmployed: '6 of 31', prorationApplied: false,
    fullAllowancesPaid: midMonthSlip && (midMonthSlip.housingAllowanceToman + midMonthSlip.bonKargariToman + midMonthSlip.childAllowanceToman),
    overtimePaidWithoutAttendance: midMonthSlip && midMonthSlip.overtimePayToman,
  });

  // ---------- P4: Seed slip vs generator formula inconsistency (month 5 emp-2) ----------
  res = await req('POST', '/api/payroll/generate', { monthJalali: 5, yearJalali: 1403 });
  const regen = res.body.slips.find((s) => s.employeeId === 'emp-2');
  log('P4 regenerated 1403/05 slip for emp-2 vs seed "FINALIZED" slip', {
    seedSSO: 3088163, regeneratedSSO: regen.ssoInsurance7PctToman,
    seedTax: 3820000, regeneratedTax: regen.incomeTaxToman,
    seedCommute: 2000000, regeneratedCommute: regen.commuteAllowanceToman,
    seedOvertime: 3500000, regeneratedOvertime: regen.overtimePayToman,
    note: 'Regenerating silently overwrites the finalized historical slip with different numbers',
  });

  // ---------- P5: Leave request adversarial inputs ----------
  res = await req('POST', '/api/leave/requests', { employeeId: 'emp-2', leaveType: 'ANNUAL', startDateJalali: '۱۴۰۳/۰۶/۲۰', endDateJalali: '۱۴۰۳/۰۶/۱۰', daysCount: -10, reason: 'منفی' });
  const negLeave = res.body;
  res = await req('POST', '/api/leave/requests', { employeeId: 'emp-does-not-exist', leaveType: 'ANNUAL', startDateJalali: 'abc', endDateJalali: 'xyz', daysCount: 999, reason: 'بیش از سقف' });
  const ghostLeave = res.body;
  log('P5 leave request validation', {
    negativeDaysAccepted: { status: negLeave.status, daysCount: negLeave.daysCount },
    unknownEmployeeFallback: { requestedId: 'emp-does-not-exist', assignedTo: ghostLeave.employeeName, assignedId: ghostLeave.employeeId },
    garbageDatesAccepted: { start: ghostLeave.startDateJalali, end: ghostLeave.endDataJalali || ghostLeave.endDateJalali },
    days999Accepted: ghostLeave.daysCount,
    endBeforeStartAccepted: negLeave.startDateJalali + ' > ' + negLeave.endDateJalali,
  });

  // ---------- P6: Approve the 999-day leave as HR; balance never tracked ----------
  await req('POST', '/api/auth/switch-role', { role: 'HR_DIRECTOR' });
  res = await req('PATCH', `/api/leave/requests/${ghostLeave.id}/approve`, { approved: true, comment: 'تایید' });
  log('P6 999-day annual leave approved', { status: res.body.status, daysCount: res.body.daysCount, balanceCheckPerformed: false, note: 'No entitlement/balance model exists anywhere (server or client); "26 days" card is hardcoded USED=7' });

  // ---------- P7: EMPLOYEE role reads all payroll + PII, and can RUN payroll ----------
  await req('POST', '/api/auth/switch-role', { role: 'EMPLOYEE' });
  const slipsAsEmployee = await req('GET', '/api/payroll/slips');
  const empsAsEmployee = await req('GET', '/api/employees');
  const genAsEmployee = await req('POST', '/api/payroll/generate', { monthJalali: 7, yearJalali: 1403 });
  log('P7 RBAC: EMPLOYEE role', {
    payrollSlipsVisible: slipsAsEmployee.body.length,
    sampleSalaryLeak: slipsAsEmployee.body[0] && { name: slipsAsEmployee.body[0].employeeName, net: slipsAsEmployee.body[0].netSalaryToman },
    employeesPIIVisible: empsAsEmployee.body.length,
    samplePII: empsAsEmployee.body[0] && { nationalId: empsAsEmployee.body[0].nationalId, iban: empsAsEmployee.body[0].bankIban, salary: empsAsEmployee.body[0].baseSalaryToman },
    employeeCanRegenerateCompanyPayroll: genAsEmployee.status === 200 && genAsEmployee.body.success,
  });

  // ---------- P8: EMPLOYEE role runs auto-leaves automation → approves ALL pending leaves ----------
  const pendingBefore = await req('GET', '/api/leave/requests');
  const pendingIds = pendingBefore.body.filter((l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR').map((l) => l.id);
  const auto = await req('POST', '/api/automation/run', { taskId: 'auto-leaves' });
  const pendingAfter = await req('GET', '/api/leave/requests');
  log('P8 auto-leaves automation executed by EMPLOYEE role', {
    automationRanAsEmployee: auto.status === 200,
    pendingBefore: pendingIds.length,
    pendingAfter: pendingAfter.body.filter((l) => l.status === 'PENDING_MANAGER' || l.status === 'PENDING_HR').length,
    approvedWithoutManagerOrHR: pendingAfter.body.filter((l) => l.status === 'APPROVED' && !l.managerApproved).map((l) => l.id),
    message: auto.body.message,
  });

  // ---------- P9: Pipeline guard — straight to HIRED without evaluation ----------
  await req('POST', '/api/auth/switch-role', { role: 'HR_DIRECTOR' });
  res = await req('PATCH', '/api/candidates/cand-1/stage', { stage: 'HIRED' });
  const hired = res.body;
  res = await req('PATCH', '/api/candidates/cand-1/stage', { stage: 'REJECTED' });
  res = await req('PATCH', '/api/candidates/cand-1/stage', { stage: 'HIRED' });
  const empsAfterHire = await req('GET', '/api/employees');
  const checklists = await req('GET', '/api/checklists');
  log('P9 candidate HIRED with no evaluation/interview/offer; HIRED->REJECTED->HIRED allowed', {
    stageNow: hired.stage, evaluationScore: hired.overallScore, anyGateEnforced: false,
    employeeRecordCreatedOnHire: empsAfterHire.body.some((e) => e.fullName === hired.fullName),
    onboardingChecklistCreated: checklists.body.some((c) => c.employeeName === hired.fullName),
  });

  // ---------- P10: Bulk upload fabricates 200 candidates + auto-rejects some ----------
  const candsBefore = await req('GET', '/api/candidates');
  res = await req('POST', '/api/candidates/bulk-upload', { jobId: 'job-1', filesCount: 200, files: [{ name: 'real_resume.pdf', size: 12345 }], mode: 'batch' });
  const candsAfter = await req('GET', '/api/candidates');
  const autoRejected = candsAfter.body.filter((c) => c.stage === 'REJECTED' && c.id.startsWith('cand-bulk-')).length;
  const pdfCand = candsAfter.body.find((c) => c.resumeFileName === 'real_resume.pdf');
  log('P10 bulk upload (1 real PDF + 199 fabricated)', {
    processed: res.body.processedCount,
    storeGrew: candsAfter.body.length - candsBefore.body.length,
    autoRejectedWithoutHumanReview: autoRejected,
    pdfTextExtracted: false,
    pdfFabricatedResumeText: pdfCand && pdfCand.resumeText.slice(0, 80),
    pdfRandomScore: pdfCand && pdfCand.overallScore,
    rejectionScoresAreRandom: 'score = 4 + Math.random()*5.8 in server.ts bulk-upload',
  });

  // ---------- P11: AI evaluation of EMPTY resume (no API key) ----------
  res = await req('POST', '/api/jobs/evaluate-candidate', { jobTitle: 'کارشناس', department: 'IT', candidateName: 'رزومه خالی', resumeText: '', criteria: [], scoringMethod: 'WEIGHTED_AVG', aiRigor: 'BALANCED' });
  log('P11 empty resume evaluation', {
    overallScore: res.body.overallScore, category: res.body.category,
    note: 'Server substitutes placeholder text "متن رزومه برای ارزیابی"; deterministic fallback fabricates ~6.5-7.8 scores; >=7.0 => INTERVIEW_PRIORITY',
  });

  // ---------- P12: Voice assistant keyword misfires + false completion claims ----------
  const v1 = await req('POST', '/api/ai/voice-assistant', { command: 'یک سوال درباره حقوق داشتم' });
  const v2 = await req('POST', '/api/ai/voice-assistant', { command: 'مصاحبه فردا ساعت چند است؟' });
  log('P12 voice assistant', {
    questionAboutSalary_triggers: { actionType: v1.body.actionType, claim: (v1.body.replyText || '').slice(0, 120) },
    questionAboutInterview_triggers: { actionType: v2.body.actionType, claim: (v2.body.replyText || '').slice(0, 120) },
    note: 'RUN_AUTOMATION_PAYROLL/SCREENING are auto-executed by client (MobileVoiceCall) with NO confirmation; reply text claims completion in past tense even though nothing ran server-side yet',
  });

  // ---------- P13: AI chat rejection keyword → drafts REJECTION for a question ----------
  const c1 = await req('POST', '/api/ai/chat', { message: 'چرا سارا تهرانی رد شد؟', jobId: 'job-1' });
  log('P13 chat: user ASKS why a candidate was rejected', {
    replyExcerpt: (c1.body.text || '').slice(0, 100),
    draftsRejectionEmail: c1.body.emailDraftPreview ? { for: c1.body.emailDraftPreview.candidateName, type: c1.body.emailDraftPreview.type } : null,
  });

  // ---------- P14: Chat has no conversation memory (no history param in API) ----------
  const c2 = await req('POST', '/api/ai/chat', { message: 'سه نفر برتر را مقایسه کن', jobId: 'job-1' });
  const c3 = await req('POST', '/api/ai/chat', { message: 'نفر اول همان لیست قبلی را استخدام کن', jobId: 'job-1' });
  log('P14 chat context across messages', {
    apiAcceptsHistory: false,
    secondMessageReplyExcerpt: (c3.body.text || '').slice(0, 140),
    note: 'POST /api/ai/chat takes only {message, jobId}; each turn is stateless. "همان لیست قبلی" cannot be resolved.',
  });

  // ---------- P15: Timezone — check-in timestamp is server-local (UTC), not Tehran ----------
  res = await req('POST', '/api/attendance/check-in-out', { employeeId: 'emp-3', type: 'CHECK_IN' });
  log('P15 attendance timezone', {
    recordedCheckIn: res.body.checkIn,
    serverLocalTimeUTC: new Date().toISOString().slice(11, 16),
    tehranWallClock_now: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString().slice(11, 16),
    delayMinutesComputedAgainst_08_00_ServerTZ: res.body.delayMinutes,
  });

  // ---------- P16: Employee self-service identity — leave/check-in always attributed to employees[0] ----------
  const emps = await req('GET', '/api/employees');
  log('P16 identity of acting employee', {
    clientAlwaysUses: 'employees[0].id = ' + emps.body[0].id + ' (' + emps.body[0].fullName + ')',
    note: 'App.tsx handleSubmitLeave/handleCheckInOut hardcode employees[0]; EMPLOYEE role actions are attributed to the HR Director record. No user<->employee link exists (auth/me is a static admin).',
  });

  // ---------- P17: DEPT_MANAGER department scoping ----------
  await req('POST', '/api/auth/switch-role', { role: 'DEPT_MANAGER' });
  const allEmps = await req('GET', '/api/employees');
  const allLeaves = await req('GET', '/api/leave/requests');
  const allCands = await req('GET', '/api/candidates');
  log('P17 DEPT_MANAGER scoping', {
    employeesVisible: allEmps.body.length, leavesVisible: allLeaves.body.length, candidatesVisible: allCands.body.length,
    departmentFilterApplied: false,
    note: 'APIs return global data for every role; managers of any dept can approve leaves of any dept (approve endpoint checks stage but not department).',
  });

  // ---------- P18: leave approve UI mismatch (403 body stored as request) ----------
  const aPH = await req('POST', '/api/leave/requests', { employeeId: 'emp-2', leaveType: 'ANNUAL', startDateJalali: '۱۴۰۳/۰۷/۰۱', endDateJalali: '۱۴۰۳/۰۷/۰۲', daysCount: 1, reason: 'تست ۴۰۳' });
  await req('POST', '/api/auth/switch-role', { role: 'HR_DIRECTOR' });
  await req('PATCH', `/api/leave/requests/${aPH.body.id}/approve`, { approved: true });
  await req('POST', '/api/auth/switch-role', { role: 'DEPT_MANAGER' });
  res = await req('PATCH', `/api/leave/requests/${aPH.body.id}/approve`, { approved: true });
  log('P18 dept manager acting on PENDING_HR request', {
    serverResponse: { status: res.status, body: res.body },
    clientBehavior: 'App.tsx handleApproveLeave does not check res.ok: replaces request in state with {error} object and shows SUCCESS toast',
  });

  // ---------- P19: no delete/archive lifecycle ----------
  const delJob = await req('DELETE', '/api/jobs/job-3');
  const delEmp = await req('DELETE', '/api/employees/emp-3');
  log('P19 lifecycle operations', { deleteJobStatus: delJob.status, deleteEmployeeStatus: delEmp.status, note: 'No DELETE endpoints; jobs cannot be ARCHIVED (POST forces ACTIVE); UI shows بایگانی status that is unreachable' });

  // ---------- P20: persistence ----------
  log('P20 persistence', { note: 'All state in-memory (server/store.ts singleton). prisma/schema.prisma exists but no prisma dependency/client anywhere; server restart loses all data incl. finalized payroll.' });

  console.log('\n\nDONE. probes:', out.length);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
