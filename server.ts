/**
 * Enterprise HRMS Express Server (سامانه جامع منابع انسانی کارا)
 * Full API Endpoints for all 8 Modules + Gemini AI Recruitment Agent
 */

import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { dbStore } from './server/store';
import { processAgentChat, generateJobAd, processVoiceCommand, evaluateCandidateWithCriteria } from './server/gemini';
import {
  understandJob,
  evaluateResume,
  calibrateTopAndBorderline,
  generateFallbackCandidateEvaluation,
} from './server/screening-gemini';
import { getStatutoryConfig, STATUTORY_YEARS } from './server/statutory';
import { generatePayrollSlips } from './server/payroll-service';
import {
  computeAllLeaveBalances,
  computeLeaveBalance,
  validateLeaveRequest,
} from './server/leave-service';
import {
  AttendanceRecord,
  CandidateCategory,
  CandidateStage,
  ChecklistItem,
  Employee,
  JobHistoryItem,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  PayrollStatus,
  UserRole,
} from './src/types';
import {
  JalaliDate,
  addJalaliDays,
  formatJalaliDate,
  isValidIranianNationalId,
  parseJalaliDateString,
  toPersianDigits,
} from './src/utils/jalali';
import { tehranNow } from './server/tehran-time';

dotenv.config();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const currentRole = (): UserRole => dbStore.currentUserRole;
  const isHR = (): boolean => currentRole() === UserRole.HR_DIRECTOR;

  const sessionEmployee = (): Employee | undefined =>
    dbStore.employees.find(e => e.id === dbStore.sessionEmployeeId);

  const managerDepartment = (): string | null => sessionEmployee()?.department || null;

  function requireRole(...roles: UserRole[]) {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!roles.includes(currentRole())) {
        return res.status(403).json({
          error: 'شما اجازه دسترسی به این عملیات را ندارید',
          requiredRoles: roles,
          currentRole: currentRole(),
        });
      }
      next();
    };
  }

  const HR_AND_MANAGER = [UserRole.HR_DIRECTOR, UserRole.DEPT_MANAGER];

  const SENSITIVE_FIELDS = [
    'baseSalaryToman', 'nationalId', 'bankIban', 'birthDateJalali',
    'ssoContributionDays', 'commuteAllowanceToman',
  ] as const;

  function sanitizeEmployee(emp: Employee, viewerRole: UserRole, viewerEmployeeId?: string): Employee {
    if (viewerRole === UserRole.HR_DIRECTOR) return emp;
    if (emp.id === viewerEmployeeId) return emp;
    const copy: any = { ...emp };
    for (const f of SENSITIVE_FIELDS) delete copy[f];
    if (viewerRole === UserRole.EMPLOYEE) {
      delete copy.phone;
      delete copy.email;
    }
    return copy as Employee;
  }

  function canViewEmployeeFully(emp: Employee): boolean {
    const role = currentRole();
    if (role === UserRole.HR_DIRECTOR) return true;
    if (emp.id === dbStore.sessionEmployeeId) return true;
    if (role === UserRole.DEPT_MANAGER) {
      const dept = managerDepartment();
      return !!dept && emp.department === dept;
    }
    return false;
  }

  function employeesVisibleToCurrentRole(): Employee[] {
    const role = currentRole();
    if (role === UserRole.HR_DIRECTOR) return dbStore.employees;
    if (role === UserRole.DEPT_MANAGER) {
      const dept = managerDepartment();
      return dbStore.employees.filter(e => e.department === dept || e.id === dbStore.sessionEmployeeId);
    }
    return dbStore.employees;
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString(), tehranDateJalali: tehranNow().jalaliString, platform: 'Kara HRMS Iran' });
  });

  // Standalone Smart Resume Screening Endpoints
  app.get('/api/screening/health', (req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
    res.json({
      status: 'ok',
      hasGeminiKey: hasKey,
    });
  });

  app.post('/api/screening/understand-job', async (req, res) => {
    try {
      const { jobDescription } = req.body;
      if (!jobDescription || typeof jobDescription !== 'string' || !jobDescription.trim()) {
        return res.status(400).json({ error: 'متن شرح شغل الزامی است' });
      }
      const understanding = await understandJob(jobDescription);
      res.json(understanding);
    } catch (err: any) {
      console.error('Error understanding job:', err);
      res.status(500).json({ error: err?.message || 'خطا در تحلیل شغل با هوش مصنوعی' });
    }
  });

  app.post('/api/screening/evaluate-resume', async (req, res) => {
    try {
      const { jobDescription, jobUnderstanding, resumeText, fileName } = req.body;
      if (!jobDescription || !jobUnderstanding) {
        return res.status(400).json({ error: 'اطلاعات شغل ناقص است' });
      }
      const evaluation = await evaluateResume(
        jobDescription,
        jobUnderstanding,
        resumeText || '',
        fileName || 'رزومه'
      );
      res.json(evaluation);
    } catch (err: any) {
      console.log(`[API evaluate-resume] Fallback triggered for «${req.body?.fileName || 'رزومه'}»:`, err?.message || 'Handled');
      const fallback = generateFallbackCandidateEvaluation(
        req.body?.jobUnderstanding,
        req.body?.resumeText || '',
        req.body?.fileName || 'رزومه'
      );
      res.json(fallback);
    }
  });

  app.post('/api/screening/calibrate', async (req, res) => {
    try {
      const { jobUnderstanding, candidates } = req.body;
      if (!jobUnderstanding || !Array.isArray(candidates)) {
        return res.status(400).json({ error: 'اطلاعات کالیبراسیون ناقص است' });
      }
      const adjustments = await calibrateTopAndBorderline(jobUnderstanding, candidates);
      res.json({ adjustments });
    } catch (err: any) {
      console.error('Error calibrating candidates:', err);
      res.status(500).json({ error: err?.message || 'خطا در کالیبراسیون' });
    }
  });

  app.get('/api/auth/me', (req, res) => {
    res.json({
      role: dbStore.currentUserRole,
      employeeId: dbStore.sessionEmployeeId,
      user: {
        id: 'usr-admin-1',
        fullName: 'مهندس کیوان سهرابی',
        role: dbStore.currentUserRole,
        email: 'k.sohrabi@kara-hrms.ir',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
      },
    });
  });

  app.post('/api/auth/switch-role', (req, res) => {
    const { role } = req.body;
    if (Object.values(UserRole).includes(role)) {
      dbStore.currentUserRole = role;
      res.json({ success: true, newRole: role, employeeId: dbStore.sessionEmployeeId });
    } else {
      res.status(400).json({ error: 'نقش کاربری نامعتبر است' });
    }
  });

  app.get('/api/jobs', async (req, res) => {
    try {
      res.json(dbStore.jobs);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || 'Error fetching jobs' });
    }
  });

  app.post('/api/jobs', requireRole(...HR_AND_MANAGER), (req, res) => {
    const title = String(req.body.title || '').trim();
    const department = String(req.body.department || '').trim();
    if (!title) return res.status(400).json({ error: 'عنوان شغلی الزامی است' });
    if (!department) return res.status(400).json({ error: 'دپارتمان درخواست‌کننده الزامی است' });

    const criteria = Array.isArray(req.body.criteria) && req.body.criteria.length > 0
      ? req.body.criteria
      : [
          { id: 'c-new-1', title: 'مهارت فنی تخصصی', weight: 40 },
          { id: 'c-new-2', title: 'سابقه کار مرتبط', weight: 35 },
          { id: 'c-new-3', title: 'مهارت‌های ارتباطی و تیمی', weight: 25 },
        ];
    const weightSum = criteria.reduce((s: number, c: any) => s + (Number(c.weight) || 0), 0);
    if (Math.abs(weightSum - 100) > 1) {
      return res.status(400).json({ error: `مجموع وزن شاخص‌ها باید ۱۰۰ باشد (مقدار فعلی: ${weightSum})` });
    }

    const now = tehranNow();
    const newJob = {
      id: `job-${Date.now()}`,
      title,
      department,
      employmentType: req.body.employmentType || 'تمام‌وقت',
      location: req.body.location || 'تهران',
      description: req.body.description || '',
      requirements: req.body.requirements || '',
      status: 'ACTIVE' as const,
      createdAtJalali: now.jalaliString,
      applicationsCount: 0,
      criteria,
    };
    dbStore.jobs.unshift(newJob);
    dbStore.markDirty();
    res.status(201).json(newJob);
  });

  app.patch('/api/jobs/:id', requireRole(...HR_AND_MANAGER), async (req, res) => {
    const job = dbStore.jobs.find(j => j.id === req.params.id);
    if (!job) return res.status(404).json({ error: 'موقعیت شغلی یافت نشد' });
    const { title, department, employmentType, location, description, requirements, status } = req.body;
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ error: 'عنوان شغلی نمی‌تواند خالی باشد' });
      job.title = String(title).trim();
    }
    if (department !== undefined) job.department = String(department).trim() || job.department;
    if (employmentType !== undefined) job.employmentType = employmentType;
    if (location !== undefined) job.location = location;
    if (description !== undefined) job.description = description;
    if (requirements !== undefined) job.requirements = requirements;
    if (status !== undefined) {
      if (!['ACTIVE', 'DRAFT', 'ARCHIVED'].includes(status)) {
        return res.status(400).json({ error: 'وضعیت نامعتبر است (ACTIVE/DRAFT/ARCHIVED)' });
      }
      job.status = status;
    }
    dbStore.markDirty();
    res.json(job);
  });

  app.delete('/api/jobs/:id', requireRole(UserRole.HR_DIRECTOR), (req, res) => {
    const idx = dbStore.jobs.findIndex(j => j.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'موقعیت شغلی یافت نشد' });
    const linked = dbStore.candidates.filter(c => c.jobId === req.params.id).length;
    if (linked > 0) {
      return res.status(409).json({
        error: `این موقعیت شغلی ${toPersianDigits(linked)} کارجوی پیوسته دارد و قابل حذف نیست`,
        suggestion: 'به جای حذف، وضعیت موقعیت را به ARCHIVED تغییر دهید (PATCH /api/jobs/:id).',
      });
    }
    dbStore.jobs.splice(idx, 1);
    dbStore.markDirty();
    res.json({ success: true, deletedId: req.params.id });
  });

  app.put('/api/jobs/:id/criteria', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { id } = req.params;
    const {
      criteria,
      scoringMethod,
      aiRigor,
      evaluationInstructions,
      interviewPriorityThreshold,
      initialRejectionThreshold,
    } = req.body;

    const job = dbStore.jobs.find(j => j.id === id);
    if (!job) return res.status(404).json({ error: 'موقعیت شغلی یافت نشد' });

    if (Array.isArray(criteria)) {
      const weightSum = criteria.reduce((s: number, c: any) => s + (Number(c.weight) || 0), 0);
      if (criteria.length > 0 && Math.abs(weightSum - 100) > 1) {
        return res.status(400).json({ error: `مجموع وزن شاخص‌ها باید ۱۰۰ باشد (مقدار فعلی: ${weightSum})` });
      }
      job.criteria = criteria;
    }
    if (scoringMethod) job.scoringMethod = scoringMethod;
    if (aiRigor) job.aiRigor = aiRigor;
    if (evaluationInstructions !== undefined) job.evaluationInstructions = evaluationInstructions;
    if (typeof interviewPriorityThreshold === 'number') {
      if (interviewPriorityThreshold < 0 || interviewPriorityThreshold > 10) {
        return res.status(400).json({ error: 'حد نصاب اولویت مصاحبه باید بین ۰ تا ۱۰ باشد' });
      }
      job.interviewPriorityThreshold = interviewPriorityThreshold;
    }
    if (typeof initialRejectionThreshold === 'number') {
      if (initialRejectionThreshold < 0 || initialRejectionThreshold > 10) {
        return res.status(400).json({ error: 'حد نصاب رد اولیه باید بین ۰ تا ۱۰ باشد' });
      }
      job.initialRejectionThreshold = initialRejectionThreshold;
    }
    if (
      typeof job.interviewPriorityThreshold === 'number' &&
      typeof job.initialRejectionThreshold === 'number' &&
      job.initialRejectionThreshold >= job.interviewPriorityThreshold
    ) {
      return res.status(400).json({ error: 'حد نصاب رد اولیه باید کمتر از حد نصاب اولویت مصاحبه باشد' });
    }

    dbStore.markDirty();
    res.json({
      success: true,
      message: 'شاخصه‌ها، وزن‌دهی و متد ارزیابی هوش مصنوعی با موفقیت بروزرسانی شد',
      job,
    });
  });

  app.post('/api/jobs/evaluate-candidate', requireRole(...HR_AND_MANAGER), async (req, res) => {
    try {
      const {
        candidateId,
        jobId,
        jobTitle,
        department,
        candidateName,
        resumeText,
        criteria,
        scoringMethod,
        aiRigor,
        evaluationInstructions,
        interviewPriorityThreshold,
        initialRejectionThreshold,
        saveCandidateResult,
      } = req.body;

      let targetJob = dbStore.jobs.find(j => j.id === jobId);
      let targetCandidate = candidateId ? dbStore.candidates.find(c => c.id === candidateId) : null;

      const evalResumeText = String(resumeText ?? targetCandidate?.resumeText ?? '').trim();
      if (evalResumeText.length < 20) {
        return res.status(400).json({
          error: 'متن رزومه برای ارزیابی موجود نیست یا بیش از حد کوتاه است',
          hint: 'ابتدا محتوای رزومه استخراج و ثبت شود؛ امتیازدهی بدون متن رزومه ممکن نیست.',
        });
      }

      const evalJobTitle = jobTitle || targetJob?.title || 'موقعیت شغلی سازمانی';
      const evalDepartment = department || targetJob?.department || 'منابع انسانی';
      const evalCandidateName = candidateName || targetCandidate?.fullName || 'کارجوی متقاضی';
      const evalCriteria = criteria || targetJob?.criteria || [];
      const evalScoringMethod = scoringMethod || targetJob?.scoringMethod || 'WEIGHTED_AVG';
      const evalAiRigor = aiRigor || targetJob?.aiRigor || 'BALANCED';
      const evalInstructions = evaluationInstructions ?? targetJob?.evaluationInstructions;
      const evalPriority = interviewPriorityThreshold ?? targetJob?.interviewPriorityThreshold ?? 7.0;
      const evalRejection = initialRejectionThreshold ?? targetJob?.initialRejectionThreshold ?? 5.0;

      const result = await evaluateCandidateWithCriteria({
        jobTitle: evalJobTitle,
        department: evalDepartment,
        candidateName: evalCandidateName,
        resumeText: evalResumeText,
        criteria: evalCriteria,
        scoringMethod: evalScoringMethod,
        aiRigor: evalAiRigor,
        evaluationInstructions: evalInstructions,
        interviewPriorityThreshold: evalPriority,
        initialRejectionThreshold: evalRejection,
      });

      if (saveCandidateResult && targetCandidate) {
        targetCandidate.overallScore = result.overallScore;
        targetCandidate.category = result.category;
        targetCandidate.criteriaScores = result.criteriaScores;
        targetCandidate.strengths = result.strengths;
        targetCandidate.weaknesses = result.weaknesses;
        targetCandidate.resumeQuotes = result.resumeQuotes;
        (targetCandidate as any).evaluatedAtJalali = tehranNow().jalaliString;
        (targetCandidate as any).aiAvailable = (result as any).aiAvailable !== false;
        dbStore.markDirty();
      }

      res.json(result);
    } catch (err: any) {
      console.error('Error evaluating candidate with criteria:', err);
      res.status(500).json({ error: 'خطا در انجام ارزیابی هوش مصنوعی', details: err.message });
    }
  });

  app.get('/api/candidates', (req, res) => {
    const { jobId, stage, category, talentPool } = req.query;
    let list = [...dbStore.candidates];
    if (jobId) list = list.filter(c => c.jobId === jobId);
    if (stage) list = list.filter(c => c.stage === stage);
    if (category) list = list.filter(c => c.category === category);
    if (talentPool === 'true') list = list.filter(c => c.inTalentPool);
    res.json(list);
  });

  app.post('/api/candidates', requireRole(...HR_AND_MANAGER), (req, res) => {
    const fullName = String(req.body.fullName || '').trim();
    const email = String(req.body.email || '').trim();
    const jobId = req.body.jobId;
    const job = dbStore.jobs.find(j => j.id === jobId);
    if (!fullName) return res.status(400).json({ error: 'نام و نام خانوادگی کارجو الزامی است' });
    if (!job) return res.status(400).json({ error: 'موقعیت شغلی انتخاب‌شده وجود ندارد' });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'رایانامه کارجو نامعتبر است' });

    const scoreRaw = Number(req.body.overallScore);
    const hasScore = Number.isFinite(scoreRaw) && scoreRaw >= 0 && scoreRaw <= 10;

    const newCand = {
      id: `cand-${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      fullName,
      email,
      phone: String(req.body.phone || '').trim(),
      resumeFileName: req.body.resumeFileName || '',
      resumeText: String(req.body.resumeText || ''),
      overallScore: hasScore ? scoreRaw : undefined,
      category: hasScore
        ? (req.body.category as CandidateCategory) || CandidateCategory.NEEDS_REVIEW
        : undefined,
      stage: CandidateStage.INITIAL_SCREENING,
      strengths: Array.isArray(req.body.strengths) ? req.body.strengths : [],
      weaknesses: Array.isArray(req.body.weaknesses) ? req.body.weaknesses : [],
      resumeQuotes: Array.isArray(req.body.resumeQuotes) ? req.body.resumeQuotes : [],
      criteriaScores: req.body.criteriaScores || {},
      inTalentPool: false,
      appliedAtJalali: tehranNow().jalaliString,
    };
    dbStore.candidates.unshift(newCand);
    job.applicationsCount += 1;
    dbStore.markDirty();
    res.status(201).json(newCand);
  });

  const STAGE_TRANSITIONS: Record<CandidateStage, CandidateStage[]> = {
    [CandidateStage.INITIAL_SCREENING]: [CandidateStage.PHONE_INTERVIEW, CandidateStage.IN_PERSON_INTERVIEW, CandidateStage.REJECTED],
    [CandidateStage.PHONE_INTERVIEW]: [CandidateStage.IN_PERSON_INTERVIEW, CandidateStage.OFFER, CandidateStage.REJECTED],
    [CandidateStage.IN_PERSON_INTERVIEW]: [CandidateStage.OFFER, CandidateStage.REJECTED],
    [CandidateStage.OFFER]: [CandidateStage.HIRED, CandidateStage.REJECTED],
    [CandidateStage.HIRED]: [],
    [CandidateStage.REJECTED]: [CandidateStage.INITIAL_SCREENING],
  };

  const STAGE_LABELS: Record<CandidateStage, string> = {
    [CandidateStage.INITIAL_SCREENING]: 'بررسی اولیه',
    [CandidateStage.PHONE_INTERVIEW]: 'مصاحبه تلفنی',
    [CandidateStage.IN_PERSON_INTERVIEW]: 'مصاحبه حضوری',
    [CandidateStage.OFFER]: 'پیشنهاد همکاری',
    [CandidateStage.HIRED]: 'استخدام شده',
    [CandidateStage.REJECTED]: 'رد شده',
  };

  app.patch('/api/candidates/:id/stage', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { id } = req.params;
    const { stage } = req.body;
    if (!Object.values(CandidateStage).includes(stage)) {
      return res.status(400).json({ error: 'مرحله استخدامی نامعتبر است' });
    }
    const cand = dbStore.candidates.find(c => c.id === id);
    if (!cand) return res.status(404).json({ error: 'کارجو یافت نشد' });

    const allowed = STAGE_TRANSITIONS[cand.stage] || [];
    if (stage !== cand.stage && !allowed.includes(stage)) {
      return res.status(409).json({
        error: `انتقال از «${STAGE_LABELS[cand.stage]}» به «${STAGE_LABELS[stage as CandidateStage]}» مجاز نیست`,
        allowedTransitions: allowed.map(s => STAGE_LABELS[s]),
      });
    }

    if (stage === CandidateStage.HIRED && cand.stage !== CandidateStage.HIRED) {
      const evaluated =
        typeof cand.overallScore === 'number' &&
        !!cand.criteriaScores && Object.keys(cand.criteriaScores).length > 0;
      if (!evaluated) {
        return res.status(409).json({
          error: 'ارزیابی کارجو تکمیل نشده است (نمره و امتیاز شاخص‌ها ثبت نشده)',
          hint: 'پیش از استخدام، رزومه را با «ارزیابی هوش مصنوعی» امتیازدهی کنید.',
        });
      }
      if (!EMAIL_RE.test(cand.email || '')) {
        return res.status(409).json({ error: 'رایانامه کارجو برای صدور قرارداد نامعتبر است' });
      }
      const job = dbStore.jobs.find(j => j.id === cand.jobId);
      if (!job) {
        return res.status(409).json({ error: 'موقعیت شغلی مرتبط با کارجو یافت نشد' });
      }

      cand.stage = CandidateStage.HIRED;
      const now = tehranNow();

      const existingCodes = new Set(dbStore.employees.map(e => e.personnelCode));
      let personnelCode = '';
      do {
        personnelCode = toPersianDigits(`10${Math.floor(100 + Math.random() * 900)}`);
      } while (existingCodes.has(personnelCode));

      const newEmp: Employee = {
        id: `emp-hired-${Date.now()}`,
        personnelCode,
        nationalId: '',
        fullName: cand.fullName,
        birthDateJalali: '',
        phone: cand.phone || '',
        email: cand.email,
        department: job.department,
        jobTitle: job.title,
        hireDateJalali: now.jalaliString,
        baseSalaryToman: 0,
        maritalStatus: 'SINGLE',
        childrenCount: 0,
        bankIban: '',
        status: 'ACTIVE',
        documents: [],
        jobHistories: [
          {
            id: `jh-${Date.now()}`,
            changeType: 'PROMOTION',
            previousTitle: '—',
            newTitle: job.title,
            effectiveDateJalali: now.jalaliString,
            description: `استخدام از مسیر جذب کارجو (پرونده ${cand.id})`,
          },
        ],
        ssoContributionDays: 0,
        commuteAllowanceToman: 0,
      };
      dbStore.employees.push(newEmp);

      const due = formatJalaliDate(addJalaliDays(now.jalali, 7), true);
      const onboardingTitles = [
        'صدور قرارداد کار و امضای الکترونیکی',
        'جمع‌آوری مدارک هویتی (کد ملی، شناسنامه، کارت پایان خدمت)',
        'ثبت شماره شبا (IBAN) جهت واریز حقوق',
        'معرفی به سازمان تامین اجتماعی و صدور شماره بیمه',
        'معارفه با تیم و تعیین منتور (Onboarding Buddy)',
      ];
      const createdChecklistItems: ChecklistItem[] = onboardingTitles.map((title, i) => ({
        id: `chk-hired-${Date.now()}-${i}`,
        employeeId: newEmp.id,
        employeeName: newEmp.fullName,
        type: 'ONBOARDING',
        title,
        department: newEmp.department,
        dueDateJalali: due,
        isCompleted: false,
      }));
      dbStore.checklistItems.unshift(...createdChecklistItems);
      dbStore.markDirty();

      return res.json({
        ...cand,
        createdEmployee: newEmp,
        createdChecklistItems,
        message: 'کارجو استخدام شد؛ پرونده پرسنلی و چک‌لیست آنبوردینگ به صورت خودکار ایجاد گردید. تکمیل حقوق پایه و کد ملی پیش از اولین فیش حقوقی الزامی است.',
      });
    }

    cand.stage = stage;
    dbStore.markDirty();
    res.json(cand);
  });

  app.patch('/api/candidates/:id/talent-pool', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { id } = req.params;
    const { inTalentPool, notes } = req.body;
    const cand = dbStore.candidates.find(c => c.id === id);
    if (!cand) return res.status(404).json({ error: 'کارجو یافت نشد' });
    if (typeof inTalentPool !== 'boolean') {
      return res.status(400).json({ error: 'وضعیت استخر استعداد نامعتبر است' });
    }
    cand.inTalentPool = inTalentPool;
    if (notes) cand.talentPoolNotes = notes;
    dbStore.markDirty();
    res.json(cand);
  });

  app.post('/api/candidates/:id/schedule-interview', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { id } = req.params;
    const { interviewJalali, interviewType, interviewNotes } = req.body;
    const cand = dbStore.candidates.find(c => c.id === id);
    if (!cand) return res.status(404).json({ error: 'کارجو یافت نشد' });
    if (!parseJalaliDateString(interviewJalali)) {
      return res.status(400).json({ error: 'تاریخ مصاحبه نامعتبر است (قالب معتبر: ۱۴۰۳/۰۶/۱۵)' });
    }
    cand.interviewJalali = interviewJalali;
    cand.interviewType = interviewType;
    cand.interviewNotes = interviewNotes;
    if (
      cand.stage === CandidateStage.INITIAL_SCREENING ||
      cand.stage === CandidateStage.PHONE_INTERVIEW
    ) {
      cand.stage = CandidateStage.IN_PERSON_INTERVIEW;
    }
    dbStore.markDirty();
    res.json(cand);
  });

  const extractCandidateNameFromFilename = (fileName: string, index: number): string => {
    let clean = fileName.replace(/\.(pdf|docx?|txt|rtf|zip)$/i, '');
    clean = clean.replace(/^(resume|cv|رزومه|سابقه|bio)[\s_\-]*/i, '');
    clean = clean.replace(/[-_]/g, ' ').trim();
    if (clean.length >= 3 && !/^\d+$/.test(clean)) return clean;
    return `متقاضی شماره ${index + 1}`;
  };

  async function runWithConcurrencyLimit<T, R>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const current = cursor++;
        results[current] = await worker(items[current], current);
      }
    });
    await Promise.all(runners);
    return results;
  }

  app.post('/api/candidates/bulk-upload', requireRole(UserRole.HR_DIRECTOR), async (req, res) => {
    try {
      const { jobId, files } = req.body;
      const targetJob = dbStore.jobs.find(j => j.id === jobId);
      if (!targetJob) {
        return res.status(400).json({ error: 'موقعیت شغلی هدف برای بارگذاری رزومه‌ها مشخص نیست' });
      }
      const incomingFiles: Array<{ name: string; size?: number; text?: string; sourceZip?: string }> =
        Array.isArray(files) ? files : [];
      if (incomingFiles.length === 0) {
        return res.status(400).json({
          error: 'هیچ فایل رزومه‌ای ارسال نشد',
          hint: 'حالت شبیه‌سازی (تولید کارجوی تصادفی بدون فایل واقعی) از سامانه حذف شده است. لطفاً فایل‌های واقعی رزومه را بارگذاری کنید.',
        });
      }

      const MIN_TEXT_LENGTH = 30;
      const hasText = (f: { text?: string }) => typeof f.text === 'string' && f.text.trim().length >= MIN_TEXT_LENGTH;
      const validFiles = incomingFiles.filter(hasText);
      const skipped = incomingFiles.filter(f => !hasText(f)).map(f => ({
        name: f.name,
        reason: 'متن رزومه استخراج نشد (فایل اسکن‌شده/تصویری یا بدون متن قابل‌خواندن) — بدون متن واقعی، امتیازی تولید نمی‌شود',
      }));

      if (validFiles.length === 0) {
        return res.status(400).json({
          error: 'هیچ متن قابل‌استخراجی از رزومه‌های ارسالی یافت نشد. لطفاً از فایل‌های PDF/Word متنی (نه اسکن تصویری) استفاده کنید.',
          skippedCount: skipped.length,
          skipped,
        });
      }

      const evalCriteria = targetJob.criteria || [];
      const evalScoringMethod = targetJob.scoringMethod || 'WEIGHTED_AVG';
      const evalAiRigor = targetJob.aiRigor || 'BALANCED';
      const evalInstructions = targetJob.evaluationInstructions;
      const evalPriority = targetJob.interviewPriorityThreshold ?? 7.0;
      const evalRejection = targetJob.initialRejectionThreshold ?? 5.0;

      const evaluations = await runWithConcurrencyLimit(validFiles, 5, async (file, i) => {
        const fullName = extractCandidateNameFromFilename(file.name, i);
        const result = await evaluateCandidateWithCriteria({
          jobTitle: targetJob.title,
          department: targetJob.department,
          candidateName: fullName,
          resumeText: file.text as string,
          criteria: evalCriteria,
          scoringMethod: evalScoringMethod,
          aiRigor: evalAiRigor,
          evaluationInstructions: evalInstructions,
          interviewPriorityThreshold: evalPriority,
          initialRejectionThreshold: evalRejection,
        });
        return { file, fullName, result };
      });

      const now = tehranNow();
      const newCandidatesBatch = evaluations.map(({ file, fullName, result }, i) => ({
        id: `cand-bulk-${Date.now()}-${i}`,
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        fullName,
        email: '',
        phone: '',
        resumeFileName: file.name,
        resumeText: file.text as string,
        overallScore: result.overallScore,
        category: result.category,
        stage: CandidateStage.INITIAL_SCREENING,
        strengths: result.strengths,
        weaknesses: result.weaknesses,
        resumeQuotes: result.resumeQuotes,
        criteriaScores: result.criteriaScores,
        criteriaFeedback: result.criteriaFeedback,
        executiveSummary: result.executiveSummary,
        aiAvailable: result.aiAvailable !== false,
        inTalentPool: result.category === CandidateCategory.INITIAL_REJECTION && result.overallScore >= 4.5,
        appliedAtJalali: now.jalaliString,
        sourceZip: file.sourceZip,
      }));

      const MAX_CANDIDATES = 1000;
      dbStore.candidates.unshift(...newCandidatesBatch);
      const overflow = dbStore.candidates.length - MAX_CANDIDATES;
      if (overflow > 0) {
        const bulkIdx: number[] = [];
        dbStore.candidates.forEach((c, idx) => {
          if (c.id.startsWith('cand-bulk-')) bulkIdx.push(idx);
        });
        bulkIdx.sort((a, b) => b - a);
        for (const idx of bulkIdx.slice(0, overflow)) {
          dbStore.candidates.splice(idx, 1);
        }
      }
      targetJob.applicationsCount += newCandidatesBatch.length;
      dbStore.markDirty();

      const usedLocalEngine = newCandidatesBatch.some(c => c.aiAvailable === false);
      res.json({
        success: true,
        processedCount: newCandidatesBatch.length,
        skippedCount: skipped.length,
        skipped,
        skippedFiles: skipped.map(x => x.name),
        aiAvailable: !usedLocalEngine,
        interviewPriorityCount: newCandidatesBatch.filter(c => c.category === CandidateCategory.INTERVIEW_PRIORITY).length,
        needsReviewCount: newCandidatesBatch.filter(c => c.category === CandidateCategory.NEEDS_REVIEW).length,
        initialRejectionCount: newCandidatesBatch.filter(c => c.category === CandidateCategory.INITIAL_REJECTION).length,
        sampleCandidates: newCandidatesBatch.slice(0, 5),
        candidates: newCandidatesBatch,
        message: usedLocalEngine
          ? `${toPersianDigits(newCandidatesBatch.length)} رزومه با موتور ارزیابی محلی (بدون Gemini) امتیازدهی و ثبت شد — نتایج با برچسب «موتور محلی» نمایش داده می‌شود. دسته‌بندی‌ها پیشنهادی است و مرحله هیچ کارجویی خودکار تغییر نکرد.`
          : `${toPersianDigits(newCandidatesBatch.length)} رزومه ارزیابی و ثبت شد. دسته‌بندی‌ها پیشنهادی است و مرحله هیچ کارجویی خودکار تغییر نکرد.`,
      });
    } catch (err: any) {
      console.error('Bulk resume screening error:', err);
      res.status(500).json({ error: 'خطا در پردازش و ارزیابی هوشمند رزومه‌ها', details: err?.message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, jobId, history } = req.body;
      if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'متن پیام خالی است' });
      }
      const agentResponse = await processAgentChat(String(message), jobId, Array.isArray(history) ? history : []);
      if ((agentResponse as any).mutatedStore) dbStore.markDirty();
      res.json(agentResponse);
    } catch (err: any) {
      console.error('Agent chat error:', err);
      res.status(500).json({ error: 'خطا در برقراری ارتباط با دستیار هوشمند استخدام' });
    }
  });

  app.get('/api/competitor/hirevue/submissions', (req, res) => {
    res.json(dbStore.videoSubmissions || []);
  });

  app.get('/api/competitor/hirevue/questions', (req, res) => {
    res.json(dbStore.videoQuestions || []);
  });

  app.post('/api/competitor/hirevue/evaluate-submission', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { candidateName, jobTitle, brand, simulatedTranscript } = req.body;
    const newSubmission = {
      id: `vis-${Date.now()}`,
      candidateId: `cand-${Date.now()}`,
      candidateName: candidateName || 'کارجوی متقاضی',
      jobId: 'job-1',
      jobTitle: jobTitle || 'کارشناس ارشد سازمان',
      brand: brand || 'هلدینگ سیلانه سبز',
      submittedAtJalali: `${tehranNow().jalaliString} - لحظاتی پیش`,
      status: 'COMPLETED' as const,
      overallScore: Math.floor(82 + Math.random() * 16),
      confidenceScore: Math.floor(80 + Math.random() * 18),
      clarityScore: Math.floor(85 + Math.random() * 14),
      fairnessAuditScore: 99,
      aiRecommendation: 'STRONG_RECOMMEND' as const,
      summaryInsight: 'تحلیل صوتی و متنی هوش مصنوعی: بیان مسلط، رعایت چارچوب پاسخگویی موثر، تمرکز بر صلاحیت‌های فنی و انطباق کامل با موازین جذب عادلانه و بدون تعصب.',
      answers: [
        {
          questionId: 'vq-new-1',
          questionText: 'پاسخ ارائه‌شده در شبیه‌ساز مصاحبه ویدیویی آنلاین هوش مصنوعی',
          videoDurationSeconds: 105,
          transcript: simulatedTranscript || 'من با تکیه بر تجربیات چندساله در مدیریت فرایندها و روحیه کار تیمی در خطوط تولید و ستاد، آمادگی ارتقای بهره‌وری در هلدینگ سیلانه سبز را دارم.',
          score: 9.1,
          sentiment: 'CONFIDENT' as const,
          aiFeedback: 'اعتمادبه‌نفس بالا در گفتار، رعایت ترتیب منطقی و اشاره به سنجه‌های ملموس عملکردی.',
          keyCompetencies: ['حل مسئله', 'ارتباطات حرفه‌ای', 'انگیزش شغلی'],
        },
      ],
    };
    dbStore.videoSubmissions.unshift(newSubmission);
    dbStore.markDirty();
    res.status(201).json(newSubmission);
  });

  app.get('/api/competitor/eightfold/skills', (req, res) => {
    res.json(dbStore.candidateSkillMatches);
  });

  app.get('/api/competitor/eightfold/internal-mobility', (req, res) => {
    res.json(dbStore.internalMobilityMatches);
  });

  app.get('/api/competitor/ziprecruiter/sourced-candidates', (req, res) => {
    res.json(dbStore.sourcedCandidates);
  });

  app.post('/api/competitor/ziprecruiter/invite', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { candidateId } = req.body;
    const target = dbStore.sourcedCandidates.find(c => c.id === candidateId);
    if (target) {
      target.status = 'INVITED';
      target.invitedAtJalali = `${tehranNow().jalaliString} - لحظاتی پیش`;
      dbStore.markDirty();
      res.json({ success: true, candidate: target });
    } else {
      res.status(404).json({ error: 'کارجوی سورس‌شده یافت نشد' });
    }
  });

  app.get('/api/competitor/ziprecruiter/syndication', (req, res) => {
    res.json(dbStore.syndicationChannels);
  });

  app.post('/api/competitor/ziprecruiter/toggle-syndication', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { channelId, status } = req.body;
    const channel = dbStore.syndicationChannels.find(c => c.id === channelId);
    if (channel) {
      channel.status = status;
      channel.lastSyncJalali = `${tehranNow().jalaliString} - لحظاتی پیش`;
      if (status === 'ACTIVE') {
        channel.impressionsCount += Math.floor(100 + Math.random() * 300);
      }
      dbStore.markDirty();
      res.json({ success: true, channel });
    } else {
      res.status(404).json({ error: 'کانال انتشار یافت نشد' });
    }
  });

  app.get('/api/competitor/ziprecruiter/knockout-questions', (req, res) => {
    res.json(dbStore.knockoutQuestions);
  });

  app.post('/api/competitor/ziprecruiter/knockout-questions', requireRole(...HR_AND_MANAGER), (req, res) => {
    if (!req.body.question || !String(req.body.question).trim()) {
      return res.status(400).json({ error: 'متن سوال حذفی الزامی است' });
    }
    const newKq = {
      id: `kq-${Date.now()}`,
      question: String(req.body.question).trim(),
      requiredAnswer: req.body.requiredAnswer ?? true,
      isDealBreaker: req.body.isDealBreaker ?? true,
      explanation: req.body.explanation || 'الزام فرآیندی کارخانجات سیلانه سبز',
    };
    dbStore.knockoutQuestions.push(newKq);
    dbStore.markDirty();
    res.status(201).json(newKq);
  });

  app.get('/api/departments', (req, res) => {
    res.json(dbStore.departments || []);
  });

  app.get('/api/departments/:id', (req, res) => {
    const dept = dbStore.departments.find(d => d.id === req.params.id);
    if (!dept) return res.status(404).json({ error: 'دپارتمان یافت نشد' });
    res.json(dept);
  });

  app.get('/api/automation/tasks', (req, res) => {
    res.json(dbStore.automationTasks || []);
  });

  app.post('/api/automation/run', requireRole(UserRole.HR_DIRECTOR), (req, res) => {
    const { taskId, confirm } = req.body;
    if (confirm !== true) {
      return res.status(400).json({
        error: 'اجرای اتوماسیون نیازمند تایید صریح کاربر است',
        hint: 'پس از نمایش دیالوگ تایید، درخواست را با confirm:true ارسال کنید.',
        requiresConfirmation: true,
      });
    }
    const task = dbStore.automationTasks.find(t => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'وظیفه اتوماسیون یافت نشد' });
    }

    const now = tehranNow();
    task.status = 'COMPLETED';
    task.lastRunJalali = `${now.jalaliString} - لحظاتی پیش`;
    task.successCount = (task.successCount || 0) + 1;

    let executionDetails = 'عملیات با موفقیت انجام شد';
    if (task.category === 'PAYROLL') {
      const drafts = dbStore.payrollSlips.filter(p => p.status === PayrollStatus.DRAFT);
      drafts.forEach(p => { p.status = PayrollStatus.FINALIZED; });
      executionDetails = drafts.length > 0
        ? `${toPersianDigits(drafts.length)} فیش پیش‌نویس دوره‌های موجود نهایی (FINALIZED) شد. فیش‌های پرداخت‌شده دست‌نخورده باقی ماندند.`
        : 'فیش پیش‌نویسی برای نهایی‌سازی وجود ندارد. ابتدا برای دوره موردنظر فیش تولید کنید.';
    } else if (task.category === 'SCREENING') {
      let moved = 0;
      for (const cand of dbStore.candidates) {
        if (typeof cand.overallScore !== 'number') continue;
        const job = dbStore.jobs.find(j => j.id === cand.jobId);
        const priority = job?.interviewPriorityThreshold ?? 7.0;
        const rejection = job?.initialRejectionThreshold ?? 5.0;
        const next = cand.overallScore >= priority
          ? CandidateCategory.INTERVIEW_PRIORITY
          : cand.overallScore < rejection
            ? CandidateCategory.INITIAL_REJECTION
            : CandidateCategory.NEEDS_REVIEW;
        if (cand.category !== next) {
          cand.category = next;
          moved++;
        }
      }
      executionDetails = `دسته‌بندی کارجویان دارای نمره ارزیابی‌شده بازبینی شد (${toPersianDigits(moved)} تغییر دسته). کارجویان بدون نمره واقعی بدون تغییر باقی ماندند و هیچ مرحله استخدامی به صورت خودکار جابه‌جا نشد.`;
    } else if (task.category === 'LEAVES') {
      const pending = dbStore.leaveRequests.filter(
        l => l.status === LeaveStatus.PENDING_HR || l.status === LeaveStatus.PENDING_MANAGER
      ).length;
      executionDetails = `گزارش مرخصی‌های معوقه تهیه شد: ${toPersianDigits(pending)} درخواست در انتظار بررسی. تایید مرخصی صرفاً از جریان کاری تایید مدیر واحد و منابع انسانی (با کنترل مانده مرخصی) امکان‌پذیر است و اتوماسیون هیچ درخواستی را تایید نکرد.`;
    }

    dbStore.markDirty();
    res.json({
      success: true,
      task,
      message: executionDetails,
    });
  });

  app.post('/api/ai/generate-job-ad', requireRole(...HR_AND_MANAGER), async (req, res) => {
    try {
      const result = await generateJobAd(req.body);
      res.json(result);
    } catch (err: any) {
      console.error('Job Ad generation error:', err);
      res.status(500).json({ error: 'خطا در تولید شرح شغل و آگهی هوشمند' });
    }
  });

  app.post('/api/ai/voice-assistant', async (req, res) => {
    try {
      const { command } = req.body;
      const result = await processVoiceCommand(command || '');
      res.json(result);
    } catch (err: any) {
      console.error('Voice assistant error:', err);
      res.status(500).json({ error: 'خطا در تحلیل دستور صوتی' });
    }
  });

  app.post('/api/candidates/compare', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { candidateIds } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length < 2) {
      return res.status(400).json({ error: 'برای مقایسه حداقل ۲ شناسه کارجو لازم است' });
    }
    const wanted = new Set(candidateIds.filter(id => typeof id === 'string'));
    const candidates = dbStore.candidates.filter(c => wanted.has(c.id));
    if (candidates.length < 2) {
      return res.status(400).json({ error: 'حداقل ۲ کارجوی معتبر برای مقایسه انتخاب کنید' });
    }

    const allCriteria = new Set<string>();
    candidates.forEach(c => {
      if (c.criteriaScores) {
        Object.keys(c.criteriaScores).forEach(crit => allCriteria.add(crit));
      }
    });

    const criteriaList = Array.from(allCriteria);
    const radarData = criteriaList.map(criterion => {
      const row: any = { criterion };
      candidates.forEach(c => {
        row[c.fullName] = c.criteriaScores && criterion in c.criteriaScores
          ? c.criteriaScores[criterion]
          : null;
      });
      return row;
    });

    res.json({
      candidates,
      criteriaList,
      radarData,
    });
  });

  app.post('/api/candidates/:id/draft-email', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { id } = req.params;
    const { type, subject, body } = req.body;
    const cand = dbStore.candidates.find(c => c.id === id);
    if (!cand) return res.status(404).json({ error: 'کارجو یافت نشد' });
    if (!['INVITATION', 'REJECTION'].includes(type)) {
      return res.status(400).json({ error: 'نوع ایمیل نامعتبر است (INVITATION/REJECTION)' });
    }

    cand.emailDraft = {
      type,
      subject,
      body,
      status: 'DRAFT_ONLY',
      createdAtJalali: tehranNow().jalaliString,
    };
    dbStore.markDirty();
    res.json({ success: true, emailDraft: cand.emailDraft });
  });

  app.get('/api/employees', (req, res) => {
    const role = currentRole();
    const list = employeesVisibleToCurrentRole();
    res.json(list.map(e =>
      canViewEmployeeFully(e) ? e : sanitizeEmployee(e, role, dbStore.sessionEmployeeId)
    ));
  });

  app.get('/api/employees/:id', (req, res) => {
    const emp = dbStore.employees.find(e => e.id === req.params.id);
    if (!emp) return res.status(404).json({ error: 'پرسنل یافت نشد' });
    const role = currentRole();
    if (role === UserRole.EMPLOYEE && emp.id !== dbStore.sessionEmployeeId) {
      return res.status(403).json({ error: 'مشاهده جزئیات پرونده سایر همکاران مجاز نیست' });
    }
    res.json(canViewEmployeeFully(emp) ? emp : sanitizeEmployee(emp, role, dbStore.sessionEmployeeId));
  });

  app.post('/api/employees', requireRole(UserRole.HR_DIRECTOR), async (req, res) => {
    const b = req.body || {};
    const fullName = String(b.fullName || '').trim();
    const nationalIdRaw = String(b.nationalId || '').trim();
    const email = String(b.email || '').trim();
    const phone = String(b.phone || '').trim();
    const department = String(b.department || '').trim();
    const jobTitle = String(b.jobTitle || '').trim();
    const baseSalary = Number(b.baseSalaryToman);

    if (!fullName) return res.status(400).json({ error: 'نام و نام خانوادگی الزامی است' });
    if (!isValidIranianNationalId(nationalIdRaw)) {
      return res.status(400).json({ error: 'کد ملی نامعتبر است (۱۰ رقم با رقم کنترلی صحیح)' });
    }
    if (dbStore.employees.some(e => e.nationalId.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))) === nationalIdRaw.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))) {
      return res.status(409).json({ error: 'پرسنلی با این کد ملی قبلاً ثبت شده است' });
    }
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'رایانامه سازمانی نامعتبر است' });
    if (dbStore.employees.some(e => e.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'پرسنلی با این رایانامه قبلاً ثبت شده است' });
    }
    if (!/^09\d{9}$/.test(phone)) return res.status(400).json({ error: 'شماره موبایل نامعتبر است (قالب: ۰۹۱۲۳۴۵۶۷۸۹)' });
    if (!department) return res.status(400).json({ error: 'دپارتمان الزامی است' });
    if (!jobTitle) return res.status(400).json({ error: 'عنوان شغلی الزامی است' });
    if (!Number.isFinite(baseSalary) || baseSalary < 0) {
      return res.status(400).json({ error: 'حقوق پایه باید عددی نامنفی باشد' });
    }
    if (!parseJalaliDateString(b.hireDateJalali)) {
      return res.status(400).json({ error: 'تاریخ استخدام نامعتبر است (قالب معتبر: ۱۴۰۳/۰۶/۱۵)' });
    }
    if (!['SINGLE', 'MARRIED'].includes(b.maritalStatus || 'SINGLE')) {
      return res.status(400).json({ error: 'وضعیت تاهل نامعتبر است' });
    }
    const childrenCount = Number(b.childrenCount || 0);
    if (!Number.isInteger(childrenCount) || childrenCount < 0 || childrenCount > 20) {
      return res.status(400).json({ error: 'تعداد فرزندان نامعتبر است' });
    }

    const existingCodes = new Set(dbStore.employees.map(e => e.personnelCode));
    let personnelCode = String(b.personnelCode || '').trim();
    if (personnelCode && existingCodes.has(personnelCode)) {
      return res.status(409).json({ error: 'کد پرسنلی تکراری است' });
    }
    if (!personnelCode) {
      do {
        personnelCode = toPersianDigits(`10${Math.floor(100 + Math.random() * 900)}`);
      } while (existingCodes.has(personnelCode));
    }

    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      personnelCode,
      nationalId: nationalIdRaw,
      fullName,
      fatherName: String(b.fatherName || '').trim() || undefined,
      birthDateJalali: String(b.birthDateJalali || '').trim(),
      phone,
      email,
      department,
      jobTitle,
      hireDateJalali: String(b.hireDateJalali).trim(),
      baseSalaryToman: baseSalary,
      maritalStatus: b.maritalStatus || 'SINGLE',
      childrenCount,
      bankIban: String(b.bankIban || '').trim(),
      directManagerId: b.directManagerId || undefined,
      status: 'ACTIVE',
      documents: [],
      jobHistories: [
        {
          id: `jh-${Date.now()}`,
          changeType: 'PROMOTION',
          previousTitle: '—',
          newTitle: jobTitle,
          effectiveDateJalali: String(b.hireDateJalali).trim(),
          description: 'شروع همکاری (ثبت پرونده پرسنلی)',
        },
      ],
      ssoContributionDays: Number(b.ssoContributionDays || 0),
      commuteAllowanceToman: Number(b.commuteAllowanceToman || 0),
    };
    dbStore.employees.push(newEmp);
    dbStore.markDirty();
    await dbStore.dbCreateEmployee(newEmp);
    res.status(201).json(newEmp);
  });

  app.patch('/api/employees/:id', requireRole(UserRole.HR_DIRECTOR), async (req, res) => {
    const emp = dbStore.employees.find(e => e.id === req.params.id);
    if (!emp) return res.status(404).json({ error: 'پرسنل یافت نشد' });
    const b = req.body || {};
    const now = tehranNow();

    const salaryChanged = b.baseSalaryToman !== undefined && Number(b.baseSalaryToman) !== emp.baseSalaryToman;
    const titleChanged = b.jobTitle !== undefined && String(b.jobTitle).trim() !== emp.jobTitle;
    const deptChanged = b.department !== undefined && String(b.department).trim() !== emp.department;

    if (b.baseSalaryToman !== undefined) {
      const v = Number(b.baseSalaryToman);
      if (!Number.isFinite(v) || v < 0) return res.status(400).json({ error: 'حقوق پایه نامعتبر است' });
    }
    if (b.status !== undefined && !['ACTIVE', 'RESIGNED', 'ON_LEAVE'].includes(b.status)) {
      return res.status(400).json({ error: 'وضعیت اشتغال نامعتبر است' });
    }
    if (b.childrenCount !== undefined) {
      const v = Number(b.childrenCount);
      if (!Number.isInteger(v) || v < 0 || v > 20) return res.status(400).json({ error: 'تعداد فرزندان نامعتبر است' });
    }
    if (b.maritalStatus !== undefined && !['SINGLE', 'MARRIED'].includes(b.maritalStatus)) {
      return res.status(400).json({ error: 'وضعیت تاهل نامعتبر است' });
    }
    if (b.nationalId !== undefined && !isValidIranianNationalId(String(b.nationalId))) {
      return res.status(400).json({ error: 'کد ملی نامعتبر است' });
    }

    let newJobHistory: JobHistoryItem | undefined;
    if (salaryChanged || titleChanged || deptChanged) {
      emp.jobHistories = emp.jobHistories || [];
      newJobHistory = {
        id: `jh-${Date.now()}`,
        changeType: salaryChanged && !titleChanged && !deptChanged ? 'SALARY_CHANGE' : titleChanged ? 'PROMOTION' : 'TRANSFER',
        previousTitle: `${emp.jobTitle} — ${toPersianDigits(emp.baseSalaryToman)} تومان`,
        newTitle: `${String(b.jobTitle ?? emp.jobTitle).trim()} — ${toPersianDigits(Number(b.baseSalaryToman ?? emp.baseSalaryToman))} تومان`,
        effectiveDateJalali: now.jalaliString,
        description: deptChanged ? `انتقال به ${String(b.department).trim()}` : 'تغییر ثبت‌شده توسط منابع انسانی',
      };
      emp.jobHistories.push(newJobHistory);
    }

    const editable = [
      'fullName', 'fatherName', 'birthDateJalali', 'phone', 'email', 'department',
      'jobTitle', 'baseSalaryToman', 'maritalStatus', 'childrenCount', 'bankIban',
      'directManagerId', 'status', 'ssoContributionDays', 'commuteAllowanceToman',
    ] as const;
    const patch: Record<string, unknown> = {};
    for (const key of editable) {
      if (b[key] !== undefined) {
        const value = typeof b[key] === 'string' ? b[key].trim() : b[key];
        (emp as any)[key] = value;
        patch[key] = value;
      }
    }
    if (b.hireDateJalali !== undefined) {
      if (!parseJalaliDateString(b.hireDateJalali)) return res.status(400).json({ error: 'تاریخ استخدام نامعتبر است' });
      emp.hireDateJalali = String(b.hireDateJalali).trim();
      patch.hireDateJalali = emp.hireDateJalali;
    }

    dbStore.markDirty();
    await dbStore.dbUpdateEmployee(emp.id, patch, newJobHistory);
    res.json(emp);
  });

  app.delete('/api/employees/:id', requireRole(UserRole.HR_DIRECTOR), async (req, res) => {
    const idx = dbStore.employees.findIndex(e => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'پرسنل یافت نشد' });
    const id = req.params.id;
    const hasSlips = dbStore.payrollSlips.some(p => p.employeeId === id);
    const hasAttendance = dbStore.attendances.some(a => a.employeeId === id);
    const hasLeaves = dbStore.leaveRequests.some(l => l.employeeId === id);
    if (hasSlips || hasAttendance || hasLeaves) {
      return res.status(409).json({
        error: 'پرونده پرسنلی دارای سوابق حقوقی/تردد/مرخصی است و طبق الزامات قانونی قابل حذف نیست',
        suggestion: 'برای پایان همکاری، وضعیت پرسنل را به RESIGNED تغییر دهید (PATCH /api/employees/:id).',
      });
    }
    dbStore.employees.splice(idx, 1);
    dbStore.checklistItems = dbStore.checklistItems.filter(c => c.employeeId !== id);
    dbStore.markDirty();
    await dbStore.dbDeleteEmployee(id);
    res.json({ success: true, deletedId: id });
  });

  app.get('/api/attendance', (req, res) => {
    const role = currentRole();
    let list = dbStore.attendances;
    if (role === UserRole.EMPLOYEE) {
      list = list.filter(a => a.employeeId === dbStore.sessionEmployeeId);
    } else if (role === UserRole.DEPT_MANAGER) {
      const visible = new Set(employeesVisibleToCurrentRole().map(e => e.id));
      list = list.filter(a => visible.has(a.employeeId));
    }
    res.json(list);
  });

  app.post('/api/attendance/check-in-out', (req, res) => {
    const { employeeId, type } = req.body;
    if (type !== 'CHECK_IN' && type !== 'CHECK_OUT') {
      return res.status(400).json({ error: 'نوع تردد نامعتبر است' });
    }

    const role = currentRole();
    let targetId: string;
    if (role === UserRole.EMPLOYEE || role === UserRole.DEPT_MANAGER) {
      targetId = dbStore.sessionEmployeeId;
      if (employeeId && employeeId !== targetId) {
        return res.status(403).json({ error: 'ثبت تردد فقط برای خود کاربر مجاز است' });
      }
    } else {
      targetId = employeeId || dbStore.sessionEmployeeId;
    }

    const emp = dbStore.employees.find(e => e.id === targetId);
    if (!emp) {
      return res.status(404).json({ error: 'پرسنل یافت نشد' });
    }

    const now = tehranNow();
    const todayJalali = now.jalaliString;
    const timeStr = now.timeStr;
    const nowMinutes = now.minutes;

    const SHIFT_START_MINUTES = 8 * 60;
    const SHIFT_END_MINUTES = 17 * 60;

    let record = dbStore.attendances.find(a => a.employeeId === emp.id && a.dateJalali === todayJalali);
    if (!record) {
      record = {
        id: `att-${Date.now()}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        dateJalali: todayJalali,
        delayMinutes: 0,
        overtimeHours: 0,
        status: 'PRESENT',
      };
      dbStore.attendances.unshift(record);
    }

    if (type === 'CHECK_IN') {
      if (record.checkIn) {
        return res.json({ ...record, notice: 'ورود امروز قبلاً ثبت شده است' });
      }
      record.checkIn = timeStr;
      record.delayMinutes = Math.max(0, nowMinutes - SHIFT_START_MINUTES);
    } else {
      if (record.checkOut) {
        return res.json({ ...record, notice: 'خروج امروز قبلاً ثبت شده است' });
      }
      record.checkOut = timeStr;
      record.overtimeHours = Math.max(0, Math.round(((nowMinutes - SHIFT_END_MINUTES) / 60) * 10) / 10);
      record.earlyLeaveMinutes = record.overtimeHours > 0
        ? 0
        : Math.max(0, SHIFT_END_MINUTES - nowMinutes);
    }

    dbStore.markDirty();
    res.json(record);
  });

  app.get('/api/leave/requests', (req, res) => {
    const role = currentRole();
    let list = dbStore.leaveRequests;
    if (role === UserRole.EMPLOYEE) {
      list = list.filter(l => l.employeeId === dbStore.sessionEmployeeId);
    } else if (role === UserRole.DEPT_MANAGER) {
      const visible = new Set(employeesVisibleToCurrentRole().map(e => e.id));
      list = list.filter(l => visible.has(l.employeeId));
    }
    res.json(list);
  });

  app.get('/api/leave/balances', (req, res) => {
    const role = currentRole();
    const scope = employeesVisibleToCurrentRole();
    const balances = computeAllLeaveBalances(scope, dbStore.leaveRequests, tehranNow().jalali);
    if (role === UserRole.EMPLOYEE) {
      return res.json(balances.filter(b => b.employeeId === dbStore.sessionEmployeeId));
    }
    res.json(balances);
  });

  app.post('/api/leave/requests', (req, res) => {
    const { employeeId, leaveType, startDateJalali, endDateJalali, daysCount, reason } = req.body;
    const role = currentRole();

    if (!Object.values(LeaveType).includes(leaveType)) {
      return res.status(400).json({ error: 'نوع مرخصی نامعتبر است' });
    }

    let emp: Employee | undefined;
    if (role === UserRole.HR_DIRECTOR) {
      emp = dbStore.employees.find(e => e.id === employeeId) || sessionEmployee();
      if (employeeId && !dbStore.employees.some(e => e.id === employeeId)) {
        return res.status(404).json({ error: 'پرسنل مورد نظر یافت نشد' });
      }
    } else {
      emp = sessionEmployee();
      if (employeeId && employeeId !== dbStore.sessionEmployeeId) {
        return res.status(403).json({ error: 'ثبت مرخصی فقط برای خود کاربر مجاز است' });
      }
    }
    if (!emp) {
      return res.status(404).json({ error: 'پرسنل یافت نشد' });
    }

    const validation = validateLeaveRequest(
      emp,
      leaveType as LeaveType,
      startDateJalali,
      endDateJalali,
      daysCount,
      dbStore.leaveRequests,
      tehranNow().jalali
    );
    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      leaveType: leaveType as LeaveType,
      startDateJalali,
      endDateJalali,
      daysCount: validation.daysCount!,
      reason: String(reason || '').trim() || 'امور شخصی',
      status: LeaveStatus.PENDING_MANAGER,
      createdAtJalali: tehranNow().jalaliString,
    } as LeaveRequest;
    dbStore.leaveRequests.unshift(newLeave);
    dbStore.markDirty();
    res.status(201).json({
      ...newLeave,
      balance: computeLeaveBalance(emp, dbStore.leaveRequests, tehranNow().jalali),
    });
  });

  app.patch('/api/leave/requests/:id/approve', (req, res) => {
    const { id } = req.params;
    const { approved, comment } = req.body;
    const role = currentRole();
    const reqItem = dbStore.leaveRequests.find(l => l.id === id);
    if (!reqItem) return res.status(404).json({ error: 'درخواست مرخصی یافت نشد' });
    if (typeof approved !== 'boolean') {
      return res.status(400).json({ error: 'نتیجه بررسی نامشخص است' });
    }
    if (reqItem.status === LeaveStatus.APPROVED || reqItem.status === LeaveStatus.REJECTED) {
      return res.status(409).json({ error: 'این درخواست قبلاً تعیین تکلیف شده است' });
    }

    if (role === UserRole.DEPT_MANAGER) {
      const emp = dbStore.employees.find(e => e.id === reqItem.employeeId);
      const dept = managerDepartment();
      if (!emp || !dept || emp.department !== dept) {
        return res.status(403).json({ error: 'این درخواست مربوط به واحد شما نیست' });
      }
    }

    const becomesApproved = approved === true;
    const quotaTypes = [LeaveType.ANNUAL, LeaveType.HOURLY];

    if (becomesApproved && quotaTypes.includes(reqItem.leaveType)) {
      const emp = dbStore.employees.find(e => e.id === reqItem.employeeId);
      if (emp) {
        const others = dbStore.leaveRequests.filter(l => l.id !== reqItem.id);
        const balance = computeLeaveBalance(emp, others, tehranNow().jalali);
        const start = parseJalaliDateString(reqItem.startDateJalali);
        const yearBal = start ? balance.years[start.year] : undefined;
        const remaining = yearBal ? yearBal.remainingDays : balance.remainingNow;
        if (reqItem.daysCount > remaining) {
          return res.status(409).json({
            error: `مانده مرخصی استحقاقی ${emp.fullName} (${toPersianDigits(remaining)} روز کاری) کفاف این درخواست (${toPersianDigits(reqItem.daysCount)} روز) را نمی‌دهد`,
            hint: 'درخواست را رد کنید یا از متقاضی بخواهید مرخصی بدون حقوق ثبت کند.',
            balance,
          });
        }
      }
    }

    if (role === UserRole.DEPT_MANAGER) {
      if (reqItem.status !== LeaveStatus.PENDING_MANAGER) {
        return res.status(403).json({ error: 'این درخواست در مرحله تایید مدیر واحد نیست' });
      }
      reqItem.managerApproved = approved;
      reqItem.managerComment = comment;
      reqItem.status = approved ? LeaveStatus.PENDING_HR : LeaveStatus.REJECTED;
    } else if (role === UserRole.HR_DIRECTOR) {
      if (reqItem.status === LeaveStatus.PENDING_HR) {
        reqItem.hrApproved = approved;
        reqItem.hrComment = comment;
        reqItem.status = approved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
      } else if (reqItem.status === LeaveStatus.PENDING_MANAGER) {
        reqItem.managerApproved = approved;
        reqItem.managerComment = comment ?? 'تایید مستقیم منابع انسانی';
        reqItem.hrApproved = approved;
        reqItem.hrComment = comment;
        reqItem.status = approved ? LeaveStatus.APPROVED : LeaveStatus.REJECTED;
      } else {
        return res.status(403).json({ error: 'این درخواست قابل بررسی نیست' });
      }
    } else {
      return res.status(403).json({ error: 'شما اجازه تایید مرخصی ندارید' });
    }

    dbStore.markDirty();
    const emp = dbStore.employees.find(e => e.id === reqItem.employeeId);
    res.json({
      ...reqItem,
      balance: emp ? computeLeaveBalance(emp, dbStore.leaveRequests, tehranNow().jalali) : undefined,
    });
  });

  app.get('/api/payroll/slips', (req, res) => {
    const role = currentRole();
    let list = dbStore.payrollSlips;
    if (role === UserRole.EMPLOYEE || role === UserRole.DEPT_MANAGER) {
      list = list.filter(p => p.employeeId === dbStore.sessionEmployeeId);
    } else if (req.query.employeeId) {
      list = list.filter(p => p.employeeId === req.query.employeeId);
    }
    res.json(list);
  });

  app.get('/api/payroll/years', (req, res) => {
    const now = tehranNow();
    res.json({
      availableYears: STATUTORY_YEARS,
      currentYearJalali: now.jalali.year,
      currentMonthJalali: now.jalali.month,
    });
  });

  app.get('/api/payroll/statutory/:year', requireRole(...HR_AND_MANAGER), (req, res) => {
    const cfg = getStatutoryConfig(Number(req.params.year));
    if (!cfg) {
      return res.status(404).json({
        error: `بخشنامه دستمزد سال ${req.params.year} در سامانه ثبت نشده است`,
        availableYears: STATUTORY_YEARS,
      });
    }
    res.json(cfg);
  });

  app.post('/api/payroll/generate', requireRole(UserRole.HR_DIRECTOR), (req, res) => {
    const monthJalali = Number(req.body?.monthJalali);
    const yearJalali = Number(req.body?.yearJalali);
    const force = req.body?.force === true;

    if (!Number.isInteger(monthJalali) || monthJalali < 1 || monthJalali > 12) {
      return res.status(400).json({ error: 'ماه شمسی نامعتبر است (۱ تا ۱۲)' });
    }
    const cfg = getStatutoryConfig(yearJalali);
    if (!cfg) {
      return res.status(400).json({
        error: `بخشنامه دستمزد و مالیات سال ${toPersianDigits(yearJalali)} در سامانه ثبت نشده است — امکان محاسبه قانونی وجود ندارد`,
        availableYears: STATUTORY_YEARS.map(y => toPersianDigits(y)),
        hint: 'پس از انتشار بخشنامه سال جدید، پیکربندی آن در server/statutory.ts افزوده شود.',
      });
    }

    const periodSlips = dbStore.payrollSlips.filter(
      p => p.yearJalali === yearJalali && p.monthJalali === monthJalali
    );
    const paidSlips = periodSlips.filter(p => p.status === PayrollStatus.PAID);
    const finalizedSlips = periodSlips.filter(p => p.status === PayrollStatus.FINALIZED);
    if (paidSlips.length > 0 && paidSlips.length === periodSlips.length) {
      return res.status(409).json({
        error: `دوره ${toPersianDigits(yearJalali)}/${toPersianDigits(monthJalali)} کاملاً پرداخت‌شده و قفل است`,
        locked: true,
      });
    }
    if (finalizedSlips.length > 0 && !force) {
      return res.status(409).json({
        error: `${toPersianDigits(finalizedSlips.length)} فیش این دوره FINALIZED است — بازتولید نیازمند تایید صریح (force:true) است`,
        requiresForce: true,
        finalizedCount: finalizedSlips.length,
        paidCount: paidSlips.length,
      });
    }

    const result = generatePayrollSlips(
      dbStore.employees,
      cfg,
      yearJalali,
      monthJalali,
      dbStore.leaveRequests,
      dbStore.attendances,
      dbStore.payrollSlips
    );

    const paidKeys = new Set(paidSlips.map(sl => `${sl.employeeId}-${sl.yearJalali}-${sl.monthJalali}`));
    const generatedKeys = new Set(result.slips.map(sl => `${sl.employeeId}-${sl.yearJalali}-${sl.monthJalali}`));
    const keepOtherPeriods = dbStore.payrollSlips.filter(
      sl => !(sl.yearJalali === yearJalali && sl.monthJalali === monthJalali)
    );
    dbStore.payrollSlips = [
      ...keepOtherPeriods,
      ...paidSlips,
      ...result.slips.filter(sl => !paidKeys.has(`${sl.employeeId}-${sl.yearJalali}-${sl.monthJalali}`)),
    ];
    dbStore.markDirty();

    res.json({
      success: true,
      count: result.slips.length,
      slips: result.slips,
      skipped: result.skipped,
      protectedPaidCount: paidSlips.length,
      generatedKeys: generatedKeys.size,
      message: `${toPersianDigits(result.slips.length)} فیش پیش‌نویس (DRAFT) برای ${toPersianDigits(yearJalali)}/${toPersianDigits(monthJalali)} بر مبنای ${cfg.sourceNote} تولید شد.`,
    });
  });

  app.post('/api/payroll/finalize', requireRole(UserRole.HR_DIRECTOR), (req, res) => {
    const { yearJalali, monthJalali, slipIds } = req.body || {};
    let targets = dbStore.payrollSlips;
    if (Array.isArray(slipIds) && slipIds.length > 0) {
      targets = targets.filter(p => slipIds.includes(p.id));
    } else {
      const y = Number(yearJalali), m = Number(monthJalali);
      if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
        return res.status(400).json({ error: 'دوره (سال و ماه شمسی) یا شناسه فیش‌ها الزامی است' });
      }
      targets = targets.filter(p => p.yearJalali === y && p.monthJalali === m);
    }
    const drafts = targets.filter(p => p.status === PayrollStatus.DRAFT);
    if (drafts.length === 0) {
      return res.status(409).json({ error: 'فیش پیش‌نویسی در این محدوده یافت نشد' });
    }
    drafts.forEach(p => { p.status = PayrollStatus.FINALIZED; });
    dbStore.markDirty();
    res.json({
      success: true,
      finalizedCount: drafts.length,
      slips: drafts,
      message: `${toPersianDigits(drafts.length)} فیش نهایی (FINALIZED) شد.`,
    });
  });

  app.post('/api/payroll/mark-paid', requireRole(UserRole.HR_DIRECTOR), (req, res) => {
    const { yearJalali, monthJalali, slipIds } = req.body || {};
    let targets = dbStore.payrollSlips;
    if (Array.isArray(slipIds) && slipIds.length > 0) {
      targets = targets.filter(p => slipIds.includes(p.id));
    } else {
      const y = Number(yearJalali), m = Number(monthJalali);
      if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
        return res.status(400).json({ error: 'دوره (سال و ماه شمسی) یا شناسه فیش‌ها الزامی است' });
      }
      targets = targets.filter(p => p.yearJalali === y && p.monthJalali === m);
    }
    const finalized = targets.filter(p => p.status === PayrollStatus.FINALIZED);
    const drafts = targets.filter(p => p.status === PayrollStatus.DRAFT);
    if (finalized.length === 0) {
      return res.status(409).json({
        error: drafts.length > 0
          ? 'فیش‌های این دوره هنوز پیش‌نویس هستند — ابتدا نهایی (FINALIZE) کنید'
          : 'فیش قابل پرداختی در این محدوده یافت نشد',
      });
    }
    const now = tehranNow();
    finalized.forEach(p => {
      p.status = PayrollStatus.PAID;
      p.paidAtJalali = now.jalaliString;
    });
    dbStore.markDirty();
    res.json({
      success: true,
      paidCount: finalized.length,
      slips: finalized,
      message: `${toPersianDigits(finalized.length)} فیش به عنوان پرداخت‌شده ثبت شد (${now.jalaliString}). این دوره اکنون قفل است.`,
    });
  });

  app.get('/api/performance/goals', (req, res) => {
    const role = currentRole();
    let list = dbStore.performanceGoals;
    if (role === UserRole.EMPLOYEE) {
      list = list.filter(g => g.employeeId === dbStore.sessionEmployeeId);
    } else if (role === UserRole.DEPT_MANAGER) {
      const visible = new Set(employeesVisibleToCurrentRole().map(e => e.id));
      list = list.filter(g => visible.has(g.employeeId));
    }
    res.json(list);
  });

  app.post('/api/performance/goals', requireRole(...HR_AND_MANAGER), (req, res) => {
    const b = req.body || {};
    const emp = dbStore.employees.find(e => e.id === b.employeeId);
    if (!emp) return res.status(400).json({ error: 'پرسنل هدف یافت نشد' });
    const title = String(b.title || '').trim();
    if (!title) return res.status(400).json({ error: 'عنوان هدف الزامی است' });
    const weight = Number(b.weight ?? 20);
    if (!Number.isFinite(weight) || weight < 1 || weight > 100) {
      return res.status(400).json({ error: 'وزن هدف باید بین ۱ تا ۱۰۰ باشد' });
    }
    const progress = Number(b.currentProgress ?? 0);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) {
      return res.status(400).json({ error: 'پیشرفت هدف باید بین ۰ تا ۱۰۰ باشد' });
    }
    if (b.deadlineJalali && !parseJalaliDateString(b.deadlineJalali)) {
      return res.status(400).json({ error: 'تاریخ سررسید نامعتبر است (قالب معتبر: ۱۴۰۳/۰۸/۳۰)' });
    }
    const newGoal = {
      id: `goal-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.fullName,
      title,
      targetMetric: String(b.targetMetric || '').trim() || 'تحقق ۱۰۰٪ تارگت',
      currentProgress: Math.round(progress),
      weight: Math.round(weight),
      deadlineJalali: b.deadlineJalali || formatJalaliDate(addJalaliDays(tehranNow().jalali, 90), true),
    };
    dbStore.performanceGoals.unshift(newGoal);
    dbStore.markDirty();
    res.status(201).json(newGoal);
  });

  app.patch('/api/performance/goals/:id', (req, res) => {
    const { id } = req.params;
    const goal = dbStore.performanceGoals.find(g => g.id === id);
    if (!goal) return res.status(404).json({ error: 'هدف یافت نشد' });

    const role = currentRole();
    if (role === UserRole.EMPLOYEE && goal.employeeId !== dbStore.sessionEmployeeId) {
      return res.status(403).json({ error: 'فقط اهداف خود کاربر قابل بروزرسانی است' });
    }
    if (role === UserRole.DEPT_MANAGER) {
      const emp = dbStore.employees.find(e => e.id === goal.employeeId);
      const dept = managerDepartment();
      if (!emp || (emp.department !== dept && goal.employeeId !== dbStore.sessionEmployeeId)) {
        return res.status(403).json({ error: 'این هدف مربوط به واحد شما نیست' });
      }
    }

    if (req.body.currentProgress !== undefined) {
      const p = Number(req.body.currentProgress);
      if (!Number.isFinite(p) || p < 0 || p > 100) {
        return res.status(400).json({ error: 'پیشرفت هدف باید بین ۰ تا ۱۰۰ باشد' });
      }
      goal.currentProgress = Math.round(p);
    }
    dbStore.markDirty();
    res.json(goal);
  });

  app.get('/api/training/courses', (req, res) => {
    res.json(dbStore.trainingCourses);
  });

  app.get('/api/training/skill-matrix', (req, res) => {
    res.json(dbStore.skillMatrix);
  });

  app.post('/api/training/enroll', (req, res) => {
    const { courseId, employeeId } = req.body || {};
    const course = dbStore.trainingCourses.find(c => c.id === courseId);
    if (!course) return res.status(404).json({ error: 'دوره آموزشی یافت نشد' });

    const role = currentRole();
    let targetId: string;
    if (role === UserRole.HR_DIRECTOR) {
      targetId = employeeId || dbStore.sessionEmployeeId;
    } else {
      targetId = dbStore.sessionEmployeeId;
      if (employeeId && employeeId !== targetId) {
        return res.status(403).json({ error: 'ثبت‌نام فقط برای خود کاربر مجاز است' });
      }
    }
    const emp = dbStore.employees.find(e => e.id === targetId);
    if (!emp) return res.status(404).json({ error: 'پرسنل یافت نشد' });

    if (dbStore.trainingEnrollments.some(en => en.courseId === courseId && en.employeeId === targetId)) {
      return res.status(409).json({ error: 'این کاربر قبلاً در این دوره ثبت‌نام شده است' });
    }

    const enrollment = {
      id: `enr-${Date.now()}`,
      courseId,
      employeeId: targetId,
      employeeName: emp.fullName,
      enrolledAtJalali: tehranNow().jalaliString,
      status: 'ENROLLED' as const,
    };
    dbStore.trainingEnrollments.push(enrollment);
    dbStore.markDirty();
    res.status(201).json(enrollment);
  });

  app.get('/api/training/enrollments', (req, res) => {
    const role = currentRole();
    let list = dbStore.trainingEnrollments;
    if (role !== UserRole.HR_DIRECTOR) {
      list = list.filter(en => en.employeeId === dbStore.sessionEmployeeId);
    }
    res.json(list);
  });

  app.get('/api/checklists', (req, res) => {
    const role = currentRole();
    let list = dbStore.checklistItems;
    if (role === UserRole.EMPLOYEE) {
      list = list.filter(c => c.employeeId === dbStore.sessionEmployeeId);
    }
    res.json(list);
  });

  app.patch('/api/checklists/:id/toggle', requireRole(...HR_AND_MANAGER), (req, res) => {
    const { id } = req.params;
    const item = dbStore.checklistItems.find(c => c.id === id);
    if (!item) return res.status(404).json({ error: 'آیتم چک‌لیست یافت نشد' });
    item.isCompleted = !item.isCompleted;
    item.completedAtJalali = item.isCompleted ? tehranNow().jalaliString : undefined;
    dbStore.markDirty();
    res.json(item);
  });

  app.get('/api/analytics/metrics', (req, res) => {
    const active = dbStore.employees.filter(e => e.status === 'ACTIVE');
    const resigned = dbStore.employees.filter(e => e.status === 'RESIGNED');
    const openPositions = dbStore.jobs.filter(j => j.status === 'ACTIVE');
    const pendingLeaves = dbStore.leaveRequests.filter(
      l => l.status === LeaveStatus.PENDING_HR || l.status === LeaveStatus.PENDING_MANAGER
    );

    const periods = new Map<string, number>();
    for (const sl of dbStore.payrollSlips) {
      const key = `${sl.yearJalali}-${sl.monthJalali}`;
      periods.set(key, (periods.get(key) || 0) + (sl.grossSalaryToman || 0));
    }
    const lastPeriodTotal = periods.size > 0
      ? Array.from(periods.entries()).sort((a, b) => b[0].localeCompare(a[0]))[0][1]
      : dbStore.metrics.monthlyPayrollTotalToman;

    const hiredCandidates = dbStore.candidates.filter(c => c.stage === CandidateStage.HIRED).length;
    const totalCandidates = dbStore.candidates.length;

    const isHRViewer = isHR();
    res.json({
      turnoverRatePct: dbStore.employees.length > 0
        ? +((resigned.length / dbStore.employees.length) * 100).toFixed(1)
        : 0,
      averageTimeToHireDays: isHRViewer ? dbStore.metrics.averageTimeToHireDays : null,
      costPerHireToman: isHRViewer ? dbStore.metrics.costPerHireToman : null,
      activeHeadcount: active.length,
      openPositionsCount: openPositions.length,
      pendingLeavesCount: pendingLeaves.length,
      monthlyPayrollTotalToman: isHRViewer ? lastPeriodTotal : null,
      hiredCandidatesCount: hiredCandidates,
      totalCandidatesCount: totalCandidates,
      totalEmployeesEver: dbStore.employees.length,
      computed: true,
      computedAtJalali: tehranNow().jalaliString,
    });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'مسیر API یافت نشد' });
  });

  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API error:', err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: 'خطای داخلی سرور' });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await dbStore.initEmployeesFromDb();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`سامانه منابع انسانی کارا بر روی پورت ${PORT} آماده به کار است.`);
    console.log(`تاریخ جاری سامانه (تهران): ${tehranNow().jalaliString}`);
  });
}

startServer();
