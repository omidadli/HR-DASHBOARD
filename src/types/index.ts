/**
 * Shared Type Definitions for Iranian HRMS (سامانه جامع منابع انسانی سیلانه سبز)
 * Designed for full monorepo reusability (Web App + React Native / Expo Mobile APK)
 */

export enum UserRole {
  HR_DIRECTOR = 'HR_DIRECTOR',       // مدیر ارشد منابع انسانی
  DEPT_MANAGER = 'DEPT_MANAGER',     // مدیر واحد
  EMPLOYEE = 'EMPLOYEE'              // کارمند
}

export enum CandidateStage {
  INITIAL_SCREENING = 'INITIAL_SCREENING',     // بررسی اولیه
  PHONE_INTERVIEW = 'PHONE_INTERVIEW',         // مصاحبه تلفنی
  IN_PERSON_INTERVIEW = 'IN_PERSON_INTERVIEW', // مصاحبه حضوری / فنی
  OFFER = 'OFFER',                             // پیشنهاد همکاری
  HIRED = 'HIRED',                             // استخدام شده
  REJECTED = 'REJECTED'                        // رد شده
}

export enum CandidateCategory {
  INTERVIEW_PRIORITY = 'INTERVIEW_PRIORITY', // اولویت مصاحبه (نمره بالای ۷)
  NEEDS_REVIEW = 'NEEDS_REVIEW',             // نیازمند بررسی مدیر (نمره ۵ تا ۷)
  INITIAL_REJECTION = 'INITIAL_REJECTION'    // رد اولیه (نمره زیر ۵)
}

export enum LeaveType {
  ANNUAL = 'ANNUAL',       // مرخصی استحقاقی (۲۶ روز کاری سالانه)
  SICK = 'SICK',           // مرخصی استعلاجی
  HOURLY = 'HOURLY',       // مرخصی ساعتی
  UNPAID = 'UNPAID',       // مرخصی بدون حقوق
  MARRIAGE = 'MARRIAGE',   // مرخصی ازدواج (۳ روز)
  MATERNITY = 'MATERNITY'  // مرخصی زایمان
}

export enum LeaveStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_HR = 'PENDING_HR',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  FINALIZED = 'FINALIZED',
  PAID = 'PAID'
}

// ---------------- Module 1 Types ----------------
export type ScoringMethod = 'WEIGHTED_AVG' | 'THRESHOLD_VETO' | 'GEOMETRIC_MEAN';
export type AIRigor = 'STRICT' | 'BALANCED' | 'LENIENT';

export interface JobCriteria {
  id: string;
  title: string;
  weight: number; // 1 to 100
  description?: string;
  thresholdScore?: number; // Minimum passing score out of 10
  isMandatory?: boolean; // If true and score < thresholdScore in THRESHOLD_VETO mode, triggers veto
}

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  description: string;
  requirements: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  criteria: JobCriteria[];
  createdAtJalali: string;
  applicationsCount: number;
  scoringMethod?: ScoringMethod;
  aiRigor?: AIRigor;
  interviewPriorityThreshold?: number;
  initialRejectionThreshold?: number;
  evaluationInstructions?: string;
}

export interface EmailDraft {
  type: 'INVITATION' | 'REJECTION';
  subject: string;
  body: string;
  status: 'DRAFT_ONLY'; // Must NEVER auto send
  createdAtJalali: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  jobTitle?: string;
  fullName: string;
  email: string;
  phone: string;
  resumeFileName: string;
  resumeText: string;
  overallScore?: number; // 1 to 10
  category?: CandidateCategory;
  stage: CandidateStage;
  strengths: string[];
  weaknesses: string[];
  resumeQuotes: string[];
  criteriaScores?: Record<string, number>; // Criteria title -> score (1-10)
  criteriaFeedback?: Record<string, string>; // Criteria title -> AI justification text
  executiveSummary?: string; // AI-generated summary of the evaluation
  inTalentPool: boolean;
  talentPoolNotes?: string;
  scheduledInterview?: string;
  interviewJalali?: string;
  interviewType?: string;
  interviewNotes?: string;
  emailDraft?: EmailDraft;
  appliedAtJalali: string;
}

// ---------------- Module 2 Types ----------------
export interface EmployeeDocument {
  id: string;
  title: string;
  fileType: string;
  fileUrl: string;
  uploadedAtJalali: string;
}

