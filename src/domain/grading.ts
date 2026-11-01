export type AssessmentType = "QUIZ" | "HOMEWORK" | "LAB" | "PROJECT" | "MIDTERM" | "FINAL";

export interface AssessmentInput {
  id: number;
  type: AssessmentType;
  weight: number;
  maxScore: number;
}

export interface ScaleEntry {
  letter: string;
  minPercent: number | null; // null for status letters such as NA or W
  points: number | null;
  countsInGpa: boolean;
  isPassing: boolean;
}

/** Letter for a student who didn't sit the final exam. */
const NOT_ATTENDED = "NA";

/** Turkish university scale used as the default. Editable from admin settings. */
export const DEFAULT_SCALE: (ScaleEntry & { description: string })[] = [
  { letter: "AA", minPercent: 90, points: 4.0, countsInGpa: true, isPassing: true, description: "Excellent" },
  { letter: "BA", minPercent: 85, points: 3.5, countsInGpa: true, isPassing: true, description: "Very good" },
  { letter: "BB", minPercent: 80, points: 3.0, countsInGpa: true, isPassing: true, description: "Good" },
  { letter: "CB", minPercent: 75, points: 2.5, countsInGpa: true, isPassing: true, description: "Fairly good" },
  { letter: "CC", minPercent: 70, points: 2.0, countsInGpa: true, isPassing: true, description: "Satisfactory" },
  { letter: "DC", minPercent: 65, points: 1.5, countsInGpa: true, isPassing: true, description: "Conditional pass" },
  { letter: "DD", minPercent: 60, points: 1.0, countsInGpa: true, isPassing: true, description: "Conditional pass" },
  { letter: "FD", minPercent: 50, points: 0.5, countsInGpa: true, isPassing: false, description: "Fail" },
  { letter: "FF", minPercent: 0, points: 0.0, countsInGpa: true, isPassing: false, description: "Fail" },
  { letter: "NA", minPercent: null, points: 0.0, countsInGpa: true, isPassing: false, description: "Fail: did not sit the final exam" },
  { letter: "W", minPercent: null, points: null, countsInGpa: false, isPassing: false, description: "Withdrawn; not counted in the GPA" },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function totalWeight(assessments: Pick<AssessmentInput, "weight">[]): number {
  return round2(assessments.reduce((sum, a) => sum + a.weight, 0));
}

export type WeightProblem = { kind: "empty" } | { kind: "not-100"; total: number };

export function checkWeights(assessments: Pick<AssessmentInput, "weight">[]): WeightProblem | null {
  if (assessments.length === 0) return { kind: "empty" };
  const total = totalWeight(assessments);
  return total === 100 ? null : { kind: "not-100", total };
}

export function validateScore(score: number, maxScore: number): string | null {
  if (!Number.isFinite(score)) return "Score must be a number";
  if (score < 0) return "Score can't be negative";
  if (score > maxScore) return `Score can't be higher than ${maxScore}`;
  return null;
}

/**
 * Weighted percentage so far. Missing scores are left out, so this is a
 * running figure while the term is in progress.
 */
export function currentPercent(
  assessments: AssessmentInput[],
  scores: Map<number, number | null>,
): { percent: number | null; weightCovered: number } {
  let earned = 0;
  let covered = 0;
  for (const a of assessments) {
    const s = scores.get(a.id);
    if (s == null) continue;
    earned += (s / a.maxScore) * a.weight;
    covered += a.weight;
  }
  if (covered === 0) return { percent: null, weightCovered: 0 };
  return { percent: round2((earned / covered) * 100), weightCovered: round2(covered) };
}

/**
 * Final course result once grades are submitted. Missing scores count as zero,
 * except a missing final exam, which gives NA.
 */
export function finalResult(
  assessments: AssessmentInput[],
  scores: Map<number, number | null>,
  scale: ScaleEntry[],
): { percent: number; letter: string } {
  const problem = checkWeights(assessments);
  if (problem) throw new Error("Assessment weights must add up to 100% before grading");

  const finalExam = assessments.find((a) => a.type === "FINAL");
  let earned = 0;
  for (const a of assessments) {
    const s = scores.get(a.id) ?? 0;
    earned += (s / a.maxScore) * a.weight;
  }
  const percent = round2(earned);

  if (finalExam && scores.get(finalExam.id) == null) {
    return { percent, letter: NOT_ATTENDED };
  }
  return { percent, letter: letterFor(percent, scale) };
}

export function letterFor(percent: number, scale: ScaleEntry[]): string {
  const ranked = scale
    .filter((s): s is ScaleEntry & { minPercent: number } => s.minPercent != null)
    .sort((a, b) => b.minPercent - a.minPercent);
  const match = ranked.find((s) => percent >= s.minPercent);
  if (!match) throw new Error("Grade scale has no band starting at 0%");
  return match.letter;
}
