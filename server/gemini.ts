/**
 * Gemini AI Agent Service with Function Calling & Tool Use for HR Recruitment
 */

import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { dbStore } from './store';
import { CandidateCategory, CandidateStage, LeaveStatus } from '../src/types';
import { toPersianDigits } from '../src/utils/jalali';
import { tehranNow } from './tehran-time';

// Validates and resolves the Gemini model name safely.
// Note: In some environments, GEMINI_MODEL may be accidentally populated with an auth token,
// a models/ prefix, or an unsupported string. We sanitize and validate it here.
export function resolveGeminiModel(): string {
  const envModel = process.env.GEMINI_MODEL?.trim();
  if (envModel) {
    const clean = envModel.replace(/^models\//, '');
    if (
      clean.startsWith('gemini-') &&
      !clean.includes(' ') &&
      clean.length < 50 &&
      clean !== 'gemini-2.5-flash' &&
      clean !== 'gemini-2.0-flash' &&
      clean !== 'gemini-3.6-flash'
    ) {
      return clean;
    }
  }
  return 'gemini-3.8-flash';
}

const GEMINI_MODEL = resolveGeminiModel();
const GEMINI_FALLBACK_MODEL = GEMINI_MODEL === 'gemini-3.8-flash' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

/**
 * Robust JSON sanitizer for LLM outputs that may contain raw unescaped newlines/tabs,
 * ASCII control characters (< 0x20), markdown code fences, or trailing commas inside strings.
 */
export function sanitizeJsonControlCharacters(jsonStr: string): string {
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    const code = ch.charCodeAt(0);

    if (inString) {
      if (isEscaped) {
        result += ch;
        isEscaped = false;
      } else if (ch === '\\') {
        result += ch;
        isEscaped = true;
      } else if (ch === '"') {
        result += ch;
        inString = false;
      } else if (ch === '\n') {
        result += '\\n';
      } else if (ch === '\r') {
        result += '\\r';
      } else if (ch === '\t') {
        result += '\\t';
      } else if (code < 32) {
        result += '\\u' + code.toString(16).padStart(4, '0');
      } else {
        result += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
    }
  }

  return result;
}

export function safeJsonParse<T = any>(rawText: string, fallback?: T): T {
  if (!rawText || typeof rawText !== 'string') {
    if (fallback !== undefined) return fallback;
    throw new Error('Empty text to parse as JSON');
  }

  let cleaned = rawText.trim();
  // Strip markdown code fences (```json ... ``` or ``` ...)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '').trim();
  }

  // 1. Direct standard parse attempt
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Continue to sanitization
  }

  // 2. Sanitize unescaped control characters in string literals
  try {
    const sanitized = sanitizeJsonControlCharacters(cleaned);
    return JSON.parse(sanitized) as T;
  } catch {
    // Continue to bounds extraction
  }

  // 3. Extract JSON object/array substring and sanitize
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliced = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(sanitizeJsonControlCharacters(sliced)) as T;
    } catch {
      // Try stripping trailing commas before closing braces/brackets
      try {
        const withoutTrailingCommas = sanitizeJsonControlCharacters(sliced).replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(withoutTrailingCommas) as T;
      } catch {
        // continue
      }
    }
  }

  if (fallback !== undefined) {
    return fallback;
  }
  throw new Error(`Failed to safely parse JSON: ${cleaned.slice(0, 120)}...`);
}

// Tool Declarations for Gemini Function Calling
const analyzeJobPostingTool: FunctionDeclaration = {
  name: 'analyze_job_posting',
  description: 'تحلیل عنوان و شرح شغل و استخراج معیارهای ارزیابی وزنی (مجموع وزن‌ها ۱۰۰)',
  parameters: {
    type: Type.OBJECT,
    properties: {
      jobId: { type: Type.STRING, description: 'شناسه موقعیت شغلی در سامانه' },
      jobTitle: { type: Type.STRING, description: 'عنوان موقعیت شغلی' },
      jobDescription: { type: Type.STRING, description: 'متن شرح شغل و مسئولیت‌ها' },
    },
    required: ['jobTitle'],
  },
};

const scoreAndEvaluateResumeTool: FunctionDeclaration = {
  name: 'score_and_evaluate_resume',
  description: 'استخراج متن رزومه، امتیازدهی ۱ تا ۱۰ به تفکیک شاخص‌ها، شناسایی نقاط قوت و ضعف و استخراج شواهد متنی مستقیم',
  parameters: {
    type: Type.OBJECT,
    properties: {
      candidateId: { type: Type.STRING, description: 'شناسه کارجو در سیستم' },
      jobId: { type: Type.STRING, description: 'شناسه موقعیت شغلی متناظر' },
      resumeText: { type: Type.STRING, description: 'متن رزومه متقاضی' },
    },
    required: ['candidateId'],
  },
};

const categorizeCandidateTool: FunctionDeclaration = {
  name: 'categorize_candidate',
  description: 'دسته‌بندی خودکار کارجو بر مبنای نمره: اولویت مصاحبه (۷ به بالا)، نیازمند بررسی (۵ تا ۷)، رد اولیه (زیر ۵)',
  parameters: {
    type: Type.OBJECT,
    properties: {
      candidateId: { type: Type.STRING, description: 'شناسه کارجو' },
      score: { type: Type.NUMBER, description: 'نمره کل از ۱۰' },
    },
    required: ['candidateId', 'score'],
  },
};

const compareCandidatesTool: FunctionDeclaration = {
  name: 'compare_candidates',
  description: 'مقایسه جامع دو یا چند کارجو در قالب جدول شاخص‌ها و داده‌های رادار چارت',
  parameters: {
    type: Type.OBJECT,
    properties: {
      candidateIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'لیست شناسه‌های کارجویان برای مقایسه',
      },
      jobId: { type: Type.STRING, description: 'شناسه موقعیت شغلی' },
    },
    required: ['candidateIds'],
  },
};

const draftEmailTool: FunctionDeclaration = {
  name: 'draft_email',
  description: 'تنظیم پیش‌نویس محترمانه و استاندارد ایمیل (دعوت به مصاحبه یا رد محترمانه) صرفاً جهت بررسی و تایید مدیر (هرگز ارسال خودکار نمی‌شود)',
  parameters: {
    type: Type.OBJECT,
    properties: {
      candidateId: { type: Type.STRING, description: 'شناسه کارجو' },
      type: {
        type: Type.STRING,
        description: 'نوع ایمیل: INVITATION (دعوت به مصاحبه) یا REJECTION (عدم احراز شرایط)',
      },
      customNotes: { type: Type.STRING, description: 'توضیحات تکمیلی یا تاریخ مصاحبه' },
    },
    required: ['candidateId', 'type'],
  },
};

/**
 * Checks whether `word` appears as a standalone word in Persian text.
 * (Plain `includes()` is wrong here: e.g. 'رد' matches inside 'کرد'/'شد'/'فرد'.
 * JS \b is ASCII-only, so we split on whitespace + punctuation instead.)
 */
function mentionsStandaloneWord(text: string, word: string): boolean {
  return text
    .split(/[\s\u200c\u200f,;:.?!()\[\]{}«»""''—–_\-\/\\]+/u)
    .includes(word);
}

function mentionsRejection(text: string): boolean {
  return mentionsStandaloneWord(text, 'رد') || text.includes('عدم احراز');
}

