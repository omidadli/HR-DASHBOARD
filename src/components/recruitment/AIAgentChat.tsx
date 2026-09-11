import React, { useState, useRef, useEffect } from 'react';
import { AgentMessage, Candidate, JobPosting } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
} from 'recharts';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Mail,
  CheckCircle,
  AlertTriangle,
  Radar as RadarIcon,
  RefreshCw,
  Info,
} from 'lucide-react';

interface AIAgentChatProps {
  candidates: Candidate[];
  jobs: JobPosting[];
  activeJobId?: string;
  onApproveEmailDraft?: (draft: any) => void;
}

export const AIAgentChat: React.FC<AIAgentChatProps> = ({
  candidates,
  jobs,
  activeJobId,
  onApproveEmailDraft,
}) => {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'msg-init',
      sender: 'agent',
      text: `سلام. من دستیار هوشمند استخدام هستم.

امکانات در دسترس شما:
• تحلیل شرح شغل و استخراج معیارهای ارزیابی
• ارزیابی و امتیازدهی به رزومه‌ها بر اساس شواهد متنی
• دسته‌بندی کارجویان: اولویت مصاحبه (بالای ۷) / نیازمند بررسی (۵-۷) / رد اولیه (زیر ۵)
• مقایسه کارجویان در قالب جدول و نمودار
• تنظیم پیش‌نویس ایمیل دعوت یا عدم پذیرش (ارسال فقط با تایید شما انجام می‌شود)`,
      timestamp: '۱۰:۳۰',
      suggestedActions: [
        'مقایسه کارجویان این شغل',
        'تحلیل شغل و استخراج معیارها',
        'تنظیم پیش‌نویس ایمیل مصاحبه',
      ],
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [approvedDraftIds, setApprovedDraftIds] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputPrompt).trim();
    if (!query || isLoading) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

    const userMsg: AgentMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: formattedTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => m.id !== 'msg-init')
        .slice(-6)
        .map((m) => ({ role: m.sender === 'user' ? 'user' : 'assistant', text: m.text }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          jobId: activeJobId || 'job-1',
          history,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || 'پاسخی از سرور دریافت نشد');
      }
      const data = await res.json();

      const agentMsg: AgentMessage = {
        id: `msg-agent-${Date.now()}`,
        sender: 'agent',
        text: data.text || 'پاسخ پردازش شد.',
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        radarData: data.radarData,
        emailDraftPreview: data.emailDraftPreview,
        suggestedActions: data.suggestedActions,
        aiAvailable: data.aiAvailable !== false,
      };

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err) {
      const errorMsg: AgentMessage = {
        id: `msg-err-${Date.now()}`,
        sender: 'agent',
        text: `متاسفانه در پردازش درخواست خطایی رخ داد: ${(err as Error)?.message || 'خطای نامشخص'}. لطفاً دوباره تلاش نمایید.`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveDraft = (msgId: string, draft: any) => {
    setApprovedDraftIds((prev) => [...prev, msgId]);
    if (onApproveEmailDraft) onApproveEmailDraft(draft);
  };

  const prepareRechartsData = (radarData: NonNullable<AgentMessage['radarData']>) => {
    return radarData.criteria.map((crit) => {
      const row: any = { criterion: crit };
      radarData.candidates.forEach((candName) => {
        const v = radarData.scores[candName]?.[crit];
        row[candName] = typeof v === 'number' ? v : null;
      });
      return row;
    });
  };

  const radarColors = ['#0f766e', '#2563eb', '#d97706', '#9333ea'];

  return (
    <div className="bg-surface-1 rounded-[16px] border border-border-default shadow-sm flex flex-col h-[740px] overflow-hidden">
      {/* Chat Header */}
      <div className="px-5 py-3.5 bg-brand text-white flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-white/20 flex items-center justify-center text-white backdrop-blur-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm flex items-center gap-2">
              <span>دستیار استخدام (Gemini)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-medium">
                فعال
              </span>
            </div>
            <div className="text-xs text-white/80">
              ارزیابی رزومه، امتیازدهی، مقایسه و تنظیم پیش‌نویس ایمیل
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleSend('معیارهای اصلی شغل فعلی را دوباره استخراج کن')}
          className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] bg-white/15 hover:bg-white/25 transition-colors text-white font-medium cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>تحلیل مجدد معیارها</span>
        </button>
      </div>

      {/* ALWAYS-VISIBLE TRANSPARENCY NOTE ABOUT SCORING SOURCE */}
      <div className="bg-brand-soft/50 border-b border-border-default px-4 py-2.5 flex items-center justify-between text-xs text-text-2">
        <div className="flex items-start sm:items-center gap-2">
          <Info className="w-4 h-4 text-brand shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold text-text-1 ml-1">نحوه ارزیابی:</span>
            <span>
              ارزیابی‌ها با مدل Gemini یا الگوریتم‌های محلی انجام می‌شود. امتیازها جنبه پیشنهادی دارند و ارسال ایمیل‌ها صرفاً پس از تایید شما انجام می‌پذیرد.
            </span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 lg:p-5 overflow-y-auto space-y-4 bg-surface-2/40">
        {messages.map((msg) => {
          const isAgent = msg.sender === 'agent';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${isAgent ? 'ml-0 mr-auto' : 'mr-0 ml-auto flex-row-reverse'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center text-xs font-bold ${
                  isAgent
                    ? 'bg-brand text-white shadow-2xs'
                    : 'bg-surface-1 text-text-1 border border-border-default shadow-2xs'
                }`}
              >
                {isAgent ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div className="space-y-2.5 flex-1 min-w-0">
                <div
                  className={`p-4 rounded-[14px] text-xs leading-relaxed shadow-2xs ${
                    isAgent
                      ? 'bg-surface-1 border border-border-default text-text-1'
                      : 'bg-brand text-white shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</p>

                  {/* Local engine fallback transparency tag */}
                  {isAgent && msg.aiAvailable === false && (
                    <div className="mt-3 pt-2 border-t border-amber-500/30 flex items-start gap-1.5 text-[10.5px] font-bold text-amber-800 dark:text-amber-300 bg-amber-500/10 p-2 rounded-[8px]">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>
                        ارزیابی محلی: محاسبات بر پایه الگوریتم‌های محلی سامانه انجام شد.
                      </span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-2 text-[10px] text-end font-medium ${
                      isAgent ? 'text-text-3' : 'text-white/70'
                    }`}
                  >
                    {toPersianDigits(msg.timestamp)}
                  </div>
                </div>

                {/* Radar Chart Visualization */}
                {msg.radarData && (
                  <div className="bg-surface-1 rounded-[14px] p-4 border border-border-default shadow-2xs">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border-default text-xs font-bold text-text-1">
                      <RadarIcon className="w-4 h-4 text-brand" />
                      <span>نمودار مقایسه شایستگی‌ها:</span>
                    </div>

                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={prepareRechartsData(msg.radarData)}>
                          <PolarGrid stroke="#94a3b8" strokeOpacity={0.3} />
                          <PolarAngleAxis
                            dataKey="criterion"
                            tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'Vazirmatn' }}
                          />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#94a3b8" strokeOpacity={0.3} />
                          {msg.radarData.candidates.map((candName, idx) => (
                            <Radar
                              key={candName}
                              name={candName}
                              dataKey={candName}
                              stroke={radarColors[idx % radarColors.length]}
                              fill={radarColors[idx % radarColors.length]}
                              fillOpacity={0.25}
                            />
                          ))}
                          <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Vazirmatn', paddingTop: '10px' }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'var(--surface-1, #ffffff)',
                              borderColor: 'var(--border-default, #e2e8f0)',
                              borderRadius: '10px',
                              fontFamily: 'Vazirmatn',
                              fontSize: '11px',
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Comparative Table */}
                    <div className="mt-3 overflow-x-auto border border-border-default rounded-[10px]">
                      <table className="w-full text-right text-[11px]">
                        <thead className="bg-surface-2 text-text-2 border-b border-border-default">
                          <tr>
                            <th className="p-2 font-bold">معیار ارزیابی</th>
                            {msg.radarData.candidates.map((c) => (
                              <th key={c} className="p-2 font-bold text-center">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-default text-text-1">
                          {msg.radarData.criteria.map((crit) => (
                            <tr key={crit} className="hover:bg-surface-2/60">
                              <td className="p-2 font-medium">{crit}</td>
                              {msg.radarData!.candidates.map((cand) => (
                                <td key={cand} className="p-2 text-center font-bold text-brand">
                                  {toPersianDigits(msg.radarData!.scores[cand]?.[crit] || '-')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Email Draft Card */}
                {msg.emailDraftPreview && (
                  <div className="bg-warning-soft/30 rounded-[14px] p-4 border border-warning/30 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-warning/20">
                      <div className="flex items-center gap-1.5 font-bold text-text-1">
                        <Mail className="w-4 h-4 text-warning" />
                        <span>پیش‌نویس ایمیل (آماده تایید)</span>
                      </div>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-warning-soft text-warning border border-warning/30">
                        پیش‌نویس
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="text-text-2">
                        <span className="font-semibold text-text-1">گیرنده:</span>{' '}
                        {msg.emailDraftPreview.candidateName} ({msg.emailDraftPreview.candidateEmail})
                      </div>
                      <div className="text-text-2">
                        <span className="font-semibold text-text-1">موضوع ایمیل:</span>{' '}
                        {msg.emailDraftPreview.subject}
                      </div>
                    </div>

                    <div className="bg-surface-1 p-3 rounded-[10px] border border-border-default text-xs text-text-1 whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.emailDraftPreview.body}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="flex items-center gap-1 text-[11px] text-warning font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                        <span>ارسال ایمیل تنها با تایید شما انجام می‌شود.</span>
                      </div>

                      <button
                        type="button"
                        disabled={approvedDraftIds.includes(msg.id)}
                        onClick={() => handleApproveDraft(msg.id, msg.emailDraftPreview)}
                        className={`px-3.5 py-1.5 rounded-[10px] font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer ${
                          approvedDraftIds.includes(msg.id)
                            ? 'bg-success text-white cursor-default'
                            : 'bg-brand hover:bg-brand-hover text-white'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>
                          {approvedDraftIds.includes(msg.id)
                            ? 'تایید شد'
                            : 'تایید پیش‌نویس'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {msg.suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(action)}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-1 text-text-1 border border-border-default hover:border-brand/50 hover:bg-brand-soft/20 transition-colors cursor-pointer"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator with 3 pulsing dots */}
        {isLoading && (
          <div className="flex items-center gap-3 bg-surface-1 border border-border-default rounded-[14px] px-4 py-3 w-fit shadow-2xs">
            <div className="w-7 h-7 rounded-[8px] bg-brand-soft text-brand flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse [animation-delay:200ms]" />
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse [animation-delay:400ms]" />
            </div>
            <span className="text-xs text-text-3 mr-1">دستیار در حال پردازش پاسخ...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3.5 bg-surface-1 border-t border-border-default">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            placeholder="پرسش یا درخواست خود را بنویسید (مثال: کارجویان برتر را مقایسه کن)..."
            className="flex-1 px-4 py-2.5 bg-surface-2 border border-border-default rounded-[10px] text-xs text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-all font-sans"
          />

          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="px-4 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white rounded-[10px] text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>ارسال</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
