/**
 * هوشا (Hosha) — Seilaneh Sabz smart resume screening server.
 *
 * One Node process serves both:
 *   • the JSON API  (/api/…)
 *   • the built React SPA (dist/) in production, or the Vite dev server
 *     (middleware mode) during development.
 *
 * Deployment notes (Render / any 12-factor host):
 *   • the port is read from process.env.PORT (Render injects it);
 *   • data lives in DATA_DIR (default: ./data) — mount a persistent disk
 *     there if your host has an ephemeral filesystem;
 *   • SIGTERM flushes the JSON snapshot before the process exits.
 */
import compression from 'compression';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { DEPARTMENTS_DATA, isKnownDepartment } from './src/lib/departments-data';
import {
  calibrateV2,
  draftMessageV2,
  evaluateResumeV2,
  understandJobV2,
} from './server/screening-gemini';
import * as store from './server/screening-store';
import type {
  CandidateEvaluation,
  JobUnderstanding,
  MessageKind,
  Recommendation,
  ScreeningAnswers,
} from './src/types/screening';

dotenv.config({ override: true });

const APP_NAME = 'هوشا — دستیار هوشمند غربالگری رزومه';
const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  rtf: 'application/rtf',
  md: 'text/markdown',
  zip: 'application/zip',
};

function recommendationForScore(score: number, u: JobUnderstanding): Recommendation {
  if (score >= u.thresholds.interview) return 'INTERVIEW';
  if (score >= u.thresholds.review) return 'REVIEW';
  return 'REJECT';
}

/**
 * Multi-user scoping: the client sends its local account id as x-user-id.
 * Sanitized to a safe, short token; '' when absent (legacy/shared access).
 */