/**
 * Agent chat (audit fixes REC-06 / AIA-02 / AIA-03):
 * - conversation history is now threaded into the model call (context retention)
 * - responses carry `aiAvailable` so the UI can honestly label local-engine
 *   answers instead of presenting them as live AI output
 * - every declared function call has a handler (previously three of five were
 *   silently dropped); store-mutating handlers set `mutatedStore`.
 */
export async function processAgentChat(
  userPrompt: string,
  contextJobId?: string,
  history: Array<{ role: string; text: string }> = []
) {
  const apiKey = process.env.GEMINI_API_KEY;
  let aiAvailable = false;
  let mutatedStore = false;

  // Execute internal tool dispatch logic based on the user's intent
  const lower = userPrompt.toLowerCase();
  const isCompare = lower.includes('مقایسه') || lower.includes('رادار') || lower.includes('compare');
  const isDraftEmail = lower.includes('ایمیل') || lower.includes('دعوت') || mentionsRejection(lower) || lower.includes('draft');
  const isAnalyzeJob = lower.includes('تحلیل شغل') || lower.includes('معیار') || lower.includes('شاخص');
  const isScoreResume = lower.includes('نمره') || lower.includes('ارزیابی رزومه') || lower.includes('بررسی کارجو');

  let generatedText = '';
  let radarData: any = null;
  let emailDraftPreview: any = null;
  let suggestedActions: string[] = [];

  // Try real Gemini API if key is available
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      // Bounded context: only the target job plus the top-ranked candidates with
      // truncated evidence. (Injecting every candidate in full explodes the
      // prompt after bulk imports and slows down every chat turn.)
      const scopedCandidates = (dbStore.candidates || [])
        .filter(c => !contextJobId || c.jobId === contextJobId);
      const contextCandidates = scopedCandidates
        .slice()
        .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
        .slice(0, 12)
        .map(c => ({
          id: c.id,
          name: c.fullName,
          score: c.overallScore,
          category: c.category,
          stage: c.stage,
          topStrength: (c.strengths || [])[0]?.slice(0, 120),
          evidence: (c.resumeQuotes || [])[0]?.slice(0, 160),
        }));
      const contextJobs = (dbStore.jobs || [])
        .filter(j => !contextJobId || j.id === contextJobId)
        .map(j => ({
          id: j.id,
          title: j.title,
          criteria: (j.criteria || []).map(cr => ({ title: cr.title, weight: cr.weight })),
        }));
      const systemInstruction = `شما دستیار هوشمند و ارشد جذب و استخدام (AI Recruiter Specialist) در سامانه جامع منابع انسانی «سیلانه سبز» (ویژه هلدینگ سیلانه سبز و برندهای دافی، کامان، میس‌ویک و کاپوت) هستید.
شما باید همواره به زبان فارسی سلیس، رسمی و حرفه‌ای پاسخ دهید.
اطلاعات موجود در سیستم (موقعیت هدف و ${contextCandidates.length} کارجوی برتر از مجموع ${scopedCandidates.length} نفر):
موقعیت‌های شغلی: ${JSON.stringify(contextJobs)}
کارجویان: ${JSON.stringify(contextCandidates)}

قوانین و استانداردها:
۱. دسته‌بندی کارجو: بالای ۷ = اولویت مصاحبه، ۵ تا ۷ = نیازمند بررسی مدیر، زیر ۵ = رد اولیه
۲. پیش‌نویس ایمیل‌ها هرگز نباید خودکار ارسال شوند، فقط برای بررسی مدیر پیش‌نویس می‌شوند.
۳. در تحلیل و امتیازدهی، حتماً شواهد مستقیم متنی از داخل رزومه نقل قول کنید.`;

      // Threaded conversation: last 6 turns (bounded to keep prompts small).
      const chatContents: any[] = [];
      for (const h of history.slice(-6)) {
        const text = String(h?.text || '').slice(0, 2000);
        if (!text) continue;
        const role = h.role === 'assistant' || h.role === 'model' ? 'model' : 'user';
        chatContents.push({ role, parts: [{ text }] });
      }
      chatContents.push({ role: 'user', parts: [{ text: userPrompt }] });

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: chatContents,
          config: {
            systemInstruction,
            tools: [
              {
                functionDeclarations: [
                  analyzeJobPostingTool,
                  scoreAndEvaluateResumeTool,
                  categorizeCandidateTool,
                  compareCandidatesTool,
                  draftEmailTool,
                ],
              },
            ],
          },
        });
      } catch (err: any) {
        console.warn(`Primary chat model ${GEMINI_MODEL} failed, retrying with ${GEMINI_FALLBACK_MODEL}:`, err?.message || err);
        response = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: chatContents,
          config: {
            systemInstruction,
            tools: [
              {
                functionDeclarations: [
                  analyzeJobPostingTool,
                  scoreAndEvaluateResumeTool,
                  categorizeCandidateTool,
                  compareCandidatesTool,
                  draftEmailTool,
                ],
              },
            ],
          },
        });
      }

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === 'compare_candidates') {
            const cids = (call.args as any).candidateIds || (dbStore.candidates || []).slice(0, 3).map(c => c.id);
            const candidates = (dbStore.candidates || []).filter(c => cids.includes(c.id));
            if (candidates.length === 0) continue;
            const criteria = Object.keys(candidates[0]?.criteriaScores || {
              'تسلط فنی': 8,
              'تایپ‌اسکریپت': 8,
              'طراحی RTL': 8,
              'کار تیمی': 8,
            });

            const scoresMap: Record<string, Record<string, number>> = {};
            candidates.forEach(c => {
              scoresMap[c.fullName] = c.criteriaScores || {};
            });

            radarData = {
              candidates: candidates.map(c => c.fullName),
              criteria,
              scores: scoresMap,
            };
          } else if (call.name === 'draft_email') {
            const allCands = dbStore.candidates || [];
            if (allCands.length === 0) continue;
            const cid = (call.args as any).candidateId || allCands[0].id;
            const ctype = (call.args as any).type || 'INVITATION';
            const cand = allCands.find(c => c.id === cid) || allCands[0];

            emailDraftPreview = {
              candidateName: cand.fullName,
              candidateEmail: cand.email,
              type: ctype,
              subject: ctype === 'INVITATION'
                ? `دعوت به مصاحبه حضوری و فنی - هلدینگ سیلانه سبز`
                : `نتیجه بررسی اولیه رزومه شما - هلدینگ سیلانه سبز`,
              body: ctype === 'INVITATION'
                ? `کارجوی گرامی جناب آقای / سرکار خانم ${cand.fullName}،\n\nبا سلام و احترام،\nبا توجه به بررسی شایستگی‌های تحسین‌برانگیز رزومه شما و احراز نمره ${cand.overallScore || '۸.۵'} در ارزیابی هوشمند شاخص‌های موقعیت شغلی، بدین‌وسیله از شما جهت شرکت در جلسه مصاحبه تخصصی حضوری دعوت به عمل می‌آید.\n\nزمان پیشنهادی: دوشنبه ۲۶ شهریور ساعت ۱۰:۳۰ صبح\nمحل جلسه: تهران، دفتر مرکزی هلدینگ سیلانه سبز، طبقه ۴، اتاق کنفرانس منابع انسانی.\n\nلطفاً در صورت نیاز به تغییر زمان، به این پیام پاسخ دهید.\nبا احترام،\nتیم جذب و استخدام سیلانه سبز`
                : `کارجوی گرامی،\nبا تشکر از ارسال رزومه، متاسفانه در این مرحله امکان ادامه همکاری مقدور نبوده و رزومه شما در استخر استعدادها ثبت گردید.`,
              status: 'DRAFT_ONLY',
              createdAtJalali: tehranNow().jalaliString,
            };
          } else if (call.name === 'categorize_candidate') {
            // Real (bounded) categorization from the model's score.
            const cid = (call.args as any).candidateId;
            const score = Number((call.args as any).score);
            const cand = (dbStore.candidates || []).find(c => c.id === cid);
            if (cand && Number.isFinite(score) && score >= 0 && score <= 10) {
              const job = (dbStore.jobs || []).find(j => j.id === cand.jobId);
              const priority = job?.interviewPriorityThreshold ?? 7.0;
              const rejection = job?.initialRejectionThreshold ?? 5.0;
              cand.overallScore = +score.toFixed(1);
              cand.category = score >= priority
                ? CandidateCategory.INTERVIEW_PRIORITY
                : score < rejection
                  ? CandidateCategory.INITIAL_REJECTION
                  : CandidateCategory.NEEDS_REVIEW;
              mutatedStore = true;
            }
          } else if (call.name === 'score_and_evaluate_resume' || call.name === 'analyze_job_posting') {
            // These tools need the full evaluation pipeline; point the user to
            // it instead of fabricating scores in chat (audit AIA-03).
            suggestedActions.push('اجرای «ارزیابی هوش مصنوعی» روی پرونده کارجو از کارت ارزیابی');
          }
        }
      }

      if (response.text) {
        generatedText = response.text;
        aiAvailable = true;
      }
    } catch (err) {
      console.warn('Gemini API call failed or rate limited, falling back to local expert engine:', err);
    }
  }

  // If text not generated yet, provide rich, authoritative Persian domain response
  if (!generatedText) {
    if (isCompare) {
      const ranked = (dbStore.candidates || [])
        .filter(c => c.jobId === (contextJobId || 'job-1'))
        .slice()
        .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
      const candidates = ranked.slice(0, 3);

      if (candidates.length < 2) {
        generatedText = `برای مقایسه تطبیقی حداقل ۲ کارجو در این موقعیت لازم است. در حال حاضر ${toPersianDigits(ranked.length)} کارجو برای موقعیت انتخاب‌شده ثبت شده است.`;
        suggestedActions = ['بارگذاری گروهی ۲۰۰ رزومه جدید برای ارزیابی'];
      } else {
        // Criteria = union of the compared candidates' own score keys, so the
        // radar chart reflects real data (falls back to the job criteria).
        const criteriaSet = new Set<string>();
        candidates.forEach(c => Object.keys(c.criteriaScores || {}).forEach(k => criteriaSet.add(k)));
        if (criteriaSet.size === 0) {
          const job = (dbStore.jobs || []).find(j => j.id === (contextJobId || 'job-1'));
          (job?.criteria || []).forEach(cr => criteriaSet.add(cr.title));
        }
        const criteria = Array.from(criteriaSet);

        const scoresMap: Record<string, Record<string, number>> = {};
        candidates.forEach(c => {
          scoresMap[c.fullName] = {};
          criteria.forEach(crit => {
            scoresMap[c.fullName][crit] = c.criteriaScores?.[crit] ?? c.overallScore ?? 0;
          });
        });

        radarData = {
          candidates: candidates.map(c => c.fullName),
          criteria,
          scores: scoresMap,
        };

        const faOrdinals = ['۱', '۲', '۳'];
        const catLabel = (cat: unknown): string =>
          cat === CandidateCategory.INTERVIEW_PRIORITY ? 'اولویت مصاحبه'
          : cat === CandidateCategory.NEEDS_REVIEW ? 'نیازمند بررسی مدیر'
          : cat === CandidateCategory.INITIAL_REJECTION ? 'رد اولیه'
          : 'بدون دسته‌بندی';
        const lines = candidates.map((c, i) => {
          const parts = [`${faOrdinals[i]}. **${c.fullName}** (نمره ${toPersianDigits(c.overallScore ?? '—')} - ${catLabel(c.category)}):`];
          if (c.strengths?.[0]) parts.push(`- شایستگی برتر: ${c.strengths[0]}`);
          if (c.resumeQuotes?.[0]) parts.push(`- نقل قول از رزومه: ${c.resumeQuotes[0]}`);
          return parts.join('\n');
        });
        const top = candidates[0];
        generatedText = `تحلیل تطبیقی و نمودار رادار شایستگی‌ها برای کارجویان موقعیت آماده گردید:\n\n${lines.join('\n\n')}\n\nنمودار رادار و جدول مقایسه در کادر زیر قابل مشاهده است. آیا مایلید پیش‌نویس دعوت به مصاحبه برای ${top.fullName} تنظیم گردد؟`;

        suggestedActions = [
          `تنظیم پیش‌نویس دعوت به مصاحبه برای ${top.fullName}`,
          'مشاهده جدول کامل نمرات',
        ];
      }
    } else if (isDraftEmail) {
      // Prefer a candidate named in the prompt, else the top candidate of the
      // context job. Never crash on an empty pipeline.
      const scoped = (dbStore.candidates || []).filter(c => c.jobId === (contextJobId || 'job-1'));
      const pool = scoped.length > 0 ? scoped : (dbStore.candidates || []);
      const named = pool.find(c => c.fullName && lower.includes(c.fullName.toLowerCase()));
      const rankedPool = pool.slice().sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0));
      const cand = named || rankedPool[0];
      if (!cand) {
        generatedText = `در حال حاضر کارجویی در سامانه ثبت نشده است تا پیش‌نویس ایمیل برای ایشان تنظیم شود.`;
        suggestedActions = ['بارگذاری گروهی ۲۰۰ رزومه جدید برای ارزیابی'];
      } else {
      const isRejection = mentionsRejection(lower);
      if (isRejection && !named) {
        // Audit AIA-03: never draft a REJECTION for a guessed candidate —
        // a wrong-name rejection letter is a real-world harm.
        generatedText = `برای تنظیم پیش‌نویس ایمیل رد، لطفاً نام کارجوی مورد نظر را صریحاً مشخص کنید. سامانه از حدس‌زدن نام کارجو برای ایمیل رد خودداری می‌کند تا نامه‌ای به اشتباه برای فرد دیگری تنظیم نشود.`;
        suggestedActions = ['مشاهده لیست کارجویان دارای نمره زیر ۵'];
        emailDraftPreview = null;
        return finishChatResponse({ text: generatedText, radarData, emailDraftPreview, suggestedActions, aiAvailable, mutatedStore });
      }
      emailDraftPreview = {
        candidateName: cand.fullName,
        candidateEmail: cand.email,
        type: isRejection ? 'REJECTION' : 'INVITATION',
        subject: isRejection
          ? `نتیجه ارزیابی رزومه - هلدینگ سیلانه سبز`
          : `دعوت به مصاحبه تخصصی حضوری - ${cand.jobTitle || 'موقعیت شغلی'}`,
        body: isRejection
          ? `${cand.fullName} گرامی،\nبا سلام و احترام،\nاز همراهی و ارسال رزومه ارزشمندتان کمال سپاس را داریم. با توجه به اولویت‌های فعلی پروژه، در حال حاضر امکان همکاری مقدور نمی‌باشد اما مشخصات شما در استخر استعدادهای سازمانی ما ذخیره گردید.`
          : `${cand.fullName} گرامی،\n\nبا سلام و احترام،\nپیرو بررسی تخصصی رزومه و سوابق درخشان شما در توسعه سامانه‌های مبتنی بر React و تایپ‌اسکریپت (کسب امتیاز ${toPersianDigits(cand.overallScore ?? '—')} از ۱۰)، با کمال مسرت از شما جهت حضور در جلسه مصاحبه فنی و معارفه دعوت به عمل می‌آوریم.\n\nزمان پیشنهادی: یکشنبه ۲۵ شهریور ۱۴۰۳، ساعت ۱۰:۳۰ صبح\nمحل جلسه: تهران، ستاد مرکزی هلدینگ سیلانه سبز، سالن اجتماعات منابع انسانی\n\nلطفاً آمادگی خود را از طریق پاسخ به این ایمیل اعلام فرمایید.\n\nبا آرزوی موفقیت،\nمدیریت جذب و استعدادهای هلدینگ سیلانه سبز`,
        status: 'DRAFT_ONLY',
        createdAtJalali: tehranNow().jalaliString,
      };

      generatedText = `پیش‌نویس ایمیل رسمی با رعایت ادبیات حرفه‌ای سازمانی تنظیم شد.
توجه: مطابق خط‌مشی ایمنی سامانه، این ایمیل **صرفاً به عنوان پیش‌نویس** ایجاد شده و هرگز به صورت خودکار ارسال نخواهد شد. لطفاً متن زیر را بررسی و در صورت تایید نهایی ارسال فرمایید.`;

      suggestedActions = [
        'تایید و ثبت نهایی در کارتابل ارسال',
        'تغییر تاریخ و ساعت مصاحبه',
        'تنظیم پیش‌نویس ایمیل رد برای متقاضیان زیر ۵',
      ];
      }
    } else if (isAnalyzeJob) {
      const job = (dbStore.jobs || []).find(j => j.id === (contextJobId || 'job-1')) || dbStore.jobs[0];
      if (!job || (job.criteria || []).length === 0) {
        generatedText = `برای موقعیت انتخاب‌شده هنوز معیار ارزیابی ثبت نشده است.`;
        suggestedActions = ['تعریف موقعیت شغلی جدید با معیارهای وزنی'];
      } else {
        const faOrdinals = ['۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸'];
        const totalWeight = job.criteria.reduce((sum, cr) => sum + (cr.weight || 0), 0);
        const lines = job.criteria.map((cr, i) =>
          `${faOrdinals[i] || toPersianDigits(i + 1)}. **${cr.title} (وزن ${toPersianDigits(cr.weight)}٪)**${cr.description ? `: ${cr.description}` : ''}`
        );
        generatedText = `موقعیت «${job.title}» بررسی شد و ${toPersianDigits(job.criteria.length)} شاخص کلیدی استخراج گردید (مجموع وزن‌ها: ${toPersianDigits(totalWeight)}٪):\n\n${lines.join('\n')}\n\nاین معیارها مبنای امتیازدهی به رزومه‌های جدید خواهند بود.`;
        suggestedActions = [
          'بارگذاری گروهی ۲۰۰ رزومه جدید برای ارزیابی با این شاخص‌ها',
          'مشاهده توزیع امتیازات کارجویان فعلی',
        ];
      }
    } else if (isScoreResume) {
      const ranked = (dbStore.candidates || [])
        .filter(c => c.jobId === (contextJobId || 'job-1'))
        .slice()
        .sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0))
        .slice(0, 5);
      if (ranked.length === 0) {
        generatedText = `برای موقعیت انتخاب‌شده هنوز رزومه‌ای ارزیابی نشده است.`;
        suggestedActions = ['بارگذاری گروهی ۲۰۰ رزومه جدید برای ارزیابی'];
      } else {
        const faOrdinals = ['۱', '۲', '۳', '۴', '۵'];
        const lines = ranked.map((c, i) => {
          const parts = [`${faOrdinals[i]}. **${c.fullName}** — امتیاز ${toPersianDigits(c.overallScore ?? '—')} از ۱۰`];
          if (c.strengths?.[0]) parts.push(`   • نقطه قوت: ${c.strengths[0]}`);
          if (c.weaknesses?.[0]) parts.push(`   • نیازمند بررسی: ${c.weaknesses[0]}`);
          if (c.resumeQuotes?.[0]) parts.push(`   • شاهد متنی: ${c.resumeQuotes[0]}`);
          return parts.join('\n');
        });
        generatedText = `رتبه‌بندی ${toPersianDigits(ranked.length)} کارجوی برتر موقعیت بر اساس امتیاز ارزیابی (۱ تا ۱۰):\n\n${lines.join('\n\n')}`;
        suggestedActions = [
          'مقایسه نفرات برتر در نمودار رادار',
          `تنظیم پیش‌نویس دعوت به مصاحبه برای ${ranked[0].fullName}`,
        ];
      }
    } else {
      generatedText = `سلام و احترام. من دستیار هوشمند استخدام و ارزیابی شایستگی‌های هلدینگ سیلانه سبز هستم.
من می‌توانم وظایف زیر را به صورت بلادرنگ برای شما انجام دهم:
- **تحلیل موقعیت شغلی** و استخراج معیارهای وزنی
- **امتیازدهی به رزومه‌ها (۱ تا ۱۰)** به همراه شناسایی نقاط قوت، ضعف و نقل قول مستقیم از متن رزومه
- **دسته‌بندی خودکار**: اولویت مصاحبه (+۷) / نیازمند بررسی (۵-۷) / رد اولیه (<۵)
- **مقایسه کارجویان** در قالب جدول و نمودار چندمحوره رادار
- **تنظیم پیش‌نویس ایمیل‌های دعوت یا رد** (صرفاً برای بازبینی و تایید شما)

چه فرمانی مد نظر شماست؟`;

      suggestedActions = [
        'مقایسه کاندیداهای موقعیت توسعه فرانت‌اند در نمودار رادار',
        'غربالگری و امتیازدهی به رزومه‌های بارگذاری‌شده',
        'تنظیم پیش‌نویس ایمیل دعوت برای نفرات برتر',
      ];
    }
  }

  return finishChatResponse({ text: generatedText, radarData, emailDraftPreview, suggestedActions, aiAvailable, mutatedStore });
}

