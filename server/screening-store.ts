/**
 * Persistence layer for the smart resume screener.
 *
 * No database: state lives in an in-memory singleton and is snapshotted to
 * data/screening-store.json (debounced). Original resume files are stored on
 * disk under data/resumes/<batchId>/ so downloads and re-analysis work after
 * a server restart.
 */
import fs from 'fs';
import path from 'path';
import {
  BankDepartmentCount,
  BankFilters,
  BatchStats,
  CandidateEvaluation,
  JobUnderstanding,
  PagedResult,
  ResumeCategory,
  ResumeRecord,
  ScreeningAnswers,
  ScreeningBatch,
} from '../src/types/screening';
import { DEPARTMENTS } from '../src/lib/departments';
import { tehranNow } from './tehran-time';

const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'screening-store.json');
const RESUMES_DIR = path.join(DATA_DIR, 'resumes');

interface Snapshot {
  batches: ScreeningBatch[];
  resumes: ResumeRecord[];
}

let batches = new Map<string, ScreeningBatch>();
let resumes = new Map<string, ResumeRecord>();
let saveTimer: NodeJS.Timeout | null = null;
let initialized = false;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Multi-user visibility rule: when a userId is supplied, records owned by a
 * different user are hidden. Records with no owner (created before accounts
 * existed) stay shared, and requests without a user id see everything
 * (backwards compatible).
 */
function ownerOk(owner: string | null | undefined, userId?: string): boolean {
  if (!userId) return true;
  if (!owner) return true;
  return owner === userId;
}

function safeExt(fileName: string): string {
  const m = fileName.toLowerCase().match(/\.(pdf|docx|doc|txt|rtf|md|zip)$/);
  return m ? m[1] : 'bin';
}

export async function initStore() {
  if (initialized) return;
  initialized = true;
  try {
    await fs.promises.mkdir(RESUMES_DIR, { recursive: true });
    const raw = await fs.promises.readFile(STORE_FILE, 'utf-8');
    const snap = JSON.parse(raw) as Snapshot;
    batches = new Map((snap.batches || []).map((b) => [b.id, b]));
    resumes = new Map((snap.resumes || []).map((r) => [r.id, r]));
    console.log(`[store] loaded ${batches.size} batches, ${resumes.size} resumes.`);
  } catch {
    // first run / corrupt snapshot — start empty
    batches = new Map();
    resumes = new Map();
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await fs.promises.mkdir(DATA_DIR, { recursive: true });
      const snap: Snapshot = {
        batches: Array.from(batches.values()),
        resumes: Array.from(resumes.values()),
      };
      const tmp = STORE_FILE + '.tmp';
      await fs.promises.writeFile(tmp, JSON.stringify(snap), 'utf-8');
      await fs.promises.rename(tmp, STORE_FILE);
    } catch (err) {
      console.error('[store] snapshot save failed:', err);
    }
  }, 400);
}

async function saveResumeFile(batchId: string, recordId: string, fileName: string, base64: string | undefined): Promise<string | null> {
  if (!base64) return null;
  try {
    const dir = path.join(RESUMES_DIR, batchId);
    await fs.promises.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, `${recordId}.${safeExt(fileName)}`);
    await fs.promises.writeFile(filePath, Buffer.from(base64, 'base64'));
    return path.relative(RESUMES_DIR, filePath);
  } catch (err) {
    console.error('[store] file save failed:', err);
    return null;
  }
}

export function getResumeFilePath(relPath: string): string {
  return path.join(RESUMES_DIR, relPath);
}

// ---------------- Batches ----------------

export function createBatch(input: {
  departmentId: string;
  departmentName: string;
  roleTitle: string;
  extraNotes: string;
  understanding: JobUnderstanding;
  answers: ScreeningAnswers;
  userId?: string;
}): ScreeningBatch {
  const now = tehranNow();
  const batch: ScreeningBatch = {
    id: uid('bat'),
    userId: input.userId || null,
    departmentId: input.departmentId,
    departmentName: input.departmentName,
    roleTitle: input.roleTitle,
    extraNotes: input.extraNotes,
    understanding: input.understanding,
    answers: input.answers,
    status: 'processing',
    stats: { total: 0, interview: 0, review: 0, reject: 0, unjudgeable: 0, error: 0 },
    createdAtJalali: now.jalaliString,
    createdAtISO: new Date().toISOString(),
  };
  batches.set(batch.id, batch);
  scheduleSave();
  return batch;
}

