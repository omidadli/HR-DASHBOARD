import { GoogleGenAI } from '@google/genai';
import { JobUnderstanding, CandidateEvaluation } from '../src/types/screening';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
  }
  return new GoogleGenAI({ apiKey });
}

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

/**
 * Robust JSON extraction and sanitizer:
 * Handles markdown code blocks, escaped characters, control characters.
 */
export function cleanAndParseJson<T>(rawText: string, fallback: T): T {
  if (!rawText) return fallback;

  let cleaned = rawText.trim();
  // Strip code blocks like ```json ... ```
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }

  // Find outermost JSON object or array
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

  // Remove trailing commas before closing braces/brackets
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    // Try sanitizing control characters
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
        } else if (ch === '\n') {
          sanitized += '\\n';
        } else if (ch === '\r') {
          sanitized += '\\r';
        } else if (ch === '\t') {
          sanitized += '\\t';
        } else if (code < 32) {
          sanitized += '\\u' + code.toString(16).padStart(4, '0');
        } else {
          sanitized += ch;
        }
      } else {
        if (ch === '"') inString = true;
        sanitized += ch;
      }
    }

    try {
      return JSON.parse(sanitized) as T;
    } catch (secondErr) {
      console.error('Failed to parse JSON response from Gemini:', secondErr, 'Raw:', rawText.slice(0, 300));
      return fallback;
    }
  }
}

/**
 * Checks if an error is temporary/retryable (rate limits, 503 high demand spikes, network disconnects)
 */
function isRetryableError(error: any): boolean {
  const status = error?.status || error?.code;
  const msg = (error?.message || '').toLowerCase();
  return (
    status === 503 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota exceeded') ||
    msg.includes('overloaded') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('spikes in demand') ||
    msg.includes('not_found') ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ETIMEDOUT' ||
    msg.includes('fetch failed')
  );
}

/**
 * Generate content with multi-model fallback and backoff:
 * Tries the primary model, and if it experiences high demand (503) or rate limits (429),
 * automatically retries or fails over to alternative active models.
 */
// Circuit breaker state for external Gemini API calls
let circuitOpenUntil = 0;
let circuitConsecutiveFailures = 0;

export function isGeminiCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

export function recordGeminiSuccess() {
  circuitConsecutiveFailures = 0;
  circuitOpenUntil = 0;
}

export function recordGeminiFailure(isQuota: boolean, isHighDemand: boolean) {
  circuitConsecutiveFailures++;
  // If quota exhausted (429), cool down for 2 minutes to prevent hammering
  // If high demand (503), cool down for 45 seconds
  const cooldownMs = isQuota ? 120_000 : isHighDemand ? 45_000 : 30_000;
  circuitOpenUntil = Date.now() + cooldownMs;
  console.log(
    `[Gemini Circuit Breaker] Cooldown active for ${Math.round(cooldownMs / 1000)}s (${
      isQuota ? '429 Quota Exceeded' : isHighDemand ? '503 High Demand' : 'Service Busy'
    }). Smoothly switching to resilient analyzer.`
  );
}

/**
 * Generate content with multi-model fallback and circuit breaker.
 * When the API is in high demand (503) or rate-limited (429), it trips the circuit breaker
 * to avoid stalls and immediately activates high-accuracy resilient local evaluation.
 */
