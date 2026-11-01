import Link from "next/link";
import { Badge, ButtonLink, Empty, Input, PageHeader, Pagination, Panel, Select, Table, Td, Th, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { programOptions, searchStudents } from "@/server/registrar";

export const metadata = { title: "Students" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; program?: string; status?: string; page?: string }>;
}) {
  await requireRole("REGISTRAR");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ rows, total, pageCount }, programs] = await Promise.all([
    searchStudents({ q: sp.q?.trim(), programId: Number(sp.program) || undefined, status: sp.status || undefined, page }),
    programOptions(),
  ]);
  const qs = (p: number) => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.program) params.set("program", sp.program);
    if (sp.status) params.set("status", sp.status);
    params.set("page", String(p));
    return `/registrar/students?${params}`;
  };
  return (
    <>
      <PageHeader
        title="Students"
        description={`${total} student${total === 1 ? "" : "s"}`}
        actions={
          <>
            <a href="/registrar/students/export" download className={buttonClass("secondary")}>
              Export CSV
            </a>
            <ButtonLink href="/registrar/students/new">Add student</ButtonLink>
          </>
        }
      />
      <Panel flush>
        <form className="flex flex-wrap gap-3 border-b border-line px-5 py-4">
          <Input name="q" defaultValue={sp.q} placeholder="Name, student no. or email" className="max-w-xs" />
          <Select name="program" defaultValue={sp.program ?? ""} className="max-w-xs">
            <option value="">All programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select name="status" defaultValue={sp.status ?? ""} className="max-w-[12rem]">
            <option value="">Any status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="GRADUATED">Graduated</option>
            <option value="WITHDRAWN">Withdrawn</option>
          </Select>
          <button className={buttonClass("secondary")}>Search</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No students match" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Student no.</Th>
                <Th>Program</Th>
                <Th>Entry</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <Td>
                    <Link href={`/registrar/students/${s.id}`} className="font-medium hover:text-lake">
                      {s.lastName}, {s.firstName}
                    </Link>
                    <div className="text-muted">{s.email}</div>
                  </Td>
                  <Td>{s.studentNo}</Td>
                  <Td className="text-ink-soft">{s.program}</Td>
                  <Td>{s.entryYear}</Td>
                  <Td className="space-x-1">
                    <Badge tone={s.status === "ACTIVE" ? "ok" : "neutral"}>{s.status.toLowerCase()}</Badge>
                    {s.holds > 0 && <Badge tone="danger">hold</Badge>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageCount={pageCount} hrefFor={qs} />
      </Panel>
    </>
  );
}
