# Product Bug Report — Kara / Seilaneh Sabz Enterprise HRMS
**Product-level logic & completeness audit** (not a visual/UI audit)
**Date:** 1405-06-17 (2026-09-08) · **Branch:** `arena/01a07e27-hr-seylane-sabz` · **Commit audited:** `56ac3fd`
**Method:** full code inventory (17.6k LOC, 8 modules + mobile shell + AI services) → static trace of every business rule → **live adversarial testing against the running server** (`scripts/product_audit_probes.cjs`, 20 probe scenarios) → verification of statutory figures against published Iranian labor-law/tax sources.

---

## 0. Executive Summary

The product presents itself (README + in-app copy) as a labor-law-compliant Iranian HRMS: 26-day leave, 7% SSO, progressive salary tax, Eidi/Sanavat reserves, AI resume screening, RBAC for 3 roles. **The presentation layer is convincing; the business-logic layer underneath is largely absent, fabricated, or legally incorrect.**

The five most dangerous findings, each verified live:

1. **Payroll tax is systematically wrong** — the 12M-Toman exemption is applied *twice* and the top bracket is missing; a 42M-Toman employee is under-taxed **~3.0M Toman/month (~47%)**. Every generated payslip would create tax liabilities for a real employer. (`server.ts`)
2. **There is no leave-balance model at all** — the "26-day balance" card is a hardcoded constant (`USED=7`); requests of **-10 days** and **999 days** are accepted, and 999 days was approved end-to-end with zero balance checks. (`AttendanceModule.tsx`, `server.ts`)
3. **Salary data and PII leak to every role** — as `EMPLOYEE`, the API returns all payslips, national IDs, IBANs and salaries, and even *executes* company-wide payroll generation. The employee-facing mobile portal lists **everyone's** net pay. (`server.ts`, `MobilePersonnelPortal.tsx`, `Sidebar.tsx`)
4. **One-click / one-sentence mass approval** — the `auto-leaves` automation approves **all pending leaves** (bypassing manager *and* HR) with no role check; it fired successfully while the session role was `EMPLOYEE`, and the voice assistant auto-triggers such automations from keyword matches with no confirmation. (`server.ts`, `MobileVoiceCall.tsx`, `MobileAutomations.tsx`)
5. **AI screening is a random-number generator** — bulk upload assigns `4 + Math.random()*5.8` scores to real PDFs (whose text is never extracted), then **auto-moves candidates scoring <5 to REJECTED** (37 of 200 in our test) with no human in the loop — directly violating the product's own "no irreversible action without confirmation" policy. (`server.ts`, `BulkUploadModal.tsx`)

Also structural: **no persistence** (in-memory store; the Prisma schema is dead code), **no server-side Jalali date logic** (dates are Persian-digit display strings; every new record is stamped with a fabricated `۱۴۰۳/۰۶/۱۵` while the real date is ۱۴۰۵), and statutory constants are **hardcoded to the 1403 circular** with no per-year configuration.

**Counts:** 51 numbered findings — **Critical: 15 · High: 19 · Medium: 16 · Low: 1**.
By module: Payroll 12 (5 Critical) · Leave/Attendance 9 (4 Critical) · Recruitment 11 (2 Critical) · RBAC/Security/Integrity 7 (3 Critical) · AI Agent 5 (1 Critical) · Modules 5–8 5 · Localization 3.
Seven product-owner decisions are required before certain fixes (Section 9) — per instructions, these are flagged, **not** guessed.

---

## 1. Product Inventory (intended vs. actual)

| # | Module (README claim) | Intended behavior | Actual state |
|---|---|---|---|
| 1 | Recruitment (claimed "100% complete") | Job posting → upload → AI screening → compare → interview → offer → hire | Pipeline UI works; **scoring is fabricated** (random for bulk, deterministic-fallback for "AI"); no stage gates; **HIRED dead-ends** (no employee record) |
| 2 | Employee records | Personnel file, documents, job history, org chart | Create-only; org chart is **hardcoded HTML**; no edit/delete; documents/jobHistories are schema-only |
| 3 | Attendance & Leave ("26-day law, 2-step approval") | Accrual, balance, approval flow, balance deduction | Approval flow (server-side stage machine) **works**; balance/accrual/deduction **do not exist**; attendance TZ-broken |
| 4 | Payroll ("insurance 7%, progressive tax, sanavat, eidi") | Legally correct payslips | Formula runs but is **legally wrong** (tax double-exemption, missing brackets, uncapped eidi, flat fake overtime/commute, no proration) |
| 5 | Performance (OKR/KPI) | Goals, progress, manager scoring | Progress slider only; `score` never settable; no role gating |
| 6 | Training & skills | Courses, enrollment, skill matrix | **Read-only display**; enroll button is `alert()` |
| 7 | Onboarding/Offboarding checklists | Checklists tied to hire/exit events | Toggle works (with fabricated completion date); **no linkage** to hiring or resignation; mobile portal shows a static fake list |
| 8 | Analytics/KPIs | Turnover, time-to-hire, cost-per-hire, funnel | **100% static seed numbers**; funnel is hardcoded text; export dumps the seed JSON |
| — | RBAC (3 roles) | HR Director / Dept Manager / Employee scoping | Only leave-approval checks role (server); **everything else is open**; UI hides almost nothing |
| — | AI Agent (Gemini) | Tool-calling recruiter assistant, draft-only emails | Draft-only email policy **honored**; but stateless chat, unhandled function calls, keyword misfires, fabricated fallbacks, voice auto-runs automations |
| — | Jalali localization | Correct SH dates in all calculations | Conversion engine is **correct** (unit-verified), but backend never parses Jalali dates; timestamps hardcoded to ۱۴۰۳ |
| — | Persistence (README: "PostgreSQL Prisma migration") | Durable data | **In-memory singleton**; Prisma not installed/used; restart loses finalized payroll |

---

## 2. Module 4 — Payroll (highest business risk)

### PAY-01 · Critical · Income tax applies the exemption twice → systematic under-taxation
`server.ts` (`POST /api/payroll/generate`):
```ts
const taxable = Math.max(0, gross - 12000000 - sso7Pct);  // subtracts 12M…
const brackets = [{ upTo: 12000000, rate: 0 }, …];          // …then 0% up to 12M again
```
**Live evidence (probe P1):** emp-2 (base 42M, 1403/06): gross 49,016,618 → app tax **3,348,091**; correct 1403-law tax (taxable = gross − 7% SSO; brackets 0/10/15/20/25%) = **6,372,614** → **under-taxation 3,024,523 Toman/month (~47%)**, ≈36M Toman/year per senior employee. An HR manager filing these numbers would under-withhold tax for every employee above the exemption.
**Fix:** taxable base = gross(insurable-taxable items) − employee SSO share, then apply brackets once. No business decision needed for the double-exemption itself (it is unambiguously a bug); the *bracket table* is decision D2.

