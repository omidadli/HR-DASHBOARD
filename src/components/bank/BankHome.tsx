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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-soft text-brand text-xs font-bold border border-brand/20">
          <Library className="w-3.5 h-3.5" />
          بانک رزومه هلدینگ سیلانه سبز
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-1">بانک استعدادها و رزومه‌های برگزیده</h1>
        <p className="text-xs text-text-3 max-w-lg leading-relaxed">
          رزومه‌های منتخب ذخیره‌شده بر اساس دپارتمان‌های تخصصی برای دسترسی سریع در فرصت‌های شغلی آینده.
          {!loading && total > 0 && (
            <span className="font-bold text-brand block sm:inline sm:mr-1">
              در حال حاضر {toPersianDigits(total)} رزومه در بانک نگهداری می‌شود.
            </span>
          )}
        </p>
      </div>

      {/* Global search */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-3 absolute right-3.5 top-3.5" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجوی نام، سمت، مهارت یا برچسب در کل بانک رزومه…"
          className="w-full pr-10 pl-10 py-2.5 rounded-control bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute left-3 top-3 text-text-3 hover:text-text-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search results */}
      {results !== null ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-text-3">
            {searching ? 'در حال جستجو…' : `${toPersianDigits(results.length)} رزومه یافت شد`}
          </span>
          {results.length === 0 ? (
            <div className="p-8 text-center bg-surface-1 rounded-card border border-dashed border-border-default text-xs text-text-3">
              رزومه‌ای مطابق با عبارت جستجو پیدا نشد.
            </div>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  onOpenResult(r.id, r.bankDepartmentId || r.departmentId, r.candidateName || query)
                }
                className="w-full flex items-center gap-3 p-3 rounded-card bg-surface-1 border border-border-default hover:border-brand/50 text-right cursor-pointer shadow-xs transition-colors"
              >
                <span className="w-10 h-10 rounded-full bg-brand-soft text-brand font-bold flex items-center justify-center text-xs shrink-0">
                  {(r.candidateName?.trim()[0] || '؟') + (r.candidateName?.trim().split(/\s+/)[1]?.[0] || '')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-text-1 truncate">{r.candidateName || r.fileName}</div>
                  <div className="text-xs text-text-3 truncate mt-0.5">
                    {[r.facts?.lastRole, r.tags.slice(0, 3).join('، ')].filter(Boolean).join(' • ')}
                  </div>
                </div>
                <span className="text-xs font-medium text-text-3 bg-surface-2 px-2 py-1 rounded-full shrink-0">
                  {r.departmentName}
                </span>
                <span className="text-sm font-bold text-brand shrink-0">
                  {toPersianDigits(r.score)} امتیاز
                </span>
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
                <div key={i} className="h-28 rounded-card bg-surface-1 border border-border-default animate-pulse" />
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
                    className={`relative flex flex-col items-start gap-2.5 p-4 rounded-card border text-right transition-all cursor-pointer min-h-[116px] ${
                      empty
                        ? 'bg-surface-1/70 border-border-default opacity-70 hover:opacity-100 hover:border-brand/30'
                        : 'bg-surface-1 border-border-default hover:border-brand/50 hover:shadow-xs'
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-control border border-border-default bg-surface-2 text-text-2 flex items-center justify-center ${empty ? 'opacity-60' : ''}`}>
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className={`text-xs sm:text-[13px] font-bold leading-tight ${empty ? 'text-text-3' : 'text-text-1'}`}>
                      {d.name}
                    </span>
                    <span
                      className={`mt-auto text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        empty ? 'bg-surface-2 text-text-3' : 'bg-brand-soft text-brand'
                      }`}
                    >
                      {empty ? 'هنوز رزومه‌ای ندارد' : `${toPersianDigits(count)} رزومه`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {!loading && total === 0 && (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-text-3 bg-surface-1 border border-dashed border-border-default rounded-card mt-2">
              <Inbox className="w-9 h-9 text-text-3 opacity-50" />
              <p className="text-xs font-medium max-w-sm">
                هنوز هیچ رزومه‌ای به بانک اضافه نشده است. پس از اجرای هر غربالگری، می‌توانید رزومه‌های برگزیده را با دکمه «بانک رزومه» به این بخش اضافه نمایید.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
