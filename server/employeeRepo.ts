/**
 * Phase 1 of the Supabase persistence work: real Prisma-backed CRUD for
 * the Employee entity, translated to/from the app's `Employee` shape
 * (src/types/index.ts) so the rest of the codebase (server.ts,
 * server/store.ts) doesn't need to know Prisma exists.
 *
 * Every function here is safe to call even when the database isn't
 * configured — they throw a clear error that callers catch and fall
 * back on, rather than crashing the process.
 */
import { prisma, isDatabaseConfigured } from './db';
import type { Employee, EmployeeDocument, JobHistoryItem } from '../src/types';

function assertDb() {
  if (!prisma) throw new Error('DATABASE_URL is not configured — Supabase persistence is unavailable');
}

type PrismaEmployee = Awaited<ReturnType<NonNullable<typeof prisma>['employee']['findFirst']>>;

function toDocument(d: any): EmployeeDocument {
  return {
    id: d.id,
    title: d.title,
    fileType: d.fileType,
    fileUrl: d.fileUrl,
    uploadedAtJalali: d.uploadedAt,
  };
}

function toJobHistory(h: any): JobHistoryItem {
  return {
    id: h.id,
    changeType: h.changeType,
    previousTitle: h.previousTitle,
    newTitle: h.newTitle,
    effectiveDateJalali: h.effectiveDate,
    description: h.description ?? '',
  };
}

/** Maps a Prisma Employee row (with documents/jobHistories included) to the app's Employee shape. */
export function toEmployee(row: any): Employee {
  return {
    id: row.id,
    personnelCode: row.personnelCode,
    nationalId: row.nationalId,
    fullName: row.fullName,
    fatherName: row.fatherName ?? undefined,
    birthDateJalali: row.birthDateJalali ?? '',
    phone: row.phone,
    email: row.email,
    department: row.department,
    jobTitle: row.jobTitle,
    hireDateJalali: row.hireDateJalali,
    baseSalaryToman: Number(row.baseSalaryToman),
    maritalStatus: row.maritalStatus,
    childrenCount: row.childrenCount,
    bankIban: row.bankIban ?? '',
    directManagerId: row.directManagerId ?? undefined,
    status: row.status,
    avatarUrl: row.avatarUrl ?? undefined,
    documents: (row.documents ?? []).map(toDocument),
    jobHistories: (row.jobHistories ?? []).map(toJobHistory),
    ssoContributionDays: row.ssoContributionDays,
    commuteAllowanceToman: Number(row.commuteAllowanceToman),
  };
}

const include = { documents: true, jobHistories: true } as const;

export async function loadAllEmployees(): Promise<Employee[]> {
  assertDb();
  const rows = await prisma!.employee.findMany({ include, orderBy: { createdAt: 'asc' } });
  return rows.map(toEmployee);
}

export async function countEmployees(): Promise<number> {
  assertDb();
  return prisma!.employee.count();
}

/** One-time migration of the in-memory demo data into an empty Supabase table. */
export async function seedEmployees(employees: Employee[]): Promise<void> {
  assertDb();
  for (const e of employees) {
    await prisma!.employee.create({
      data: {
        id: e.id,
        personnelCode: e.personnelCode,
        nationalId: e.nationalId,
        fullName: e.fullName,
        fatherName: e.fatherName,
        birthDateJalali: e.birthDateJalali,
        phone: e.phone,
        email: e.email,
        department: e.department,
        jobTitle: e.jobTitle,
        hireDateJalali: e.hireDateJalali,
        baseSalaryToman: BigInt(Math.round(e.baseSalaryToman)),
        maritalStatus: e.maritalStatus,
        childrenCount: e.childrenCount,
        bankIban: e.bankIban,
        directManagerId: e.directManagerId,
        status: e.status,
        avatarUrl: e.avatarUrl,
        ssoContributionDays: e.ssoContributionDays ?? 0,
        commuteAllowanceToman: BigInt(Math.round(e.commuteAllowanceToman ?? 0)),
        documents: {
          create: (e.documents ?? []).map(d => ({
            id: d.id,
            title: d.title,
            fileType: d.fileType,
            fileUrl: d.fileUrl,
            uploadedAt: d.uploadedAtJalali,
          })),
        },
        jobHistories: {
          create: (e.jobHistories ?? []).map(h => ({
            id: h.id,
            changeType: h.changeType,
            previousTitle: h.previousTitle,
            newTitle: h.newTitle,
            effectiveDate: h.effectiveDateJalali,
            description: h.description,
          })),
        },
      },
    });
  }
}

export async function createEmployeeInDb(e: Employee): Promise<void> {
  assertDb();
  await prisma!.employee.create({
    data: {
      id: e.id,
      personnelCode: e.personnelCode,
      nationalId: e.nationalId,
      fullName: e.fullName,
      fatherName: e.fatherName,
      birthDateJalali: e.birthDateJalali,
      phone: e.phone,
      email: e.email,
      department: e.department,
      jobTitle: e.jobTitle,
      hireDateJalali: e.hireDateJalali,
      baseSalaryToman: BigInt(Math.round(e.baseSalaryToman)),
      maritalStatus: e.maritalStatus,
      childrenCount: e.childrenCount,
      bankIban: e.bankIban,
      directManagerId: e.directManagerId,
      status: e.status,
      avatarUrl: e.avatarUrl,
      ssoContributionDays: e.ssoContributionDays ?? 0,
      commuteAllowanceToman: BigInt(Math.round(e.commuteAllowanceToman ?? 0)),
      jobHistories: {
        create: (e.jobHistories ?? []).map(h => ({
          id: h.id,
          changeType: h.changeType,
          previousTitle: h.previousTitle,
          newTitle: h.newTitle,
          effectiveDate: h.effectiveDateJalali,
          description: h.description,
        })),
      },
    },
  });
}

/** Applies a partial patch (same shape server.ts's PATCH handler already builds) to the DB row. */
export async function updateEmployeeInDb(id: string, patch: Partial<Employee>, newJobHistory?: JobHistoryItem): Promise<void> {
  assertDb();
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === 'baseSalaryToman') data.baseSalaryToman = BigInt(Math.round(value as number));
    else if (key === 'commuteAllowanceToman') data.commuteAllowanceToman = BigInt(Math.round(value as number));
    else if (key === 'documents' || key === 'jobHistories') continue; // handled separately
    else data[key] = value;
  }
  if (newJobHistory) {
    data.jobHistories = {
      create: [{
        id: newJobHistory.id,
        changeType: newJobHistory.changeType,
        previousTitle: newJobHistory.previousTitle,
        newTitle: newJobHistory.newTitle,
        effectiveDate: newJobHistory.effectiveDateJalali,
        description: newJobHistory.description,
      }],
    };
  }
  await prisma!.employee.update({ where: { id }, data });
}

export async function deleteEmployeeInDb(id: string): Promise<void> {
  assertDb();
  await prisma!.employee.delete({ where: { id } });
}
