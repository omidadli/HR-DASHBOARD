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
    emoji: '✅',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    scoreBox: 'bg-emerald-50 border-emerald-300 text-emerald-700',
    tabActive: 'bg-emerald-600 text-white border-emerald-600',
    tabIdle: 'bg-surface-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50',
    dot: 'bg-emerald-500',
    ring: 'hover:border-emerald-300',
  },
  REVIEW: {
    label: 'بررسی شود',
    emoji: '🟡',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    scoreBox: 'bg-amber-50 border-amber-300 text-amber-700',
    tabActive: 'bg-amber-500 text-white border-amber-500',
    tabIdle: 'bg-surface-1 text-amber-700 border-amber-200 hover:bg-amber-50',
    dot: 'bg-amber-500',
    ring: 'hover:border-amber-300',
  },
  REJECT: {
    label: 'رد شود',
    emoji: '🔴',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    scoreBox: 'bg-rose-50 border-rose-300 text-rose-700',
    tabActive: 'bg-rose-600 text-white border-rose-600',
    tabIdle: 'bg-surface-1 text-rose-700 border-rose-200 hover:bg-rose-50',
    dot: 'bg-rose-500',
    ring: 'hover:border-rose-300',
  },
};

export const UNJUDGEABLE_META = {
  label: 'غیرقابل ارزیابی',
  emoji: '⚪',
  badge: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function categoryOf(r: { category: ResumeCategory }): Recommendation | 'UNJUDGEABLE' | 'ERROR' {
  return r.category;
}