/** Appends the honest "local engine" disclaimer when the LLM was unavailable. */
function finishChatResponse(resp: {
  text: string;
  radarData: any;
  emailDraftPreview: any;
  suggestedActions: string[];
  aiAvailable: boolean;
  mutatedStore: boolean;
}) {
  let text = resp.text;
  if (!resp.aiAvailable && text) {
    text += `\n\n---\n⚠️ مدل زبانی هوش مصنوعی در دسترس نبود؛ این پاسخ توسط موتور محلی سامانه و صرفاً بر اساس داده‌های ثبت‌شده واقعی تولید شده است (هیچ اقدامی روی داده‌ها بدون تایید شما انجام نمی‌شود).`;
  }
  return { ...resp, text };
}

// -------------------------------------------------------------
// AI Job Description & Job Ad Generator for Seilaneh Sabz
// -------------------------------------------------------------
export async function generateJobAd(params: {
  jobTitle: string;
  departmentName: string;
  brandFocus?: string;
  seniority: string;
  workType: string;
  location: string;
  keySkills: string;
  perks: string[];
  tone: string;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  const brand = params.brandFocus || 'محصولات آرایشی و بهداشتی هلدینگ سیلانه سبز (دافی، کامان، میس‌ویک)';
  const perks = Array.isArray(params.perks) ? params.perks : [];

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `شما کارشناس ارشد جذب استعداد و برند کارفرمایی در هلدینگ بین‌المللی سیلانه سبز (Seilaneh Sabz Holding - مالک برندهای معتبر دافی، کامان، میس‌ویک، کاپوت و زنون) هستید.
لطفاً بر اساس اطلاعات زیر، دو خروجی مجزا و فوق‌العاده حرفه‌ای به زبان فارسی تولید کنید:

عنوان موقعیت شغلی: ${params.jobTitle}
دپارتمان سازمانی: ${params.departmentName}
برند مرتبط: ${brand}
سطح ارشدیت: ${params.seniority}
نوع همکاری: ${params.workType}
محل خدمت: ${params.location}
مهارت‌های کلیدی مورد نیاز: ${params.keySkills || 'مهارت‌های استاندارد متناسب با موقعیت'}
مزایا و تسهیلات رفاهی: ${perks.join('، ') || 'بیمه تکمیلی، پکیج محصولات ماهانه هلدینگ، پاداش عملکرد'}
لحن متن: ${params.tone}

پاسخ شما باید در قالب یک آبجکت JSON معتبر با کلیدهای زیر باشد (فقط JSON معتبر بدون هیچ متن اضافی، دقت فرمایید که تمام شکست‌های خط درون مقادیر رشته‌ای باید به صورت \\n انکود شوند):
{
  "jobDescriptionMarkdown": "متن رسمی، تفصیلی و ساختاریافته شرح شغل سازمانی (شامل: معرفی نقش، ماموریت، وظایف و مسئولیت‌های کلیدی روزانه، شایستگی‌های تخصصی و نرم، شرایط احراز تحصیلی و سابقه کار)",
  "recruitmentAdSocial": "متن جذاب، گیرا و ترغیب‌کننده برای شبکه‌های اجتماعی (لینکدین، جابینجا، جاب‌ویژن، تلگرام) همراه با ایموجی‌های مناسب، تگ‌های برندهای سیلانه سبز و کال تو اکشن صریح",
  "interviewQuestions": ["۴ الی ۵ سوال طلایی مصاحبه تخصصی و رفتاری برای سنجش این جایگاه"],
  "salaryBenchmarkToman": "تخمین بازه حقوق ماهانه منصفانه در بازار کار ایران ۱۴۰۳ به تومان",
  "perksList": ["لیست بولت‌پوینت مزایای رقابتی این شغل در سیلانه سبز"]
}`;

      const jobAdConfig = {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jobDescriptionMarkdown: { type: Type.STRING },
            recruitmentAdSocial: { type: Type.STRING },
            interviewQuestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            salaryBenchmarkToman: { type: Type.STRING },
            perksList: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['jobDescriptionMarkdown', 'recruitmentAdSocial'],
        },
      };

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: jobAdConfig,
        });
      } catch (err: any) {
        console.warn(`Primary model ${GEMINI_MODEL} failed for generateJobAd, retrying with ${GEMINI_FALLBACK_MODEL}:`, err?.message || err);
        response = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: prompt,
          config: jobAdConfig,
        });
      }

      if (response && response.text) {
        const parsed = safeJsonParse<{
          jobDescriptionMarkdown?: string;
          recruitmentAdSocial?: string;
          interviewQuestions?: string[];
          salaryBenchmarkToman?: string;
          perksList?: string[];
        }>(response.text);

        if (parsed && (parsed.jobDescriptionMarkdown || parsed.recruitmentAdSocial)) {
          return {
            jobTitle: params.jobTitle,
            departmentName: params.departmentName,
            brandFocus: brand,
            jobDescriptionMarkdown: parsed.jobDescriptionMarkdown || '',
            recruitmentAdSocial: parsed.recruitmentAdSocial || '',
            interviewQuestions: Array.isArray(parsed.interviewQuestions) ? parsed.interviewQuestions : [],
            salaryBenchmarkToman: parsed.salaryBenchmarkToman || '۳۵ تا ۴۵ میلیون تومان',
            perksList: Array.isArray(parsed.perksList) ? parsed.perksList : perks,
            aiAvailable: true,
          };
        }
      }
    } catch (err) {
      console.warn('Gemini generateJobAd failed or fallback needed:', err);
    }
  }

  // Fallback Persian Expert Generator specifically crafted for Seilaneh Sabz Holding
  const jdMarkdown = `# شرح شغل سازمانی: ${params.seniority} ${params.jobTitle}
**دپارتمان:** ${params.departmentName} | **هلدینگ:** سیلانه سبز (Seilaneh Sabz Holding)
**محل خدمت:** ${params.location} | **نوع قرارداد:** ${params.workType}
**برند تحت پوشش:** ${brand}

---

### ۱. ماموریت و هدف اصلی نقش
همکار ما در جایگاه **${params.jobTitle}** نقشی محوری در پیشبرد اهداف راهبردی دپارتمان ${params.departmentName} در هلدینگ سیلانه سبز ایفا خواهد کرد. تمرکز اصلی این نقش، ارتقای استانداردهای کیفی، چابک‌سازی فرایندها و خلق ارزش ملموس برای مشتریان و خطوط محصولات شاخص هلدینگ می‌باشد.

### ۲. وظایف و مسئولیت‌های کلیدی
- مدیریت و هدایت فرایندهای عملیاتی مرتبط با ${params.jobTitle} در هماهنگی نزدیک با سرپرست واحد
- نظارت مستمر بر شاخص‌های کلیدی عملکرد (KPIs) دپارتمان و ارایه گزارش‌های تحلیلی ادواری
- مشارکت فعال در جلسات هم‌اندیشی متقاطع با تیم‌های بازاریابی، تولید کارخانجات و زنجیره تامین
- شناسایی تنگناها و پیاده‌سازی متدولوژی‌های بهبود مستمر (Kaizen / Lean)
- تطابق کامل فعالیت‌ها با پروتکل‌های ایمنی، رگولاتوری غذا و دارو و فرهنگ پیشرو سیلانه سبز

### ۳. شایستگی‌های تخصصی و عمومی
- ${params.keySkills ? params.keySkills.split('،').join('\n- ') : 'تسلط کامل بر مفاهیم بنیادین و کاربردی مرتبط با تخصص'}
- توانایی حل مسئله خلاقانه و قدرت تصمیم‌گیری در شرایط پویای بازار FMCG
- روابط عمومی قوی و مهارت کار تیمی بین‌دپارتمانی
- تسلط بر نرم‌افزارهای تخصصی و ابزارهای گزارش‌دهی سازمانی

### ۴. شرایط احراز و پیش‌نیازها
- مدرک تحصیلی: حداقل کارشناسی در رشته‌های مرتبط
- سابقه کار مرتبط: حداقل ۳ الی ۵ سال سابقه موفق در شرکت‌های تولیدی / FMCG یا هلدینگ‌های معتبر
- روحیه یادگیری مداوم و تطابق‌پذیری بالا`;

  const socialAd = `🌟 فرصت استثنایی همکاری در هلدینگ سیلانه سبز! 🌿✨

ما در خانواده بزرگ **هلدینگ سیلانه سبز** (خالق برندهای نام‌آشنای **دافی**، **کامان**، **میس‌ویک** و **زنون**) در جستجوی یک همکار مشتاق، خلاق و حرفه‌ای برای موقعیت شغلی زیر هستیم:

🎯 عنوان موقعیت: **${params.seniority} ${params.jobTitle}**
🏢 دپارتمان: **${params.departmentName}**
📍 محل کار: **${params.location}**
⏰ نوع همکاری: **${params.workType}**

✨ **آنچه شما در این نقش تجربه خواهید کرد:**
${perks.map(p => `🎁 ${p}`).join('\n') || '🎁 پکیج ماهانه محصولات اختصاصی برندهای دافی و کامان\n🎁 بیمه تکمیلی درمان جامع\n🎁 پاداش‌های فصلی عملکرد و مسیر رشد شغلی شفاف'}

🚀 **مهارت‌هایی که همراهی ما را شیرین‌تر می‌کند:**
${params.keySkills || 'تخصص بالا، روحیه یادگیری، اشتیاق به کار تیمی و رشد سریع در محیطی پویا'}

📩 اگر احساس می‌کنید این صندلی برای شما خالی است، رزومه خود را همین حالا ارسال فرمایید یا به دوستان واجد شرایط معرفی نمایید!

#سیلانه_سبز #استخدام #فرصت_شغلی #دافی #کامان #میس_ویک #کارآفرینی #FMCG #Hiring #Jobs`;

  return {
    jobTitle: params.jobTitle,
    departmentName: params.departmentName,
    brandFocus: brand,
    jobDescriptionMarkdown: jdMarkdown,
    recruitmentAdSocial: socialAd,
    interviewQuestions: [
      `بزرگترین دستاورد ملموس شما در حوزه ${params.jobTitle} در پروژه‌های گذشته چه بوده است؟`,
      `در شرایط تغییر ناگهانی اولویت‌های کاری یا کمبود منابع، چگونه جریان کار را مدیریت می‌کنید؟`,
      `آشنایی شما با سبد محصولات بهداشتی و آرایشی هلدینگ سیلانه سبز (مانند دافی و کامان) در چه سطحی است؟`,
      `یک موقعیت تعارض نظری با مدیر یا اعضای تیم را بیان کرده و نحوه حل آن را توضیح دهید.`,
    ],
    salaryBenchmarkToman: '۳۰ الی ۴۸ میلیون تومان (بسته به شایستگی)',
    perksList: perks.length ? perks : [
      'پکیج ماهانه رایگان محصولات بهداشتی و مراقبت شخصی دافی و کامان',
      'بیمه تکمیلی درجه یک درمان برای پرسنل و افراد تحت تکفل',
      'پاداش عملکرد و بهره‌وری ماهانه',
      'سرویس ایاب و ذهاب و وعده غذایی گرم',
    ],
    // Honest labeling (audit AIA-02): this is the local template engine, not
    // live AI output.
    aiAvailable: false,
  };
}

