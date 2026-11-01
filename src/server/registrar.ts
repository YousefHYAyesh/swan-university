import "server-only";
import { and, asc, count, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { holds, programs, sections, staff, studentRequests, students, users } from "@/db/schema";

const PAGE_SIZE = 20;

export async function searchStudents(opts: { q?: string; programId?: number; status?: string; page: number }) {
  const where: SQL[] = [];
  if (opts.q) {
    const like = `%${opts.q}%`;
    where.push(or(ilike(users.firstName, like), ilike(users.lastName, like), ilike(students.studentNo, like), ilike(users.email, like))!);
  }
  if (opts.programId) where.push(eq(students.programId, opts.programId));
  if (opts.status) where.push(eq(students.status, opts.status as "ACTIVE"));
  const filter = where.length ? and(...where) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: students.userId,
        studentNo: students.studentNo,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        status: students.status,
        entryYear: students.entryYear,
        program: programs.name,
        holds: sql<number>`(select count(*)::int from ${holds} h where h.student_id = ${students.userId} and h.released_at is null)`,
      })
      .from(students)
      .innerJoin(users, eq(users.id, students.userId))
      .innerJoin(programs, eq(programs.id, students.programId))
      .where(filter)
      .orderBy(asc(users.lastName), asc(users.firstName))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(students).innerJoin(users, eq(users.id, students.userId)).where(filter),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function programOptions() {
  return db.select({ id: programs.id, name: programs.name, degree: programs.degree }).from(programs).orderBy(programs.name);
}

export async function advisorOptions() {
  return db
    .select({ id: staff.userId, firstName: users.firstName, lastName: users.lastName, title: staff.title })
    .from(staff)
    .innerJoin(users, eq(users.id, staff.userId))
    .where(and(eq(users.role, "PROFESSOR"), eq(users.isActive, true)))
    .orderBy(users.lastName);
}

export async function sectionsAwaitingReview() {
  return db.query.sections.findMany({
    where: eq(sections.gradeStatus, "SUBMITTED"),
    with: { course: true, term: true, instructor: { with: { user: true } }, enrollments: { columns: { id: true } } },
    orderBy: (s, { asc }) => [asc(s.gradesSubmittedAt)],
  });
}

export async function registrarCounts(termId: number | null) {
  const [[pendingGrades], [openRequests], [activeHolds], [draftSections]] = await Promise.all([
    db.select({ n: count() }).from(sections).where(eq(sections.gradeStatus, "SUBMITTED")),
    db.select({ n: count() }).from(studentRequests).where(inArray(studentRequests.status, ["PENDING", "IN_PROGRESS"])),
    db.select({ n: count() }).from(holds).where(isNull(holds.releasedAt)),
    termId
      ? db
          .select({ n: count() })
          .from(sections)
          .where(and(eq(sections.termId, termId), inArray(sections.gradeStatus, ["DRAFT", "RETURNED"])))
      : Promise.resolve([{ n: 0 }]),
  ]);
  return { pendingGrades: pendingGrades.n, openRequests: openRequests.n, activeHolds: activeHolds.n, draftSections: draftSections.n };
}
