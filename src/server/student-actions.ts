"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { studentRequests, students } from "@/db/schema";
import { formObject, invalid, type ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";

const requestSchema = z.object({
  type: z.enum(["ENROLLMENT_CERTIFICATE", "TRANSCRIPT", "GRADE_APPEAL", "OTHER"], { message: "Choose a request type" }),
  note: z.string().max(1000, "Keep it under 1000 characters").optional(),
});

export async function createRequest(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("STUDENT");
  const parsed = requestSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  if ((parsed.data.type === "GRADE_APPEAL" || parsed.data.type === "OTHER") && !parsed.data.note) {
    return { error: "Check the highlighted fields.", fieldErrors: { note: "Explain what you need" } };
  }
  const pending = await db.query.studentRequests.findFirst({
    where: and(eq(studentRequests.studentId, user.id), eq(studentRequests.type, parsed.data.type), eq(studentRequests.status, "PENDING")),
  });
  if (pending && parsed.data.type !== "OTHER") return { error: "You already have a pending request of this type." };

  const [row] = await db.insert(studentRequests).values({ studentId: user.id, ...parsed.data }).returning();
  await audit(user.id, "request.create", "student_request", row.id, { type: row.type });
  revalidatePath("/student/requests");
  return { ok: "Request sent. The registrar office will reply here." };
}

const contactSchema = z.object({
  phone: z.string().max(30).regex(/^[+\d\s()-]*$/, "Use digits, spaces and + only").optional(),
  address: z.string().max(300).optional(),
});

export async function updateContact(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("STUDENT");
  const parsed = contactSchema.safeParse(formObject(formData));
  if (!parsed.success) return invalid(parsed.error);
  await db
    .update(students)
    .set({ phone: parsed.data.phone ?? null, address: parsed.data.address ?? null })
    .where(eq(students.userId, user.id));
  await audit(user.id, "student.contact.update", "student", user.id);
  revalidatePath("/student/profile");
  return { ok: "Contact details saved." };
}
