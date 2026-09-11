/**
 * Prisma client singleton for the Supabase Postgres database.
 *
 * IMPORTANT: this module must never crash the process at import time.
 * If DATABASE_URL is not set (e.g. it hasn't been configured on Render
 * yet), `prisma` stays `null` and every caller falls back to the
 * in-memory store instead of throwing on boot. This is what caused the
 * earlier deploy crash (dead PrismaClient instantiation) — we don't
 * repeat that mistake now that Prisma is actually wired up for real.
 */
import { PrismaClient } from '@prisma/client';

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

let client: PrismaClient | null = null;
if (isDatabaseConfigured) {
  try {
    client = new PrismaClient();
  } catch (err) {
    console.warn('[db] Failed to instantiate PrismaClient — falling back to in-memory store:', err);
    client = null;
  }
}

export const prisma: PrismaClient | null = client;

if (!isDatabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '[db] DATABASE_URL is not set — running on the in-memory store only. ' +
    'Employee data will NOT be persisted to Supabase until DATABASE_URL is configured.'
  );
}
