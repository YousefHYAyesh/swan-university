export interface RequiredCourse {
  courseId: number;
  code: string;
  title: string;
  credits: number;
  semester: number;
}

export interface CourseAttempt {
  courseId: number;
  code: string;
  credits: number;
  /** Approved letter, or null while in progress. */
  letter: string | null;
  passed: boolean;
}

export type RequirementState = "DONE" | "IN_PROGRESS" | "FAILED" | "NOT_TAKEN";

export interface DegreeAudit {
  core: (RequiredCourse & { state: RequirementState; letter: string | null })[];
  coreDone: number;
  electiveCreditsEarned: number;
  electiveCreditsRequired: number;
  totalCreditsEarned: number;
  totalCreditsRequired: number;
  cgpa: number | null;
  minCgpa: number;
  /** Credits from courses currently in progress, if all are passed. */
  creditsInProgress: number;
  percentComplete: number;
  eligible: boolean;
  missing: string[];
}

/**
 * Checks a student's record against their program: every core course passed,
 * enough elective credits, enough total credits, and a minimum CGPA.
 */
export function degreeAudit(input: {
  required: RequiredCourse[];
  attempts: CourseAttempt[];
  totalCreditsRequired: number;
  electiveCreditsRequired: number;
  cgpa: number | null;
  minCgpa: number;
}): DegreeAudit {
  const { required, attempts, totalCreditsRequired, electiveCreditsRequired, cgpa, minCgpa } = input;
  const requiredIds = new Set(required.map((r) => r.courseId));

  // One entry per course: passed beats in-progress beats failed.
  const best = new Map<number, CourseAttempt>();
  const rank = (a: CourseAttempt) => (a.passed ? 3 : a.letter == null ? 2 : 1);
  for (const a of attempts) {
    const prev = best.get(a.courseId);
    if (!prev || rank(a) > rank(prev)) best.set(a.courseId, a);
  }

  const core = required
    .map((r) => {
      const a = best.get(r.courseId);
      const state: RequirementState = !a ? "NOT_TAKEN" : a.passed ? "DONE" : a.letter == null ? "IN_PROGRESS" : "FAILED";
      return { ...r, state, letter: a?.letter ?? null };
    })
    .sort((x, y) => x.semester - y.semester || x.code.localeCompare(y.code));

  let electiveCreditsEarned = 0;
  let totalCreditsEarned = 0;
  let creditsInProgress = 0;
  for (const a of best.values()) {
    if (a.passed) {
      totalCreditsEarned += a.credits;
      if (!requiredIds.has(a.courseId)) electiveCreditsEarned += a.credits;
    } else if (a.letter == null) creditsInProgress += a.credits;
  }

  const coreDone = core.filter((c) => c.state === "DONE").length;
  const missing: string[] = [];
  const coreLeft = core.length - coreDone;
  if (coreLeft) missing.push(`${coreLeft} required course${coreLeft === 1 ? "" : "s"}`);
  if (electiveCreditsEarned < electiveCreditsRequired) missing.push(`${electiveCreditsRequired - electiveCreditsEarned} elective credits`);
  if (totalCreditsEarned < totalCreditsRequired) missing.push(`${totalCreditsRequired - totalCreditsEarned} credits in total`);
  if (cgpa == null || cgpa < minCgpa) missing.push(`a cumulative GPA of at least ${minCgpa.toFixed(2)}`);

  return {
    core,
    coreDone,
    electiveCreditsEarned,
    electiveCreditsRequired,
    totalCreditsEarned,
    totalCreditsRequired,
    cgpa,
    minCgpa,
    creditsInProgress,
    percentComplete: totalCreditsRequired ? Math.min(100, Math.round((totalCreditsEarned / totalCreditsRequired) * 100)) : 0,
    eligible: missing.length === 0,
    missing,
  };
}
