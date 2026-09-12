# پرامپت آماده برای ایجنت (Claude Code / Cursor / …)

کل متن داخل کادر زیر را کپی کنید و به ایجنتی بدهید که هم به **GitHub** شما وصل است
و هم به **اکانت Render** (داشبورد، MCP یا API Key).

> قبل از اجرا فقط یک چیز لازم است: **کلید Gemini** را دم دست داشته باشید
> (`AIza…` از https://aistudio.google.com/apikey). ایجنت در مرحلهٔ ۴ از شما می‌پرسد.

---

## نسخهٔ فارسی (پیشنهادی)

```text
تو مسئول دیپلوی پروژهٔ «هوشا» (Hosha) روی Render هستی.
ریپازیتوری: https://github.com/omidadli/HR-DASHBOARD
هدف نهایی: سرویس زنده روی https://hosha.onrender.com

این پروژه از قبل کاملاً برای Render آماده شده (render.yaml، .node-version،
سرور با process.env.PORT، تفکیک dependencies/devDependencies، مسیر health check).
پس «فقط» کارهای زیر را به‌ترتیب انجام بده و هیچ تغییری در منطق برنامه نده.

────────────────────────────────────────
مرحله ۱ — رساندن کد به برنچ main
────────────────────────────────────────
1. `git remote -v` را چک کن که origin همان ریپوی بالاست.
2. `git fetch origin --prune`
3. برنچ آمادهٔ دیپلوی وجود دارد: `origin/arena/01a094f2-hr-dashboard`
   - اگر وجود داشت:
       git checkout main
       git pull --ff-only origin main
       git merge --no-ff origin/arena/01a094f2-hr-dashboard -m "deploy: ready Hosha for Render (hosha.onrender.com)"
   - اگر وجود نداشت: همین‌جا متوقف شو و به من بگو (خودسرانه فایلی نساز).
4. اگر در working tree فایل تغییر‌یافتهٔ commit‌نشده‌ای هست (به‌جز .env و data/ و dist/)،
   آن‌ها را هم با یک کامیت با پیام `chore: pre-deploy cleanup` اضافه کن.
5. `git push origin main`
6. تأیید کن این فایل‌ها در HEAD برنچ main وجود دارند:
   render.yaml، .node-version، package.json، server.ts، dist-server (نباید commit شده باشد)،
   server/screening-store.ts، src/lib/departments-data.ts

────────────────────────────────────────
مرحله ۲ — بررسی سلامت بیلد (قبل از دیپلوی)
────────────────────────────────────────
   npm install --include=dev --no-audit --no-fund
   npm run typecheck
   npm run build
   node -e "console.log(require('fs').existsSync('dist/index.html') && require('fs').existsSync('dist-server/server.cjs'))"
هر سه باید بدون خطا پاس شوند. اگر جایی شکست، همان‌جا متوقف شو و لاگ را به من نشان بده.
(فایل‌های dist/ و dist-server/ و data/ و .env را هرگز commit نکن.)

────────────────────────────────────────
مرحله ۳ — ساخت سرویس روی Render
────────────────────────────────────────
راه اول (ترجیح من): Blueprint
   لینک: https://dashboard.render.com/blueprint/new?repo=https://github.com/omidadli/HR-DASHBOARD
   نام Blueprint: hosha | برنچ: main | مسیر فایل: render.yaml | سپس Apply

راه دوم: اگر به Render MCP یا API Key دسترسی داری، سرویس را مستقیم بساز.
در هر دو راه، تنظیمات نهایی باید دقیقاً این باشد:

   Name              : hosha
   Type              : Web Service (runtime: node)
   Repo              : https://github.com/omidadli/HR-DASHBOARD.git
   Branch            : main
   Region            : oregon
   Plan              : free
   Build Command     : npm install --include=dev --no-audit --no-fund && npm run build
   Start Command     : npm start
   Health Check Path : /api/health
   Auto-Deploy       : روشن

   Environment Variables:
     NODE_ENV       = production
     NODE_VERSION   = 22.22.0
     GEMINI_API_KEY = <از من بپرس؛ هرگز در ریپو یا در هیچ فایلی ننویس>
     MAX_BODY_MB    = 64
     LOG_REQUESTS   = true

اگر نام `hosha` روی Render گرفته شده بود، همان نام پیشنهادی Render را بپذیر
و آدرس دقیق نهایی را به من بگو (نام سرویس را خودسرانه عوض نکن).

────────────────────────────────────────
مرحله ۴ — کلید Gemini
────────────────────────────────────────
از من بخواه مقدار GEMINI_API_KEY را بدهم. کلید باید با AIza شروع شود.
اگر کلید با AQ. شروع می‌شد، هشدار بده که موقت است و زیر یک ساعت باطل می‌شود.
کلید را فقط در تب Environment سرویس Render ذخیره کن (نه در git، نه در .env داخل ریپو).

────────────────────────────────────────
مرحله ۵ — تأیید دیپلوی
────────────────────────────────────────
صبر کن تا دیپلوی Live شود (لاگ‌ها را دنبال کن)، سپس این‌ها را تست کن:

   curl -s https://hosha.onrender.com/api/health
   → باید status:"ok" برگرداند

   curl -s https://hosha.onrender.com/api/screening/health
   → باید hasGeminiKey:true باشد

   curl -s https://hosha.onrender.com/api/departments
   → باید آرایهٔ ۱۲ دپارتمان برگرداند

   curl -s -o /dev/null -w "%{http_code}\n" https://hosha.onrender.com/
   → باید 200 باشد

اگر hasGeminiKey:false بود، متغیر را در Render اصلاح کن و Manual Deploy بزن.
اگر بیلد شکست، ۳۰ خط آخر لاگ بیلد را برایم بیاور و حدس نزن.

────────────────────────────────────────
مرحله ۶ — گزارش نهایی به من
────────────────────────────────────────
این‌ها را خلاصه report کن:
   • آدرس سرویس (URL دقیق)
   • لینک داشبورد Render سرویس
   • commit SHA که دیپلوی شد
   • نتیجهٔ هر ۴ تست مرحلهٔ ۵
   • هر هشدار یا خطایی که در لاگ دیدی

قانون‌های سخت:
   ✗ هیچ فایلی از برنامه (server.ts، src/، vite.config.ts، package.json) را تغییر نده؛
     فقط دیپلوی کن. اگر چیزی لازم دیدی، اول به من بگو.
   ✗ هیچ secret را در git commit نکن.
   ✗ پلن را به paid تغییر نده (من free انتخاب کرده‌ام).
   ✗ دیسک (disk) اضافه نکن؛ روی پلن free پشتیبانی نمی‌شود.
```

---

## English version (اگر ایجنت با انگلیسی بهتر کار می‌کند)

```text
You are deploying the "Hosha" project to Render.
Repo: https://github.com/omidadli/HR-DASHBOARD
Target: a live service at https://hosha.onrender.com

The repo is ALREADY Render-ready (render.yaml, .node-version, server reads
process.env.PORT, deps split, /api/health endpoint). Your job is ONLY to ship it.
Do not modify application logic.

STEP 1 — Get the code onto main
  git fetch origin --prune
  If origin/arena/01a094f2-hr-dashboard exists:
      git checkout main && git pull --ff-only origin main
      git merge --no-ff origin/arena/01a094f2-hr-dashboard \
        -m "deploy: ready Hosha for Render (hosha.onrender.com)"
  Otherwise: STOP and tell me (do not invent files).
  Commit any other pending working-tree changes (never .env, data/, dist/),
  then: git push origin main
  Verify render.yaml, .node-version, server.ts, src/lib/departments-data.ts exist on main.

STEP 2 — Sanity build locally
  npm install --include=dev --no-audit --no-fund
  npm run typecheck
  npm run build
  Confirm dist/index.html and dist-server/server.cjs exist. Stop on any error.

STEP 3 — Create the Render service (prefer the Blueprint)
  https://dashboard.render.com/blueprint/new?repo=https://github.com/omidadli/HR-DASHBOARD
  Blueprint name: hosha | branch: main | file path: render.yaml | Apply
  Required final settings:
    name=hosha, type=Web Service, runtime=node, repo=...HR-DASHBOARD.git, branch=main,
    region=oregon, plan=free,
    buildCommand="npm install --include=dev --no-audit --no-fund && npm run build",
    startCommand="npm start", healthCheckPath="/api/health", autoDeploy=on
    env: NODE_ENV=production, NODE_VERSION=22.22.0, GEMINI_API_KEY=<ask me>,
         MAX_BODY_MB=64, LOG_REQUESTS=true
  If "hosha" is already taken, accept Render's generated subdomain and report it.

STEP 4 — Ask me for GEMINI_API_KEY (must start with AIza). Store it ONLY in the
  Render dashboard env vars. Never write it to git or to any repo file.

STEP 5 — Verify after the deploy goes Live
  curl -s https://hosha.onrender.com/api/health              → status ok
  curl -s https://hosha.onrender.com/api/screening/health    → hasGeminiKey true
  curl -s https://hosha.onrender.com/api/departments         → 12 departments
  curl -s -o /dev/null -w "%{http_code}\n" https://hosha.onrender.com/  → 200
  If hasGeminiKey is false, fix the env var and trigger a Manual Deploy.
  If the build fails, show me the last 30 log lines instead of guessing.

STEP 6 — Report: service URL, Render dashboard link, deployed commit SHA,
  the 4 verification results, and any warnings from the logs.

HARD RULES: do not edit app source files; do not commit secrets; keep plan=free;
do not attach a disk (unsupported on the free plan).
```

---

## اگر `hosha.onrender.com` گرفته شده بود

Render اجازه نمی‌دهد دو سرویس ساب‌دامین یکسان داشته باشند. در این صورت:

1. همان آدرسی که Render می‌سازد (مثلاً `hosha-7x2k.onrender.com`) را بپذیرید، یا
2. یک دامنهٔ اختصاصی اضافه کنید (بخش ۷ در [`DEPLOYMENT.md`](./DEPLOYMENT.md)) —
   با دامنهٔ شخصی، اسم `hosha` صددرصد در آدرس شما خواهد بود:
   `https://hosha.دامنه‌شما.com`