export interface JobHistoryItem {
  id: string;
  changeType: 'PROMOTION' | 'TRANSFER' | 'SALARY_CHANGE';
  previousTitle: string;
  newTitle: string;
  effectiveDateJalali: string;
  description: string;
}

export interface Employee {
  id: string;
  personnelCode: string;
  nationalId: string;
  fullName: string;
  fatherName?: string;
  birthDateJalali: string;
  phone: string;
  email: string;
  department: string;
  jobTitle: string;
  hireDateJalali: string;
  baseSalaryToman: number;
  maritalStatus: 'SINGLE' | 'MARRIED';
  childrenCount: number;
  bankIban: string;
  directManagerId?: string;
  status: 'ACTIVE' | 'RESIGNED' | 'ON_LEAVE';
  avatarUrl?: string;
  documents?: EmployeeDocument[];
  jobHistories?: JobHistoryItem[];
  /** سابقه پرداخت حق بیمه (روز) — شرط ۷۲۰ روز برای حق اولاد (ماده ۸۶ تامین اجتماعی). */
  ssoContributionDays?: number;
  /** کمک‌هزینه ایاب و ذهاب (مزایای موردی هر همکار — پیش‌فرض صفر). */
  commuteAllowanceToman?: number;
}

// ---------------- Module 3 Types ----------------
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  dateJalali: string;
  checkIn?: string;
  checkOut?: string;
  delayMinutes: number;
  overtimeHours: number;
  /** ترک زودهنگام (دقیقه) — خروج پیش از پایان شیفت ۱۷:۰۰ به وقت تهران. */
  earlyLeaveMinutes?: number;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE' | 'MISSION';
}

