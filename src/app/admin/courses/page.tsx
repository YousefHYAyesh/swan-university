import Link from "next/link";
import { asc, ilike, or } from "drizzle-orm";
import { Badge, ButtonLink, Empty, Input, PageHeader, Panel, Table, Td, Th, buttonClass } from "@/components/ui";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Courses" };

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireRole("ADMIN");
  const { q } = await searchParams;
  const rows = await db.query.courses.findMany({
    where: q ? or(ilike(courses.code, `%${q}%`), ilike(courses.title, `%${q}%`)) : undefined,
    with: { department: true, prerequisites: { with: { prerequisite: true } } },
    orderBy: [asc(courses.code)],
  });
  return (
    <>
      <PageHeader title="Courses" description={`${rows.length} courses in the catalog`} actions={<ButtonLink href="/admin/courses/new">Add course</ButtonLink>} />
      <Panel flush>
        <form className="flex gap-3 border-b border-line px-5 py-4">
          <Input name="q" defaultValue={q} placeholder="Code or title" className="max-w-xs" />
          <button className={buttonClass("secondary")}>Search</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No courses match" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Course</Th>
                <Th>Department</Th>
                <Th className="text-right">Credits</Th>
                <Th className="text-right">ECTS</Th>
                <Th>Prerequisites</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/admin/courses/${c.id}`} className="font-medium hover:text-lake">
                      {c.code}
                    </Link>{" "}
                    {c.title} {!c.isActive && <Badge>inactive</Badge>}
                  </Td>
                  <Td className="text-ink-soft">{c.department.name}</Td>
                  <Td className="text-right">{c.credits}</Td>
                  <Td className="text-right">{c.ects}</Td>
                  <Td className="text-ink-soft">{c.prerequisites.map((p) => p.prerequisite.code).join(", ") || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
