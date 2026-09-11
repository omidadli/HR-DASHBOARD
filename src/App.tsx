import React, { useState, useRef, useEffect } from 'react';
import { StepperHeader } from './components/StepperHeader';
import { StartScreen } from './components/StartScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { JobUnderstanding, ResumeFileItem } from './types/screening';
import { checkScreeningHealth, runScreeningQueue } from './lib/queue';

export function App() {
  // 1. Current Step: 'start' | 'processing' | 'results'
  const [currentStep, setCurrentStep] = useState<'start' | 'processing' | 'results'>('start');

  // 2. Job description input (free text)
  const [jobDescription, setJobDescription] = useState<string>('');

  // 3. Resumes list
  const [files, setFiles] = useState<ResumeFileItem[]>([]);

  // 4. Processing Screen States
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [errorCount, setErrorCount] = useState<number>(0);
  const [currentEvaluatingName, setCurrentEvaluatingName] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [serverError, setServerError] = useState<string>('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processingItems, setProcessingItems] = useState<ResumeFileItem[]>([]);

  // 5. Results Screen States
  const [jobUnderstanding, setJobUnderstanding] = useState<JobUnderstanding | null>(null);
  const [screenedItems, setScreenedItems] = useState<ResumeFileItem[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Check server health and Gemini API key on load
  useEffect(() => {
    checkScreeningHealth().then((health) => {
      if (!health.available && health.error) {
        setServerError(health.error);
      }
    });
  }, []);

  // Handler: Start Screening
  const handleStartScreening = async () => {
    if (!jobDescription.trim() || files.length === 0) return;

    setServerError('');
    const health = await checkScreeningHealth();
    if (!health.available) {
      setServerError(health.error || 'سرور غربالگری در دسترس نیست.');
      return;
    }

    // Set up queue state
    setTotalCount(files.length);
    setProcessedCount(0);
    setSuccessCount(0);
    setQueuedCount(files.length);
    setErrorCount(0);
    setCurrentEvaluatingName('');
    setStatusText('در حال شروع پایپلاین غربالگری هوشمند…');
    setProcessingError(null);
    setProcessingItems(files.map((f) => ({ ...f, status: 'queued' })));

    // Switch to processing screen
    setCurrentStep('processing');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await runScreeningQueue(
        jobDescription,
        files,
        (progress) => {
          setProcessedCount(progress.processedCount);
          setTotalCount(progress.totalCount);
          setProcessingItems(progress.items);
          if (progress.currentEvaluatingName) {
            setCurrentEvaluatingName(progress.currentEvaluatingName);
          }
          if (progress.statusText) {
            setStatusText(progress.statusText);
          }

          // Count statuses
          const success = progress.items.filter((it) => it.status === 'success').length;
          const unjudgeableOrErr = progress.items.filter(
            (it) => it.status === 'error' || it.status === 'unjudgeable'
          ).length;
          const queued = progress.items.filter(
            (it) => it.status === 'queued' || it.status === 'extracting' || it.status === 'evaluating'
          ).length;

          setSuccessCount(success);
          setErrorCount(unjudgeableOrErr);
          setQueuedCount(queued);
        },
        controller.signal
      );

      // Successfully finished all resumes and calibration
      setJobUnderstanding(result.jobUnderstanding);
      setScreenedItems(result.items);
      setCurrentStep('results');
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.message?.includes('Aborted')) {
        console.log('Screening aborted by user.');
        setCurrentStep('start');
      } else {
        console.error('Screening process error:', err);
        setProcessingError(err?.message || 'خطا در برقراری ارتباط با سرور غربالگری');
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  // Handler: Cancel and return
  const handleCancelScreening = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setProcessingError(null);
    setCurrentStep('start');
  };

  // Handler: Reset everything and start over
  const handleResetScreening = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setJobDescription('');
    setFiles([]);
    setJobUnderstanding(null);
    setScreenedItems([]);
    setProcessingItems([]);
    setProcessingError(null);
    setProcessedCount(0);
    setTotalCount(0);
    setSuccessCount(0);
    setQueuedCount(0);
    setErrorCount(0);
    setCurrentStep('start');
  };

  return (
    <div className="min-h-screen bg-surface-0 text-text-1 flex flex-col font-sans antialiased selection:bg-brand-soft selection:text-brand" dir="rtl">
      {/* 3-Step Navigation Header */}
      <StepperHeader currentStep={currentStep} />

      {/* Main Container: exactly 1 of 3 screens */}
      <main className="flex-1 flex flex-col justify-start">
        {currentStep === 'start' && (
          <StartScreen
            jobDescription={jobDescription}
            setJobDescription={setJobDescription}
            files={files}
            setFiles={setFiles}
            onStart={handleStartScreening}
            serverError={serverError}
          />
        )}

        {currentStep === 'processing' && (
          <ProcessingScreen
            processedCount={processedCount}
            totalCount={totalCount}
            successCount={successCount}
            queuedCount={queuedCount}
            errorCount={errorCount}
            currentEvaluatingName={currentEvaluatingName}
            statusText={statusText}
            items={processingItems}
            error={processingError}
            onRetry={handleStartScreening}
            onCancel={handleCancelScreening}
          />
        )}

        {currentStep === 'results' && jobUnderstanding && (
          <ResultsScreen
            jobUnderstanding={jobUnderstanding}
            jobDescription={jobDescription}
            items={screenedItems}
            onReset={handleResetScreening}
          />
        )}
      </main>

      {/* Footer Branding - clean and subtle */}
      <footer className="w-full py-4 text-center text-xs text-text-3 border-t border-border-default bg-surface-1 no-print">
        <span>سامانه هوشمند غربالگری رزومه • سیلانه سبز</span>
      </footer>
    </div>
  );
}

export default App;
