# راهنمای دیپلوی هوشا روی Render

این فایل همه‌چیز را برای بالا آوردن **هوشا** روی Render توضیح می‌دهد:
از ساخت سرویس تا متغیرهای محیطی، تست سلامت و عیب‌یابی.

- آدرس نهایی (پس از دیپلوی): **https://hosha.onrender.com**
- ریپازیتوری: `https://github.com/omidadli/HR-DASHBOARD`
- برنچ دیپلوی: `main`

> اگر می‌خواهید یک ایجنت هوشمند (Claude Code / Cursor / …) این کار را برایتان انجام دهد،
> فایل [`DEPLOY_PROMPT.md`](./DEPLOY_PROMPT.md) را به آن بدهید.

---

## ۰) پیش‌نیازها

| مورد | توضیح |
| --- | --- |
| اکانت Render | ثبت‌نام رایگان در https://dashboard.render.com |
| دسترسی GitHub | همان اکانتی که به ریپو `omidadli/HR-DASHBOARD` دسترسی دارد باید در Render متصل شود |
| کلید Gemini | یک کلید **دائمی** با پیشوند `AIza` از https://aistudio.google.com/apikey |

> ⚠️ کلیدهایی که با `AQ.` شروع می‌شوند **موقت** هستند (کمتر از یک ساعت اعتبار دارند)
> و فقط برای تست AI Studio ساخته می‌شوند. روی Render حتماً کلید `AIza…` بگذارید،
> وگرنه چند ساعت بعد کل تحلیل‌ها از کار می‌افتد.

---

## ۱) ساختار دیپلوی (چه چیزی اجرا می‌شود)

هوشا یک اپ **تک‌پروسه‌ای** است: همان سرور Express هم API را می‌دهد و هم فایل‌های
بیلدشدهٔ React را سرو می‌کند. پس فقط **یک Web Service** لازم است (نه دو تا).

| مرحله | دستور | خروجی |
| --- | --- | --- |
| Build | `npm install --include=dev --no-audit --no-fund && npm run build` | `dist/` (فرانت) + `dist-server/server.cjs` (بک‌اند) |
| Start | `npm start` → `node dist-server/server.cjs` | سرور روی `$PORT` |
| Health check | `/api/health` | `{"status":"ok", ...}` |

چرا `--include=dev`؟ چون در `render.yaml` متغیر `NODE_ENV=production` تعریف شده و
npm در این حالت به‌صورت پیش‌فرض `devDependencies` را نصب نمی‌کند — در نتیجه
`vite` و `esbuild` غایب می‌مانند و بیلد می‌شکند. این فلگ مشکل را قطعی حل می‌کند.

نسخه Node با دو مکانیزم قفل شده است: فایل `.node-version` (= `22.22.0`) و
فیلد `engines` در `package.json`.

---

## ۲) مسیر A — Blueprint (توصیه‌شده، ۳ کلیک)

فایل `render.yaml` در ریشهٔ ریپو همهٔ تنظیمات را تعریف می‌کند.

1. این لینک را باز کنید (ریپو را خودکار شناسایی می‌کند):

   ```
   https://dashboard.render.com/blueprint/new?repo=https://github.com/omidadli/HR-DASHBOARD
   ```

2. اگر از شما خواست، اکانت GitHub را به Render متصل کنید و به ریپو دسترسی بدهید.
3. نام Blueprint را `hosha` بگذارید و برنچ را `main` انتخاب کنید.
   مسیر فایل Blueprint همان `render.yaml` پیش‌فرض است.
4. Render فهرست تغییرات را نشان می‌دهد: یک Web Service به نام `hosha`.
5. در فرم، مقدار `GEMINI_API_KEY` را وارد کنید (چون در YAML با `sync: false`
   تعریف شده، Render از شما مقدارش را می‌پرسد و آن را **هرگز** در ریپو ذخیره نمی‌کند).
6. دکمهٔ **Apply** را بزنید.

دیپلوی اول ۲ تا ۴ دقیقه طول می‌کشد. در پایان، آدرس سرویس
`https://hosha.onrender.com` است.

> اگر `hosha.onrender.com` قبلاً توسط شخص دیگری رزرو شده باشد، Render یک پسوند
> تصادفی اضافه می‌کند (مثلاً `hosha-xxxx.onrender.com`). آدرس دقیق همیشه در
> داشبورد، بالای صفحهٔ سرویس نوشته شده است.

