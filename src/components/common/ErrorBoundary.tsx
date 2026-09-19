import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { SilanehLogo } from './SilanehLogo';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React component tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-[100dvh] bg-surface-0 text-text-1 flex flex-col items-center justify-center p-6 text-center font-sans antialiased"
        >
          <div className="w-full max-w-md bg-surface-1 border border-border-default rounded-2xl p-6 sm:p-8 shadow-e2 flex flex-col items-center gap-5">
            <div className="relative p-3 rounded-2xl bg-surface-2 border border-brand/20 shadow-sm flex items-center justify-center">
              <SilanehLogo className="h-10 w-auto" />
            </div>

            <div className="w-12 h-12 rounded-full bg-danger-soft border border-danger/20 flex items-center justify-center text-danger">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-text-1 mb-1.5">
                خطایی در بارگذاری برنامه رخ داد
              </h2>
              <p className="text-xs sm:text-sm text-text-2 leading-relaxed">
                هوشا با خطای غیرمنتظره‌ای مواجه شد. لطفاً صفحه را بازخوانی کنید یا برنامه را از ابتدا آغاز فرمایید.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full text-right bg-surface-2 border border-border-default rounded-control p-3 text-[11px] font-mono text-text-3 max-h-32 overflow-auto break-all">
                {this.state.error.toString()}
              </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-control bg-brand text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-neon active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                بارگذاری مجدد
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-control bg-surface-2 hover:bg-surface-0 border border-border-default text-text-2 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
              >
                <Home className="w-4 h-4" />
                بازنشانی و شروع مجدد
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
