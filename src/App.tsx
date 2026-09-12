import React, { useRef, useState } from 'react';
import { Sparkles, Library } from 'lucide-react';
import { SilanehLogo } from './components/common/SilanehLogo';
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
import { StepperHeader } from './components/screening/StepperHeader';
import { BankHome } from './components/bank/BankHome';
import { DepartmentBankView } from './components/bank/DepartmentBankView';
import { SplashScreen } from './components/common/SplashScreen';
import { WelcomeGate } from './components/common/WelcomeGate';
import { playCompletionChime } from './lib/sound';
import { getStoredUser, StoredUser } from './lib/user';

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
  // Multi-user identity: returning users get هوشا's greeting splash;
  // first-time visitors go through the welcome gate (typing + name form).
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());
  const [showSplash, setShowSplash] = useState(() => Boolean(getStoredUser()));
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
      statusText: 'هوشا در حال آماده‌سازی تحلیل است…',
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
      playCompletionChime();
      toast('هوشا تحلیل و غربالگری رزومه‌ها را با موفقیت کامل کرد.', 'success');
      if (result.localCount > 0 && result.aiCount === 0) {
        toast(
          'هوشا در دسترس نبود؛ همه رزومه‌ها با موتور محلی (غیر هوشمند) تحلیل شدند. کلید/شبکه را بررسی کن.',
          'error'
        );
      } else if (result.localCount > 0) {
        toast('برخی رزومه‌ها به‌دلیل شلوغی هوشا با موتور محلی تحلیل شدند', 'info');
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

  // Welcome gate completed: store the user and remount home so the recent
  // batches list refetches scoped to the new identity.
  const handleRegistered = (u: StoredUser) => {
    setUser(u);
    setHomeNonce((n) => n + 1);
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-surface-0 text-text-1 flex flex-col font-sans antialiased selection:bg-brand-soft selection:text-brand overflow-x-hidden"
    >
      {/* Top header with the only two tabs */}
      <header className="sticky top-0 z-40 bg-surface-1/95 backdrop-blur border-b border-border-default no-print pt-[env(safe-area-inset-top)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2.5 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <SilanehLogo className="h-7 sm:h-8.5 w-auto shrink-0" showGlow />
            <div className="leading-tight min-w-0">
              <div className="text-xs sm:text-sm font-bold text-text-1 truncate flex items-center gap-1.5">
                <span>سیلانه سبز</span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-soft text-brand border border-brand/20">
                  سامانه هوشمند
                </span>
              </div>
              <div className="text-[11px] sm:text-xs text-text-3 truncate hidden sm:block">
                غربالگری، انطباق شغلی و مدیریت رزومه‌ها
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 bg-surface-2 rounded-control p-1 shrink-0">
            <button
              type="button"
              onClick={() => setTab('screening')}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 h-9 sm:h-10 rounded-[8px] text-xs sm:text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                tab === 'screening' ? 'bg-brand text-white shadow-e1' : 'text-text-2 hover:text-brand'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              غربالگری جدید
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('bank');
                setBankView({ screen: 'home' });
              }}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 h-9 sm:h-10 rounded-[8px] text-xs sm:text-xs font-bold cursor-pointer transition-all whitespace-nowrap ${
                tab === 'bank' ? 'bg-brand text-white shadow-e1' : 'text-text-2 hover:text-brand'
              }`}
            >
              <Library className="w-3.5 h-3.5 shrink-0" />
              بانک رزومه
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {tab === 'screening' ? (
          <>
            <StepperHeader
              currentStep={view}
              onStepClick={(step) => {
                if (step === 'home' && view === 'results') {
                  newScreening();
                }
              }}
            />
            {view === 'home' ? (
              <ScreeningHome key={homeNonce} onStart={start} onOpenBatch={openBatch} />
            ) : view === 'processing' ? (
              <ProcessingView progress={progress} error={processingError} onCancel={cancelProcessing} />
            ) : batchId ? (
              <ResultsView batchId={batchId} onNewScreening={newScreening} />
            ) : null}
          </>
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

      <footer className="w-full py-3.5 text-center text-xs text-text-3 border-t border-border-default bg-surface-1 no-print">
        سامانه هوشمند غربالگری رزومه • هلدینگ سیلانه سبز
      </footer>

      <Toaster />
      {showSplash && user && (
        <SplashScreen userName={user.name} onComplete={() => setShowSplash(false)} />
      )}
      {!user && <WelcomeGate onComplete={handleRegistered} />}
    </div>
  );
}

export default App;
