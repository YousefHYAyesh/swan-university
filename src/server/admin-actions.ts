"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  contactMessages,
  coursePrerequisites,
  courses,
  departments,
  faculties,
  gradeScale,
  programRequirements,
  programs,
  sectionMeetings,
  sections,
  settings,
  staff,
  terms,
  users,
} from "@/db/schema";
import { formObject, invalid, isUniqueViolation, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { SETTING_KEYS } from "./settings";

const DUPLICATE = "Something with that code or email already exists.";
const id = (fd: FormData, key = "id") => Number(fd.get(key)) || null;

async function run(fn: () => Promise<void>): Promise<ActionState | null> {
  try {
    await fn();
    return null;
  } catch (err) {
    if (isUniqueViolation(err)) return { error: DUPLICATE };
    const code = (err as { code?: string; cause?: { code?: string } }).cause?.code ?? (err as { code?: string }).code;
    if (code === "23503") return { error: "It's still in use elsewhere, so it can't be removed." };
    throw err;
  }
}

// ---------- Users (staff accounts) ----------

const staffSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(100),
  lastName: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  role: z.enum(["ADMIN", "REGISTRAR", "PROFESSOR"]),
  employeeNo: z.string().trim().min(2, "Required").max(20),
  title: z.string().trim().min(1, "Required").max(60),
  departmentId: z.coerce.number().int().positive().optional(),
  office: z.string().max(40).optional(),
  phone: z.string().max(30).optional(),
});

export async function saveStaff(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = staffSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { firstName, lastName, email, role, ...profile } = parsed.data;
  const userId = id(formData, "userId");
  const record = { ...profile, departmentId: profile.departmentId ?? null, office: profile.office ?? null, phone: profile.phone ?? null };
  let temp: string | null = null;
  let newId = userId;

  if (userId === user.id && role !== "ADMIN") return { error: "You can't remove your own admin role." };

  const failed = await run(async () => {
    newId = await db.transaction(async (tx) => {
      if (userId) {
        await tx.update(users).set({ firstName, lastName, email, role }).where(eq(users.id, userId));
        await tx.update(staff).set(record).where(eq(staff.userId, userId));
        return userId;
      }
      temp = crypto.randomUUID().slice(0, 12);
      const [u] = await tx.insert(users).values({ firstName, lastName, email, role, passwordHash: await bcrypt.hash(temp, 10) }).returning();
      await tx.insert(staff).values({ userId: u.id, ...record });
      return u.id;
    });
  });
  if (failed) return failed;
  await audit(user.id, userId ? "user.update" : "user.create", "user", newId, { role });
  revalidatePath("/admin/users");
  if (!userId) redirect(`/admin/users/${newId}?created=${temp}`);
  return { ok: "Saved." };
}

export async function setUserActive(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const userId = Number(formData.get("userId"));
  const active = formData.get("active") === "true";
  if (userId === user.id) return { error: "You can't deactivate yourself." };
  // Bumping the session version signs the user out everywhere.
  await db
    .update(users)
    .set({ isActive: active, sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
  await audit(user.id, active ? "user.activate" : "user.deactivate", "user", userId);
  revalidatePath("/admin/users", "layout");
  return { ok: active ? "Account activated." : "Account deactivated and signed out." };
}

export async function resetPassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const userId = Number(formData.get("userId"));
  const temp = crypto.randomUUID().slice(0, 12);
  await db
    .update(users)
    .set({ passwordHash: await bcrypt.hash(temp, 10), sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
  await audit(user.id, "user.password_reset", "user", userId);
  return { ok: `New temporary password: ${temp}. Share it securely; it won't be shown again.` };
}

// ---------- Faculties, departments, programs ----------

const facultySchema = z.object({
  code: z.string().trim().toUpperCase().min(2, "2–10 letters").max(10),
  name: z.string().trim().min(2, "Required").max(150),
});

export async function saveFaculty(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = facultySchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const fid = id(formData);
  const failed = await run(async () => {
    if (fid) await db.update(faculties).set(parsed.data).where(eq(faculties.id, fid));
    else await db.insert(faculties).values(parsed.data);
  });
  if (failed) return failed;
  await audit(user.id, fid ? "faculty.update" : "faculty.create", "faculty", fid, parsed.data);
  revalidatePath("/admin/structure");
  return { ok: "Faculty saved." };
}

const departmentSchema = facultySchema.extend({ facultyId: z.coerce.number().int().positive("Choose a faculty") });

export async function saveDepartment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = departmentSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const did = id(formData);
  const failed = await run(async () => {
    if (did) await db.update(departments).set(parsed.data).where(eq(departments.id, did));
    else await db.insert(departments).values(parsed.data);
  });
  if (failed) return failed;
  await audit(user.id, did ? "department.update" : "department.create", "department", did, parsed.data);
  revalidatePath("/admin/structure");
  return { ok: "Department saved." };
}

const programSchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(10),
  name: z.string().trim().min(2, "Required").max(150),
  degree: z.enum(["BSc", "BA", "MSc", "MA", "PhD"]),
  departmentId: z.coerce.number().int().positive("Choose a department"),
  durationYears: z.coerce.number().int().min(1).max(8),
  requiredCredits: z.coerce.number().int().min(1).max(400),
  electiveCredits: z.coerce.number().int().min(0).max(200),
  minCgpa: z.coerce.number().min(0).max(4),
});

