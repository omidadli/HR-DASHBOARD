import React, { useEffect, useState } from 'react';
import {
  MessageCircle,
  Loader2,
  Copy,
  Check,
  Phone,
  Mail,
  Send,
  AlertCircle,
} from 'lucide-react';
import { DraftMessage, MessageKind, ResumeRecord } from '../../types/screening';
import { Modal } from '../common/Modal';
import { toast } from '../common/Toast';
import { draftMessage, markMessageSent } from '../../lib/api';
import { mailLink, smsLink, whatsappLink } from '../../lib/phone';

interface MessageModalProps {
  record: ResumeRecord | null;
  onClose: () => void;
  onMarkedSent: (r: ResumeRecord) => void;
}

const KINDS: { id: MessageKind; label: string }[] = [
  { id: 'INTERVIEW_INVITE', label: 'دعوت به مصاحبه' },
  { id: 'INFO_REQUEST', label: 'درخواست تکمیل اطلاعات' },
  { id: 'BANK_NOTICE', label: 'اطلاع نگهداری در بانک' },
];

export const MessageModal: React.FC<MessageModalProps> = ({ record, onClose, onMarkedSent }) => {
  const [kind, setKind] = useState<MessageKind>('INTERVIEW_INVITE');
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftMessage | null>(null);
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!record) return;
    const initial: MessageKind =
      record.recommendation === 'INTERVIEW'
        ? 'INTERVIEW_INVITE'
        : record.recommendation === 'REVIEW'
        ? 'INFO_REQUEST'
        : record.inBank
        ? 'BANK_NOTICE'
        : 'INTERVIEW_INVITE';
    setKind(initial);
  }, [record]);

  useEffect(() => {
    if (!record) return;
    let cancelled = false;
    setLoading(true);
    setDraft(null);
    draftMessage(record.id, kind)
      .then((d) => {
        if (cancelled) return;
        setDraft(d);
        setBody(d.body);
      })
      .catch(() => toast('تهیه پیش‌نویس ممکن نشد', 'error'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [record, kind]);

  if (!record) return null;

  const wa = whatsappLink(record.contact?.phone, body);
  const sms = smsLink(record.contact?.phone, body);
  const mail = mailLink(record.contact?.email, draft?.subject, body);
  const hasPhone = Boolean(wa);
  const hasEmail = Boolean(mail);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      toast('متن پیام کپی شد ✓');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('کپی ممکن نشد', 'error');
    }
  };

  const markSent = async () => {
    try {
      const { record: updated } = await markMessageSent(record.id);
      onMarkedSent(updated);
      toast('به‌عنوان پیام‌داده‌شده علامت خورد ✓');
      onClose();
    } catch {
      toast('ثبت وضعیت ممکن نشد', 'error');
    }
  };

  return (
    <Modal
      open={Boolean(record)}
      onClose={onClose}
      title={`ارسال پیام — ${record.candidateName || record.fileName}`}
      icon={<MessageCircle className="w-5 h-5 text-brand" />}
      wide
      footer={
        <>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-2 text-text-2 text-xs font-black cursor-pointer hover:bg-border-default/50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            کپی متن
          </button>
          <button
            type="button"
            onClick={markSent}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-black cursor-pointer hover:bg-brand-hover"
          >
            <Send className="w-4 h-4" />
            به‌عنوان ارسال‌شده علامت بزن
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Kind tabs */}
        <div className="grid grid-cols-3 gap-1.5">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={`py-2 rounded-xl text-[11px] font-black border cursor-pointer transition-all ${
                kind === k.id
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface-1 text-text-2 border-border-default hover:border-brand/40'
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        {draft?.subject && (
          <div className="text-[11px] font-bold text-text-3">
            موضوع: <span className="text-text-1">{draft.subject}</span>
          </div>
        )}

        <textarea
          value={loading ? 'در حال نوشتن پیام با هوش مصنوعی…' : body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          disabled={loading}
          className="w-full p-3 rounded-xl bg-surface-1 border border-border-default focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-xs leading-relaxed resize-y font-sans"
        />

        {/* Channel buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-text-3 font-bold">
              <Loader2 className="w-4 h-4 animate-spin" /> لطفاً صبر کن
            </span>
          ) : (
            <>
              <a
                href={wa || '#'}
                onClick={(e) => !wa && e.preventDefault()}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black border ${
                  hasPhone
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                    : 'bg-surface-2 border-border-default text-text-3 cursor-not-allowed'
                }`}
              >
                <Phone className="w-3.5 h-3.5" /> واتساپ
              </a>
              <a
                href={sms || '#'}
                onClick={(e) => !sms && e.preventDefault()}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black border ${
                  hasPhone
                    ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100 cursor-pointer'
                    : 'bg-surface-2 border-border-default text-text-3 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" /> پیامک
              </a>
              <a
                href={mail || '#'}
                onClick={(e) => !mail && e.preventDefault()}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black border ${
                  hasEmail
                    ? 'bg-violet-50 border-violet-300 text-violet-800 hover:bg-violet-100 cursor-pointer'
                    : 'bg-surface-2 border-border-default text-text-3 cursor-not-allowed'
                }`}
              >
                <Mail className="w-3.5 h-3.5" /> ایمیل
              </a>
              {!hasPhone && !hasEmail && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  شماره تماس یا ایمیلی در رزومه ثبت نشده؛ متن را کپی کن
                </span>
              )}
            </>
          )}
        </div>
        <p className="text-[10px] text-text-3 leading-relaxed">
          ارسال پیام از همین اپ انجام نمی‌شود؛ متن ساخته می‌شود و با اپ دلخواهت (واتساپ/پیامک/ایمیل) باز می‌شود.
        </p>
      </div>
    </Modal>
  );
};
