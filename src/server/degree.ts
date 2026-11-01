import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { programRequirements, programs } from "@/db/schema";
import { degreeAudit } from "@/domain/degree-audit";
import { getScale } from "./academic";
import { academicSummary } from "./records";

export async function getDegreeAudit(studentId: number, programId: number) {
  const [program, reqs, summary, scale] = await Promise.all([
    db.query.programs.findFirst({ where: eq(programs.id, programId) }),
    db.query.programRequirements.findMany({ where: eq(programRequirements.programId, programId), with: { course: true } }),
    academicSummary(studentId),
    getScale(),
  ]);
  if (!program) return null;
  const passing = new Set(scale.filter((g) => g.isPassing).map((g) => g.letter));
  const attempts = summary.terms.flatMap((t) =>
    t.rows
      .filter((r) => r.status !== "DROPPED")
      .map((r) => {
        const approved = r.section.gradeStatus === "APPROVED";
        const letter = r.status === "WITHDRAWN" ? "W" : approved ? r.letterGrade : null;
        return { courseId: r.section.courseId, code: r.section.course.code, credits: r.section.course.credits, letter, passed: !!letter && passing.has(letter) };
      }),
  );
  return {
    program,
    audit: degreeAudit({
      required: reqs.map((r) => ({ courseId: r.courseId, code: r.course.code, title: r.course.title, credits: r.course.credits, semester: r.semester })),
      attempts,
      totalCreditsRequired: program.requiredCredits,
      electiveCreditsRequired: program.electiveCredits,
      cgpa: summary.cgpa,
      minCgpa: program.minCgpa,
    }),
  };
}