### PAY-02 · Critical · Tax brackets outdated, incomplete, and hardcoded
Table in code: 0% ≤12M / 10% ≤16.8M / 15% ≤27M / 20% above (a 1402/1403-era table; the 16.8M edge is also imprecise vs. the legal 16.67M).
- Missing **25%** top bracket of 1403 (>33.33M/month) — high earners under-taxed even ignoring PAY-01.
- Verified statutory tables: **1403**: exempt 12M/month; **1404**: exempt 24M, 10% 24–30M, 15% 30–38M, 20% 38–50M, 25% 50–66.7M, 30% above ([sharghdaily](https://www.sharghdaily.com/اقتصادی-12/957208-میزان-مالیات-حقوق-دستمزد-در-مشخص-شد), [kartaban](https://kartaban.com/blog/salary/salary-tax/)); **1405 (current year)**: exempt 40M, 10% 40–80M, 15% 80–100M, 20% 100–120M, 25% 120–140M, 30% above ([heyvalaw](https://www.heyvalaw.com/web/articles/view/5430/معافیت-مالیات-حقوق.html)).
- The endpoint accepts `yearJalali` 1300–1500 but uses one hardcoded table for all years. **Live evidence (P2):** payroll for **year 1350** generated successfully with 1403 allowances.
**Files:** `server.ts`. **Fix requires decision D2** (which year is the product's target; recommend a per-year `TaxBracketConfig` keyed by `yearJalali`).

### PAY-03 · Critical · Statutory allowance constants hardcoded to 1403, missing mandatory wage items
`housing=900,000 / bon=1,400,000 / child=716,618×n / commute=1,500,000 / overtime=2,500,000` are year-independent constants. Verified circulars ([e-estekhdam salary tables](https://www.e-estekhdam.com/salary)):

| Item (Toman/month) | 1403 | 1404 | 1405 (current) |
|---|---|---|---|
| Housing (حق مسکن) | 900,000 | 900,000 | 3,000,000 |
| Bon (بن خواربار) | 1,400,000 | 2,200,000 | 2,200,000 |
| Child per child (حق اولاد) | 716,618 | 1,039,097 | 1,662,555 |
| Minimum monthly wage | 7,166,184 | 10,390,968 | 16,625,550 |

Also **entirely missing** from the engine: **پایه سنوات** (mandatory seniority allowance for ≥1-year staff: 210,000/282,000/500,000 Toman for 1403/1404/1405) and **حق تأهل** (500,000 rial→50,000… 5,000,000 rial = 500,000 Toman, 1404+). UI is honest about one thing only: the banner says "بخشنامه ۱۴۰۳" — two years stale as of today (1405), and PayrollModule has **no year selector** (year fixed to 1403 in state).
**Files:** `server.ts`, `PayrollModule.tsx`. **Decision D2** covers target-year values.

### PAY-04 · Critical · No eligibility, proration, or period-lock logic
- **Mid-month hire gets a full month:** employee created with `hireDateJalali: ۱۴۰۳/۰۶/۲۵` received full base + all allowances + the flat 2.5M "overtime" for 1403/06 (probe P3). No proration by hire date exists.
- **Status ignored:** `dbStore.employees.map(...)` pays `RESIGNED` / `ON_LEAVE` employees identically to active ones (no filter in code; statuses exist in the type).
- **Unpaid leave never reduces pay:** approved `UNPAID` leave requests are not read by payroll at all — the audit question "unpaid leave affecting salary" has answer: no linkage exists.
- **No period lock / finalized-slip overwrite:** regenerating a past month silently **overwrites FINALIZED slips with different numbers**. Evidence (P4): the seed 1403/05 slip for emp-2 (SSO 3,088,163; tax 3,820,000; commute 2,000,000; OT 3,500,000) becomes (SSO 3,326,163; tax 3,348,091; commute 1,500,000; OT 2,500,000) when regenerated — a payroll-audit trail violation (two "official" formulas in one product).
**Files:** `server.ts`. Partially requires decisions (D1-adjacent policy on unpaid-leave deduction mechanics), but status filtering and proration are unambiguous gaps.

### PAY-05 · High · Overtime is a fabricated flat constant; legal multiplier never implemented
Every employee gets `overtimePay = 2,500,000` Toman regardless of recorded overtime. The attendance module records `overtimeHours` (e.g., 1.0h, 25-min delay) that payroll never reads. Art. 59 labor law (40% premium → 1.4× hourly wage; 1403 overtime hour = 469,607 rial per circular tables) is implemented **nowhere**; there is no hourly-wage derivation (`dailyWage/7.33`), no consent/cap logic (Art. 60: max 8h OT/day by agreement), no Friday-work premium (Art. 62: +40%), and — notable for a product advertising "۳ نوبت کاری چرخشی" factory jobs — **no shift-work premiums (Art. 56: 10%/15%/22.5%)**. Payslip line "فوق‌العاده اضافه‌کاری" presents the fake constant as computed pay.
**Files:** `server.ts`, `PayrollModule.tsx`, `AttendanceModule.tsx`.

### PAY-06 · High · Eidi reserve has no legal ceiling
`eidiReserve = base×2/12` per month → annualized 2×base. Under the ماده‌واحده قانون عیدی و پاداش, eidi = 60 days' wage **capped at 90 days' minimum wage** ([e-estekhdam](https://www.e-estekhdam.com/حداقل-عیدی-کارگران-در-سال-۱۴۰۵-چقدر-است)). Evidence (P-eidi): emp-1 (base 48M) accrues **96,000,000/yr** vs 1403 legal cap **21,498,552** — 4.5× over-accrual (financial misstatement in the opposite direction). **Decision D3** for wage-base definition; the cap itself is law.

### PAY-07 · High · SSO 7% base is wrong and inconsistent
`insurableSalary = gross − commute` includes **child allowance**, which is *exempt* from SSO contributions (family benefit under Art. 86 Social Security Law, not "مزد") → the employee is over-deducted 7%×child allowance every month. Meanwhile the **seed slip used a different base** (3,088,163 ≠ generator's 3,326,163 for identical inputs) — the product contains two contradictory "official" formulas. Whether housing/bon are insurable (current SSO practice: yes) and commute (disputed) should be an explicit config, not an accident. **Decision D6.**

### PAY-08 · High · Child allowance paid unconditionally
Art. 86 Social Security Law requires **720 days of insurance history** and child <18 (or studying/incapacitated) ([bizyar 1403 circular summary](https://www.bizyar.com/fa/news/show/حقوق-1403)). Code pays per `childrenCount` with no history/age checks — an employee with 0 days of SSO history and a 25-year-old child gets the allowance.

### PAY-09 · Medium · Sanavat reserve base is legally contested (flag, don't guess)
`sanavat = base/12`. Art. 24: one month's **last wage** per year of service; the Court of Administrative Justice rulings oscillated between "base wage only" and full **حق‌السعی** (incl. housing/bon) ([ilna coverage](https://www.ilna.ir/بخش-کارگری-9/1132557)). Not prorated for partial years either. **Decision D3.**

### PAY-10 · Medium · PayrollStatus lifecycle is decorative
Slips are created directly `FINALIZED`; `DRAFT`/`PAID` unreachable; no "mark paid", no review step; the `auto-payroll` automation "finalizing all slips" is a no-op on already-finalized data.

### PAY-11 · Medium · Payroll UI misstatements
- Summary KPIs sum **all stored periods** but are labeled "ماهانه" (after generating 2 months, "monthly gross" doubles).
- `App.tsx handleGeneratePayroll` does `setPayrollSlips(data.slips)` — UI **drops all other months** the server still holds (client/server divergence until reload).
- "چاپ فیش (PDF)" button is `alert('نسخه PDF رسمی … آماده چاپ می‌باشد.')` — produces nothing.

### PAY-12 · Critical · Payroll readable & executable by every role (see SEC-01/02 for the mechanism)
Live evidence (P7): with session role `EMPLOYEE`, `GET /api/payroll/slips` returned all 11 slips (names + net salaries), and `POST /api/payroll/generate` **succeeded**. `PayrollModule` never receives `currentRole`; Sidebar/BottomNav/CommandPalette render the payroll module for all roles; the mobile "Personnel Portal" (employee-facing) lists **every employee's** net pay.

---

## 3. Module 3 — Attendance & Leave

### LEA-01 · Critical · No leave-entitlement/balance model exists anywhere
The "مانده مرخصی استحقاقی (ماده ۶۴)" card shows constants: `TOTAL=26; USED=7; REMAINING=19` — identical for every employee and role, forever (`AttendanceModule.tsx` L52-54). There is: no accrual engine, no pro-ration for mid-year joiners (Art. 64: 26 working days/yr — a July hire earns ~13), no deduction on approval, no carry-over cap (Art. 66: max **9 days** transferable — [parsikhesab](https://parsikhesab.com/types-of-employee-leave/)), no separation of ANNUAL vs SICK vs UNPAID effects on the quota. The specified flow "leave request → manager → HR → **balance update**" is missing its final step entirely. Approval works (status machine is correct server-side), but approving changes no balance because none is recorded.

### LEA-02 · Critical · Leave request accepts adversarial input; nothing is blocked
Live evidence (P5/P6), `POST /api/leave/requests`:
- `daysCount: -10` → accepted (`parseFloat(-10)` stored); `daysCount: 0` → silently coerced to 1 (`parseFloat(0) || 1`).
- `daysCount: 999` → accepted **and approved** by HR → `APPROVED, 999 days`.
- `endDate (۱۴۰۳/۰۶/۱۰) < startDate (۱۴۰۳/۰۶/۲۰)` → accepted.
- `startDateJalali: "abc"` → accepted (dates are free-text strings; never parsed).
- `daysCount` is **never derived from the date range** — working-day counting (excluding Fridays/holidays) doesn't exist server-side or in the form.
Client-side `min=1 max=26` on the number input is cosmetic (bypassable, and not validated on submit).
**"Request more than remaining balance"** — cannot even be evaluated (LEA-01); whether to block or warn is **Decision D1**.

### LEA-03 · Critical · Requests attributed to the wrong employee
- Server: unknown `employeeId` falls back to `dbStore.employees[0]` — a request for `emp-does-not-exist` was created **for the HR Director** (P5).
- Client: `App.tsx handleSubmitLeave`/`handleCheckInOut` hardcode `employees[0]?.id` — the EMPLOYEE role's own leave/check-ins are recorded against the HR Director's record. There is no logged-in-employee identity anywhere (`/api/auth/me` returns a static admin user; the Prisma `User↔Employee` relation is dead schema). (P16)

### LEA-04 · Critical · `auto-leaves` mass-approves all pending leave with no role, balance, or conflict checks
`POST /api/automation/run {taskId:'auto-leaves'}` flips **every** `PENDING_MANAGER`/`PENDING_HR` request to `APPROVED` (`server.ts` L560-566) — no `managerApproved`/`hrApproved` recorded, bypassing the two-step flow the product is built around. Live evidence (P8): executed **while role = EMPLOYEE** (endpoint has no role check): pendingBefore 2 → pendingAfter 0; both approvals lack manager sign-off. The task description claims "بررسی سقف ۲۶ روز … و عدم همزمانی با شیفت" — neither check exists. Reachable from: MobileAutomations "اجرای فوری" (no confirmation dialog) and the voice assistant path (AIA-01).

### LEA-05 · High · Department managers have no department scope
`directManagerId` and department fields exist but the approve endpoint checks only *stage*, never *department* or *manager-of-record*; a DEPT_MANAGER approves any department's leave (P17). All GET endpoints return global data for every role (employees of all departments, all candidates, all leaves).

### LEA-06 · High · Frontend ignores API errors on approval → false success
`App.tsx handleApproveLeave` never checks `res.ok`: on 403/409 the **error JSON replaces the leave request in React state** (`prev.map(l => l.id===id ? updated : l)` where `updated = {error: …}`) *and* a success toast ("تأیید شد"/"رد گردید") is shown. Live evidence (P18): dept manager acting on a decided request gets 409 server-side, success toast client-side, corrupted row. The same missing `res.ok` pattern exists in `handleUpdateCandidateStage`, `handleScheduleInterview`, `handleCreateEmployee`, `handleCreateJob`, `handleSubmitLeave`, `handleCheckInOut` — every mutation can silently fail while reporting success.

### LEA-07 · Medium · Leave-type coverage broken/mislabeled
- `MARRIAGE` (3 paid days, Art. 73) and `MATERNITY` (9 months, per schema comment "قانون جوانی جمعیت") exist in enum/schema/Prisma but are **not offered in the form** and have no rules.
- `HOURLY` has no hours accumulation (and legally deducts from the annual quota pro-rata) — and the requests table renders HOURLY/MARRIAGE/MATERNITY all as "**بدون حقوق**" (unpaid), mislabeling paid leave types (`AttendanceModule.tsx` ternary chain).
- `SICK`: no medical-certificate attachment, no SSO approval path (sick leave >3 days requires SSO confirmation and is paid by SSO, not the employer — Art. 74), yet it flows through the same manager/HR approval and consumes nothing.

### LEA-08 · Medium · Attendance clock uses server timezone, not Asia/Tehran
`check-in-out` computes `delayMinutes`/`overtimeHours` from `new Date()` server-local time. Live evidence (P15): recorded check-in **۰۲:۰۹** (UTC) while Tehran wall-clock was **۰۵:۳۹** — for a deployed product, delays/overtime are wrong by +3:30h (an on-time 08:00 Tehran arrival reads as 04:30 → 0 delay; a 17:00 Tehran departure reads as 13:30 → overtime lost; conversely late-UTC-day arrivals accrue phantom delays). No timezone handling anywhere.

### LEA-09 · Medium · Attendance record integrity
- Status column renders "حاضر در شرکت" **hardcoded** for every row — `ABSENT`/`LEAVE`/`MISSION` statuses (in the type + schema) display as present.
- No way to record absence, mission, or early-exit (seed `att-2` checks out 16:45 with no flag); no working-day/holiday calendar exists despite README's "تقویم روزهای کاری" claim (Friday check-ins record as normal PRESENT).
- Seed inconsistency: `att-1` checkout 17:02 but `overtimeHours: 1.0` (Low).

---

## 4. Module 1 — Recruitment & AI Screening

### REC-01 · Critical · Bulk upload fabricates "AI" scores randomly and auto-rejects real applicants
`server.ts bulk-upload`: `const score = +(4 + Math.random()*5.8).toFixed(1)` for **every** candidate — including real uploaded files; `score < 5` ⇒ `stage: REJECTED` immediately. Live evidence (P10): 200 processed → store +200 → **37 auto-REJECTED without any human or AI review**; the one real PDF (`real_resume.pdf`) got `resumeText: "رزومه استخراج‌شده از سامانه جذب …"` (fabricated placeholder) and random score 7.8. The modal's progress bar meanwhile displays "ارزیابی هوشمند شایستگی‌ها و تطبیق با الزامات موقعیت شغلی **در Gemini**…" — a false claim about the system's own behavior. Auto-rejection contradicts the product's stated safety policy (emails are draft-only "because" irreversible actions need humans — yet the far more consequential rejection is fully automated on RNG). **Decision D5** (auto-reject vs. queue-for-review); the random scoring itself is unambiguous.

### REC-02 · Critical · Resume text extraction doesn't exist for real resumes
PDF/DOCX content is never parsed: manual uploads send only `{name,size}`; ZIP extraction reads text only for `txt/md/json/csv` entries (`BulkUploadModal.tsx handleExtractZip`). So the flagship flow "resume upload → AI screening with quoted evidence" cannot function for actual resumes; everything downstream (scores, strengths, "resumeQuotes") is invented. Non-Persian resumes: no language handling anywhere (moot only because no text is read).

### REC-03 · High · Pipeline has zero stage gates; any role can rewrite it
Live evidence (P9): `PATCH /api/candidates/cand-1/stage` from INITIAL_SCREENING straight to **HIRED** (no evaluation, no interview, no offer); **REJECTED → HIRED** resurrection also allowed. No role check on the endpoint (EMPLOYEE-session clients can move candidates — only the UI's approval buttons are role-aware). Kanban drag-drop and "مرحله بعد" arrows enforce no adjacency. The audit question "can a candidate move to Hired without a completed evaluation?" — **yes, in one request.**

### REC-04 · High · "Hired" dead-ends: recruitment and employee records are disconnected
Moving to HIRED creates **no** `Employee` record, **no** onboarding checklist, no payroll entry, no headcount update (P9: `employeeRecordCreatedOnHire: false`, `onboardingChecklistCreated: false`). The specified journey "job posting → … → hired (data persists and flows at every handoff)" breaks at the final handoff. Conversely, onboarding checklists (Module 7) can never be generated from a hire — they exist only as 3 seed rows for `emp-3`.

### REC-05 · High · AI evaluation fabricates results on empty/failed input
`POST /api/jobs/evaluate-candidate` with empty `resumeText` substitutes the placeholder "متن رزومه برای ارزیابی" (`server.ts`) and — with no API key or on any Gemini failure — `evaluateCandidateWithCriteria` fills **deterministic pseudo-scores** `6.5 + ((idx*1.3)%2.5)` per criterion. Live evidence (P11): an **empty resume scored 7.0 → INTERVIEW_PRIORITY**. Output is indistinguishable from real AI evaluation (no `source: 'fallback'` flag); `evaluatedAtJalali` is hardcoded `۱۴۰۳/۰۶/۱۵`. Edge cases (missing sections, different formats, ties) all land in the same fabrication path. **Decision D4** (fallback scores vs. explicit "AI unavailable — evaluate manually").

### REC-06 · High · Agent chat is stateless; several declared tools are never executed
- `POST /api/ai/chat` accepts only `{message, jobId}`; no history is transmitted (`AIAgentChat.tsx` sends the single message) and Gemini is called with `contents: userPrompt` — **no conversation context**. Follow-ups like "use the top 3 from before" cannot resolve (P14: second message received a generic greeting). Cross-message references only accidentally work via the top-12 system-prompt injection.
- Declared tools `score_and_evaluate_resume`, `categorize_candidate`, `analyze_job_posting` have **no handlers**: if Gemini calls them, the store is never updated and the model's function-result turn never happens; the user gets either empty text or a locally fabricated response — i.e., the agent can *narrate* a categorization that never occurred (**chat-vs-dashboard contradiction**, exactly the audit's question).
**Files:** `server/gemini.ts processAgentChat`, `server.ts /api/ai/chat`, `AIAgentChat.tsx`.

### REC-07 · Medium · Keyword intent-routing misfires draft rejection emails at the wrong candidate
Any message containing standalone "رد" (incl. **questions**) triggers a REJECTION draft. Live evidence (P13): user asked *"چرا سارا تهرانی رد شد؟"* ("why was Sara rejected?") → system produced a **REJECTION email draft for a different candidate** ("حامد افشار", the top-scoring bulk-upload artifact in the pool). Draft-only status prevents sending, but the targeting/intent error would train users to distrust (or worse, blindly approve) drafts.

### REC-08 · Medium · Candidate/job creation seeds fabricated data
`POST /api/candidates` with missing fields defaults to `overallScore: 7.5`, `category: INTERVIEW_PRIORITY`, fabricated strengths/quotes; `POST /api/jobs` hardcodes `createdAtJalali: '۱۴۰۳/۰۶/۱۵'`; bulk-upload stamps every candidate `appliedAtJalali: '۱۴۰۳-۰۶-۱۵'` (real date: ۱۴۰۵). `applicationsCount` is inflated by simulation runs (+200 per batch, P10).

### REC-09 · Medium · Job lifecycle incomplete; orphan-prevention moot because lifecycle ops don't exist
No DELETE/PATCH for jobs (can't archive, close, or delete — `بایگانی` badge in `JobPostingsView` is unreachable since POST forces `ACTIVE`); no DELETE for candidates/employees (P19: both 404). "Delete a job while candidates are linked" can't happen via API — but neither can archiving a filled position; the Prisma schema's `onDelete: Cascade` is dead code. Also `bulk-upload` silently retargets to `jobs[0]` when `jobId` is invalid.

### REC-10 · Medium · Interview scheduling side-effects & no conflict logic
`POST /api/candidates/:id/schedule-interview` **force-moves the candidate to IN_PERSON_INTERVIEW** even when `interviewType` is "تلفنی" (contradicts the pipeline); `scheduledInterview` field never set; no Jalali date/time validation; no double-booking detection (`InterviewCalendarView` is a list); no reschedule/cancel flow.

### REC-11 · Low · "Competitor intelligence" suites are unlabeled simulators
HireVue `evaluate-submission` returns `Math.random()` scores 82–98 with `aiRecommendation: 'STRONG_RECOMMEND'` **regardless of transcript**; ZipRecruiter invite/syndication mutate counters randomly; Eightfold data is seed-only. None are labeled as simulations in the UI — they render as production analytics.

---

## 5. RBAC / Security / Data Integrity (cross-cutting)

### SEC-01 · Critical · No API authorization except leave-approve
Only `PATCH /api/leave/requests/:id/approve` reads `dbStore.currentUserRole`. Every other endpoint is role-blind. Live evidence: as `EMPLOYEE` — read all payslips (P7), read all employees incl. `nationalId`, `bankIban`, `baseSalaryToman` (P7), **run payroll generation** (P7), **run auto-leaves mass approval** (P8); as `DEPT_MANAGER` — global visibility of 205 candidates, all leaves, all employees (P17). Frontend hides a few buttons but the data plane is wide open; `EmployeesModule`, `PayrollModule`, `AnalyticsModule`, `CommandPalette`, `BottomNav`, `Sidebar` receive no role at all.

### SEC-02 · Critical · Role is a single mutable global with no authentication
`POST /api/auth/switch-role` lets any client self-elevate to HR_DIRECTOR at will; `currentUserRole` is a **server-global** (two tabs with different roles overwrite each other — leave approvals get attributed to whichever role switched last). `/api/auth/me` returns a hardcoded admin. Acceptable as a demo device, but the leave-approve "SECURITY" comment (role from session, not body) gives false assurance while the session itself is client-controlled. **Decision D7** (demo switcher vs. real auth) determines the fix ceiling.

### SEC-03 · High · UI role gating promised by README is mostly absent
README: Employee may "مشاهده فیش حقوقی [خود]" etc. Reality: Sidebar renders all 9 modules for all roles (no role prop); BottomNav exposes payroll directly; ExecutiveDashboard receives `currentRole` but **never uses it** (verified: 2 occurrences = declaration + destructure); the mobile PWA portal (nominally the employee surface) shows all slips, all employees, all leaves, and the automation center with `auto-leaves`.

### SEC-04 · High · No data scoping for department managers
See LEA-05/P17. No endpoint filters by department; `directManagerId` is never consulted. A manager of "فناوری اطلاعات" sees and acts on "کارخانجات اشتهارد" employees, candidates, and leaves.

### SEC-05 · Critical · Zero persistence; Prisma schema is dead code
All state lives in an in-memory singleton (`server/store.ts`); no Prisma dependency in `package.json`, no client instantiation anywhere (verified by grep) — yet README advertises "اسکیما و مایگریشن پایگاه‌داده رابطه‌ای PostgreSQL". Restart loses approved leaves, finalized payroll, hired candidates. For an HR system of record this is disqualifying in production and must at minimum be documented honestly. (Also means "orphaned data on restart" = *all* data.)

### SEC-06 · Medium · Uniqueness & identity validation missing
No uniqueness enforcement for `nationalId`/`personnelCode`/`email` (schema says `@unique` — dead); duplicate employees create silently; **no Iranian national-ID checksum validation** (10-digit کد ملی has a standard check digit — the form only applies `maxLength=10` and offers a default `۰۰۱۲۳۴۵۶۷۸`); no IBAN validation; `personnelCode` randomly generated on create (collision-prone).

### SEC-07 · Medium · No employee mutation lifecycle
No PATCH/PUT for employees: salary changes (mid-year raise — the audit's payroll edge case is structurally impossible), transfers, promotions, resignation, document upload, job-history entries — all type/schema-only. `jobHistories`/`documents` render but can never grow. Offboarding never sets `status: RESIGNED`, so PAY-04's status filter would have nothing to filter even if implemented.

---

## 6. Modules 5–8 — Performance, L&D, Checklists, Analytics

### MOD-01 · High · Analytics (Module 8) is "fake complete"
Every KPI is a seed constant: turnover 3.8%, time-to-hire 16d, cost-per-hire 6.8M, headcount **1350**; the recruitment funnel is **hardcoded Persian strings** ("۲۵۰ رزومه (۱۰۰٪)", "۶۵ رزومه (۲۶٪)"…) bearing no relation to the candidates collection (which the bulk-upload test just grew by 200 without any funnel change); comparison badges ("۲.۱٪ کمتر از میانگین صنعت IT") are fiction; "خروجی استاندارد (JSON/Excel)" downloads the seed metrics JSON (no Excel). No computation exists for any metric — they'd require hire/termination timestamps that are themselves fabricated Jalali strings.

### MOD-02 · High · Executive Dashboard contradicts the rest of the app
"نرخ حضور امروز ۹۶.۸٪" and "۴۲.۵ میلیارد تومان حقوق ماه جاری" are **hardcoded literals** (not even from the metrics object); brand headcounts (420/380/210/180/160) are static; the "Gemini HR Insights — زنده" cards are static marketing copy ("خط بسته‌بندی دافی با راندمان ۹۹٪…") though labeled as automatic live analysis; `metrics.activeHeadcount=1350` vs the Employees module's actual 3–4 rows — the same app shows two mutually exclusive headcounts one click apart.

### MOD-03 · Medium · Performance (Module 5) has no workflow
Any role drags any employee's goal progress (no owner/manager gating; the slider writes immediately via PATCH); `goal.score` (manager evaluation) is never settable — no review, no completion, no overdue handling despite `deadlineJalali`; goal weights aren't validated (sum ≠ 100 silently); `POST /api/performance/goals` defaults `employeeId: 'emp-2'` (goals silently attach to مریم فتاحی when the field is missing).

### MOD-04 · Medium · Training (Module 6) is display-only with a fake action
No course creation/edit endpoints; enrollment button is `alert('ثبت‌نام شما … انجام شد')` — persists nothing (the audit's "button that does nothing"); skill matrix is a static seed array; `completionRate` never changes.

### MOD-05 · Medium · Checklists (Module 7) are event-disconnected with fabricated timestamps
Toggling stamps `completedAtJalali: '۱۴۰۳/۰۶/۱۵'` **hardcoded server-side** (real date ۱۴۰۵) and the UI falls back to the same fake date for display; no checklist is auto-created on hire (REC-04) or resignation; completing OFFBOARDING has no effect (no final settlement, no sanavat payout, no status change, no access revocation); `MobilePersonnelPortal`'s onboarding tab renders a **completely static hardcoded list** with fake done-states, disconnected from real checklist data.

---

## 7. AI Agent Behavioral Bugs

### AIA-01 · Critical · Voice assistant executes irreversible automations on keyword match, without confirmation, and claims completion falsely
`processVoiceCommand` keyword-routes: any sentence containing "حقوق" (also means "rights/law"!) → `RUN_AUTOMATION_PAYROLL`; "مصاحبه"/"رزومه"/"کارجو" → `RUN_AUTOMATION_SCREENING`. `MobileVoiceCall.tsx` L375-378 then calls `onRunAutomation(...)` **immediately — no confirmation step** — and `App.handleRunAutomation` fires the mutating endpoint. Live evidence (P12): the *question* "یک سوال درباره حقوق داشتم" returned `RUN_AUTOMATION_PAYROLL` with reply "فرایند خودکار محاسبه حقوق … **اجرا و در کارتابل پرسنل ثبت شد**" — past-tense completion claim for an action that (a) hadn't run yet and (b) the user never requested. Combined with LEA-04, one ambiguous sentence can mass-approve leave or finalize payroll. This violates the product's own stated policy ("هرگز ارسال/اقدام خودکار بدون تایید").

### AIA-02 · High · Agent responses contradict system data (hallucinated figures)
Voice/chat replies assert "۱۳۵۰ پرسنل", "۴۲۰ نفر در ۳ شیفت، بهره‌وری ۹۶٪", "اتوماسیون سهمیه قانونی را محاسبه کرده" (no such calculation exists — LEA-01); `CHECK_LEAVES` reports `metrics.pendingLeavesCount` (static 7) instead of counting actual pending requests (was 2 during testing). With a real Gemini key, the system prompt's top-12 injection means the model can also confidently describe candidates outside that window.

### AIA-03 · High · Radar/compare views fabricate missing data points
`AIAgentChat.prepareRechartsData` defaults missing criterion scores to **6.5**; `CandidateCompareModal` defaults to `overallScore || 7.0` and invents criterion names when none exist — charts display values found nowhere in the candidate's record, contradicting the detail modal for the same candidate (audit: "scoring contradicts itself between chat and dashboard" — yes, structurally).

### AIA-04 · Medium · Failure path is invisible; fallback model name is fictional
On any Gemini error (incl. no API key — the default deployment state), users get locally fabricated answers with **no "AI unavailable" indication**. `GEMINI_FALLBACK_MODEL = 'gemini-3.8-flash'` is not a real model → the retry always fails too, guaranteeing the silent-fabrication path. Ambiguous/out-of-scope messages get a generic menu response (graceful — the one behavior that's correct).

### AIA-05 · Positive findings (verified, keep as-is)
- Email drafts are strictly `DRAFT_ONLY`; **no send path exists** anywhere (policy honored).
- Leave-approve takes role from server state, not request body (spoofing via body blocked — subject to SEC-02 caveat).
- Bulk-upload store cap evicts oldest bulk records (bounded memory) — though eviction can delete candidates the user just saw (Low, REC-08-adjacent).

---

## 8. Iranian Compliance & Localization (product-level)

### LOC-01 · High · Jalali conversion engine is correct — and completely unused by business logic
Unit-verified (all pass): Nowruz 1403 = 2024-03-20; today 2026-09-07 → 1405-06-16; leap years 1399/1403 ✓, 1404 ✗; Esfand 1403 = 30 days; round-trips stable. **But** the backend stores every date as a pre-formatted Persian-digit *string* (`'۱۴۰۳/۰۶/۱۵'`, and even non-dates like `'امروز - ۱۲:۳۰'`), never parses one, and therefore performs **zero date arithmetic**: no working-day counts for leave, no hire-date proration, no period comparisons (`'abc'` accepted as a leave date — LEA-02), no start<end checks. The conversion quality is irrelevant to correctness because correctness-relevant code never calls it. This is the "silent corruption" class the audit asks about: it can't corrupt conversions — it *skips* them.

### LOC-02 · High · "Today" is fabricated as ۱۴۰۳/۰۶/۱۵ in ~15 write paths
Every new job, candidate, bulk candidate, leave request, email draft, checklist completion, and AI evaluation is stamped `۱۴۰۳/۰۶/۱۵` regardless of the real date (now **۱۴۰۵/۰۶/۱۷**) — while the header renders the *real* today via `getTodayJalali()`. Audit trails, applied-dates (time-to-hire!), and completion timestamps are all wrong-by-construction and internally contradictory on the same screen. Only check-in/out uses the real clock (in the wrong timezone — LEA-08).

### LOC-03 · High · Statutory values are not configurable
26-day cap: frontend constant only. Tax brackets, allowances, SSO 7%, minimum wage: inline literals in `server.ts` (+ contradicting literals in seed slips and UI labels "بخشنامه ۱۴۰۳"). No config entity keyed by Jalali year exists, so the annual circular update (which *does* change every year — verified 1403→1404→1405 deltas in PAY-02/03) requires code edits across ≥3 files. Eidi cap, Art. 56/59/62 premiums, 720-day rule, 9-day carry-over: absent entirely (not even hardcoded).

---

## 9. Decisions Required From the Product Owner (do NOT guess)

| # | Decision | Options | Where it blocks |
|---|---|---|---|
| **D1** | Leave request exceeding remaining balance | (a) hard-block, (b) allow with warning + HR flag, (c) block ANNUAL but allow UNPAID | LEA-01/02 fix design |
| **D2** | Target fiscal year(s) for statutory tables | (a) update everything to **1405** (current), (b) keep 1403 demo data but build per-year config seeded with 1403+1404+1405, (c) config table only, values entered by HR | PAY-02/03, LOC-03 |
| **D3** | Sanavat/Eidi wage base & eidi cap | base-wage-only vs حق‌السعی (housing+bon incl.) per contested rulings; confirm cap = 90 days' min wage | PAY-06/09 |
| **D4** | Behavior when Gemini is unavailable | (a) show fabricated fallback scores (current), (b) explicit "AI offline — manual evaluation" state, (c) queue for retry | REC-05, AIA-04 |
| **D5** | Bulk-upload screening policy | (a) auto-reject <5 (current), (b) never auto-change stage; category badge only, human moves to REJECTED | REC-01 |
| **D6** | SSO insurable base definition | which of housing/bon/child/commute/overtime are insurable (child is clearly exempt by law; commute disputed) | PAY-07 |
| **D7** | Auth model | keep demo role-switcher (then RBAC fixes are UI+server-default only) vs. per-session auth with user↔employee link | SEC-01/02/03, LEA-03 |

---

## 10. Severity Roll-up & Recommended Fix Order

**Critical (15):** PAY-01 (tax double-exemption), PAY-02 (outdated/incomplete brackets), PAY-03 (stale statutory constants, missing mandatory items), PAY-04 (no proration/status-filter/period-lock), PAY-12 (payroll open to all roles), LEA-01 (no balance model), LEA-02 (no request validation), LEA-03 (wrong-employee attribution), LEA-04 (mass-approve automation), REC-01 (RNG scores + auto-rejection), REC-02 (no resume text extraction), SEC-01 (no API authorization), SEC-02 (unauthenticated global role), SEC-05 (no persistence), AIA-01 (voice auto-executes irreversible actions).
**High (19):** PAY-05…PAY-08 (fake overtime, uncapped eidi, SSO base, child-allowance conditions), LEA-05, LEA-06 (false-success error handling), REC-03…REC-06 (no stage gates, hire dead-end, fabricated evaluation fallbacks, stateless chat/unhandled tools), SEC-03, SEC-04 (UI gating absent, no dept scoping), MOD-01, MOD-02 (fake-complete analytics/dashboard), AIA-02, AIA-03 (contradicting figures/fabricated chart data), LOC-01…LOC-03 (date logic unused, fabricated timestamps, non-configurable statutes).
**Medium (16):** PAY-09…PAY-11, LEA-07…LEA-09, REC-07…REC-10, SEC-06, SEC-07, MOD-03…MOD-05, AIA-04.
**Low (1):** REC-11 (unlabeled competitor simulators) — plus minor seed-data inconsistencies noted inline (att-1 overtime seed, radar-fallback cosmetics, eviction surprises, duplicate `vite` dep).

**Proposed remediation sequence** (highest business risk first, per the audit mandate):
1. **Stop the bleeding on money & access:** PAY-01 (double exemption — fixable without decisions), SEC-01 + PAY-12 + SEC-03 (role gates on payroll/employee/analytics APIs and UI), LEA-04 + AIA-01 (confirmation + role check on automations; stop voice auto-execution).
2. **Make leave lawful:** LEA-02/03 input validation & attribution; LEA-01 balance engine (needs D1 only for the over-balance policy; accrual/deduction themselves are unambiguous).
3. **Make payroll lawful & year-aware:** config table per D2/D3/D6 → PAY-02/03/06/07/08; proration + status filter + period lock (PAY-04); overtime from attendance ×1.4 (PAY-05).
4. **Make recruitment honest:** REC-01/02/05 (no RNG scores; label fallbacks per D4; extract text or reject the file), REC-03/04 (stage gates + hire→employee/checklist handoff).
5. **Truth in reporting:** MOD-01/02 computed metrics or honest "demo data" labeling; LOC-02 real timestamps; LEA-06 res.ok handling across App.tsx.
6. **Structural:** SEC-05 persistence decision, SEC-06/07 employee lifecycle, remaining Mediums.

*Constraint compliance note:* no business rule will be silently changed — PAY-01/LEA-02/LEA-04/SEC-01-class fixes restore *intended* behavior; anything touching statutory numbers waits on D2/D3/D6; D5 changes a policy the product currently enforces wrongly-but-deliberately.

---

## Appendix A — Evidence harness
`scripts/product_audit_probes.cjs` (added by this audit): 20 reproducible probes (P1–P20) against `localhost:3000`; outputs referenced throughout as "(P#)". Safe to re-run; mutates only the in-memory store. Jalali unit checks were run ad-hoc via `npx tsx` (all pass — LOC-01).

## Appendix B — Key statutory references used
- Annual leave 26 working days incl. 4 Fridays (Art. 64 Labor Law); carry-over cap 9 days (Art. 66); marriage/bereavement 3 days (Art. 73); sick-leave SSO path (Art. 74) — [parsikhesab](https://parsikhesab.com/types-of-employee-leave/), [bizyar](https://www.bizyar.com/fa/news/show/حقوق-1403)
- Overtime +40% (Art. 59), OT caps/consent (Art. 60), shift premiums 10/15/22.5% (Art. 56), Friday premium (Art. 62)
- Eidi: 60 days' wage min, 90 days' minimum-wage max (ماده‌واحده قانون عیدی و پاداش) — [e-estekhdam](https://www.e-estekhdam.com/حداقل-عیدی-کارگران-در-سال-۱۴۰۵-چقدر-است)
- Sanavat: Art. 24; حق‌السعی vs base-wage dispute — [ilna](https://www.ilna.ir/بخش-کارگری-9/1132557)
- Child allowance conditions: 720 days SSO history, child <18/studying (Art. 86 Social Security Law)
- Wage circulars 1403/1404/1405 (min wage, housing, bon, child, seniority base, marriage allowance) — [e-estekhdam tables](https://www.e-estekhdam.com/salary)
- Salary tax tables: 1403 (exempt 12M/mo) — [asriran](https://www.asriran.com/fa/news/953883); 1404 (exempt 24M/mo, 10–30%) — [kartaban](https://kartaban.com/blog/salary/salary-tax/); 1405 (exempt 40M/mo) — [heyvalaw](https://www.heyvalaw.com/web/articles/view/5430/معافیت-مالیات-حقوق.html)

---

## Appendix C — FIXES APPLIED (remediation pass, 1405-06-17)

Status of every finding after the fix pass. Verified by `scripts/product_fix_verification.cjs` (**47/47 green** on a fresh store) and `scripts/strict_e2e_test.cjs` (7/7), plus `npx tsc --noEmit` clean and `npm run build` (see below).

### C.1 Fix architecture (applies across findings)
- **Single source of truth for "today":** `server/tehran-time.ts` (Asia/Tehran → Jalali); every write-path timestamp derives from it (LOC-02/03, LEA-08, MOD-05).
- **Statutory config by year:** `server/statutory.ts` holds 1403/1404/1405 tax tables, wage constants, SSO rates, eidi caps. Unconfigured year → 400 with the list of supported years (PAY-02/03, LOC-03, per D2).
- **Leave balance is DERIVED**, never stored: entitlement 26 working days + ≤9 carry-over, minus approved/pending usage, computed per request in `server/leave-service.ts` (LEA-01). Annual over-quota → 400 block; UNPAID uncapped; SICK routed as SSO matter and quota-neutral; MARRIAGE/BEREAVEMENT capped at 3 days (LEA-02/07, D1).
- **Payroll lifecycle enforced server-side:** DRAFT → FINALIZED → PAID; FINALIZED regeneration requires explicit `force`; PAID periods locked (409); RESIGNED excluded; per-day proration from Jalali hire/leave dates; overtime 1.4× from real attendance records (PAY-04/05/10).
- **SSO/eidi/child rules:** child allowance excluded from the 7% base and conditional on 720-day SSO history + child <18 (PAY-07/08, D6); eidi capped at 3× min monthly wage of the year, prorated by service (PAY-06).
- **Server-enforced RBAC on every endpoint:** role via `x-user-role` (demo switcher kept per D7); EMPLOYEE = own records only, PII-sanitized roster; DEPT_MANAGER = own department; payroll generation/automation/deletions HR-only; company financial metrics redacted to `null` for non-HR (SEC-01/02/03/04, PAY-12, LEA-03/05).
- **Persistence:** JSON snapshot `data/hrms-store.json` (debounced + interval + on-exit). Prisma schema remains reference-only — documented honestly in README (SEC-05). *Decision still open: a real database was out of scope for this pass.*
- **No irreversible action without confirmation:** automations require HR_DIRECTOR + explicit `confirm:true`; voice assistant states that confirmation is required and never claims an action was executed; UI mutation handlers use confirm dialogs (AIA-01, LEA-04).
- **Honest AI surfaces:** fallback scoring labeled `aiAvailable:false` with a visible "local engine (no Gemini)" disclaimer; empty resume → 400 (no 7.0); bulk upload requires real files with genuinely extracted text (client-side PDF/DOCX/TXT/ZIP extraction — merged from upstream PR #5) → real evaluation at upload, no RNG, no auto-reject, no fabricated identities; chat keeps conversation memory and executes declared tools; rejection drafts only for a named candidate; radar/compare emit `null` gaps instead of fabricated 0s (REC-01/02/05/06/07, AIA-02/03/04, D4).
- **Recruitment gates:** illegal stage jumps → 409; HIRED requires a completed evaluation; HIRED hands off to a real employee record (zero salary until set — payroll honestly skips with a reason) + onboarding checklist (REC-03/04, D5).
- **Client honesty principle:** no fabricated KPIs or fallback identities anywhere (`|| 1350`, fake national IDs, hardcoded "۹۶.۸٪", etc. all removed); null → «—»; analytics funnel computed from live candidates with a planning-KPI note (MOD-01/02).

### C.2 Status by finding
| Fixed | Partial / provisional | Not addressed (honest gaps) |
|---|---|---|
| PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, PAY-10, PAY-11, PAY-12 · LEA-01…LEA-09 · REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08, REC-09, REC-11 · SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07 · AIA-01, AIA-02, AIA-03, AIA-04 · MOD-01, MOD-02, MOD-03, MOD-04, MOD-05 · LOC-01, LOC-02, LOC-03 | **PAY-09** — sanavat base kept base-only per D3 provisional default; the حق‌السعی vs base-wage dispute remains a product-owner decision. | **REC-10** — interview scheduling remains a client-side calendar; no server endpoint, no double-booking/conflict detection (Medium). **Business-day calendar** — working-day math excludes Fridays only; official holiday calendar not implemented (flagged in report). **Real authentication** — role switcher is a demo device; server enforces scope but there is no login/session system. **Real database** — JSON snapshot only. |

> **Upstream merge note (1405-06-17):** PR #5 (`fix/real-resume-screening`) landed on `main` while this remediation was in flight. It was merged into this branch; conflicts were resolved preserving both intents — their real client-side extraction + real AI scoring, and this pass's guards (HR-only RBAC, Tehran timestamps, `aiAvailable:false` labeling per D4, no auto-stage-moves per D5, no fabricated emails/phones per REC-08). This closes **REC-02** (previously partial: binary PDF/DOCX extraction).

### C.3 Provisional defaults awaiting product-owner confirmation (D1–D7)
These were adopted to unblock the fixes and are **documented, reversible configuration/policy choices — not silent rule changes**:
- **D1:** over-quota ANNUAL leave → blocked (statutory 26-day cap); UNPAID uncapped.
- **D2:** payroll generation limited to configured years (1403/1404/1405).
- **D3:** sanavat reserve base = base pay only (legal dispute flagged, unchanged).
- **D4:** offline scoring kept but labeled `aiAvailable:false`; empty resume → 400.
- **D5:** AI never auto-moves pipeline stages (badges/suggestions only); simulations labeled.
- **D6:** child allowance excluded from SSO base; housing/bon/seniority/marriage/OT insurable; commute excluded.
- **D7:** demo role-switcher kept; server enforces role scope; session employee = emp-1.

### C.4 Residual risks
1. Snapshot persistence is single-process; concurrent writers or crashes between debounce windows can lose the last seconds of mutations.
2. No holiday calendar → working-day counts slightly over-count leave days falling on official holidays.
3. Tax/wage constants for 1406+ must be added to `server/statutory.ts` when published; generation refuses unconfigured years by design.
4. Gemini-backed scoring quality is untestable in this environment (no API key); fallback path is fully verified instead.