/** Derived leave entitlement (Art. 64/66) — computed server-side per employee/year. */
export interface LeaveYearBalance {
  yearJalali: number;
  entitlementDays: number;
  carryoverDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface LeaveBalance {
  employeeId: string;
  employeeName?: string;
  currentYear: number;
  years: Record<number, LeaveYearBalance>;
  remainingNow: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveType: LeaveType;
  startDateJalali: string;
  endDateJalali: string;
  daysCount: number;
  reason: string;
  status: LeaveStatus;
  managerApproved?: boolean;
  hrApproved?: boolean;
  managerComment?: string;
  hrComment?: string;
  createdAtJalali: string;
}

// ---------------- Module 4 Types ----------------
export interface PayrollSlip {
  id: string;
  employeeId: string;
  employeeName?: string;
  personnelCode?: string;
  monthJalali: number;
  monthName: string;
  yearJalali: number;
  baseSalaryToman: number;
  housingAllowanceToman: number;
  bonKargariToman: number;
  childAllowanceToman: number;
  commuteAllowanceToman: number;
  overtimePayToman: number;
  grossSalaryToman: number;
  ssoInsurance7PctToman: number; // 7% social security
  incomeTaxToman: number;        // Iranian progressive tax brackets
  otherDeductionsToman: number;
  netSalaryToman: number;
  sanavatReserveToman: number;   // حق سنوات
  eidiReserveToman: number;      // پاداش و عیدی سالانه
  status: PayrollStatus;
  paidAtJalali?: string;
  // --- Extended transparency fields (payroll audit fixes) ---
  seniorityBaseToman?: number;   // پایه سنوات (≥۱ سال سابقه)
  marriageAllowanceToman?: number; // حق تأهل
  overtimeHours?: number;        // ساعات اضافه‌کاری واقعی از تردد
  payableDays?: number;          // روزهای قابل پرداخت دوره (تناسب استخدام/مرخصی بدون حقوق)
  unpaidLeaveDays?: number;      // روزهای مرخصی بدون حقوق کسر شده
  statutoryYearNote?: string;    // بخشنامه مبنای محاسبات
  generatedAtJalali?: string;    // تاریخ واقعی تولید فیش
}

// ---------------- Module 5 Types ----------------
export interface PerformanceGoal {
  id: string;
  employeeId: string;
  employeeName?: string;
  title: string;
  targetMetric: string;
  currentProgress: number; // 0 - 100
  weight: number;
  deadlineJalali: string;
  score?: number;
}

// ---------------- Module 6 Types ----------------
export interface TrainingCourse {
  id: string;
  title: string;
  instructor: string;
  durationHours: number;
  department: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  participantsCount: number;
  completionRate: number;
}

export interface SkillMatrixItem {
  skillName: string;
  category: string;
  requiredLevel: number; // 1-5
  teamAverageLevel: number; // 1-5
}

// ---------------- Module 7 Types ----------------
export interface ChecklistItem {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: 'ONBOARDING' | 'OFFBOARDING';
  title: string;
  department: string;
  dueDateJalali: string;
  isCompleted: boolean;
  completedAtJalali?: string;
}

// ---------------- Module 8 Types ----------------
export interface HRDashboardMetrics {
  turnoverRatePct: number;
  /** null = redacted for non-HR roles (HR-confidential planning KPI). */
  averageTimeToHireDays: number | null;
  /** null = redacted for non-HR roles. */
  costPerHireToman: number | null;
  activeHeadcount: number;
  openPositionsCount: number;
  pendingLeavesCount: number;
  /** null = redacted for non-HR roles (company-wide payroll is confidential). */
  monthlyPayrollTotalToman: number | null;
}

export interface HRMetrics {
  turnoverRatePct: number;
  averageTimeToHireDays: number;
  costPerHireToman: number;
  totalActiveEmployees: number;
}

// ---------------- AI Agent Types ----------------
export interface AgentMessage {
  /** false = response came from the local rule-based engine, not live AI (honest labeling). */
  aiAvailable?: boolean;
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  toolCall?: {
    name: string;
    args: any;
    result?: any;
  };
  suggestedActions?: string[];
  radarData?: {
    candidates: string[];
    criteria: string[];
    scores: Record<string, Record<string, number>>;
  };
  emailDraftPreview?: EmailDraft & { candidateName: string; candidateEmail: string };
}

// ---------------- Seilaneh Sabz Holding Types ----------------
export interface HoldingDepartment {
  id: string;
  name: string;
  englishName: string;
  category:
    | 'MANUFACTURING'
    | 'R_AND_D'
    | 'MARKETING'
    | 'SALES'
    | 'SUPPLY_CHAIN'
    | 'QUALITY'
    | 'HR'
    | 'FINANCE'
    | 'IT'
    | 'LEGAL';
  headName: string;
  headTitle: string;
  avatar: string;
  headcount: number;
  vacancies: number;
  brands: string[];
  location: string;
  kpiScore: number;
  pendingLeaves: number;
  activeProjects: string[];
  description: string;
  shiftType?: string;
  colorTheme?: string;
}

export interface JobAdGenerationRequest {
  jobTitle: string;
  departmentId: string;
  departmentName: string;
  seniority: 'کارآموز' | 'کارشناس' | 'کارشناس ارشد' | 'سرپرست' | 'مدیر';
  workType: 'تمام‌وقت' | 'پاره‌وقت' | 'پروژه‌ای' | 'شیفتی کارخانه';
  location: string;
  brandFocus?: string;
  keySkills: string;
  perks: string[];
  tone: 'حرفه‌ای و سازمانی' | 'پرانرژی و استارتاپی' | 'کاریزماتیک و الهام‌بخش';
}

export interface JobAdGenerationResult {
  jobTitle: string;
  departmentName: string;
  brandFocus?: string;
  jobDescriptionMarkdown: string;
  recruitmentAdSocial: string;
  interviewQuestions: string[];
  salaryBenchmarkToman: string;
  perksList: string[];
}

export interface VoiceCallMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actionTaken?: string;
  actionPayload?: any;
  audioGenerated?: boolean;
}

export interface HRAutomationTask {
  id: string;
  title: string;
  category: 'PAYROLL' | 'SCREENING' | 'CONTRACT' | 'LEAVES' | 'ONBOARDING' | 'ALERTS';
  description: string;
  estimatedTimeSaved: string;
  status: 'IDLE' | 'RUNNING' | 'COMPLETED';
  lastRunJalali?: string;
  successCount?: number;
  badge: string;
}

// ---------------- Competitor Intelligence Types (HireVue, Eightfold AI, ZipRecruiter) ----------------

// 1. HireVue On-Demand AI Video Interview & Assessment
export interface VideoInterviewQuestion {
  id: string;
  questionText: string;
  category: 'COMPETENCY' | 'SITUATIONAL' | 'TECHNICAL' | 'CULTURE_FIT';
  maxDurationSeconds: number;
  preparationSeconds: number;
  rubricCriteria: string;
}

