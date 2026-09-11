import React, { useEffect, useState } from 'react';
import { Library, Search, X, Inbox } from 'lucide-react';
import { DEPARTMENTS } from '../../lib/departments';
import { fetchBankDepartments } from '../../lib/api';
import { toPersianDigits } from '../../lib/normalizeFa';
import type { BankDepartmentCount, ResumeRecord } from '../../types/screening';

interface BankHomeProps {
  onOpenDepartment: (id: string) => void;
  onOpenResult: (resumeId: string, departmentId: string, query: string) => void;
}

export const BankHome: React.FC<BankHomeProps> = ({ onOpenDepartment, onOpenResult }) => {
  const [counts, setCounts] = useState<BankDepartmentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResumeRecord[] | null>(null);
  const [searching, setSearching] = useState(false);

  const load = () => {
    setLoading(true);
    fetchBankDepartments()
      .then((d) => setCounts(d.departments))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/bank/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.items || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const countFor = (id: string) => counts.find((c) => c.id === id)?.count || 0;
  const total = counts.reduce((s, c) => s + c.count, 0);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-8 flex flex-col gap-5">
      <div className="text-center flex flex-col items-center gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand text-[11px] font-black border border-brand/20">
          <Library className="w-3.5 h-3.5" />
          بانک رزومه سیلانه سبز
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-text-1">رزومه‌های خوب، برای روز مبادا 📚</h1>
        <p className="text-xs sm:text-sm text-text-3 max-w-md">
          رزومه‌هایی که به بانک اضافه کرده‌ای، گروه‌شده بر اساس دپارتمان همین‌جا نگه داشته می‌شوند.
          {!loading && total > 0 && (
            <span className="font-black text-brand"> مجموعاً {toPersianDigits(total)} رزومه ذخیره شده.</span>
          )}
        </p>
      </div>

      {/* Global search */}
      <div className="relative">
        <Search className="w-4.5 h-4.5 text-text-3 absolute right-3.5 top-3.5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام، سمت یا مهارت در کل بانک…"
          className="w-full pr-11 pl-10 py-3 rounded-2xl bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute left-3 top-3.5 text-text-3 hover:text-text-1 cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        )}
      </div>

      {/* Search results */}
      {results !== null ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-black text-text-3">
            {searching ? 'در حال جستجو…' : `${toPersianDigits(results.length)} نتیجه`}
          </span>
          {results.length === 0 ? (
            <div className="p-8 text-center bg-surface-1 rounded-2xl border border-dashed border-border-default text-xs text-text-3">
              موردی پیدا نشد.
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  onOpenResult(r.id, r.bankDepartmentId || r.departmentId, r.candidateName || query)
                }
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface-1 border border-border-default hover:border-brand/50 text-right cursor-pointer"
              >
                <span className="w-10 h-10 rounded-full bg-brand-soft text-brand font-black flex items-center justify-center text-sm shrink-0">
                  {(r.candidateName?.trim()[0] || '؟') + (r.candidateName?.trim().split(/\s+/)[1]?.[0] || '')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-black text-text-1 truncate">{r.candidateName || r.fileName}</div>
                  <div className="text-[10px] text-text-3 truncate">
                    {[r.facts?.lastRole, r.tags.slice(0, 2).join('، ')].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-text-3 shrink-0">{r.departmentName}</span>
                <span className="text-sm font-black font-mono text-brand shrink-0">{toPersianDigits(r.score)}</span>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Department grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-28 rounded-2xl bg-surface-1 border border-border-default animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DEPARTMENTS.map((d) => {
                const Icon = d.icon;
                const count = countFor(d.id);
                const empty = count === 0;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onOpenDepartment(d.id)}
                    className={`relative flex flex-col items-start gap-2.5 p-4 rounded-2xl border text-right transition-all cursor-pointer min-h-[112px] ${
                      empty
                        ? 'bg-surface-1 border-border-default/70 hover:border-brand/30'
                        : 'bg-surface-1 border-border-default hover:border-brand/50 hover:shadow-xs'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${d.accent} ${empty ? 'opacity-40' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className={`text-xs font-black leading-tight ${empty ? 'text-text-3' : 'text-text-1'}`}>
                      {d.name}
                    </span>
                    <span
                      className={`mt-auto text-[10px] font-black px-2 py-0.5 rounded-full ${
                        empty ? 'bg-surface-2 text-text-3' : 'bg-brand-soft text-brand'
                      }`}
                    >
                      {empty ? 'خالی' : `${toPersianDigits(count)} رزومه`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && total === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-text-3">
              <Inbox className="w-10 h-10 opacity-50" />
              <p className="text-xs font-bold">
                هنوز رزومه‌ای به بانک اضافه نشده. بعد از هر غربالگری، روی دکمه «بانک رزومه» کارت‌ها بزن.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
