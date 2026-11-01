import "server-only";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { enrollments, sections, students } from "@/db/schema";

/** A section the professor teaches, with everything the section pages need. 404 otherwise. */
export async function getOwnedSection(sectionId: number, professorId: number) {
  const section = await db.query.sections.findFirst({
    where: and(eq(sections.id, sectionId), eq(sections.instructorId, professorId)),
    with: {
      course: true,
      term: true,
      meetings: true,
      assessments: { orderBy: (a, { asc }) => [asc(a.position), asc(a.id)] },
      enrollments: {
        where: eq(enrollments.status, "REGISTERED"),
        with: { scores: true, student: { with: { user: true, program: true } } },
      },
    },
  });
  if (!section) notFound();
  section.enrollments.sort(
    (a, b) =>
      a.student.user.lastName.localeCompare(b.student.user.lastName, "tr") ||
      a.student.user.firstName.localeCompare(b.student.user.firstName, "tr"),
  );
  return section;
}


/** Gradebook can be edited until the professor submits; a returned section opens again. */
export const isEditable = (s: { gradeStatus: string }) => s.gradeStatus === "DRAFT" || s.gradeStatus === "RETURNED";

export async function sectionsTaughtBy(professorId: number) {
  return db.query.sections.findMany({
    where: eq(sections.instructorId, professorId),
    with: {
      course: true,
      term: true,
      meetings: true,
      assessments: true,
      enrollments: { where: eq(enrollments.status, "REGISTERED"), columns: { id: true } },
    },
  });
}

export async function adviseesOf(professorId: number) {
  return db.query.students.findMany({
    where: eq(students.advisorId, professorId),
    with: { user: true, program: true },
  });
}

export async function isAdvisorOf(professorId: number, studentId: number) {
  const s = await db.query.students.findFirst({
    where: and(eq(students.userId, studentId), eq(students.advisorId, professorId)),
    columns: { userId: true },
  });
  return !!s;
}