export interface VideoInterviewSubmission {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  brand: string;
  submittedAtJalali: string;
  status: 'COMPLETED' | 'PENDING_REVIEW' | 'IN_PROGRESS';
  overallScore: number; // 0 - 100
  confidenceScore: number; // 0 - 100
  clarityScore: number; // 0 - 100
  fairnessAuditScore: number; // 0 - 100 (Bias Mitigation Index)
  answers: {
    questionId: string;
    questionText: string;
    videoDurationSeconds: number;
    transcript: string;
    score: number; // 1 - 10
    aiFeedback: string;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'CONFIDENT';
    keyCompetencies: string[];
  }[];
  aiRecommendation: 'STRONG_RECOMMEND' | 'RECOMMEND' | 'CONSIDER' | 'DECLINE';
  summaryInsight: string;
}

// 2. Eightfold AI Talent Intelligence & Skill Graph
export interface SkillGraphNode {
  name: string;
  level: 'ADVANCED' | 'INTERMEDIATE' | 'FOUNDATIONAL';
  category: 'CORE_TECHNICAL' | 'MANAGERIAL' | 'CROSS_FUNCTIONAL' | 'COMPLIANCE';
  isVerified: boolean;
  adjacentSkills: string[];
}

export interface CandidateSkillMatch {
  candidateId: string;
  candidateName: string;
  targetJobTitle: string;
  brand: 'دافی' | 'کامان' | 'میس‌ویک' | 'کاپوت' | 'هلدینگ';
  overallMatchPct: number; // 0 - 100
  matchedSkills: string[];
  learnableSkills30Days: string[]; // Skill Adjacent / Learnability
  skillGap: string[];
  trajectoryScore: number; // Career growth projection (0 - 100)
  suggestedUpskillingCourses: string[];
}

export interface InternalMobilityMatch {
  employeeId: string;
  employeeName: string;
  currentTitle: string;
  currentDepartment: string;
  currentBrand: 'دافی' | 'کامان' | 'میس‌ویک' | 'کاپوت';
  targetJobId: string;
  targetJobTitle: string;
  readinessLevel: 'READY_NOW' | 'READY_IN_3_MONTHS' | 'DEVELOPMENT_NEEDED';
  retentionImpact: 'CRITICAL_HIGH' | 'MODERATE' | 'STABLE';
  internalMatchPct: number;
  managerRecommendationNote: string;
}

// 3. ZipRecruiter Smart Sourcing & Syndication
export interface SourcedCandidate {
  id: string;
  fullName: string;
  currentRole: string;
  currentCompany: string;
  experienceYears: number;
  matchScorePct: number;
  location: string;
  topSkills: string[];
  status: 'RECOMMENDED' | 'INVITED' | 'ACCEPTED' | 'PASSED';
  invitedAtJalali?: string;
  lastActive: string;
  avatarUrl: string;
}

export interface JobSyndicationChannel {
  id: 'jobinja' | 'jobvision' | 'irantalent' | 'linkedin' | 'telegram_bale';
  platformName: string;
  platformLogo: string;
  status: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'PAUSED';
  impressionsCount: number;
  clicksCount: number;
  applicationsReceived: number;
  costToman: number;
  lastSyncJalali: string;
}

export interface KnockoutQuestion {
  id: string;
  question: string;
  requiredAnswer: boolean | string;
  isDealBreaker: boolean;
  explanation: string;
}

// ---------------- AI Bot Governance & Department Pipeline Types ----------------
export type StepEvaluationType =
  | 'KNOCKOUT'
  | 'EXPERIENCE_VERIFY'
  | 'SKILL_MATCH'
  | 'CULTURE_FIT'
  | 'BEHAVIORAL'
  | 'FINAL_DECISION';

export interface PipelineStep {
  id: string;
  stepNumber: number;
  name: string;
  description: string;
  evaluationType: StepEvaluationType;
  isAutomated: boolean;
  failAction: 'REJECT' | 'FLAG_FOR_MANAGER' | 'DOWNGRADE_SCORE';
  promptHint?: string;
}

export interface PipelineCriteriaWeight {
  id: string;
  name: string;
  weight: number; // 0 to 100
  targetDescription: string;
  thresholdScore: number; // 1 to 10
  isMandatory?: boolean;
}

