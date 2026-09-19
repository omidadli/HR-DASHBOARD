/**
 * Smart resume screening AI service (Seilaneh Sabz).
 *
 * Pass 0  — understandJobV2: department + role title → weighted criteria +
 *           simple checkbox questionnaire + dynamic thresholds.
 * Pass 1  — evaluateResumeV2: evidence-based structured evaluation of each resume.
 * Pass 2  — calibrateV2: relative calibration of top & borderline candidates.
 * Extra   — draftMessageV2: personalized candidate message drafts.
 *
 * Hard rules enforced everywhere:
 *  - Every strength/weakness/criterion score must carry a real quote as evidence.
 *  - No fabricated names/numbers: the model may only state what the resume says.
 *  - When Gemini is unavailable, screening questions FAIL (no fake questions),
 *    while individual evaluations fall back to a clearly-labeled LOCAL engine.
 */
import dotenv from 'dotenv';
dotenv.config({ override: true });
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  AnalysisEngine,
  BatchStats,
  CandidateEvaluation,
  Criterion,
  CriterionScore,
  DraftMessage,
  EvidencePoint,
  JobUnderstanding,
  MessageKind,
  Recommendation,
  ResumeRecord,
  ScreeningAnswers,
  ScreeningQuestion,
} from '../src/types/screening';
import { getDepartment } from '../src/lib/departments';
import { normalizePersianText, toEnglishDigits } from '../src/lib/normalizeFa';

function getGeminiClient(): GoogleGenAI {
  const secret = process.env.GEMINI_API_KEY?.trim();
  if (!secret) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
  }
  return new GoogleGenAI({ apiKey: secret });
}

export function resolveGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (envModel) {
    const clean = envModel.replace(/^models\//, '');
    if (
      clean.startsWith('gemini-') &&
      !clean.includes(' ') &&
      clean.length < 50
    ) {
      return clean;
    }
  }
  return 'gemini-3.8-flash';
}

/** Robust JSON extraction: strips markdown fences, finds outermost JSON, fixes trailing commas/control chars. */
export function cleanAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText) return fallback;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  }
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    let sanitized = '';
    let inString = false;
    let isEscaped = false;
    for (let i = 0; i < cleaned.length; i++) {
      const ch = cleaned[i];
      const code = ch.charCodeAt(0);
      if (inString) {
        if (isEscaped) {
          sanitized += ch;
          isEscaped = false;
        } else if (ch === '\\') {
          sanitized += ch;
          isEscaped = true;
        } else if (ch === '"') {
          sanitized += ch;
          inString = false;
        } else if (ch === '\n') sanitized += '\\n';
        else if (ch === '\r') sanitized += '\\r';
        else if (ch === '\t') sanitized += '\\t';
        else if (code < 32) sanitized += '\\u' + code.toString(16).padStart(4, '0');
        else sanitized += ch;
      } else {
        if (ch === '"') inString = true;
        sanitized += ch;
      }
    }
    try {
      return JSON.parse(sanitized) as T;
    } catch (err) {
      console.error('Failed to parse JSON from Gemini:', err, 'Raw head:', rawText.slice(0, 300));
      return fallback;
    }
  }
}

// ---------------- Circuit breaker & model failover ----------------

let circuitOpenUntil = 0;
let circuitConsecutiveFailures = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Thrown instead of a model call while the breaker is open. */
export const CIRCUIT_OPEN = 'GEMINI_CIRCUIT_OPEN';

export function isGeminiCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}
export function recordGeminiSuccess() {
  circuitConsecutiveFailures = 0;
  circuitOpenUntil = 0;
}
export function recordGeminiFailure(isQuota: boolean, isHighDemand: boolean) {
  // 503 high demand spikes are temporary model-level spikes, not quota depletion
  if (isHighDemand) return;
  circuitConsecutiveFailures++;
  if (circuitConsecutiveFailures >= 3) {
    // Long enough to let a rate-limited key recover, short enough that the user
    // does not have to wait through a whole batch of failing calls.
    const cooldownMs = isQuota ? 30_000 : 10_000;
    circuitOpenUntil = Date.now() + cooldownMs;
  }
}

/** 400/401/403/404 mean the key or model name is wrong — retrying is pointless. */
function isFatalAuthError(err: any): boolean {
  const status = err?.status || err?.code;
  const msg = String(err?.message || '');
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    status === 404 ||
    /API key not valid|API_KEY_INVALID|PERMISSION_DENIED|NOT_FOUND|is not found/i.test(msg)
  );
}

/**
 * One Gemini call with a small, *bounded* retry budget.
 *
 * Previously this walked 4 candidate models × 2 attempts × 18 s and ignored the
 * circuit breaker entirely, so a rate-limited key made every single resume burn
 * ~2.5 minutes before falling back to the local engine — a 5-resume batch then
 * looked completely frozen. Now: the breaker is honoured, fatal auth errors stop
 * immediately, and a hard deadline caps the whole operation.
 */
