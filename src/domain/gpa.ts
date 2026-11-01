import type { ScaleEntry } from "./grading";

export interface GradedCourse {
  courseId: number;
  credits: number;
  letter: string;
  /** Sortable term key, e.g. 2025 * 10 + season index. Later attempts win for CGPA. */
  termKey: number;
}

interface GpaResult {
  gpa: number | null;
  credits: number; // credits counted in the GPA
  earnedCredits: number; // credits from passed courses
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function compute(courses: GradedCourse[], scale: ScaleEntry[]): GpaResult {
  const byLetter = new Map(scale.map((s) => [s.letter, s]));
  let points = 0;
  let credits = 0;
  let earned = 0;
  for (const c of courses) {
    const entry = byLetter.get(c.letter);
    if (!entry) continue;
    if (entry.isPassing) earned += c.credits;
    if (!entry.countsInGpa || entry.points == null) continue;
    points += entry.points * c.credits;
    credits += c.credits;
  }
  return { gpa: credits ? round2(points / credits) : null, credits, earnedCredits: earned };
}

/** GPA for a single term: every graded course counts. */
export function termGpa(courses: GradedCourse[], scale: ScaleEntry[]): GpaResult {
  return compute(courses, scale);
}

/** Cumulative GPA: a repeated course only counts its most recent attempt. */
export function cumulativeGpa(courses: GradedCourse[], scale: ScaleEntry[]): GpaResult {
  const latest = new Map<number, GradedCourse>();
  for (const c of courses) {
    const prev = latest.get(c.courseId);
    if (!prev || c.termKey > prev.termKey) latest.set(c.courseId, c);
  }
  return compute([...latest.values()], scale);
}

export type Standing = "GOOD" | "HONOR" | "HIGH_HONOR" | "PROBATION" | "NEW";

/**
 * Academic standing. Honors look at the term GPA and require no failed course
 * that term; probation looks at the cumulative GPA.
 */
export function standing(opts: {
  cgpa: number | null;
  lastTermGpa: number | null;
  failedLastTerm: boolean;
  probationBelow: number;
}): Standing {
  const { cgpa, lastTermGpa, failedLastTerm, probationBelow } = opts;
  if (cgpa == null) return "NEW";
  if (cgpa < probationBelow) return "PROBATION";
  if (lastTermGpa != null && !failedLastTerm) {
    if (lastTermGpa >= 3.5) return "HIGH_HONOR";
    if (lastTermGpa >= 3.0) return "HONOR";
  }
  return "GOOD";
}

/** What average is needed on the remaining weight to reach a target percentage. */
export function neededOnRemaining(opts: {
  earnedWeighted: number; // percentage points already earned (0-100 scale)
  remainingWeight: number; // weight still to be graded
  target: number;
}): number | null {
  const { earnedWeighted, remainingWeight, target } = opts;
  if (remainingWeight <= 0) return null;
  return round2(((target - earnedWeighted) / remainingWeight) * 100);
}
