"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { enrollments, sections } from "@/db/schema";
import { registrationProblems } from "@/domain/registration";
import type { ActionState } from "@/lib/action";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/session";
import { todayIso } from "@/lib/utils";
import { getCurrentTerm } from "./academic";
import { buildContext, sectionsForTerm } from "./registration";

export async function register(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("STUDENT");
  const sectionId = Number(formData.get("sectionId"));
  const term = await getCurrentTerm();
  if (!term || !sectionId) return { error: "Pick a section to register for." };

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the section row so two students can't take the last seat at once.
      await tx.execute(sql`SELECT id FROM sections WHERE id = ${sectionId} FOR UPDATE`);
      const [section] = await sectionsForTerm(term.id, [sectionId]);
      if (!section) return { error: "That section isn't offered this term." };
      const { ctx } = await buildContext(tx, user.id, term.id);
      const problems = registrationProblems(section.forCheck, ctx);
      if (problems.length) return { error: problems.join(". ") + "." };

      await tx
        .insert(enrollments)
        .values({ studentId: user.id, sectionId })
        .onConflictDoUpdate({
          target: [enrollments.studentId, enrollments.sectionId],
          set: { status: "REGISTERED", registeredAt: new Date() },
        });
      return { ok: `Registered for ${section.course.code} section ${section.code}.`, code: section.course.code };
    });
    if ("ok" in result) {
      await audit(user.id, "enrollment.register", "section", sectionId);
      revalidatePath("/student", "layout");
    }
    return result;
  } catch (err) {
    console.error(err);
    return { error: "Registration failed. Try again." };
  }
}

export async function drop(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("STUDENT");
  const sectionId = Number(formData.get("sectionId"));
  const term = await getCurrentTerm();
  if (!term) return { error: "No current term." };
  const today = todayIso();
  if (today < term.registrationOpensOn || today > term.registrationClosesOn) {
    return { error: "The add/drop period is over. Ask the registrar about withdrawing instead." };
  }
  const section = await db.query.sections.findFirst({ where: eq(sections.id, sectionId), with: { course: true } });
  if (!section || section.termId !== term.id) return { error: "That section isn't in the current term." };

  const updated = await db
    .update(enrollments)
    .set({ status: "DROPPED" })
    .where(and(eq(enrollments.studentId, user.id), eq(enrollments.sectionId, sectionId), eq(enrollments.status, "REGISTERED")))
    .returning();
  if (!updated.length) return { error: "You aren't registered for that section." };
  await audit(user.id, "enrollment.drop", "section", sectionId);
  revalidatePath("/student", "layout");
  return { ok: `Dropped ${section.course.code}.` };
}

