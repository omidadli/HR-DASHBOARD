import React, { useEffect, useState, useRef } from 'react';
import { Card } from './Card';
import { toPersianDigits } from '../../utils/jalali';

export interface StatKpiCardProps {
  title: string;
  value: string | number | null | undefined;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  accent?: 'emerald' | 'amber' | 'rose' | 'sky' | 'neutral';
  className?: string;
  onClick?: () => void;
}

const accentColors = {
  emerald: {
    iconBg: 'bg-brand-soft text-brand border-brand/20',
  },
  amber: {
    iconBg: 'bg-warning-soft text-warning border-warning/20',
  },
  rose: {
    iconBg: 'bg-danger-soft text-danger border-danger/20',
  },
  sky: {
    iconBg: 'bg-info-soft text-info border-info/20',
  },
  neutral: {
    iconBg: 'bg-surface-2 text-text-2 border-border-default',
  },
};

export const StatKpiCard: React.FC<StatKpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accent = 'emerald',
  className = '',
  onClick,
}) => {
  // Micro-interaction: Animated number counting (180ms duration, respecting prefers-reduced-motion)
  const [animatedNum, setAnimatedNum] = useState<number | null>(
    typeof value === 'number' ? value : null
  );
  const prevValueRef = useRef<number | null>(typeof value === 'number' ? value : null);

  useEffect(() => {
    if (typeof value !== 'number') {
      setAnimatedNum(null);
      return;
    }

    // Check prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedNum(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current !== null && !isNaN(prevValueRef.current) ? prevValueRef.current : 0;
    const endVal = value;
    const duration = 200; // ms within 150-240ms range
    const startTime = performance.now();

    let animationFrameId: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (endVal - startVal) * easeOut);
      setAnimatedNum(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = endVal;
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [value]);

  const displayValue =
    value === null || value === undefined || value === ''
      ? '—'
      : typeof value === 'number' && animatedNum !== null
      ? toPersianDigits(animatedNum.toLocaleString('fa-IR'))
      : toPersianDigits(value);

  const colors = accentColors[accent] || accentColors.emerald;

  return (
    <Card
      hoverable={Boolean(onClick)}
      onClick={onClick}
      className={`p-4 sm:p-5 relative overflow-hidden card-hover-lift ${
        onClick ? 'cursor-pointer hover:border-brand/50 transition-all' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-text-2 truncate">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black text-text-1 tracking-tight">
              {displayValue}
            </span>
          </div>
          {subtitle && (
            <p className="text-[11px] text-text-3 mt-1 line-clamp-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {icon && (
          <div
            className={`w-10 h-10 rounded-[10px] flex items-center justify-center border shrink-0 transition-transform ${colors.iconBg}`}
          >
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-2.5 border-t border-border-default flex items-center justify-between text-[11px]">
          <span
            className={`font-extrabold flex items-center gap-1 ${
              trend.isPositive ? 'text-brand' : 'text-danger'
            }`}
          >
            <span>{trend.isPositive ? '▲' : '▼'}</span>
            <span>{toPersianDigits(trend.value)}</span>
          </span>
          {trend.label && (
            <span className="text-text-3 font-medium">
              {trend.label}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
