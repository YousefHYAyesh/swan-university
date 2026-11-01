import { describe, expect, it } from "vitest";
import { DEFAULT_SCALE } from "./grading";
import { cumulativeGpa, neededOnRemaining, standing, termGpa } from "./gpa";

const scale = DEFAULT_SCALE;

describe("termGpa", () => {
  it("weights grade points by credits", () => {
    const result = termGpa(
      [
        { courseId: 1, credits: 4, letter: "AA", termKey: 1 }, // 16
        { courseId: 2, credits: 3, letter: "CC", termKey: 1 }, // 6
        { courseId: 3, credits: 2, letter: "FF", termKey: 1 }, // 0
      ],
      scale,
    );
    expect(result).toEqual({ gpa: 2.44, credits: 9, earnedCredits: 7 });
  });

  it("leaves withdrawn courses out of the GPA", () => {
    const result = termGpa(
      [
        { courseId: 1, credits: 3, letter: "BB", termKey: 1 },
        { courseId: 2, credits: 3, letter: "W", termKey: 1 },
      ],
      scale,
    );
    expect(result.gpa).toBe(3);
    expect(result.credits).toBe(3);
  });

  it("counts NA as a fail with zero points", () => {
    const result = termGpa(
      [
        { courseId: 1, credits: 3, letter: "AA", termKey: 1 },
        { courseId: 2, credits: 3, letter: "NA", termKey: 1 },
      ],
      scale,
    );
    expect(result.gpa).toBe(2);
    expect(result.earnedCredits).toBe(3);
  });

  it("is null with nothing graded", () => {
    expect(termGpa([], scale).gpa).toBeNull();
  });
});

describe("cumulativeGpa", () => {
  it("replaces a failed attempt with the retake", () => {
    const result = cumulativeGpa(
      [
        { courseId: 1, credits: 3, letter: "FF", termKey: 20241 },
        { courseId: 1, credits: 3, letter: "BB", termKey: 20251 },
        { courseId: 2, credits: 3, letter: "AA", termKey: 20241 },
      ],
      scale,
    );
    expect(result).toEqual({ gpa: 3.5, credits: 6, earnedCredits: 6 });
  });
});

describe("standing", () => {
  const base = { probationBelow: 2, failedLastTerm: false };
  it("is NEW before any grades", () =>
    expect(standing({ ...base, cgpa: null, lastTermGpa: null })).toBe("NEW"));
  it("puts low cumulative GPA on probation", () =>
    expect(standing({ ...base, cgpa: 1.8, lastTermGpa: 3.6 })).toBe("PROBATION"));
  it("awards honors from the term GPA", () => {
    expect(standing({ ...base, cgpa: 3.1, lastTermGpa: 3.2 })).toBe("HONOR");
    expect(standing({ ...base, cgpa: 3.1, lastTermGpa: 3.7 })).toBe("HIGH_HONOR");
  });
  it("withholds honors after a failed course", () =>
    expect(standing({ ...base, cgpa: 3.1, lastTermGpa: 3.7, failedLastTerm: true })).toBe("GOOD"));
});

describe("neededOnRemaining", () => {
  it("works out the average needed on what's left", () => {
    // 40 points banked from 60% of the weight; need 70 overall from the last 40% -> 75%
    expect(neededOnRemaining({ earnedWeighted: 40, remainingWeight: 40, target: 70 })).toBe(75);
  });
  it("can be above 100 when the target is out of reach", () => {
    expect(neededOnRemaining({ earnedWeighted: 20, remainingWeight: 40, target: 70 })).toBe(125);
  });
});
