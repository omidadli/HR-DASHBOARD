import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BadgeCheck, Library, Sparkles } from 'lucide-react';
import { SilanehLogo } from './components/common/SilanehLogo';
import {
  DecidedStatus,
  DecisionCounts,
  JobUnderstanding,
  ResumeFileItem,
  ScreeningAnswers,
  ScreeningProgressUpdate,
} from './types/screening';
import { runScreeningBatch, RunnerInput } from './lib/runner';
import { fetchDecisionsMeta, seedDemoData } from './lib/api';
import { onDecisionsChanged } from './lib/decisions';
import { hasSeededDemo, isDemoRequested, markDemoSeeded } from './lib/demo';
import { toPersianDigits } from './lib/normalizeFa';
import { Toaster, toast } from './components/common/Toast';
import { ScreeningHome } from './components/screening/ScreeningHome';
import { ProcessingView } from './components/screening/ProcessingView';
import { ResultsView } from './components/screening/ResultsView';
import { StepperHeader } from './components/screening/StepperHeader';
import { BankHome } from './components/bank/BankHome';
import { DepartmentBankView } from './components/bank/DepartmentBankView';
import { DecisionsView } from './components/decisions/DecisionsView';
import { SplashScreen } from './components/common/SplashScreen';
import { WelcomeGate } from './components/common/WelcomeGate';
import { playCompletionChime } from './lib/sound';
import { getStoredUser, StoredUser } from './lib/user';

type TopTab = 'screening' | 'decisions' | 'bank';
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
  const [decisionCounts, setDecisionCounts] = useState<DecisionCounts | null>(null);
  // Which decision list to show, optionally scoped to one job position. The nonce
  // remounts the section so a scope coming from a screening session is applied.
  const [decisionsView, setDecisionsView] = useState<{
    status: DecidedStatus;
    departmentId?: string;
    roleTitle?: string;
    nonce: number;
  }>({ status: 'approved', nonce: 0 });

  const [progress, setProgress] = useState<ScreeningProgressUpdate>(EMPTY_PROGRESS);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [homeNonce, setHomeNonce] = useState(0); // remount home after finishing a batch
  const abortRef = useRef<AbortController | null>(null);

  // React committed: remove the pre-React boot overlay from index.html. If this
  // never runs, the watchdog in index.html reports the failure to the user.
  useEffect(() => {
    window.__hooshaBoot?.hide();
  }, []);

  /**
   * Stable identities. SplashScreen/WelcomeGate used to receive a fresh arrow
   * function on every render, which re-ran their timer effects and cancelled
   * the very timers that dismiss the overlay.
   */
  const handleSplashComplete = useCallback(() => setShowSplash(false), []);

  // Header badge: how many resumes are waiting in each decision list.
  const loadDecisionCounts = useCallback(() => {
    fetchDecisionsMeta()
      .then((m) => setDecisionCounts(m.counts))
      .catch(() => setDecisionCounts(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    loadDecisionCounts();
    return onDecisionsChanged(loadDecisionCounts);
  }, [user, loadDecisionCounts]);

  // ?demo=1 → one sample screening session so the whole product is clickable
  // without a Gemini key (non-production servers only).
  useEffect(() => {
    if (!user || !isDemoRequested() || hasSeededDemo(user.id)) return;
    let cancelled = false;
    seedDemoData()
      .then((res) => {
        if (cancelled) return;
        markDemoSeeded(user.id);
        setHomeNonce((n) => n + 1);
        loadDecisionCounts();
        if (res.created > 0) {
          toast(
            `داده نمونه ساخته شد (${toPersianDigits(res.created)} رزومه) — همه بخش‌ها قابل بررسی هستند`,
            'info'
          );
        }
      })
      .catch(() => {
        // Demo seeding is a convenience; failing silently keeps the app usable.
      });
    return () => {
      cancelled = true;
    };
  }, [user, loadDecisionCounts]);

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

  /**
   * Opens the decision workspace.
   * `scope` (from a screening session) always remounts so the position filter is
   * applied; a plain header-tab click keeps whatever the user already filtered —
   * and does nothing at all when the section is already open.
   */
  const openDecisions = useCallback(
    (status: DecidedStatus = 'approved', scope?: { departmentId?: string; roleTitle?: string }) => {
      setDecisionsView((prev) => ({
        status,
        departmentId: scope?.departmentId || '',
        roleTitle: scope?.roleTitle || '',
        nonce: prev.nonce + 1,
      }));
      setTab('decisions');
    },
    []
  );

  // Welcome gate completed: store the user and remount home so the recent
  // batches list refetches scoped to the new identity.
  const handleRegistered = (u: StoredUser) => {
    setUser(u);
    setHomeNonce((n) => n + 1);
  };

  /** Phones get a short label so all three sections stay visible without scrolling. */
  const tabLabel = (short: string, full: string) => (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 h-9 sm:h-10 rounded-[8px] text-xs font-bold cursor-pointer transition-all whitespace-nowrap shrink-0 ${
      active ? 'bg-brand text-white shadow-e1' : 'text-text-2 hover:text-brand'
    }`;

  const pending = decisionCounts ? decisionCounts.review : 0;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-surface-0 text-text-1 flex flex-col font-sans antialiased selection:bg-brand-soft selection:text-brand overflow-x-hidden"
    >
      {/* Top header */}
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

          <nav className="flex items-center gap-1 bg-surface-2 rounded-control p-1 shrink-0 max-w-full overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setTab('screening')}
              className={tabClass(tab === 'screening')}
              title="غربالگری جدید"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {tabLabel('غربالگری', 'غربالگری جدید')}
            </button>
            <button
              type="button"
              onClick={() => {
                if (tab === 'decisions') return;
                openDecisions(decisionsView.status);
              }}
              className={tabClass(tab === 'decisions')}
              title="رزومه‌های تایید/رد شده و نیاز به بررسی"
            >
              <BadgeCheck className="w-3.5 h-3.5 shrink-0" />
              {tabLabel('تایید/رد', 'تایید/رد شده')}
              {pending > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full tabular-nums ${
                    tab === 'decisions'
                      ? 'bg-white/25 text-white'
                      : 'bg-warning-soft text-warning border border-[var(--warning-border)]'
                  }`}
                  title={`${toPersianDigits(pending)} رزومه نیاز به بررسی دارد`}
                >
                  {toPersianDigits(pending)}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('bank');
                setBankView({ screen: 'home' });
              }}
              className={tabClass(tab === 'bank')}
              title="بانک رزومه"
            >
              <Library className="w-3.5 h-3.5 shrink-0" />
              {tabLabel('بانک', 'بانک رزومه')}
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
              <ResultsView
                batchId={batchId}
                onNewScreening={newScreening}
                onOpenDecisions={(scope) => openDecisions('approved', scope)}
              />
            ) : null}
          </>
        ) : tab === 'decisions' ? (
          <DecisionsView
            key={decisionsView.nonce}
            initialStatus={decisionsView.status}
            initialDepartmentId={decisionsView.departmentId}
            initialRoleTitle={decisionsView.roleTitle}
            onGoScreening={() => setTab('screening')}
          />
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
        <SplashScreen userName={user.name} onComplete={handleSplashComplete} />
      )}
      {!user && <WelcomeGate onComplete={handleRegistered} />}
    </div>
  );
}

export default App;
