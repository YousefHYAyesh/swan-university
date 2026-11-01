"use server";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { announcements, enrollments, holds, sections, studentRequests, students, users } from "@/db/schema";
import { finalResult } from "@/domain/grading";
import { formObject, invalid, isUniqueViolation, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { getScale } from "./academic";
import { notify } from "./notifications";

// ---------- Grade approval ----------

/**
 * Locks in a section's grades: computes each student's final percentage and
 * letter from the weighted assessments and stores them on the enrollment.
 */
export async function approveGrades(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR");
  const sectionId = Number(formData.get("sectionId"));
  const section = await db.query.sections.findFirst({
    where: eq(sections.id, sectionId),
    with: {
      course: true,
      assessments: true,
      enrollments: { where: eq(enrollments.status, "REGISTERED"), with: { scores: true } },
    },
  });
  if (!section) return { error: "Section not found." };
  if (section.gradeStatus !== "SUBMITTED") return { error: "Only submitted sections can be approved." };
  const scale = await getScale();

  let results: { id: number; studentId: number; percent: number; letter: string }[];
  try {
    results = section.enrollments.map((e) => {
      const r = finalResult(section.assessments, new Map(e.scores.map((s) => [s.assessmentId, s.score])), scale);
      return { id: e.id, studentId: e.studentId, ...r };
    });
  } catch (err) {
    return { error: (err as Error).message };
  }

  await db.transaction(async (tx) => {
    for (const r of results) {
      await tx.update(enrollments).set({ finalPercent: r.percent, letterGrade: r.letter }).where(eq(enrollments.id, r.id));
    }
    await tx
      .update(sections)
      .set({ gradeStatus: "APPROVED", gradesReviewedBy: user.id, gradesReviewedAt: new Date(), reviewNote: null })
      .where(eq(sections.id, section.id));
  });
  await audit(user.id, "grades.approve", "section", section.id, { students: results.length });
  await notify(
    results.map((r) => r.studentId),
    { title: `Final grade posted for ${section.course.code}`, link: "/student/grades", kind: "GRADE" },
  );
  if (section.instructorId) {
    await notify([section.instructorId], {
      title: `${section.course.code} ${section.code} grades approved`,
      link: `/professor/sections/${section.id}`,
      kind: "GRADE",
    });
  }
  revalidatePath("/registrar", "layout");
  redirect(`/registrar/grades?approved=${section.id}`);
}

const returnSchema = z.object({
  sectionId: z.coerce.number().int().positive(),
  note: z.string().trim().min(5, "Tell the instructor what to fix").max(1000),
});

export async function returnGrades(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR");
  const parsed = returnSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const section = await db.query.sections.findFirst({ where: eq(sections.id, parsed.data.sectionId), with: { course: true } });
  if (!section || section.gradeStatus !== "SUBMITTED") return { error: "Only submitted sections can be returned." };
  await db
    .update(sections)
    .set({ gradeStatus: "RETURNED", reviewNote: parsed.data.note, gradesReviewedBy: user.id, gradesReviewedAt: new Date() })
    .where(eq(sections.id, section.id));
  await audit(user.id, "grades.return", "section", section.id, { note: parsed.data.note });
  if (section.instructorId) {
    await notify([section.instructorId], {
      title: `${section.course.code} ${section.code} grades returned`,
      body: parsed.data.note,
      link: `/professor/sections/${section.id}`,
      kind: "GRADE",
    });
  }
  revalidatePath("/registrar", "layout");
  redirect(`/registrar/grades?returned=${section.id}`);
}

// ---------- Requests ----------

const requestUpdate = z.object({
  requestId: z.coerce.number().int().positive(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "REJECTED"]),
  response: z.string().trim().max(1000).optional(),
});

export async function updateRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR");
  const parsed = requestUpdate.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { requestId, status, response } = parsed.data;
  if ((status === "REJECTED" || status === "COMPLETED") && !response) {
    return { error: "Check the highlighted fields.", fieldErrors: { response: "Add a reply for the student" } };
  }
  const [row] = await db
    .update(studentRequests)
    .set({ status, response: response ?? null, handledBy: user.id, updatedAt: new Date() })
    .where(eq(studentRequests.id, requestId))
    .returning();
  if (!row) return { error: "Request not found." };
  await audit(user.id, "request.update", "student_request", requestId, { status });
  await notify([row.studentId], { title: `Your request was updated: ${status.toLowerCase().replace("_", " ")}`, link: "/student/requests", kind: "REQUEST" });
  revalidatePath("/registrar/requests");
  return { ok: "Request updated." };
}

// ---------- Holds ----------

const holdSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  type: z.enum(["REGISTRATION", "TRANSCRIPT"]),
  reason: z.string().trim().min(3, "Give a reason").max(200),
});

export async function placeHold(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR");
  const parsed = holdSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const existing = await db.query.holds.findFirst({
    where: and(eq(holds.studentId, parsed.data.studentId), eq(holds.type, parsed.data.type), isNull(holds.releasedAt)),
  });
  if (existing) return { error: "This student already has an active hold of that type." };
  const [row] = await db.insert(holds).values({ ...parsed.data, placedBy: user.id }).returning();
  await audit(user.id, "hold.place", "student", parsed.data.studentId, { holdId: row.id, type: row.type });
  await notify([parsed.data.studentId], { title: "A hold was placed on your record", body: parsed.data.reason, link: "/student", kind: "HOLD" });
  revalidatePath(`/registrar/students/${parsed.data.studentId}`);
  return { ok: "Hold placed." };
}