function requestUserId(req: express.Request): string {
  const raw = req.headers['x-user-id'];
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string') return '';
  return v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

function numEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Build-time stamp so /api/health can prove which deploy is running. */
const BUILD_INFO = {
  node: process.version,
  startedAt: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
  region: process.env.RENDER_REGION || '',
  service: process.env.RENDER_SERVICE_NAME || '',
};

async function createApp(): Promise<express.Express> {
  await store.initStore();
  const app = express();

  // Render terminates TLS at its load balancer and proxies to us over HTTP;
  // trust it so req.secure / req.ip are correct behind the proxy.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Gzip JSON + static assets: the SPA bundle is ~1.4 MB raw / ~390 KB gzipped,
  // which matters a lot for users on slow international links.
  app.use(compression());

  // Baseline security headers (Render already forces HTTPS → we add HSTS too).
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Lightweight request log (Render logs are the only observability we have).
  // Disabled for the health check and static assets to keep the noise down.
  if (process.env.LOG_REQUESTS !== 'false') {
    app.use((req, res, next) => {
      const started = Date.now();
      res.on('finish', () => {
        if (req.path === '/api/health') return;
        if (!req.path.startsWith('/api')) return;
        console.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - started}ms)`);
      });
      next();
    });
  }

  // Resumes arrive base64-encoded inside JSON; keep the cap generous but
  // bounded so a huge upload cannot OOM a 512 MB instance.
  app.use(express.json({ limit: `${numEnv('MAX_BODY_MB', 64)}mb` }));

  // ---------------- Health & meta ----------------
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      app: APP_NAME,
      uptimeSeconds: Math.round(process.uptime()),
      ...BUILD_INFO,
    });
  });

  app.get('/api/screening/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    });
  });

  app.get('/api/departments', (_req, res) => {
    res.json(DEPARTMENTS_DATA.map((d) => ({ id: d.id, name: d.name, hint: d.hint })));
  });

  // ---------------- Pass 0: understand job + questionnaire ----------------
  app.post('/api/screening/understand', async (req, res) => {
    try {
      const { departmentId, roleTitle, extraNotes } = req.body || {};
      if (!isKnownDepartment(departmentId)) {
        return res.status(400).json({ error: 'دپارتمان را انتخاب کنید' });
      }
      const understanding = await understandJobV2(
        String(departmentId),
        String(roleTitle || ''),
        String(extraNotes || '')
      );
      res.json(understanding);
    } catch (err: any) {
      console.error('understand failed:', err?.message);
      res.status(503).json({ error: err?.message || 'خطا در تحلیل شغل با هوش مصنوعی' });
    }
  });

  // ---------------- Batch lifecycle ----------------
  app.post('/api/screening/batches', (req, res) => {
    try {
      const { departmentId, roleTitle, extraNotes, understanding, answers } = req.body || {};
      const dept = DEPARTMENTS_DATA.find((d) => d.id === departmentId);
      if (!dept || !understanding || !Array.isArray(understanding.criteria)) {
        return res.status(400).json({ error: 'اطلاعات شغل ناقص است' });
      }
      const batch = store.createBatch({
        departmentId: dept.id,
        departmentName: dept.name,
        roleTitle: String(roleTitle || ''),
        extraNotes: String(extraNotes || ''),
        understanding: understanding as JobUnderstanding,
        answers: (answers || {}) as ScreeningAnswers,
        userId: requestUserId(req) || undefined,
      });
      res.json(batch);
    } catch (err: any) {
      console.error('create batch failed:', err);
      res.status(500).json({ error: 'ثبت نشست غربالگری ممکن نشد' });
    }
  });

  app.get('/api/screening/batches', (req, res) => {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    // Scope "recent sessions" to the requester so users don't see each
    // other's screening history.
    res.json(store.listRecentBatches(limit, requestUserId(req) || undefined));
  });

  app.get('/api/screening/batches/:id', (req, res) => {
    const batch = store.getBatch(req.params.id);
    // An owned batch is only visible to its owner; unowned (legacy) batches
    // stay shared.
    if (!batch || (batch.userId && batch.userId !== requestUserId(req))) {
      return res.status(404).json({ error: 'نشست غربالگری یافت نشد' });
    }
    res.json({ batch, resumes: store.listBatchResumes(req.params.id) });
  });

  app.delete('/api/screening/batches/:id', (req, res) => {
    const ok = store.deleteBatch(req.params.id, requestUserId(req) || undefined);
    if (!ok) {
      return res.status(404).json({ error: 'نشست غربالگری یافت نشد' });
    }
    res.json({ ok: true });
  });

  // ---------------- Evaluate one resume ----------------
  app.post('/api/screening/batches/:id/evaluate', async (req, res) => {
    try {
      const batch = store.getBatch(req.params.id);
      if (!batch) return res.status(404).json({ error: 'نشست یافت نشد' });
      const { fileName, extractedText, unjudgeableReason, fileBase64, errorMessage } = req.body || {};
      if (!fileName) return res.status(400).json({ error: 'نام فایل الزامی است' });

      let evaluation: CandidateEvaluation | undefined;
      let reason: string | null = unjudgeableReason ? String(unjudgeableReason) : null;

      if (!reason && !errorMessage) {
        const text = String(extractedText || '');
        const ext = String(fileName).split('.').pop()?.toLowerCase() || '';
        const mimeMap: Record<string, string> = {
          pdf: 'application/pdf',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
        };
        // Multimodal (vision) is only valid for real PDF/image payloads — text
        // formats (docx/txt/…) must not be sent to the vision path with a fake
        // PDF mime type.
        const mimeType = mimeMap[ext];

        evaluation = await evaluateResumeV2(
          batch.departmentName,
          batch.roleTitle,
          batch.extraNotes,
          batch.understanding,
          batch.answers,
          text,
          String(fileName),
          typeof fileBase64 === 'string' && fileBase64.length > 50 ? fileBase64 : undefined,
          mimeType
        );
        if (evaluation.flags.scannedNoText) {
          reason = 'فایل رزومه فاقد محتوای خواندنی است (فایل خالی، اسکن ناخوانا یا تصویر بدون متن)';
        }
      }

      const record = await store.saveEvaluation({
        batchId: batch.id,
        fileName: String(fileName),
        extractedText: String(extractedText || ''),
        unjudgeableReason: reason,
        fileBase64: typeof fileBase64 === 'string' ? fileBase64 : undefined,
        evaluation,
        errorMessage: errorMessage ? String(errorMessage) : undefined,
      });
      res.json({ record, stats: store.getBatch(batch.id)?.stats });
    } catch (err: any) {
      console.error('evaluate failed:', err?.message);
      // Keep the failed file visible in the results: persist an ERROR record
      // (the store + results UI already support it) instead of letting it
      // silently vanish from the batch. If persistence itself fails, fall back
      // to the previous 500 response.
      try {
        const batch = store.getBatch(req.params.id);
        const { fileName, extractedText, fileBase64 } = req.body || {};
        if (batch && fileName) {
          const record = await store.saveEvaluation({
            batchId: batch.id,
            fileName: String(fileName),
            extractedText: String(extractedText || ''),
            unjudgeableReason: null,
            fileBase64: typeof fileBase64 === 'string' ? fileBase64 : undefined,
            errorMessage: err?.message || 'خطا در تحلیل',
          });
          return res.json({ record, stats: store.getBatch(batch.id)?.stats });
        }
      } catch (saveErr: any) {
        console.error('saving ERROR record failed:', saveErr?.message);
      }
      res.status(500).json({ error: err?.message || 'خطا در ارزیابی رزومه' });
    }
  });

  // ---------------- Pass 2: calibration ----------------
  app.post('/api/screening/batches/:id/calibrate', async (req, res) => {
    try {
      const batch = store.getBatch(req.params.id);
      if (!batch) return res.status(404).json({ error: 'نشست یافت نشد' });

      const pool = store
        .listBatchResumes(batch.id)
        .filter((r) => r.category === 'INTERVIEW' || r.category === 'REVIEW' || r.category === 'REJECT');

      if (pool.length > 1) {
        const sorted = [...pool].sort((a, b) => b.score - a.score);
        const chosen = new Map<string, (typeof sorted)[number]>();
        sorted.slice(0, 15).forEach((r) => chosen.set(r.id, r));
        for (const r of sorted) {
          if (
            Math.abs(r.score - batch.understanding.thresholds.interview) <= 5 ||
            Math.abs(r.score - batch.understanding.thresholds.review) <= 5
          ) {
            chosen.set(r.id, r);
          }
        }
        const adjustments = await calibrateV2(
          batch.understanding,
          Array.from(chosen.values()).map((r) => ({
            id: r.id,
            name: r.candidateName || r.fileName,
            score: r.score,
            summary: r.summary,
          }))
        );
        for (const r of chosen.values()) {
          if (adjustments[r.id] !== undefined) {
            r.score = adjustments[r.id];
            r.recommendation = recommendationForScore(r.score, batch.understanding);
            r.category = r.recommendation;
          }
        }
      }

      const updated = store.recomputeBatch(batch.id);
      res.json({ batch: updated, resumes: store.listBatchResumes(batch.id), stats: updated?.stats });
    } catch (err: any) {
      console.error('calibrate failed:', err);
      res.status(500).json({ error: 'کالیبراسیون ممکن نشد' });
    }
  });

  // ---------------- Per-resume actions ----------------
  app.post('/api/resumes/:id/rerun', async (req, res) => {
    try {
      const rec = store.getResume(req.params.id);
      if (!rec || rec.deleted) return res.status(404).json({ error: 'رزومه یافت نشد' });
      const batch = store.getBatch(rec.batchId);
      if (!batch) return res.status(404).json({ error: 'نشست یافت نشد' });

      const evaluation = await evaluateResumeV2(
        batch.departmentName,
        batch.roleTitle,
        batch.extraNotes,
        batch.understanding,
        batch.answers,
        rec.extractedText,
        rec.fileName
      );
      const updatedRec = store.updateResumeEvaluation(rec.id, evaluation);
      const updatedBatch = store.recomputeBatch(batch.id);
      res.json({ record: updatedRec, stats: updatedBatch?.stats });
    } catch (err: any) {
      console.error('rerun failed:', err?.message);
      res.status(500).json({ error: err?.message || 'بررسی مجدد ممکن نشد' });
    }
  });

  app.patch('/api/resumes/:id', (req, res) => {
    const rec = store.getResume(req.params.id);
    if (!rec || rec.deleted) return res.status(404).json({ error: 'رزومه یافت نشد' });
    const { action } = req.body || {};
    if (action === 'delete') {
      store.softDeleteResume(rec.id);
      const batch = store.getBatch(rec.batchId);
      return res.json({ ok: true, stats: batch?.stats });
    }
    if (action === 'message-sent') {
      return res.json({ record: store.markMessageSent(rec.id) });
    }
    res.status(400).json({ error: 'عملیات نامعتبر است' });
  });

  app.post('/api/resumes/:id/bank', (req, res) => {
    const rec = store.getResume(req.params.id);
    if (!rec || rec.deleted) return res.status(404).json({ error: 'رزومه یافت نشد' });
    const { bankDepartmentId, note, tags } = req.body || {};
    if (!isKnownDepartment(bankDepartmentId)) {
      return res.status(400).json({ error: 'دپارتمان مقصد نامعتبر است' });
    }
    const allTags = [...(Array.isArray(tags) ? tags.map(String) : []), ...rec.tags.map(String)];
    const updated = store.addToBank(rec.id, String(bankDepartmentId), String(note || ''), allTags);
    res.json({ record: updated });
  });

  app.delete('/api/resumes/:id/bank', (req, res) => {
    const rec = store.getResume(req.params.id);
    if (!rec) return res.status(404).json({ error: 'رزومه یافت نشد' });
    res.json({ record: store.removeFromBank(rec.id) });
  });

  app.get('/api/resumes/:id/file', (req, res) => {
    const rec = store.getResume(req.params.id);
    if (!rec || !rec.filePath) return res.status(404).json({ error: 'فایل در دسترس نیست' });
    const full = store.getResumeFilePath(rec.filePath);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
    const ext = rec.filePath.split('.').pop() || 'bin';
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(rec.fileName)}`
    );
    fs.createReadStream(full).pipe(res);
  });

  // ---------------- Messages ----------------
  app.post('/api/messages/draft', async (req, res) => {
    try {
      const { resumeId, kind } = req.body || {};
      const validKinds: MessageKind[] = ['INTERVIEW_INVITE', 'INFO_REQUEST', 'BANK_NOTICE'];
      if (!validKinds.includes(kind)) return res.status(400).json({ error: 'نوع پیام نامعتبر است' });
      const rec = store.getResume(resumeId);
      if (!rec || rec.deleted) return res.status(404).json({ error: 'رزومه یافت نشد' });
      const draft = await draftMessageV2(rec, kind);
      res.json(draft);
    } catch (err: any) {
      res.status(500).json({ error: 'تهیه پیش‌نویس پیام ممکن نشد' });
    }
  });

  // ---------------- Talent bank ----------------
  app.get('/api/bank/departments', (req, res) => {
    const uid = requestUserId(req) || undefined;
    res.json({ departments: store.bankDepartmentCounts(uid), tags: store.bankTags(uid) });
  });

  app.get('/api/bank/departments/:id/batches', (req, res) => {
    if (!isKnownDepartment(req.params.id)) {
      return res.status(404).json({ error: 'دپارتمان نامعتبر است' });
    }
    res.json({ batches: store.departmentBankBatches(req.params.id, requestUserId(req) || undefined) });
  });

  app.get('/api/bank/departments/:id/resumes', (req, res) => {
    if (!isKnownDepartment(req.params.id)) {
      return res.status(404).json({ error: 'دپارتمان نامعتبر است' });
    }
    const f = req.query;
    const rawTags = f.tags ? String(f.tags).split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const result = store.listBankResumes(req.params.id, {
      userId: requestUserId(req) || undefined,
      query: f.query ? String(f.query) : undefined,
      minScore: f.minScore ? Number(f.minScore) : undefined,
      minYears: f.minYears ? Number(f.minYears) : undefined,
      tag: f.tag ? String(f.tag) : undefined,
      tags: rawTags,
      batchId: f.batchId ? String(f.batchId) : undefined,
      since: (['all', 'week', 'month'].includes(String(f.since)) ? String(f.since) : 'all') as
        | 'all'
        | 'week'
        | 'month',
      sort: (['newest', 'score', 'experience'].includes(String(f.sort)) ? String(f.sort) : 'newest') as
        | 'newest'
        | 'score'
        | 'experience',
      page: f.page ? Number(f.page) : 1,
      pageSize: 10,
    });
    res.json(result);
  });

  app.get('/api/bank/search', (req, res) => {
    res.json({ items: store.globalBankSearch(String(req.query.q || ''), 20, requestUserId(req) || undefined) });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'مسیر API یافت نشد' }));

  // Never leak build artefacts (server bundle, source maps) as static files.
  app.use((req, res, next) => {
    if (/\.(cjs|map)$/.test(req.path)) return res.status(404).end();
    next();
  });

  // ---------------- Frontend ----------------
  if (process.env.NODE_ENV !== 'production') {
    // Dev only — imported lazily so a production runtime does not need Vite.
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[server] Vite dev middleware فعال است.');
  } else {
    const distPath = process.env.DIST_DIR
      ? path.resolve(process.env.DIST_DIR)
      : path.join(process.cwd(), 'dist');

    if (!fs.existsSync(path.join(distPath, 'index.html'))) {
      console.error(
        `[server] فایل ${path.join(distPath, 'index.html')} پیدا نشد. ` +
          'ابتدا «npm run build» را اجرا کنید (یا NODE_ENV را از production تغییر دهید).'
      );
    }

    // Hashed build artefacts are immutable → cache hard; index.html never.
    app.use(
      express.static(distPath, {
        index: 'index.html',
        maxAge: '7d',
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          } else if (/[/-]\w{8,}\.(js|mjs|css|svg|png|jpg|woff2?)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    // SPA fallback (Express 4 wildcard).
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'), (err) => {
        if (err) res.status(500).send('خطا در بارگذاری اپلیکیشن');
      });
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  });

  return app;
}

