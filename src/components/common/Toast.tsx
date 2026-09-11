import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export const showToast = (
  message: string,
  type: ToastMessage['type'] = 'success',
  title?: string,
  duration: number = 3500
) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('seilaneh-toast', {
      detail: {
        id: Math.random().toString(36).substring(2, 9),
        title,
        message,
        type,
        duration,
      },
    });
    window.dispatchEvent(event);
  }
};

/**
 * Surface API and network errors as danger toasts with the server's Persian error message.
 */
export const showApiErrorToast = (
  error: any,
  fallbackMessage: string = 'خطایی در پردازش درخواست توسط سرور رخ داد',
  title: string = 'خطای عملیات'
) => {
  let message = fallbackMessage;
  if (typeof error === 'string' && error.trim()) {
    message = error;
  } else if (error?.response?.data?.error) {
    message = String(error.response.data.error);
  } else if (error?.response?.data?.message) {
    message = String(error.response.data.message);
  } else if (error?.error) {
    message = String(error.error);
  } else if (error?.message && !error.message.includes('[object Object]') && !error.message.includes('FetchError')) {
    message = error.message;
  }
  showToast(message, 'error', title, 5000);
};

const ToastItem: React.FC<{
  toast: ToastMessage;
  onRemove: (id: string) => void;
}> = ({ toast, onRemove }) => {
  const duration = toast.duration || 3500;

  const variantStyles = {
    success: {
      bg: 'bg-surface-1 border-brand/40 text-text-1 shadow-brand/10',
      icon: <CheckCircle2 className="w-5 h-5 text-brand shrink-0 mt-0.5" />,
      progress: 'bg-brand',
    },
    error: {
      bg: 'bg-surface-1 border-danger/40 text-text-1 shadow-danger/10',
      icon: <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />,
      progress: 'bg-danger',
    },
    warning: {
      bg: 'bg-surface-1 border-warning/40 text-text-1 shadow-warning/10',
      icon: <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />,
      progress: 'bg-warning',
    },
    info: {
      bg: 'bg-surface-1 border-info/40 text-text-1 shadow-info/10',
      icon: <Info className="w-5 h-5 text-info shrink-0 mt-0.5" />,
      progress: 'bg-info',
    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -30, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -30, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      dir="rtl"
      className={`pointer-events-auto relative overflow-hidden flex items-start gap-3 p-3.5 rounded-[14px] border shadow-xl backdrop-blur-md transition-all ${variantStyles.bg}`}
    >
      {/* Icon */}
      {variantStyles.icon}

      {/* Content */}
      <div className="flex-1 min-w-0 text-right">
        {toast.title && (
          <div className="text-xs font-black mb-0.5 text-text-1">
            {toast.title}
          </div>
        )}
        <div className="text-xs font-medium text-text-2 leading-relaxed">
          {toast.message}
        </div>
      </div>

      {/* Dismiss Button */}
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        className="shrink-0 text-text-3 hover:text-text-1 transition-colors p-1 rounded-[6px] hover:bg-surface-2 cursor-pointer"
        aria-label="بستن پیام"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Auto-dismiss Animated Progress Bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        className={`absolute bottom-0 right-0 h-[2.5px] ${variantStyles.progress} opacity-70`}
      />
    </motion.div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => [...prev, newToast]);

        const duration = newToast.duration || 3500;
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, duration);
      }
    };

    window.addEventListener('seilaneh-toast', handleToast);
    return () => window.removeEventListener('seilaneh-toast', handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      dir="rtl"
      className="fixed top-5 left-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};
