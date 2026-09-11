import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  rounded = 'rounded-[10px]',
  ...props
}) => {
  return (
    <div
      className={`animate-pulse bg-surface-2 ${rounded} ${className}`}
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
}> = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          rounded="rounded-[8px]"
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`p-5 rounded-[14px] border border-border-default bg-surface-1 space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="w-1/3 h-5" rounded="rounded-[8px]" />
        <Skeleton className="w-8 h-8 rounded-full" />
      </div>
      <Skeleton className="w-1/2 h-8" rounded="rounded-[8px]" />
      <SkeletonText lines={2} />
    </div>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  cols?: number;
  className?: string;
}> = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div
      className={`rounded-[14px] border border-border-default overflow-hidden bg-surface-1 ${className}`}
    >
      <div className="p-4 border-b border-border-default flex items-center justify-between">
        <Skeleton className="w-36 h-5" rounded="rounded-[8px]" />
        <Skeleton className="w-24 h-8" rounded="rounded-[10px]" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 py-2 border-b border-border-default/50 last:border-0">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={`h-4 ${c === 0 ? 'w-1/4' : 'flex-1'}`}
                rounded="rounded-[6px]"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
