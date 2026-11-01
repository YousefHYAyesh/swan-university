import { notFound } from "next/navigation";
import { StudentForm } from "@/components/student-form";
import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getStudent } from "@/server/records";
import { advisorOptions, programOptions } from "@/server/registrar";

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("REGISTRAR");
  const id = Number((await params).id);
  const [s, programs, advisors] = await Promise.all([getStudent(id), programOptions(), advisorOptions()]);
  if (!s) notFound();
  return (
    <>
      <PageHeader back={{ href: `/registrar/students/${id}`, label: `${s.user.firstName} ${s.user.lastName}` }} title="Edit student" />
      <Panel>
        <StudentForm
          programs={programs}
          advisors={advisors}
          values={{ ...s, studentId: s.userId, firstName: s.user.firstName, lastName: s.user.lastName, email: s.user.email }}
        />
      </Panel>
    </>
  );
}
