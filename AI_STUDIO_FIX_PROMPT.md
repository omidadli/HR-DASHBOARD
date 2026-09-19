# پرامپت اصلاح باگ‌ها برای AI Studio

> این فایل را کامل کپی کن و در AI Studio (همان اپ `hoosha`) پیست کن.
> تمام تغییرات زیر در همین ریپازیتوری پیاده‌سازی و تست شده‌اند؛ این پرامپت فقط برای
> زمانی است که می‌خواهی همان اصلاحات را روی نسخه‌ی داخل AI Studio هم اعمال کنی.
> اگر کد AI Studio را از این ریپازیتوری همگام‌سازی می‌کنی، نیازی به این پرامپت نیست.

---

## پرامپت (از اینجا کپی کن)

اپلیکیشن دو باگ اصلی دارد و چند باگ پنهان که در همان مسیر‌ها پیدا شده‌اند. همه را دقیقاً به شکل زیر اصلاح کن. هیچ قابلیت موجودی را حذف نکن و متن‌های فارسی را تغییر نده.

### ۱) روی آیفون و برخی دستگاه‌ها سایت اصلاً بالا نمی‌آید

**۱-۱. فونت Google Fonts رندر را بلاک می‌کند.** در `index.html` سه تگ `<link>` مربوط به `fonts.googleapis.com` و `fonts.gstatic.com` وجود دارد. این یک stylesheet بلاک‌کننده‌ی رندر از یک دامنه‌ی ثالث است؛ وقتی آن دامنه کند یا غیرقابل‌دسترس باشد صفحه ده‌ها ثانیه سفید می‌ماند. هر سه تگ را حذف کن و فونت Vazirmatn را محلی سرو کن: پکیج `vazirmatn` را نصب کن، فایل‌های `Vazirmatn[wght].woff2`، `Vazirmatn-Regular.woff2`، `Vazirmatn-Medium.woff2` و `Vazirmatn-Bold.woff2` را در `public/fonts/` بگذار و `@font-face`های متناظر را در یک `<style>` inline داخل `<head>` بنویس (همراه با `<link rel="preload" as="font" type="font/woff2" href="/fonts/Vazirmatn-var.woff2" crossorigin>`). بعد از این تغییر هیچ ارجاعی به `fonts.googleapis` نباید در `index.html` باقی بماند.

**۱-۲. API‌های جدید جاوااسکریپت polyfill ندارند.** `pdfjs-dist@6` از `Promise.withResolvers` استفاده می‌کند و باندل نهایی همچنین `structuredClone`، `Object.hasOwn`، `Array.prototype.at` و `Array.prototype.findLast` دارد. این‌ها در iOS Safari زیر ۱۵.۴ (و `withResolvers` زیر ۱۷.۴) وجود ندارند؛ Vite فقط *syntax* را ترنسپایل می‌کند نه built-in‌ها را، پس برنامه با TypeError می‌میرد و صفحه سفید می‌شود. این‌ها را انجام بده:
- `@vitejs/plugin-legacy` (نسخه سازگار با Vite 6، یعنی `^6`) و `terser` را به devDependencies و `core-js` را به dependencies اضافه کن.
- در `vite.config.ts` پلاگین را با این تنظیمات اضافه کن: `legacy({ renderLegacyChunks: false, modernTargets: ['safari >= 14', 'ios_saf >= 14', 'chrome >= 80'], modernPolyfills: true })`.
- در اولین خط‌های `src/main.tsx` این import‌ها را قرار بده تا قطعاً اعمال شوند:
  `core-js/actual/promise/with-resolvers`, `core-js/actual/structured-clone`, `core-js/actual/object/has-own`, `core-js/actual/array/at`, `core-js/actual/array/find-last`, `core-js/actual/array/find-last-index`, `core-js/actual/string/replace-all`.
- در `build` کانفیگ، `target: ['es2020', 'safari14']` را صریح بگذار و با `manualChunks`، ماژول‌های `pdfjs-dist`، `recharts`/`d3-*`، `mammoth`/`jszip` و `react`/`scheduler`/`lucide-react` را به چانک‌های جدا تقسیم کن.