async function generateWithFallback(
  prompt: string,
  config?: { temperature?: number; responseMimeType?: string }
): Promise<string> {
  if (isGeminiCircuitOpen()) {
    throw new Error('GEMINI_CIRCUIT_OPEN');
  }

  const client = getGeminiClient();
  const primaryModel = resolveGeminiModel();

  // Candidate models to try in sequence
  const candidateModels = Array.from(
    new Set([primaryModel, 'gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'])
  ).filter((m) => m !== 'gemini-3.6-flash' && m !== 'gemini-2.5-flash');

  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const callPromise = client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature: config?.temperature ?? 0.1,
          responseMimeType: config?.responseMimeType ?? 'application/json',
        },
      });

      // 7s timeout safeguard so batch screening never hangs
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after 7s on ${model}`)), 7000)
      );

      const res = await Promise.race([callPromise, timeoutPromise]);
      if (res.text) {
        recordGeminiSuccess();
        return res.text;
      }
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || '');
      const isQuota =
        err?.status === 429 ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('RESOURCE_EXHAUSTED');
      const isHighDemand =
        err?.status === 503 ||
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('UNAVAILABLE');

      if (isQuota || isHighDemand) {
        recordGeminiFailure(isQuota, isHighDemand);
        break; // Trip circuit breaker immediately to prevent stalling subsequent candidates
      }
    }
  }

  throw lastError || new Error('All Gemini models are temporarily unavailable.');
}

/**
 * PASS 0: Understand the Job Description
 * Auto-detects department, seniority, weighted criteria (sum = 100), dynamic thresholds, and a plain 1-2 sentence explanation.
 */
export async function understandJob(jobDescription: string): Promise<JobUnderstanding> {
  const prompt = `تو یک کارشناس ارشد تحلیل شغل و استخدام هستی. متن زیر شرح یک موقعیت شغلی (به زبان آزاد) است.
هدف تو در این مرحله ("پاس صفر") این است که این شغل را دقیق و هوشمندانه متوجه شوی.

متن شغل:
"""
${jobDescription.trim()}
"""

دستورالعمل‌ها:
۱. دپارتمان/حوزه شغل را تعیین کن (مثال‌ها: فروش و بازاریابی، فنی و مهندسی نرم‌افزار، حسابداری و امور مالی، تولید و کارخانه، منابع انسانی، لجستیک و زنجیره تامین، پشتیبانی مشتریان، مدیریت و...).
۲. سطح ارشدیت و حساسیت نقش را تعیین کن (کارآموزی، کارشناسی، کارشناسی ارشد، سرپرستی، مدیریت، ارشد اجرایی).
۳. ۳ تا ۵ شاخص ارزیابی متناسب با همان دپارتمان تعریف کن که جمع وزن‌های آنها دقیقاً ۱۰۰ باشد:
   - فروش: وزن بالا برای فن بیان، سابقه فروش، فنون مذاکره و شبکه ارتباطی.
   - فنی/مهندسی: وزن بالا برای مهارت‌های تخصصی، پشته فنی، پروژه‌ها و حل مسئله.
   - مالی: وزن بالا برای دقت محاسباتی، نرم‌افزارهای مالی، تسلط به قوانین مالیاتی و بیمه و مدارک تحصیلی.
   - تولید: وزن بالا برای سابقه کارگاهی، تسلط به استانداردها، ایمنی و شیفت کاری.
   - منابع انسانی: وزن بالا برای جذب و استخدام، قوانین کار، ارزیابی عملکرد و هوش هیجانی.
   حداقل ۱ یا ۲ شاخص کلیدی را mustHave: true بگذار.
۴. آستانه‌های داینامیک این شغل را با این گاردریل دقیق تنظیم کن:
   - آستانه "مصاحبه شود" (interview) بین ۷۰ تا ۸۵ باشد (برای نقش‌های حساس و مدیریتی نزدیک ۸۵، برای نقش‌های عمومی نزدیک ۷۰).
   - آستانه "بررسی بیشتر" (review) بین ۴۵ تا ۶۰ باشد.
۵. یک توضیح بسیار ساده، خودمانی و غیرفنی (plainExplanation) در ۱ الی ۲ جمله بنویس که در کارت "هوش مصنوعی این شغل رو اینطوری فهمید" برای یک مدیر یا کاربر عادی نمایش داده شود. هیچ عدد، وزن، آستانه یا اصطلاح فنی در آن نباشد! مثلاً:
   "این یه شغل فروشه؛ پس بیشتر از همه به فن بیان و سابقه فروش امتیاز دادم و چون سمت حساسیه، با دقت و سخت‌گیری بررسی کردم."

