import { describe, expect, it } from "vitest";
import { degreeAudit, type CourseAttempt, type RequiredCourse } from "./degree-audit";

const required: RequiredCourse[] = [
  { courseId: 1, code: "SEN121", title: "Programming I", credits: 4, semester: 1 },
  { courseId: 2, code: "SEN122", title: "Programming II", credits: 4, semester: 2 },
  { courseId: 3, code: "MAT101", title: "Calculus I", credits: 4, semester: 1 },
];

const base = { required, totalCreditsRequired: 20, electiveCreditsRequired: 6, minCgpa: 2 };
const pass = (courseId: number, code: string, credits: number, letter = "BB"): CourseAttempt => ({ courseId, code, credits, letter, passed: true });

describe("degreeAudit", () => {
  it("marks each core course by its best attempt", () => {
    const audit = degreeAudit({
      ...base,
      cgpa: 2.5,
      attempts: [
        { courseId: 1, code: "SEN121", credits: 4, letter: "FF", passed: false },
        pass(1, "SEN121", 4, "CC"),
        { courseId: 2, code: "SEN122", credits: 4, letter: null, passed: false },
      ],
    });
    expect(audit.core.map((c) => [c.code, c.state])).toEqual([
      ["MAT101", "NOT_TAKEN"],
      ["SEN121", "DONE"],
      ["SEN122", "IN_PROGRESS"],
    ]);
    expect(audit.creditsInProgress).toBe(4);
  });

  it("shows a failed core course that hasn't been retaken", () => {
    const audit = degreeAudit({ ...base, cgpa: 1.5, attempts: [{ courseId: 3, code: "MAT101", credits: 4, letter: "FD", passed: false }] });
    expect(audit.core.find((c) => c.code === "MAT101")?.state).toBe("FAILED");
  });

  it("counts non-core passes as electives", () => {
    const audit = degreeAudit({ ...base, cgpa: 3, attempts: [pass(1, "SEN121", 4), pass(9, "ELL419", 2), pass(8, "IGS304", 2)] });
    expect(audit.electiveCreditsEarned).toBe(4);
    expect(audit.totalCreditsEarned).toBe(8);
    expect(audit.missing).toContain("2 elective credits");
  });

  it("is eligible when every rule is met", () => {
    const audit = degreeAudit({
      ...base,
      cgpa: 2.8,
      attempts: [pass(1, "SEN121", 4), pass(2, "SEN122", 4), pass(3, "MAT101", 4), pass(9, "ELL419", 4), pass(8, "IGS304", 4)],
    });
    expect(audit.eligible).toBe(true);
    expect(audit.percentComplete).toBe(100);
  });

  it("blocks graduation on a low CGPA even with all credits", () => {
    const audit = degreeAudit({
      ...base,
      cgpa: 1.9,
      attempts: [pass(1, "SEN121", 4), pass(2, "SEN122", 4), pass(3, "MAT101", 4), pass(9, "ELL419", 4), pass(8, "IGS304", 4)],
    });
    expect(audit.eligible).toBe(false);
    expect(audit.missing).toEqual(["a cumulative GPA of at least 2.00"]);
  });
});
