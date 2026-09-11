export interface Criterion {
  title: string;
  weight: number;
  mustHave: boolean;
  keywords: string[];
}

export interface JobUnderstanding {
  department: string;
  seniority: string;
  thresholds: {
    interview: number; // 70 - 85
    review: number;    // 45 - 60
  };
  criteria: Criterion[];
  plainExplanation: string; // 1-2 simple sentences
}

export interface StrengthOrWeakness {
  point: string;
  evidence: string; // short real quote from the resume
}

export interface CandidateEvaluation {
  candidateName: string | null;
  score: number;
  summary: string;
  strengths: StrengthOrWeakness[];
  weaknesses: StrengthOrWeakness[];
  recommendation: 'INTERVIEW' | 'REVIEW' | 'REJECT';
  insufficientInfo: boolean;
  irrelevant: boolean;
}

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
  status: FileProcessingStatus;
  unjudgeableReason?: string;
  errorMessage?: string;
  result?: CandidateEvaluation;
}

export interface ScreeningStats {
  total: number;
  evaluated: number;
  interviewCount: number;
  reviewCount: number;
  rejectCount: number;
  unjudgeableCount: number;
}