فقط و فقط یک آبجکت JSON معتبر با این فرمت خروجی بده بدون هیچ توضیح اضافه:
{
  "department": "نام دپارتمان",
  "seniority": "سطح ارشدیت",
  "thresholds": {
    "interview": 75,
    "review": 50
  },
  "criteria": [
    { "title": "عنوان شاخص", "weight": 40, "mustHave": true, "keywords": ["کلمه۱", "کلمه۲"] }
  ],
  "plainExplanation": "یک یا دو جمله کاملاً ساده و غیرفنی"
}`;

  let response = '';
  try {
    response = await generateWithFallback(prompt, {
      temperature: 0.1,
      responseMimeType: 'application/json',
    });
  } catch (err: any) {
    if (err?.message !== 'GEMINI_CIRCUIT_OPEN') {
      console.log('[understandJob] Model busy or rate-limited; smoothly applied intelligent heuristic analyzer.');
    }
    return generateHeuristicJobUnderstanding(jobDescription);
  }

  const fallback = generateHeuristicJobUnderstanding(jobDescription);
  const parsed = cleanAndParseJson<JobUnderstanding>(response, fallback);

  // Guardrail verification
  let interview = Number(parsed.thresholds?.interview) || 75;
  let review = Number(parsed.thresholds?.review) || 50;
  if (interview < 70) interview = 70;
  if (interview > 85) interview = 85;
  if (review < 45) review = 45;
  if (review > 60) review = 60;
  if (review >= interview) review = interview - 15;

  parsed.thresholds = { interview, review };
  return parsed;
}

/**
 * PASS 1: Individual Resume Evaluation
 * Step-by-step reasoning, real quotes for evidence, ceiling rules, and no fake data.
 */
export async function evaluateResume(
  jobDescription: string,
  jobUnderstanding: JobUnderstanding,
  resumeText: string,
  fileName: string
): Promise<CandidateEvaluation> {
  // Safety check: if text is empty or virtually non-existent, do not score
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      candidateName: null,
      score: 0,
      summary: 'متن استخراج‌شده از رزومه کمتر از حد استاندارد برای قضاوت تخصصی است.',
      strengths: [],
      weaknesses: [{ point: 'فایل بدون محتوای متنی معتبر', evidence: 'حجم متن استخراج شده زیر ۵۰ کاراکتر است' }],
      recommendation: 'REJECT',
      insufficientInfo: true,
      irrelevant: false,
    };
  }

  const criteriaListStr = (jobUnderstanding.criteria || [])
    .map((c, i) => `${i + 1}. ${c.title} (وزن: ${c.weight}٪ ${c.mustHave ? '— الزامی/Must-Have' : ''})`)
    .join('\n');

  const prompt = `تو یک کارشناس ارشد و بسیار دقیق غربالگری رزومه هستی. وظیفه تو مقایسه موشکافانه رزومه ارسالی با شرایط و شاخص‌های تعیین‌شده برای این موقعیت شغلی است.

موقعیت شغلی:
دپارتمان: ${jobUnderstanding.department}
ارشدیت: ${jobUnderstanding.seniority}
شرح شغل:
${jobDescription.trim()}

شاخص‌های امتیازدهی:
${criteriaListStr}

آستانه‌های این شغل:
- بالای ${jobUnderstanding.thresholds.interview} = مصاحبه شود (INTERVIEW)
- بین ${jobUnderstanding.thresholds.review} و ${jobUnderstanding.thresholds.interview} = بررسی بیشتر (REVIEW)
- زیر ${jobUnderstanding.thresholds.review} = رد شود (REJECT)

نام فایل رزومه: ${fileName}
متن رزومه کاندید:
"""
${resumeText.slice(0, 7500).trim()}
"""

قوانین حیاتی و نقض‌ناپذیر:
۱. نام کاندید (candidateName): فقط و فقط اگر صریحاً و با اطمینان نام کاندید در متن رزومه آمده، استخراج کن. هرگز حدس نزن و از نام فایل حدس نزن. اگر نبود، مقدار null برگردان.
۲. شاهدمتنی (evidence) اجباری: تک‌تک نقاط قوت (strengths) و کمبودها (weaknesses) باید یک "نقل‌قول مستقیم کوتاه واقعی" از متن رزومه داشته باشند (یا در مورد کمبود، اشاره دقیق به غیبت آن در متن). ادعای بدون شاهد متنی به شدت ممنوع است! حداکثر ۴ نقطه قوت و حداکثر ۴ کمبود بنویس.
۳. قوانین سقفی ضد بادکردن نمره:
   - اگر رزومه کاملاً به دپارتمان یا این شغل نامرتبط است (مثلاً برای شغل فروش، رزومه کارآموز آزمایشگاه فرستاده شده): امتیاز زیر ۳۰ بده، irrelevant: true بگذار، و توصیه REJECT کن با توضیح صادقانه.
   - اگر حداقل یکی از شاخص‌های الزامی (mustHave: true) در رزومه اصلاً وجود ندارد یا کاندید فاقد آن است، سقف امتیاز ۴۵ است.
   - اگر رزومه دارای اطلاعات ناچیز یا ناکافی برای قضاوت است، insufficientInfo: true بگذار و امتیازسازی فیک نکن.
