import type { DegreeAudit } from "@/domain/degree-audit";
import { Badge, GradeChip, Notice, Panel } from "./ui";

const STATE: Record<string, { label: string; tone: "ok" | "lake" | "danger" | "neutral" }> = {
  DONE: { label: "Passed", tone: "ok" },
  IN_PROGRESS: { label: "Taking now", tone: "lake" },
  FAILED: { label: "Retake needed", tone: "danger" },
  NOT_TAKEN: { label: "Not taken", tone: "neutral" },
};

function Meter({ label, value, max, note }: { label: string; value: number; max: number; note?: string }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 100;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-ink-soft">{label}</span>
        <span className="font-medium">
          {value} <span className="text-muted">/ {max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
        <div className="h-full rounded-full bg-lake" style={{ width: `${pct}%` }} />
      </div>
      {note && <div className="mt-1 text-xs text-muted">{note}</div>}
    </div>
  );
}

export function DegreeProgress({ audit, programName }: { audit: DegreeAudit; programName: string }) {
  const semesters = [...new Set(audit.core.map((c) => c.semester))];
  return (
    <div className="space-y-6">
      {audit.eligible ? (
        <Notice tone="ok">Every graduation requirement for {programName} is met.</Notice>
      ) : (
        <Notice tone="lake">Still needed to graduate: {audit.missing.join(", ")}.</Notice>
      )}
      <Panel>
        <div className="grid gap-6 md:grid-cols-4">
          <Meter
            label="Total credits"
            value={audit.totalCreditsEarned}
            max={audit.totalCreditsRequired}
            note={audit.creditsInProgress ? `+${audit.creditsInProgress} in progress` : undefined}
          />
          <Meter label="Required courses" value={audit.coreDone} max={audit.core.length} />
          <Meter label="Elective credits" value={audit.electiveCreditsEarned} max={audit.electiveCreditsRequired} />
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">Cumulative GPA</span>
              <span className="font-medium">
                {audit.cgpa?.toFixed(2) ?? "—"} <span className="text-muted">/ min {audit.minCgpa.toFixed(2)}</span>
              </span>
            </div>
            <div className="mt-2 text-sm">
              {audit.cgpa != null && audit.cgpa >= audit.minCgpa ? <Badge tone="ok">Meets the minimum</Badge> : <Badge tone="danger">Below the minimum</Badge>}
            </div>
          </div>
        </div>
      </Panel>
      <div className="grid gap-6 md:grid-cols-2">
        {semesters.map((sem) => (
          <Panel key={sem} title={`Semester ${sem}`} flush>
            <ul className="divide-y divide-line">
              {audit.core
                .filter((c) => c.semester === sem)
                .map((c) => (
                  <li key={c.courseId} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="font-medium">{c.code}</span> {c.title} <span className="text-muted">· {c.credits} cr</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {c.letter && c.letter !== "W" && <GradeChip size="sm" letter={c.letter} />}
                      <Badge tone={STATE[c.state].tone}>{STATE[c.state].label}</Badge>
                    </span>
                  </li>
                ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  );
}
