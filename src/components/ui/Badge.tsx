import React from 'react';

export type BadgeVariant = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  brand: {
    container: 'bg-brand-soft text-brand border-brand/20',
    dot: 'bg-brand',
  },
  success: {
    container: 'bg-success-soft text-success border-success/20',
    dot: 'bg-success',
  },
  warning: {
    container: 'bg-warning-soft text-warning border-warning/20',
    dot: 'bg-warning',
  },
  danger: {
    container: 'bg-danger-soft text-danger border-danger/20',
    dot: 'bg-danger',
  },
  info: {
    container: 'bg-info-soft text-info border-info/20',
    dot: 'bg-info',
  },
  neutral: {
    container: 'bg-surface-2 text-text-2 border-border-default',
    dot: 'bg-text-3',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] font-bold rounded-[999px] gap-1.5',
  md: 'px-2.5 py-1 text-xs font-extrabold rounded-[999px] gap-2',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  dot = false,
  icon,
  children,
  className = '',
  ...props
}) => {
  const styles = variantStyles[variant] || variantStyles.neutral;

  return (
    <span
      className={`inline-flex items-center border select-none transition-colors whitespace-nowrap leading-none ${styles.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

export const StatusChip = Badge;
