import React, { useState, useMemo, useEffect } from 'react';
import { Employee, UserRole } from '../../types';
import {
  toPersianDigits,
  formatToman,
} from '../../utils/jalali';
import { EmployeeAvatar } from './EmployeeAvatar';
import { EmployeeProfileDrawer } from './EmployeeProfileDrawer';
import { EmployeeFormModal } from './EmployeeFormModal';
import { OrgChartView } from './OrgChartView';
import { Modal } from '../ui/Modal';
import {
  Users,
  Plus,
  Search,
  Network,
  List,
  Building,
  CreditCard,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  DollarSign,
  Eye,
  EyeOff,
  SlidersHorizontal,
  X,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Shield,
  UserX,
  ChevronDown,
  Sparkles,
  Filter,
} from 'lucide-react';

interface EmployeesModuleProps {
  employees: Employee[];
  currentRole?: UserRole;
  onCreateEmployee: (newEmp: Partial<Employee>) => void;
  onUpdateEmployee?: (id: string, patch: Partial<Employee>) => Promise<void> | void;
  onDeleteEmployee?: (id: string) => Promise<void> | void;
}

export function highlightMatch(text: string | undefined | null, query: string): React.ReactNode {
  if (!text) return '—';
  if (!query || !query.trim()) return text;

  const q = query.trim();
  const lowerText = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const index = lowerText.indexOf(lowerQ);
  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <>
      {before}
      <mark className="bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 font-bold px-0.5 rounded-[3px]">
        {match}
      </mark>
      {after}
    </>
  );
}