export interface DepartmentEvaluationPipeline {
  id: string;
  departmentId: string;
  departmentName: string;
  industrySector: string; // e.g. "صنایع آرایشی و بهداشتی / دارویی (FMCG)"
  description: string;
  steps: PipelineStep[];
  criteriaWeights: PipelineCriteriaWeight[];
  vetoRules: string[]; // Red line criteria for auto-rejection
  minimumPassingScore: number;
  airigor: 'STRICT' | 'BALANCED' | 'LENIENT';
  scoringMethod: ScoringMethod;
  customPromptInstructions: string;
}

export interface OrganizationalCultureConfig {
  companyVision: string;
  holdingBrands: string[];
  coreValues: Array<{
    id: string;
    title: string;
    description: string;
    weight: number;
  }>;
  companyCultureDoc: string; // Rich markdown text of organization culture
  unacceptableBehaviors: string[]; // Red lines / رفتارهای غیرقابل قبول
  toneOfVoice: 'FORMAL' | 'EMPATHETIC' | 'STRICT' | 'PROFESSIONAL';
  culturalFitWeightPct: number; // e.g. 20%
}

export interface AIBotGovernanceConfig {
  botName: string;
  botRole: string;
  modelName: string;
  systemPromptTemplate: string;
  strictnessLevel: 'STRICT' | 'BALANCED' | 'LENIENT';
  culture: OrganizationalCultureConfig;
  departmentPipelines: DepartmentEvaluationPipeline[];
  generalEvaluationRules: string[];
  emailDraftingGuidelines: string;
  maxContextHistoryTurns: number;
  lastUpdatedJalali: string;
}

export interface PipelineEvaluationStepResult {
  stepNumber: number;
  stepName: string;
  passed: boolean;
  score: number; // 1 to 10
  notes: string;
  evidence: string;
}

export interface PipelineEvaluationTestResult {
  candidateName: string;
  departmentName: string;
  industrySector: string;
  totalScore: number;
  passed: boolean;
  recommendedStage: CandidateStage;
  category: CandidateCategory;
  stepResults: PipelineEvaluationStepResult[];
  criteriaScores: Record<string, number>;
  criteriaFeedback: Record<string, string>;
  culturalFitScore: number;
  culturalFitAnalysis: string;
  vetoTriggered: boolean;
  vetoReason?: string;
  strengths: string[];
  weaknesses: string[];
  evidenceQuotes: string[];
  executiveSummary: string;
  rawModelReasoning: string;
  latencyMs: number;
  aiAvailable: boolean;
}

// ---------------- Notion-Style HR Workspace & Tasks ----------------
export type HRTaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
export type HRTaskPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
export type HRTaskCategory =
  | 'RECRUITMENT'      // جذب و استخدام
  | 'PAYROLL'          // حقوق و دستمزد
  | 'LEGAL_CONTRACTS'  // قراردادها و امور حقوقی
  | 'FACTORY_OPS'      // تردد و عملیات کارخانجات
  | 'TRAINING_GMP'     // آموزش و استانداردها
  | 'WELFARE_EVENTS'   // رفاهی، سلامت و مناسبت‌ها
  | 'PERFORMANCE'      // ارزیابی عملکرد
  | 'GENERAL_ADMIN';   // امور عمومی و اداری

export interface HRSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface HRWorkspaceTask {
  id: string;
  title: string;
  description?: string;
  category: HRTaskCategory;
  status: HRTaskStatus;
  priority: HRTaskPriority;
  dueDateJalali: string; // e.g. "1403/12/20"
  dueTime?: string;      // e.g. "10:30"
  timeframe: 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LATER';
  assigneeName: string;
  assigneeRole?: string;
  assigneeAvatar?: string;
  subtasks: HRSubtask[];
  tags: string[];
  notes?: string;
  reminderJalali?: string; // e.g. "1403/12/20 09:30"
  checklistDocTemplate?: string;
  createdAtJalali: string;
  updatedAtJalali?: string;
}

export interface HRReminderItem {
  id: string;
  title: string;
  dueDateJalali: string;
  dueTime: string;
  taskId?: string;
  isCompleted: boolean;
  priority: HRTaskPriority;
  category: HRTaskCategory;
  note?: string;
}