export async function saveProgram(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = programSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const pid = id(formData);
  let newId = pid;
  const failed = await run(async () => {
    if (pid) await db.update(programs).set(parsed.data).where(eq(programs.id, pid));
    else newId = (await db.insert(programs).values(parsed.data).returning())[0].id;
  });
  if (failed) return failed;
  await audit(user.id, pid ? "program.update" : "program.create", "program", newId, parsed.data);
  revalidatePath("/admin/structure", "layout");
  if (!pid) redirect(`/admin/structure/programs/${newId}`);
  return { ok: "Program saved." };
}

const requirementSchema = z.object({
  programId: z.coerce.number().int().positive(),
  courseId: z.coerce.number().int().positive("Choose a course"),
  semester: z.coerce.number().int().min(1).max(12),
});

export async function addRequirement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = requirementSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await db
    .insert(programRequirements)
    .values(parsed.data)
    .onConflictDoUpdate({ target: [programRequirements.programId, programRequirements.courseId], set: { semester: parsed.data.semester } });
  await audit(user.id, "program.requirement.add", "program", parsed.data.programId, parsed.data);
  revalidatePath(`/admin/structure/programs/${parsed.data.programId}`);
  return { ok: "Requirement saved." };
}

export async function removeRequirement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const programId = Number(formData.get("programId"));
  const courseId = Number(formData.get("courseId"));
  await db.delete(programRequirements).where(and(eq(programRequirements.programId, programId), eq(programRequirements.courseId, courseId)));
  await audit(user.id, "program.requirement.remove", "program", programId, { courseId });
  revalidatePath(`/admin/structure/programs/${programId}`);
  return { ok: "Removed." };
}

// ---------- Courses ----------

const courseSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,4}\d{3}$/, "Like SEN244: 2–4 letters and 3 digits"),
  title: z.string().trim().min(2, "Required").max(150),
  departmentId: z.coerce.number().int().positive("Choose a department"),
  credits: z.coerce.number().int().min(0).max(10),
  ects: z.coerce.number().int().min(0).max(30),
  level: z.coerce.number().int().refine((v) => [100, 200, 300, 400, 500].includes(v), "100–500"),
  description: z.string().max(2000).optional(),
  isActive: z.literal("on").optional(),
  prerequisiteIds: z.union([z.coerce.number(), z.array(z.coerce.number())]).optional(),
});

/** True if adding these prerequisites to courseId would create a loop. */
async function createsCycle(courseId: number, prereqIds: number[]) {
  const edges = await db.select().from(coursePrerequisites);
  const graph = new Map<number, number[]>();
  for (const e of edges) if (e.courseId !== courseId) graph.set(e.courseId, [...(graph.get(e.courseId) ?? []), e.prerequisiteId]);
  graph.set(courseId, prereqIds);
  const seen = new Set<number>();
  const stack = [...prereqIds];
  while (stack.length) {
    const n = stack.pop()!;
    if (n === courseId) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    stack.push(...(graph.get(n) ?? []));
  }
  return false;
}