export function getBatch(id: string): ScreeningBatch | null {
  return batches.get(id) || null;
}

export function deleteBatch(id: string, userId?: string): boolean {
  const b = batches.get(id);
  if (!b) return false;
  if (!ownerOk(b.userId, userId)) return false;
  batches.delete(id);
  for (const [rid, r] of resumes.entries()) {
    if (r.batchId === id) {
      resumes.delete(rid);
    }
  }
  scheduleSave();
  return true;
}

export function listRecentBatches(limit = 5, userId?: string): ScreeningBatch[] {
  return Array.from(batches.values())
    .filter((b) => ownerOk(b.userId, userId))
    .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
    .slice(0, limit);
}

export function listBatchResumes(batchId: string): ResumeRecord[] {
  return Array.from(resumes.values())
    .filter((r) => r.batchId === batchId && !r.deleted)
    .sort((a, b) => a.createdAtISO.localeCompare(b.createdAtISO));
}

// ---------------- Ranking / stats ----------------

function checkedKnockoutCount(batch: ScreeningBatch, rec: ResumeRecord): number {
  const total = batch.understanding.questions.filter(
    (q) => q.kind === 'knockout' && q.type === 'boolean' &&
      (batch.answers[q.id] === undefined ? q.defaultChecked : batch.answers[q.id] === true)
  ).length;
  return Math.max(0, total - rec.knockoutMisses.length);
}

export function recomputeBatch(batchId: string): ScreeningBatch | null {
  const batch = batches.get(batchId);
  if (!batch) return null;
  const recs = Array.from(resumes.values()).filter((r) => r.batchId === batchId && !r.deleted);

  const rank = (cat: ResumeCategory) => {
    const inCat = recs
      .filter((r) => r.category === cat)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ka = checkedKnockoutCount(batch, a);
        const kb = checkedKnockoutCount(batch, b);
        if (ka !== kb) return kb - ka;
        const ya = a.facts?.yearsExperience ?? -1;
        const yb = b.facts?.yearsExperience ?? -1;
        if (ya !== yb) return yb - ya;
        return a.createdAtISO.localeCompare(b.createdAtISO);
      });
    inCat.forEach((r, i) => {
      r.rankInCategory = i + 1;
    });
  };
  (['INTERVIEW', 'REVIEW', 'REJECT', 'UNJUDGEABLE', 'ERROR'] as ResumeCategory[]).forEach((c) => {
    recs.filter((r) => r.category === c).forEach((r) => (r.rankInCategory = null));
    rank(c);
  });

  const stats: BatchStats = {
    total: recs.length,
    interview: recs.filter((r) => r.category === 'INTERVIEW').length,
    review: recs.filter((r) => r.category === 'REVIEW').length,
    reject: recs.filter((r) => r.category === 'REJECT').length,
    unjudgeable: recs.filter((r) => r.category === 'UNJUDGEABLE').length,
    error: recs.filter((r) => r.category === 'ERROR').length,
  };
  batch.stats = stats;
  batch.status = stats.error === stats.total && stats.total > 0 ? 'processing' : 'done';
  scheduleSave();
  return batch;
}

export function cancelBatch(batchId: string) {
  const batch = batches.get(batchId);
  if (batch && batch.status === 'processing') {
    batch.status = 'cancelled';
    scheduleSave();
  }
}

// ---------------- Resume records ----------------

function categoryFromEvaluation(ev: CandidateEvaluation, extractionReason: string | null): ResumeCategory {
  if (extractionReason) return 'UNJUDGEABLE';
  if (ev.flags.scannedNoText || ev.flags.insufficientInfo) return 'UNJUDGEABLE';
  return ev.recommendation;
}