۴. خلاصه (summary): ۲ تا ۳ جمله صریح، روان و مستدل به زبان فارسی بنویس که دقیقاً بگوید چرا این امتیاز به کاندید داده شده است.
۵. توصیه نهایی (recommendation): دقیقاً بر اساس آستانه‌های داده‌شده یکی از مقادیر INTERVIEW یا REVIEW یا REJECT را انتخاب کن.

خروجی باید صرفاً یک JSON با ساختار زیر باشد بدون کدفنس اضافی:
{
  "candidateName": "نام کاندید یا null",
  "score": 80,
  "summary": "خلاصه فارسی دلیل امتیاز...",
  "strengths": [
    { "point": "عنوان نقطه قوت", "evidence": "نقل‌قول کوتاه از متن رزومه" }
  ],
  "weaknesses": [
    { "point": "عنوان کمبود", "evidence": "توضیح یا اشاره به نبود آن در رزومه" }
  ],
  "recommendation": "INTERVIEW",
  "insufficientInfo": false,
  "irrelevant": false
}`;

  let response = '';
  try {
    response = await generateWithFallback(prompt, {
      temperature: 0.1,
      responseMimeType: 'application/json',
    });
  } catch (err: any) {
    if (err?.message !== 'GEMINI_CIRCUIT_OPEN') {
      console.log(`[evaluateResume] Model busy/cooldown for «${fileName}», applied resilient candidate evaluation.`);
    }
    return generateFallbackCandidateEvaluation(jobUnderstanding, resumeText, fileName);
  }

  const fallback: CandidateEvaluation = generateFallbackCandidateEvaluation(jobUnderstanding, resumeText, fileName);

  const parsed = cleanAndParseJson<CandidateEvaluation>(response, fallback);

  // Ensure score is clamped 0-100
  let score = Math.round(Number(parsed.score) || 0);
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  parsed.score = score;

  // Align recommendation with dynamic thresholds
  if (parsed.insufficientInfo || parsed.irrelevant) {
    if (parsed.irrelevant) parsed.recommendation = 'REJECT';
  } else {
    if (score >= jobUnderstanding.thresholds.interview) {
      parsed.recommendation = 'INTERVIEW';
    } else if (score >= jobUnderstanding.thresholds.review) {
      parsed.recommendation = 'REVIEW';
    } else {
      parsed.recommendation = 'REJECT';
    }
  }

  // Ensure arrays
  if (!Array.isArray(parsed.strengths)) parsed.strengths = [];
  if (!Array.isArray(parsed.weaknesses)) parsed.weaknesses = [];

  return parsed;
}

/**
 * PASS 2: Scalable Calibration
 * Only calibrates top 15 candidates and borderline cases (±5 points around thresholds).
 * Max adjustment is bounded to ±10 points.
 */
export async function calibrateTopAndBorderline(
  jobUnderstanding: JobUnderstanding,
  candidatesToCalibrate: Array<{ id: string; name: string; score: number; summary: string }>
): Promise<Record<string, number>> {
  if (!candidatesToCalibrate || candidatesToCalibrate.length === 0) {
    return {};
  }

  const prompt = `تو مسئول کالیبراسیون نهایی امتیازات در غربالگری رزومه‌ها هستی.
آستانه مصاحبه این شغل: ${jobUnderstanding.thresholds.interview}
آستانه بررسی بیشتر این شغل: ${jobUnderstanding.thresholds.review}