export async function saveCourse(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = courseSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { prerequisiteIds, isActive, ...data } = parsed.data;
  const prereqs = [...new Set([prerequisiteIds ?? []].flat())];
  const cid = id(formData);
  if (cid && prereqs.includes(cid)) return { error: "A course can't be its own prerequisite." };
  if (cid && (await createsCycle(cid, prereqs))) return { error: "Those prerequisites would create a loop." };

  let newId = cid;
  const failed = await run(async () => {
    newId = await db.transaction(async (tx) => {
      const values = { ...data, description: data.description ?? null, isActive: isActive === "on" };
      const courseId = cid ?? (await tx.insert(courses).values(values).returning())[0].id;
      if (cid) await tx.update(courses).set(values).where(eq(courses.id, cid));
      await tx.delete(coursePrerequisites).where(eq(coursePrerequisites.courseId, courseId));
      if (prereqs.length) await tx.insert(coursePrerequisites).values(prereqs.map((p) => ({ courseId, prerequisiteId: p })));
      return courseId;
    });
  });
  if (failed) return failed;
  await audit(user.id, cid ? "course.update" : "course.create", "course", newId, { code: data.code });
  revalidatePath("/admin/courses", "layout");
  if (!cid) redirect("/admin/courses");
  return { ok: "Course saved." };
}

// ---------- Terms ----------

const termSchema = z
  .object({
    startYear: z.coerce.number().int().min(2000).max(2100),
    season: z.enum(["FALL", "SPRING", "SUMMER"]),
    startsOn: z.string().date(),
    endsOn: z.string().date(),
    registrationOpensOn: z.string().date(),
    registrationClosesOn: z.string().date(),
    gradeDeadline: z.string().date(),
  })
  .refine((t) => t.startsOn < t.endsOn, { path: ["endsOn"], message: "Must be after the start date" })
  .refine((t) => t.registrationOpensOn <= t.registrationClosesOn, { path: ["registrationClosesOn"], message: "Must be after registration opens" })
  .refine((t) => t.gradeDeadline >= t.endsOn, { path: ["gradeDeadline"], message: "Should be on or after the last day of term" });

export async function saveTerm(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = termSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const tid = id(formData);
  const failed = await run(async () => {
    if (tid) await db.update(terms).set(parsed.data).where(eq(terms.id, tid));
    else await db.insert(terms).values(parsed.data);
  });
  if (failed) return failed.error === DUPLICATE ? { error: "That term already exists." } : failed;
  await audit(user.id, tid ? "term.update" : "term.create", "term", tid, parsed.data);
  revalidatePath("/admin/terms");
  return { ok: "Term saved." };
}

export async function setCurrentTerm(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const tid = Number(formData.get("id"));
  await db.transaction(async (tx) => {
    await tx.update(terms).set({ isCurrent: false }).where(ne(terms.id, tid));
    await tx.update(terms).set({ isCurrent: true }).where(eq(terms.id, tid));
  });
  await audit(user.id, "term.set_current", "term", tid);
  revalidatePath("/", "layout");
  return { ok: "Current term changed." };
}

// ---------- Sections ----------

const meetingSchema = z
  .object({ dayOfWeek: z.coerce.number().int().min(1).max(7), startsAt: z.string().regex(/^\d{2}:\d{2}$/), endsAt: z.string().regex(/^\d{2}:\d{2}$/) })
  .refine((m) => m.startsAt < m.endsAt, { message: "Class must end after it starts" });

const sectionSchema = z.object({
  courseId: z.coerce.number().int().positive("Choose a course"),
  termId: z.coerce.number().int().positive("Choose a term"),
  code: z.string().trim().regex(/^\d{2}$/, "Two digits, like 01"),
  instructorId: z.coerce.number().int().positive().optional(),
  capacity: z.coerce.number().int().min(1).max(500),
  room: z.string().trim().max(30).optional(),
  status: z.enum(["OPEN", "CLOSED", "CANCELLED"]),
});