export async function saveEvaluation(input: {
  batchId: string;
  fileName: string;
  extractedText: string;
  unjudgeableReason: string | null;
  fileBase64?: string;
  evaluation?: CandidateEvaluation;
  errorMessage?: string;
}): Promise<ResumeRecord> {
  const batch = batches.get(input.batchId);
  if (!batch) throw new Error('batch-not-found');
  const now = tehranNow();
  const id = uid('res');
  const filePath = await saveResumeFile(input.batchId, id, input.fileName, input.fileBase64);
  const ev = input.evaluation;
  const isError = !ev && !input.unjudgeableReason;
  const category: ResumeCategory = ev
    ? categoryFromEvaluation(ev, input.unjudgeableReason)
    : input.unjudgeableReason
    ? 'UNJUDGEABLE'
    : 'ERROR';

  const record: ResumeRecord = {
    id,
    batchId: input.batchId,
    userId: batch.userId || null,
    departmentId: batch.departmentId,
    departmentName: batch.departmentName,
    fileName: input.fileName,
    filePath,
    extractedText: input.extractedText?.slice(0, 20000) || '',
    unjudgeableReason: input.unjudgeableReason,
    errorMessage: isError ? input.errorMessage || 'خطا در تحلیل' : null,

    candidateName: ev?.candidateName || null,
    contact: ev?.contact || null,
    facts: ev?.facts || null,
    criterionScores: ev?.criterionScores || [],
    score: ev?.score || 0,
    confidence: ev?.confidence || null,
    engine: ev?.engine || null,
    recommendation: ev?.recommendation || null,
    summary: ev?.summary || '',
    whyCategory: ev?.whyCategory || '',
    strengths: ev?.strengths || [],
    weaknesses: ev?.weaknesses || [],
    knockoutMisses: ev?.knockoutMisses || [],
    tags: ev?.tags || [],
    bankSuggested: ev?.bankSuggested || false,
    flags: ev?.flags || null,

    category,
    rankInCategory: null,
    analysisHistory: ev
      ? [{ score: ev.score, atJalali: now.jalaliString, reason: 'initial', engine: ev.engine }]
      : [],

    inBank: false,
    bankDepartmentId: null,
    bankNote: null,
    bankTags: [],
    addedToBankAtJalali: null,
    messageStatus: 'none',
    lastMessagedAtJalali: null,

    deleted: false,
    createdAtISO: new Date().toISOString(),
  };
  resumes.set(id, record);
  recomputeBatch(input.batchId);
  scheduleSave();
  return record;
}

export function getResume(id: string): ResumeRecord | null {
  return resumes.get(id) || null;
}

export function updateResumeEvaluation(id: string, ev: CandidateEvaluation): ResumeRecord | null {
  const rec = resumes.get(id);
  if (!rec) return null;
  const now = tehranNow();
  const batch = batches.get(rec.batchId);
  rec.unjudgeableReason = null;
  rec.errorMessage = null;
  rec.candidateName = ev.candidateName;
  rec.contact = ev.contact;
  rec.facts = ev.facts;
  rec.criterionScores = ev.criterionScores;
  rec.score = ev.score;
  rec.confidence = ev.confidence;
  rec.engine = ev.engine;
  rec.recommendation = ev.recommendation;
  rec.summary = ev.summary;
  rec.whyCategory = ev.whyCategory;
  rec.strengths = ev.strengths;
  rec.weaknesses = ev.weaknesses;
  rec.knockoutMisses = ev.knockoutMisses;
  rec.tags = ev.tags;
  rec.bankSuggested = ev.bankSuggested;
  rec.flags = ev.flags;
  rec.category = categoryFromEvaluation(ev, null);
  rec.analysisHistory.push({ score: ev.score, atJalali: now.jalaliString, reason: 'rerun', engine: ev.engine });
  if (batch) recomputeBatch(rec.batchId);
  scheduleSave();
  return rec;
}

export function softDeleteResume(id: string): ResumeRecord | null {
  const rec = resumes.get(id);
  if (!rec) return null;
  rec.deleted = true;
  rec.inBank = false; // removal everywhere
  if (rec.batchId) recomputeBatch(rec.batchId);
  scheduleSave();
  return rec;
}

export function markMessageSent(id: string): ResumeRecord | null {
  const rec = resumes.get(id);
  if (!rec) return null;
  rec.messageStatus = 'sent';
  rec.lastMessagedAtJalali = tehranNow().jalaliString;
  scheduleSave();
  return rec;
}

// ---------------- Talent bank ----------------

export function addToBank(
  id: string,
  bankDepartmentId: string,
  note: string,
  tags: string[]
): ResumeRecord | null {
  const rec = resumes.get(id);
  if (!rec) return null;
  rec.inBank = true;
  rec.bankDepartmentId = bankDepartmentId;
  rec.bankNote = note || null;
  rec.bankTags = Array.from(new Set(tags)).slice(0, 12);
  rec.addedToBankAtJalali = tehranNow().jalaliString;
  scheduleSave();
  return rec;
}