### دیپلوی خودکار بعد از هر push
چون `autoDeploy: true` است، هر push روی برنچ `main` یک دیپلوی جدید می‌سازد.

---

## ۳) مسیر B — ساخت دستی Web Service

اگر Blueprint را دوست ندارید، در داشبورد:
**New → Web Service → انتخاب ریپو → Apply** و مقادیر زیر را دقیق وارد کنید.

| فیلد | مقدار |
| --- | --- |
| Name | `hosha` |
| Region | `Oregon` |
| Branch | `main` |
| Root Directory | *(خالی)* |
| Runtime / Language | `Node` |
| Build Command | `npm install --include=dev --no-audit --no-fund && npm run build` |
| Start Command | `npm start` |
| Instance Type / Plan | `Free` |
| Health Check Path | `/api/health` |

سپس در تب **Environment** این متغیرها را اضافه کنید:

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.22.0` |
| `GEMINI_API_KEY` | کلید `AIza…` شما |
| `MAX_BODY_MB` | `64` |
| `LOG_REQUESTS` | `true` |

و **Save Changes** → Render خودش دیپلوی می‌کند.

---

## ۴) مسیر C — Render MCP یا REST API

اگر ایجنت شما به Render MCP وصل است:

```bash
claude mcp add --transport http render https://mcp.render.com/mcp \
  --header "Authorization: Bearer <RENDER_API_KEY>"
```

کلید API از: `https://dashboard.render.com/u/settings#api-keys`

برای REST API خالص، نقطهٔ شروع `POST https://api.render.com/v1/services` است
(نوع `web_service`، و فیلد `ownerId` اجباری است). مرجع زنده:
https://api-docs.render.com/reference/create-service

```json
{
  "type": "web_service",
  "name": "hosha",
  "ownerId": "<WORKSPACE_OWNER_ID>",
  "repo": "https://github.com/omidadli/HR-DASHBOARD.git",
  "branch": "main",
  "autoDeploy": "yes",
  "envVars": [
    { "key": "NODE_ENV", "value": "production" },
    { "key": "NODE_VERSION", "value": "22.22.0" },
    { "key": "GEMINI_API_KEY", "value": "<AIza...>" },
    { "key": "MAX_BODY_MB", "value": "64" },
    { "key": "LOG_REQUESTS", "value": "true" }
  ],
  "serviceDetails": {
    "plan": "free",
    "region": "oregon",
    "buildCommand": "npm install --include=dev --no-audit --no-fund && npm run build",
    "startCommand": "npm start",
    "healthCheckPath": "/api/health",
    "numInstances": 1
  }
}
```

---

## ۵) تأیید اینکه دیپلوی سالم است

این سه را بعد از دیپلوی چک کنید:

```bash
# 1) سرور بالاست
curl -s https://hosha.onrender.com/api/health
# → {"status":"ok","app":"هوشا — ...","uptimeSeconds":12,...}

# 2) کلید Gemini درست ست شده (مهم‌ترین تست)
curl -s https://hosha.onrender.com/api/screening/health
# → {"status":"ok","hasGeminiKey":true}

# 3) فهرست دپارتمان‌ها
curl -s https://hosha.onrender.com/api/departments | head -c 120
```

اگر `hasGeminiKey:false` بود، یعنی `GEMINI_API_KEY` ذخیره نشده — در تب
Environment مقدارش را بگذارید و **Save Changes** را بزنید (خودش ری‌استارت می‌کند).

سپس در مرورگر `https://hosha.onrender.com` را باز کنید و یک غربالگری کوچک
(۲ تا ۳ رزومه) بزنید تا مسیر کامل AI تست شود.

---

## ۶) محدودیت‌های پلن Free (حتماً بخوانید)

| محدودیت | اثر روی هوشا |
| --- | --- |
| فایل‌سیستم موقتی | با **هر دیپلوی یا ری‌استارت**، پوشهٔ `data/` پاک می‌شود → نتایج غربالگری، بانک رزومه و فایل اصلی رزومه‌ها از بین می‌روند |
| Sleep بعد از ۱۵ دقیقه بی‌کارگی | اولین درخواست ۳۰ تا ۶۰ ثانیه طول می‌کشد (cold start)؛ بعد از آن سریع است |
| ۵۱۲MB رم | برای این اپ کافی است (مصرف واقعی ≈ ۱۲۰MB) |
| ۵۰۰ دقیقه بیلد در ماه | هر بیلد ≈ ۱ تا ۲ دقیقه |

