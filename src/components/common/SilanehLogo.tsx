import React from 'react';

interface SilanehLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showGlow?: boolean;
}

export function SilanehLogo({
  className = 'h-8 sm:h-9 w-auto',
  showGlow = false,
}: SilanehLogoProps) {
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 select-none relative ${
        showGlow ? 'drop-shadow-[0_0_12px_rgba(5,229,144,0.45)]' : 'drop-shadow-xs'
      }`}
      aria-label="نشان سیلانه سبز"
    >
      <svg
        viewBox="0 0 500 360"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-transform duration-200 hover:scale-105 ${className}`}
        style={{ aspectRatio: '500 / 360' }}
      >
        <defs>
          <linearGradient id="seilanehNeonGradComp" x1="14" y1="100" x2="476" y2="360" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#05E590" />
            <stop offset="45%" stopColor="#00C87B" />
            <stop offset="100%" stopColor="#00AF6B" />
          </linearGradient>
          <linearGradient id="seilanehDropGradComp" x1="255" y1="65" x2="255" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#05E590" />
            <stop offset="100%" stopColor="#00BA73" />
          </linearGradient>
        </defs>

        {/* Dark fold behind droplet */}
        <path
          d="M 195 130 
             C 200 102, 218 92, 238 98 
             C 255 104, 270 115, 305 138 
             L 285 152 
             C 260 134, 238 124, 218 126 Z"
          fill="#009E60"
        />

        {/* Main flowing leaf banner */}
        <path
          d="M 14 275 
             C 85 195, 165 155, 230 152 
             C 255 152, 280 156, 310 162 
             C 370 144, 425 124, 476 102 
             C 420 165, 350 250, 290 360 
             C 235 285, 120 270, 14 275 Z"
          fill="url(#seilanehNeonGradComp)"
        />

        {/* White crease line extending from droplet */}
        <path
          d="M 270 168 Q 295 178 318 185"
          stroke="#ffffff"
          strokeWidth="4.5"
          strokeLinecap="round"
        />

        {/* Water Droplet White Halo / Outer Contour */}
        <path
          d="M 255 65 
             C 258 65, 285 115, 285 148 
             C 285 175, 272 198, 255 198 
             C 238 198, 225 175, 225 148 
             C 225 115, 252 65, 255 65 Z"
          fill="url(#seilanehDropGradComp)"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* Droplet Inner White Highlight */}
        <path
          d="M 243 105 
             C 238 118, 237 135, 242 152 
             C 237 142, 237 125, 241 108 
             C 241 106, 242 105, 243 105 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}