export function removeFromBank(id: string): ResumeRecord | null {
  const rec = resumes.get(id);
  if (!rec) return null;
  rec.inBank = false;
  rec.bankDepartmentId = null;
  rec.bankNote = null;
  rec.bankTags = [];
  rec.addedToBankAtJalali = null;
  scheduleSave();
  return rec;
}

export function bankDepartmentCounts(userId?: string): BankDepartmentCount[] {
  const counts = new Map<string, number>();
  for (const r of resumes.values()) {
    if (r.inBank && !r.deleted && r.bankDepartmentId && ownerOk(r.userId, userId)) {
      counts.set(r.bankDepartmentId, (counts.get(r.bankDepartmentId) || 0) + 1);
    }
  }
  return DEPARTMENTS.map((d) => ({ id: d.id, name: d.name, count: counts.get(d.id) || 0 }));
}

export function bankTags(userId?: string): string[] {
  const set = new Set<string>();
  for (const r of resumes.values()) {
    if (r.inBank && !r.deleted && ownerOk(r.userId, userId)) {
      r.bankTags.forEach((t) => set.add(t));
      r.tags.forEach((t) => set.add(t));
    }
  }
  return Array.from(set).sort();
}

export function departmentBankBatches(departmentId: string, userId?: string): { id: string; roleTitle: string; createdAtJalali: string }[] {
  const map = new Map<string, { id: string; roleTitle: string; createdAtJalali: string }>();
  for (const r of resumes.values()) {
    if (r.inBank && !r.deleted && r.bankDepartmentId === departmentId && r.batchId && ownerOk(r.userId, userId)) {
      const b = batches.get(r.batchId);
      if (b && !map.has(b.id)) {
        map.set(b.id, {
          id: b.id,
          roleTitle: b.roleTitle || b.departmentName,
          createdAtJalali: b.createdAtJalali,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.id.localeCompare(a.id));
}

export function listBankResumes(departmentId: string, filters: BankFilters): PagedResult<ResumeRecord> {
  const pageSize = Math.min(50, Math.max(1, filters.pageSize || 10));
  const page = Math.max(1, filters.page || 1);
  const now = Date.now();
  let items = Array.from(resumes.values()).filter(
    (r) => r.inBank && !r.deleted && r.bankDepartmentId === departmentId && ownerOk(r.userId, filters.userId)
  );

  if (filters.query && filters.query.trim()) {
    const q = filters.query.trim().toLowerCase();
    items = items.filter((r) => {
      const hay = [
        r.candidateName,
        r.facts?.lastRole,
        r.bankNote,
        r.tags.join(' '),
        r.bankTags.join(' '),
        r.facts?.skills.join(' '),
        r.fileName,
        r.contact?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }
  if (filters.minScore) items = items.filter((r) => r.score >= (filters.minScore || 0));
  if (filters.minYears)
    items = items.filter((r) => (r.facts?.yearsExperience ?? -1) >= (filters.minYears || 0));
  if (filters.batchId && filters.batchId !== 'all') {
    items = items.filter((r) => r.batchId === filters.batchId);
  }
  if (filters.tags && filters.tags.length > 0) {
    items = items.filter((r) =>
      filters.tags!.every((t) => r.bankTags.includes(t) || r.tags.includes(t))
    );
  } else if (filters.tag) {
    items = items.filter((r) => r.bankTags.includes(filters.tag!) || r.tags.includes(filters.tag!));
  }
  if (filters.since && filters.since !== 'all') {
    const days = filters.since === 'week' ? 7 : 30;
    const cutoff = now - days * 86400_000;
    items = items.filter((r) => new Date(r.createdAtISO).getTime() >= cutoff);
  }

  const sort = filters.sort || 'newest';
  items.sort((a, b) => {
    if (sort === 'score') return b.score - a.score;
    if (sort === 'experience') return (b.facts?.yearsExperience ?? -1) - (a.facts?.yearsExperience ?? -1);
    return (b.addedToBankAtJalali || '').localeCompare(a.addedToBankAtJalali || '');
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: safePage, pageSize, total, totalPages };
}

export function globalBankSearch(query: string, limit = 20, userId?: string): ResumeRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return Array.from(resumes.values())
    .filter((r) => r.inBank && !r.deleted && ownerOk(r.userId, userId))
    .filter((r) =>
      [
        r.candidateName,
        r.facts?.lastRole,
        r.facts?.skills.join(' '),
        r.tags.join(' '),
        r.bankTags.join(' '),
        r.bankNote,
        r.departmentName,
        r.contact?.city,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
    .slice(0, limit);
}