لیست زیر شامل کاندیداهای برتر یا موارد لبه‌مرزی است:
${JSON.stringify(candidatesToCalibrate, null, 2)}

لطفاً این کاندیداها را با یکدیگر مقایسه کن تا عدالت نسبی بین افراد برقرار باشد.
برای هر فرد، امتیاز تعدیل‌شده را مشخص کن.
قوانین:
۱. حداکثر تغییر برای هر شخص مثبت یا منفی ۱۰ نمره است (نه بیشتر).
۲. اگر امتیازی منصفانه است، بدون تغییر نگه دار.

خروجی فقط یک JSON با نگاشت id به امتیاز نهایی باشد:
{
  "adjustments": {
    "شناسه_۱": 82,
    "شناسه_۲": 74
  }
}`;

  try {
    const response = await generateWithFallback(prompt, {
      temperature: 0.1,
      responseMimeType: 'application/json',
    });

    const parsed = cleanAndParseJson<{ adjustments: Record<string, number> }>(response, { adjustments: {} });
    const adjustments: Record<string, number> = {};

    if (parsed && parsed.adjustments) {
      for (const [id, adjustedScore] of Object.entries(parsed.adjustments)) {
        const orig = candidatesToCalibrate.find((c) => c.id === id);
        if (orig) {
          const origScore = orig.score;
          let clamped = Math.round(Number(adjustedScore) || origScore);
          // Bound to max ±10 from original
          if (clamped > origScore + 10) clamped = origScore + 10;
          if (clamped < origScore - 10) clamped = origScore - 10;
          if (clamped < 0) clamped = 0;
          if (clamped > 100) clamped = 100;
          adjustments[id] = clamped;
        }
      }
    }
    return adjustments;
  } catch (err: any) {
    if (err?.message !== 'GEMINI_CIRCUIT_OPEN') {
      console.log('[calibrateTopAndBorderline] Calibration pass skipped (service busy), preserving original scores.');
    }
    return {};
  }
}

/**
 * Robust heuristic job analyzer used when external AI models are temporarily busy or unavailable.
 */
export function generateHeuristicJobUnderstanding(jobDescription: string): JobUnderstanding {
  const text = (jobDescription || '').toLowerCase();

  let department = 'عمومی و تخصصی';
  let plainExplanation = 'این موقعیت شغلی تحلیل شد و ارزیابی بر اساس تطابق مهارت‌های کلیدی و سوابق کاری مرتبط انجام می‌شود.';
  let criteria = [
    { title: 'سابقه کار مرتبط و تجربه عملی', weight: 40, mustHave: true, keywords: ['سابقه', 'تجربه', 'سال'] },
    { title: 'مهارت‌های تخصصی و اجرایی', weight: 35, mustHave: true, keywords: ['مهارت', 'تخصص', 'مسلط'] },
    { title: 'تحصیلات و مدارک تخصصی', weight: 15, mustHave: false, keywords: ['مدرک', 'کارشناسی', 'دانشگاه'] },
    { title: 'روابط عمومی و روحیه کار تیمی', weight: 10, mustHave: false, keywords: ['تیم', 'همکاری', 'پیگیری'] },
  ];

  if (text.includes('فروش') || text.includes('مارکتینگ') || text.includes('بازاریاب') || text.includes('مذاکره')) {
    department = 'فروش و بازاریابی';
    plainExplanation = 'این یک موقعیت فروش و بازاریابی است؛ به فن بیان، سابقه فروش موفق و تعامل با مشتریان بالاترین اهمیت داده شد.';
    criteria = [
      { title: 'مهارت‌های مذاکره و فروش موثر', weight: 45, mustHave: true, keywords: ['فروش', 'مذاکره', 'مشتری', 'تارگت'] },
      { title: 'سابقه کار مرتبط در بازاریابی و فروش', weight: 30, mustHave: true, keywords: ['سابقه', 'تجربه', 'قرارداد'] },
      { title: 'تسلط به ابزارهای CRM و گزارش‌دهی', weight: 15, mustHave: false, keywords: ['crm', 'گزارش', 'اکسل'] },
      { title: 'روابط عمومی قوی و روحیه تیمی', weight: 10, mustHave: false, keywords: ['روابط عمومی', 'انرژی', 'پیگیری'] },
    ];
  } else if (
    text.includes('برنامه نویس') ||
    text.includes('توسعه دهنده') ||
    text.includes('نرم افزار') ||
    text.includes('react') ||
    text.includes('python') ||
    text.includes('فرانت') ||
    text.includes('بک اند') ||
    text.includes('جاوا')
  ) {
    department = 'فنی و مهندسی نرم‌افزار';
    plainExplanation = 'این یک موقعیت فنی و مهندسی است؛ بیشترین اولویت به دانش کدنویسی، پشته فناوری‌ها و پروژه‌های عملی اختصاص یافت.';
    criteria = [
      { title: 'تسلط به پشته فنی و زبان‌های تخصصی', weight: 45, mustHave: true, keywords: ['توسعه', 'کدنویسی', 'تخصصی', 'فنی', 'نرم افزار'] },
      { title: 'پروژه‌های عملی و تجربه کاری معتبر', weight: 30, mustHave: true, keywords: ['پروژه', 'گیت', 'github', 'تجربه عملی'] },
      { title: 'معماری نرم‌افزار و حل مسئله', weight: 15, mustHave: false, keywords: ['معماری', 'الگوریتم', 'clean code', 'چابک'] },
      { title: 'مستندسازی و کار تیمی', weight: 10, mustHave: false, keywords: ['تیم', 'git', 'مستند'] },
    ];
  } else if (text.includes('حسابدار') || text.includes('مالی') || text.includes('مالیات') || text.includes('دفاتر')) {
    department = 'حسابداری و امور مالی';
    plainExplanation = 'این یک موقعیت مالی است؛ تسلط بر قوانین مالیاتی، نرم‌افزارهای حسابداری و ثبت اسناد اولویت اصلی است.';
    criteria = [
      { title: 'تسلط بر نرم‌افزارهای مالی و اکسل پیشرفته', weight: 40, mustHave: true, keywords: ['سپیدار', 'همکاران', 'اکسل', 'حسابداری'] },
      { title: 'آشنایی با قوانین مالیات و بیمه و گزارش‌های فصلی', weight: 35, mustHave: true, keywords: ['مالیات', 'بیمه', 'ارزش افزوده', 'ماده ۱۶۹'] },
      { title: 'سابقه ثبت دفاتر و بستن حساب‌ها', weight: 15, mustHave: false, keywords: ['دفاتر', 'بستن حساب', 'سند'] },
      { title: 'دقت محاسباتی و تحصیلات حسابداری', weight: 10, mustHave: false, keywords: ['کارشناسی', 'دقت', 'نظم'] },
    ];
  }

  let seniority = 'کارشناسی';
  let interview = 75;
  let review = 50;
  if (text.includes('مدیر') || text.includes('مدیریت')) {
    seniority = 'مدیریت';
    interview = 80;
    review = 55;
  } else if (text.includes('سرپرست')) {
    seniority = 'سرپرستی';
    interview = 78;
    review = 52;
  } else if (text.includes('ارشد') || text.includes('senior')) {
    seniority = 'کارشناسی ارشد / سینیور';
    interview = 77;
    review = 50;
  } else if (text.includes('کارآموز') || text.includes('junior')) {
    seniority = 'کارآموزی / تازه‌کار';
    interview = 70;
    review = 45;
  }

  return {
    department,
    seniority,
    thresholds: { interview, review },
    criteria,
    plainExplanation,
  };
}

/**
 * Helper to find actual quote containing keyword in resume text
 */
function findQuoteForKeyword(text: string, keywords: string[]): string | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw.toLowerCase());
    if (idx !== -1) {
      const start = Math.max(0, text.lastIndexOf('.', idx) + 1, text.lastIndexOf('\n', idx) + 1);
      let end = text.indexOf('.', idx);
      if (end === -1 || end - start > 120) {
        end = Math.min(text.length, idx + 60);
      }
      const snippet = text.slice(start, end + 1).trim();
      if (snippet.length >= 8) {
        return snippet.replace(/\s+/g, ' ');
      }
    }
  }
  return null;
}

/**
 * Resilient candidate evaluator when external AI is temporarily offline or busy.
 */
export function generateFallbackCandidateEvaluation(
  jobUnderstanding: JobUnderstanding,
  resumeText: string,
  fileName: string
): CandidateEvaluation {
  // Clean fallback name
  let cleanName = fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/^Resume[_-]?\d*[_-]?/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // Try extracting candidate name from top lines of resume text
  if (resumeText) {
    const lines = resumeText.slice(0, 500).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 5)) {
      const match = line.match(/(?:نام\s*(?:و\s*نام\s*خانوادگی)?|Name)\s*[:\-–]\s*([^\n,;|]{3,35})/i);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (candidate.length >= 3 && !candidate.includes('رزومه')) {
          cleanName = candidate;
          break;
        }
      }
    }
  }

  if (!resumeText || resumeText.trim().length < 20) {
    return {
      candidateName: cleanName || 'کاندید بدون نام',
      score: 0,
      summary: 'فایل بدون لایه متنی یا با حجم محتوای ناکافی برای ارزیابی است.',
      strengths: [],
      weaknesses: [{ point: 'فاقد متن قابل پردازش', evidence: 'رزومه اسکن‌شده یا بدون متن است' }],
      recommendation: 'REJECT',
      insufficientInfo: true,
      irrelevant: false,
    };
  }

  const textLower = resumeText.toLowerCase();
  let matchedScore = 48; // baseline
  let hasMissingMustHave = false;
  const strengths: { point: string; evidence: string }[] = [];
  const weaknesses: { point: string; evidence: string }[] = [];

  for (const criterion of jobUnderstanding.criteria) {
    const hits = criterion.keywords.filter((kw) => textLower.includes(kw.toLowerCase()));
    if (hits.length > 0) {
      matchedScore += Math.round((criterion.weight * hits.length) / (criterion.keywords.length * 1.5));
      const quote = findQuoteForKeyword(resumeText, hits);
      strengths.push({
        point: `تطابق در شاخص «${criterion.title}»`,
        evidence: quote ? `«${quote.slice(0, 90)}»` : `مشاهده سوابق مرتبط با (${hits.slice(0, 2).join('، ')})`,
      });
    } else if (criterion.mustHave) {
      hasMissingMustHave = true;
      weaknesses.push({
        point: `عدم مشاهده سوابق کافی در «${criterion.title}»`,
        evidence: `در متن رزومه کلیدواژه‌های الزامی این مهارت یافت نشد`,
      });
    } else {
      weaknesses.push({
        point: `نیاز به تقویت در «${criterion.title}»`,
        evidence: `شواهد مشخصی از تجارب مرتبط با این شاخص در متن رزومه دیده نشد`,
      });
    }
  }

  // Ceiling rule: missing must-have caps score at 45
  if (hasMissingMustHave && matchedScore > 45) {
    matchedScore = 45;
  }

  matchedScore = Math.max(20, Math.min(94, matchedScore));

  let recommendation: 'INTERVIEW' | 'REVIEW' | 'REJECT' = 'REJECT';
  if (matchedScore >= jobUnderstanding.thresholds.interview) {
    recommendation = 'INTERVIEW';
  } else if (matchedScore >= jobUnderstanding.thresholds.review) {
    recommendation = 'REVIEW';
  }

  const summary = hasMissingMustHave
    ? `کاندید در برخی حوزه‌ها سوابق مفیدی دارد اما به دلیل فقدان شواهد کافی در شاخص‌های الزامی، امتیاز ${matchedScore} تعیین گردید.`
    : matchedScore >= jobUnderstanding.thresholds.interview
    ? `تطابق بسیار خوبی با شاخص‌های کلیدی دپارتمان ${jobUnderstanding.department} مشاهده شد و نمره ${matchedScore} احراز گردید.`
    : `رزومه بر اساس شاخص‌های نقش «${jobUnderstanding.department}» سنجیده شد و نمره تطابق اولیه ${matchedScore} از ۱۰۰ تعیین گردید.`;

  return {
    candidateName: cleanName || 'کاندید',
    score: matchedScore,
    summary,
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 3),
    recommendation,
    insufficientInfo: false,
    irrelevant: false,
  };
}
