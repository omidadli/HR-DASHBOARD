/**
 * Seilaneh Sabz — Smart Resume Screening server.
 * Express API (screening + talent bank) with Vite dev middleware.
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { DEPARTMENTS } from './src/lib/departments';
import {
  calibrateV2,
  computeStats,
  draftMessageV2,
  evaluateResumeV2,
  resetCircuitBreaker,
  understandJobV2,
} from './server/screening-gemini';
import * as store from './server/screening-store';
import { seedDemoData } from './server/demo-seed';
import type {
  AnalysisMode,
  CandidateEvaluation,
  DecisionFilters,
  DecisionStatus,
  DecidedStatus,
  JobUnderstanding,
  MessageKind,
  Recommendation,
  ScreeningAnswers,
} from './src/types/screening';

dotenv.config({ override: true });

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  txt: 'text/plain',
  rtf: 'application/rtf',
  md: 'text/markdown',
  zip: 'application/zip',
  // Image resumes are previewed in-app («مشاهده تحلیل و رزومه»), so they need
  // a real content type instead of the octet-stream fallback.
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

const RESUME_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  gif: 'image/gif',
};

/** Best-effort mime type for a stored resume (extension first, magic bytes second). */
function detectResumeMime(fileName: string, base64?: string): string | undefined {
  const ext = String(fileName).split('.').pop()?.toLowerCase() || '';
  const byExt = RESUME_MIME[ext];
  if (byExt) return byExt;
  if (!base64) return undefined;
  if (base64.startsWith('JVBERi0')) return 'application/pdf';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64.startsWith('UklGR')) return 'image/webp';
  if (base64.includes('ftypheic')) return 'image/heic';
  return undefined;
}

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
  const raw = req.headers['x-user-id'] || req.query.uid;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== 'string') return '';
  return v.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
}

