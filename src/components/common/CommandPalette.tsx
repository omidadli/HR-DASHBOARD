import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  X,
  UserPlus,
  Users,
  Clock,
  Wallet,
  TrendingUp,
  GraduationCap,
  CheckSquare,
  BarChart3,
  Mic,
  Sparkles,
  Briefcase,
  Building2,
  SlidersHorizontal,
  Video,
  Network,
  Zap,
  Bot,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  ListTodo,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModuleKey, canAccessModule } from './Sidebar';
import { JobPosting, Candidate, UserRole } from '../../types';
import { toPersianDigits } from '../../utils/jalali';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: ModuleKey) => void;
  currentRole?: UserRole;
  onOpenVoiceAssistant?: () => void;
  onOpenJobGenerator?: () => void;
  jobs?: JobPosting[];
  candidates?: Candidate[];
  onSelectJob?: (jobId: string) => void;
}

type CommandCategory =
  | 'اقدامات سریع و هوش مصنوعی'
  | 'بخش‌های اصلی سامانه'
  | 'موقعیت‌های شغلی'
  | 'کارجویان و رزومه‌ها'
  | 'برندها و مراکز';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  icon: React.ElementType;
  badge?: string;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectModule,
  currentRole = UserRole.HR_DIRECTOR,
  onOpenVoiceAssistant,
  onOpenJobGenerator,
  jobs = [],
  candidates = [],
  onSelectJob,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          window.dispatchEvent(new CustomEvent('open-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Construct items
  const allItems: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // Quick AI & System Actions
      {
        id: 'action-ai-governance',
        title: 'داشبورد جامع مدیریت و حاکمیت هوش مصنوعی (Gemini Engine)',
        subtitle: 'مدیریت رفتار بات، بارگذاری سند فرهنگ سازمانی، پایپ‌لاین دپارتمان‌ها و تست زنده',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: Bot,
        badge: 'Gemini Control',
        action: () => {
          onClose();
          onSelectModule('ai-governance');
        },
      },
      {
        id: 'action-voice',
        title: 'گفتگوی صوتی با دستیار',
        subtitle: 'پرسش درباره قوانین کار، تردد کارخانه و گزارش‌ها',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: Mic,
        badge: 'دستیار صوتی',
        action: () => {
          onClose();
          onOpenVoiceAssistant?.();
        },
      },
      {
        id: 'action-job-generator',
        title: 'ایجاد آگهی شغلی',
        subtitle: 'تنظیم متن آگهی و شرایط احراز شغل',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: Sparkles,
        badge: 'آگهی شغلی',
        action: () => {
          onClose();
          onOpenJobGenerator?.();
        },
      },
      {
        id: 'action-criteria-matrix',
        title: 'ماتریس شاخص‌های ارزیابی',
        subtitle: 'تنظیم وزن معیارها و حدنصاب قبولی',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: SlidersHorizontal,
        badge: 'ماتریس ارزیابی',
        action: () => {
          onClose();
          onSelectModule('recruitment');
        },
      },
      {
        id: 'action-hirevue-video',
        title: 'مصاحبه ویدیویی',
        subtitle: 'ثبت پاسخ‌های ویدیویی و ارزیابی شایستگی‌ها',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: Video,
        badge: 'مصاحبه',
        action: () => {
          onClose();
          onSelectModule('recruitment');
        },
      },
      {
        id: 'action-eightfold-skills',
        title: 'گراف مهارت‌ها و ارتقای شغلی',
        subtitle: 'تحلیل مهارت‌ها و فرصت‌های ارتقای درون‌سازمانی',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: Network,
        badge: 'مهارت‌ها',
        action: () => {
          onClose();
          onSelectModule('recruitment');
        },
      },
      {
        id: 'action-ziprecruiter-sourcing',
        title: 'انتشار آگهی و جذب کارجو',
        subtitle: 'انتشار آگهی در بسترهای کاریابی و دریافت رزومه‌ها',
        category: 'اقدامات سریع و هوش مصنوعی',
        icon: Zap,
        badge: 'انتشار آگهی',
        action: () => {
          onClose();
          onSelectModule('recruitment');
        },
      },

      // Navigation Modules
      {
        id: 'nav-dashboard',
        title: 'داشبورد اجرایی',
        subtitle: 'شاخص‌های کلیدی منابع انسانی و وضعیت کارخانجات',
        category: 'بخش‌های اصلی سامانه',
        icon: Sparkles,
        action: () => {
          onClose();
          onSelectModule('dashboard');
        },
      },
      {
        id: 'nav-tasks',
        title: 'میز کار و مدیریت وظایف (Notion Workspace)',
        subtitle: 'مدیریت و برنامه‌ریزی کارهای روزانه، هفتگی و ماهانه منابع انسانی',
        category: 'بخش‌های اصلی سامانه',
        icon: ListTodo,
        badge: 'هوشمند',
        action: () => {
          onClose();
          onSelectModule('tasks');
        },
      },
      {
        id: 'nav-ai-governance',
        title: 'مدیریت دستیار',
        subtitle: 'تنظیم رفتار دستیار و سند فرهنگ سازمانی',
        category: 'بخش‌های اصلی سامانه',
        icon: Bot,
        badge: 'Gemini',
        action: () => {
          onClose();
          onSelectModule('ai-governance');
        },
      },
      {
        id: 'nav-recruitment',
        title: 'جذب و استخدام',
        subtitle: 'مدیریت رزومه‌ها، ارزیابی کارجویان و مصاحبه‌ها',
        category: 'بخش‌های اصلی سامانه',
        icon: UserPlus,
        action: () => {
          onClose();
          onSelectModule('recruitment');
        },
      },
      {
        id: 'nav-employees',
        title: 'پرونده پرسنلی',
        subtitle: 'اطلاعات کارکنان، احکام کارگزینی و چارت سازمانی',
        category: 'بخش‌های اصلی سامانه',
        icon: Users,
        action: () => {
          onClose();
          onSelectModule('employees');
        },
      },
      {
        id: 'nav-attendance',
        title: 'تردد و مرخصی',
        subtitle: 'ثبت تردد، سهمیه مرخصی و شیفت‌های کارخانه',
        category: 'بخش‌های اصلی سامانه',
        icon: Clock,
        action: () => {
          onClose();
          onSelectModule('attendance');
        },
      },
      {
        id: 'nav-payroll',
        title: 'حقوق و دستمزد',
        subtitle: 'محاسبه حقوق، بیمه ۷٪، مالیات و فیش حقوق',
        category: 'بخش‌های اصلی سامانه',
        icon: Wallet,
        badge: 'محرمانه',
        action: () => {
          onClose();
          onSelectModule('payroll');
        },
      },
      {
        id: 'nav-performance',
        title: 'ارزیابی عملکرد (OKR)',
        subtitle: 'اهداف فصلی، شایستگی‌ها و ارزیابی دوره‌ای',
        category: 'بخش‌های اصلی سامانه',
        icon: TrendingUp,
        action: () => {
          onClose();
          onSelectModule('performance');
        },
      },
      {
        id: 'nav-training',
        title: 'آموزش کارکنان',
        subtitle: 'دوره‌های آموزشی، استانداردهای GMP و ماتریس مهارت',
        category: 'بخش‌های اصلی سامانه',
        icon: GraduationCap,
        action: () => {
          onClose();
          onSelectModule('training');
        },
      },
      {
        id: 'nav-checklists',
        title: 'چک‌لیست استخدام و تسویه',
        subtitle: 'مراحل ورود، تحویل اقلام و تسویه حساب',
        category: 'بخش‌های اصلی سامانه',
        icon: CheckSquare,
        action: () => {
          onClose();
          onSelectModule('checklists');
        },
      },
      {
        id: 'nav-analytics',
        title: 'گزارش‌ها و تحلیل‌ها',
        subtitle: 'نرخ خروج، زمان جذب و هزینه‌های پرسنلی',
        category: 'بخش‌های اصلی سامانه',
        icon: BarChart3,
        action: () => {
          onClose();
          onSelectModule('analytics');
        },
      },

      // Brands & Facilities
      {
        id: 'brand-dafi',
        title: 'برند دافی',
        subtitle: 'تولید دستمال مرطوب و بهداشتی • ۴۲۰ نفر پرسنل',
        category: 'برندها و مراکز',
        icon: Building2,
        badge: 'برند هلدینگ',
        action: () => {
          onClose();
          onSelectModule('employees');
        },
      },
      {
        id: 'brand-comeon',
        title: 'برند کامان',
        subtitle: 'محصولات مراقبت پوست و مو • ۳۸۰ نفر پرسنل',
        category: 'برندها و مراکز',
        icon: Building2,
        badge: 'برند هلدینگ',
        action: () => {
          onClose();
          onSelectModule('employees');
        },
      },
      {
        id: 'brand-factory',
        title: 'کارخانجات اشتهارد',
        subtitle: 'خطوط تولید، اتاق تمیز و انبار مرکزی',
        category: 'برندها و مراکز',
        icon: Building2,
        badge: 'سایت تولیدی',
        action: () => {
          onClose();
          onSelectModule('attendance');
        },
      },
    ];

    // Add Job Postings
    jobs.forEach((job) => {
      items.push({
        id: `job-${job.id}`,
        title: job.title,
        subtitle: `${job.department} • ${toPersianDigits(job.applicationsCount)} رزومه دریافت شده`,
        category: 'موقعیت‌های شغلی',
        icon: Briefcase,
        badge: job.status === 'ACTIVE' ? 'فعال' : 'بایگانی',
        action: () => {
          onClose();
          if (onSelectJob) onSelectJob(job.id);
          onSelectModule('recruitment');
        },
      });
    });

    // Add Top Candidates
    candidates.forEach((cand) => {
      items.push({
        id: `cand-${cand.id}`,
        title: `${cand.fullName} — ${cand.jobTitle || 'کارجو'}`,
        subtitle: `امتیاز کل: ${toPersianDigits(cand.overallScore ?? '—')} از ۱۰ • تاریخ ثبت: ${toPersianDigits(cand.appliedAtJalali || 'امروز')}`,
        category: 'کارجویان و رزومه‌ها',
        icon: Users,
        badge:
          cand.category === 'INTERVIEW_PRIORITY'
            ? 'اولویت مصاحبه'
            : cand.category === 'NEEDS_REVIEW'
            ? 'نیازمند بررسی'
            : 'رد اولیه',
        action: () => {
          onClose();
          onSelectModule('recruitment');
        },
      });
    });

    // Role gating (audit fix SEC-02)
    const RECRUITMENT_COMMANDS = new Set([
      'action-job-generator',
      'action-criteria-matrix',
      'action-hirevue-video',
      'action-eightfold-skills',
      'action-ziprecruiter-sourcing',
      'nav-recruitment',
    ]);

    return items.filter((item) => {
      if (RECRUITMENT_COMMANDS.has(item.id)) return canAccessModule(currentRole, 'recruitment');
      if (item.id === 'nav-payroll') return canAccessModule(currentRole, 'payroll');
      if (item.id === 'nav-analytics') return canAccessModule(currentRole, 'analytics');
      return true;
    });
  }, [jobs, candidates, currentRole, onClose, onSelectModule, onOpenVoiceAssistant, onOpenJobGenerator, onSelectJob]);

  // Fuzzy filter
  const filteredItems = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 18);
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

    return allItems
      .filter((item) => {
        const text = `${item.title} ${item.subtitle || ''} ${item.category}`.toLowerCase();
        return words.every((w) => text.includes(w));
      })
      .slice(0, 24);
  }, [allItems, query]);

  // Grouped filtered items for rendering headers
  const groupedItems = useMemo(() => {
    const groups: { category: CommandCategory; items: { item: CommandItem; globalIndex: number }[] }[] = [];
    const categoryMap = new Map<CommandCategory, { item: CommandItem; globalIndex: number }[]>();

    filteredItems.forEach((item, index) => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, []);
      }
      categoryMap.get(item.category)!.push({ item, globalIndex: index });
    });

    categoryMap.forEach((items, category) => {
      groups.push({ category, items });
    });

    return groups;
  }, [filteredItems]);

  // Keyboard navigation within list
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]') as HTMLElement | null;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        dir="rtl"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -12 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="bg-surface-1 rounded-[14px] shadow-2xl border border-border-default w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Search Input Bar */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-default bg-surface-2/60">
            <Search className="w-5 h-5 text-brand shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="جستجو در بخش‌ها، پرسنل، احکام، فیش حقوق..."
              aria-label="جستجو در سامانه"
              className="w-full bg-transparent border-none text-text-1 text-sm font-semibold placeholder:text-text-3 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 text-text-3 hover:text-text-1 rounded-[8px] hover:bg-surface-3 transition-all cursor-pointer"
                aria-label="پاک کردن متن جستجو"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold text-text-3 bg-surface-1 border border-border-default rounded-[6px] shadow-2xs">
              ESC
            </kbd>
          </div>

          {/* List of Grouped Results */}
          <div ref={listRef} className="overflow-y-auto p-2 flex-1 divide-y divide-border-default/40">
            {filteredItems.length === 0 ? (
              <div className="p-10 text-center text-text-3 text-xs">
                موردی یافت نشد. می‌توانید عناوینی مانند «استخدام»، «حقوق»، «مرخصی» یا نام کارجو را جستجو کنید.
              </div>
            ) : (
              groupedItems.map((group) => (
                <div key={group.category} className="py-1.5 first:pt-0 last:pb-0">
                  {/* Category Header */}
                  <div className="px-3 py-1 text-[10px] font-black text-text-3 uppercase tracking-wider select-none">
                    {group.category}
                  </div>

                  {/* Group Items */}
                  <div className="space-y-1 mt-0.5">
                    {group.items.map(({ item, globalIndex }) => {
                      const Icon = item.icon;
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-selected={isSelected}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={`w-full text-right flex items-center justify-between p-2.5 rounded-[10px] transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand-soft text-brand font-bold border border-brand/25 shadow-2xs'
                              : 'hover:bg-surface-2 text-text-2 hover:text-text-1 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-brand text-white shadow-2xs'
                                  : 'bg-surface-2 text-text-2'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 text-right">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black truncate text-text-1">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span
                                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-[6px] shrink-0 ${
                                      isSelected
                                        ? 'bg-brand text-white'
                                        : 'bg-surface-2 text-text-3 border border-border-default'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <div className="text-[11px] text-text-3 font-medium truncate mt-0.5">
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 mr-2">
                            {isSelected && (
                              <div className="flex items-center gap-1 text-[10px] text-brand font-bold bg-surface-1 px-2 py-0.5 rounded-[6px] border border-brand/30 shadow-2xs">
                                <span>انتخاب</span>
                                <CornerDownLeft className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Shortcuts */}
          <div className="px-4 py-2.5 bg-surface-2 border-t border-border-default flex items-center justify-between text-[11px] text-text-3 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border-default rounded-[6px] text-[10px] font-bold text-text-2 flex items-center gap-0.5">
                  <ArrowUp className="w-2.5 h-2.5" />
                  <ArrowDown className="w-2.5 h-2.5" />
                </kbd>
                <span>پیمایش</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-surface-1 border border-border-default rounded-[6px] text-[10px] font-bold text-text-2">
                  Enter
                </kbd>
                <span>انتخاب</span>
              </span>
            </div>
            <div className="text-brand font-bold text-xs">
              سامانه کارا • هلدینگ سیلانه سبز
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
