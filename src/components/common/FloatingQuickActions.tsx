import React, { useState } from 'react';
import {
  Sparkles,
  Mic,
  Command,
  ArrowUp,
  Plus,
  X,
  Bot,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FloatingQuickActionsProps {
  onOpenVoiceAssistant: () => void;
  onOpenJobGenerator: () => void;
  onOpenCommandPalette: () => void;
}

export const FloatingQuickActions: React.FC<FloatingQuickActionsProps> = ({
  onOpenVoiceAssistant,
  onOpenJobGenerator,
  onOpenCommandPalette,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed bottom-20 lg:bottom-6 left-6 z-40 flex flex-col items-start gap-2.5"
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            role="menu"
            aria-label="دسترسی سریع"
            initial={{ opacity: 0, y: 15, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.92 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-start gap-2 mb-1"
          >
            {/* Action 1: Voice AI */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenVoiceAssistant();
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-brand text-white shadow-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer hover:bg-brand-hover"
            >
              <Mic className="w-4 h-4 text-white" aria-hidden="true" />
              <span>دستیار صوتی (Gemini)</span>
            </button>

            {/* Action 2: Job Ad Generator */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenJobGenerator();
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-surface-1 text-text-1 shadow-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer border border-border-default hover:bg-surface-2"
            >
              <Sparkles className="w-4 h-4 text-brand" aria-hidden="true" />
              <span>ایجاد آگهی شغلی</span>
            </button>

            {/* Action 3: Spotlight Search (⌘K / Ctrl+K) */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                onOpenCommandPalette();
              }}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-[10px] bg-surface-1 text-text-2 shadow-lg text-xs font-bold transition-all transform active:scale-95 cursor-pointer border border-border-default hover:bg-surface-2 hover:text-text-1"
            >
              <Command className="w-4 h-4 text-text-3" aria-hidden="true" />
              <span>جستجو در سامانه (⌘K)</span>
            </button>

            {/* Action 4: Scroll Top */}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                scrollToTop();
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-surface-2 hover:bg-surface-3 text-text-3 hover:text-text-1 text-[11px] font-bold transition-all cursor-pointer border border-border-default shadow-2xs"
            >
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
              <span>بازگشت به بالای صفحه</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={isOpen ? 'بستن منوی دسترسی سریع' : 'باز کردن منوی دسترسی سریع'}
        className={`w-12 h-12 rounded-[14px] flex items-center justify-center shadow-xl transition-all transform active:scale-95 cursor-pointer select-none ${
          isOpen
            ? 'bg-surface-1 text-text-1 border border-border-default rotate-45 shadow-md'
            : 'bg-brand text-white shadow-brand/30 hover:bg-brand-hover'
        }`}
        title={isOpen ? 'بستن منوی دسترسی سریع' : 'دسترسی سریع'}
      >
        {isOpen ? <Plus className="w-5 h-5" aria-hidden="true" /> : <Bot className="w-5 h-5" aria-hidden="true" />}
      </button>
    </div>
  );
};