**۱-۳. pdf.js باید از build قدیمی‌سازگار استفاده کند.** در `src/lib/extractText.ts` ورودی‌ها را از `pdfjs-dist` به `pdfjs-dist/legacy/build/pdf.mjs` و worker را به `pdfjs-dist/legacy/build/pdf.worker.min.mjs?url` تغییر بده. pdf.js را به‌صورت lazy با `await import(...)` فقط وقتی لازم شد بارگذاری کن (یک promise کش‌شده در سطح ماژول) و `GlobalWorkerOptions.workerSrc` را بعد از import تنظیم کن تا چانک اصلی سبک بماند.

**۱-۴. fallback شکسته‌ی cdnjs را حذف کن.** در `extractFromPdfWithCoordinates` یک تلاش مجدد هست که `workerSrc` را به `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.mjs` تغییر می‌دهد. آن نسخه روی cdnjs وجود ندارد و آن دامنه هم روی بسیاری از شبکه‌ها مسدود است؛ نتیجه hang شدن استخراج است. کل این fallback را حذف کن و فقط از worker هم‌دامنه استفاده کن.

**۱-۵. صفحه‌ی سفید باید پیام داشته باشد.** در `index.html` یک overlay سبک «در حال بارگذاری هوشا…» (بدون وابستگی به CSS باندل، با استایل inline و بدون `@layer`) و یک کارت خطای فارسی اضافه کن، همراه با یک اسکریپت inline که `window.error` و `unhandledrejection` را می‌گیرد و یک watchdog بیست ثانیه‌ای دارد: اگر `#root` خالی ماند، به‌جای صفحه‌ی سفید، پیام «هوشا نتوانست روی این مرورگر اجرا شود» به همراه راهنمای به‌روزرسانی iOS و دکمه‌ی تلاش دوباره نشان بده. در `src/main.tsx` رندر را داخل `try/catch` بگذار و در `App` با یک `useEffect` هنگام mount، overlay را حذف کن (`window.__hooshaBoot?.hide()`).

**۱-۶. اسپلش‌اسکرین می‌تواند برای همیشه روی برنامه بماند.** `SplashScreen` یک overlay تمام‌صفحه با `z-[120]` است که بسته‌شدنش به زنجیره‌ای از تایمرها وابسته بود و همه‌ی آن تایمرها در یک آرایس مشترک (`timers.current`) نگه داشته می‌شدند؛ effect اول در cleanup خود *همه‌ی* آن‌ها را پاک می‌کرد، از جمله تایمرهایی که effect دوم برای بستن اسپلش ثبت کرده بود. چون `App` هم `onComplete` را به‌صورت arrow function درون‌خطی پاس می‌داد، هر re-render والد این effect را دوباره اجرا می‌کرد و تایمر بستن لغو می‌شد. اصلاح کن:
- یک تابع `finish` کاملاً idempotent (با `useRef` به‌عنوان قفل) بنویس.
- فقط یک effect با آرایه‌ی وابستگی خالی بگذار که یک watchdog قطعی (`maxDurationMs = 6000`) ثبت کند و در حالت بدون نام کاربری هم یک تایمر کوتاه؛ `onComplete` را داخل یک ref نگه دار تا وابستگی effect نشود.
- با کلیک/لمس روی overlay هم `finish` اجرا شود و یک راهنمای «برای رد کردن، لمس کنید» نمایش بده.
- در `App.tsx` هندلر را با `useCallback` بساز (`const handleSplashComplete = useCallback(() => setShowSplash(false), [])`).

**۱-۷. `WelcomeGate` هم همین ریسک را دارد.** اگر انیمیشن تایپ تمام نشود، فرم اسم هرگز ظاهر نمی‌شود و کاربر برای همیشه پشت overlay می‌ماند. یک watchdog اضافه کن: اگر `step === 'hello'` بیش از ۱۲ ثانیه طول کشید، `setStep('ask')` اجرا شود.

