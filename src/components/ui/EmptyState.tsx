import React from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionSlot?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'اطلاعاتی یافت نشد',
  description = 'موردی برای نمایش در این بخش ثبت نشده است.',
  actionLabel,
  onAction,
  actionSlot,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-[14px] border border-dashed border-border-default bg-surface-0/60 ${className}`}
    >
      {icon ? (
        <div className="w-14 h-14 rounded-[12px] bg-surface-2 text-text-3 flex items-center justify-center mb-4 shadow-2xs">
          {icon}
        </div>
      ) : (
        /* Subtle enterprise inline SVG illustration */
        <div className="w-20 h-20 mb-4 flex items-center justify-center text-text-3 select-none">
          <svg
            className="w-full h-full stroke-current opacity-75"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background folder shape */}
            <path
              d="M8 20C8 17.7909 9.79086 16 12 16H24L28 20H52C54.2091 20 56 21.7909 56 24V48C56 50.2091 54.2091 52 52 52H12C9.79086 52 8 50.2091 8 48V20Z"
              className="fill-surface-2 stroke-border-strong"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            {/* Front card document */}
            <rect
              x="16"
              y="26"
              width="32"
              height="20"
              rx="4"
              className="fill-surface-1 stroke-border-strong"
              strokeWidth="1.75"
            />
            {/* Subtle lines */}
            <line
              x1="22"
              y1="33"
              x2="34"
              y2="33"
              className="stroke-brand"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="22"
              y1="39"
              x2="42"
              y2="39"
              className="stroke-border-strong"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      <h4 className="font-extrabold text-sm sm:text-base text-text-1 tracking-tight">
        {title}
      </h4>
      <p className="text-xs text-text-2 mt-1.5 max-w-sm leading-relaxed font-medium">
        {description}
      </p>

      {actionSlot ? (
        <div className="mt-5">{actionSlot}</div>
      ) : actionLabel && onAction ? (
        <div className="mt-5">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
};
