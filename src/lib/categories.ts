import { Recommendation, ResumeCategory } from '../types/screening';

export interface CategoryMeta {
  label: string;
  emoji: string;
  badge: string; // badge classes
  scoreBox: string; // score box classes
  tabActive: string;
  tabIdle: string;
  dot: string;
  ring: string;
}

export const CATEGORY_META: Record<Recommendation, CategoryMeta> = {
  INTERVIEW: {
    label: 'مصاحبه شود',
    emoji: '',
    badge: 'bg-brand-soft text-brand-700 border-brand-200',
    scoreBox: 'bg-brand-soft border-brand-200 text-brand-700',
    tabActive: 'bg-brand text-white border-brand',
    tabIdle: 'bg-surface-1 text-brand border-border-default hover:bg-brand-soft',
    dot: 'bg-brand',
    ring: 'hover:border-brand-200',
  },
  REVIEW: {
    label: 'بررسی شود',
    emoji: '',
    badge: 'bg-warning-soft text-warning border-[var(--warning-border)]',
    scoreBox: 'bg-warning-soft border-[var(--warning-border)] text-warning',
    tabActive: 'bg-warning text-white border-warning',
    tabIdle: 'bg-surface-1 text-warning border-border-default hover:bg-warning-soft',
    dot: 'bg-warning',
    ring: 'hover:border-[var(--warning-border)]',
  },
  REJECT: {
    label: 'رد شود',
    emoji: '',
    badge: 'bg-danger-soft text-danger border-[var(--danger-border)]',
    scoreBox: 'bg-danger-soft border-[var(--danger-border)] text-danger',
    tabActive: 'bg-danger text-white border-danger',
    tabIdle: 'bg-surface-1 text-danger border-border-default hover:bg-danger-soft',
    dot: 'bg-danger',
    ring: 'hover:border-[var(--danger-border)]',
  },
};

export const UNJUDGEABLE_META = {
  label: 'غیرقابل ارزیابی',
  emoji: '',
  badge: 'bg-surface-2 text-text-3 border-border-default',
};

export function categoryOf(r: { category: ResumeCategory }): Recommendation | 'UNJUDGEABLE' | 'ERROR' {
  return r.category;
}
