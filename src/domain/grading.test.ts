import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCALE,
  checkWeights,
  currentPercent,
  finalResult,
  letterFor,
  validateScore,
  type AssessmentInput,
} from "./grading";

const scale = DEFAULT_SCALE;

const course: AssessmentInput[] = [
  { id: 1, type: "QUIZ", weight: 10, maxScore: 20 },
  { id: 2, type: "MIDTERM", weight: 30, maxScore: 100 },
  { id: 3, type: "PROJECT", weight: 20, maxScore: 50 },
  { id: 4, type: "FINAL", weight: 40, maxScore: 100 },
];

describe("letterFor", () => {
  it.each([
    [100, "AA"],
    [90, "AA"],
    [89.99, "BA"],
    [85, "BA"],
    [80, "BB"],
    [75, "CB"],
    [70, "CC"],
    [65, "DC"],
    [60, "DD"],
    [59.5, "FD"],
    [50, "FD"],
    [49.99, "FF"],
    [0, "FF"],
  ])("%s%% -> %s", (percent, letter) => {
    expect(letterFor(percent, scale)).toBe(letter);
  });

  // The old PHP scale checked ">= 40" and "< 39", so 39 got no letter.
  it("gives every percentage a letter, with no gaps between bands", () => {
    for (let p = 0; p <= 100; p += 0.25) {
      expect(letterFor(p, scale)).toMatch(/^[A-F]{2}$/);
    }
  });
});

describe("finalResult", () => {
  it("weights each assessment and works in percentages, not raw points", () => {
    const scores = new Map<number, number | null>([
      [1, 18], // 90% of 10
      [2, 80], // 80% of 30
      [3, 45], // 90% of 20
      [4, 85], // 85% of 40
    ]);
    // 9 + 24 + 18 + 34 = 85
    expect(finalResult(course, scores, scale)).toEqual({ percent: 85, letter: "BA" });
  });

  // The old system graded 45/50 as "D" because it used the raw total.
  it("grades 45 out of 50 as 90%", () => {
    const single: AssessmentInput[] = [{ id: 1, type: "FINAL", weight: 100, maxScore: 50 }];
    expect(finalResult(single, new Map([[1, 45]]), scale)).toEqual({ percent: 90, letter: "AA" });
  });

  // The old form treated 0 as "empty" and refused to save it.
  it("accepts a zero as a real score", () => {
    const scores = new Map<number, number | null>([
      [1, 0],
      [2, 100],
      [3, 50],
      [4, 100],
    ]);
    expect(finalResult(course, scores, scale).percent).toBe(90);
  });

  it("counts missing coursework as zero", () => {
    const scores = new Map<number, number | null>([[4, 100]]);
    expect(finalResult(course, scores, scale)).toEqual({ percent: 40, letter: "FF" });
  });

  it("gives NA when the final exam has no score", () => {
    const scores = new Map<number, number | null>([
      [1, 20],
      [2, 100],
      [3, 50],
    ]);
    expect(finalResult(course, scores, scale).letter).toBe("NA");
  });

  it("refuses to grade when weights don't add up to 100", () => {
    const broken = course.slice(0, 3);
    expect(() => finalResult(broken, new Map(), scale)).toThrow(/100%/);
  });
});

describe("currentPercent", () => {
  it("averages only what has been graded so far", () => {
    const scores = new Map<number, number | null>([
      [1, 10], // 50% of weight 10
      [2, 90], // 90% of weight 30
    ]);
    // (5 + 27) / 40 = 80%
    expect(currentPercent(course, scores)).toEqual({ percent: 80, weightCovered: 40 });
  });

  it("returns null before anything is graded", () => {
    expect(currentPercent(course, new Map()).percent).toBeNull();
  });
});

describe("checkWeights", () => {
  it("passes at exactly 100", () => expect(checkWeights(course)).toBeNull());
  it("reports the actual total", () =>
    expect(checkWeights([{ weight: 30 }, { weight: 30 }])).toEqual({ kind: "not-100", total: 60 }));
  it("handles decimal weights without float drift", () =>
    expect(checkWeights([{ weight: 33.33 }, { weight: 33.33 }, { weight: 33.34 }])).toBeNull());
});

describe("validateScore", () => {
  it("allows 0 and the maximum", () => {
    expect(validateScore(0, 20)).toBeNull();
    expect(validateScore(20, 20)).toBeNull();
  });
  it("rejects negatives and scores above the maximum", () => {
    expect(validateScore(-1, 20)).toMatch(/negative/);
    expect(validateScore(21, 20)).toMatch(/20/);
  });
});
