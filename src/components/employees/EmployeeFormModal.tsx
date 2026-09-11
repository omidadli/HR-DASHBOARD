import React, { useState, useEffect } from 'react';
import { Employee } from '../../types';
import {
  toPersianDigits,
  toEnglishDigits,
  isValidIranianNationalId,
  getTodayJalali,
  formatJalaliDate,
} from '../../utils/jalali';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { Modal } from '../ui/Modal';
import {
  User,
  Shield,
  Phone,
  Mail,
  Building,
  Briefcase,
  DollarSign,
  Users,
  AlertCircle,
  CreditCard,
  Calendar,
} from 'lucide-react';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (employeeData: Partial<Employee>) => Promise<void> | void;
  initialEmployee?: Employee | null;
  existingEmployees: Employee[];
}

const DEPARTMENTS = [
  'فناوری اطلاعات',
  'منابع انسانی',
  'مالی و حسابداری',
  'بازاریابی و فروش',
  'تولید و کارخانه',
  'زنجیره تامین و انبار',
  'حقوقی و امور قراردادها',
];

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialEmployee,
  existingEmployees,
}) => {
  const isEditMode = Boolean(initialEmployee);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [personnelCode, setPersonnelCode] = useState('');
  const [department, setDepartment] = useState('فناوری اطلاعات');
  const [jobTitle, setJobTitle] = useState('');
  const [baseSalaryToman, setBaseSalaryToman] = useState<number>(32000000);
  const [hireDateJalali, setHireDateJalali] = useState(formatJalaliDate(getTodayJalali(), true));
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [maritalStatus, setMaritalStatus] = useState<'SINGLE' | 'MARRIED'>('SINGLE');
  const [childrenCount, setChildrenCount] = useState<number>(0);
  const [bankIban, setBankIban] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'RESIGNED' | 'ON_LEAVE'>('ACTIVE');
  const [directManagerId, setDirectManagerId] = useState<string>('');

  // Touched states for inline validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Populate when opening for edit or new
  useEffect(() => {
    if (initialEmployee) {
      setFullName(initialEmployee.fullName || '');
      setNationalId(initialEmployee.nationalId || '');
      setPersonnelCode(initialEmployee.personnelCode || '');
      setDepartment(initialEmployee.department || 'فناوری اطلاعات');
      setJobTitle(initialEmployee.jobTitle || '');
      setBaseSalaryToman(initialEmployee.baseSalaryToman || 0);
      setHireDateJalali(initialEmployee.hireDateJalali || formatJalaliDate(getTodayJalali(), true));
      setPhone(initialEmployee.phone || '');
      setEmail(initialEmployee.email || '');
      setMaritalStatus(initialEmployee.maritalStatus || 'SINGLE');
      setChildrenCount(initialEmployee.childrenCount || 0);
      setBankIban(initialEmployee.bankIban || '');
      setFatherName(initialEmployee.fatherName || '');
      setStatus(initialEmployee.status || 'ACTIVE');
      setDirectManagerId(initialEmployee.directManagerId || '');
    } else {
      setFullName('');
      setNationalId('');
      setPersonnelCode('');
      setDepartment('فناوری اطلاعات');
      setJobTitle('');
      setBaseSalaryToman(32000000);
      setHireDateJalali(formatJalaliDate(getTodayJalali(), true));
      setPhone('');
      setEmail('');
      setMaritalStatus('SINGLE');
      setChildrenCount(0);
      setBankIban('');
      setFatherName('');
      setStatus('ACTIVE');
      setDirectManagerId('');
    }
    setTouched({});
    setFormError(null);
  }, [initialEmployee, isOpen]);

  // Validation logic
  const normalizedNationalId = toEnglishDigits(nationalId).trim();
  const normalizedPhone = toEnglishDigits(phone).trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPersonnelCode = toEnglishDigits(personnelCode).trim();

  // Errors object
  const errors: Record<string, string> = {};

  if (!fullName.trim()) {
    errors.fullName = 'نام و نام خانوادگی الزامی است';
  }

  // National ID validation
  if (!normalizedNationalId) {
    errors.nationalId = 'کد ملی الزامی است';
  } else if (!/^\d{10}$/.test(normalizedNationalId)) {
    errors.nationalId = 'کد ملی باید ۱۰ رقم باشد';
  } else if (!isValidIranianNationalId(normalizedNationalId)) {
    errors.nationalId = 'کد ملی نامعتبر است';
  } else {
    // Uniqueness check
    const isDuplicate = existingEmployees.some(
      (e) =>
        e.id !== initialEmployee?.id &&
        toEnglishDigits(e.nationalId || '').trim() === normalizedNationalId
    );
    if (isDuplicate) {
      errors.nationalId = 'این کد ملی قبلاً ثبت شده است';
    }
  }

  // Phone validation
  if (!normalizedPhone) {
    errors.phone = 'شماره موبایل الزامی است';
  } else if (!/^09\d{9}$/.test(normalizedPhone)) {
    errors.phone = 'شماره موبایل نامعتبر است';
  }

  // Email validation
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!normalizedEmail) {
    errors.email = 'ایمیل سازمانی الزامی است';
  } else if (!EMAIL_RE.test(normalizedEmail)) {
    errors.email = 'ایمیل نامعتبر است';
  } else {
    // Uniqueness check
    const isDuplicate = existingEmployees.some(
      (e) =>
        e.id !== initialEmployee?.id &&
        (e.email || '').trim().toLowerCase() === normalizedEmail
    );
    if (isDuplicate) {
      errors.email = 'این ایمیل قبلاً ثبت شده است';
    }
  }

  // Personnel Code uniqueness check
  if (normalizedPersonnelCode) {
    const isDuplicate = existingEmployees.some(
      (e) =>
        e.id !== initialEmployee?.id &&
        toEnglishDigits(e.personnelCode || '').trim() === normalizedPersonnelCode
    );
    if (isDuplicate) {
      errors.personnelCode = 'کد پرسنلی تکراری است';
    }
  }

  if (!department.trim()) {
    errors.department = 'انتخاب دپارتمان الزامی است';
  }

  if (!jobTitle.trim()) {
    errors.jobTitle = 'عنوان شغلی الزامی است';
  }

  if (baseSalaryToman < 0 || isNaN(baseSalaryToman)) {
    errors.baseSalaryToman = 'حقوق پایه باید عددی نامنفی باشد';
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      nationalId: true,
      phone: true,
      email: true,
      department: true,
      jobTitle: true,
      baseSalaryToman: true,
      personnelCode: true,
    });

    if (Object.keys(errors).length > 0) {
      setFormError('لطفاً خطاهای فرم را اصلاح کنید.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload: Partial<Employee> = {
        fullName: fullName.trim(),
        nationalId: normalizedNationalId,
        personnelCode: normalizedPersonnelCode || undefined,
        department: department.trim(),
        jobTitle: jobTitle.trim(),
        baseSalaryToman: Number(baseSalaryToman) || 0,
        hireDateJalali,
        phone: normalizedPhone,
        email: normalizedEmail,
        maritalStatus,
        childrenCount: Number(childrenCount) || 0,
        bankIban: bankIban.trim() || undefined,
        fatherName: fatherName.trim() || undefined,
        status,
        directManagerId: directManagerId || undefined,
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      console.error(err);
      setFormError(err?.message || 'خطا در ثبت اطلاعات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-brand" />
          <span>
            {isEditMode
              ? `ویرایش پرسنل: ${initialEmployee?.fullName}`
              : 'ثبت همکار جدید'}
          </span>
        </div>
      }
      description={
        isEditMode
          ? 'ویرایش مشخصات فردی، شغلی و حقوقی همکار'
          : 'مشخصات همکار در چارت سازمانی و بخش تردد ثبت می‌شود.'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-danger-soft text-danger border border-danger/20 rounded-[10px] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* Section 1: Identity */}
        <div className="space-y-3">
          <div className="text-xs font-black text-text-1 flex items-center gap-1.5 pb-1 border-b border-border-default">
            <Shield className="w-3.5 h-3.5 text-brand" />
            <span>اطلاعات فردی و هویتی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                نام و نام خانوادگی <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => handleBlur('fullName')}
                placeholder="مثلاً: پوریا شریفی"
                className={`w-full px-3 py-2 text-xs bg-surface-2 border rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  touched.fullName && errors.fullName
                    ? 'border-danger focus:border-danger'
                    : 'border-border-default focus:border-brand'
                }`}
              />
              {touched.fullName && errors.fullName && (
                <p className="text-[11px] text-danger font-medium mt-1">{errors.fullName}</p>
              )}
            </div>

            {/* Father Name */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">نام پدر</label>
              <input
                type="text"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="مثلاً: احمد"
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            {/* National ID */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                کد ملی <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                onBlur={() => handleBlur('nationalId')}
                placeholder="۰۰۱۲۳۴۵۶۷۸"
                className={`w-full px-3 py-2 text-xs bg-surface-2 border rounded-[10px] text-text-1 font-mono focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  touched.nationalId && errors.nationalId
                    ? 'border-danger focus:border-danger'
                    : 'border-border-default focus:border-brand'
                }`}
              />
              {touched.nationalId && errors.nationalId && (
                <p className="text-[11px] text-danger font-medium mt-1">{errors.nationalId}</p>
              )}
            </div>

            {/* Personnel Code */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">کد پرسنلی</label>
              <input
                type="text"
                value={personnelCode}
                onChange={(e) => setPersonnelCode(e.target.value)}
                onBlur={() => handleBlur('personnelCode')}
                placeholder="اختیاری"
                className={`w-full px-3 py-2 text-xs bg-surface-2 border rounded-[10px] text-text-1 font-mono focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  touched.personnelCode && errors.personnelCode
                    ? 'border-danger focus:border-danger'
                    : 'border-border-default focus:border-brand'
                }`}
              />
              {touched.personnelCode && errors.personnelCode && (
                <p className="text-[11px] text-danger font-medium mt-1">{errors.personnelCode}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Contact Info */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-black text-text-1 flex items-center gap-1.5 pb-1 border-b border-border-default">
            <Phone className="w-3.5 h-3.5 text-brand" />
            <span>اطلاعات تماس</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                شماره موبایل <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="09123456789"
                className={`w-full px-3 py-2 text-xs bg-surface-2 border rounded-[10px] text-text-1 font-mono focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  touched.phone && errors.phone
                    ? 'border-danger focus:border-danger'
                    : 'border-border-default focus:border-brand'
                }`}
                dir="ltr"
              />
              {touched.phone && errors.phone && (
                <p className="text-[11px] text-danger font-medium mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                ایمیل سازمانی <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="name@company.ir"
                className={`w-full px-3 py-2 text-xs bg-surface-2 border rounded-[10px] text-text-1 font-mono focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  touched.email && errors.email
                    ? 'border-danger focus:border-danger'
                    : 'border-border-default focus:border-brand'
                }`}
                dir="ltr"
              />
              {touched.email && errors.email && (
                <p className="text-[11px] text-danger font-medium mt-1">{errors.email}</p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Job & Position */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-black text-text-1 flex items-center gap-1.5 pb-1 border-b border-border-default">
            <Building className="w-3.5 h-3.5 text-brand" />
            <span>جایگاه شغلی</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                دپارتمان <span className="text-danger">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Title */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                عنوان شغلی <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                onBlur={() => handleBlur('jobTitle')}
                placeholder="مثلاً: کارشناس ارشد فروش"
                className={`w-full px-3 py-2 text-xs bg-surface-2 border rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 ${
                  touched.jobTitle && errors.jobTitle
                    ? 'border-danger focus:border-danger'
                    : 'border-border-default focus:border-brand'
                }`}
              />
              {touched.jobTitle && errors.jobTitle && (
                <p className="text-[11px] text-danger font-medium mt-1">{errors.jobTitle}</p>
              )}
            </div>

            {/* Hire Date */}
            <div>
              <JalaliDatePicker
                label="تاریخ استخدام"
                value={hireDateJalali}
                onChange={(v) => setHireDateJalali(v)}
              />
            </div>

            {/* Direct Manager */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">مدیر مستقیم</label>
              <select
                value={directManagerId}
                onChange={(e) => setDirectManagerId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="">فاقد مدیر مستقیم</option>
                {existingEmployees
                  .filter((e) => e.id !== initialEmployee?.id)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName} — {e.jobTitle} ({e.department})
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Compensation & Family */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-black text-text-1 flex items-center gap-1.5 pb-1 border-b border-border-default">
            <DollarSign className="w-3.5 h-3.5 text-brand" />
            <span>حقوق و مزایا</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Base Salary */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                حقوق پایه (تومان) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                min={0}
                step={100000}
                value={baseSalaryToman}
                onChange={(e) => setBaseSalaryToman(parseInt(e.target.value, 10) || 0)}
                onBlur={() => handleBlur('baseSalaryToman')}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 font-bold text-brand focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
              <p className="text-[10px] text-text-3 mt-1">
                معادل: {toPersianDigits((baseSalaryToman / 10).toLocaleString('fa-IR'))} هزار تومان
              </p>
            </div>

            {/* Marital status */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">وضعیت تاهل</label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              >
                <option value="SINGLE">مجرد</option>
                <option value="MARRIED">متاهل</option>
              </select>
            </div>

            {/* Children count */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">
                تعداد فرزندان مشمول
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={childrenCount}
                onChange={(e) => setChildrenCount(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              />
            </div>

            {/* Status (especially relevant in Edit mode) */}
            <div>
              <label className="block text-xs font-bold text-text-1 mb-1">وضعیت</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-bold"
              >
                <option value="ACTIVE">فعال</option>
                <option value="ON_LEAVE">مرخصی</option>
                <option value="RESIGNED">قطع همکاری</option>
              </select>
            </div>

            {/* Bank IBAN */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-text-1 mb-1">
                شماره شبا
              </label>
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="IR120170000000009876543210"
                className="w-full px-3 py-2 text-xs bg-surface-2 border border-border-default rounded-[10px] text-text-1 font-mono focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-border-default flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-text-2 hover:bg-surface-2 rounded-[10px] transition-colors cursor-pointer disabled:opacity-50"
          >
            انصراف
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white rounded-[10px] shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>در حال ذخیره...</span>
            ) : (
              <span>{isEditMode ? 'ذخیره تغییرات' : 'ثبت همکار'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
