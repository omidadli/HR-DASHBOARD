import React, { useState } from 'react';
import { Employee, UserRole, JobHistoryItem } from '../../types';
import {
  toPersianDigits,
  formatToman,
  parseJalaliDateString,
  getTodayJalali,
  jalaliToGregorian,
} from '../../utils/jalali';
import { Drawer } from '../ui/Drawer';
import { Tabs } from '../ui/Tabs';
import { EmployeeAvatar } from './EmployeeAvatar';
import {
  User,
  FileText,
  DollarSign,
  Activity,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Building,
  Briefcase,
  Calendar,
  CreditCard,
  Users,
  Shield,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Download,
  AlertTriangle,
  Award,
} from 'lucide-react';

interface EmployeeProfileDrawerProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  canSeeSensitive: boolean;
  onEdit: (emp: Employee) => void;
  onDelete: (emp: Employee) => void;
  onChangeStatus?: (emp: Employee, newStatus: 'ACTIVE' | 'RESIGNED' | 'ON_LEAVE') => void;
  allEmployees?: Employee[];
}

export const EmployeeProfileDrawer: React.FC<EmployeeProfileDrawerProps> = ({
  employee,
  isOpen,
  onClose,
  canSeeSensitive,
  onEdit,
  onDelete,
  onChangeStatus,
  allEmployees = [],
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'contract' | 'salary' | 'performance'>('profile');
  const [isNationalIdRevealed, setIsNationalIdRevealed] = useState(false);
  const [isSalaryRevealed, setIsSalaryRevealed] = useState(false);

  if (!employee) return null;

  // Find direct manager name if available
  const directManager = employee.directManagerId
    ? allEmployees.find((e) => e.id === employee.directManagerId)
    : null;

  // Calculate service duration in years and months
  const calculateTenure = (hireDateStr: string) => {
    const hireDate = parseJalaliDateString(hireDateStr);
    if (!hireDate) return '—';
    const today = getTodayJalali();
    const gHire = jalaliToGregorian(hireDate.year, hireDate.month, hireDate.day);
    const gToday = jalaliToGregorian(today.year, today.month, today.day);
    const msDiff = new Date(gToday.year, gToday.month - 1, gToday.day).getTime() -
      new Date(gHire.year, gHire.month - 1, gHire.day).getTime();
    const days = Math.floor(msDiff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'استخدام آتی';
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);

    if (years === 0 && remainingMonths === 0) return 'کمتر از ۱ ماه';
    if (years === 0) return `${toPersianDigits(remainingMonths)} ماه`;
    if (remainingMonths === 0) return `${toPersianDigits(years)} سال`;
    return `${toPersianDigits(years)} سال و ${toPersianDigits(remainingMonths)} ماه`;
  };

  const tabs = [
    {
      id: 'profile',
      label: 'مشخصات فردی',
      icon: <User className="w-3.5 h-3.5" />,
    },
    {
      id: 'contract',
      label: 'قرارداد و شغل',
      icon: <Briefcase className="w-3.5 h-3.5" />,
    },
    {
      id: 'salary',
      label: 'تاریخچه حقوق',
      icon: <DollarSign className="w-3.5 h-3.5" />,
    },
    {
      id: 'performance',
      label: 'عملکرد و تردد',
      icon: <Activity className="w-3.5 h-3.5" />,
    },
  ];

  // Masked values
  const formattedNationalId = employee.nationalId
    ? isNationalIdRevealed && canSeeSensitive
      ? toPersianDigits(employee.nationalId)
      : canSeeSensitive
      ? `••••••${toPersianDigits(employee.nationalId.slice(-4))}`
      : '—'
    : '—';

  const formattedSalary = canSeeSensitive
    ? isSalaryRevealed
      ? formatToman(employee.baseSalaryToman)
      : '•••••••• تومان'
    : '—';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="left"
      size="xl"
      showCloseButton={true}
      title={
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-3">پرونده پرسنلی</span>
          <span className="text-xs text-text-3 font-mono">/</span>
          <span className="text-xs font-extrabold text-brand">
            کد پرسنلی: {toPersianDigits(employee.personnelCode || '—')}
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Profile Header Banner */}
        <div className="bg-surface-2/60 p-5 rounded-[16px] border border-border-default space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <EmployeeAvatar
                name={employee.fullName}
                id={employee.id}
                size="xl"
                status={employee.status}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-black text-text-1">{employee.fullName}</h2>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      employee.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40'
                        : employee.status === 'RESIGNED'
                        ? 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40'
                        : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40'
                    }`}
                  >
                    {employee.status === 'ACTIVE'
                      ? 'فعال'
                      : employee.status === 'RESIGNED'
                      ? 'قطع همکاری'
                      : 'مرخصی'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-text-2 flex-wrap">
                  <span className="font-semibold text-text-1">{employee.jobTitle}</span>
                  <span className="text-text-3">•</span>
                  <span className="px-2 py-0.5 rounded-[6px] bg-surface-1 border border-border-default text-text-2 text-[11px] font-medium">
                    {employee.department}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={() => onEdit(employee)}
                className="px-3 py-1.5 rounded-[10px] bg-surface-1 hover:bg-surface-2 border border-border-default text-text-1 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="ویرایش"
              >
                <Edit className="w-3.5 h-3.5 text-text-2" />
                <span>ویرایش</span>
              </button>

              {canSeeSensitive && (
                <button
                  type="button"
                  onClick={() => onDelete(employee)}
                  className="px-3 py-1.5 rounded-[10px] bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="حذف"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="border-b border-border-default pb-1">
          <Tabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={(tabId) => setActiveTab(tabId as any)}
            variant="pill"
          />
        </div>

        {/* Tab 1: Personal Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* National ID */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-3 font-semibold mb-1">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-brand" />
                    <span>کد ملی</span>
                  </div>
                  {canSeeSensitive && (
                    <button
                      type="button"
                      onClick={() => setIsNationalIdRevealed(!isNationalIdRevealed)}
                      className="text-text-3 hover:text-brand flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                    >
                      {isNationalIdRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>مخفی‌سازی</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>نمایش</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="text-sm font-extrabold font-mono text-text-1">
                  {formattedNationalId}
                </div>
              </div>

              {/* Father Name */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">نام پدر</div>
                <div className="text-sm font-bold text-text-1">
                  {employee.fatherName || '—'}
                </div>
              </div>

              {/* Birth Date */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-text-3 font-semibold mb-1">
                  <Calendar className="w-3.5 h-3.5 text-text-3" />
                  <span>تاریخ تولد</span>
                </div>
                <div className="text-sm font-bold text-text-1">
                  {employee.birthDateJalali ? toPersianDigits(employee.birthDateJalali) : '—'}
                </div>
              </div>

              {/* Phone */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-3 font-semibold mb-1">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-text-3" />
                    <span>شماره تماس</span>
                  </div>
                  {employee.phone && (
                    <a
                      href={`tel:${employee.phone}`}
                      className="text-[11px] text-brand hover:underline font-bold"
                    >
                      تماس
                    </a>
                  )}
                </div>
                <div className="text-sm font-bold text-text-1 font-mono" dir="ltr">
                  {employee.phone ? toPersianDigits(employee.phone) : '—'}
                </div>
              </div>

              {/* Email */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-3 font-semibold mb-1">
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-text-3" />
                    <span>ایمیل سازمانی</span>
                  </div>
                  {employee.email && (
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-[11px] text-brand hover:underline font-bold"
                    >
                      ارسال
                    </a>
                  )}
                </div>
                <div className="text-sm font-bold text-text-1 font-mono truncate" dir="ltr">
                  {employee.email || '—'}
                </div>
              </div>

              {/* Marital status & children */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs text-text-3 font-semibold mb-1">
                  <Users className="w-3.5 h-3.5 text-text-3" />
                  <span>وضعیت تاهل و اولاد</span>
                </div>
                <div className="text-sm font-bold text-text-1">
                  {employee.maritalStatus === 'MARRIED' ? 'متاهل' : 'مجرد'}
                  {' • '}
                  <span>{toPersianDigits(employee.childrenCount || 0)} فرزند</span>
                </div>
              </div>

              {/* Bank IBAN */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs md:col-span-2">
                <div className="flex items-center gap-1.5 text-xs text-text-3 font-semibold mb-1">
                  <CreditCard className="w-3.5 h-3.5 text-text-3" />
                  <span>شماره شبا</span>
                </div>
                <div className="text-xs font-mono font-bold text-text-1" dir="ltr">
                  {employee.bankIban ? toPersianDigits(employee.bankIban) : 'ثبت نشده'}
                </div>
              </div>

              {/* SSO contribution days */}
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs md:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-text-3 font-semibold mb-1">
                      سابقه بیمه تامین اجتماعی (روز)
                    </div>
                    <div className="text-sm font-black text-text-1">
                      {toPersianDigits(employee.ssoContributionDays ?? 0)} روز
                      <span className="text-xs text-text-3 font-normal mr-1.5">
                        ({toPersianDigits(Math.floor((employee.ssoContributionDays ?? 0) / 365))} سال و{' '}
                        {toPersianDigits(Math.floor(((employee.ssoContributionDays ?? 0) % 365) / 30))} ماه)
                      </span>
                    </div>
                  </div>
                  {(employee.ssoContributionDays ?? 0) >= 720 ? (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40">
                      مشمول حق اولاد
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-[8px] bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                      کمتر از ۷۲۰ روز سابقه
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Contract & Position */}
        {activeTab === 'contract' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">دپارتمان</div>
                <div className="text-sm font-bold text-text-1">{employee.department}</div>
              </div>

              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">سمت شغلی</div>
                <div className="text-sm font-bold text-text-1">{employee.jobTitle}</div>
              </div>

              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">تاریخ استخدام</div>
                <div className="text-sm font-bold text-text-1">
                  {toPersianDigits(employee.hireDateJalali || '—')}
                </div>
              </div>

              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">مدت خدمت</div>
                <div className="text-sm font-black text-brand">
                  {calculateTenure(employee.hireDateJalali)}
                </div>
              </div>

              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs md:col-span-2">
                <div className="text-xs text-text-3 font-semibold mb-1">مدیر مستقیم</div>
                {directManager ? (
                  <div className="flex items-center gap-2.5 mt-1">
                    <EmployeeAvatar name={directManager.fullName} id={directManager.id} size="sm" />
                    <div>
                      <div className="text-xs font-bold text-text-1">{directManager.fullName}</div>
                      <div className="text-[11px] text-text-3">{directManager.jobTitle}</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-text-3 font-medium">
                    مستقیماً زیر نظر مدیریت ارشد
                  </div>
                )}
              </div>
            </div>

            {/* Documents section */}
            <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-1">
                  <FileText className="w-4 h-4 text-brand" />
                  <span>اسناد و مدارک</span>
                </div>
                <span className="text-[11px] font-bold text-text-3">
                  {toPersianDigits(employee.documents?.length || 0)} مدرک
                </span>
              </div>

              {employee.documents && employee.documents.length > 0 ? (
                <div className="divide-y divide-border-default border border-border-default rounded-[10px] overflow-hidden">
                  {employee.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 flex items-center justify-between bg-surface-2/30 hover:bg-surface-2 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-[8px] bg-brand-soft text-brand text-[10px] font-bold">
                          {doc.fileType || 'PDF'}
                        </span>
                        <div>
                          <div className="text-xs font-bold text-text-1">{doc.title}</div>
                          <div className="text-[10px] text-text-3">
                            تاریخ بارگذاری: {toPersianDigits(doc.uploadedAtJalali)}
                          </div>
                        </div>
                      </div>

                      <a
                        href={doc.fileUrl}
                        download
                        onClick={(e) => {
                          if (doc.fileUrl === '#') {
                            e.preventDefault();
                            alert('امکان مشاهده سند وجود ندارد.');
                          }
                        }}
                        className="p-1.5 rounded-[8px] text-text-3 hover:text-brand hover:bg-surface-1 transition-colors cursor-pointer"
                        title="دانلود سند"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-border-default rounded-[10px] text-xs text-text-3">
                  سندی ثبت نشده است.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Salary History */}
        {activeTab === 'salary' && (
          <div className="space-y-5">
            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="flex items-center justify-between text-xs text-text-3 font-semibold mb-1">
                  <span>حقوق پایه ماهانه</span>
                  {canSeeSensitive && (
                    <button
                      type="button"
                      onClick={() => setIsSalaryRevealed(!isSalaryRevealed)}
                      className="text-text-3 hover:text-brand cursor-pointer"
                    >
                      {isSalaryRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                <div className="text-sm font-black text-brand font-mono">
                  {formattedSalary}
                </div>
              </div>

              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">کمک‌هزینه ایاب و ذهاب</div>
                <div className="text-sm font-bold text-text-1">
                  {canSeeSensitive && employee.commuteAllowanceToman !== undefined
                    ? formatToman(employee.commuteAllowanceToman)
                    : '—'}
                </div>
              </div>

              <div className="bg-surface-1 p-3.5 rounded-[12px] border border-border-default shadow-2xs">
                <div className="text-xs text-text-3 font-semibold mb-1">حق اولاد</div>
                <div className="text-sm font-bold text-text-1">
                  {canSeeSensitive
                    ? employee.childrenCount > 0
                      ? `${toPersianDigits(employee.childrenCount)} فرزند مشمول`
                      : 'فاقد فرزند'
                    : '—'}
                </div>
              </div>
            </div>

            {/* Vertical Timeline of Salary & Promotion History */}
            <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div className="flex items-center gap-1.5 text-xs font-bold text-text-1">
                  <Clock className="w-4 h-4 text-brand" />
                  <span>سوابق احکام و تغییر حقوق</span>
                </div>
                <span className="text-[11px] font-bold text-text-3">
                  تغییرات شغلی
                </span>
              </div>

              {employee.jobHistories && employee.jobHistories.length > 0 ? (
                <div className="relative pr-6 space-y-6 before:absolute before:right-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-default">
                  {employee.jobHistories.map((hist: JobHistoryItem) => (
                    <div key={hist.id} className="relative">
                      {/* Timeline Dot */}
                      <span className="absolute -right-6 top-1 w-3.5 h-3.5 rounded-full bg-surface-1 border-2 border-brand shadow-xs" />

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-text-1">
                            {toPersianDigits(hist.effectiveDateJalali)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              hist.changeType === 'PROMOTION'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : hist.changeType === 'SALARY_CHANGE'
                                ? 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                                : 'bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                            }`}
                          >
                            {hist.changeType === 'PROMOTION'
                              ? 'ارتقا'
                              : hist.changeType === 'SALARY_CHANGE'
                              ? 'تغییر حقوق'
                              : 'تغییر دپارتمان'}
                          </span>
                        </div>

                        <div className="text-xs text-text-2">
                          <span className="text-text-3 font-medium">از: </span>
                          <span className="font-semibold">{hist.previousTitle}</span>
                          <span className="text-text-3 mx-1.5">←</span>
                          <span className="text-text-3 font-medium">به: </span>
                          <span className="font-bold text-brand">{hist.newTitle}</span>
                        </div>

                        {hist.description && (
                          <div className="text-[11px] text-text-3 bg-surface-2/40 p-2 rounded-[8px] mt-1.5">
                            {hist.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-5 text-center border border-dashed border-border-default rounded-[10px] space-y-1">
                  <div className="text-xs font-bold text-text-2">
                    حکم جدیدی ثبت نشده است.
                  </div>
                  <div className="text-[11px] text-text-3">
                    قرارداد اولیه از تاریخ {toPersianDigits(employee.hireDateJalali)} ملاک محاسبه است.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Performance & Attendance */}
        {activeTab === 'performance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="bg-surface-1 p-4 rounded-[12px] border border-border-default shadow-2xs space-y-1">
                <div className="text-xs text-text-3 font-semibold">سهمیه سالانه مرخصی استحقاقی</div>
                <div className="text-lg font-black text-brand">
                  {toPersianDigits(26)} روز کاری
                </div>
                <div className="text-[11px] text-text-3">
                  ماده ۶۴ قانون کار (۲.۱۶ روز در ماه)
                </div>
              </div>

              <div className="bg-surface-1 p-4 rounded-[12px] border border-border-default shadow-2xs space-y-1">
                <div className="text-xs text-text-3 font-semibold">ساعات کار موظف هفتگی</div>
                <div className="text-lg font-black text-text-1">
                  {toPersianDigits(44)} ساعت
                </div>
                <div className="text-[11px] text-text-3">
                  ماده ۵۱ قانون کار
                </div>
              </div>
            </div>

            <div className="bg-surface-1 p-4 rounded-[14px] border border-border-default shadow-2xs space-y-2.5">
              <div className="text-xs font-bold text-text-1 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-brand" />
                <span>ارزیابی عملکرد</span>
              </div>
              <p className="text-xs text-text-2 leading-relaxed">
                ارزیابی عملکرد شامل اهداف فصلی، شاخص‌های کلیدی و بازخورد دوره‌ای است. جزئیات در بخش ارزیابی عملکرد قابل مشاهده است.
              </p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};
