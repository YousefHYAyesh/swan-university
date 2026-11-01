import Link from "next/link";
import { db } from "@/db";
import { Empty, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { departmentOptions, facultyOptions } from "@/server/admin";
import { DepartmentForm, FacultyForm, ProgramForm } from "../admin-forms";

export const metadata = { title: "Faculties & programs" };

export default async function StructurePage() {
  await requireRole("ADMIN");
  const [faculties, deptOpts, facOpts, programs] = await Promise.all([
    db.query.faculties.findMany({ with: { departments: { orderBy: (d, { asc }) => [asc(d.name)] } }, orderBy: (f, { asc }) => [asc(f.name)] }),
    departmentOptions(),
    facultyOptions(),
    db.query.programs.findMany({ with: { department: true, requirements: true }, orderBy: (p, { asc }) => [asc(p.name)] }),
  ]);
  return (
    <>
      <PageHeader title="Faculties & programs" description="The university's organisation: faculties contain departments, departments own courses and degree programs." />
      <div className="space-y-6">
        <Panel title="Programs" flush>
          {programs.length === 0 ? (
            <Empty title="No programs yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Program</Th>
                  <Th>Department</Th>
                  <Th className="text-right">Required courses</Th>
                  <Th className="text-right">Credits to graduate</Th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <Link href={`/admin/structure/programs/${p.id}`} className="font-medium hover:text-lake">
                        {p.degree} {p.name}
                      </Link>
                      <div className="text-muted">{p.code}</div>
                    </Td>
                    <Td className="text-ink-soft">{p.department.name}</Td>
                    <Td className="text-right">{p.requirements.length}</Td>
                    <Td className="text-right">{p.requiredCredits}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          <details className="border-t border-line px-5 py-4">
            <summary className="cursor-pointer text-sm font-medium text-lake">Add a program</summary>
            <div className="mt-4">
              <ProgramForm departments={deptOpts} />
            </div>
          </details>
        </Panel>

        {faculties.map((f) => {
          const depts = f.departments;
          return (
            <Panel key={f.id} title={f.name} actions={<span className="text-sm text-muted">{f.code}</span>}>
              <div className="space-y-3">
                {depts.map((d) => (
                  <DepartmentForm key={d.id} values={d} faculties={facOpts} />
                ))}
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-lake">Rename faculty</summary>
                  <div className="mt-3">
                    <FacultyForm values={f} />
                  </div>
                </details>
              </div>
            </Panel>
          );
        })}

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Add a department">
            <DepartmentForm faculties={facOpts} />
          </Panel>
          <Panel title="Add a faculty">
            <FacultyForm />
          </Panel>
        </div>
      </div>
    </>
  );
}
