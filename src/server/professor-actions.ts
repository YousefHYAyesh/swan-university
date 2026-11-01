"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { announcements, assessments, attendanceRecords, attendanceSessions, scores, sections } from "@/db/schema";
import { checkWeights, validateScore } from "@/domain/grading";
import { formObject, invalid, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { ATTENDANCE_MIN, attendanceByEnrollment } from "./attendance";
import { notify } from "./notifications";
import { getOwnedSection, isEditable } from "./professor";

const LOCKED = "Grades for this section are submitted and locked. The registrar can return them if something needs fixing.";
const sectionPath = (id: number) => `/professor/sections/${id}`;

// ---------- Gradebook ----------

/**
 * Saves the whole gradebook grid. Field names are "s-<enrollmentId>-<assessmentId>".
 * Blank cells clear the score; everything is validated before anything is written.
 */
export async function saveScores(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const section = await getOwnedSection(Number(formData.get("sectionId")), user.id);
  if (!isEditable(section)) return { error: LOCKED };

  const assessmentById = new Map(section.assessments.map((a) => [a.id, a]));
  const enrollmentIds = new Set(section.enrollments.map((e) => e.id));
  const existing = new Map(
    section.enrollments.flatMap((e) => e.scores.map((s) => [`${e.id}-${s.assessmentId}`, s.score] as const)),
  );

  const upserts: { enrollmentId: number; assessmentId: number; score: number | null }[] = [];
  const fieldErrors: Record<string, string> = {};
  for (const [key, raw] of formData.entries()) {
    const m = /^s-(\d+)-(\d+)$/.exec(key);
    if (!m) continue;
    const enrollmentId = Number(m[1]);
    const assessmentId = Number(m[2]);
    const assessment = assessmentById.get(assessmentId);
    if (!enrollmentIds.has(enrollmentId) || !assessment) continue; // not this section's data

    const text = String(raw).trim().replace(",", ".");
    const score = text === "" ? null : Number(text);
    if (score != null) {
      const problem = validateScore(score, assessment.maxScore);
      if (problem) {
        fieldErrors[key] = problem;
        continue;
      }
    }
    const before = existing.get(`${enrollmentId}-${assessmentId}`) ?? null;
    if (before !== score) upserts.push({ enrollmentId, assessmentId, score });
  }

  if (Object.keys(fieldErrors).length) {
    return { error: `${Object.keys(fieldErrors).length} score(s) need fixing; nothing was saved.`, fieldErrors };
  }
  if (!upserts.length) return { ok: "No changes to save." };

  await db.transaction(async (tx) => {
    for (const u of upserts) {
      await tx
        .insert(scores)
        .values({ ...u, updatedBy: user.id })
        .onConflictDoUpdate({
          target: [scores.enrollmentId, scores.assessmentId],
          set: { score: u.score, updatedBy: user.id, updatedAt: new Date() },
        });
    }
  });
  await audit(user.id, "scores.save", "section", section.id, { changed: upserts.length });
  revalidatePath(sectionPath(section.id));
  return { ok: `Saved ${upserts.length} score${upserts.length === 1 ? "" : "s"}.` };
}

export async function submitGrades(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const section = await getOwnedSection(Number(formData.get("sectionId")), user.id);
  if (!isEditable(section)) return { error: LOCKED };

  const weights = checkWeights(section.assessments);
  if (weights) {
    return {
      error:
        weights.kind === "empty"
          ? "Add assessments before submitting grades."
          : `Assessment weights add up to ${weights.total}%. They need to total exactly 100%.`,
    };
  }
  const final = section.assessments.find((a) => a.type === "FINAL");
  if (final) {
    const missing = section.enrollments.filter((e) => !e.scores.some((s) => s.assessmentId === final.id && s.score != null));
    // Missing finals become NA, which is allowed, but the professor has to confirm it.
    if (missing.length && formData.get("confirmNa") !== "yes") {
      return {
        error: `${missing.length} student(s) have no final exam score and will get NA. Tick the box to confirm and submit again.`,
      };
    }
  }

  await db
    .update(sections)
    .set({ gradeStatus: "SUBMITTED", gradesSubmittedAt: new Date(), reviewNote: null })
    .where(eq(sections.id, section.id));
  await audit(user.id, "grades.submit", "section", section.id);
  revalidatePath(sectionPath(section.id));
  revalidatePath("/professor");
  return { ok: "Grades submitted to the registrar for approval." };
}

// ---------- Assessments ----------

const assessmentSchema = z.object({
  name: z.string().trim().min(1, "Give it a name").max(80),
  type: z.enum(["QUIZ", "HOMEWORK", "LAB", "PROJECT", "MIDTERM", "FINAL"]),
  weight: z.coerce.number().gt(0, "Weight must be above 0").max(100, "Weight can't exceed 100"),
  maxScore: z.coerce.number().gt(0, "Must be above 0").max(1000),
  dueOn: z.string().date().optional(),
});

export async function saveAssessment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const section = await getOwnedSection(Number(formData.get("sectionId")), user.id);
  if (!isEditable(section)) return { error: LOCKED };
  const parsed = assessmentSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;
  const id = Number(formData.get("assessmentId")) || null;

  if (data.type === "FINAL" && section.assessments.some((a) => a.type === "FINAL" && a.id !== id)) {
    return { error: "This section already has a final exam." };
  }
  const others = section.assessments.filter((a) => a.id !== id).reduce((s, a) => s + a.weight, 0);
  if (others + data.weight > 100.001) {
    return { error: `That would bring the total weight to ${Math.round((others + data.weight) * 100) / 100}%. The maximum is 100%.` };
  }

  if (id) {
    const current = section.assessments.find((a) => a.id === id);
    if (!current) return { error: "Assessment not found." };
    // Lowering the maximum below an existing score would make that score invalid.
    const highest = Math.max(
      0,
      ...section.enrollments.flatMap((e) => e.scores.filter((s) => s.assessmentId === id).map((s) => s.score ?? 0)),
    );
    if (data.maxScore < highest) {
      return { error: `A student already scored ${highest}. The maximum can't be lower than that.` };
    }
    await db.update(assessments).set({ ...data, dueOn: data.dueOn ?? null }).where(eq(assessments.id, id));
    await audit(user.id, "assessment.update", "assessment", id, data);
  } else {
    const [row] = await db
      .insert(assessments)
      .values({ ...data, sectionId: section.id, position: section.assessments.length })
      .returning();
    await audit(user.id, "assessment.create", "assessment", row.id, data);
  }
  revalidatePath(sectionPath(section.id));
  return { ok: id ? "Assessment updated." : "Assessment added." };
}

