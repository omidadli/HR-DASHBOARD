import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type DrawerSide = 'right' | 'left';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  className?: string;
  showCloseButton?: boolean;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'max-w-xs',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-full',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  side = 'right',
  size = 'md',
  className = '',
  showCloseButton = true,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const drawerId = useId();
  const titleId = `drawer-title-${drawerId}`;
  const descId = description ? `drawer-desc-${drawerId}` : undefined;

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusTimer = setTimeout(() => {
      if (drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(focusableSelectors);
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        } else {
          drawerRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusables = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
        ).filter((el) => el.offsetParent !== null);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, onClose]);

  const slideInitial = side === 'right' ? { x: '100%' } : { x: '-100%' };
  const slideExit = side === 'right' ? { x: '100%' } : { x: '-100%' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Container */}
          <div
            className={`fixed inset-y-0 ${
              side === 'right' ? 'right-0' : 'left-0'
            } flex max-w-full`}
          >
            <motion.div
              ref={drawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby={typeof title === 'string' ? titleId : undefined}
              aria-describedby={descId}
              initial={slideInitial}
              animate={{ x: 0 }}
              exit={slideExit}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`w-screen ${sizeClasses[size]} bg-surface-1 border-${
                side === 'right' ? 'l' : 'r'
              } border-border-default shadow-2xl flex flex-col h-full overflow-hidden outline-hidden ${className}`}
            >
              {/* Header */}
              {(title || showCloseButton) && (
                <div className="px-5 py-4 border-b border-border-default flex items-center justify-between gap-3 shrink-0">
                  <div className="text-right">
                    {typeof title === 'string' ? (
                      <h3 id={titleId} className="text-base font-extrabold text-text-1 tracking-tight">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {description && (
                      <p id={descId} className="text-xs text-text-3 mt-0.5 font-medium">
                        {description}
                      </p>
                    )}
                  </div>

                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 rounded-[10px] text-text-3 hover:text-text-1 hover:bg-surface-2 transition-colors cursor-pointer"
                      aria-label="بستن پنل کشویی"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="p-5 overflow-y-auto flex-1 touch-scroll text-right">
                {children}
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
