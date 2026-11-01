import { StudentForm } from "@/components/student-form";
import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { advisorOptions, programOptions } from "@/server/registrar";

export const metadata = { title: "Add student" };

export default async function NewStudentPage() {
  await requireRole("REGISTRAR");
  const [programs, advisors] = await Promise.all([programOptions(), advisorOptions()]);
  return (
    <>
      <PageHeader back={{ href: "/registrar/students", label: "Students" }} title="Add student" description="A temporary password is generated; share it with the student so they can sign in and change it." />
      <Panel>
        <StudentForm programs={programs} advisors={advisors} />
      </Panel>
    </>
  );
}
