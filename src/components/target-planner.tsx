"use client";

import { useState } from "react";
import { neededOnRemaining } from "@/domain/gpa";

/**
 * "What do I need on the rest of the course to get X?" Uses the weighted points
 * already earned and the weight still ungraded.
 */
export function TargetPlanner({
  earned,
  remainingWeight,
  bands,
}: {
  earned: number; // weighted percentage points banked so far
  remainingWeight: number;
  bands: { letter: string; minPercent: number }[];
}) {
  const [target, setTarget] = useState(bands.find((b) => b.letter === "CC")?.minPercent ?? 70);
  if (remainingWeight <= 0) return null;
  const needed = neededOnRemaining({ earnedWeighted: earned, remainingWeight, target }) ?? 0;
  let message: string;
  if (needed <= 0) message = "You've already secured this grade.";
  else if (needed > 100) message = `Out of reach: you'd need ${needed.toFixed(0)}% on the remaining ${remainingWeight}%.`;
  else message = `You need an average of ${needed.toFixed(1)}% on the remaining ${remainingWeight}% of the course.`;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-control)] bg-lake-wash px-4 py-3 text-sm text-lake-deep">
      <label className="flex items-center gap-2">
        To finish with
        <select
          className="h-8 rounded-[var(--radius-control)] border border-lake/30 bg-white px-2 text-ink"
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
        >
          {bands.map((b) => (
            <option key={b.letter} value={b.minPercent}>
              {b.letter} ({b.minPercent}%+)
            </option>
          ))}
        </select>
      </label>
      <span>{message}</span>
    </div>
  );
}
