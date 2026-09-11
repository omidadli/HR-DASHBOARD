import React, { useState } from 'react';
import {
  Building2,
  Users,
  Briefcase,
  TrendingUp,
  MapPin,
  Clock,
  Sparkles,
  ChevronLeft,
  Search,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
  PlusCircle,
  Award,
} from 'lucide-react';
import { HoldingDepartment } from '../../types';

interface MobileDepartmentsProps {
  departments: HoldingDepartment[];
  onSelectDepartmentForJob?: (dept: HoldingDepartment) => void;
  onBack?: () => void;
}

export const MobileDepartments: React.FC<MobileDepartmentsProps> = ({
  departments,
  onSelectDepartmentForJob,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedDeptDetail, setSelectedDeptDetail] = useState<HoldingDepartment | null>(null);

  const categories = [
    { id: 'ALL', label: 'همه دپارتمان‌ها (۱۰)' },
    { id: 'PRODUCTION', label: 'تولید و کیفیت' },
    { id: 'COMMERCIAL', label: 'مارکتینگ و فروش' },
    { id: 'OPERATIONS', label: 'زنجیره تامین و تحقیق و توسعه' },
    { id: 'CORPORATE', label: 'ستاد مرکزی و فناوری اطلاعات' },
  ];

  const filteredDepts = departments.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.englishName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.headName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.brands.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'ALL') return true;
    if (selectedCategory === 'PRODUCTION') return d.category === 'MANUFACTURING' || d.category === 'QUALITY';
    if (selectedCategory === 'COMMERCIAL') return d.category === 'MARKETING' || d.category === 'SALES';
    if (selectedCategory === 'OPERATIONS') return d.category === 'SUPPLY_CHAIN' || d.category === 'R_AND_D';
    if (selectedCategory === 'CORPORATE') return d.category === 'HR' || d.category === 'FINANCE' || d.category === 'IT' || d.category === 'LEGAL';

    return true;
  });

  const totalPersonnel = departments.reduce((acc, d) => acc + d.headcount, 0);
  const totalVacancies = departments.reduce((acc, d) => acc + d.vacancies, 0);

  return (
    <div className="space-y-4 pb-14">
      {/* Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center cursor-pointer hover:bg-white/25"
              >
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            )}
            <div>
              <h1 className="text-sm sm:text-base font-black flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-300" />
                دپارتمان‌های هلدینگ سیلانه سبز
              </h1>
              <p className="text-[11px] text-emerald-200 mt-0.5">
                ۱۰ دپارتمان تخصصی کارخانجات اشتهارد و ستاد مرکزی
              </p>
            </div>
          </div>
          <div className="text-left bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
            <span className="text-[10px] text-emerald-200 block">کل کارمندان:</span>
            <span className="text-xs font-black text-white font-mono">{totalPersonnel.toLocaleString('fa-IR')} نفر</span>
          </div>
        </div>
      </div>

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 block">واحدهای فعال:</span>
          <span className="text-sm font-black text-emerald-700 font-mono">۱۰ واحد</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 block">موقعیت‌های باز:</span>
          <span className="text-sm font-black text-amber-600 font-mono">{totalVacancies} ردیف شغلی</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 block">بهره‌وری تجمیعی:</span>
          <span className="text-sm font-black text-teal-700 font-mono">۹۵.۶٪</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="جستجوی دپارتمان، برند یا نام مدیر..."
          className="w-full pr-9 pl-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-800"
        />
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Departments List */}
      <div className="space-y-3">
        {filteredDepts.map((dept) => (
          <div
            key={dept.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all space-y-3"
          >
            {/* Top row: Name & KPI Badge */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                    {dept.name}
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block">
                  {dept.englishName}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[11px] font-bold flex-shrink-0">
                <Award className="w-3 h-3 text-emerald-600" />
                <span>KPI: {dept.kpiScore}٪</span>
              </div>
            </div>

            {/* Department Head & Location */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <img
                  src={dept.avatar}
                  alt={dept.headName}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-300"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="font-bold text-slate-800 text-[11px] block">{dept.headName}</span>
                  <span className="text-[10px] text-slate-500">{dept.headTitle}</span>
                </div>
              </div>

              <div className="text-left space-y-0.5">
                <span className="text-[11px] font-bold text-slate-800 font-mono block">
                  {dept.headcount} نفر
                </span>
                <span className="text-[10px] text-amber-600 font-semibold block">
                  {dept.vacancies} ردیف شغلی باز
                </span>
              </div>
            </div>

            {/* Brands Tags */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">برندها و پروژه‌ها:</span>
              <div className="flex flex-wrap gap-1">
                {dept.brands.map((b, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Description Quote */}
            <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              {dept.description}
            </p>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <span className="truncate max-w-[180px]">{dept.location}</span>
              </span>

              {onSelectDepartmentForJob && (
                <button
                  onClick={() => onSelectDepartmentForJob(dept)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>تولید آگهی شغلی</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
