import { desc } from "drizzle-orm";
import { Badge, PageHeader, Panel, Table, Td, Th } from "@/components/ui";
import { db } from "@/db";
import { terms } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { formatDate, termLabel } from "@/lib/utils";
import { MakeCurrent, TermForm } from "../admin-forms";

export const metadata = { title: "Terms" };

export default async function TermsPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireRole("ADMIN");
  const { edit } = await searchParams;
  const rows = await db.query.terms.findMany({ orderBy: [desc(terms.startYear), desc(terms.season)] });
  const editing = rows.find((t) => t.id === Number(edit));
  return (
    <>
      <PageHeader title="Terms" description="Term dates drive registration windows, grade deadlines and which term everyone sees." />
      <Panel flush className="mb-6">
        <Table>
          <thead>
            <tr>
              <Th>Term</Th>
              <Th>Teaching</Th>
              <Th>Add/drop</Th>
              <Th>Grades due</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <Td className="font-medium">
                  {termLabel(t)} {t.isCurrent && <Badge tone="lake">Current</Badge>}
                </Td>
                <Td className="text-ink-soft">
                  {formatDate(t.startsOn)} – {formatDate(t.endsOn)}
                </Td>
                <Td className="text-ink-soft">
                  {formatDate(t.registrationOpensOn)} – {formatDate(t.registrationClosesOn)}
                </Td>
                <Td className="text-ink-soft">{formatDate(t.gradeDeadline)}</Td>
                <Td className="space-x-2 whitespace-nowrap text-right">
                  <a href={`/admin/terms?edit=${t.id}`} className="text-sm text-lake hover:underline">
                    Edit
                  </a>
                  {!t.isCurrent && <MakeCurrent id={t.id} />}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
      <Panel title={editing ? `Edit ${termLabel(editing)}` : "Add a term"}>
        <TermForm key={editing?.id ?? "new"} values={editing} />
      </Panel>
    </>
  );
}