export async function deleteAssessment(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const section = await getOwnedSection(Number(formData.get("sectionId")), user.id);
  if (!isEditable(section)) return { error: LOCKED };
  const id = Number(formData.get("assessmentId"));
  if (!section.assessments.some((a) => a.id === id)) return { error: "Assessment not found." };
  await db.delete(assessments).where(eq(assessments.id, id));
  await audit(user.id, "assessment.delete", "assessment", id);
  revalidatePath(sectionPath(section.id));
  return { ok: "Assessment removed." };
}

// ---------- Attendance ----------

const STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;

export async function saveAttendance(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const section = await getOwnedSection(Number(formData.get("sectionId")), user.id);
  const heldOn = String(formData.get("heldOn") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(heldOn)) return { error: "Pick a date." };
  if (heldOn < section.term.startsOn || heldOn > section.term.endsOn) return { error: "That date is outside the term." };
  const topic = String(formData.get("topic") ?? "").trim().slice(0, 150) || null;

  const records = section.enrollments.map((e) => {
    const status = String(formData.get(`a-${e.id}`) ?? "PRESENT");
    return { enrollmentId: e.id, status: (STATUSES as readonly string[]).includes(status) ? (status as (typeof STATUSES)[number]) : "PRESENT" };
  });

  await db.transaction(async (tx) => {
    const [session] = await tx
      .insert(attendanceSessions)
      .values({ sectionId: section.id, heldOn, topic })
      .onConflictDoUpdate({ target: [attendanceSessions.sectionId, attendanceSessions.heldOn], set: { topic } })
      .returning();
    if (records.length) {
      await tx
        .insert(attendanceRecords)
        .values(records.map((r) => ({ ...r, sessionId: session.id })))
        .onConflictDoUpdate({
          target: [attendanceRecords.sessionId, attendanceRecords.enrollmentId],
          set: { status: sql`excluded.status` },
        });
    }
  });
  await audit(user.id, "attendance.save", "section", section.id, { heldOn });

  // Warn students the first time they drop below the attendance limit in this course.
  const stats = await attendanceByEnrollment(section.enrollments.map((e) => e.id));
  const newlyLow = section.enrollments.filter((e) => {
    const s = stats.get(e.id);
    return s?.rate != null && s.rate < ATTENDANCE_MIN && s.held >= 3;
  });
  if (newlyLow.length) {
    const already = await db.query.notifications.findMany({
      where: (n, { and, eq, inArray }) =>
        and(eq(n.kind, "ATTENDANCE"), eq(n.link, `/student#${section.course.code}`), inArray(n.userId, newlyLow.map((e) => e.studentId))),
      columns: { userId: true },
    });
    const warned = new Set(already.map((n) => n.userId));
    await notify(
      newlyLow.filter((e) => !warned.has(e.studentId)).map((e) => e.studentId),
      {
        title: `Your attendance in ${section.course.code} is below ${ATTENDANCE_MIN}%`,
        body: "Missing more classes can mean an NA grade. Talk to your instructor if something is keeping you away.",
        link: `/student#${section.course.code}`,
        kind: "ATTENDANCE",
      },
    );
  }
  revalidatePath(sectionPath(section.id));
  return { ok: `Attendance for ${heldOn} saved.` };
}


// ---------- Announcements ----------

const announcementSchema = z.object({
  sectionId: z.coerce.number().int().positive("Choose a section"),
  title: z.string().trim().min(3, "Add a title").max(150),
  body: z.string().trim().min(3, "Write the announcement").max(4000),
});

export async function postSectionAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const parsed = announcementSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  const section = await getOwnedSection(parsed.data.sectionId, user.id);
  await db.insert(announcements).values({ ...parsed.data, sectionId: section.id, authorId: user.id, audience: "SECTION" });
  await audit(user.id, "announcement.create", "section", section.id);
  revalidatePath("/professor", "layout");
  return { ok: `Posted to ${section.course.code} section ${section.code}.` };
}

export async function deleteOwnAnnouncement(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("PROFESSOR");
  const id = Number(formData.get("announcementId"));
  const removed = await db
    .delete(announcements)
    .where(and(eq(announcements.id, id), eq(announcements.authorId, user.id)))
    .returning({ id: announcements.id });
  if (!removed.length) return { error: "Announcement not found." };
  await audit(user.id, "announcement.delete", "announcement", id);
  revalidatePath("/professor", "layout");
  return { ok: "Announcement deleted." };
}

