import React from 'react';
import { toPersianDigits } from '../../utils/jalali';

export interface EmployeeAvatarProps {
  name: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'ACTIVE' | 'RESIGNED' | 'ON_LEAVE';
  className?: string;
}

const PASTEL_PALETTES = [
  { bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50', dot: 'bg-emerald-500' },
  { bg: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/50', dot: 'bg-teal-500' },
  { bg: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/50', dot: 'bg-blue-500' },
  { bg: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50', dot: 'bg-indigo-500' },
  { bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50', dot: 'bg-amber-500' },
  { bg: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/50', dot: 'bg-purple-500' },
  { bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/50', dot: 'bg-cyan-500' },
];

export function getDeterministicPastel(key: string) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PASTEL_PALETTES.length;
  return PASTEL_PALETTES[index];
}

export function getInitials(name: string): string {
  if (!name) return '—';
  const clean = name.trim().replace(/^(مهندس|دکتر|آقای|خانم)\s+/g, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0] || ''}${parts[1][0] || ''}`;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm font-bold',
  lg: 'w-12 h-12 text-base font-extrabold',
  xl: 'w-16 h-16 text-xl font-black',
};

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({
  name,
  id,
  size = 'md',
  status,
  className = '',
}) => {
  const seed = id || name || 'emp';
  const palette = getDeterministicPastel(seed);
  const initials = getInitials(name);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-[12px] border ${palette.bg} flex items-center justify-center font-sans select-none shadow-2xs`}
        title={name}
      >
        <span>{initials}</span>
      </div>

      {status && (
        <span
          className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-surface-1 ${
            status === 'ACTIVE'
              ? 'bg-emerald-500'
              : status === 'RESIGNED'
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
          title={
            status === 'ACTIVE'
              ? 'شاغل فعال'
              : status === 'RESIGNED'
              ? 'قطع همکاری'
              : 'در مرخصی'
          }
        />
      )}
    </div>
  );
};
