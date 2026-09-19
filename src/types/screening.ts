// ================================================================
// Shared domain types for the Seilaneh Sabz smart resume screener
// Used by both the React client and the Express server.
// ================================================================

export type Recommendation = 'INTERVIEW' | 'REVIEW' | 'REJECT';
export type ResumeCategory = 'INTERVIEW' | 'REVIEW' | 'REJECT' | 'UNJUDGEABLE' | 'ERROR';
export type Confidence = 'high' | 'medium' | 'low';
export type AnalysisEngine = 'ai' | 'local';

export interface Criterion {
  id: string;
  title: string;
  weight: number; // sums to 100 across criteria
  mustHave: boolean;
}

// ---------- Smart checkbox questionnaire (Pass 0) ----------

export type QuestionKind = 'knockout' | 'bonus';

export interface BooleanQuestion {
  id: string;
  kind: QuestionKind;
  type: 'boolean';
  label: string;
  weight: number;
  defaultChecked: boolean;
}

export interface SingleChoiceQuestion {
  id: string;
  kind: QuestionKind;
  type: 'single';
  label: string;
  weight: number;
  options: { value: string; label: string }[];
  defaultValue: string;
}

export interface MultiChoiceQuestion {
  id: string;
  kind: QuestionKind;
  type: 'multi';
  label: string;
  weight: number;
  options: { value: string; label: string }[];
  defaultValues: string[];
}

export type ScreeningQuestion = BooleanQuestion | SingleChoiceQuestion | MultiChoiceQuestion;

/** User answers keyed by question id: boolean → boolean, single → string, multi → string[] */
export type ScreeningAnswers = Record<string, boolean | string | string[]>;

export interface Thresholds {
  interview: number; // 70-85
  review: number; // 45-60
}

export interface JobUnderstanding {
  department: string;
  departmentId: string;
  roleTitle: string;
  seniority: string;
  plainExplanation: string;
  thresholds: Thresholds;
  criteria: Criterion[];
  questions: ScreeningQuestion[];
}

// ---------- Resume evaluation (Pass 1) ----------

export interface CandidateContact {
  phone: string | null;
  email: string | null;
  city: string | null;
}

export interface CandidateFacts {
  yearsExperience: number | null;
  education: string | null;
  lastRole: string | null;
  skills: string[];
  expectedSalary: string | null;
}

export interface CriterionScore {
  criterionId: string;
  title?: string;
  score: number; // 0-100
  rationale: string;
  evidence: string; // real quote from the resume
}

export interface EvidencePoint {
  point: string;
  evidence: string;
  severity?: 'knockout' | 'major' | 'minor';
}

export interface EvaluationFlags {
  irrelevant: boolean;
  insufficientInfo: boolean;
  scannedNoText: boolean;
}

export interface CandidateEvaluation {
  candidateName: string | null;
  contact: CandidateContact;
  facts: CandidateFacts;
  criterionScores: CriterionScore[];
  score: number;
  confidence: Confidence;
  engine: AnalysisEngine;
  recommendation: Recommendation;
  summary: string;
  whyCategory: string;
  strengths: EvidencePoint[];
  weaknesses: EvidencePoint[];
  knockoutMisses: string[];
  tags: string[];
  bankSuggested: boolean;
  flags: EvaluationFlags;
}

// ---------- Persisted server records ----------

export type BatchStatus = 'processing' | 'done' | 'cancelled';

export interface BatchStats {
  total: number;
  interview: number;
  review: number;
  reject: number;
  unjudgeable: number;
  error: number;
}

export interface ScreeningBatch {
  id: string;
  /** Owner user id (multi-user scoping). null/absent = legacy shared data. */
  userId?: string | null;
  departmentId: string;
  departmentName: string;
  roleTitle: string;
  extraNotes: string;
  understanding: JobUnderstanding;
  answers: ScreeningAnswers;
  status: BatchStatus;
  stats: BatchStats;
  createdAtJalali: string;
  createdAtISO: string;
}

export interface AnalysisHistoryEntry {
  score: number;
  atJalali: string;
  reason: 'initial' | 'rerun';
  engine: AnalysisEngine;
}

export interface ResumeRecord {
  id: string;
  batchId: string;
  /** Owner user id inherited from the batch (multi-user scoping). */
  userId?: string | null;
  departmentId: string;
  departmentName: string;
  fileName: string;
  filePath: string | null;
  extractedText: string;
  unjudgeableReason: string | null;
  errorMessage: string | null;

  candidateName: string | null;
  contact: CandidateContact | null;
  facts: CandidateFacts | null;
  criterionScores: CriterionScore[];
  score: number;
  confidence: Confidence | null;
  engine: AnalysisEngine | null;
  recommendation: Recommendation | null;
  summary: string;
  whyCategory: string;
  strengths: EvidencePoint[];
  weaknesses: EvidencePoint[];
  knockoutMisses: string[];
  tags: string[];
  bankSuggested: boolean;
  flags: EvaluationFlags | null;

  category: ResumeCategory;
  rankInCategory: number | null;
  analysisHistory: AnalysisHistoryEntry[];

  inBank: boolean;
  bankDepartmentId: string | null;
  bankNote: string | null;
  bankTags: string[];
  addedToBankAtJalali: string | null;

  messageStatus: 'none' | 'sent';
  lastMessagedAtJalali: string | null;

  deleted: boolean;
  createdAtISO: string;
}

// ---------- Client-side upload item (screening wizard) ----------

export type FileProcessingStatus =
  | 'idle'
  | 'extracting'
  | 'queued'
  | 'evaluating'
  | 'success'
  | 'error'
  | 'unjudgeable';

export interface ResumeFileItem {
  id: string;
  file?: File;
  name: string;
  size: number;
  extractedText?: string;
  unjudgeableReason?: string;
  status: FileProcessingStatus;
  errorMessage?: string;
  recordId?: string;
  category?: ResumeCategory;
  score?: number;
}

export interface ScreeningProgressUpdate {
  items: ResumeFileItem[];
  currentEvaluatingName?: string;
  activeEvaluatingNames?: string[];
  processedCount: number;
  totalCount: number;
  statusText: string;
  subStatusText?: string;
  phase?: 'extracting' | 'evaluating' | 'calibrating' | 'done';
  extractedCount?: number;
  estimatedSecondsRemaining?: number;
  speedPerMinute?: number;
  overallPercent?: number;
  /** Set when nothing has moved for a while — shown as a soft warning. */
  warningText?: string;
}

// ---------- Bank ----------

export interface BankDepartmentCount {
  id: string;
  name: string;
  count: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface BankBatchOption {
  id: string;
  roleTitle: string;
  createdAtJalali: string;
}

export interface BankFilters {
  /** Restrict results to resumes owned by this user (legacy null owner = shared). */
  userId?: string;
  query?: string;
  minScore?: number;
  minYears?: number;
  tag?: string;
  tags?: string[];
  batchId?: string;
  since?: 'all' | 'week' | 'month';
  sort?: 'newest' | 'score' | 'experience';
  page?: number;
  pageSize?: number;
}

export type MessageKind = 'INTERVIEW_INVITE' | 'INFO_REQUEST' | 'BANK_NOTICE';

export interface DraftMessage {
  kind: MessageKind;
  subject: string;
  body: string;
}