کد طوری نوشته شده که در این شرایط **نمی‌شکند**: اگر پوشه داده قابل نوشتن نباشد،
هشدارش را در لاگ می‌زند و در حافظه کار می‌کند؛ هنگام `SIGTERM` هم اسنپ‌شات را
روی دیسک flush می‌کند.

### ارتقا برای ماندگاری داده‌ها (Starter + دیسک)

در `render.yaml` سه تغییر بدهید:

```yaml
    plan: starter          # به‌جای free
    disk:                  # افزودن این بلوک
      name: hosha-data
      mountPath: /var/data
      sizeGB: 1
```

و این متغیر محیطی را اضافه کنید:

```yaml
      - key: DATA_DIR
        value: /var/data
```

بعد از Apply، داده‌ها بین دیپلوی‌ها و ری‌استارت‌ها حفظ می‌شوند.
(توجه: سرویسی که دیسک دارد نمی‌تواند بیش از یک instance داشته باشد.)

---

## ۷) دامنهٔ اختصاصی (اختیاری)

اگر دامنه‌ای مثل `hosha.example.com` دارید، در `render.yaml` زیر سرویس اضافه کنید:

```yaml
    domains:
      - hosha.example.com
```

و در پنل DNS خودتان یک رکورد **CNAME** بسازید:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `hosha` | `hosha.onrender.com` |

Render خودش گواهی SSL رایگان صادر می‌کند (چند دقیقه تا چند ساعت طول می‌کشد).
برای دامنهٔ ریشه (`example.com`) از رکورد A/ALIAS با IPهایی استفاده کنید که
داشبورد Render نشان می‌دهد.

---

## ۸) عیب‌یابی

| نشانه | علت احتمالی | راه‌حل |
| --- | --- | --- |
| بیلد با `vite: not found` یا `esbuild: not found` می‌شکند | `NODE_ENV=production` باعث شده devDependencies نصب نشوند | Build Command باید حتماً `--include=dev` داشته باشد |
| `Application failed to respond` / پورت اشتباه | سرور به پورت ثابت گوش می‌دهد | کد اصلاح شده: پورت از `process.env.PORT` خوانده می‌شود؛ چیزی را دستی هاردکد نکنید |
| صفحه سفید و در کنسول `404` روی `assets/…` | `dist/` بیلد نشده | در لاگ بیلد باید `✓ built in …` و سپس `dist-server/server.cjs` دیده شود |
| `hasGeminiKey:false` | کلید ست نشده | تب Environment → `GEMINI_API_KEY` |
| خطای `API key not valid` | کلید موقت `AQ.…` یا کلید اشتباه | کلید دائمی `AIza…` بسازید |
| `429 / RESOURCE_EXHAUSTED` | سهمیهٔ رایگان Gemini تمام شده | صبر کنید یا در کنسول Google AI Studio سهمیه/پلن را ارتقا دهید (کد خودش circuit breaker و fallback مدل دارد) |
| همه‌چیز کار می‌کند ولی داده‌ها بعد از دیپلوی gone اند | فایل‌سیستم موقتی پلن free | بخش ۶ → ارتقا به Starter + disk |
| اولین درخواست بعد از مدتی خیلی کند است | cold start پلن free | طبیعی است؛ با پلن پولی حل می‌شود |

لاگ‌های زنده: داشبورد Render → سرویس `hosha` → تب **Logs**.

---

## ۹) اجرا روی کامپیوتر خودتان (برای تست قبل از دیپلوی)

```bash
npm install --include=dev
cp .env.example .env          # سپس GEMINI_API_KEY را داخلش بگذارید

npm run dev                   # حالت توسعه  → http://localhost:3000

npm run build && npm start    # دقیقاً همان چیزی که روی Render اجرا می‌شود
```

برای شبیه‌سازی کامل Render:

```bash
NODE_ENV=production PORT=10000 DATA_DIR=/tmp/hosha-data npm start
# → http://localhost:10000/api/health
```

ریست کامل داده‌های محلی: حذف پوشهٔ `data/`.
