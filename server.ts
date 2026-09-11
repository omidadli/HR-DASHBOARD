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

async function startServer() {
  await store.initStore();
  const app = express();
  app.use(express.json({ limit: '100mb' }));

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
      });
      res.json(batch);
    } catch (err: any) {
      console.error('create batch failed:', err);
      res.status(500).json({ error: 'ثبت نشست غربالگری ممکن نشد' });
    }
  });

  app.get('/api/screening/batches', (req, res) => {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 5));
    res.json(store.listRecentBatches(limit));
  });

  app.get('/api/screening/batches/:id', (req, res) => {
    const batch = store.getBatch(req.params.id);
    if (!batch) return res.status(404).json({ error: 'نشست غربالگری یافت نشد' });
    res.json({ batch, resumes: store.listBatchResumes(req.params.id) });
  });

  // ---------------- Evaluate one resume ----------------
  app.post('/api/screening/batches/:id/evaluate', async (req, res) => {
    try {
      const batch = store.getBatch(req.params.id);
      if (!batch) return res.status(404).json({ error: 'نشست یافت نشد' });
      const { fileName, extractedText, unjudgeableReason, fileBase64 } = req.body || {};
      if (!fileName) return res.status(400).json({ error: 'نام فایل الزامی است' });

      let evaluation: CandidateEvaluation | undefined;
      let reason: string | null = unjudgeableReason ? String(unjudgeableReason) : null;

      if (!reason) {
        const text = String(extractedText || '');
        evaluation = await evaluateResumeV2(
          batch.departmentName,
          batch.roleTitle,
          batch.extraNotes,
          batch.understanding,
          batch.answers,
          text,
          String(fileName)
        );
        if (evaluation.flags.scannedNoText || evaluation.flags.insufficientInfo) {
          reason =
            evaluation.flags.scannedNoText || text.trim().length < 50
              ? 'فایل لایه متنی قابل‌خواندن ندارد (احتمالاً اسکن یا تصویری است)'
              : 'اطلاعات رزومه برای قضاوت تخصصی کافی نیست';
        }
      }

      const record = await store.saveEvaluation({
        batchId: batch.id,
        fileName: String(fileName),
        extractedText: String(extractedText || ''),
        unjudgeableReason: reason,
        fileBase64: typeof fileBase64 === 'string' ? fileBase64 : undefined,
        evaluation,
      });
      res.json({ record, stats: store.getBatch(batch.id)?.stats });
    } catch (err: any) {
      console.error('evaluate failed:', err?.message);
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
  app.get('/api/bank/departments', (_req, res) => {
    res.json({ departments: store.bankDepartmentCounts(), tags: store.bankTags() });
  });

  app.get('/api/bank/departments/:id/resumes', (req, res) => {
    if (!DEPARTMENTS.some((d) => d.id === req.params.id)) {
      return res.status(404).json({ error: 'دپارتمان نامعتبر است' });
    }
    const f = req.query;
    const result = store.listBankResumes(req.params.id, {
      query: f.query ? String(f.query) : undefined,
      minScore: f.minScore ? Number(f.minScore) : undefined,
      minYears: f.minYears ? Number(f.minYears) : undefined,
      tag: f.tag ? String(f.tag) : undefined,
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
    res.json({ items: store.globalBankSearch(String(req.query.q || '')) });
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'مسیر API یافت نشد' }));

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  });

  // ---------------- Frontend ----------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  const PORT = 3000;
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
