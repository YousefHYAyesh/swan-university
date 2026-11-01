import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

export async function isLockedOut(email: string) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [row] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  return row.failures >= MAX_FAILURES;
}

export async function recordAttempt(email: string, ip: string | null, success: boolean) {
  await db.insert(loginAttempts).values({ email, ip, success });
}
