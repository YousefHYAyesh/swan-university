import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { Transcript } from "@/components/transcript";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getScale } from "@/server/academic";
import { academicSummary, getStudent } from "@/server/records";
import { getSettings } from "@/server/settings";

export default async function RegistrarTranscript({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("REGISTRAR");
  const id = Number((await params).id);
  const [student, summary, settings, scale] = await Promise.all([getStudent(id), academicSummary(id), getSettings(), getScale()]);
  if (!student) notFound();
  return (
    <>
      <div className="no-print">
        <PageHeader
          back={{ href: `/registrar/students/${id}`, label: `${student.user.firstName} ${student.user.lastName}` }}
          title="Official transcript"
          actions={<PrintButton />}
        />
      </div>
      <Transcript student={student} summary={summary} universityName={settings.universityName} scalePoints={new Map(scale.map((g) => [g.letter, g.points]))} />
    </>
  );
}
