import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertVariant = 'success' | 'warning' | 'danger' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onClose?: () => void;
  action?: React.ReactNode;
}

const variantConfig: Record<
  AlertVariant,
  {
    container: string;
    border: string;
    iconColor: string;
    defaultIcon: React.ReactNode;
  }
> = {
  success: {
    container: 'bg-success-soft text-success',
    border: 'border-success/20',
    iconColor: 'text-success',
    defaultIcon: <CheckCircle2 className="w-5 h-5" />,
  },
  warning: {
    container: 'bg-warning-soft text-warning',
    border: 'border-warning/20',
    iconColor: 'text-warning',
    defaultIcon: <AlertTriangle className="w-5 h-5" />,
  },
  danger: {
    container: 'bg-danger-soft text-danger',
    border: 'border-danger/20',
    iconColor: 'text-danger',
    defaultIcon: <AlertCircle className="w-5 h-5" />,
  },
  info: {
    container: 'bg-info-soft text-info',
    border: 'border-info/20',
    iconColor: 'text-info',
    defaultIcon: <Info className="w-5 h-5" />,
  },
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  description,
  icon,
  onClose,
  action,
  className = '',
  children,
  ...props
}) => {
  const config = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-[12px] border ${config.container} ${config.border} text-right ${className}`}
      {...props}
    >
      <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
        {icon || config.defaultIcon}
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h5 className="text-xs font-black mb-0.5 tracking-tight text-text-1">
            {title}
          </h5>
        )}
        <div className="text-xs font-medium text-text-2 leading-relaxed">
          {description || children}
        </div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-[6px] text-text-3 hover:text-text-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          aria-label="بستن پیام"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