async function startServer() {
  await store.initStore();
  const app = express();
  // 30mb is far above any real resume (the client caps inline attachments at
  // 12mb) and keeps a single oversized request from stalling the event loop.
  app.use(express.json({ limit: '30mb' }));
  // A rejected body (too large / malformed) must come back as JSON; otherwise
  // the client's res.json() fails and the user sees a meaningless failure.
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!err) return next();
    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        error: 'حجم درخواست بیش از حد مجاز است. هر رزومه حداکثر ۲۰ مگابایت؛ فایل بزرگ‌تر را فشرده یا تبدیل کنید.',
      });
    }
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
      return res.status(400).json({ error: 'درخواست قابل خواندن نیست' });
    }
    return next(err);
  });

  // ---------------- Health & meta ----------------
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Seilaneh Sabz Resume Screener' });
  });

  app.get('/api/screening/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()),
    });
  });

  app.get('/api/departments', (_req, res) => {
    res.json(
      DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, hint: d.hint }))
    );
  });

  // ---------------- Pass 0: understand job + questionnaire ----------------
  app.post('/api/screening/understand', async (req, res) => {
    try {
      const { departmentId, roleTitle, extraNotes } = req.body || {};
      if (!departmentId || !DEPARTMENTS.some((d) => d.id === departmentId)) {
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
      const dept = DEPARTMENTS.find((d) => d.id === departmentId);
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
    const batch = store.getBatchForUser(req.params.id, requestUserId(req));
    if (!batch) {
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
      const batch = store.getBatchForUser(req.params.id, requestUserId(req));
      if (!batch) return res.status(404).json({ error: 'نشست یافت نشد' });
      const { fileName, extractedText, unjudgeableReason, fileBase64, errorMessage } = req.body || {};
      if (!fileName) return res.status(400).json({ error: 'نام فایل الزامی است' });

      let evaluation: CandidateEvaluation | undefined;
      let reason: string | null = null;

      // If we have file data or extracted text, always attempt evaluation!
      const hasData =
        (typeof fileBase64 === 'string' && fileBase64.length > 50) ||
        (typeof extractedText === 'string' && extractedText.trim().length > 0);

      if (hasData && !errorMessage) {
        let text = String(extractedText || '');
        const ext = String(fileName).split('.').pop()?.toLowerCase() || '';

        // If it's a Word document or text file and extractedText is sparse, attempt server extraction from buffer
        if ((!text || text.trim().length < 30) && typeof fileBase64 === 'string' && fileBase64.length > 50) {
          try {
            const buf = Buffer.from(fileBase64, 'base64');
            if (ext === 'docx') {
              const mammoth = await import('mammoth');
              const mRes = await mammoth.extractRawText({ buffer: buf });
              if (mRes?.value && mRes.value.trim().length > 10) {
                text = mRes.value.trim();
              }
            } else if (['txt', 'rtf', 'md', 'text', 'csv', 'log'].includes(ext)) {
              text = buf.toString('utf8').trim();
            }
          } catch (serverExtractErr) {
            console.warn('Server fallback extraction error:', serverExtractErr);
          }
        }

        const mimeMap: Record<string, string> = {
          pdf: 'application/pdf',
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          webp: 'image/webp',
          heic: 'image/heic',
          heif: 'image/heif',
          bmp: 'image/bmp',
          tiff: 'image/tiff',
          tif: 'image/tiff',
          gif: 'image/gif',
        };
        let mimeType = mimeMap[ext];
        if (!mimeType && typeof fileBase64 === 'string') {
          if (fileBase64.startsWith('JVBERi0')) mimeType = 'application/pdf';
          else if (fileBase64.startsWith('/9j/')) mimeType = 'image/jpeg';
          else if (fileBase64.startsWith('iVBORw0KGgo')) mimeType = 'image/png';
          else if (fileBase64.startsWith('UklGR')) mimeType = 'image/webp';
          else if (fileBase64.includes('ftypheic')) mimeType = 'image/heic';
        }

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
      } else if (unjudgeableReason) {
        reason = String(unjudgeableReason);
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
        const batch = store.getBatchForUser(req.params.id, requestUserId(req));
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
      const batch = store.getBatchForUser(req.params.id, requestUserId(req));
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
  /**
   * Shared implementation of «بررسی مجدد» (fast pass) and «بازبینی» (deep pass).
   * Deep mode sends the original file as well as the extracted text, gives the
   * model a much bigger budget and asks for extra findings (see EvaluateOptions).
   */
  async function rerunResumeHandler(
    req: express.Request,
    res: express.Response,
    mode: AnalysisMode
  ) {
    try {
      const rec = store.getResumeForUser(req.params.id, requestUserId(req));
      if (!rec || rec.deleted) return res.status(404).json({ error: 'رزومه یافت نشد' });
      const batch = store.getBatch(rec.batchId);
      if (!batch) return res.status(404).json({ error: 'نشست یافت نشد' });

      resetCircuitBreaker();
      const fileData = await store.getResumeFileBase64(rec.id);
      const mimeType = detectResumeMime(rec.fileName, fileData?.base64);

      const evaluation = await evaluateResumeV2(
        batch.departmentName,
        batch.roleTitle,
        batch.extraNotes,
        batch.understanding,
        batch.answers,
        rec.extractedText,
        rec.fileName,
        fileData?.base64,
        mimeType,
        { mode }
      );
      const updatedRec = store.updateResumeEvaluation(
        rec.id,
        evaluation,
        mode === 'deep' ? 'deep' : 'rerun'
      );
      const updatedBatch = store.recomputeBatch(batch.id);
      // `engine` lets the client be honest when هوشا was unavailable and the
      // local keyword engine answered instead of a real deep review.
      res.json({ record: updatedRec, stats: updatedBatch?.stats, mode, engine: evaluation.engine });
    } catch (err: any) {
      console.error(`${mode} rerun failed:`, err?.message);
      res.status(500).json({
        error: err?.message || (mode === 'deep' ? 'بازبینی دقیق ممکن نشد' : 'بررسی مجدد ممکن نشد'),
      });
    }
  }

  app.post('/api/resumes/:id/rerun', (req, res) => rerunResumeHandler(req, res, 'standard'));

  /** «بازبینی» — the user asks هوشا to re-read this resume carefully. */
  app.post('/api/resumes/:id/deep-rerun', (req, res) => rerunResumeHandler(req, res, 'deep'));

  app.patch('/api/resumes/:id', (req, res) => {
    const rec = store.getResumeForUser(req.params.id, requestUserId(req));
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
    if (action === 'decision') {
      const status = String(req.body?.status || '') as DecisionStatus;
      const allowed: DecisionStatus[] = ['approved', 'rejected', 'review', 'none'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: 'وضعیت تصمیم نامعتبر است' });
      }
      const note = typeof req.body?.note === 'string' ? req.body.note : null;
      const updated = store.setDecision(rec.id, status, note);
      const batch = store.getBatch(rec.batchId);
      return res.json({ record: updated, stats: batch?.stats });
    }
    res.status(400).json({ error: 'عملیات نامعتبر است' });
  });

  app.post('/api/resumes/:id/bank', (req, res) => {
    const rec = store.getResumeForUser(req.params.id, requestUserId(req));
    if (!rec || rec.deleted) return res.status(404).json({ error: 'رزومه یافت نشد' });
    const { bankDepartmentId, note, tags } = req.body || {};
    if (!DEPARTMENTS.some((d) => d.id === bankDepartmentId)) {
      return res.status(400).json({ error: 'دپارتمان مقصد نامعتبر است' });
    }
    const allTags = [
      ...(Array.isArray(tags) ? tags.map(String) : []),
      ...rec.tags.map(String),
    ];
    const updated = store.addToBank(rec.id, bankDepartmentId, String(note || ''), allTags);
    res.json({ record: updated });
  });

  app.delete('/api/resumes/:id/bank', (req, res) => {
    const rec = store.getResumeForUser(req.params.id, requestUserId(req));
    if (!rec) return res.status(404).json({ error: 'رزومه یافت نشد' });
    res.json({ record: store.removeFromBank(rec.id) });
  });

  app.post('/api/resumes/:id/file', async (req, res) => {
    try {
      const rec = store.getResumeForUser(req.params.id, requestUserId(req));
      if (!rec) return res.status(404).json({ error: 'رزومه یافت نشد' });
      const { fileBase64, fileName } = req.body || {};
      if (!fileBase64) return res.status(400).json({ error: 'محتوای فایل الزامی است' });
      const filePath = await store.attachResumeFile(rec.id, fileName || rec.fileName, String(fileBase64));
      res.json({ ok: true, filePath });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'خطا در پیوست فایل رزومه' });
    }
  });

  app.get('/api/resumes/:id/file', (req, res) => {
    const uid = requestUserId(req);
    const rec = store.getResumeForUser(req.params.id, uid) || store.getResume(req.params.id);
    if (!rec || !rec.filePath) return res.status(404).json({ error: 'فایل در دسترس نیست' });
    const full = store.getResumeFilePath(rec.filePath);
    if (!fs.existsSync(full)) return res.status(404).json({ error: 'فایل روی سرور موجود نیست' });
    const ext = rec.filePath.split('.').pop() || 'bin';
    // ?inline=1 powers the in-app resume preview («مشاهده تحلیل و رزومه»);
    // without it the browser downloads the original file.
    const inline = String(req.query.inline || '') === '1';
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(rec.fileName)}`
    );
    if (inline) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, max-age=300');
    }
    fs.createReadStream(full).pipe(res);
  });

  /** Preview metadata so the client knows whether the file can be rendered in-app. */
  app.get('/api/resumes/:id/file-info', (req, res) => {
    const uid = requestUserId(req);
    const rec = store.getResumeForUser(req.params.id, uid) || store.getResume(req.params.id);
    if (!rec) return res.status(404).json({ error: 'رزومه یافت نشد' });
    const ext = (rec.filePath || rec.fileName).split('.').pop()?.toLowerCase() || 'bin';
    res.json({
      hasFile: Boolean(rec.filePath),
      fileName: rec.fileName,
      ext,
      mimeType: MIME[ext] || 'application/octet-stream',
      previewable: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext),
    });
  });

  // ---------------- Decisions workspace (تایید / رد / نیاز به بررسی) ----------------
  app.get('/api/decisions/meta', (req, res) => {
    const userId = requestUserId(req);
    if (!userId) return res.status(401).json({ error: 'شناسه کاربر ارسال نشد' });
    const base: DecisionFilters = { userId };
    res.json({
      counts: store.decisionCounts(base),
      positions: store.decisionPositions(base),
      departments: store.decisionDepartments(userId),
      knownRoles: store.knownRoleTitles(userId),
    });
  });

  app.get('/api/decisions/resumes', (req, res) => {
    const userId = requestUserId(req);
    if (!userId) return res.status(401).json({ error: 'شناسه کاربر ارسال نشد' });
    const q = req.query;
    const statusRaw = String(q.status || 'approved');
    const status: DecidedStatus = (['approved', 'rejected', 'review'].includes(statusRaw)
      ? statusRaw
      : 'approved') as DecidedStatus;
    const sortRaw = String(q.sort || 'newest');
    const result = store.listDecisionResumes({
      userId,
      status,
      departmentId: q.departmentId ? String(q.departmentId) : undefined,
      roleTitle: q.roleTitle ? String(q.roleTitle) : undefined,
      query: q.query ? String(q.query) : undefined,
      fromJalali: q.from ? String(q.from) : undefined,
      toJalali: q.to ? String(q.to) : undefined,
      minScore: q.minScore ? Number(q.minScore) : undefined,
      sort: (['newest', 'oldest', 'score', 'experience'].includes(sortRaw)
        ? sortRaw
        : 'newest') as DecisionFilters['sort'],
      page: q.page ? Number(q.page) : 1,
      pageSize: 10,
    });
    res.json(result);
  });

  // ---------------- Messages ----------------
  app.post('/api/messages/draft', async (req, res) => {
    try {
      const { resumeId, kind } = req.body || {};
      const validKinds: MessageKind[] = ['INTERVIEW_INVITE', 'INFO_REQUEST', 'BANK_NOTICE'];
      if (!validKinds.includes(kind)) return res.status(400).json({ error: 'نوع پیام نامعتبر است' });
      const rec = store.getResumeForUser(String(resumeId), requestUserId(req));
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
    if (!DEPARTMENTS.some((d) => d.id === req.params.id)) {
      return res.status(404).json({ error: 'دپارتمان نامعتبر است' });
    }
    res.json({ batches: store.departmentBankBatches(req.params.id, requestUserId(req) || undefined) });
  });

  app.get('/api/bank/departments/:id/resumes', (req, res) => {
    if (!DEPARTMENTS.some((d) => d.id === req.params.id)) {
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

  // ---------------- Demo data (preview/QA only) ----------------
  // Lets a reviewer see every screen without a Gemini key or real uploads.
  if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_SEED === '1') {
    app.post('/api/demo/seed', async (req, res) => {
      const userId = requestUserId(req);
      if (!userId) return res.status(400).json({ error: 'شناسه کاربر ارسال نشد' });
      try {
        res.json(await seedDemoData(userId));
      } catch (err: any) {
        console.error('demo seed failed:', err?.message);
        res.status(500).json({ error: err?.message || 'ساخت داده نمونه ممکن نشد' });
      }
    });
  }

  app.get('/api/bank/search', (req, res) => {
    res.json({ items: store.globalBankSearch(String(req.query.q || ''), 20, requestUserId(req) || undefined) });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'مسیر API یافت نشد' }));

  // ---------------- Frontend ----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Long-lived cached assets, but never the HTML shell (otherwise users keep
    // loading a stale bundle after a deploy and blame it on their phone).
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
          } else if (/\.(js|css|woff2|svg|png|jpg|mjs)$/.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  // Last in the stack, so it also catches errors thrown by the static/SPA layer.
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  });

  /**
   * PORT was hardcoded to 3000 ("required for AI Studio ingress"), which made
   * the Render blueprint in render.yaml undeployable: it exports PORT=10000 and
   * health-checks that port. Honour the environment, default to 3000.
   */
  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`دستیار غربالگری رزومه سیلانه سبز روی پورت ${PORT} آماده است.`);
    const secret = process.env.GEMINI_API_KEY?.trim() || '';
    if (secret.startsWith('AQ.')) {
      console.warn(
        '[هشدار] مقدار GEMINI_API_KEY یک توکن موقت (ephemeral) است و معمولاً کمتر از یک ساعت اعتبار دارد. ' +
          'برای استفاده دائمی یک کلید API دائمی با پیشوند AIza از https://aistudio.google.com/apikey بسازید.'
      );
    }
  });
}

startServer();

// Touch computeStats so the shared helper stays available for future reporting.
void computeStats;