async function startServer() {
  const app = await createApp();

  // Render injects PORT (usually 10000); AI Studio's proxy expects 3000.
  const PORT = numEnv('PORT', 3000);
  const server = app.listen(PORT, '0.0.0.0', () => {
    const publicUrl = process.env.RENDER_EXTERNAL_URL;
    console.log(`${APP_NAME} روی پورت ${PORT} آماده است.`);
    console.log(`[server] env=${BUILD_INFO.env} node=${BUILD_INFO.node} dataDir=${store.dataDir()}`);
    if (publicUrl) console.log(`[server] آدرس عمومی: ${publicUrl}`);
    if (!process.env.GEMINI_API_KEY?.trim()) {
      console.warn(
        '[هشدار] GEMINI_API_KEY تنظیم نشده است — پرسش‌نامه و تحلیل هوشمند کار نمی‌کند. ' +
          'یک کلید دائمی (با پیشوند AIza) از https://aistudio.google.com/apikey بسازید.'
      );
    } else if (process.env.GEMINI_API_KEY.trim().startsWith('AQ.')) {
      console.warn(
        '[هشدار] مقدار GEMINI_API_KEY یک توکن موقت (ephemeral) است و معمولاً کمتر از یک ساعت اعتبار دارد. ' +
          'برای استفاده دائمی یک کلید API دائمی با پیشوند AIza از https://aistudio.google.com/apikey بسازید.'
      );
    }
  });

  // Cloud load balancers close idle keep-alive connections; keep the server's
  // own timeouts slightly longer than the proxy's to avoid spurious 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  // ---------------- Graceful shutdown ----------------
  // Render sends SIGTERM before killing/redeploying an instance. The store
  // debounces its JSON snapshot by 400 ms, so without this the last changes
  // (and freshly uploaded resume files) would be lost.
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[server] ${signal} دریافت شد — در حال ذخیره داده‌ها و بستن سرور…`);

    const forceExit = setTimeout(() => {
      console.error('[server] خاموش‌شدن به‌موقع کامل نشد؛ خروج اجباری.');
      process.exit(1);
    }, 9_000);
    forceExit.unref?.();

    // Flush first (do not wait for sockets to drain).
    void store
      .flushStore()
      .catch((err) => console.error('[server] flush failed:', err?.message))
      .finally(() => {
        server.close(() => {
          clearTimeout(forceExit);
          console.log('[server] بسته شد. خدانگهدار 👋');
          process.exit(0);
        });
      });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    console.error('[server] unhandledRejection:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[server] uncaughtException:', err);
    shutdown('uncaughtException');
  });
}

startServer().catch((err) => {
  console.error('[server] راه‌اندازی ناموفق بود:', err);
  process.exit(1);
});