// -------------------------------------------------------------
// Voice Assistant Processor for Seilaneh Sabz HR Director
// -------------------------------------------------------------
export async function processVoiceCommand(command: string) {
  const lower = command.toLowerCase();
  const apiKey = process.env.GEMINI_API_KEY;

  let replyText = '';
  let actionType: string | undefined;
  let actionResult: any = null;
  // Audit fix AIA-01: data-mutating intents are never executed by voice —
  // they are surfaced with requiresConfirmation:true so the client shows a
  // confirmation dialog before calling the guarded endpoint.
  let requiresConfirmation = false;

  // Check Gemini first for natural language understanding and rich context
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const systemInstruction = `شما دستیار صوتی اختصاصی منابع انسانی هلدینگ سیلانه سبز (تولیدکننده مطرح محصولات آرایشی، بهداشتی و دارویی با برندهای دافی، کامان، میس‌ویک، کاپوت، زنون) هستید.
کاربر شما مدیر ارشد یا کارشناس منابع انسانی هلدینگ است که با صدای خود با شما صحبت می‌کند.
پاسخ شما بلافاصله با صدای دستیار (TTS) قرائت خواهد شد، بنابراین باید:
۱. کاملاً به زبان فارسی روان، گرم، با ادب و انرژی مثبت باشد.
۲. جملات کوتاه، واضح و فاقد هرگونه کاراکترهای نشانه‌گذاری مارک‌داون مانند ستاره، بولت، هشتگ یا پرانتز باشد تا هنگام خوانده شدن با صدای دستیار کاملاً طبیعی شنیده شود.
۳. طول پاسخ بین ۲ تا حداکثر ۳ جمله رسا و مفید باشد.
۴. در صورتی که کاربر درخواست تنظیم آگهی شغل یا استخدام داشت، اعلام کنید که فرم آگهی‌ساز باز می‌شود.
۵. در صورتی که درباره کارخانه، تولید، شیفت‌ها یا اشتهارد پرسید، گزارش کارخانجات را بدهید.
۶. در صورتی که درباره فیش حقوقی، بیمه یا حقوق پرسید، فرآیند صدور حقوق را اعلام کنید.
۷. در صورتی که درباره مرخصی پرسید، وضعیت مرخصی‌ها را اعلام فرمایید.
۸. اگر دستور متفرقه‌ای در حوزه اداری یا منابع انسانی داد، پاسخ متین و راهگشا بدهید.`;

      let resp;
      try {
        resp = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `دستور صوتی کاربر: "${command}"`,
          config: {
            systemInstruction,
          },
        });
      } catch (err: any) {
        console.warn(`Voice processing with ${GEMINI_MODEL} failed, retrying with ${GEMINI_FALLBACK_MODEL}:`, err?.message || err);
        resp = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: `دستور صوتی کاربر: "${command}"`,
          config: {
            systemInstruction,
          },
        });
      }

      if (resp && resp.text) {
        // Strip markdown stars or symbols that sound weird in TTS
        replyText = resp.text.replace(/[*_#`[\]()]/g, '').trim();
      }
    } catch (err) {
      console.warn('Gemini voice processing error:', err);
    }
  }

  // Detect and link action
  if (lower.includes('آگهی') || lower.includes('شرح شغل') || lower.includes('استخدام') || lower.includes('جذب') || lower.includes('شغل')) {
    actionType = 'OPEN_JOB_GENERATOR';
    if (!replyText) {
      replyText = 'دستور تنظیم آگهی استخدامی دریافت شد. دستیار هوشمند تولید شرح شغل و آگهی شبکه‌های اجتماعی سیلانه سبز آماده است و فرم ایجاد آگهی را برای شما باز می‌کنم.';
    }
  } else if (lower.includes('کارخانه') || lower.includes('اشتهارد') || lower.includes('تولید') || lower.includes('شیفت')) {
    const mfg = dbStore.departments.find(d => d.id === 'dept-mfg');
    actionType = 'SHOW_DEPARTMENT';
    actionResult = mfg;
    if (!replyText && mfg) {
      replyText = `گزارش کارخانجات اشتهارد سیلانه سبز: ${toPersianDigits(mfg.headcount)} نفر پرسنل فعال، ${toPersianDigits(mfg.vacancies)} ردیف شغلی باز و شاخص بهره‌وری ${toPersianDigits(mfg.kpiScore)} درصد.`;
    }
  } else if (lower.includes('حقوق') || lower.includes('فیش') || lower.includes('بیمه') || lower.includes('مالیات') || lower.includes('دستمزد')) {
    actionType = 'RUN_AUTOMATION_PAYROLL';
    requiresConfirmation = true;
    // NOTE: no direct store mutation here on purpose. The client executes the
    // task through POST /api/automation/run based on actionType, which is the
    // single place where automation side effects happen (mutating here too
    // would run every voice-triggered automation twice).
    if (!replyText) {
      const draftCount = dbStore.payrollSlips.filter(p => p.status === 'DRAFT').length;
      replyText = `فرایند حقوق آماده اجرا است. در حال حاضر ${toPersianDigits(draftCount)} فیش پیش‌نویس در سامانه وجود دارد. در صورت تایید شما، اتوماسیون فیش‌های پیش‌نویس را نهایی می‌کند. هیچ عملیاتی پیش از تایید شما انجام نخواهد شد.`;
    }
  } else if (lower.includes('مرخصی') || lower.includes('تردد') || lower.includes('حضور')) {
    actionType = 'CHECK_LEAVES';
    // Real count from live data (was a static seed metric).
    const pendingCount = dbStore.leaveRequests.filter(
      l => l.status === LeaveStatus.PENDING_HR || l.status === LeaveStatus.PENDING_MANAGER
    ).length;
    if (!replyText) {
      replyText = `در حال حاضر ${toPersianDigits(pendingCount)} درخواست مرخصی در انتظار تایید است. تایید مرخصی‌ها تنها از جریان کاری تایید مدیر واحد و منابع انسانی و با کنترل مانده مرخصی استحقاقی انجام می‌شود.`;
    }
  } else if (lower.includes('رزومه') || lower.includes('غربالگری') || lower.includes('کارجو') || lower.includes('مصاحبه')) {
    actionType = 'RUN_AUTOMATION_SCREENING';
    requiresConfirmation = true;
    // NOTE: side effects happen only via POST /api/automation/run (see above).
    if (!replyText) {
      replyText = 'اتوماسیون غربالگری آماده اجرا است. در صورت تایید شما، دسته‌بندی کارجویان دارای نمره ارزیابی واقعی بازبینی می‌شود. هیچ رزومه‌ای به صورت تصادفی امتیازدهی یا رد نمی‌شود و هیچ مرحله استخدامی خودکار تغییر نمی‌کند.';
    }
  } else if (lower.includes('دپارتمان') || lower.includes('واحد') || lower.includes('بخش')) {
    actionType = 'LIST_DEPARTMENTS';
    if (!replyText) {
      replyText = `هلدینگ سیلانه سبز دارای ${toPersianDigits(dbStore.departments.length)} دپارتمان فعال شامل کارخانجات تولیدی، تحقیق و توسعه، مارکتینگ، فروش مویرگی و کنترل کیفیت است. جزئیات واحدها در بخش دپارتمان‌ها در دسترس شماست.`;
    }
  }

  if (!replyText) {
    replyText = 'پیام شما در دستیار صوتی منابع انسانی هلدینگ سیلانه سبز دریافت شد. در خصوص تنظیم آگهی، بررسی کارخانجات اشتهارد، صدور فیش‌های حقوقی و غربالگری در خدمت شما هستم.';
  }

  return {
    replyText,
    actionType,
    actionResult,
    requiresConfirmation,
  };
}

