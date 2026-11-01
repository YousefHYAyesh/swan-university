import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Empty, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { courseOptions, departmentOptions } from "@/server/admin";
import { ProgramForm, RemoveRequirement, RequirementForm } from "../../../admin-forms";

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const id = Number((await params).id);
  const [program, departments, courses] = await Promise.all([
    db.query.programs.findFirst({ where: eq(programs.id, id), with: { requirements: { with: { course: true } } } }),
    departmentOptions(),
    courseOptions(),
  ]);
  if (!program) notFound();
  const reqs = [...program.requirements].sort((a, b) => a.semester - b.semester || a.course.code.localeCompare(b.course.code));
  const coreCredits = reqs.reduce((s, r) => s + r.course.credits, 0);
  return (
    <>
      <PageHeader back={{ href: "/admin/structure", label: "Faculties & programs" }} title={`${program.degree} ${program.name}`} />
      <div className="space-y-6">
        <Panel title="Program details">
          <ProgramForm values={program} departments={departments} />
        </Panel>
        <Panel
          title="Curriculum"
          actions={<span className="text-sm text-ink-soft">{reqs.length} required courses · {coreCredits} credits</span>}
          flush
        >
          {reqs.length === 0 ? (
            <Empty title="No required courses yet">Students’ degree progress uses this list.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th className="w-28">Semester</Th>
                  <Th>Course</Th>
                  <Th className="text-right">Credits</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {reqs.map((r) => (
                  <tr key={r.courseId}>
                    <Td>{r.semester}</Td>
                    <Td>
                      <span className="font-medium">{r.course.code}</span> {r.course.title}
                    </Td>
                    <Td className="text-right">{r.course.credits}</Td>
                    <Td className="w-24 text-right">
                      <RemoveRequirement programId={program.id} courseId={r.courseId} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <div className="border-t border-line px-5 py-4">
            <RequirementForm programId={program.id} courses={courses.filter((c) => !reqs.some((r) => r.courseId === c.id))} />
          </div>
        </Panel>
      </div>
    </>
  );
}
