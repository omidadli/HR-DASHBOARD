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
      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-right transition-all cursor-pointer min-h-[48px] ${
        checked
          ? 'border-brand/50 bg-brand-soft/60'
          : 'border-border-default bg-surface-1 hover:border-brand/30'
      }`}
    >
      <span
        className={`w-5.5 h-5.5 min-w-[22px] min-h-[22px] rounded-md border-2 flex items-center justify-center transition-all ${
          checked ? 'bg-brand border-brand text-white' : 'border-border-strong bg-surface-1'
        }`}
      >
        {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
      </span>
      <span className="text-xs sm:text-sm font-bold text-text-1 leading-relaxed flex-1">{q.label}</span>
      {q.kind === 'knockout' && (
        <span className="text-[10px] font-black text-danger bg-danger-soft border border-danger/20 px-1.5 py-0.5 rounded-full shrink-0">
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
  return (
    <div className="p-3 rounded-xl border border-border-default bg-surface-1 flex flex-col gap-2">
      <span className="text-xs sm:text-sm font-bold text-text-1">{q.label}</span>
      <div className="flex flex-wrap gap-1.5">
        {q.options.map((o) => {
          const active = values.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold border transition-all cursor-pointer min-h-[36px] ${
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
    setAnswers((prev) => ({
      ...prev,
      [q.id]: prev[q.id] === undefined ? !q.defaultChecked : !(prev[q.id] === true),
    }));
  };
  const toggleSingle = (q: SingleChoiceQuestion, v: string) => {
    setAnswers((prev) => ({ ...prev, [q.id]: v }));
  };
  const toggleMulti = (q: MultiChoiceQuestion, v: string) => {
    setAnswers((prev) => {
      const current = (prev[q.id] as string[]) ?? q.defaultValues;
      const next = current.includes(v) ? current.filter((x) => x !== v) : [...current, v];
      return { ...prev, [q.id]: next };
    });
  };

  const valueOf = (q: ScreeningQuestion): boolean | string[] => {
    if (q.type === 'boolean') return answers[q.id] === undefined ? q.defaultChecked : answers[q.id] === true;
    if (q.type === 'single') return [String(answers[q.id] ?? q.defaultValue)];
    return ((answers[q.id] as string[]) ?? q.defaultValues) as string[];
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-black text-text-1 flex items-center gap-1.5">
        <ListChecks className="w-4 h-4 text-brand" />
        چی برات مهمه؟ تیک بزن 👇
      </span>

      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[52px] rounded-xl bg-surface-1 border border-border-default animate-pulse" />
          ))}
          <div className="flex items-center gap-2 text-xs text-info font-bold justify-center py-1">
            <Loader2 className="w-4 h-4 animate-spin" />
            هوش مصنوعی داره سوال‌های مخصوص این شغل رو می‌سازه…
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="p-3.5 rounded-xl bg-danger-soft border border-danger/30 flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-danger leading-relaxed font-bold">{error}</div>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-danger text-white text-[11px] font-black cursor-pointer hover:bg-red-800"
          >
            <RotateCcw className="w-3 h-3" />
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
