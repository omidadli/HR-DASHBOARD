import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HR database with Persian/IR data...');

  // Module 1: JobPosting seed (from server/store.ts patterns)
  const job = await prisma.jobPosting.upsert({
    where: { id: 'seed-job-1' },
    update: {},
    create: {
      id: 'seed-job-1',
      title: 'کارشناس ارشد منابع انسانی',
      department: 'منابع انسانی',
      employmentType: 'تمام‌وقت',
      location: 'تهران - ستاد مرکزی',
      description: 'مدیریت فرآیندهای جذب و استخدام',
      requirements: 'تجربه ۵ ساله در HR',
      status: 'ACTIVE',
      createdAtJalali: '۱۴۰۳/۰۶/۱۵',
    },
  });

  // Module 2: Candidate seed
  await prisma.candidate.upsert({
    where: { id: 'seed-cand-1' },
    update: {},
    create: {
      id: 'seed-cand-1',
      jobId: job.id,
      fullName: 'سارا احمدی',
      email: 'sara.ahmadi@example.com',
      phone: '09121234567',
      resumeFileName: 'cv_sara.pdf',
      resumeText: 'تجربه ۳ ساله در HR و recrutement',
      stage: 'INITIAL_SCREENING',
      inTalentPool: false,
      appliedAtJalali: '۱۴۰۳/۰۶/۲۰',
    },
  });

  // Module 2: Employee seed
  await prisma.employee.upsert({
    where: { id: 'seed-emp-1' },
    update: {},
    create: {
      id: 'seed-emp-1',
      personnelCode: '۱۰۰۱',
      nationalId: '0012345678',
      fullName: 'محمد رضایی',
      phone: '09119876543',
      email: 'mohammad.rezaei@company.ir',
      department: 'فناوری اطلاعات',
      jobTitle: 'توسعه‌دهنده ارشد',
      hireDateJalali: '۱۴۰۱/۰۳/۱۰',
      baseSalaryToman: BigInt(85000000),
      maritalStatus: 'MARRIED',
      childrenCount: 2,
      bankIban: 'IR123456789012345678901234',
      status: 'ACTIVE',
    },
  });

  // Module 3: Attendance seed
  await prisma.attendanceRecord.upsert({
    where: { id: 'seed-att-1' },
    update: {},
    create: {
      id: 'seed-att-1',
      employeeId: 'seed-emp-1',
      dateJalali: '۱۴۰۳/۰۶/۱۵',
      checkIn: '۰۸:۱۵',
      checkOut: '۱۷:۰۰',
      delayMinutes: 0,
      overtimeHours: 0.5,
      status: 'PRESENT',
    },
  });

  // Module 4: LeaveRequest seed
  await prisma.leaveRequest.upsert({
    where: { id: 'seed-leave-1' },
    update: {},
    create: {
      id: 'seed-leave-1',
      employeeId: 'seed-emp-1',
      leaveType: 'ANNUAL',
      startDateJalali: '۱۴۰۳/۰۶/۲۰',
      endDateJalali: '۱۴۰۳/۰۶/۲۵',
      daysCount: 5,
      reason: 'مرخصی استحقاقی سالانه',
      status: 'PENDING_MANAGER',
      createdAtJalali: '۱۴۰۳/۰۶/۱۵',
    },
  });

  // Module 4: PayrollSlip seed
  await prisma.payrollSlip.upsert({
    where: { id: 'seed-pay-1' },
    update: {},
    create: {
      id: 'seed-pay-1',
      employeeId: 'seed-emp-1',
      monthJalali: 6,
      yearJalali: 1403,
      baseSalary: BigInt(85000000),
      housingAllowance: BigInt(9000000),
      bonKargari: BigInt(14000000),
      childAllowance: BigInt(7166180),
      commuteAllowance: BigInt(20000000),
      overtimePay: BigInt(0),
      grossSalary: BigInt(135166180),
      ssoInsurance7Pct: BigInt(9461632),
      incomeTax: BigInt(5000000),
      otherDeductions: BigInt(0),
      netSalary: BigInt(120704548),
      sanavatReserve: BigInt(7083333),
      eidiReserve: BigInt(14166666),
      status: 'DRAFT',
    },
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
