import "server-only";
import { and, asc, count, desc, eq, gte, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, courses, departments, faculties, sections, staff, students, terms, users } from "@/db/schema";
import { termLabel } from "@/lib/utils";

const PAGE_SIZE = 25;

export async function departmentOptions() {
  const rows = await db.select().from(departments).orderBy(departments.name);
  return rows.map((d) => ({ id: d.id, label: `${d.name} (${d.code})` }));
}

export async function facultyOptions() {
  const rows = await db.select().from(faculties).orderBy(faculties.name);
  return rows.map((f) => ({ id: f.id, label: f.name }));
}

export async function courseOptions() {
  const rows = await db.select({ id: courses.id, code: courses.code, title: courses.title }).from(courses).orderBy(courses.code);
  return rows.map((c) => ({ id: c.id, label: `${c.code} ${c.title}` }));
}

export async function termOptions() {
  const rows = await db.query.terms.findMany({ orderBy: [desc(terms.startYear), desc(terms.season)] });
  return rows.map((t) => ({ id: t.id, label: termLabel(t) + (t.isCurrent ? " (current)" : "") }));
}

export async function instructorOptions() {
  const rows = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, title: staff.title })
    .from(users)
    .innerJoin(staff, eq(staff.userId, users.id))
    .where(and(eq(users.role, "PROFESSOR"), eq(users.isActive, true)))
    .orderBy(users.lastName);
  return rows.map((r) => ({ id: r.id, label: `${r.title} ${r.firstName} ${r.lastName}` }));
}

export async function searchUsers(opts: { q?: string; role?: string; page: number }) {
  const where: SQL[] = [];
  if (opts.q) {
    const like = `%${opts.q}%`;
    where.push(or(ilike(users.firstName, like), ilike(users.lastName, like), ilike(users.email, like))!);
  }
  if (opts.role) where.push(eq(users.role, opts.role as "ADMIN"));
  const filter = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(users)
      .where(filter)
      .orderBy(asc(users.lastName), asc(users.firstName))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(users).where(filter),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function adminCounts() {
  const since = new Date(Date.now() - 7 * 86_400_000);
  const [byRole, [{ activeStudents }], [{ sectionsNow }], [{ logins }]] = await Promise.all([
    db.select({ role: users.role, n: count() }).from(users).where(eq(users.isActive, true)).groupBy(users.role),
    db.select({ activeStudents: count() }).from(students).where(eq(students.status, "ACTIVE")),
    db
      .select({ sectionsNow: count() })
      .from(sections)
      .innerJoin(terms, eq(terms.id, sections.termId))
      .where(eq(terms.isCurrent, true)),
    db.select({ logins: count() }).from(auditLogs).where(and(eq(auditLogs.action, "login"), gte(auditLogs.createdAt, since))),
  ]);
  return { byRole: Object.fromEntries(byRole.map((r) => [r.role, r.n])), activeStudents, sectionsNow, logins };
}

export async function auditPage(opts: { action?: string; entity?: string; entityId?: string; page: number }) {
  const where: SQL[] = [];
  if (opts.action) where.push(ilike(auditLogs.action, `${opts.action}%`));
  if (opts.entity) where.push(eq(auditLogs.entity, opts.entity));
  if (opts.entityId) where.push(eq(auditLogs.entityId, opts.entityId));
  const filter = where.length ? and(...where) : undefined;
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entity: auditLogs.entity,
        entityId: auditLogs.entityId,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(filter)
      .orderBy(desc(auditLogs.createdAt))
      .limit(PAGE_SIZE)
      .offset((opts.page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(auditLogs).where(filter),
  ]);
  return { rows, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

