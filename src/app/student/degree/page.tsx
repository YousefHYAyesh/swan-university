import { DegreeProgress } from "@/components/degree-progress";
import { Empty, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getDegreeAudit } from "@/server/degree";
import { getStudent } from "@/server/records";

export const metadata = { title: "Degree progress" };

export default async function DegreePage() {
  const user = await requireRole("STUDENT");
  const student = await getStudent(user.id);
  if (!student) throw new Error("Student record missing");
  const result = await getDegreeAudit(user.id, student.programId);
  return (
    <>
      <PageHeader
        title="Degree progress"
        description={`${student.program.degree} ${student.program.name} · what you've completed and what's left before graduation`}
      />
      {result ? <DegreeProgress audit={result.audit} programName={result.program.name} /> : <Empty title="No curriculum set for your program" />}
    </>
  );
}