### ۲) با ۵ رزومه پردازش گیر می‌کند

**۲-۱. مهم‌ترین علت: `fetch` نه timeout دارد نه signal.** در `src/lib/api.ts` تابع `jsonFetch` مستقیماً `fetch` را صدا می‌زند. یک درخواست بی‌پاسخ هرگز reject نمی‌شود، پس `Promise.all` کارگرها هرگز resolve نمی‌شود و کل batch تا ابد روی «در حال تحلیل» می‌ماند؛ حتی دکمه‌ی لغو هم درخواست‌های در جریان را قطع نمی‌کرد. یک `fetchWithTimeout(url, init, { timeoutMs, signal })` بنویس که: اگر `signal` از قبل abort شده بلافاصله `DOMException('Aborted','AbortError')` پرتاب کند؛ یک `AbortController` داخلی بسازد؛ `signal` تماس‌گیرنده را با `{ once: true }` به آن متصل کند؛ یک `setTimeout` برای deadline بگذارد؛ و در `finally` تایمر و listener را پاک کند. در `catch` بین «کاربر لغو کرد» و «زمان تمام شد» تفکیک قائل شو و برای دومی پیام فارسی صادقانه بده. سپس `opts` را به همه‌ی توابع API اضافه کن و در همه‌ی `fetch`ها استفاده کن: `evaluateResume` با `timeoutMs: 150000`، `calibrateBatch` با `90000`، `fetchUnderstanding` با `60000`، `draftMessage` با `45000`، بقیه `30000` و `checkHealth` با `15000`.

**۲-۲. circuit breaker کد مرده بود.** در `server/screening-gemini.ts` تابع `isGeminiCircuitOpen()` export شده ولی هیچ‌جا صدا زده نمی‌شود و رشته‌ی `'GEMINI_CIRCUIT_OPEN'` هم هرگز throw نمی‌شود. نتیجه: با سهمیه‌ی پرشده، هر رزومه ۴ مدل × ۲ تلاش × ۱۸ ثانیه (حدود ۲.۵ دقیقه) زمان می‌سوزاند تا به موتور محلی برسد. اصلاح کن:
- `export const CIRCUIT_OPEN = 'GEMINI_CIRCUIT_OPEN'` و در اولین خط `generateWithFallback`: `if (isGeminiCircuitOpen()) throw new Error(CIRCUIT_OPEN);`.
- آستانه‌ی باز شدن را از ۴ به ۳ خطای پیاپی کاهش بده و cooldown را برای ۴۲۹ به ۳۰ ثانیه و برای بقیه به ۱۰ ثانیه ببر.
- فهرست مدل‌ها را به دو مدل کاهش بده (`resolveGeminiModel()` و `gemini-2.5-flash`).
- یک `deadlineMs` (پیش‌فرض ۴۵۰۰۰) اضافه کن که کل حلقه‌ی مدل‌ها و تلاش‌ها را محدود کند و در هر تکرار `timeoutMs` را به زمان باقی‌مانده مقید کند.
- اگر خطا از نوع ۴۰۰/۴۰۱/۴۰۳/۴۰۴ یا «API key not valid»/`PERMISSION_DENIED`/`NOT_FOUND` بود، فوراً از کل حلقه خارج شو (کلید برای همه‌ی مدل‌ها یکی است).
- تایمر timeout را در `finally` پاک کن.
- در `evaluateResumeV2` مقایسه‌ی `err?.message !== 'GEMINI_CIRCUIT_OPEN'` را به ثابت `CIRCUIT_OPEN` تغییر بده.
- به هر چهار نقطه‌ی فراخوانی `generateWithFallback` مقدار `deadlineMs` بده: `understandJobV2` مقدار `25000`، `evaluateResumeV2` مقدار `40000`، `calibrateV2` مقدار `40000`، `draftMessageV2` مقدار `25000`.

