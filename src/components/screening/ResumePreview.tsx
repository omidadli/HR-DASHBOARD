import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  ExternalLink,
  FileText,
  FileWarning,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { ResumeRecord } from '../../types/screening';
import { filePreviewUrl, scopedHeaders } from '../../lib/api';

type PreviewKind = 'pdf' | 'image' | 'text' | 'other';
type PreviewStatus = 'loading' | 'ready' | 'error';

interface ResumePreviewProps {
  record: ResumeRecord;
  /** Extra classes for the outer frame (height is managed by the parent). */
  className?: string;
  onDownload?: () => void;
}

function kindFor(ext: string, mime: string): PreviewKind {
  const e = ext.toLowerCase();
  if (e === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff'].includes(e))
    return 'image';
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'log'].includes(e)) return 'text';
  return 'other';
}

/**
 * In-app preview of the ORIGINAL uploaded resume file.
 *
 * The file is fetched from the API (same origin, scoped to the current user)
 * and rendered as a blob: PDFs in an iframe, images directly, plain text in a
 * reader pane. Anything the browser cannot render (Word/zip) falls back to the
 * text هوشا extracted from the file plus a download button, so the user is never
 * left with a blank box.
 */
export const ResumePreview: React.FC<ResumePreviewProps> = ({ record, className = '', onDownload }) => {
  const [status, setStatus] = useState<PreviewStatus>('loading');
  const [kind, setKind] = useState<PreviewKind>('other');
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const objectUrlRef = useRef<string | null>(null);
  const aliveRef = useRef(true);

  const ext = (record.fileName || '').split('.').pop() || '';

  const load = useCallback(async () => {
    aliveRef.current = true;
    setStatus('loading');
    setError(null);
    setTextContent('');
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setUrl(null);

    if (!record.filePath) {
      // Nothing was stored on the server (very old record): show what we have.
      setKind('other');
      setStatus('ready');
      setTextContent(record.extractedText || '');
      return;
    }

    try {
      const res = await fetch(filePreviewUrl(record.id), { headers: scopedHeaders() });
      if (!res.ok) throw new Error(`خطا در دریافت فایل (${res.status})`);
      const mime = res.headers.get('content-type') || '';
      const detected = kindFor(ext, mime);
      if (!aliveRef.current) return;
      setKind(detected);

      if (detected === 'text') {
        const text = await res.text();
        if (!aliveRef.current) return;
        setTextContent(text.slice(0, 60000));
      } else {
        const blob = await res.blob();
        if (!aliveRef.current) return;
        const blobUrl = URL.createObjectURL(blob);
        objectUrlRef.current = blobUrl;
        setUrl(blobUrl);
      }
      setStatus('ready');
    } catch (e: any) {
      if (!aliveRef.current) return;
      setError(e?.message || 'نمایش فایل ممکن نشد');
      setKind('other');
      setTextContent(record.extractedText || '');
      setStatus('error');
    }
  }, [record.id, record.filePath, record.extractedText, ext]);

  useEffect(() => {
    void load();
    return () => {
      aliveRef.current = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [load, reloadKey]);

  const download = async () => {
    onDownload?.();
  };

  return (
    <div className={`flex flex-col rounded-card border border-border-default bg-surface-1 overflow-hidden shadow-xs ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-default bg-surface-2/50 shrink-0">
        <span className="w-8 h-8 rounded-control bg-surface-1 border border-border-default flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-brand" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-text-1 truncate" dir="ltr" style={{ textAlign: 'right' }}>
            {record.fileName}
          </div>
          <div className="text-[11px] text-text-3">
            {status === 'loading'
              ? 'در حال بارگذاری فایل اصلی…'
              : kind === 'pdf'
              ? 'پیش‌نمایش PDF'
              : kind === 'image'
              ? 'پیش‌نمایش تصویر رزومه'
              : kind === 'text'
              ? 'پیش‌نمایش متن فایل'
              : 'پیش‌نمایش این فرمت در مرورگر ممکن نیست'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          title="بارگذاری مجدد پیش‌نمایش"
          className="w-9 h-9 rounded-control border border-border-default bg-surface-1 flex items-center justify-center text-text-2 hover:border-brand/40 hover:text-brand cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin text-brand' : ''}`} />
        </button>
        <a
          href={record.filePath ? filePreviewUrl(record.id) : undefined}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            if (!record.filePath) e.preventDefault();
          }}
          title="باز کردن در تب جدید"
          className={`w-9 h-9 rounded-control border border-border-default bg-surface-1 flex items-center justify-center text-text-2 hover:border-brand/40 hover:text-brand shrink-0 ${
            record.filePath ? 'cursor-pointer' : 'opacity-40 pointer-events-none'
          }`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button
          type="button"
          onClick={download}
          disabled={!record.filePath}
          title="دانلود فایل اصلی رزومه"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-control bg-brand text-white text-xs font-bold cursor-pointer hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">دانلود</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 bg-surface-2/40 relative overflow-auto">
        {status === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-text-3">
            <Loader2 className="w-6 h-6 animate-spin text-brand" />
            <span className="text-xs font-bold">در حال آماده‌سازی پیش‌نمایش…</span>
          </div>
        )}

        {status !== 'loading' && kind === 'pdf' && url && (
          <iframe
            src={url}
            title={`پیش‌نمایش رزومه ${record.candidateName || record.fileName}`}
            className="w-full h-full min-h-[420px] bg-white"
          />
        )}

        {status !== 'loading' && kind === 'image' && url && (
          <div className="w-full h-full min-h-[420px] overflow-auto p-3 flex items-start justify-center">
            <img
              src={url}
              alt={`رزومه ${record.candidateName || record.fileName}`}
              className="max-w-full h-auto rounded-control shadow-e1 bg-white"
            />
          </div>
        )}

        {status !== 'loading' && kind === 'text' && (
          <pre
            dir="auto"
            className="w-full h-full min-h-[420px] overflow-auto p-4 text-[11px] leading-relaxed text-text-2 whitespace-pre-wrap bg-surface-1 font-sans"
          >
            {textContent || 'فایل متنی خالی است.'}
          </pre>
        )}

        {status !== 'loading' && kind === 'other' && (
          <div className="w-full h-full min-h-[420px] overflow-auto p-4 flex flex-col gap-3">
            <div
              className={`rounded-control border p-3.5 flex items-start gap-2.5 ${
                status === 'error'
                  ? 'bg-danger-soft border-[var(--danger-border)]'
                  : 'bg-warning-soft border-[var(--warning-border)]'
              }`}
            >
              <FileWarning className={`w-4 h-4 shrink-0 ${status === 'error' ? 'text-danger' : 'text-warning'}`} />
              <div className="text-xs leading-relaxed">
                <p className={`font-bold ${status === 'error' ? 'text-danger' : 'text-warning'}`}>
                  {status === 'error' ? 'فایل باز نشد' : 'پیش‌نمایش این فرمت در مرورگر ممکن نیست'}
                </p>
                <p className="text-text-2 mt-0.5">
                  {status === 'error'
                    ? error || 'اتصال یا فایل را بررسی کنید.'
                    : 'فایل‌های Word را می‌توانید دانلود و در سیستم خود باز کنید. متن استخراج‌شده توسط هوشا در ادامه نمایش داده می‌شود.'}
                </p>
              </div>
            </div>
            {textContent ? (
              <div className="rounded-control border border-border-default bg-surface-1 p-3.5">
                <div className="text-[11px] font-bold text-text-3 mb-2">متن استخراج‌شده از رزومه</div>
                <pre
                  dir="auto"
                  className="text-[11px] leading-relaxed text-text-2 whitespace-pre-wrap font-sans max-h-[46vh] overflow-auto"
                >
                  {textContent}
                </pre>
              </div>
            ) : (
              <div className="rounded-control border border-dashed border-border-default bg-surface-1 p-6 text-center text-xs text-text-3">
                متنی از این فایل استخراج نشده است.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumePreview;
