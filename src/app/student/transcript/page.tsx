import { PrintButton } from "@/components/print-button";
import { Transcript } from "@/components/transcript";
import { Notice, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getScale } from "@/server/academic";
import { academicSummary, activeHolds, getStudent } from "@/server/records";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Transcript" };

export default async function TranscriptPage() {
  const user = await requireRole("STUDENT");
  const [student, summary, settings, scale, holds] = await Promise.all([
    getStudent(user.id),
    academicSummary(user.id),
    getSettings(),
    getScale(),
    activeHolds(user.id),
  ]);
  if (!student) throw new Error("Student record missing");
  const blocked = holds.find((h) => h.type === "TRANSCRIPT");

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Transcript"
          description="Your unofficial transcript. For a stamped copy, send a transcript request to the registrar."
          actions={!blocked && <PrintButton />}
        />
      </div>
      {blocked ? (
        <Notice tone="danger">Your transcript is on hold: {blocked.reason}. Contact the registrar office.</Notice>
      ) : (
        <Transcript
          student={student}
          summary={summary}
          universityName={settings.universityName}
          scalePoints={new Map(scale.map((g) => [g.letter, g.points]))}
        />
      )}
    </>
  );
}