async function generateWithFallback(
  contents: string | { parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> },
  config?: {
    temperature?: number;
    responseMimeType?: string;
    timeoutMs?: number;
    /** Absolute budget for all models + retries. */
    deadlineMs?: number;
  }
): Promise<string> {
  if (isGeminiCircuitOpen()) {
    throw new Error(CIRCUIT_OPEN);
  }

  const client = getGeminiClient();
  const primary = resolveGeminiModel();
  // Two models is enough: a third/fourth candidate only added minutes of latency
  // in the failure path without measurably improving success.
  const candidateModels = Array.from(new Set([primary, 'gemini-2.5-flash']));
  const perCallTimeout = config?.timeoutMs ?? 18_000;
  const deadline = Date.now() + (config?.deadlineMs ?? 45_000);

  let lastError: any = null;

  outer: for (const model of candidateModels) {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break outer;
      const timeoutMs = Math.max(2_000, Math.min(perCallTimeout, remaining));

      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const thinkingConfig = model.includes('2.5')
          ? { thinkingBudget: 0 }
          : { thinkingLevel: ThinkingLevel.LOW };

        const call = client.models.generateContent({
          model,
          contents,
          config: {
            temperature: config?.temperature ?? 0.1,
            responseMimeType: config?.responseMimeType ?? 'application/json',
            thinkingConfig,
          },
        });
        const timeout = new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Timeout after ${timeoutMs}ms on ${model}`)),
            timeoutMs
          );
        });
        const res = await Promise.race([call, timeout]);
        if (res.text) {
          recordGeminiSuccess();
          return res.text;
        }
        lastError = new Error(`مدل ${model} پاسخ متنی برنگرداند`);
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isHighDemand = err?.status === 503 || /503|UNAVAILABLE|overloaded|high demand/i.test(msg);
        if (isFatalAuthError(err)) {
          // Same key for every model — stop the whole cascade now.
          break outer;
        }
        if (isHighDemand && attempt < maxAttempts && Date.now() + 1500 < deadline) {
          await sleep(1000 + Math.floor(Math.random() * 500));
          continue;
        }
        break;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  }

  const lastMsg = String(lastError?.message || '');
  const isQuota = lastError?.status === 429 || /429|quota|RESOURCE_EXHAUSTED/i.test(lastMsg);
  const isHighDemand = lastError?.status === 503 || /503|UNAVAILABLE|overloaded|high demand/i.test(lastMsg);
  recordGeminiFailure(isQuota, isHighDemand);
  throw lastError || new Error('All Gemini models are temporarily unavailable.');
}

// ================================================================
// PASS 0 — Understand the job + generate the checkbox questionnaire
// ================================================================

const QUESTION_EXAMPLE_JSON = `{
  "department": "فروش و پخش مویرگی",
  "roleTitle": "کارشناس فروش حضوری",
  "seniority": "کارشناسی",
  "plainExplanation": "این شغل یه کار میدانی فروشه؛ پس سابقه فروش حضوری، فن بیان و آمادگی ماموریت رو خیلی پررنگ کردم و چون کارش تارگت و پورسانه، سابقه کار با عدد و تارگت هم مهمه.",
  "thresholds": { "interview": 75, "review": 50 },
  "criteria": [
    { "id": "c1", "title": "سابقه و نتایج فروش میدانی", "weight": 35, "mustHave": true },
    { "id": "c2", "title": "فن بیان، مذاکره و روابط عمومی", "weight": 25, "mustHave": true },
    { "id": "c3", "title": "آشنایی با پخش مویرگی و صنعت FMCG", "weight": 15, "mustHave": false },
    { "id": "c4", "title": "آمادگی ماموریت و تردد میدانی", "weight": 15, "mustHave": true },
    { "id": "c5", "title": "پایداری و ثبات شغلی", "weight": 10, "mustHave": false }
  ],
  "questions": [
    { "id": "q1", "kind": "knockout", "type": "boolean", "label": "سابقه فروش حضوری یا میدانی داشته باشد", "weight": 30, "defaultChecked": true },
    { "id": "q2", "kind": "knockout", "type": "boolean", "label": "آماده ماموریت‌های درون‌شهری و جاده‌ای باشد", "weight": 20, "defaultChecked": true },
    { "id": "q3", "kind": "bonus", "type": "boolean", "label": "با نرم‌افزار CRM کار کرده باشد", "weight": 10, "defaultChecked": false },
    { "id": "q4", "kind": "bonus", "type": "boolean", "label": "سابقه کار پورسانی و تارگت داشته باشد", "weight": 15, "defaultChecked": true },
    { "id": "q5", "kind": "knockout", "type": "single", "label": "حداقل سابقه کار مورد انتظار", "weight": 15,
      "options": [ {"value":"any","label":"فرقی نمی‌کند"}, {"value":"1","label":"بالای ۱ سال"}, {"value":"3","label":"بالای ۳ سال"}, {"value":"5","label":"بالای ۵ سال"} ],
      "defaultValue": "1" },
    { "id": "q6", "kind": "bonus", "type": "multi", "label": "کدام مهارت‌ها برایت مهم‌تر است؟", "weight": 10,
      "options": [ {"value":"nego","label":"مذاکره و فن بیان"}, {"value":"merch","label":"مرچندایزینگ و چیدمان فروشگاهی"}, {"value":"fmcg","label":"آشنایی با پخش مویرگی FMCG"}, {"value":"excel","label":"اکسل و گزارش فروش"} ],
      "defaultValues": ["nego","fmcg"] }
  ]
}`;

function repairUnderstanding(raw: any, departmentId: string, roleTitle: string): JobUnderstanding | null {
  try {
    const dept = getDepartment(departmentId);
    if (!raw || !Array.isArray(raw.criteria) || raw.criteria.length < 3) return null;
    if (!Array.isArray(raw.questions) || raw.questions.length < 3) return null;

    // Normalize criteria: ids, integer weights summing to 100, at least one mustHave
    const criteria: Criterion[] = raw.criteria.slice(0, 6).map((c: any, i: number) => ({
      id: typeof c.id === 'string' && c.id ? c.id : `c${i + 1}`,
      title: String(c.title || '').trim(),
      weight: Math.max(1, Math.round(Number(c.weight) || 0)),
      mustHave: Boolean(c.mustHave),
    }));
    if (criteria.some((c) => !c.title)) return null;
    if (!criteria.some((c) => c.mustHave)) criteria[0].mustHave = true;
    const totalW = criteria.reduce((s, c) => s + c.weight, 0);
    if (totalW <= 0) return null;
    // Scale weights to sum 100
    let scale = 100 / totalW;
    let weights = criteria.map((c) => Math.max(1, Math.round(c.weight * scale)));
    let diff = 100 - weights.reduce((s, w) => s + w, 0);
    let guard = 0;
    while (diff !== 0 && guard++ < 100) {
      const idx = weights.indexOf(Math.max(...weights));
      weights[idx] += diff > 0 ? 1 : -1;
      if (weights[idx] < 1) weights[idx] = 1;
      diff = 100 - weights.reduce((s, w) => s + w, 0);
    }
    criteria.forEach((c, i) => (c.weight = weights[i]));

    // Normalize questions (5-8 questions), booleans dominate
    const questions: ScreeningQuestion[] = [];
    let qIdx = 0;
    for (const q of raw.questions.slice(0, 8)) {
      if (!q || typeof q.label !== 'string' || !q.label.trim()) continue;
      const id = typeof q.id === 'string' && q.id ? q.id : `q${++qIdx}`;
      const kind: 'knockout' | 'bonus' = q.kind === 'bonus' ? 'bonus' : 'knockout';
      const weight = Math.max(1, Math.round(Number(q.weight) || 10));
      if (q.type === 'single' && Array.isArray(q.options) && q.options.length >= 2) {
        questions.push({
          id, kind, type: 'single', label: q.label.trim(), weight,
          options: q.options.slice(0, 6).map((o: any, i: number) => ({
            value: String(o.value ?? i), label: String(o.label ?? o.value ?? '').trim(),
          })).filter((o: { label: string }) => o.label),
          defaultValue: String(q.defaultValue ?? q.options[0]?.value ?? 'any'),
        });
      } else if (q.type === 'multi' && Array.isArray(q.options) && q.options.length >= 2) {
        const options = q.options.slice(0, 8).map((o: any, i: number) => ({
          value: String(o.value ?? i), label: String(o.label ?? o.value ?? '').trim(),
        })).filter((o: { label: string }) => o.label);
        const defs = new Set(
          (Array.isArray(q.defaultValues) ? q.defaultValues : []).map((v: any) => String(v))
        );
        questions.push({
          id, kind, type: 'multi', label: q.label.trim(), weight, options,
          defaultValues: options.map((o: { value: string }) => o.value).filter((v: string) => defs.has(v)),
        });
      } else {
        questions.push({
          id, kind, type: 'boolean', label: q.label.trim(), weight,
          defaultChecked: Boolean(q.defaultChecked),
        });
      }
    }
    if (questions.length < 3) return null;
    // Ensure a minimum-experience single-choice question exists
    if (!questions.some((q) => q.type === 'single')) {
      questions.push({
        id: 'q-min-exp', kind: 'knockout', type: 'single', weight: 10,
        label: 'حداقل سابقه کار مورد انتظار',
        options: [
          { value: 'any', label: 'فرقی نمی‌کند' },
          { value: '1', label: 'بالای ۱ سال' },
          { value: '3', label: 'بالای ۳ سال' },
          { value: '5', label: 'بالای ۵ سال' },
        ],
        defaultValue: 'any',
      });
    }

    let interview = Math.round(Number(raw.thresholds?.interview) || 75);
    let review = Math.round(Number(raw.thresholds?.review) || 50);
    interview = Math.min(85, Math.max(70, interview));
    review = Math.min(60, Math.max(45, review));
    if (review >= interview) review = interview - 15;

    return {
      department: dept.name,
      departmentId,
      roleTitle: roleTitle || '',
      seniority: String(raw.seniority || 'کارشناسی').trim(),
      plainExplanation:
        String(raw.plainExplanation || '').trim() ||
        'معیارهای این شغل تحلیل شد و رزومه‌ها بر اساس تطابق سوابق و مهارت‌ها سنجیده می‌شوند.',
      thresholds: { interview, review },
      criteria,
      questions,
    };
  } catch {
    return null;
  }
}

export function buildDefaultUnderstanding(
  departmentId: string,
  roleTitle: string
): JobUnderstanding {
  const dept = getDepartment(departmentId);
  const title = roleTitle.trim();

  switch (departmentId) {
    case 'sales':
      return {
        department: dept.name,
        departmentId,
        roleTitle: title,
        seniority: 'کارشناسی',
        plainExplanation: title
          ? `معیارها و پرسش‌نامه برای موقعیت «${title}» بر اساس مهارت‌های فروش میدانی، فن بیان و تارگت‌های پخش تنظیم شد.`
          : 'معیارها و پرسش‌نامه بر اساس مهارت‌های فروش میدانی، فن بیان و تارگت‌های پخش تنظیم شد.',
        thresholds: { interview: 75, review: 50 },
        criteria: [
          { id: 'c1', title: 'سابقه و نتایج فروش میدانی، مویرگی یا ویزیتوری', weight: 35, mustHave: true },
          { id: 'c2', title: 'فن بیان، اصول مذاکره و متقاعدسازی مشتری', weight: 25, mustHave: true },
          { id: 'c3', title: 'آشنایی با پخش مویرگی و صنعت کالاهای تندمصرف (FMCG)', weight: 20, mustHave: false },
          { id: 'c4', title: 'آمادگی تردد میدانی، انگیزه تارگت و پایداری شغلی', weight: 20, mustHave: false },
        ],
        questions: [
          { id: 'q1', kind: 'knockout', type: 'boolean', label: 'سابقه فروش حضوری، ویزیتوری یا پخش مویرگی داشته باشد؟', weight: 25, defaultChecked: true },
          { id: 'q2', kind: 'knockout', type: 'boolean', label: 'آماده تردد مستمر در مسیر ویزیت و مناطق شهری باشد؟', weight: 20, defaultChecked: true },
          { id: 'q3', kind: 'bonus', type: 'boolean', label: 'سابقه کار در صنعت پخش FMCG یا آرایشی-بهداشتی داشته باشد؟', weight: 15, defaultChecked: true },
          { id: 'q4', kind: 'bonus', type: 'boolean', label: 'سابقه کار با نرم‌افزارهای سفارش‌گیری یا تبلت فروش داشته باشد؟', weight: 15, defaultChecked: false },
          {
            id: 'q-min-exp',
            kind: 'knockout',
            type: 'single',
            label: 'حداقل سابقه کار مورد انتظار',
            weight: 15,
            options: [
              { value: 'any', label: 'فرقی نمی‌کند' },
              { value: '1', label: 'بالای ۱ سال' },
              { value: '3', label: 'بالای ۳ سال' },
              { value: '5', label: 'بالای ۵ سال' },
            ],
            defaultValue: '1',
          },
          {
            id: 'q-skills',
            kind: 'bonus',
            type: 'multi',
            label: 'مهارت‌های تکمیلی اولویت‌دار',
            weight: 10,
            options: [
              { value: 'nego', label: 'اصول مذاکره و متقاعدسازی' },
              { value: 'crm', label: 'ارتباط با مشتری (CRM)' },
              { value: 'merch', label: 'مرچندایزینگ و چیدمان فروشگاهی' },
              { value: 'route', label: 'مسیربندی و بازاریابی منطقه‌ای' },
            ],
            defaultValues: ['nego'],
          },
        ],
      };

    case 'manufacturing':
      return {
        department: dept.name,
        departmentId,
        roleTitle: title,
        seniority: 'کارشناسی / فنی',
        plainExplanation: title
          ? `معیارها و پرسش‌نامه برای «${title}» با تمرکز بر سابقه خط تولید، کار شیفتی و انضباط کارگاهی تنظیم شد.`
          : 'معیارها و پرسش‌نامه با تمرکز بر سابقه خط تولید، کار شیفتی و انضباط کارگاهی تنظیم شد.',
        thresholds: { interview: 75, review: 50 },
        criteria: [
          { id: 'c1', title: 'سابقه کارگاهی، اپراتوری خط تولید یا کار با ماشین‌آلات صنعتی', weight: 35, mustHave: true },
          { id: 'c2', title: 'آمادگی کار در شیفت‌های چرخشی (روز/شب) و انضباط فردی', weight: 25, mustHave: true },
          { id: 'c3', title: 'رعایت اصول ایمنی محیط کار و ضوابط بهداشتی کارخانه', weight: 20, mustHave: false },
          { id: 'c4', title: 'مدارک فنی‌وحرفه‌ای مرتبط یا مهارت در ابزار دقیق', weight: 20, mustHave: false },
        ],
        questions: [
          { id: 'q1', kind: 'knockout', type: 'boolean', label: 'سابقه کار در محیط کارخانه یا خط تولید داشته باشد؟', weight: 25, defaultChecked: true },
          { id: 'q2', kind: 'knockout', type: 'boolean', label: 'آماده کار در شیفت‌های چرخشی و اضافه کاری باشد؟', weight: 25, defaultChecked: true },
          { id: 'q3', kind: 'bonus', type: 'boolean', label: 'مدرک فنی‌وحرفه‌ای یا دیپلم/کاردانی فنی داشته باشد؟', weight: 15, defaultChecked: true },
          { id: 'q4', kind: 'bonus', type: 'boolean', label: 'تجربه کار با ماشین‌آلات بسته‌بندی یا تولید داشته باشد؟', weight: 15, defaultChecked: false },
          {
            id: 'q-min-exp',
            kind: 'knockout',
            type: 'single',
            label: 'حداقل سابقه کار مورد انتظار',
            weight: 10,
            options: [
              { value: 'any', label: 'فرقی نمی‌کند' },
              { value: '1', label: 'بالای ۱ سال' },
              { value: '3', label: 'بالای ۳ سال' },
              { value: '5', label: 'بالای ۵ سال' },
            ],
            defaultValue: '1',
          },
          {
            id: 'q-skills',
            kind: 'bonus',
            type: 'multi',
            label: 'مهارت‌های تخصصی کارگاهی',
            weight: 10,
            options: [
              { value: 'pm', label: 'نگهداری و سرویس ماشین‌آلات (PM)' },
              { value: 'tools', label: 'کار با ابزارهای اندازه‌گیری دقیق' },
              { value: 'quality', label: 'کنترل اولیه حین تولید' },
              { value: 'shift-log', label: 'ثبت گزارش‌های روزانه شیفت' },
            ],
            defaultValues: ['pm'],
          },
        ],
      };

    case 'finance':
      return {
        department: dept.name,
        departmentId,
        roleTitle: title,
        seniority: 'کارشناسی',
        plainExplanation: title
          ? `معیارها و پرسش‌نامه برای «${title}» بر اساس تسلط به نرم‌افزارهای مالی، حسابداری صنعتی و قوانین مالیاتی تدوین شد.`
          : 'معیارها و پرسش‌نامه بر اساس نرم‌افزارهای مالی، حسابداری صنعتی و قوانین مالیاتی تدوین شد.',
        thresholds: { interview: 75, review: 50 },
        criteria: [
          { id: 'c1', title: 'تسلط بر نرم‌افزارهای مالی و حسابداری (سپیدار / همکاران سیستم)', weight: 35, mustHave: true },
          { id: 'c2', title: 'تسلط بر قوانین مالیاتی، بیمه و ارسال اظهارنامه و سامانه مودیان', weight: 25, mustHave: true },
          { id: 'c3', title: 'حسابداری صنعتی، بهای تمام‌شده و کنترل انبار', weight: 20, mustHave: false },
          { id: 'c4', title: 'دقت محاسباتی، تسلط بر اکسل پیشرفته و گزارش‌گیری مالی', weight: 20, mustHave: false },
        ],
        questions: [
          { id: 'q1', kind: 'knockout', type: 'boolean', label: 'سابقه کار با نرم‌افزارهای مالی (مانند سپیدار یا همکاران سیستم) داشته باشد؟', weight: 25, defaultChecked: true },
          { id: 'q2', kind: 'knockout', type: 'boolean', label: 'تحصیلات دانشگاهی در رشته حسابداری یا مدیریت مالی داشته باشد؟', weight: 20, defaultChecked: true },
          { id: 'q3', kind: 'bonus', type: 'boolean', label: 'تسلط به اکسل و فرمول‌نویسی پیشرفته مالی داشته باشد؟', weight: 15, defaultChecked: true },
          { id: 'q4', kind: 'bonus', type: 'boolean', label: 'تجربه کار در شرکت‌های تولیدی یا بازرگانی داشته باشد؟', weight: 15, defaultChecked: true },
          {
            id: 'q-min-exp',
            kind: 'knockout',
            type: 'single',
            label: 'حداقل سابقه کار مورد انتظار',
            weight: 15,
            options: [
              { value: 'any', label: 'فرقی نمی‌کند' },
              { value: '1', label: 'بالای ۱ سال' },
              { value: '3', label: 'بالای ۳ سال' },
              { value: '5', label: 'بالای ۵ سال' },
            ],
            defaultValue: '1',
          },
          {
            id: 'q-skills',
            kind: 'bonus',
            type: 'multi',
            label: 'حوزه‌های مسلط حسابداری',
            weight: 10,
            options: [
              { value: 'tax', label: 'سامانه مودیان و مالیات ارزش افزوده' },
              { value: 'payroll', label: 'حقوق و دستمزد و لیست بیمه' },
              { value: 'cost', label: 'حسابداری بهای تمام‌شده' },
              { value: 'treasury', label: 'خزانه‌داری و مغایرت بانکی' },
            ],
            defaultValues: ['payroll', 'tax'],
          },
        ],
      };

    case 'it':
      return {
        department: dept.name,
        departmentId,
        roleTitle: title,
        seniority: 'کارشناسی',
        plainExplanation: title
          ? `معیارها و پرسش‌نامه برای «${title}» بر اساس مهارت‌های تخصصی IT، پایداری زیرساخت و حل مسئله تدوین شد.`
          : 'معیارها و پرسش‌نامه بر اساس مهارت‌های فنی IT، زیرساخت و عیب‌یابی سامانه‌ها تدوین شد.',
        thresholds: { interview: 75, review: 50 },
        criteria: [
          { id: 'c1', title: 'سوابق فنی و پروژه‌های عملی مرتبط در حوزه IT', weight: 40, mustHave: true },
          { id: 'c2', title: 'توانایی عیب‌یابی، پشتیبانی سریع و حل مسئله', weight: 25, mustHave: true },
          { id: 'c3', title: 'آشنایی با شبکه‌های سازمانی، سرورها و پایگاه‌های داده', weight: 20, mustHave: false },
          { id: 'c4', title: 'مستندسازی فنی، مسئولیت‌پذیری و آموزش‌پذیری', weight: 15, mustHave: false },
        ],
        questions: [
          { id: 'q1', kind: 'knockout', type: 'boolean', label: 'سابقه کار تخصصی و پروژه‌های واقعی در حوزه IT داشته باشد؟', weight: 30, defaultChecked: true },
          { id: 'q2', kind: 'bonus', type: 'boolean', label: 'مدرک دانشگاهی مرتبط با مهندسی کامپیوتر یا فناوری اطلاعات داشته باشد؟', weight: 15, defaultChecked: false },
          { id: 'q3', kind: 'bonus', type: 'boolean', label: 'تسلط به زبان انگلیسی تخصصی جهت مستندات و عیب‌یابی داشته باشد؟', weight: 15, defaultChecked: true },
          {
            id: 'q-min-exp',
            kind: 'knockout',
            type: 'single',
            label: 'حداقل سابقه کار مورد انتظار',
            weight: 20,
            options: [
              { value: 'any', label: 'فرقی نمی‌کند' },
              { value: '1', label: 'بالای ۱ سال' },
              { value: '3', label: 'بالای ۳ سال' },
              { value: '5', label: 'بالای ۵ سال' },
            ],
            defaultValue: '1',
          },
          {
            id: 'q-skills',
            kind: 'bonus',
            type: 'multi',
            label: 'تخصص‌های کلیدی موردنیاز',
            weight: 20,
            options: [
              { value: 'network', label: 'پشتیبانی شبکه و سیستم‌ها (Helpdesk)' },
              { value: 'dev', label: 'برنامه‌نویسی و توسعه نرم‌افزار' },
              { value: 'db', label: 'پایگاه داده و کوئری‌نویسی SQL' },
              { value: 'infra', label: 'مدیریت سرور لینوکس / ویندوز' },
            ],
            defaultValues: ['network'],
          },
        ],
      };

    default:
      return {
        department: dept.name,
        departmentId,
        roleTitle: title,
        seniority: 'کارشناسی',
        plainExplanation: title
          ? `معیارها و پرسش‌نامه ارزیابی برای «${title}» در دپارتمان ${dept.name} آماده شد.`
          : `معیارها و پرسش‌نامه ارزیابی بر اساس نیازمندی‌های عمومی دپارتمان ${dept.name} آماده شد.`,
        thresholds: { interview: 75, review: 50 },
        criteria: [
          { id: 'c1', title: 'سوابق کاری و تجربیات مرتبط با این موقعیت شغلی', weight: 35, mustHave: true },
          { id: 'c2', title: 'مهارت‌های تخصصی و کار با ابزارها/سامانه‌های حوزه شغلی', weight: 25, mustHave: true },
          { id: 'c3', title: 'نظم کاری، مسئولیت‌پذیری و ثبات شغلی', weight: 20, mustHave: false },
          { id: 'c4', title: 'تحصیلات مرتبط یا مدارک دوره‌های آموزشی تخصصی', weight: 20, mustHave: false },
        ],
        questions: [
          { id: 'q1', kind: 'knockout', type: 'boolean', label: 'سابقه کار مرتبط در موقعیت شغلی مشابه داشته باشد؟', weight: 30, defaultChecked: true },
          { id: 'q2', kind: 'bonus', type: 'boolean', label: 'مدرک تحصیلی دانشگاهی یا گواهی معتبر مرتبط داشته باشد؟', weight: 15, defaultChecked: true },
          { id: 'q3', kind: 'bonus', type: 'boolean', label: 'مهارت در نرم‌افزارهای تخصصی و کاربردی (آفیس و سامانه‌ها) داشته باشد؟', weight: 15, defaultChecked: true },
          {
            id: 'q-min-exp',
            kind: 'knockout',
            type: 'single',
            label: 'حداقل سابقه کار مورد انتظار',
            weight: 20,
            options: [
              { value: 'any', label: 'فرقی نمی‌کند' },
              { value: '1', label: 'بالای ۱ سال' },
              { value: '3', label: 'بالای ۳ سال' },
              { value: '5', label: 'بالای ۵ سال' },
            ],
            defaultValue: '1',
          },
          {
            id: 'q-skills',
            kind: 'bonus',
            type: 'multi',
            label: 'شایستگی‌های رفتاری و فنی',
            weight: 20,
            options: [
              { value: 'teamwork', label: 'کار تیمی و انطباق‌پذیری' },
              { value: 'reporting', label: 'گزارش‌نویسی و مستندسازی' },
              { value: 'problem-solving', label: 'حل مسئله و پیگیری امور' },
              { value: 'communication', label: 'فن بیان و ارتباط موثر' },
            ],
            defaultValues: ['teamwork', 'problem-solving'],
          },
        ],
      };
  }
}

export async function understandJobV2(
  departmentId: string,
  roleTitle: string,
  extraNotes?: string
): Promise<JobUnderstanding> {
  const dept = getDepartment(departmentId);
  const prompt = `تو یک کارشناس ارشد تحلیل شغل و استخدام در هلدینگ تولیدی «سیلانه سبز» هستی.
قراره برای یک موقعیت شغلی، معیارهای ارزیابی و چند سوال خیلی ساده (چک‌باکسی) برای کاربر منابع انسانی بسازی.

دپارتمان انتخاب‌شده: ${dept.name}
حوزه این دپارتمان: ${dept.hint}
عنوان شغلی (ممکن است خالی باشد): ${roleTitle.trim() || '—'}
${extraNotes?.trim() ? `توضیحات تکمیلی کاربر:\n"""\n${extraNotes.trim()}\n"""` : ''}

کارها:
۱. «سطح ارشدیت» نقش را در یک عبارت کوتاه فارسی بنویس (کارآموزی، کارشناسی، کارشناس ارشد، سرپرستی، مدیریت).
۲. بین ۴ تا ۵ «شاخص ارزیابی وزن‌دار» بساز؛ جمع وزن‌ها دقیقاً ۱۰۰ شود؛ حداقل یکی و حداکثر دوتایش mustHave: true باشد. شاخص‌ها مخصوص همین دپارتمان و همین شغل باشند، نه کلی و تکراری.
۳. بین ۵ تا ۸ «سوال خیلی ساده» بساز که یک کاربر غیرفنی فقط با تیک‌زدن جواب بدهد:
   - بیشتر سوال‌ها type=boolean با پاسخ بله/خیر؛ label به زبان محاوره‌ای و کاملاً ساده، مثلاً «سابقه کار کارگاهی و خط تولید داشته باشد؟»، «آماده کار در شیفت چرخشی باشد؟»، «با نرم‌افزار سپیدار کار کرده باشد؟»، «مدرک فنی مرتبط داشته باشد؟».
   - دقیقاً یک سوال type=single با id مثل q-exp برای «حداقل سابقه کار مورد انتظار» با گزینه‌های any/1/3/5.
   - حداکثر دو سوال type=multi برای مهارت‌های کلیدی، با ۴ تا ۶ گزینه کوتاه.
   - kind: شرط‌هایی که نبودشان عملاً رزومه را از رقابت خارج می‌کند «knockout»؛ بقیه «bonus».
   - defaultChecked / defaultValue / defaultValues را طوری تنظیم کن که برای حالت معمول همین شغل، کمترین تغییر لازم باشد (پیش‌فرض منطقی تیک خورده).
۴. آستانه‌ها: interview بین ۷۰ تا ۸۵ (نقش مدیریتی/حساس نزدیک ۸۵، نقش‌های عمومی نزدیک ۷۰)، review بین ۴۵ تا ۶۰ و همیشه حداقل ۱۵ واحد کمتر از interview.
۵. plainExplanation: یک یا دو جمله خیلی ساده و خودمانی و بدون هیچ عدد/وزن/اصطلاح فنی که بگویی برای این شغل چه چیزهایی برایت مهم بود.

فقط و فقط JSON معتبر، دقیقاً با همین ساختار (نمونه از یک شغل دیگر، فقط برای فهم فرم):
${QUESTION_EXAMPLE_JSON}`;

  const callAndRepair = async (): Promise<JobUnderstanding | null> => {
    const raw = await generateWithFallback(prompt, {
      temperature: 0.2,
      timeoutMs: 20_000,
      deadlineMs: 25_000,
    });
    const parsed = cleanAndParseJson<any>(raw, null);
    if (!parsed) return null;
    return repairUnderstanding(parsed, departmentId, roleTitle.trim());
  };

  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const understanding = await callAndRepair();
      if (understanding) return understanding;
      lastErr = new Error('پاسخ هوش مصنوعی در قالب مورد نظر نبود');
    } catch (err: any) {
      lastErr = err;
    }
  }
  console.error('[understandJobV2] AI questionnaire generation failed:', lastErr?.message || lastErr);
  throw new Error(friendlyAiError(lastErr));
}

/** Convert GoogleGenAI/network failures into honest, actionable Persian messages. */
export function friendlyAiError(err: any): string {
  const status = err?.status || err?.code;
  const msg = String(err?.message || '');
  const isEphemeral = (process.env.GEMINI_API_KEY || '').trim().startsWith('AQ.');
  if (/API key not valid|API_KEY_INVALID|invalid|unauth|permission/i.test(msg) || status === 400 || status === 401 || status === 403) {
    return isEphemeral
      ? 'توکن موقت (AQ.) پذیرفته نشد یا اعتبارش تمام شده است. این توکن‌ها معمولاً کمتر از یک ساعت معتبرند؛ لطفاً یک کلید API دائمی با پیشوند AIza از https://aistudio.google.com/apikey بسازید و در GEMINI_API_KEY بگذارید.'
      : 'کلید GEMINI_API_KEY نامعتبر است یا دسترسی به مدل Gemini ندارد. لطفاً کلید را بررسی کنید.';
  }
  if (/fetch failed|ECONN|network|ENOTFOUND|timeout|timed? ?out/i.test(msg)) {
    return 'ارتباط با سرویس هوش مصنوعی برقرار نشد (مشکل شبکه یا فایروال). اگر از فیلترشکن/پراکسی استفاده می‌کنید مطمئن شوید سرور به generativelanguage.googleapis.com دسترسی دارد و دوباره تلاش کنید.';
  }
  if (status === 429 || /429|quota|RESOURCE_EXHAUSTED/i.test(msg)) {
    return 'سهمیه یا محدودیت نرخ کلید هوش مصنوعی پر شده است. چند لحظه دیگر دوباره تلاش کنید یا از کلید دیگری استفاده کنید.';
  }
  return 'دریافت پرسش‌نامه هوشمند ممکن نشد. اتصال اینترنت و کلید GEMINI_API_KEY را بررسی و دوباره تلاش کنید.';
}

// ================================================================
// Helpers: turn the user's checkbox answers into prompt constraints
// ================================================================

function optionLabel(q: ScreeningQuestion, value: string): string {
  if (q.type === 'single' && Array.isArray(q.options)) {
    return q.options.find((o) => o.value === value)?.label || value;
  }
  return value;
}

export function buildAnswersBrief(
  understanding: JobUnderstanding,
  answers: ScreeningAnswers
): string {
  const lines: string[] = [];
  const questions = Array.isArray(understanding?.questions) ? understanding.questions : [];
  for (const q of questions) {
    const ans = answers?.[q.id];
    if (q.type === 'boolean') {
      const checked = ans === true || ans === undefined ? q.defaultChecked : Boolean(ans);
      // If answer equals the question default being false and left false → not a constraint
      if (checked) {
        lines.push(
          `${q.kind === 'knockout' ? '【شرط حذفی الزام】' : '【مزیت امتیازی】'} ${q.label}`
        );
      }
    } else if (q.type === 'single') {
      const value = String(ans ?? q.defaultValue);
      if (value && value !== 'any') {
        const label = optionLabel(q, value);
        lines.push(`【شرط سابقه】 ${q.label}: ${label}`);
      }
    } else {
      const selected = Array.isArray(ans)
        ? ans
        : typeof ans === 'string'
        ? [ans]
        : Array.isArray(q.defaultValues)
        ? q.defaultValues
        : [];
      if (selected.length > 0 && Array.isArray(q.options)) {
        const labels = selected.map((v) => {
          const opt = q.options.find((o) => o.value === v);
          return opt?.label || v;
        });
        lines.push(`【مهارت‌های ترجیحی کاربر】 ${q.label}: ${labels.join('، ')}`);
      }
    }
  }
  return lines.length ? lines.join('\n') : 'کاربر شرط اضافه‌ای تیک نزده؛ فقط بر اساس شاخص‌های وزن‌دار ارزیابی کن.';
}

function emptyEvaluation(reason: string): CandidateEvaluation {
  return {
    candidateName: null,
    contact: { phone: null, email: null, city: null },
    facts: { yearsExperience: null, education: null, lastRole: null, skills: [], expectedSalary: null },
    criterionScores: [],
    score: 0,
    confidence: 'low',
    engine: 'ai',
    recommendation: 'REJECT',
    summary: reason,
    whyCategory: reason,
    strengths: [],
    weaknesses: [{ point: 'فایل بدون محتوای متنی معتبر', evidence: reason, severity: 'knockout' }],
    knockoutMisses: [],
    tags: [],
    bankSuggested: false,
    flags: { irrelevant: false, insufficientInfo: true, scannedNoText: false },
  };
}

// ================================================================
// PASS 1 — Evaluate a single resume
// ================================================================

export async function evaluateResumeV2(
  departmentName: string,
  roleTitle: string,
  extraNotes: string,
  understanding: JobUnderstanding,
  answers: ScreeningAnswers,
  resumeText: string,
  fileName: string,
  fileBase64?: string,
  fileMimeType?: string
): Promise<CandidateEvaluation> {
  const normalized = normalizePersianText(resumeText || '');
  const hasText = Boolean(normalized && normalized.trim().length >= 50);
  const isMultimodal = Boolean(
    fileBase64 &&
    (fileMimeType === 'application/pdf' || fileMimeType?.startsWith('image/'))
  );

  if (!hasText && !isMultimodal) {
    const ev = emptyEvaluation('متن استخراج‌شده از رزومه برای تحلیل تخصصی کافی نیست (احتمالاً فایل خالی یا خراب است).');
    ev.flags.scannedNoText = true;
    return ev;
  }

  const criteriaStr = understanding.criteria
    .map((c) => `${c.id}. ${c.title} — وزن ${c.weight}٪ ${c.mustHave ? '(الزامی)' : ''}`)
    .join('\n');
  const answersBrief = buildAnswersBrief(understanding, answers);

  const isUsingVision = !hasText && isMultimodal;

  const prompt = `تو یک کارشناس ارشد و بسیار دقیق غربالگری رزومه در هلدینگ تولیدی «سیلانه سبز» هستی.
یک رزومه را موشکافانه با شرایط شغل می‌سنجی.

دپارتمان: ${departmentName}
${roleTitle.trim() ? `عنوان شغلی: ${roleTitle.trim()}` : ''}
سطح ارشدیت نقش: ${understanding.seniority}
${extraNotes.trim() ? `توضیحات تکمیلی شغل:\n${extraNotes.trim()}\n` : ''}
شاخص‌های وزن‌دار امتیازدهی:
${criteriaStr}

شرط‌هایی که کاربر منابع انسانی تیک زده:
${answersBrief}

آستانه‌ها:
- بالای ${understanding.thresholds.interview} = INTERVIEW (مصاحبه شود)
- بین ${understanding.thresholds.review} و ${understanding.thresholds.interview} = REVIEW (بررسی شود)
- زیر ${understanding.thresholds.review} = REJECT (رد شود)

نام فایل رزومه: ${fileName}
${
  isUsingVision
    ? `رزومه به‌صورت فایل ضمیمه (PDF یا تصویر اسکن‌شده) همراه این درخواست ارسال شده است. لطفاً تمام لایه‌ها، جداول، متون فارسی و انگلیسی، سوابق و مشخصات آن را مستقیماً از روی فایل با دقت استخراج و تحلیل کن.`
    : `متن رزومه:
"""
${normalized.slice(0, 8500)}
"""`
}

قوانین نقض‌ناپذیر:
۱. فقط بر اساس چیزی که واقعاً در محتوای رزومه آمده قضاوت کن. هرگز نام، عدد، سابقه، مدرک یا مهارتی را حدس نزن یا به نام فایل نسبت نده. اگر اطلاعاتی در رزومه نبود، null بده.
۲. candidateName فقط اگر نام صریح در رزومه آمده پر شود؛ در غیر این صورت null.
۳. برای هر شاخص در criterionScores: امتیاز ۰ تا ۱۰۰، rationale یک جمله فارسی، و evidence یک «نقل‌قول مستقیم کوتاه واقعی» از متن رزومه. اگر شاخصی هیچ شاهدی در رزومه نداشت، امتیاز پایین و evidence صریحاً بنویس «در رزومه به این مورد اشاره نشده».
۴. نقاط قوت strengths حداکثر ۴، نقاط ضعف weaknesses حداکثر ۴؛ همه با evidence واقعی. severity: مواردی که شروط حذفی تیک‌خورده یا شاخص‌های الزامی را نقض می‌کنند «knockout»، نقص‌های مهم «major»، موارد جزئی «minor».
۵. knockoutMisses: فهرست شرط‌های حذفی تیک‌خورده‌ای که در رزومه شواهدی برایشان نیست یا خلافشان دیده شده.
۶. score از ۰ تا ۱۰۰ بر اساس میانگین وزنی criterionScores و قضاوت تو. قوانین سقفی:
   - رزومه کاملاً نامرتبط با دپارتمان/شغل: score زیر ۳۰، flags.irrelevant=true، recommendation=REJECT.
   - اگر هر شاخص الزامی (mustHave) یا هر شرط حذفی تیک‌خورده احراز نشود: سقف score برابر ۴۵.
   - اگر رزومه آن‌قدر خلاصه/کم‌اطلاع است که قضاوت ممکن نیست: flags.insufficientInfo=true و score پایین.
۷. صرف فهرست‌شدن نام یک مهارت بدون سابقه/پروژه/تجربه، امتیاز کامل نده؛ جابه‌جایی‌های شغلی بسیار پرتکرار را به‌عنوان ریسک ثبات شغلی در weaknesses بیاور.
۸. نام، جنسیت، سن، وضعیت تأهل، عکس و ملیت هیچ تأثیری بر امتیاز ندارند؛ فقط شایستگی‌ها سنجیده شوند.
۹. facts: yearsExperience عدد صحیح سال‌ها (اگر قابل‌تشخیص بود وگرنه null)، education آخرین مدرک/رشته، lastRole آخرین سمت، skills حداکثر ۸ مهارت کلیدی، expectedSalary فقط اگر صریح در رزومه آمده. contact: phone/email/city فقط در صورت وجود.
۱۰. tags: ۳ تا ۶ برچسب کوتاه فارسی برای فیلتر در بانک رزومه (حوزه تخصص، مهارت‌ها، سطح).
۱۱. bankSuggested: اگر برای این شغل مناسب نیست ولی برای فرصت‌های آتی همین دپارتمان ارزشمند است true.
۱۲. summary: ۲ تا ۳ جمله روان فارسی که بگوید چرا این امتیاز. whyCategory: یک جمله خیلی ساده و خودمانی که تیتر «چرا این دسته؟» شود.
۱۳. confidence: high وقتی شواهد کافی و روشن است؛ medium وقتی چند نکته مبهم است؛ low وقتی رزومه ناقص است.
۱۴. رزومه فارسی یا انگلیسی هر دو پشتیبانی شوند؛ همه فیلدهای متنی خروجی حتماً فارسی باشند (اسم مهارت‌های انگلیسی می‌تواند بماند).

فقط JSON معتبر با این ساختار خروجی بده، بدون هیچ توضیح اضافه:
{
  "candidateName": null,
  "contact": { "phone": null, "email": null, "city": null },
  "facts": { "yearsExperience": null, "education": null, "lastRole": null, "skills": [], "expectedSalary": null },
  "criterionScores": [
    { "criterionId": "c1", "score": 80, "rationale": "...", "evidence": "نقل قول واقعی از رزومه" }
  ],
  "score": 78,
  "confidence": "high",
  "recommendation": "INTERVIEW",
  "summary": "...",
  "whyCategory": "...",
  "strengths": [ { "point": "...", "evidence": "...", "severity": "minor" } ],
  "weaknesses": [ { "point": "...", "evidence": "...", "severity": "major" } ],
  "knockoutMisses": [],
  "tags": [],
  "bankSuggested": false,
  "flags": { "irrelevant": false, "insufficientInfo": false, "scannedNoText": false }
}`;

  try {
    const contents = isUsingVision && fileBase64 && fileMimeType
      ? {
          parts: [
            {
              inlineData: {
                mimeType: fileMimeType,
                data: fileBase64,
              },
            },
            { text: prompt },
          ],
        }
      : prompt;

    const raw = await generateWithFallback(contents, {
      temperature: 0.1,
      timeoutMs: 18_000,
      deadlineMs: 40_000,
    });
    const parsed = cleanAndParseJson<any>(raw, null);
    if (!parsed) throw new Error('malformed evaluation');
    return finalizeEvaluation(parsed, understanding, answers, 'ai');
  } catch (err: any) {
    if (err?.message !== CIRCUIT_OPEN) {
      console.log(`[evaluateResumeV2] «${fileName}» → local engine (${err?.message || 'err'})`);
    }
    return evaluateResumeLocal(normalized || fileName, understanding, answers, fileName);
  }
}

/** Normalize, clamp and apply hard business rules to any AI/local evaluation. */
export function finalizeEvaluation(
  raw: any,
  understanding: JobUnderstanding,
  answers: ScreeningAnswers,
  engine: AnalysisEngine
): CandidateEvaluation {
  const num = (v: any, d = 0) => {
    const n = Math.round(Number(toEnglishDigits(String(v ?? '')).replace(/[^\d.-]/g, '')));
    return Number.isFinite(n) ? n : d;
  };
  const arr = <T>(v: any): T[] => (Array.isArray(v) ? v : []);
  const str = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : null);

  const criteria: Criterion[] = understanding.criteria;
  const criterionScores: CriterionScore[] = criteria.map((c) => {
    const found = arr<any>(raw.criterionScores).find(
      (s) => String(s.criterionId) === c.id || (s.title && String(s.title).includes(c.title.slice(0, 8)))
    );
    return {
      criterionId: c.id,
      title: c.title,
      score: Math.max(0, Math.min(100, num(found?.score, 40))),
      rationale: str(found?.rationale) || 'تحلیل جزئی این شاخص در دسترس نیست.',
      evidence: str(found?.evidence) || 'در رزومه شاهد مشخصی برای این شاخص ثبت نشده.',
    };
  });

  // Weighted score from per-criterion scores (authoritative baseline)
  const weighted = Math.round(
    criterionScores.reduce((s, cs) => {
      const c = criteria.find((x) => x.id === cs.criterionId);
      return s + cs.score * (c?.weight || 0);
    }, 0) / 100
  );
  const aiScore = Math.max(0, Math.min(100, num(raw.score, weighted)));
  // Trust the model's holistic score only if it's within ±12 of the weighted baseline
  let score = Math.abs(aiScore - weighted) <= 12 ? aiScore : weighted;

  const flags = {
    irrelevant: Boolean(raw.flags?.irrelevant),
    insufficientInfo: Boolean(raw.flags?.insufficientInfo),
    scannedNoText: Boolean(raw.flags?.scannedNoText),
  };

  const strengths: EvidencePoint[] = arr<any>(raw.strengths)
    .slice(0, 4)
    .map((s) => ({
      point: str(s.point) || 'نقطه قوت',
      evidence: str(s.evidence) || 'شاهد در رزومه ثبت نشده.',
      severity: (['knockout', 'major', 'minor'].includes(s.severity) ? s.severity : 'minor') as
        | 'knockout'
        | 'major'
        | 'minor',
    }));
  const weaknesses: EvidencePoint[] = arr<any>(raw.weaknesses)
    .slice(0, 4)
    .map((w) => ({
      point: str(w.point) || 'مورد نیازمند بررسی',
      evidence: str(w.evidence) || 'شاهد در رزومه ثبت نشده.',
      severity: (['knockout', 'major', 'minor'].includes(w.severity) ? w.severity : 'minor') as
        | 'knockout'
        | 'major'
        | 'minor',
    }));
  const knockoutMisses = arr<string>(raw.knockoutMisses)
    .map((k) => str(k))
    .filter((k): k is string => Boolean(k));

  // Cross-check knockout questions the user ticked but the model didn't list
  for (const q of (understanding?.questions || [])) {
    if (q.kind !== 'knockout' || q.type !== 'boolean') continue;
    const checked = answers[q.id] === undefined ? q.defaultChecked : answers[q.id] === true;
    if (checked && !knockoutMisses.some((m) => m.includes(q.label.slice(0, 10)))) {
      // The model is the evidence reader; only apply ceiling if weaknesses flag it indirectly.
    }
  }

  const facts = {
    yearsExperience: raw.facts?.yearsExperience == null ? null : Math.max(0, num(raw.facts.yearsExperience, 0)),
    education: str(raw.facts?.education),
    lastRole: str(raw.facts?.lastRole),
    skills: arr<any>(raw.facts?.skills).map((s) => String(s)).slice(0, 8),
    expectedSalary: str(raw.facts?.expectedSalary),
  };
  const contact = {
    phone: str(raw.contact?.phone),
    email: str(raw.contact?.email),
    city: str(raw.contact?.city),
  };

  // Hard ceiling rules
  const hasKnockoutMiss = knockoutMisses.length > 0 || weaknesses.some((w) => w.severity === 'knockout');
  const missingMustHave = criterionScores.some((cs) => {
    const c = criteria.find((x) => x.id === cs.criterionId);
    return c?.mustHave && cs.score < 35;
  });
  if (flags.irrelevant) score = Math.min(score, 29);
  if ((hasKnockoutMiss || missingMustHave) && !flags.irrelevant) score = Math.min(score, 45);

  let recommendation: Recommendation;
  if (flags.irrelevant) recommendation = 'REJECT';
  else if (score >= understanding.thresholds.interview) recommendation = 'INTERVIEW';
  else if (score >= understanding.thresholds.review) recommendation = 'REVIEW';
  else recommendation = 'REJECT';

  return {
    candidateName: str(raw.candidateName),
    contact,
    facts,
    criterionScores,
    score,
    confidence: (['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'medium') as
      | 'high'
      | 'medium'
      | 'low',
    engine,
    recommendation,
    summary: str(raw.summary) || 'تحلیل این رزومه به‌طور کامل در دسترس نیست.',
    whyCategory: str(raw.whyCategory) || str(raw.summary) || 'این رزومه بر اساس معیارهای شغل سنجیده شد.',
    strengths,
    weaknesses,
    knockoutMisses,
    tags: arr<any>(raw.tags).map((t) => String(t)).slice(0, 6),
    bankSuggested: Boolean(raw.bankSuggested),
    flags,
  };
}

// ---------------- Local keyword-based engine (honestly labeled) ----------------

export function evaluateResumeLocal(
  resumeText: string,
  understanding: JobUnderstanding,
  _answers: ScreeningAnswers,
  fileName: string
): CandidateEvaluation {
  const text = normalizePersianText(resumeText || '');
  // Digit-normalized copy for phone/year/number regexes (resumes often use Persian digits)
  const digitsText = toEnglishDigits(text);
  const lower = text.toLowerCase();
  const lowerDigits = digitsText.toLowerCase();

  // Name: top lines, "نام: ..." pattern
  let candidateName: string | null = null;
  const head = text.slice(0, 400).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of head.slice(0, 6)) {
    const m = line.match(/(?:نام\s*(?:و\s*نام\s*خانوادگی)?|Name)\s*[:\-–]\s*([^\n,;|]{3,40})/i);
    if (m && m[1] && !/رزومه|resume|cv/i.test(m[1])) {
      candidateName = m[1].trim();
      break;
    }
  }
  if (!candidateName && head[0] && head[0].length <= 30 && /^[\u0600-\u06FF\sA-Za-z.]+$/.test(head[0])) {
    candidateName = head[0];
  }

  const phoneMatch = digitsText.match(/(?:\+98|0098|98|0)?9\d{9}/);
  const emailMatch = digitsText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const cityMatch = digitsText.match(/(?:ساکن|محل سکونت|شهر|location)\s*[:\-–]?\s*([\u0600-\u06FF]{2,20})/i);

  const yearsMatch = digitsText.match(/(\d{1,2})\s*(?:سال\s*(?:سابقه|تجربه)|years?\s*(?:of)?\s*experience)/i);
  const years = yearsMatch ? Math.min(40, parseInt(toEnglishDigits(yearsMatch[1]), 10)) : null;

  // Per-criterion scoring via keyword overlap with title tokens
  const stopWords = new Set(['و', 'در', 'با', 'به', 'های', 'سازی', 'کار', 'تجربه', 'دانش', 'تسلط', 'آشنایی', 'بر', 'از', 'این', 'آن']);
  const criterionScores: CriterionScore[] = understanding.criteria.map((c) => {
    const tokens = c.title
      .split(/[\s،,/()]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 2 && !stopWords.has(t));
    const hits = tokens.filter((t) => lower.includes(t.toLowerCase()));
    const ratio = tokens.length ? hits.length / tokens.length : 0;
    const score = Math.round(25 + ratio * 70);
    const quote = hits.length
      ? (() => {
          const idx = lower.indexOf(hits[0].toLowerCase());
          const start = Math.max(0, text.lastIndexOf('.', idx) + 1);
          const end = text.indexOf('.', idx);
          const snippet = text.slice(start, end === -1 ? Math.min(text.length, idx + 80) : end + 1).trim();
          return snippet.slice(0, 120) || `اشاره به ${hits.slice(0, 2).join('، ')} در رزومه`;
        })()
      : 'در رزومه شاهد مشخصی برای این شاخص یافت نشد';
    return {
      criterionId: c.id,
      title: c.title,
      score,
      rationale: hits.length
        ? `اشاره به ${hits.slice(0, 3).join('، ')} در متن رزومه دیده شد.`
        : 'کلیدواژه‌ها و سوابق مرتبط با این شاخص در رزومه مشاهده نشد.',
      evidence: quote,
    };
  });

  const score = Math.round(
    criterionScores.reduce((s, cs) => {
      const c = understanding.criteria.find((x) => x.id === cs.criterionId);
      return s + cs.score * (c?.weight || 0);
    }, 0) / 100
  );

  const strengths: EvidencePoint[] = criterionScores
    .filter((cs) => cs.score >= 55)
    .slice(0, 4)
    .map((cs) => ({ point: `تطابق نسبی در «${cs.title}»`, evidence: cs.evidence, severity: 'minor' as const }));
  const weaknesses: EvidencePoint[] = criterionScores
    .filter((cs) => cs.score < 45)
    .slice(0, 4)
    .map((cs) => ({
      point: `شواهد کافی برای «${cs.title}» یافت نشد`,
      evidence: cs.evidence,
      severity: (understanding.criteria.find((x) => x.id === cs.criterionId)?.mustHave ? 'knockout' : 'minor') as
        | 'knockout'
        | 'minor',
    }));

  const missingMust = criterionScores.some((cs) => {
    const c = understanding.criteria.find((x) => x.id === cs.criterionId);
    return c?.mustHave && cs.score < 35;
  });
  const finalScore = missingMust ? Math.min(score, 45) : Math.max(20, Math.min(score, 90));

  let recommendation: Recommendation = 'REJECT';
  if (finalScore >= understanding.thresholds.interview) recommendation = 'INTERVIEW';
  else if (finalScore >= understanding.thresholds.review) recommendation = 'REVIEW';

  return {
    candidateName,
    contact: {
      phone: phoneMatch ? phoneMatch[0] : null,
      email: emailMatch ? emailMatch[0] : null,
      city: cityMatch ? cityMatch[1] : null,
    },
    facts: {
      yearsExperience: years,
      education: text.match(/(کارشناسی|کاردانی|کارشناسی\s*ارشد|دکتری|دیپلم)[\s\u0600-\u06FF]{0,25}/)?.[0] || null,
      lastRole: head.find((l) => /(کارشناس|مهندس|مدیر|سرپرست|فروشنده|اپراتور|حسابدار|کارگر|تکنسین)/.test(l)) || null,
      skills: [],
      expectedSalary: null,
    },
    criterionScores,
    score: finalScore,
    confidence: 'low',
    engine: 'local',
    recommendation,
    summary: `این ارزیابی با موتور محلی (تطبیق کلیدواژه‌ای و نه هوش مصنوعی) انجام شده؛ امتیاز ${finalScore} بر اساس کلمات کلیدی شاخص‌ها در رزومه است و دقت کمتری دارد.`,
    whyCategory:
      recommendation === 'INTERVIEW'
        ? 'تطابق کلیدواژه‌ای خوبی با شاخص‌های شغل دیده شده (تحلیل محلی، نه هوشمند).'
        : recommendation === 'REVIEW'
        ? 'تطابق نسبی با شاخص‌ها وجود دارد ولی نیاز به چشم انسانی است (تحلیل محلی).'
        : 'شواهد کافی برای تطابق با شاخص‌های شغل در متن پیدا نشد (تحلیل محلی).',
    strengths,
    weaknesses,
    knockoutMisses: weaknesses.filter((w) => w.severity === 'knockout').map((w) => w.point),
    tags: [],
    bankSuggested: false,
    flags: { irrelevant: false, insufficientInfo: false, scannedNoText: false },
  };
}

// ================================================================
// PASS 2 — Relative calibration (top 15 + borderline ±5)
// ================================================================

export async function calibrateV2(
  understanding: JobUnderstanding,
  candidates: Array<{ id: string; name: string; score: number; summary: string }>
): Promise<Record<string, number>> {
  if (candidates.length <= 1) return {};
  const prompt = `تو مسئول کالیبراسیون نهایی نمرات غربالگری هستی تا عدالت نسبی بین کاندیداها برقرار شود.
آستانه مصاحبه: ${understanding.thresholds.interview}، آستانه بررسی: ${understanding.thresholds.review}.
کاندیداها:
${JSON.stringify(candidates.slice(0, 40), null, 2)}

برای هر فرد، نمره تعدیل‌شده (۰ تا ۱۰۰) را بده؛ حداکثر تغییر مثبت یا منفی ۱۰ نمره؛ اگر نمره منصفانه است همان را برگردان.
فقط JSON: { "adjustments": { "id1": 82, "id2": 71 } }`;

  try {
    const raw = await generateWithFallback(prompt, {
      temperature: 0.1,
      timeoutMs: 20_000,
      deadlineMs: 40_000,
    });
    const parsed = cleanAndParseJson<{ adjustments: Record<string, number> }>(raw, { adjustments: {} });
    const out: Record<string, number> = {};
    for (const [id, val] of Object.entries(parsed.adjustments || {})) {
      const orig = candidates.find((c) => c.id === id);
      if (!orig) continue;
      let n = Math.round(Number(val));
      if (!Number.isFinite(n)) continue;
      n = Math.max(0, Math.min(100, Math.max(orig.score - 10, Math.min(orig.score + 10, n))));
      out[id] = n;
    }
    return out;
  } catch (err) {
    console.log('[calibrateV2] skipped (AI busy), keeping original scores.');
    return {};
  }
}

// ================================================================
// Message drafts
// ================================================================

const KIND_TITLES: Record<MessageKind, string> = {
  INTERVIEW_INVITE: 'دعوت به مصاحبه',
  INFO_REQUEST: 'درخواست تکمیل اطلاعات',
  BANK_NOTICE: 'اطلاع نگهداری رزومه در بانک استعداد',
};

export async function draftMessageV2(
  record: Pick<ResumeRecord, 'candidateName' | 'facts' | 'departmentName' | 'tags' | 'strengths' | 'score'>,
  kind: MessageKind
): Promise<DraftMessage> {
  const name = record.candidateName || '[نام کاندید]';
  const fallback = (): DraftMessage => {
    if (kind === 'INTERVIEW_INVITE') {
      return {
        kind,
        subject: 'دعوت به مصاحبه — هلدینگ سیلانه سبز',
        body:
          `سلام ${name} عزیز،\n\n` +
          `رزومه شما برای موقعیت شغلی در واحد ${record.departmentName} هلدینگ سیلانه سبز بررسی شد و با سوابق شما هم‌خوانی خوبی دارد. ` +
          `خوشحال می‌شویم برای یک گفتگوی کوتاه آشَنایی هماهنگ کنیم.\n\n` +
          `زمان پیشنهادی: [زمان]\nمکان: [مکان / لینک]\n\nلطفاً آمادگی و زمان مناسب خود را اعلام بفرمایید.\nبا احترام،\nمنابع انسانی هلدینگ سیلانه سبز`,
      };
    }
    if (kind === 'INFO_REQUEST') {
      return {
        kind,
        subject: 'درخواست تکمیل اطلاعات — هلدینگ سیلانه سبز',
        body:
          `سلام ${name} عزیز،\n\n` +
          `رزومه شما در دست بررسی است؛ برای ارزیابی دقیق‌تر لطفاً موارد زیر را تکمیل و ارسال بفرمایید:\n` +
          `۱. [مورد موردنیاز ۱]\n۲. [مورد موردنیاز ۲]\n\nسپاس‌گزار همکاری شما هستیم.\nمنابع انسانی هلدینگ سیلانه سبز`,
      };
    }
    return {
      kind,
      subject: 'رزومه شما در بانک استعداد سیلانه سبز ذخیره شد',
      body:
        `سلام ${name} عزیز،\n\n` +
        `از ارسال رزومه و علاقه شما به هلدینگ سیلانه سبز سپاسگزاریم. رزومه شما در بانک رزومه‌های ما نگهداری می‌شود و در صورت باز شدن موقعیت متناسب در واحد ${record.departmentName} با شما تماس خواهیم گرفت.\n\nبا احترام،\nمنابع انسانی هلدینگ سیلانه سبز`,
    };
  };

  const prompt = `تو در بخش منابع انسانی هلدینگ تولیدی «سیلانه سبز» کار می‌کنی و می‌خواهی برای یک کاندید پیام کوتاه و مؤدبانه فارسی بنویسی.
نوع پیام: ${KIND_TITLES[kind]}
نام کاندید: ${name}
دپارتمان: ${record.departmentName}
آخرین سمت: ${record.facts?.lastRole || '—'}
سال سابقه: ${record.facts?.yearsExperience ?? '—'}
نقاط قوت استخراج‌شده: ${record.strengths.slice(0, 2).map((s) => s.point).join('؛ ') || '—'}

قواعد:
- لحن گرم، حرفه‌ای و کوتاه (۴ تا ۶ خط)؛ خطاب با نام کاندید و اشاره کوتاه به یک نقطه قوت واقعی.
- در دعوت به مصاحبه، جای [زمان] و [مکان] را خالی بگذار تا کاربر پر کند.
- در درخواست تکمیل اطلاعات، دو جای خالی شماره‌دار برای موارد موردنیاز بگذار.
- هیچ عدد امتیاز یا اصطلاح فنی در متن نباشد.
- خروجی فقط JSON: { "subject": "موضوع کوتاه", "body": "متن کامل با \\n برای خط جدید" }`;

  try {
    const raw = await generateWithFallback(prompt, {
      temperature: 0.4,
      timeoutMs: 15_000,
      deadlineMs: 25_000,
    });
    const parsed = cleanAndParseJson<{ subject?: string; body?: string }>(raw, {});
    if (parsed.body && parsed.body.trim().length > 30) {
      return { kind, subject: parsed.subject?.trim() || KIND_TITLES[kind], body: parsed.body.trim() };
    }
    return fallback();
  } catch {
    return fallback();
  }
}

// ---------------- Stats helper ----------------

export function computeStats(records: ResumeRecord[]): BatchStats {
  const live = records.filter((r) => !r.deleted);
  return {
    total: live.length,
    interview: live.filter((r) => r.category === 'INTERVIEW').length,
    review: live.filter((r) => r.category === 'REVIEW').length,
    reject: live.filter((r) => r.category === 'REJECT').length,
    unjudgeable: live.filter((r) => r.category === 'UNJUDGEABLE').length,
    error: live.filter((r) => r.category === 'ERROR').length,
  };
}
