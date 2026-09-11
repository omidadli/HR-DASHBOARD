import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  User,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Send,
  Square,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  ShieldAlert,
} from 'lucide-react';
import { VoiceCallMessage } from '../../types';

interface MobileVoiceCallProps {
  onBack?: () => void;
  onNavigateToJobAd?: (params?: any) => void;
  onNavigateToDepartments?: (deptId?: string) => void;
  onRunAutomation?: (category: string) => void;
}

interface PendingAction {
  id: string;
  actionType: string;
  title: string;
  description: string;
  actionResult?: any;
}

export const MobileVoiceCall: React.FC<MobileVoiceCallProps> = ({
  onBack,
  onNavigateToJobAd,
  onNavigateToDepartments,
  onRunAutomation,
}) => {
  const [callStatus, setCallStatus] = useState<'CONNECTING' | 'CONNECTED' | 'LISTENING' | 'THINKING' | 'SPEAKING'>('CONNECTED');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [currentInput, setCurrentInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [audioTesting, setAudioTesting] = useState(false);
  const [typedMessage, setTypedMessage] = useState('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const [transcript, setTranscript] = useState<VoiceCallMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: 'سلام و وقت‌بخیر! دستیار صوتی منابع انسانی هلدینگ سیلانه سبز آماده دریافت دستورات شماست. چه کمکی از من ساخته است؟',
      timestamp: 'هم‌اکنون',
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const silenceTimeoutRef = useRef<any>(null);
  const accumulatedTextRef = useRef<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);

  // Haptic feedback trigger for mobile touch interactions
  const triggerHaptic = (ms = 20) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore if not permitted
      }
    }
  };

  // Play pleasant harmonic assistant chime
  const playAssistantChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0, now + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.36);
      });
    } catch (err) {
      console.warn('Audio chime error:', err);
    }
  };

  // Pre-load available speech synthesis voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);
        }
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Call duration counter
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentInput, pendingAction]);

  // Handle Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'fa-IR';

      recognition.onstart = () => {
        setIsListening(true);
        setCallStatus('LISTENING');
        triggerHaptic(25);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            accumulatedTextRef.current += ' ' + trans;
          } else {
            interim += trans;
          }
        }

        const totalSpoken = (accumulatedTextRef.current + ' ' + interim).trim();
        if (totalSpoken) {
          setCurrentInput(totalSpoken);

          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          // Silence timeout before auto-submitting
          silenceTimeoutRef.current = setTimeout(() => {
            if (accumulatedTextRef.current.trim() || totalSpoken.trim()) {
              const textToSend = accumulatedTextRef.current.trim() || totalSpoken.trim();
              stopListeningAndSend(textToSend);
            }
          }, 2800);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition warning:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
          setCallStatus('CONNECTED');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (callStatus === 'LISTENING') {
          setCallStatus('CONNECTED');
        }
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [callStatus]);

  const startListening = () => {
    triggerHaptic(30);
    if (isMuted) {
      setIsMuted(false);
    }
    accumulatedTextRef.current = '';
    setCurrentInput('');
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch {
        try {
          recognitionRef.current.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        } catch (e) {
          console.error('Cannot start recognition:', e);
        }
      }
    } else {
      // Fallback sample
      const sample = 'یک آگهی شغلی برای مدیر برند دافی تنظیم کن';
      setCurrentInput(sample);
      setTimeout(() => {
        handleSendCommand(sample);
      }, 1000);
    }
  };

  const stopListeningAndSend = (textToSend?: string) => {
    triggerHaptic(25);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);

    const message = (textToSend || currentInput || accumulatedTextRef.current).trim();
    if (message) {
      handleSendCommand(message);
    } else {
      setCallStatus('CONNECTED');
    }
    accumulatedTextRef.current = '';
    setCurrentInput('');
  };

  const cancelListening = () => {
    triggerHaptic(15);
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    accumulatedTextRef.current = '';
    setCurrentInput('');
    setCallStatus('CONNECTED');
  };

  // Speak text with speech synthesis
  const speakText = (text: string) => {
    if (!isSpeakerOn || typeof window === 'undefined' || !window.speechSynthesis) return;

    playAssistantChime();

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const cleanText = text
        .replace(/[*_#`[\]()]/g, '')
        .replace(/[🌿💼💰🏖️🏭⚡✍️📋✨]/gu, '')
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);

      const voices = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
      let bestVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('fa'));
      if (!bestVoice) {
        bestVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ar'));
      }
      if (!bestVoice) {
        bestVoice = voices.find((v) => v.lang && (v.lang.startsWith('tr') || v.lang.startsWith('ur') || v.name.includes('Google')));
      }
      if (!bestVoice && voices.length > 0) {
        bestVoice = voices.find((v) => v.default) || voices[0];
      }

      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
      } else {
        utterance.lang = 'fa-IR';
      }

      utterance.rate = 0.92;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setCallStatus('SPEAKING');
      };
      utterance.onend = () => {
        setCallStatus('CONNECTED');
      };
      utterance.onerror = () => {
        setCallStatus('CONNECTED');
      };

      setTimeout(() => {
        window.speechSynthesis.speak(utterance);
      }, 60);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setCallStatus('CONNECTED');
    }
  };

  const handleSendCommand = async (commandText: string) => {
    if (!commandText.trim()) return;

    const userMsg: VoiceCallMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: commandText,
      timestamp: 'هم‌اکنون',
    };

    setTranscript((prev) => [...prev, userMsg]);
    setCurrentInput('');
    setTypedMessage('');
    setCallStatus('THINKING');

    try {
      const res = await fetch('/api/ai/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandText }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || 'خطا در پردازش دستور صوتی');
      }

      const data = await res.json();
      const reply = data.replyText || 'دستور شما دریافت شد.';
      const needsConfirm = !!data.requiresConfirmation;

      // Handle mutative actions with explicit confirmation card BEFORE execution
      if (needsConfirm || data.actionType === 'RUN_AUTOMATION_PAYROLL' || data.actionType === 'RUN_AUTOMATION_SCREENING') {
        const actionTitle =
          data.actionType === 'RUN_AUTOMATION_PAYROLL'
            ? 'صدور قطعی فیش‌های حقوقی ماه'
            : data.actionType === 'RUN_AUTOMATION_SCREENING'
            ? 'غربالگری و بررسی رزومه‌ها'
            : 'اجرای عملیات سازمانی';

        const actionDesc =
          data.actionType === 'RUN_AUTOMATION_PAYROLL'
            ? 'این عملیات محاسبات مالی و بیمه تامین اجتماعی را قطعی می‌کند و نیازمند تأیید شماست.'
            : data.actionType === 'RUN_AUTOMATION_SCREENING'
            ? 'رزومه‌های جدید متقاضیان بر اساس شاخص‌های شایستگی بررسی خواهند شد.'
            : 'این عملیات داده‌های سامانه را به‌روزرسانی می‌کند.';

        setPendingAction({
          id: `act-${Date.now()}`,
          actionType: data.actionType,
          title: actionTitle,
          description: actionDesc,
          actionResult: data.actionResult,
        });

        const botMsg: VoiceCallMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          timestamp: 'هم‌اکنون',
        };
        setTranscript((prev) => [...prev, botMsg]);
        speakText(reply);
      } else {
        // Read-only or navigation actions
        const botMsg: VoiceCallMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          text: reply,
          timestamp: 'هم‌اکنون',
          actionTaken: data.actionType,
          actionPayload: data.actionResult,
        };
        setTranscript((prev) => [...prev, botMsg]);
        speakText(reply);

        if (data.actionType === 'OPEN_JOB_GENERATOR' && onNavigateToJobAd) {
          setTimeout(() => onNavigateToJobAd(), 2200);
        } else if (data.actionType === 'SHOW_DEPARTMENT' && onNavigateToDepartments) {
          setTimeout(() => onNavigateToDepartments('dept-mfg'), 2200);
        }
      }
    } catch (err) {
      console.error(err);
      const fallbackMsg: VoiceCallMessage = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: 'پردازش دستور با خطا مواجه شد. هیچ تغییری در داده‌ها اعمال نشد.',
        timestamp: 'هم‌اکنون',
      };
      setTranscript((prev) => [...prev, fallbackMsg]);
      speakText(fallbackMsg.text);
      setCallStatus('CONNECTED');
    }
  };

  // Explicit confirmation approval
  const handleApproveAction = () => {
    triggerHaptic(35);
    if (!pendingAction) return;

    if (pendingAction.actionType === 'RUN_AUTOMATION_PAYROLL' && onRunAutomation) {
      onRunAutomation('auto-payroll');
    } else if (pendingAction.actionType === 'RUN_AUTOMATION_SCREENING' && onRunAutomation) {
      onRunAutomation('auto-screening');
    }

    const confirmResultMsg: VoiceCallMessage = {
      id: `bot-approved-${Date.now()}`,
      sender: 'assistant',
      text: `عملیات «${pendingAction.title}» با تأیید شما انجام شد.`,
      timestamp: 'هم‌اکنون',
      actionTaken: pendingAction.actionType,
    };

    setTranscript((prev) => [...prev, confirmResultMsg]);
    speakText(`عملیات با تأیید شما اجرا شد.`);
    setPendingAction(null);
  };

  // Explicit confirmation rejection
  const handleRejectAction = () => {
    triggerHaptic(20);
    if (!pendingAction) return;

    const cancelMsg: VoiceCallMessage = {
      id: `bot-rejected-${Date.now()}`,
      sender: 'assistant',
      text: `عملیات «${pendingAction.title}» لغو شد. تغییری در داده‌ها اعمال نشد.`,
      timestamp: 'هم‌اکنون',
    };

    setTranscript((prev) => [...prev, cancelMsg]);
    speakText(`دستور شما لغو شد.`);
    setPendingAction(null);
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const quickVoiceChips = [
    { label: 'آگهی مدیر برند', command: 'برای دپارتمان مارکتینگ یک آگهی شغلی برای مدیر برند دافی تنظیم کن' },
    { label: 'وضعیت کارخانه اشتهارد', command: 'وضعیت پرسنل و شیفت‌های تولید کارخانه اشتهارد چطوره؟' },
    { label: 'غربالگری رزومه‌ها', command: 'رزومه‌های ورودی هفته اخیر را غربالگری و اولویت‌بندی کن' },
    { label: 'صدور فیش‌های حقوق', command: 'فیش‌های حقوقی این ماه پرسنل سیلانه سبز را صادر کن' },
    { label: 'دپارتمان‌های هلدینگ', command: 'دپارتمان‌های هلدینگ سیلانه سبز را معرفی کن' },
  ];

  return (
    <div
      dir="rtl"
      className="relative min-h-[580px] h-full flex flex-col bg-surface-1 dark:bg-surface-1 text-text-1 rounded-[24px] overflow-hidden shadow-2xl border border-border-default transition-colors p-3.5 sm:p-4"
    >
      {/* 1. Top Call Navigation & Status Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-border-default z-10 shrink-0">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              id="btn-voice-back"
              onClick={() => {
                triggerHaptic(15);
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                  window.speechSynthesis.cancel();
                }
                onBack();
              }}
              className="min-h-[44px] min-w-[44px] rounded-[10px] bg-surface-2 hover:bg-surface-3 text-text-1 flex items-center justify-center cursor-pointer transition-all active:scale-95 border border-border-default"
              title="بازگشت به پیشخوان"
            >
              <ArrowRight className="w-4 h-4 text-text-1" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-brand animate-ping" />
            <div>
              <span className="text-xs font-black text-text-1 block">دستیار صوتی منابع انسانی</span>
              <span className="text-[10px] text-text-3 block">دستیار تعاملی سیلانه سبز</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Audio Test Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setAudioTesting(true);
              speakText('ارتباط صوتی با سامانه منابع انسانی سیلانه سبز برقرار است.');
              setTimeout(() => setAudioTesting(false), 2500);
            }}
            className="min-h-[44px] px-2.5 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-[11px] text-text-2 font-bold border border-border-default flex items-center gap-1 cursor-pointer transition-all active:scale-95"
            title="تست صدای دستیار"
          >
            <Volume2 className="w-3.5 h-3.5 text-brand" />
            <span className="hidden xs:inline">تست صدا</span>
          </button>

          {/* Call Duration Counter */}
          <div className="min-h-[44px] px-2.5 rounded-[10px] bg-surface-2 border border-border-default text-text-1 text-xs font-mono font-bold flex items-center justify-center">
            {formatDuration(callDuration)}
          </div>
        </div>
      </div>

      {/* 2. Visualizer Area with Animated Pulsing Orb */}
      <div className="flex-1 flex flex-col items-center justify-center my-2 relative z-10 min-h-[220px]">
        {/* Glowing Orb Animation */}
        <div className="relative flex items-center justify-center my-3">
          {/* Pulsing Ripple Rings */}
          <div
            className={`absolute rounded-full transition-all duration-700 pointer-events-none ${
              callStatus === 'LISTENING'
                ? 'w-48 h-48 bg-warning/15 animate-ping'
                : callStatus === 'SPEAKING'
                ? 'w-52 h-52 bg-brand/20 animate-ping'
                : 'w-40 h-40 bg-brand/10'
            }`}
          />

          <div
            className={`absolute rounded-full border-2 transition-all duration-500 pointer-events-none ${
              callStatus === 'LISTENING'
                ? 'w-36 h-36 border-warning/60 scale-110 animate-pulse'
                : callStatus === 'SPEAKING'
                ? 'w-36 h-36 border-brand scale-115 animate-pulse'
                : callStatus === 'THINKING'
                ? 'w-36 h-36 border-info scale-105 animate-spin'
                : 'w-32 h-32 border-border-default'
            }`}
          />

          {/* Central Orb Button/Avatar */}
          <div
            onClick={isListening ? () => stopListeningAndSend() : startListening}
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 shadow-2xl flex items-center justify-center relative cursor-pointer transition-all active:scale-90 ${
              callStatus === 'LISTENING'
                ? 'bg-gradient-to-tr from-amber-500 to-warning shadow-warning/40 ring-4 ring-warning/30 animate-pulse'
                : callStatus === 'SPEAKING'
                ? 'bg-gradient-to-tr from-brand to-teal-400 shadow-brand/40 ring-4 ring-brand/30'
                : callStatus === 'THINKING'
                ? 'bg-gradient-to-tr from-info to-cyan-400 shadow-info/40'
                : 'bg-gradient-to-tr from-brand to-emerald-600 shadow-brand/30 hover:scale-105'
            }`}
          >
            <div className="w-full h-full rounded-full bg-surface-1 flex flex-col items-center justify-center gap-0.5 select-none">
              <Bot
                className={`w-9 h-9 transition-colors ${
                  callStatus === 'LISTENING'
                    ? 'text-warning'
                    : callStatus === 'SPEAKING'
                    ? 'text-brand'
                    : callStatus === 'THINKING'
                    ? 'text-info'
                    : 'text-brand'
                }`}
              />
              <span className="text-[9px] font-black text-text-3 tracking-wider">
                {callStatus === 'LISTENING'
                  ? 'شنیدن...'
                  : callStatus === 'SPEAKING'
                  ? 'پاسخ...'
                  : callStatus === 'THINKING'
                  ? 'پردازش...'
                  : 'سیلانه سبز'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Audio Frequency Bars */}
        <div className="flex items-center gap-1.5 h-6 my-1">
          {[25, 60, 40, 85, 50, 100, 65, 90, 45, 80, 55, 70].map((h, i) => (
            <div
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                callStatus === 'SPEAKING'
                  ? 'bg-brand animate-pulse'
                  : callStatus === 'LISTENING'
                  ? 'bg-warning animate-pulse'
                  : 'bg-border-default'
              }`}
              style={{
                height:
                  callStatus === 'SPEAKING' || callStatus === 'LISTENING'
                    ? `${Math.max(20, h * (0.5 + Math.sin(i + callDuration * 2) * 0.5))}%`
                    : '25%',
              }}
            />
          ))}
        </div>

        {/* Live Status Text */}
        <div className="text-center px-4">
          <p className="text-xs font-bold text-text-2 mt-0.5">
            {callStatus === 'LISTENING'
              ? 'در حال شنیدن صدای شما... (پس از اتمام صحبت، ارسال را بزنید)'
              : callStatus === 'THINKING'
              ? 'در حال پردازش و استخراج اطلاعات...'
              : callStatus === 'SPEAKING'
              ? 'در حال خواندن پاسخ...'
              : 'برای شروع صحبت، دکمه میکروفون را لمس کنید'}
          </p>
        </div>

        {/* 3. Live Speech Recognition Bubble (While Speaking) */}
        {isListening && (
          <div className="w-full max-w-md mt-2 bg-warning-soft border-2 border-warning/50 rounded-[16px] p-3 shadow-md animate-fadeIn">
            <div className="flex items-center justify-between text-xs text-warning mb-1 font-black">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-warning animate-ping" />
                متن گفتار دریافت شده:
              </span>
              <span className="text-[10px] text-text-2 font-medium">تشخیص گفتار</span>
            </div>

            <p className="text-xs text-text-1 font-medium min-h-[36px] leading-relaxed bg-surface-1 p-2.5 rounded-[10px] border border-border-default">
              {currentInput || 'در حال شنیدن صدای شما...'}
            </p>

            <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-warning/20">
              <button
                type="button"
                onClick={cancelListening}
                className="min-h-[44px] px-3 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-xs text-text-2 font-bold cursor-pointer transition-all active:scale-95"
              >
                لغو
              </button>
              <button
                type="button"
                onClick={() => stopListeningAndSend()}
                className="min-h-[44px] flex items-center gap-1.5 px-4 rounded-[10px] bg-brand hover:bg-brand-hover text-white font-black text-xs shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>ارسال</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. Explicit Action Confirmation Card (BEFORE any action is executed) */}
        {pendingAction && (
          <div
            id="explicit-confirmation-card"
            className="w-full max-w-md my-2 p-3.5 rounded-[18px] bg-surface-1 border-2 border-brand shadow-xl animate-fadeIn space-y-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-warning-soft text-warning flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-text-1">
                    درخواست تأیید اجرای عملیات
                  </h3>
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded-[6px] bg-warning-soft text-warning">
                    نیازمند تأیید
                  </span>
                </div>
                <div className="text-xs font-bold text-brand mt-0.5">
                  {pendingAction.title}
                </div>
                <p className="text-[11px] text-text-3 leading-relaxed mt-1">
                  {pendingAction.description}
                </p>
              </div>
            </div>

            {/* Approve and Reject Buttons (Thumb-Zone Friendly with Haptic Feel) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-default">
              {/* Reject Button */}
              <button
                type="button"
                id="btn-voice-reject-action"
                onClick={handleRejectAction}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-3 text-danger font-black text-xs border border-border-default cursor-pointer transition-all active:scale-95 shadow-2xs"
              >
                <X className="w-4 h-4" />
                <span>انصراف</span>
              </button>

              {/* Approve Button */}
              <button
                type="button"
                id="btn-voice-approve-action"
                onClick={handleApproveAction}
                className="min-h-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-[10px] bg-brand hover:bg-brand-hover text-white font-black text-xs cursor-pointer transition-all active:scale-95 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>تأیید و اجرا</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. Live Conversation Transcript Box */}
        <div className="w-full max-w-md bg-surface-2/70 rounded-[16px] p-3 border border-border-default mt-2 max-h-40 overflow-y-auto space-y-2 text-xs">
          {transcript.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${
                msg.sender === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  msg.sender === 'user'
                    ? 'bg-brand text-white shadow-xs'
                    : 'bg-surface-1 text-brand border border-border-default shadow-xs'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`p-2.5 rounded-[14px] max-w-[85%] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-brand-soft text-brand font-medium border border-brand/20 rounded-tr-none text-right'
                    : 'bg-surface-1 text-text-1 border border-border-default rounded-tl-none text-right'
                }`}
              >
                <p className="whitespace-pre-line text-xs">{msg.text}</p>

                {/* Assistant audio replay */}
                {msg.sender === 'assistant' && (
                  <div className="mt-1.5 pt-1 border-t border-border-default flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        speakText(msg.text);
                      }}
                      className="flex items-center gap-1 text-[10px] text-brand hover:underline font-bold cursor-pointer"
                    >
                      <Volume2 className="w-3 h-3 text-brand" />
                      <span>پخش صدا</span>
                    </button>
                    <span className="text-[10px] text-text-3 font-mono">{msg.timestamp}</span>
                  </div>
                )}

                {msg.actionTaken && (
                  <div className="mt-1 pt-1 border-t border-border-default flex items-center gap-1 text-[10px] text-brand font-bold">
                    <CheckCircle2 className="w-3 h-3 text-brand" />
                    <span>اقدام: {msg.actionTaken}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* 6. Quick Voice Command Chips (Thumb-Zone Reaching) */}
      <div className="z-10 my-1 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {quickVoiceChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                triggerHaptic(20);
                handleSendCommand(chip.command);
              }}
              className="min-h-[44px] shrink-0 px-3 py-2 rounded-[12px] bg-surface-2 hover:bg-surface-3 text-text-2 hover:text-text-1 border border-border-default text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap select-none"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 7. Fallback Text Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (typedMessage.trim()) {
            triggerHaptic(20);
            handleSendCommand(typedMessage);
          }
        }}
        className="flex items-center gap-1.5 my-1 bg-surface-2 p-1 rounded-[12px] border border-border-default z-10 shrink-0"
      >
        <input
          type="text"
          value={typedMessage}
          onChange={(e) => setTypedMessage(e.target.value)}
          placeholder="دستور خود را بنویسید..."
          className="flex-1 bg-transparent px-2.5 py-1 text-xs text-text-1 placeholder-text-3 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!typedMessage.trim()}
          className="min-h-[44px] min-w-[44px] rounded-[10px] bg-brand hover:bg-brand-hover disabled:opacity-40 text-white cursor-pointer transition-all flex items-center justify-center active:scale-95"
          title="ارسال دستور"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* 8. Bottom Phone Controls with Haptic Feel (Primary Actions in Bottom 40%) */}
      <div
        id="voice-call-bottom-controls"
        className="flex items-center justify-around pt-2 border-t border-border-default z-10 shrink-0"
      >
        {/* Mute Button */}
        <button
          type="button"
          id="btn-voice-mute"
          onClick={() => {
            triggerHaptic(15);
            setIsMuted(!isMuted);
          }}
          className={`min-h-[50px] min-w-[50px] flex flex-col items-center justify-center gap-0.5 rounded-[14px] cursor-pointer transition-all active:scale-90 select-none ${
            isMuted ? 'text-warning bg-warning-soft' : 'text-text-2 hover:bg-surface-2'
          }`}
          title={isMuted ? 'میکروفون بی‌صداست' : 'میکروفون فعال'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          <span className="text-[10px] font-bold">{isMuted ? 'بی‌صدا' : 'میکروفون'}</span>
        </button>

        {/* Big Start / Stop Speaking Button */}
        {isListening ? (
          <button
            type="button"
            id="btn-voice-stop-send"
            onClick={() => stopListeningAndSend()}
            className="w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all transform active:scale-90 bg-warning text-slate-950 font-black animate-pulse border-2 border-surface-1 select-none"
            title="پایان صحبت و ارسال"
          >
            <Square className="w-6 h-6 fill-current" />
            <span className="text-[9px] font-black mt-0.5">ارسال</span>
          </button>
        ) : (
          <button
            type="button"
            id="btn-voice-start-speaking"
            onClick={startListening}
            className="w-16 h-16 rounded-full shadow-lg flex flex-col items-center justify-center cursor-pointer transition-all transform active:scale-90 bg-brand text-white shadow-brand/40 hover:bg-brand-hover border-2 border-surface-1 select-none"
            title="لمس برای شروع مکالمه صوتی"
          >
            <Mic className="w-7 h-7" />
            <span className="text-[9px] font-black mt-0.5">صحبت</span>
          </button>
        )}

        {/* Speaker Volume Toggle */}
        <button
          type="button"
          id="btn-voice-speaker-toggle"
          onClick={() => {
            triggerHaptic(15);
            const next = !isSpeakerOn;
            setIsSpeakerOn(next);
            if (!next && typeof window !== 'undefined' && window.speechSynthesis) {
              window.speechSynthesis.cancel();
            }
          }}
          className={`min-h-[50px] min-w-[50px] flex flex-col items-center justify-center gap-0.5 rounded-[14px] cursor-pointer transition-all active:scale-90 select-none ${
            !isSpeakerOn ? 'text-danger bg-danger-soft' : 'text-text-2 hover:bg-surface-2'
          }`}
          title={isSpeakerOn ? 'اسپیکر روشن' : 'اسپیکر خاموش'}
        >
          {isSpeakerOn ? <Volume2 className="w-5 h-5 text-brand" /> : <VolumeX className="w-5 h-5" />}
          <span className="text-[10px] font-bold">{isSpeakerOn ? 'بلندگو' : 'خاموش'}</span>
        </button>

        {/* End Call Button */}
        {onBack && (
          <button
            type="button"
            id="btn-voice-end-call"
            onClick={() => {
              triggerHaptic(25);
              if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
              }
              onBack();
            }}
            className="min-h-[50px] min-w-[50px] flex flex-col items-center justify-center gap-0.5 rounded-[14px] text-danger hover:bg-danger-soft cursor-pointer transition-all active:scale-90 select-none"
            title="خروج از دستیار صوتی"
          >
            <div className="w-8 h-8 rounded-full bg-danger text-white flex items-center justify-center shadow-xs">
              <PhoneOff className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black text-danger">خروج</span>
          </button>
        )}
      </div>
    </div>
  );
};
