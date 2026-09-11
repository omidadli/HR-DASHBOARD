import React, { useEffect, useState } from 'react';
import { Employee, SkillMatrixItem, TrainingCourse, UserRole } from '../../types';
import { toPersianDigits } from '../../utils/jalali';
import { BookOpen, Star, CheckCircle } from 'lucide-react';

interface TrainingEnrollment {
  id: string;
  courseId: string;
  employeeId: string;
  employeeName: string;
  enrolledAtJalali: string;
  status: 'ENROLLED' | 'COMPLETED';
}

interface TrainingModuleProps {
  courses: TrainingCourse[];
  skillMatrix: SkillMatrixItem[];
  currentRole?: UserRole;
  employees?: Employee[];
  /** Real enrollment API (audit fix MOD-04: the button was alert()-only). */
  onEnroll?: (courseId: string, employeeId?: string) => Promise<boolean>;
}

const COURSE_STATUS_META: Record<
  TrainingCourse['status'],
  { label: string; className: string }
> = {
  UPCOMING: {
    label: 'آتی',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
  },
  IN_PROGRESS: {
    label: 'در حال برگزاری',
    className: 'bg-blue-50 text-blue-700 border border-blue-200',
  },
  COMPLETED: {
    label: 'پایان‌یافته',
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
};

function getSkillGapStatus(requiredLevel: number, teamAverageLevel: number): {
  label: string;
  className: string;
} {
  const gap = requiredLevel - teamAverageLevel;
  if (gap <= 0) {
    return {
      label: 'مطلوب',
      className: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    };
  }
  if (gap <= 1) {
    return {
      label: 'نیازمند تقویت',
      className: 'bg-amber-50 text-amber-800 border border-amber-200',
    };
  }
  return {
    label: 'نیازمند آموزش',
    className: 'bg-rose-50 text-rose-800 border border-rose-200',
  };
}

function LevelBars({ level, max = 5 }: { level: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].slice(0, max).map((step) => (
        <div
          key={step}
          className={`w-4 h-4 rounded-md text-[10px] font-bold flex items-center justify-center ${
            step <= Math.round(level)
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-400'
          }`}
        >
          {toPersianDigits(step)}
        </div>
      ))}
    </div>
  );
}

export const TrainingModule: React.FC<TrainingModuleProps> = ({
  courses,
  skillMatrix,
  currentRole = UserRole.HR_DIRECTOR,
  employees = [],
  onEnroll,
}) => {
  const [activeTab, setActiveTab] = useState<'courses' | 'matrix'>('courses');
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  useEffect(() => {
    let alive = true;
    fetch('/api/training/enrollments')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (alive && Array.isArray(d)) setEnrollments(d); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const enrolledCourseIds = new Set(
    enrollments.filter((e) => !selectedEmployeeId || e.employeeId === selectedEmployeeId).map((e) => e.courseId)
  );

  const handleEnroll = async (courseId: string) => {
    if (!onEnroll) return;
    setEnrollingCourseId(courseId);
    try {
      const ok = await onEnroll(courseId, selectedEmployeeId || undefined);
      if (ok) {
        const fresh = await fetch('/api/training/enrollments').then((r) => (r.ok ? r.json() : null));
        if (Array.isArray(fresh)) setEnrollments(fresh);
      }
    } finally {
      setEnrollingCourseId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Enrollee selector — HR enrolls on behalf of a specific employee;
          other roles always enroll themselves (server enforces this too). */}
      {currentRole === UserRole.HR_DIRECTOR && employees.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          <label className="text-xs font-bold text-slate-700" htmlFor="enroll-employee">
            ثبت‌نام برای کارمند:
          </label>
          <select
            id="enroll-employee"
            value={selectedEmployeeId}
            onChange={(e) => setSelectedEmployeeId(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 max-w-xs"
          >
            <option value="">خودم</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.fullName} — {e.department}</option>
            ))}
          </select>
          <span className="text-[11px] text-slate-500">
            {toPersianDigits(enrollments.length)} ثبت‌نام انجام شده
          </span>
        </div>
      )}

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-sm font-bold text-slate-900">آموزش و توسعه شایستگی‌ها</h2>
          <p className="text-xs text-slate-500">
            برنامه‌ریزی دوره‌های آموزشی و پایش ماتریس مهارت‌ها
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'courses'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            دوره‌های آموزشی
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'matrix'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ماتریس مهارت‌ها
          </button>
        </div>
      </div>

      {activeTab === 'courses' ? (
        /* Courses Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {courses.map((c) => {
            const statusMeta = COURSE_STATUS_META[c.status];
            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-sm text-slate-900">{c.title}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 shrink-0">
                    {toPersianDigits(c.durationHours)} ساعت
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <div>
                    <span className="text-slate-400">مدرس: </span>
                    <span className="font-semibold text-slate-800">{c.instructor}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">دپارتمان: </span>
                    <span>{c.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">شرکت‌کنندگان: </span>
                    <span className="font-bold">{toPersianDigits(c.participantsCount)} نفر</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">وضعیت: </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                {/* Completion progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">پیشرفت دوره:</span>
                    <span className="font-extrabold text-emerald-800">
                      {toPersianDigits(c.completionRate)}٪
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.max(0, c.completionRate))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>گواهی پایان دوره</span>
                  </span>

                  {enrolledCourseIds.has(c.id) ? (
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-bold text-[11px] flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      ثبت‌نام شده
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={enrollingCourseId === c.id || !onEnroll}
                      onClick={() => handleEnroll(c.id)}
                      className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60 text-emerald-800 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      {enrollingCourseId === c.id ? 'در حال ثبت...' : 'ثبت‌نام'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {courses.length === 0 && (
            <div className="col-span-full bg-white rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-500 text-xs">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>دوره‌ای یافت نشد.</p>
            </div>
          )}
        </div>
      ) : (
        /* Skill Matrix Table */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">مهارت</th>
                <th className="p-3.5">دسته‌بندی</th>
                <th className="p-3.5">سطح مورد نیاز</th>
                <th className="p-3.5">میانگین تیم</th>
                <th className="p-3.5 text-center">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {skillMatrix.map((item, idx) => {
                const gapStatus = getSkillGapStatus(item.requiredLevel, item.teamAverageLevel);
                return (
                  <tr key={`${item.skillName}-${idx}`} className="hover:bg-slate-50/70">
                    <td className="p-3.5 font-bold text-slate-900">{item.skillName}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <LevelBars level={item.requiredLevel} />
                        <span className="font-bold text-slate-800">
                          {toPersianDigits(item.requiredLevel)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <LevelBars level={item.teamAverageLevel} />
                        <span className="font-bold text-emerald-800">
                          {toPersianDigits(item.teamAverageLevel)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${gapStatus.className}`}
                      >
                        {gapStatus.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {skillMatrix.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>موردی یافت نشد.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