**۲-۳. runner باید در برابر یک فایل خراب مقاوم باشد.** در `src/lib/runner.ts`:
- `Promise.all` کارگرها را به `Promise.allSettled` تبدیل کن (هم برای استخراج و هم ارزیابی) تا یک کارگرِ پرتاب‌کننده بقیه را رها نکند؛ بعد از آن فقط اگر `reason.name === 'AbortError'` بود همان را دوباره پرتاب کن و بقیه را `console.warn` کن.
- داخل حلقه‌ی استخراج، بدنه را در `try/catch` بگذار و در صورت خطا همان آیتم را `unjudgeable` کن.
- `signal` را به `createBatch`، `evaluateResume` و `calibrateBatch` پاس بده.
- همزمانی را تطبیقی کن: استخراج `2` روی موبایل و در غیر این صورت `clamp(floor(hardwareConcurrency/2), 2, 4)`؛ ارزیابی `2` روی موبایل و `3` روی دسکتاپ (قبلاً ۴ بود که rate limit را تحریک می‌کرد).
- heartbeat را از ۴۰۰ms به ۱۰۰۰ms ببر و `emit` را طوری throttle کن که فراخوانی‌های پرتکرار (باز کردن ZIP با صدها فایل) حداکثر هر ۱۲۰ms یک re-render بسازند.
- یک `lastProgressAt` نگه دار که **فقط** روی پیشرفت واقعی به‌روز شود و اگر بیش از ۴۵ ثانیه حرکتی نشد، در `ScreeningProgressUpdate` یک `warningText` فارسی بفرست؛ در `ProcessingView` هم همین `warningText` را به‌صورت یک بنر هشدار کهربایی نمایش بده.
- `cachedBase64` را از روی آبجکت آیتم بردار و در یک `Map` نگهداری کن و بلافاصله بعد از ارسال، `delete` کن تا حافظه آزاد شود.

**۲-۴. payload بیش از حد بزرگ.** در runner فقط وقتی base64 فایل را نگه دار که حجمش از ۱۲ مگابایت کمتر باشد، و در `UploadZone` هر فایل بزرگ‌تر از ۲۰ مگابایت را با یک toast فارسی رد کن. در `server.ts` حد `express.json` را از `100mb` به `30mb` کاهش بده و یک error handler برای `entity.too.large` و `entity.parse.failed` بگذار که JSON فارسی برگرداند (نه صفحه‌ی HTML خطا).

**۲-۵. استخراج PDF باید کران داشته باشد.** در `extractText.ts` یک `withTimeout(promise, ms, label)` بنویس و دور `loadingTask.promise`، `mammoth.extractRawText`، `file.arrayBuffer()` و `zip.loadAsync` استفاده کن (۴۵ ثانیه برای سند، ۱۲۰ ثانیه برای ZIP). تعداد صفحات را به ۴۰ صفحه محدود کن، بعد از هر صفحه `await page.cleanup()` و در `finally` `await loadingTask.destroy()` را صدا بزن. در `processUploadFiles` بعد از هر فایل یک `await new Promise(r => setTimeout(r, 0))` بگذار تا UI هنگ نکند.

### ۳) باگ‌های دیگری که در همان مسیر پیدا شد

**۳-۱. دسترسی بین کاربرها باز بود (مهم برای سیستم HR).** اندپوینت‌های `PATCH /api/resumes/:id`، `POST /api/resumes/:id/rerun`، `POST|DELETE /api/resumes/:id/bank`، `GET /api/resumes/:id/file`، `POST /api/messages/draft`، `POST /api/screening/batches/:id/evaluate` و `.../calibrate` هیچ بررسی مالکیتی نداشتند؛ هر کاربر با دانستن یک id می‌توانست رزومه‌ی کاربر دیگر را بخواند، حذف کند یا دانلود کند. در `server/screening-store.ts` توابع `getBatchForUser(id, userId)` و `getResumeForUser(id, userId)` را با استفاده از همان `ownerOk` موجود اضافه کن و در همه‌ی این مسیرها جایگزین `getBatch`/`getResume` کن (رفتار داده‌ی قدیمی بدون owner و درخواست بدون `x-user-id` باید بدون تغییر بماند).

