import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-brand hover:bg-brand-hover active:opacity-90 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-0',
  secondary:
    'bg-surface-2 hover:bg-slate-200 dark:hover:bg-slate-800 active:opacity-90 text-text-1 border border-border-default focus-visible:ring-2 focus-visible:ring-border-strong',
  outline:
    'bg-transparent hover:bg-surface-2 active:opacity-90 text-text-1 border border-border-default focus-visible:ring-2 focus-visible:ring-brand',
  ghost:
    'bg-transparent hover:bg-surface-2 active:opacity-90 text-text-2 hover:text-text-1 border-transparent focus-visible:ring-2 focus-visible:ring-brand',
  danger:
    'bg-danger hover:bg-red-700 active:opacity-90 text-white shadow-xs focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-0',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-[10px] gap-1.5 min-h-[34px]',
  md: 'px-4 py-2 text-sm font-bold rounded-[10px] gap-2 min-h-[40px]',
  lg: 'px-5 py-2.5 text-base font-extrabold rounded-[10px] gap-2.5 min-h-[46px]',
  icon: 'p-2 rounded-[10px] text-text-2 hover:text-text-1 hover:bg-surface-2 min-w-[38px] min-h-[38px]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none outline-none font-sans ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
