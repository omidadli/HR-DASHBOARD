import React, { useRef, useState } from 'react';
import { Sparkles, Library, Leaf } from 'lucide-react';
import {
  JobUnderstanding,
  ResumeFileItem,
  ScreeningAnswers,
  ScreeningProgressUpdate,
} from './types/screening';
import { runScreeningBatch, RunnerInput } from './lib/runner';
import { Toaster, toast } from './components/common/Toast';
import { ScreeningHome } from './components/screening/ScreeningHome';
import { ProcessingView } from './components/screening/ProcessingView';
import { ResultsView } from './components/screening/ResultsView';
import { BankHome } from './components/bank/BankHome';
import { DepartmentBankView } from './components/bank/DepartmentBankView';

type TopTab = 'screening' | 'bank';
type ScreeningView = 'home' | 'processing' | 'results';
type BankView =
  | { screen: 'home' }
  | { screen: 'department'; id: string; initialQuery?: string };

interface StartPayload {
  departmentId: string;
  departmentName: string;
  roleTitle: string;
  extraNotes: string;
  understanding: JobUnderstanding;
  answers: ScreeningAnswers;
  files: ResumeFileItem[];
}

const EMPTY_PROGRESS: ScreeningProgressUpdate = {
  items: [],
  processedCount: 0,
  totalCount: 0,
  statusText: '',
};

export function App() {
  const [tab, setTab] = useState<TopTab>('screening');
  const [view, setView] = useState<ScreeningView>('home');
  const [bankView, setBankView] = useState<BankView>({ screen: 'home' });

  const [progress, setProgress] = useState<ScreeningProgressUpdate>(EMPTY_PROGRESS);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [homeNonce, setHomeNonce] = useState(0); // remount home after finishing a batch
  const abortRef = useRef<AbortController | null>(null);

  const start = async (payload: StartPayload) => {
    setProcessingError(null);
    setProgress({
      ...EMPTY_PROGRESS,
      totalCount: payload.files.length,
      statusText: 'هوش مصنوعی در حال آماده‌سازی تحلیل است… 🧠',
    });
    setView('processing');

    const controller = new AbortController();
    abortRef.current = controller;

    const runnerInput: RunnerInput = {
      departmentId: payload.departmentId,
      departmentName: payload.departmentName,
      roleTitle: payload.roleTitle,
      extraNotes: payload.extraNotes,
      understanding: payload.understanding,
      answers: payload.answers,
      files: payload.files,
    };

    try {
      const result = await runScreeningBatch(
        runnerInput,
        (u) => setProgress(u),
        controller.signal
      );
      setBatchId(result.batchId);
      setView('results');
      if (result.localCount > 0 && result.aiCount === 0) {
        toast(
          'هوش مصنوعی در دسترس نبود؛ همه رزومه‌ها با موتور محلی (غیر هوشمند) تحلیل شدند. کلید/شبکه را بررسی کن.',
          'error'
        );
      } else if (result.localCount > 0) {
        toast('برخی رزومه‌ها به‌دلیل شلوغی هوش مصنوعی با موتور محلی تحلیل شدند', 'info');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || String(err?.message || '').includes('Aborted')) {
        setView('home');
      } else {
        setProcessingError(err?.message || 'فرایند تحلیل با خطا مواجه شد');
      }
    } finally {
      abortRef.current = null;
    }
  };

  const cancelProcessing = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setView('home');
  };

  const openBatch = (id: string) => {
    setBatchId(id);
    setView('results');
    setTab('screening');
  };

  const newScreening = () => {
    setBatchId(null);
    setProgress(EMPTY_PROGRESS);
    setProcessingError(null);
    setHomeNonce((n) => n + 1);
    setView('home');
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-surface-0 text-text-1 flex flex-col font-sans antialiased selection:bg-brand-soft selection:text-brand"
    >
      {/* Top header with the only two tabs */}
      <header className="sticky top-0 z-40 bg-surface-1/95 backdrop-blur border-b border-border-default no-print">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center shrink-0">
              <Leaf className="w-4.5 h-4.5" />
            </span>
            <div className="leading-tight min-w-0">
              <div className="text-xs sm:text-sm font-black text-text-1 truncate">سیلانه سبز</div>
              <div className="text-[10px] text-text-3 truncate">دستیار هوشمند غربالگری رزومه</div>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-surface-2/70 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setTab('screening')}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-lg text-[11px] sm:text-xs font-black cursor-pointer transition-all ${
                tab === 'screening' ? 'bg-brand text-white shadow-xs' : 'text-text-2 hover:text-brand'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              غربالگری جدید
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('bank');
                setBankView({ screen: 'home' });
              }}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 h-9 rounded-lg text-[11px] sm:text-xs font-black cursor-pointer transition-all ${
                tab === 'bank' ? 'bg-brand text-white shadow-xs' : 'text-text-2 hover:text-brand'
              }`}
            >
              <Library className="w-4 h-4" />
              بانک رزومه
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {tab === 'screening' ? (
          view === 'home' ? (
            <ScreeningHome key={homeNonce} onStart={start} onOpenBatch={openBatch} />
          ) : view === 'processing' ? (
            <ProcessingView progress={progress} error={processingError} onCancel={cancelProcessing} />
          ) : batchId ? (
            <ResultsView batchId={batchId} onNewScreening={newScreening} />
          ) : null
        ) : bankView.screen === 'home' ? (
          <BankHome
            onOpenDepartment={(id) => setBankView({ screen: 'department', id })}
            onOpenResult={(id, deptId, query) =>
              setBankView({ screen: 'department', id: deptId, initialQuery: query })
            }
          />
        ) : (
          <DepartmentBankView
            key={bankView.id}
            departmentId={bankView.id}
            initialQuery={bankView.initialQuery}
            onBack={() => setBankView({ screen: 'home' })}
            onGoScreening={() => setTab('screening')}
          />
        )}
      </main>

      <footer className="w-full py-3.5 text-center text-[10px] text-text-3 border-t border-border-default bg-surface-1 no-print">
        سامانه هوشمند غربالگری رزومه • هلدینگ سیلانه سبز
      </footer>

      <Toaster />
    </div>
  );
}

export default App;
