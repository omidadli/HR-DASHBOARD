/**
 * Shared presentation + coordination helpers for the HR decision workspace
 * («رزومه‌های تایید/رد شده»).
 *
 * The AI category (INTERVIEW/REVIEW/REJECT) is هوشا's suggestion; the decision
 * status is the human's answer. They are deliberately kept apart, and this
 * module is the single place that names and colors the human side.
 */
import type { DecidedStatus, DecisionStatus, ResumeRecord } from '../types/screening';

export interface DecisionMeta {
  /** Full label used in headers and tabs. */
  label: string;
  /** Short label for chips and tight spaces. */
  short: string;
  /** One-line helper copy shown under the tab. */
  hint: string;
  badge: string;
  chipActive: string;
  chipIdle: string;
  statBox: string;
  iconTone: string;
  dot: string;
}

export const DECISION_META: Record<DecidedStatus, DecisionMeta> = {
  approved: {
    label: 'تایید شده',
    short: 'تایید',
    hint: 'رزومه‌هایی که خودتان تایید کرده‌اید و آماده مصاحبه یا پیگیری هستند.',
    badge: 'bg-brand-soft text-brand-700 border-brand-200',
    chipActive: 'bg-brand text-white border-brand shadow-xs',
    chipIdle: 'bg-surface-1 text-brand border-border-default hover:bg-brand-soft',
    statBox: 'bg-brand-soft border-brand-200 text-brand-700',
    iconTone: 'bg-brand-soft text-brand border-brand-200',
    dot: 'bg-brand',
  },
  rejected: {
    label: 'رد شده',
    short: 'رد',
    hint: 'رزومه‌هایی که رد کرده‌اید؛ برای آرشیو و پاسخ مؤدبانه نگه داشته می‌شوند.',
    badge: 'bg-danger-soft text-danger border-[var(--danger-border)]',
    chipActive: 'bg-danger text-white border-danger shadow-xs',
    chipIdle: 'bg-surface-1 text-danger border-border-default hover:bg-danger-soft',
    statBox: 'bg-danger-soft border-[var(--danger-border)] text-danger',
    iconTone: 'bg-danger-soft text-danger border-[var(--danger-border)]',
    dot: 'bg-danger',
  },
  review: {
    label: 'نیاز به بررسی',
    short: 'بررسی',
    hint: 'مواردی که خودتان «نیاز به بررسی» زده‌اید به‌همراه رزومه‌هایی که هوشا «بررسی شود» داده و هنوز تعیین تکلیف نشده‌اند.',
    badge: 'bg-warning-soft text-warning border-[var(--warning-border)]',
    chipActive: 'bg-warning text-white border-warning shadow-xs',
    chipIdle: 'bg-surface-1 text-warning border-border-default hover:bg-warning-soft',
    statBox: 'bg-warning-soft border-[var(--warning-border)] text-warning',
    iconTone: 'bg-warning-soft text-warning border-[var(--warning-border)]',
    dot: 'bg-warning',
  },
};

export const DECISION_ORDER: DecidedStatus[] = ['approved', 'rejected', 'review'];

export function decisionOf(r: ResumeRecord): DecisionStatus {
  return r.decisionStatus || 'none';
}

/** True when the card sits in «نیاز به بررسی» only because هوشا said REVIEW. */
export function isPendingHumanDecision(r: ResumeRecord): boolean {
  return decisionOf(r) === 'none' && r.category === 'REVIEW';
}

export function decisionLabel(r: ResumeRecord): string | null {
  const d = decisionOf(r);
  if (d === 'none') return isPendingHumanDecision(r) ? 'در انتظار تصمیم شما' : null;
  return DECISION_META[d].label;
}

/** Quick reasons offered when rejecting, so the archive stays explainable. */
export const REJECT_REASONS: string[] = [
  'عدم تطابق سابقه با شغل',
  'نداشتن مهارت کلیدی',
  'سابقه کار کمتر از حد نیاز',
  'حقوق درخواستی بالاتر از بودجه',
  'فاصله زمانی یا جابه‌جایی پرتکرار',
  'اطلاعات تماس ناقص',
];

// ---------------------------------------------------------------------------
// Cross-view refresh: approving a resume in «نتایج» changes the badge counts in
// the header tab, so mutations publish here and App re-reads the counters.
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

export function onDecisionsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDecisionsChanged(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // a broken subscriber must not block the mutation that triggered it
    }
  });
}
