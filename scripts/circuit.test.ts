/**
 * Focused test for the Gemini circuit breaker.
 *
 * The breaker used to be dead code: `isGeminiCircuitOpen()` was exported but
 * never consulted, so every resume re-attempted up to 4 models × 2 attempts
 * (~2.5 minutes) before falling back to the local engine — the "5 resumes and
 * it just sits there" bug. Run with: npx tsx scripts/circuit.test.ts
 */
import {
  CIRCUIT_OPEN,
  evaluateResumeV2,
  isGeminiCircuitOpen,
  recordGeminiFailure,
  recordGeminiSuccess,
} from '../server/screening-gemini';
import type { JobUnderstanding, ScreeningAnswers } from '../src/types/screening';

process.env.GEMINI_API_KEY = 'AIzaSyINVALID_TEST_KEY_000000000000000';

let failures = 0;
function assert(cond: boolean, label: string, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? ' — ' + extra : ''}`);
  if (!cond) failures++;
}

// Count real outbound attempts made by the @google/genai SDK.
let fetchCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = ((...args: any[]) => {
  fetchCalls++;
  return realFetch(...(args as [any, any]));
}) as typeof fetch;

const understanding: JobUnderstanding = {
  department: 'تولید و کارخانه',
  departmentId: 'manufacturing',
  roleTitle: 'اپراتور خط',
  seniority: 'کارشناسی',
  plainExplanation: 'تست',
  thresholds: { interview: 75, review: 50 },
  criteria: [
    { id: 'c1', title: 'سابقه مرتبط', weight: 50, mustHave: true },
    { id: 'c2', title: 'مهارت فنی', weight: 50, mustHave: false },
  ],
  questions: [
    { id: 'q1', type: 'boolean', kind: 'knockout', label: 'سابقه کارگاهی', weight: 20, defaultChecked: true },
  ],
};
const answers: ScreeningAnswers = { q1: true };
const resumeText =
  'علی محمدی، کارشناس تولید با ۶ سال سابقه در خط تولید دارویی، آشنا با GMP، مدرک مهندسی شیمی.';

async function main() {
  assert(isGeminiCircuitOpen() === false, 'breaker starts closed');

  // Three consecutive failures now open it (was 4, and nothing ever read it).
  recordGeminiFailure(false, false);
  recordGeminiFailure(false, false);
  assert(isGeminiCircuitOpen() === false, 'breaker still closed after 2 failures');
  recordGeminiFailure(false, false);
  assert(isGeminiCircuitOpen() === true, 'breaker opens after 3 consecutive failures');

  // While open, evaluation must short-circuit to the local engine without any
  // network call at all.
  fetchCalls = 0;
  const t0 = Date.now();
  const ev = await evaluateResumeV2(
    'تولید و کارخانه',
    'اپراتور خط',
    '',
    understanding,
    answers,
    resumeText,
    'resume.txt'
  );
  const ms = Date.now() - t0;
  assert(fetchCalls === 0, 'no Gemini request is attempted while the breaker is open', `fetch calls=${fetchCalls}`);
  assert(ms < 200, `local fallback returns immediately: ${ms}ms`);
  assert(ev.engine === 'local', 'result is explicitly labelled as the local engine', `engine=${ev.engine}`);
  assert(typeof ev.score === 'number' && ev.score >= 0 && ev.score <= 100, 'score is in range', `${ev.score}`);

  // A success closes it again and real attempts resume.
  recordGeminiSuccess();
  assert(isGeminiCircuitOpen() === false, 'a success closes the breaker');

  fetchCalls = 0;
  const t1 = Date.now();
  await evaluateResumeV2('تولید و کارخانه', 'اپراتور خط', '', understanding, answers, resumeText, 'resume.txt');
  assert(fetchCalls > 0, 'attempts resume once the breaker closes', `fetch calls=${fetchCalls}`);
  assert(
    Date.now() - t1 < 50_000,
    `a fully failing call is bounded by the deadline, not 4 models × 2 attempts: ${Date.now() - t1}ms`
  );

  assert(CIRCUIT_OPEN === 'GEMINI_CIRCUIT_OPEN', 'sentinel value matches the log filter');

  console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('TEST CRASHED:', e);
  process.exit(1);
});
