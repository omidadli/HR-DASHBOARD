import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/70 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 transition-all duration-200 cursor-pointer ${className}`}
      title={isDark ? 'تغییر به تم روشن' : 'تغییر به تم تیره'}
      aria-label={isDark ? 'تغییر به تم روشن' : 'تغییر به تم تیره'}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300 transition-transform duration-200 rotate-0 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-bold select-none">
          {isDark ? 'حالت روشن' : 'حالت تیره'}
        </span>
      )}
    </button>
  );
};
