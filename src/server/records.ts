import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { enrollments, holds, students } from "@/db/schema";
import { cumulativeGpa, standing, termGpa, type GradedCourse, type Standing } from "@/domain/gpa";
import { currentPercent } from "@/domain/grading";
import { termKey } from "@/lib/utils";
import { getScale } from "./academic";
import { getSettings } from "./settings";

export async function getStudent(userId: number) {
  return db.query.students.findFirst({
    where: eq(students.userId, userId),
    with: {
      user: true,
      program: { with: { department: true } },
      advisor: { with: { user: true } },
    },
  });
}

export type StudentWithUser = NonNullable<Awaited<ReturnType<typeof getStudent>>>;

/** Every enrollment with its section, course, term, assessments and scores. */
export async function getEnrollmentHistory(studentId: number) {
  return db.query.enrollments.findMany({
    where: eq(enrollments.studentId, studentId),
    with: {
      scores: true,
      section: {
        with: {
          term: true,
          course: true,
          instructor: { with: { user: true } },
          assessments: { orderBy: (a, { asc }) => [asc(a.position)] },
          meetings: true,
        },
      },
    },
  });
}

type EnrollmentRow = Awaited<ReturnType<typeof getEnrollmentHistory>>[number];

export interface TermRecord {
  term: EnrollmentRow["section"]["term"];
  rows: (EnrollmentRow & { runningPercent: number | null; weightCovered: number })[];
  gpa: number | null;
  credits: number;
  earnedCredits: number;
  /** Cumulative GPA as of the end of this term. */
  cgpa: number | null;
  graded: boolean;
}

export interface AcademicSummary {
  terms: TermRecord[];
  cgpa: number | null;
  attemptedCredits: number;
  earnedCredits: number;
  standing: Standing;
  passedCourseIds: Set<number>;
  /** Latest approved letter per course. */
  completed: Map<number, string>;
}

/**
 * Builds the transcript view of a student's history. Only grades the registrar
 * has approved count towards GPA; the current term shows running percentages.
 */
export async function academicSummary(studentId: number): Promise<AcademicSummary> {
  const [history, scale, settings] = await Promise.all([getEnrollmentHistory(studentId), getScale(), getSettings()]);
  const byTerm = new Map<number, TermRecord>();
  const allGraded: GradedCourse[] = [];
  const passingLetters = new Set(scale.filter((g) => g.isPassing).map((g) => g.letter));
  const passedCourseIds = new Set<number>();
  const completed = new Map<number, string>();

  const sorted = [...history].sort((a, b) => termKey(a.section.term) - termKey(b.section.term));
  for (const e of sorted) {
    if (e.status === "DROPPED") continue;
    const term = e.section.term;
    const record =
      byTerm.get(term.id) ??
      ({ term, rows: [], gpa: null, credits: 0, earnedCredits: 0, cgpa: null, graded: false } as TermRecord);
    const scoreMap = new Map(e.scores.map((s) => [s.assessmentId, s.score]));
    const running = currentPercent(e.section.assessments, scoreMap);
    record.rows.push({ ...e, runningPercent: running.percent, weightCovered: running.weightCovered });
    byTerm.set(term.id, record);

    const approved = e.section.gradeStatus === "APPROVED" && e.letterGrade;
    const letter = e.status === "WITHDRAWN" ? "W" : approved ? e.letterGrade : null;
    if (letter) {
      allGraded.push({ courseId: e.section.courseId, credits: e.section.course.credits, letter, termKey: termKey(term) });
      if (passingLetters.has(letter)) passedCourseIds.add(e.section.courseId);
      if (letter !== "W") completed.set(e.section.courseId, letter);
    }
  }

  const terms = [...byTerm.values()];
  for (const t of terms) {
    const key = termKey(t.term);
    const graded = t.rows
      .filter((r) => r.section.gradeStatus === "APPROVED" && r.letterGrade)
      .map((r) => ({ courseId: r.section.courseId, credits: r.section.course.credits, letter: r.letterGrade!, termKey: key }));
    const g = termGpa(graded, scale);
    Object.assign(t, { gpa: g.gpa, credits: g.credits, earnedCredits: g.earnedCredits, graded: graded.length > 0 });
    t.cgpa = cumulativeGpa(allGraded.filter((c) => c.termKey <= key), scale).gpa;
  }

  const cum = cumulativeGpa(allGraded, scale);
  const lastGraded = [...terms].reverse().find((t) => t.graded);
  const failedLast =
    lastGraded?.rows.some((r) => r.letterGrade && !passingLetters.has(r.letterGrade) && r.letterGrade !== "W") ?? false;

  return {
    terms: terms.reverse(),
    cgpa: cum.gpa,
    attemptedCredits: cum.credits,
    earnedCredits: cum.earnedCredits,
    passedCourseIds,
    completed,
    standing: standing({
      cgpa: cum.gpa,
      lastTermGpa: lastGraded?.gpa ?? null,
      failedLastTerm: failedLast,
      probationBelow: settings.probationBelow,
    }),
  };
}

export async function activeHolds(studentId: number) {
  return db.query.holds.findMany({
    where: and(eq(holds.studentId, studentId), isNull(holds.releasedAt)),
    orderBy: (h, { desc }) => [desc(h.createdAt)],
  });
}

export const STANDING_LABEL: Record<Standing, { label: string; tone: "lake" | "ok" | "amber" | "danger" | "neutral" }> = {
  NEW: { label: "No graded terms yet", tone: "neutral" },
  GOOD: { label: "Good standing", tone: "lake" },
  HONOR: { label: "Honor student", tone: "ok" },
  HIGH_HONOR: { label: "High honor student", tone: "ok" },
  PROBATION: { label: "Academic probation", tone: "danger" },
};