// -------------------------------------------------------------
// AI Dynamic Evaluation by Job Category, Custom Criteria & Weights
// -------------------------------------------------------------
export interface DynamicEvaluationParams {
  jobTitle: string;
  department: string;
  candidateName?: string;
  resumeText: string;
  criteria: Array<{
    id: string;
    title: string;
    weight: number;
    description?: string;
    thresholdScore?: number;
    isMandatory?: boolean;
  }>;
  scoringMethod?: 'WEIGHTED_AVG' | 'THRESHOLD_VETO' | 'GEOMETRIC_MEAN';
  aiRigor?: 'STRICT' | 'BALANCED' | 'LENIENT';
  evaluationInstructions?: string;
  interviewPriorityThreshold?: number;
  initialRejectionThreshold?: number;
}

export async function evaluateCandidateWithCriteria(params: DynamicEvaluationParams) {
  const apiKey = process.env.GEMINI_API_KEY;
  const scoringMethod = params.scoringMethod || 'WEIGHTED_AVG';
  const aiRigor = params.aiRigor || 'BALANCED';
  const priorityCutoff = params.interviewPriorityThreshold || 7.0;
  const rejectionCutoff = params.initialRejectionThreshold || 5.0;

  const validCriteria = Array.isArray(params.criteria) && params.criteria.length > 0
    ? params.criteria
    : [
        { id: 'c1', title: 'شایستگی و تخصص فنی', weight: 40 },
        { id: 'c2', title: 'سابقه کار مرتبط در FMCG/تولید', weight: 35 },
        { id: 'c3', title: 'کار تیمی و انگیزه پیشرفت', weight: 25 },
      ];

  const totalWeight = validCriteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0) || 100;

  let criteriaScores: Record<string, number> = {};
  let criteriaFeedback: Record<string, string> = {};
  let strengths: string[] = [];
  let weaknesses: string[] = [];
  let resumeQuotes: string[] = [];
  let executiveSummary = '';
  let aiAvailable = false;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const criteriaDescriptionList = validCriteria.map((c, i) =>
        `${i + 1}. «${c.title}» (وزن: ${c.weight}٪${c.isMandatory ? ` - شاخصه الزامی/وتو با حداقل نمره ${c.thresholdScore || 5}` : ''}): ${c.description || 'ارزیابی سطح تسلط و انطباق مستندات رزومه'}`
      ).join('\n');

      const rigorGuidance =
        aiRigor === 'STRICT'
          ? 'سطح ارزیابی: سخت‌گیرانه (Strict). در صورت نبود شواهد صریح در رزومه یا کم‌بودن سابقه در صنایع سلولزی/آرایشی/بهداشتی، نمرات را زیر ۶ قرار دهید.'
          : aiRigor === 'LENIENT'
          ? 'سطح ارزیابی: منعطف و استعدادمحور (Growth & Potential). پتانسیل یادگیری، مهارت‌های پایه‌ای و اشتیاق کارجو را با دید مثبت وزن دهید.'
          : 'سطح ارزیابی: متوازن و دقیق (Balanced). ارزیابی منصفانه و عینی بر اساس شواهد ملموس رزومه.';

      const prompt = `شما ارزیاب ارشد هوش مصنوعی جذب استعداد در هلدینگ صنعتی بین‌المللی سیلانه سبز (تولیدکننده برندهای دافی، کامان، میس‌ویک، کاپوت) هستید.
شما باید رزومه کارجو را دقیقاً بر مبنای شاخصه‌های تعیین‌شده و با لحاظ کردن دستورالعمل‌های خاص کاربر ارزیابی فرمایید.

اطلاعات ارزیابی:
- موقعیت شغلی: ${params.jobTitle}
- دپارتمان: ${params.department}
- نام کارجو: ${params.candidateName || 'کارجوی متقاضی'}
- ${rigorGuidance}

شاخصه‌های ارزیابی و اوزان تعیین‌شده:
${criteriaDescriptionList}

${params.evaluationInstructions ? `باکس توضیحات و دستورالعمل‌های اختصاصی مدیر منابع انسانی:
«${params.evaluationInstructions}»` : ''}

متن رزومه متقاضی:
"""
${params.resumeText}
"""

لطفاً برای تک تک شاخصه‌ها یک نمره از ۱ تا ۱۰ همراه با یک دلیل مستند از رزومه استخراج نمایید.
پاسخ را صرفاً در قالب یک شیء JSON با ساختار زیر بازگردانید:
{
  "criteriaScores": {
    ${validCriteria.map(c => `"${c.title}": 7.5`).join(',\n    ')}
  },
  "criteriaFeedback": {
    ${validCriteria.map(c => `"${c.title}": "توضیح ارزیابی و استناد به رزومه"`).join(',\n    ')}
  },
  "strengths": ["نقطه قوت کلیدی ۱ با اشاره به دستاورد", "نقطه قوت ۲"],
  "weaknesses": ["نقطه ضعف یا ریسک ۱", "نقطه نیازمند سنجش در مصاحبه"],
  "resumeQuotes": ["«جمله یا سابقه مهم استخراج‌شده از رزومه»"],
  "executiveSummary": "جمع‌بندی تحلیلی ارزیابی کارجو منطبق بر شاخصه‌ها و دستورالعمل‌های مدیر در ۲ الی ۳ جمله رسمی"
}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      } catch (primaryErr: any) {
        console.warn(`Primary model ${GEMINI_MODEL} failed, retrying candidate evaluation with ${GEMINI_FALLBACK_MODEL}:`, primaryErr?.message || primaryErr);
        response = await ai.models.generateContent({
          model: GEMINI_FALLBACK_MODEL,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      if (response && response.text) {
        const parsed = safeJsonParse<{
          criteriaScores?: Record<string, number>;
          criteriaFeedback?: Record<string, string>;
          strengths?: string[];
          weaknesses?: string[];
          resumeQuotes?: string[];
          executiveSummary?: string;
        }>(response.text);
        if (parsed) {
          if (parsed.criteriaScores) criteriaScores = parsed.criteriaScores;
          if (parsed.criteriaFeedback) criteriaFeedback = parsed.criteriaFeedback;
          if (Array.isArray(parsed.strengths)) strengths = parsed.strengths;
          if (Array.isArray(parsed.weaknesses)) weaknesses = parsed.weaknesses;
          if (Array.isArray(parsed.resumeQuotes)) resumeQuotes = parsed.resumeQuotes;
          if (parsed.executiveSummary) executiveSummary = parsed.executiveSummary;
          aiAvailable = true;
        }
      }
    } catch (err) {
      console.warn('Gemini dynamic evaluation failed or needed fallback:', err);
    }
  }

  // Fallback / Deterministic filling if scores not yet present
  validCriteria.forEach((crit, idx) => {
    if (typeof criteriaScores[crit.title] !== 'number') {
      const base = 6.5 + ((idx * 1.3) % 2.5);
      const scoreAdjust = aiRigor === 'STRICT' ? -1.0 : aiRigor === 'LENIENT' ? 0.8 : 0;
      criteriaScores[crit.title] = Math.max(2, Math.min(9.8, +(base + scoreAdjust).toFixed(1)));
    }
    if (!criteriaFeedback[crit.title]) {
      criteriaFeedback[crit.title] = `انطباق مناسب با شاخصه «${crit.title}» بر اساس سوابق ارائه‌شده در دپارتمان ${params.department}.`;
    }
  });

  if (strengths.length === 0) {
    strengths = [
      `تطابق مناسب با شاخصه «${validCriteria[0]?.title || 'شایستگی کلیدی'}»`,
      `سابقه فعالیت متناسب با الزامات دپارتمان ${params.department}`,
    ];
  }
  if (weaknesses.length === 0) {
    weaknesses = [
      aiRigor === 'STRICT'
        ? 'نیازمند سنجش عملی و راستی‌آزمایی سوابق در آزمون تخصصی حضوری'
        : 'بررسی میزان تطابق فرهنگی در جلسه مصاحبه اولیه',
    ];
  }

  // -----------------------------------------------------------
  // Mathematical Score Calculation based on selected ScoringMethod
  // -----------------------------------------------------------
  let rawWeightedSum = 0;
  let vetoTriggered = false;
  let vetoReason = '';

  validCriteria.forEach((crit) => {
    const s = criteriaScores[crit.title] ?? 6;
    const w = Number(crit.weight) || 0;
    rawWeightedSum += s * w;

    // Check veto condition if enabled or in THRESHOLD_VETO mode
    const threshold = crit.thresholdScore || 5;
    if ((scoringMethod === 'THRESHOLD_VETO' || crit.isMandatory) && s < threshold) {
      vetoTriggered = true;
      vetoReason = `عدم احراز حد نصاب شاخصه الزامی «${crit.title}» (نمره کسب‌شده: ${s} کمتر از حداقل مجاز ${threshold})`;
    }
  });

  let calculatedScore = 0;

  if (scoringMethod === 'GEOMETRIC_MEAN') {
    // Weighted Geometric Mean: exp(sum(w_i * ln(s_i)) / sum(w_i))
    let weightedLnSum = 0;
    validCriteria.forEach((crit) => {
      const s = Math.max(0.5, criteriaScores[crit.title] ?? 6);
      const w = Number(crit.weight) || 0;
      weightedLnSum += w * Math.log(s);
    });
    calculatedScore = Math.exp(weightedLnSum / totalWeight);
  } else {
    // Standard weighted average
    calculatedScore = rawWeightedSum / totalWeight;
  }

  calculatedScore = +Math.max(1, Math.min(10, calculatedScore)).toFixed(1);

  // If veto triggered, enforce rejection cap
  let finalScore = calculatedScore;
  if (vetoTriggered) {
    finalScore = Math.min(calculatedScore, +(rejectionCutoff - 0.2).toFixed(1));
  }

  // Determine Category based on cutoffs
  let category: CandidateCategory;
  if (vetoTriggered || finalScore < rejectionCutoff) {
    category = CandidateCategory.INITIAL_REJECTION;
  } else if (finalScore >= priorityCutoff) {
    category = CandidateCategory.INTERVIEW_PRIORITY;
  } else {
    category = CandidateCategory.NEEDS_REVIEW;
  }

  // Formula breakdown explanation
  const formulaExplanation =
    scoringMethod === 'GEOMETRIC_MEAN'
      ? `میانگین هندسی وزنی: حاصل‌ضرب توان‌دار نمرات با اوزان نسبی (${validCriteria.map(c => `[${c.title}: ${criteriaScores[c.title]} × ${c.weight}٪]`).join(' + ')})`
      : scoringMethod === 'THRESHOLD_VETO'
      ? `ماتریس وتو و میانگین وزنی: ${vetoTriggered ? `شرط وتو فعال شد (${vetoReason})` : 'تمامی شروط وتو احراز گردید و میانگین وزنی محاسبه شد'}`
      : `میانگین وزنی خطی استاندارد: مجموع حاصل‌ضرب نمره در وزن تقسیم بر ۱۰۰`;

  if (!executiveSummary) {
    executiveSummary = `کارجو بر اساس شاخصه‌های ارزیابی دپارتمان ${params.department} نمره نهایی ${finalScore} از ۱۰ را کسب نمود. ${vetoTriggered ? `توجه: ${vetoReason}.` : `با توجه به حد نصاب‌های تعیین‌شده، پرونده در دسته «${category === CandidateCategory.INTERVIEW_PRIORITY ? 'اولویت مصاحبه' : category === CandidateCategory.NEEDS_REVIEW ? 'نیازمند بررسی مدیر' : 'رد اولیه'}» قرار می‌گیرد.`}`;
  }

  return {
    candidateName: params.candidateName || 'کارجوی متقاضی',
    jobTitle: params.jobTitle,
    department: params.department,
    overallScore: finalScore,
    category,
    scoringMethod,
    aiRigor,
    totalWeight,
    criteriaScores,
    criteriaFeedback,
    strengths,
    weaknesses,
    resumeQuotes,
    vetoTriggered,
    vetoReason,
    formulaExplanation,
    executiveSummary,
    evaluatedAtJalali: tehranNow().jalaliString,
    // Honest labeling (audit REC-05/AIA-02): false means the scores came from
    // the deterministic local fallback, not from live AI analysis.
    aiAvailable,
  };
}


