import React from 'react';
import { Leaf } from 'lucide-react';

interface SilanehLogoProps {
  className?: string;
}

export function SilanehLogo({ className = 'w-6 h-6' }: SilanehLogoProps) {
  return (
    <div
      className={`rounded-control bg-brand flex items-center justify-center text-white shrink-0 ${className}`}
      aria-label="نشان سیلانه سبز"
    >
      <Leaf className="w-3/5 h-3/5" strokeWidth={2.2} />
    </div>
  );
}
