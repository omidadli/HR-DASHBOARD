import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Briefcase, ChevronDown, AlertCircle, Play, Bot } from 'lucide-react';
import { DEPARTMENTS } from '../../lib/departments';
import {
  JobUnderstanding,
  ResumeFileItem,
  ScreeningAnswers,
  ScreeningBatch,
} from '../../types/screening';
import { checkHealth, fetchRecentBatches, fetchUnderstanding } from '../../lib/api';
import { toPersianDigits } from '../../lib/normalizeFa';
import { UploadZone } from './UploadZone';
import { QuestionsPanel } from './QuestionsPanel';
import { RecentBatches } from './RecentBatches';

interface ScreeningHomeProps {
  onStart: (payload: {
    departmentId: string;
    departmentName: string;
    roleTitle: string;
    extraNotes: string;
    understanding: JobUnderstanding;
    answers: ScreeningAnswers;
    files: ResumeFileItem[];
  }) => void;
  onOpenBatch: (batchId: string) => void;
}

export const ScreeningHome: React.FC<ScreeningHomeProps> = ({ onStart, onOpenBatch }) => {
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [roleTitle, setRoleTitle] = useState('');
  const [extraNotes, setExtraNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const [understanding, setUnderstanding] = useState<JobUnderstanding | null>(null);
  const [answers, setAnswers] = useState<ScreeningAnswers>({});
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState<string | null>(null);

  const [files, setFiles] = useState<ResumeFileItem[]>([]);
  const [recent, setRecent] = useState<ScreeningBatch[]>([]);
  const [healthError, setHealthError] = useState<string | null>(null);

  const reqSeq = useRef(0);
  const titleDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    checkHealth().then((h) => !h.available && setHealthError(h.error || ''));
    fetchRecentBatches(5).then(setRecent).catch(() => {});
  }, []);

  const loadQuestions = useCallback(async (deptId: string, title: string, notes: string) => {
    const seq = ++reqSeq.current;
    setQLoading(true);
    setQError(null);
    try {
      const u = await fetchUnderstanding(deptId, title, notes);
      if (seq !== reqSeq.current) return;
      if (!u || !Array.isArray(u.questions)) {
        throw new Error('قالب پرسش‌نامه دریافتی نامعتبر است');
      }
      setUnderstanding(u);
      setAnswers((prev) => {
        const next = { ...prev };
        for (const q of u.questions) {
          if (next[q.id] === undefined) {
            if (q.type === 'boolean') next[q.id] = q.defaultChecked;
            else if (q.type === 'single') next[q.id] = q.defaultValue;
            else next[q.id] = [...(q.defaultValues || [])];
          }
        }
        return next;
      });
    } catch (e: any) {
      if (seq !== reqSeq.current) return;
      setUnderstanding(null);
      setQError(e?.message || 'ساخت سوال‌ها ممکن نشد');
    } finally {
      if (seq === reqSeq.current) setQLoading(false);
    }
  }, []);

  const selectDepartment = (id: string) => {
    setDepartmentId(id);
    setUnderstanding(null);
    loadQuestions(id, roleTitle, extraNotes);
  };

  const onTitleChange = (v: string) => {
    setRoleTitle(v);
    if (departmentId) {
      if (titleDebounce.current) clearTimeout(titleDebounce.current);
      titleDebounce.current = setTimeout(() => loadQuestions(departmentId, v, extraNotes), 800);
    }
  };

  const dept = DEPARTMENTS.find((d) => d.id === departmentId);
  const canStart =
    Boolean(departmentId) &&
    files.length > 0 &&
    Boolean(understanding) &&
    !qLoading &&
    !qError;

  const start = () => {
    if (!canStart || !understanding || !dept) return;
    onStart({
      departmentId: dept.id,
      departmentName: dept.name,
      roleTitle,
      extraNotes,
      understanding,
      answers,
      files,
    });
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-6">
      {/* Heading */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand text-[11px] font-black border border-brand/20">
          <Sparkles className="w-3.5 h-3.5" />
          دستیار هوشمند جذب نیرو
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-text-1 tracking-tight">
          برای کدوم دپارتمان نیرو می‌خوای؟
        </h1>
        <p className="text-xs sm:text-sm text-text-3 max-w-md leading-relaxed">
          اول دپارتمان رو انتخاب کن، چند تا تیک ساده بزن و رزومه‌ها رو بریز؛ بقیه‌اش با هوش مصنوعی.
        </p>
      </div>

      {healthError && (
        <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 text-danger text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{healthError}</span>
        </div>
      )}

      {/* Step 1: Department */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-brand text-white text-[11px] font-black flex items-center justify-center">
            ۱
          </span>
          <h2 className="text-sm font-black text-text-1">دپارتمان رو انتخاب کن</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {DEPARTMENTS.map((d) => {
            const Icon = d.icon;
            const active = d.id === departmentId;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => selectDepartment(d.id)}
                className={`flex items-center gap-2.5 p-2.5 sm:p-3 rounded-control border text-right transition-all cursor-pointer min-h-[52px] ${
                  active
                    ? 'border-brand bg-brand-soft/70 ring-2 ring-brand/15 shadow-e1'
                    : 'border-border-default bg-surface-1 hover:border-brand/40'
                }`}
              >
                <span
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                    active
                      ? 'bg-brand border-brand text-white'
                      : 'bg-surface-2 border-border-default text-text-2'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className={`text-xs font-bold leading-tight ${active ? 'text-brand' : 'text-text-1'}`}>
                  {d.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: Role + questions */}
      {departmentId && (
        <section className="flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-brand text-white text-[11px] font-black flex items-center justify-center">
              ۲
            </span>
            <h2 className="text-sm font-black text-text-1">شغل و اولویت‌ها</h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-text-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              عنوان شغلی <span className="text-text-3 font-normal">(اختیاری)</span>
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="مثلاً: کارشناس فروش حضوری"
              className="w-full p-3 rounded-xl bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-sm placeholder:text-text-3"
            />
          </div>

          <QuestionsPanel
            loading={qLoading}
            error={qError}
            understanding={understanding}
            answers={answers}
            setAnswers={setAnswers}
            onRetry={() => departmentId && loadQuestions(departmentId, roleTitle, extraNotes)}
          />

          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            className="self-start inline-flex items-center gap-1 text-[11px] font-bold text-text-3 hover:text-brand cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showNotes ? 'rotate-180' : ''}`} />
            توضیح بیشتری داری؟ (اختیاری)
          </button>
          {showNotes && (
            <textarea
              value={extraNotes}
              onChange={(e) => setExtraNotes(e.target.value)}
              rows={3}
              placeholder="هر نکته‌ای که دوست داری هوش مصنوعی بداند…"
              className="w-full p-3 rounded-xl bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs resize-y placeholder:text-text-3"
            />
          )}

          {understanding && (
            <div className="p-3.5 rounded-control bg-brand-soft border border-brand/20 text-xs text-text-2 leading-relaxed flex items-start gap-2">
              <Bot className="w-4 h-4 text-brand shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-brand">تحلیل هوش مصنوعی از این موقعیت شغلی: </span>
                <span>{understanding.plainExplanation}</span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Step 3: Upload */}
      {departmentId && (
        <section className="flex flex-col gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-control bg-brand text-white text-xs font-bold flex items-center justify-center">
              ۳
            </span>
            <h2 className="text-sm font-bold text-text-1">رزومه‌ها را اضافه کنید</h2>
          </div>
          <UploadZone files={files} setFiles={setFiles} />
        </section>
      )}

      {/* Start */}
      {departmentId && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className={`w-full sm:w-auto sm:min-w-[300px] py-3 px-8 rounded-control text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              canStart
                ? 'bg-brand hover:bg-brand-hover text-white cursor-pointer shadow-e1 ring-2 ring-brand/15 active:scale-[0.99]'
                : 'bg-surface-2 text-text-3 border border-border-default cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4" />
            شروع تحلیل هوشمند
            {files.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 font-sans font-bold">
                {toPersianDigits(files.length)} رزومه
              </span>
            )}
          </button>
          {!canStart && (
            <span className="text-xs text-text-3 font-medium">
              {!files.length
                ? 'هنوز رزومه‌ای اضافه نکردید'
                : qLoading
                ? 'چند لحظه صبر کنید تا سوال‌ها آماده شوند'
                : ''}
            </span>
          )}
        </div>
      )}

      {/* Recent */}
      <RecentBatches batches={recent} onOpen={onOpenBatch} />
    </div>
  );
};
