import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, icon, children, footer, wide }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px] p-0 sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className={`bg-surface-1 w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] animate-fadeIn`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-default shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-text-1 flex items-center gap-2">
            {icon}
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-control flex items-center justify-center text-text-3 hover:bg-surface-2 cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-border-default flex gap-2 justify-end no-print">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'تأیید',
  danger,
  onConfirm,
  onCancel,
}) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    footer={
      <>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-control bg-surface-2 text-text-2 text-xs sm:text-sm font-bold cursor-pointer hover:bg-border-default/40"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`px-4 py-2.5 rounded-control text-white text-xs sm:text-sm font-bold cursor-pointer transition-colors ${
            danger ? 'bg-danger hover:opacity-90' : 'bg-brand hover:bg-brand-hover'
          }`}
        >
          {confirmLabel}
        </button>
      </>
    }
  >
    <div className="text-xs sm:text-sm text-text-2 leading-relaxed">{message}</div>
  </Modal>
);
