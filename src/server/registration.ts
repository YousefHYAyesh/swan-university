import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { coursePrerequisites, courses, enrollments, holds, sections, students } from "@/db/schema";
import { registrationProblems, type RegistrationContext, type SectionForRegistration } from "@/domain/registration";
import { todayIso } from "@/lib/utils";
import { getCurrentTerm } from "./academic";
import { academicSummary } from "./records";
import { getSettings } from "./settings";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Everything needed to check a registration for one student in the current term. */
export async function buildContext(tx: Tx | typeof db, studentId: number, termId: number) {
  const [student, term, settings, summary, holdRows, mine] = await Promise.all([
    tx.query.students.findFirst({ where: eq(students.userId, studentId) }),
    getCurrentTerm(),
    getSettings(),
    academicSummary(studentId),
    tx.select({ id: holds.id }).from(holds).where(and(eq(holds.studentId, studentId), eq(holds.type, "REGISTRATION"), isNull(holds.releasedAt))),
    tx.query.enrollments.findMany({
      where: and(eq(enrollments.studentId, studentId), eq(enrollments.status, "REGISTERED")),
      with: { section: { with: { course: true, meetings: true } } },
    }),
  ]);
  if (!student || !term) throw new Error("Missing student or term");
  const current = mine
    .filter((e) => e.section.termId === termId)
    .map((e) => ({
      enrollmentId: e.id,
      sectionId: e.sectionId,
      courseId: e.section.courseId,
      courseCode: e.section.course.code,
      credits: e.section.course.credits,
      meetings: e.section.meetings,
    }));
  const ctx: RegistrationContext = {
    today: todayIso(),
    window: { opensOn: term.registrationOpensOn, closesOn: term.registrationClosesOn },
    studentStatus: student.status,
    hasRegistrationHold: holdRows.length > 0,
    passedCourseIds: summary.passedCourseIds,
    completed: summary.completed,
    current,
    maxCredits: settings.maxCreditsPerTerm,
  };
  return { ctx, current, term };
}

/** Open sections for the term with seat counts, meetings and prerequisites. */
export async function sectionsForTerm(termId: number, sectionIds?: number[]) {
  const rows = await db.query.sections.findMany({
    where: sectionIds ? and(eq(sections.termId, termId), inArray(sections.id, sectionIds)) : eq(sections.termId, termId),
    with: {
      course: { with: { department: true } },
      meetings: true,
      instructor: { with: { user: true } },
    },
  });
  if (!rows.length) return [];
  const counts = await db
    .select({ sectionId: enrollments.sectionId, n: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(and(inArray(enrollments.sectionId, rows.map((r) => r.id)), eq(enrollments.status, "REGISTERED")))
    .groupBy(enrollments.sectionId);
  const countBy = new Map(counts.map((c) => [c.sectionId, c.n]));
  const prereqRows = await db
    .select({ courseId: coursePrerequisites.courseId, id: courses.id, code: courses.code })
    .from(coursePrerequisites)
    .innerJoin(courses, eq(courses.id, coursePrerequisites.prerequisiteId))
    .where(inArray(coursePrerequisites.courseId, [...new Set(rows.map((r) => r.courseId))]));

  return rows
    .map((r) => {
      const pre = prereqRows.filter((p) => p.courseId === r.courseId);
      const forCheck: SectionForRegistration = {
        id: r.id,
        courseId: r.courseId,
        courseCode: r.course.code,
        credits: r.course.credits,
        status: r.status,
        capacity: r.capacity,
        enrolledCount: countBy.get(r.id) ?? 0,
        meetings: r.meetings,
        prerequisiteIds: pre.map((p) => p.id),
        prerequisiteCodes: pre.map((p) => p.code),
      };
      return { ...r, forCheck };
    })
    .sort((a, b) => a.course.code.localeCompare(b.course.code) || a.code.localeCompare(b.code));
}

export async function registrationView(studentId: number) {
  const term = await getCurrentTerm();
  if (!term) return null;
  const [{ ctx, current }, offered] = await Promise.all([buildContext(db, studentId, term.id), sectionsForTerm(term.id)]);
  return {
    term,
    ctx,
    current,
    offered: offered.map((s) => ({
      ...s,
      registered: current.some((c) => c.sectionId === s.id),
      problems: registrationProblems(s.forCheck, ctx),
    })),
  };
}

