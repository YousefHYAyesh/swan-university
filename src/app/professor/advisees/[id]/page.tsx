import { notFound } from "next/navigation";
import { StudentRecord } from "@/components/student-record";
import { PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { isAdvisorOf } from "@/server/professor";
import { getDegreeAudit } from "@/server/degree";
import { academicSummary, activeHolds, getStudent } from "@/server/records";

export default async function AdviseePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("PROFESSOR");
  const id = Number((await params).id);
  // Advisors only see their own advisees.
  if (!(await isAdvisorOf(user.id, id))) notFound();
  const [student, summary, holds] = await Promise.all([getStudent(id), academicSummary(id), activeHolds(id)]);
  if (!student) notFound();
  const degree = await getDegreeAudit(id, student.programId);
  return (
    <>
      <PageHeader back={{ href: "/professor/advisees", label: "Advisees" }} title={`${student.user.firstName} ${student.user.lastName}`} />
      <StudentRecord student={student} summary={summary} holds={holds} degree={degree?.audit} />
    </>
  );
}