**۳-۲. `PORT` نادیده گرفته می‌شد.** `const PORT = 3000` هاردکد بود در حالی که `render.yaml` مقدار `PORT=10000` می‌دهد و همان پورت را health check می‌کند؛ یعنی دیپلوی روی Render شکست می‌خورد. به `const PORT = Number(process.env.PORT) || 3000` تغییر بده.

**۳-۳. داده‌ها با هر دیپلوی پاک می‌شدند.** در `render.yaml` یک `disk` با `mountPath: /opt/render/project/src/data` و `sizeGB: 1` اضافه کن، وگرنه `data/screening-store.json` و `data/resumes/` بعد از هر استقرار از بین می‌روند.

**۳-۴. error middleware جای اشتباهی بود.** هندلر خطای عمومی در Express *قبل از* میدلور استاتیک و SPA ثبت شده بود، پس خطاهای آن لایه را نمی‌گرفت. آن را به انتهای زنجیره (بعد از `express.static` و `app.get('*')`) منتقل کن. برای فایل‌های استاتیک هم هدر کش بگذار: برای `.html` مقدار `no-cache, must-revalidate` و برای `.js/.css/.woff2/.svg/.png/.jpg/.mjs` مقدار `public, max-age=31536000, immutable`.

**۳-۵. dedup ناقص آپلود.** در `UploadZone` کلید تکراری بودن فقط `name_size` بود، پس دو رزومه‌ی متفاوت با نام و حجم یکسان بی‌صدا حذف می‌شدند. کلید را به `name_size_lastModified` تغییر بده.

### ۴) تست‌ها را هم اضافه کن

دو اسکریپت تست اضافه کن و در `package.json` دستور `"test": "tsx scripts/circuit.test.ts && tsx scripts/api-timeout.test.ts"` و `"test:api": "node scripts/smoke.mjs"` را تعریف کن:
- `scripts/circuit.test.ts`: با stub کردن `globalThis.fetch` ثابت کند وقتی circuit breaker باز است **هیچ** درخواستی به Gemini زده نمی‌شود (`fetchCalls === 0`)، نتیجه زیر ۲۰۰ms با `engine === 'local'` برمی‌گردد، و بعد از `recordGeminiSuccess()` تلاش‌ها از سر گرفته می‌شوند.
- `scripts/api-timeout.test.ts`: ثابت کند هر درخواست یک `AbortSignal` دارد، درخواست بی‌پاسخ دقیقاً در deadline خودش با پیام فارسی reject می‌شود، abort تماس‌گیرنده فوراً درخواست را قطع می‌کند و به‌صورت `AbortError` منتشر می‌شود، و signal از قبل abort‌شده قبل از رسیدن به شبکه reject می‌شود.
- `scripts/smoke.mjs`: روی سرور واقعی اجرا شود و health، سرو شدن SPA، فونت محلی، نبود Google Fonts، وجود چانک polyfill، خطای ۵۰۳ سریع برای `/understand`، پنج ارزیابی موازی، کالیبراسیون، ایزوله بودن کاربرها (۴۰۴ برای کاربر دیگر)، بانک رزومه، پاسخ JSON برای payload بزرگ و ۴۰۴ برای مسیر ناشناخته را بررسی کند.

---

## چک‌لیست نهایی

- [ ] `grep -c "fonts.googleapis" index.html` برابر صفر باشد
- [ ] `npm run lint` بدون خطا
- [ ] `npm run build` موفق و شامل یک چانک `polyfills-*.js` باشد
- [ ] `npm test` همه‌ی assertion‌ها PASS
- [ ] `npm run build && NODE_ENV=production PORT=3111 node dist/server.cjs` و بعد `BASE=http://127.0.0.1:3111 npm run test:api` همه PASS
- [ ] روی آیفون واقعی با iOS 16.4+ و یک آیفون قدیمی‌تر تست شود