export async function releaseHold(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR");
  const holdId = Number(formData.get("holdId"));
  const [row] = await db.update(holds).set({ releasedAt: new Date() }).where(and(eq(holds.id, holdId), isNull(holds.releasedAt))).returning();
  if (!row) return { error: "Hold not found." };
  await audit(user.id, "hold.release", "student", row.studentId, { holdId });
  await notify([row.studentId], { title: "A hold on your record was released", link: "/student", kind: "HOLD" });
  revalidatePath(`/registrar/students/${row.studentId}`);
  return { ok: "Hold released." };
}

// ---------- Student records ----------

const studentSchema = z.object({
  firstName: z.string().trim().min(1, "Required").max(100),
  lastName: z.string().trim().min(1, "Required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  studentNo: z.string().trim().regex(/^\d{6,12}$/, "6–12 digits"),
  programId: z.coerce.number().int().positive("Choose a program"),
  advisorId: z.coerce.number().int().positive().optional(),
  entryYear: z.coerce.number().int().min(1990).max(2100),
  status: z.enum(["ACTIVE", "SUSPENDED", "GRADUATED", "WITHDRAWN"]).default("ACTIVE"),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().date().optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(300).optional(),
  guardianName: z.string().max(150).optional(),
  guardianPhone: z.string().max(30).optional(),
});

export async function saveStudent(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR", "ADMIN");
  const parsed = studentSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { firstName, lastName, email, ...record } = parsed.data;
  const id = Number(formData.get("studentId")) || null;
  const profile = {
    ...record,
    advisorId: record.advisorId ?? null,
    gender: record.gender ?? null,
    dateOfBirth: record.dateOfBirth ?? null,
    phone: record.phone ?? null,
    address: record.address ?? null,
    guardianName: record.guardianName ?? null,
    guardianPhone: record.guardianPhone ?? null,
  };

  let newId: number;
  let tempPassword: string | null = null;
  try {
    newId = await db.transaction(async (tx) => {
      if (id) {
        const [prev] = await tx.select({ status: students.status }).from(students).where(eq(students.userId, id));
        await tx.update(users).set({ firstName, lastName, email }).where(eq(users.id, id));
        await tx.update(students).set(profile).where(eq(students.userId, id));
        // Suspending or withdrawing a student signs them out everywhere.
        if (prev && prev.status !== profile.status && profile.status !== "ACTIVE") {
          await tx.update(users).set({ isActive: profile.status !== "WITHDRAWN" }).where(eq(users.id, id));
        }
        return id;
      }
      tempPassword = crypto.randomUUID().slice(0, 12);
      const [u] = await tx
        .insert(users)
        .values({ email, firstName, lastName, role: "STUDENT", passwordHash: await bcrypt.hash(tempPassword, 10) })
        .returning();
      await tx.insert(students).values({ userId: u.id, ...profile });
      return u.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "That email or student number is already in use." };
    throw err;
  }
  await audit(user.id, id ? "student.update" : "student.create", "student", newId);
  revalidatePath("/registrar/students");
  if (!id) redirect(`/registrar/students/${newId}?created=${tempPassword}`);
  revalidatePath(`/registrar/students/${newId}`);
  return { ok: "Student record saved." };
}

/** After add/drop, a student leaves a course through the registrar and gets a W. */
export async function withdrawFromSection(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR");
  const enrollmentId = Number(formData.get("enrollmentId"));
  const enrollment = await db.query.enrollments.findFirst({
    where: eq(enrollments.id, enrollmentId),
    with: { section: { with: { course: true } } },
  });
  if (!enrollment || enrollment.status !== "REGISTERED") return { error: "Enrollment not found." };
  if (enrollment.section.gradeStatus === "APPROVED") return { error: "Grades for this course are already final." };
  await db.update(enrollments).set({ status: "WITHDRAWN", letterGrade: "W", finalPercent: null }).where(eq(enrollments.id, enrollmentId));
  await audit(user.id, "enrollment.withdraw", "enrollment", enrollmentId);
  await notify([enrollment.studentId], { title: `You were withdrawn from ${enrollment.section.course.code}`, link: "/student/grades", kind: "GRADE" });
  revalidatePath(`/registrar/students/${enrollment.studentId}`);
  return { ok: `Withdrawn from ${enrollment.section.course.code} with a W.` };
}

// ---------- Announcements ----------

const announcementSchema = z.object({
  audience: z.enum(["ALL", "STUDENTS", "STAFF"]),
  title: z.string().trim().min(3, "Add a title").max(150),
  body: z.string().trim().min(3, "Write the announcement").max(4000),
  pinned: z.literal("on").optional(),
});

export async function postAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR", "ADMIN");
  const parsed = announcementSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const { pinned, ...data } = parsed.data;
  const [row] = await db.insert(announcements).values({ ...data, pinned: pinned === "on", authorId: user.id }).returning();
  await audit(user.id, "announcement.create", "announcement", row.id, { audience: row.audience });
  revalidatePath("/", "layout");
  return { ok: "Announcement posted." };
}

export async function deleteAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("REGISTRAR", "ADMIN");
  const id = Number(formData.get("announcementId"));
  const where = user.role === "ADMIN" ? eq(announcements.id, id) : and(eq(announcements.id, id), eq(announcements.authorId, user.id));
  const removed = await db.delete(announcements).where(where).returning({ id: announcements.id });
  if (!removed.length) return { error: "You can only delete your own announcements." };
  await audit(user.id, "announcement.delete", "announcement", id);
  revalidatePath("/", "layout");
  return { ok: "Deleted." };
}
