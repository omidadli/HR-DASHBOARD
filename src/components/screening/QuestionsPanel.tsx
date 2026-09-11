import React from 'react';
import { ListChecks, Loader2, AlertCircle, RotateCcw, Check } from 'lucide-react';
import {
  BooleanQuestion,
  JobUnderstanding,
  MultiChoiceQuestion,
  ScreeningAnswers,
  ScreeningQuestion,
  SingleChoiceQuestion,
} from '../../types/screening';

interface QuestionsPanelProps {
  loading: boolean;
  error: string | null;
  understanding: JobUnderstanding | null;
  answers: ScreeningAnswers;
  setAnswers: React.Dispatch<React.SetStateAction<ScreeningAnswers>>;
  onRetry: () => void;
}

function BooleanRow({
  q,
  checked,
  onToggle,
}: {
  q: BooleanQuestion;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-control border text-right transition-all cursor-pointer min-h-[48px] ${
        checked
          ? 'border-brand/50 bg-brand-soft/60'
          : 'border-border-default bg-surface-1 hover:border-brand/30'
      }`}
    >
      <span
        className={`w-5.5 h-5.5 min-w-[22px] min-h-[22px] rounded-md border flex items-center justify-center transition-all ${
          checked ? 'bg-brand border-brand text-white' : 'border-border-strong bg-surface-1'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
      </span>
      <span className="text-xs sm:text-sm font-bold text-text-1 leading-relaxed flex-1">{q.label}</span>
      {q.kind === 'knockout' && (
        <span className="text-xs font-bold text-text-2 bg-surface-2 border border-border-default px-2 py-0.5 rounded-full shrink-0">
          شرط اصلی
        </span>
      )}
    </button>
  );
}

function ChipGroup({
  q,
  values,
  onToggle,
  multi,
}: {
  q: SingleChoiceQuestion | MultiChoiceQuestion;
  values: string[];
  onToggle: (v: string) => void;
  multi: boolean;
}) {
  const safeValues: string[] = Array.isArray(values)
    ? values.map(String)
    : values !== null && values !== undefined
    ? [String(values)]
    : [];

  const safeOptions = Array.isArray(q.options) ? q.options : [];

  return (
    <div className="p-3 rounded-control border border-border-default bg-surface-1 flex flex-col gap-2">
      <span className="text-xs sm:text-sm font-bold text-text-1">{q.label}</span>
      <div className="flex flex-wrap gap-1.5">
        {safeOptions.map((o) => {
          const optVal = String(o.value);
          const active = safeValues.includes(optVal);
          return (
            <button
              key={optVal}
              type="button"
              onClick={() => onToggle(optVal)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer min-h-[36px] ${
                active
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-surface-2 text-text-2 border-border-default hover:border-brand/40'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const QuestionsPanel: React.FC<QuestionsPanelProps> = ({
  loading,
  error,
  understanding,
  answers,
  setAnswers,
  onRetry,
}) => {
  const toggleBoolean = (q: BooleanQuestion) => {
    setAnswers((prev) => {
      const current = typeof prev[q.id] === 'boolean' ? prev[q.id] : Boolean(q.defaultChecked);
      return {
        ...prev,
        [q.id]: !current,
      };
    });
  };

  const toggleSingle = (q: SingleChoiceQuestion, v: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: String(v) }));
  };

  const toggleMulti = (q: MultiChoiceQuestion, v: string) => {
    setAnswers((prev) => {
      const rawCurrent = prev[q.id];
      const current: string[] = Array.isArray(rawCurrent)
        ? rawCurrent.map(String)
        : typeof rawCurrent === 'string'
        ? [rawCurrent]
        : Array.isArray(q.defaultValues)
        ? q.defaultValues.map(String)
        : [];
      const valStr = String(v);
      const next = current.includes(valStr)
        ? current.filter((x) => x !== valStr)
        : [...current, valStr];
      return { ...prev, [q.id]: next };
    });
  };

  const valueOf = (q: ScreeningQuestion): boolean | string[] => {
    if (q.type === 'boolean') {
      const v = answers[q.id];
      if (typeof v === 'boolean') return v;
      return Boolean(q.defaultChecked);
    }
    if (q.type === 'single') {
      const v = answers[q.id];
      const selected =
        typeof v === 'string'
          ? v
          : v !== undefined && v !== null
          ? String(v)
          : typeof q.defaultValue === 'string'
          ? q.defaultValue
          : String(q.options?.[0]?.value ?? '');
      return [selected];
    }
    const v = answers[q.id];
    if (Array.isArray(v)) {
      return v.map(String);
    }
    if (typeof v === 'string') {
      return [v];
    }
    if (Array.isArray(q.defaultValues)) {
      return q.defaultValues.map(String);
    }
    return [];
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-bold text-text-1 flex items-center gap-1.5">
        <ListChecks className="w-4 h-4 text-brand" />
        چی برات مهمه؟ تیک بزن
      </span>

      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[52px] rounded-control bg-surface-1 border border-border-default animate-pulse" />
          ))}
          <div className="flex items-center gap-2 text-xs text-info font-bold justify-center py-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            هوش مصنوعی در حال تدوین معیارهای ارزیابی این شغل است…
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="p-3.5 rounded-control bg-danger-soft border border-danger/30 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-danger leading-relaxed font-bold">{error}</div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-control bg-danger text-white text-xs font-bold cursor-pointer hover:opacity-90 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            تلاش مجدد
          </button>
        </div>
      )}

      {!loading && !error && understanding && Array.isArray(understanding.questions) && (
        <div className="flex flex-col gap-2">
          {understanding.questions.map((q) => {
            if (q.type === 'boolean') {
              return (
                <BooleanRow
                  key={q.id}
                  q={q}
                  checked={valueOf(q) as boolean}
                  onToggle={() => toggleBoolean(q)}
                />
              );
            }
            if (q.type === 'single') {
              return (
                <ChipGroup
                  key={q.id}
                  q={q}
                  multi={false}
                  values={valueOf(q) as string[]}
                  onToggle={(v) => toggleSingle(q, v)}
                />
              );
            }
            return (
              <ChipGroup
                key={q.id}
                q={q}
                multi
                values={valueOf(q) as string[]}
                onToggle={(v) => toggleMulti(q, v)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
