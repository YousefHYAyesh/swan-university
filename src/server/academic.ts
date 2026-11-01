import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db";
import { gradeScale, terms } from "@/db/schema";
import type { ScaleEntry } from "@/domain/grading";

export const getCurrentTerm = cache(async () => {
  return (await db.query.terms.findFirst({ where: eq(terms.isCurrent, true) })) ?? null;
});

export const getScale = cache(async (): Promise<(ScaleEntry & { description: string | null; position: number })[]> => {
  return db.select().from(gradeScale).orderBy(asc(gradeScale.position));
});

/** Week number within the term, or null outside it. */
export function termWeek(term: { startsOn: string; endsOn: string }, today = new Date()) {
  const start = new Date(term.startsOn).getTime();
  const end = new Date(term.endsOn).getTime();
  const now = today.getTime();
  if (now < start || now > end) return null;
  return Math.floor((now - start) / (7 * 86_400_000)) + 1;
}