export async function saveSection(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = sectionSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);

  const meetings = [0, 1, 2]
    .map((i) => ({ dayOfWeek: formData.get(`m${i}-day`), startsAt: formData.get(`m${i}-start`), endsAt: formData.get(`m${i}-end`) }))
    .filter((m) => m.dayOfWeek && m.startsAt && m.endsAt)
    .map((m) => meetingSchema.safeParse(m));
  const badMeeting = meetings.find((m) => !m.success);
  if (badMeeting && !badMeeting.success) return { error: badMeeting.error.issues[0].message };

  const sid = id(formData);
  const data = { ...parsed.data, instructorId: parsed.data.instructorId ?? null, room: parsed.data.room ?? null };

  // An instructor can't teach two sections at the same time.
  if (data.instructorId) {
    const others = await db.query.sections.findMany({
      where: and(eq(sections.termId, data.termId), eq(sections.instructorId, data.instructorId), sid ? ne(sections.id, sid) : undefined),
      with: { meetings: true, course: true },
    });
    for (const m of meetings) {
      if (!m.success) continue;
      const clash = others.find((o) =>
        o.meetings.some((x) => x.dayOfWeek === m.data.dayOfWeek && x.startsAt.slice(0, 5) < m.data.endsAt && m.data.startsAt < x.endsAt.slice(0, 5)),
      );
      if (clash) return { error: `The instructor already teaches ${clash.course.code} ${clash.code} at that time.` };
    }
  }

  let newId = sid;
  const failed = await run(async () => {
    newId = await db.transaction(async (tx) => {
      const sectionId = sid ?? (await tx.insert(sections).values(data).returning())[0].id;
      if (sid) await tx.update(sections).set(data).where(eq(sections.id, sid));
      await tx.delete(sectionMeetings).where(eq(sectionMeetings.sectionId, sectionId));
      const valid = meetings.flatMap((m) => (m.success ? [m.data] : []));
      if (valid.length) await tx.insert(sectionMeetings).values(valid.map((m) => ({ ...m, sectionId })));
      return sectionId;
    });
  });
  if (failed) return failed.error === DUPLICATE ? { error: "That course already has a section with this code in the term." } : failed;
  await audit(user.id, sid ? "section.update" : "section.create", "section", newId, { code: data.code });
  revalidatePath("/admin/sections", "layout");
  if (!sid) redirect(`/admin/sections?term=${data.termId}`);
  return { ok: "Section saved." };
}

// ---------- Grade scale & settings ----------

export async function saveGradeScale(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const rows = await db.select().from(gradeScale);
  const banded = rows.filter((r) => r.minPercent != null);
  const updates: { letter: string; minPercent: number; points: number }[] = [];
  for (const r of banded) {
    const min = Number(formData.get(`min-${r.letter}`));
    const pts = Number(formData.get(`pts-${r.letter}`));
    if (!Number.isFinite(min) || min < 0 || min > 100) return { error: `${r.letter}: the minimum must be between 0 and 100.` };
    if (!Number.isFinite(pts) || pts < 0 || pts > 4) return { error: `${r.letter}: points must be between 0 and 4.` };
    updates.push({ letter: r.letter, minPercent: min, points: pts });
  }
  const sorted = [...updates].sort((a, b) => b.minPercent - a.minPercent);
  if (sorted[sorted.length - 1]?.minPercent !== 0) return { error: "The lowest band has to start at 0% so every score gets a letter." };
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minPercent === sorted[i - 1].minPercent) return { error: `${sorted[i].letter} and ${sorted[i - 1].letter} start at the same percentage.` };
    if (sorted[i].points > sorted[i - 1].points) return { error: `${sorted[i].letter} can't be worth more points than ${sorted[i - 1].letter}.` };
  }
  await db.transaction(async (tx) => {
    for (const u of updates) await tx.update(gradeScale).set({ minPercent: u.minPercent, points: u.points }).where(eq(gradeScale.letter, u.letter));
  });
  await audit(user.id, "grade_scale.update", "grade_scale", null, { bands: updates });
  revalidatePath("/", "layout");
  return { ok: "Grade scale saved. It applies to grades approved from now on; existing final grades don't change." };
}

const settingsSchema = z.object({
  university_name: z.string().trim().min(2).max(100),
  slogan: z.string().trim().max(200).default(""),
  about: z.string().trim().max(3000).default(""),
  max_credits_per_term: z.coerce.number().int().min(1).max(60),
  probation_below: z.coerce.number().min(0).max(4),
});

export async function saveSettings(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("ADMIN");
  const parsed = settingsSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await db.transaction(async (tx) => {
    for (const [key, value] of Object.entries(parsed.data)) {
      if (!(key in SETTING_KEYS)) continue;
      await tx.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
    }
  });
  await audit(user.id, "settings.update", "settings", null, parsed.data);
  revalidatePath("/", "layout");
  return { ok: "Settings saved." };
}

// ---------- Contact messages ----------

export async function markMessage(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireRole("ADMIN");
  const mid = Number(formData.get("id"));
  const read = formData.get("read") === "true";
  await db.update(contactMessages).set({ readAt: read ? new Date() : null }).where(eq(contactMessages.id, mid));
  revalidatePath("/admin/messages");
  return { ok: read ? "Marked as read." : "Marked as unread." };
}