export const EmployeesModule: React.FC<EmployeesModuleProps> = ({
  employees,
  currentRole = UserRole.HR_DIRECTOR,
  onCreateEmployee,
}) => {
  // Sync local employees with props
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(employees);
  useEffect(() => {
    setLocalEmployees(employees);
  }, [employees]);

  // Salary / national-id columns are HR-confidential
  const canSeeSensitive = currentRole === UserRole.HR_DIRECTOR;

  // View mode switcher: table view / org chart view as segmented control
  const [viewMode, setViewMode] = useState<'list' | 'org_chart'>('list');

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Composable filter states
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | null>(null);
  const [filterHasChildren, setFilterHasChildren] = useState<boolean>(false);

  // Sensitive data reveal toggles
  const [revealAllSensitive, setRevealAllSensitive] = useState(false);

  // Column visibility controls
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    personnelCode: true,
    nationalId: true,
    department: true,
    jobTitle: true,
    phone: true,
    hireDate: true,
    family: false,
    salary: true,
    status: true,
    actions: true,
  });

  // Drawer state for Employee Profile
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Modal state for Add/Edit Form
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Delete protection & 409 friendly modal/toast
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState<{
    employee: Employee;
    message: string;
    suggestion?: string;
  } | null>(null);

  // Friendly toast state
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Unique departments for filter chips
  const departments = useMemo(() => {
    const set = new Set<string>();
    localEmployees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [localEmployees]);

  // Filtered employees
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return localEmployees.filter((emp) => {
      // Search term
      if (q) {
        const matchesName = emp.fullName?.toLowerCase().includes(q);
        const matchesCode = emp.personnelCode?.toLowerCase().includes(q);
        const matchesJob = emp.jobTitle?.toLowerCase().includes(q);
        const matchesDept = emp.department?.toLowerCase().includes(q);
        const matchesPhone = emp.phone?.toLowerCase().includes(q);
        const matchesEmail = emp.email?.toLowerCase().includes(q);
        const matchesNationalId = canSeeSensitive && emp.nationalId?.includes(q);

        if (
          !matchesName &&
          !matchesCode &&
          !matchesJob &&
          !matchesDept &&
          !matchesPhone &&
          !matchesEmail &&
          !matchesNationalId
        ) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartment && emp.department !== selectedDepartment) {
        return false;
      }

      // Status filter
      if (selectedStatus && emp.status !== selectedStatus) {
        return false;
      }

      // Children filter
      if (filterHasChildren && (!emp.childrenCount || emp.childrenCount <= 0)) {
        return false;
      }

      return true;
    });
  }, [
    localEmployees,
    searchTerm,
    selectedDepartment,
    selectedStatus,
    filterHasChildren,
    canSeeSensitive,
  ]);

  // Handler for opening profile drawer
  const handleOpenProfile = (emp: Employee) => {
    setSelectedEmployee(emp);
    setIsDrawerOpen(true);
  };

  // Handler for opening edit modal
  const handleOpenEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsFormModalOpen(true);
  };

  // Handler for saving employee (Add or Edit)
  const handleSaveEmployee = async (formData: Partial<Employee>) => {
    if (editingEmployee) {
      // PATCH /api/employees/:id
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در بروزرسانی پرونده پرسنل');
      }

      const updated: Employee = await res.json();
      setLocalEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEmployee?.id === updated.id) {
        setSelectedEmployee(updated);
      }
      setToast({
        type: 'success',
        message: `پرونده پرسنلی «${updated.fullName}» با موفقیت بروزرسانی گردید.`,
      });
    } else {
      // Call prop onCreateEmployee
      await onCreateEmployee(formData);
      setToast({
        type: 'success',
        message: `پرونده پرسنلی همکار جدید «${formData.fullName}» با موفقیت ثبت شد.`,
      });
    }

    setIsFormModalOpen(false);
    setEditingEmployee(null);
  };

  // Handler for delete with 409 check
  const handleDeleteEmployee = async (emp: Employee) => {
    const confirmed = window.confirm(
      `آیا از حذف پرونده پرسنلی «${emp.fullName}» اطمینان دارید؟\nدر صورتی که این پرسنل دارای سوابق حقوق، مرخصی یا تردد باشد، طبق الزامات قانونی حذف آن مسدود خواهد شد.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'DELETE',
      });

      if (res.status === 409) {
        const data = await res.json();
        setDeleteBlockedInfo({
          employee: emp,
          message:
            data.error ||
            'پرونده پرسنلی دارای سوابق حقوقی/تردد/مرخصی است و طبق الزامات قانونی قابل حذف نیست.',
          suggestion:
            data.suggestion ||
            'برای پایان همکاری، وضعیت پرسنل را به «قطع همکاری» تغییر دهید.',
        });
        setToast({
          type: 'error',
          message: 'امکان حذف دائم وجود ندارد؛ پرونده دارای سوابق قانونی است.',
        });
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در حذف همکار');
      }

      setLocalEmployees((prev) => prev.filter((e) => e.id !== emp.id));
      if (selectedEmployee?.id === emp.id) {
        setIsDrawerOpen(false);
        setSelectedEmployee(null);
      }

      setToast({
        type: 'success',
        message: `پرونده پرسنلی همکار «${emp.fullName}» با موفقیت حذف گردید.`,
      });
    } catch (err: any) {
      console.error(err);
      setToast({
        type: 'error',
        message: err.message || 'خطا در ارتباط با سرور جهت حذف پرسنل',
      });
    }
  };

  // Quick action: change status to RESIGNED when 409 occurs
  const handleMarkAsResigned = async (emp: Employee) => {
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESIGNED' }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'خطا در تغییر وضعیت پرسنل');
      }

      const updated = await res.json();
      setLocalEmployees((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      if (selectedEmployee?.id === updated.id) {
        setSelectedEmployee(updated);
      }

      setDeleteBlockedInfo(null);
      setToast({
        type: 'info',
        message: `وضعیت همکاری «${emp.fullName}» به «قطع همکاری» تغییر یافت و سوابق وی بایگانی شد.`,
      });
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'خطا در تغییر وضعیت' });
    }
  };

  const hasActiveFilters =
    Boolean(selectedDepartment) ||
    Boolean(selectedStatus) ||
    filterHasChildren ||
    Boolean(searchTerm);

  const clearAllFilters = () => {
    setSelectedDepartment(null);
    setSelectedStatus(null);
    setFilterHasChildren(false);
    setSearchTerm('');
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-[12px] shadow-xl border flex items-center gap-2.5 text-xs font-bold ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-700'
                : toast.type === 'error'
                ? 'bg-rose-600 text-white border-rose-700'
                : 'bg-surface-1 text-text-1 border-border-default shadow-lg'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-brand shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 text-white/80 hover:text-white mr-2 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-1 p-4 rounded-[16px] border border-border-default shadow-2xs">
        <div>
          <h2 className="text-sm font-black text-text-1 flex items-center gap-2">
            <span>اطلاعات پرسنلی و چارت سازمانی</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-soft text-brand border border-brand/20">
              {toPersianDigits(localEmployees.length)} نفر
            </span>
          </h2>
          <p className="text-xs text-text-3 mt-0.5 font-medium">
            اطلاعات هویتی، قراردادها، سوابق و ساختار سازمانی
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Segmented Control View Switcher */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-[12px] border border-border-default text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-[8px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-surface-1 text-brand shadow-xs'
                  : 'text-text-2 hover:text-text-1'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>فهرست پرسنل</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('org_chart')}
              className={`px-3 py-1.5 rounded-[8px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'org_chart'
                  ? 'bg-surface-1 text-brand shadow-xs'
                  : 'text-text-2 hover:text-text-1'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>چارت سازمانی</span>
            </button>
          </div>

          {/* Add Employee Button (HR Only) */}
          {canSeeSensitive && (
            <button
              type="button"
              onClick={() => {
                setEditingEmployee(null);
                setIsFormModalOpen(true);
              }}
              className="px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-[10px] text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن پرسنل</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-3">
          {/* Search Bar & Action Controls */}
          <div className="bg-surface-1 p-3.5 rounded-[16px] border border-border-default shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Instant Client-side Search Input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-text-3 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="جستجوی نام، کدملی، کد پرسنلی، دپارتمان یا سمت..."
                  className="w-full pr-9 pl-8 py-2 text-xs bg-surface-2 text-text-1 border border-border-default rounded-[10px] focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand font-sans placeholder:text-text-3"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute left-2.5 top-2.5 text-text-3 hover:text-text-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Buttons: Column Visibility & Sensitive Reveal */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Reveal All Sensitive Toggle (HR Only) */}
                {canSeeSensitive && (
                  <button
                    type="button"
                    onClick={() => setRevealAllSensitive(!revealAllSensitive)}
                    className={`px-3 py-2 rounded-[10px] border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      revealAllSensitive
                        ? 'bg-brand-soft border-brand/30 text-brand'
                        : 'bg-surface-2 hover:bg-surface-2/80 border-border-default text-text-2'
                    }`}
                    title={
                      revealAllSensitive
                        ? 'مخفی‌سازی ستون‌های محرمانه (کد ملی و حقوق)'
                        : 'نمایش ستون‌های محرمانه (کد ملی و حقوق)'
                    }
                  >
                    {revealAllSensitive ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-brand" />
                        <span>مخفی‌سازی اطلاعات محرمانه</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>نمایش اطلاعات محرمانه</span>
                      </>
                    )}
                  </button>
                )}

                {/* Column Visibility Menu Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                    className="px-3 py-2 rounded-[10px] bg-surface-2 hover:bg-surface-2/80 border border-border-default text-text-2 hover:text-text-1 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>ستون‌ها</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {isColumnMenuOpen && (
                    <div className="absolute left-0 mt-1 w-52 bg-surface-1 rounded-[12px] border border-border-default shadow-xl p-3 z-30 space-y-1.5 text-right animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[11px] font-black text-text-3 pb-1 border-b border-border-default">
                        انتخاب ستون‌ها
                      </div>
                      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={visibleColumns.personnelCode}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, personnelCode: e.target.checked })
                          }
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>کد پرسنلی</span>
                      </label>
                      {canSeeSensitive && (
                        <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={visibleColumns.nationalId}
                            onChange={(e) =>
                              setVisibleColumns({ ...visibleColumns, nationalId: e.target.checked })
                            }
                            className="rounded text-brand focus:ring-brand"
                          />
                          <span>کد ملی</span>
                        </label>
                      )}
                      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={visibleColumns.department}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, department: e.target.checked })
                          }
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>دپارتمان</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={visibleColumns.phone}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, phone: e.target.checked })
                          }
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>شماره تماس</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={visibleColumns.hireDate}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, hireDate: e.target.checked })
                          }
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>تاریخ استخدام</span>
                      </label>
                      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={visibleColumns.family}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, family: e.target.checked })
                          }
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>وضعیت تاهل و اولاد</span>
                      </label>
                      {canSeeSensitive && (
                        <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                          <input
                            type="checkbox"
                            checked={visibleColumns.salary}
                            onChange={(e) =>
                              setVisibleColumns({ ...visibleColumns, salary: e.target.checked })
                            }
                            className="rounded text-brand focus:ring-brand"
                          />
                          <span>حقوق پایه</span>
                        </label>
                      )}
                      <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer py-1">
                        <input
                          type="checkbox"
                          checked={visibleColumns.status}
                          onChange={(e) =>
                            setVisibleColumns({ ...visibleColumns, status: e.target.checked })
                          }
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span>وضعیت اشتغال</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Composable Filter Chips */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border-default/60">
              <span className="text-[11px] font-bold text-text-3 ml-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-text-3" />
                <span>فیلترها:</span>
              </span>

              {/* All Employees Chip */}
              <button
                type="button"
                onClick={() => {
                  setSelectedDepartment(null);
                  setSelectedStatus(null);
                  setFilterHasChildren(false);
                }}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                  !selectedDepartment && !selectedStatus && !filterHasChildren
                    ? 'bg-brand text-white shadow-2xs'
                    : 'bg-surface-2 text-text-2 hover:bg-surface-2/80'
                }`}
              >
                همه ({toPersianDigits(localEmployees.length)})
              </button>

              {/* Status Chips */}
              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(selectedStatus === 'ACTIVE' ? null : 'ACTIVE')
                }
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                  selectedStatus === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                فعال
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(selectedStatus === 'ON_LEAVE' ? null : 'ON_LEAVE')
                }
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                  selectedStatus === 'ON_LEAVE'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                }`}
              >
                مرخصی
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedStatus(selectedStatus === 'RESIGNED' ? null : 'RESIGNED')
                }
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                  selectedStatus === 'RESIGNED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                قطع همکاری
              </button>

              {/* Department filter chips */}
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() =>
                    setSelectedDepartment(selectedDepartment === dept ? null : dept)
                  }
                  className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                    selectedDepartment === dept
                      ? 'bg-brand text-white shadow-2xs'
                      : 'bg-surface-2 text-text-2 hover:bg-surface-2/80 border border-border-default'
                  }`}
                >
                  {dept}
                </button>
              ))}

              {/* Children filter chip */}
              <button
                type="button"
                onClick={() => setFilterHasChildren(!filterHasChildren)}
                className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer ${
                  filterHasChildren
                    ? 'bg-brand text-white shadow-2xs'
                    : 'bg-surface-2 text-text-2 hover:bg-surface-2/80 border border-border-default'
                }`}
              >
                دارای اولاد
              </button>

              {/* Clear filters action */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="mr-auto text-[11px] text-brand hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>پاک کردن فیلترها</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container with Sticky Header and Row Hover */}
          <div className="bg-surface-1 rounded-[16px] border border-border-default shadow-2xs overflow-hidden">
            <div className="overflow-x-auto touch-scroll max-h-[640px]">
              <table className="w-full min-w-[840px] text-right text-xs">
                {/* Sticky Header */}
                <thead className="sticky top-0 z-10 bg-surface-2 text-text-1 font-black border-b border-border-default shadow-xs select-none">
                  <tr>
                    <th className="p-3.5 pr-4">نام و ایمیل</th>
                    {visibleColumns.personnelCode && (
                      <th className="p-3.5">کد پرسنلی</th>
                    )}
                    {canSeeSensitive && visibleColumns.nationalId && (
                      <th className="p-3.5">کد ملی</th>
                    )}
                    {visibleColumns.department && (
                      <th className="p-3.5">دپارتمان و سمت</th>
                    )}
                    {visibleColumns.phone && <th className="p-3.5">شماره تماس</th>}
                    {visibleColumns.hireDate && <th className="p-3.5">تاریخ استخدام</th>}
                    {visibleColumns.family && <th className="p-3.5">اولاد</th>}
                    {canSeeSensitive && visibleColumns.salary && (
                      <th className="p-3.5">حقوق پایه (تومان)</th>
                    )}
                    {visibleColumns.status && (
                      <th className="p-3.5 text-center">وضعیت</th>
                    )}
                    {visibleColumns.actions && (
                      <th className="p-3.5 text-center pl-4">عملیات</th>
                    )}
                  </tr>
                </thead>

                {/* Table Body with Row Hover */}
                <tbody className="divide-y divide-border-default/60 text-text-2">
                  {filtered.map((emp) => {
                    const maskedNationalId = emp.nationalId
                      ? revealAllSensitive
                        ? toPersianDigits(emp.nationalId)
                        : `••••••${toPersianDigits(emp.nationalId.slice(-4))}`
                      : '—';

                    const maskedSalary = revealAllSensitive
                      ? formatToman(emp.baseSalaryToman)
                      : '•••••••• تومان';

                    return (
                      <tr
                        key={emp.id}
                        onClick={() => handleOpenProfile(emp)}
                        className="hover:bg-surface-2/60 transition-colors cursor-pointer group"
                      >
                        {/* Employee Avatar & Name */}
                        <td className="p-3.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <EmployeeAvatar
                              name={emp.fullName}
                              id={emp.id}
                              size="sm"
                              status={emp.status}
                            />
                            <div className="min-w-0">
                              <div className="font-extrabold text-text-1 group-hover:text-brand transition-colors truncate">
                                {highlightMatch(emp.fullName, searchTerm)}
                              </div>
                              <div className="text-[11px] text-text-3 font-mono truncate" dir="ltr">
                                {highlightMatch(emp.email, searchTerm)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Personnel Code */}
                        {visibleColumns.personnelCode && (
                          <td className="p-3.5 font-bold text-text-1 font-mono">
                            {emp.personnelCode
                              ? highlightMatch(toPersianDigits(emp.personnelCode), searchTerm)
                              : '—'}
                          </td>
                        )}

                        {/* National ID (Sensitive) */}
                        {canSeeSensitive && visibleColumns.nationalId && (
                          <td className="p-3.5 font-mono text-text-2">
                            {highlightMatch(maskedNationalId, searchTerm)}
                          </td>
                        )}

                        {/* Department & Job Title */}
                        {visibleColumns.department && (
                          <td className="p-3.5">
                            <div className="font-semibold text-text-1">
                              {highlightMatch(emp.jobTitle, searchTerm)}
                            </div>
                            <div className="text-[11px] text-text-3">
                              {highlightMatch(emp.department, searchTerm)}
                            </div>
                          </td>
                        )}

                        {/* Phone */}
                        {visibleColumns.phone && (
                          <td className="p-3.5 font-mono text-text-2" dir="ltr">
                            {emp.phone ? toPersianDigits(emp.phone) : '—'}
                          </td>
                        )}

                        {/* Hire Date */}
                        {visibleColumns.hireDate && (
                          <td className="p-3.5 text-text-2">
                            {emp.hireDateJalali ? toPersianDigits(emp.hireDateJalali) : '—'}
                          </td>
                        )}

                        {/* Family / Children */}
                        {visibleColumns.family && (
                          <td className="p-3.5 text-text-2">
                            {emp.maritalStatus === 'MARRIED' ? 'متاهل' : 'مجرد'}{' '}
                            {emp.childrenCount > 0 && `(${toPersianDigits(emp.childrenCount)} فرزند)`}
                          </td>
                        )}

                        {/* Base Salary (Sensitive) */}
                        {canSeeSensitive && visibleColumns.salary && (
                          <td className="p-3.5 font-black text-brand font-mono">
                            {maskedSalary}
                          </td>
                        )}

                        {/* Status Badge */}
                        {visibleColumns.status && (
                          <td className="p-3.5 text-center">
                            {emp.status === 'ACTIVE' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                <span>فعال</span>
                              </span>
                            ) : emp.status === 'RESIGNED' ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-bold inline-flex items-center gap-1">
                                <UserX className="w-3 h-3" />
                                <span>قطع همکاری</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-bold inline-flex items-center gap-1">
                                <span>مرخصی</span>
                              </span>
                            )}
                          </td>
                        )}

                        {/* Action Buttons */}
                        {visibleColumns.actions && (
                          <td className="p-3.5 text-center pl-4">
                            <div
                              className="flex items-center justify-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenProfile(emp)}
                                className="p-1.5 rounded-[8px] text-text-3 hover:text-brand hover:bg-surface-2 transition-colors cursor-pointer"
                                title="مشاهده پرونده"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEdit(emp)}
                                className="p-1.5 rounded-[8px] text-text-3 hover:text-brand hover:bg-surface-2 transition-colors cursor-pointer"
                                title="ویرایش پرونده"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {canSeeSensitive && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmployee(emp)}
                                  className="p-1.5 rounded-[8px] text-text-3 hover:text-danger hover:bg-danger-soft transition-colors cursor-pointer"
                                  title="حذف پرونده"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-10 text-center text-text-3 font-medium"
                      >
                        <Users className="w-8 h-8 mx-auto text-text-3/40 mb-2" />
                        <p>پرسنلی با این مشخصات یافت نشد.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="p-3 bg-surface-2/40 border-t border-border-default flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-text-3 font-medium">
              <span>
                نمایش {toPersianDigits(filtered.length)} از {toPersianDigits(localEmployees.length)} پرسنل
              </span>
              <span>
                برای مشاهده جزئیات پرونده، روی سطر کلیک کنید.
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Hierarchical Organizational Chart View */
        <OrgChartView
          employees={localEmployees}
          onSelectEmployee={(emp) => handleOpenProfile(emp)}
        />
      )}

      {/* Employee Profile Full-Page Drawer (RTL Left-Side) */}
      <EmployeeProfileDrawer
        employee={selectedEmployee}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        canSeeSensitive={canSeeSensitive}
        onEdit={(emp) => {
          setIsDrawerOpen(false);
          handleOpenEdit(emp);
        }}
        onDelete={(emp) => handleDeleteEmployee(emp)}
        allEmployees={localEmployees}
      />

      {/* Add / Edit Employee Form Modal */}
      <EmployeeFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingEmployee(null);
        }}
        onSubmit={handleSaveEmployee}
        initialEmployee={editingEmployee}
        existingEmployees={localEmployees}
      />

      {/* Delete-Protection 409 Friendly Modal Dialog */}
      {deleteBlockedInfo && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteBlockedInfo(null)}
          size="md"
          title={
            <div className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5" />
              <span>امکان حذف پرونده وجود ندارد</span>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-danger-soft border border-danger/20 rounded-[12px] text-xs leading-relaxed text-text-1 font-medium space-y-2">
              <p className="font-bold text-danger">
                {deleteBlockedInfo.message}
              </p>
              <p className="text-text-2">
                برای «{deleteBlockedInfo.employee.fullName}» سوابق ثبتی (فیش حقوق، تردد یا مرخصی) ثبت شده است. به دلیل وجود سوابق مالی و قانونی، امکان حذف پرونده وجود ندارد.
              </p>
            </div>

            <div className="bg-surface-2 p-3.5 rounded-[12px] border border-border-default text-xs space-y-2">
              <div className="font-bold text-text-1 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand" />
                <span>پیشنهاد:</span>
              </div>
              <p className="text-text-2 leading-relaxed">
                می‌توانید وضعیت را به «قطع همکاری» تغییر دهید تا دسترسی‌ها غیرفعال شود و سوابق گذشته محفوظ بماند.
              </p>
            </div>

            <div className="pt-3 border-t border-border-default flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteBlockedInfo(null)}
                className="px-4 py-2 text-xs font-semibold text-text-2 hover:bg-surface-2 rounded-[10px] cursor-pointer"
              >
                انصراف
              </button>

              <button
                type="button"
                onClick={() => handleMarkAsResigned(deleteBlockedInfo.employee)}
                className="px-4 py-2 text-xs font-bold bg-brand hover:bg-brand-hover text-white rounded-[10px] shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <UserX className="w-3.5 h-3.5" />
                <span>تغییر به قطع همکاری</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
