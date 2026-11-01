import Link from "next/link";
import { Empty, PageHeader, Panel, Stat, Table, Td } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { formatDate, termLabel } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { adminCounts, auditPage } from "@/server/admin";
import { registrarCounts } from "@/server/registrar";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireRole("ADMIN");
  const term = await getCurrentTerm();
  const [counts, ops, recent] = await Promise.all([adminCounts(), registrarCounts(term?.id ?? null), auditPage({ page: 1 })]);
  return (
    <>
      <PageHeader title="Administration" description={term ? `Current term: ${termLabel(term)}` : "No current term is set. Pick one under Terms."} />
      <Panel className="mb-6">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat label="Active students" value={counts.activeStudents} />
          <Stat label="Faculty" value={counts.byRole.PROFESSOR ?? 0} note={`${counts.byRole.REGISTRAR ?? 0} registrar, ${counts.byRole.ADMIN ?? 0} admin`} />
          <Stat label="Sections this term" value={counts.sectionsNow} note={`${ops.draftSections} not yet submitted`} />
          <Stat label="Sign-ins this week" value={counts.logins} />
        </div>
      </Panel>
      <Panel title="Recent activity" actions={<Link href="/admin/audit" className="text-sm text-lake hover:underline">Full audit log</Link>} flush>
        {recent.rows.length === 0 ? (
          <Empty title="No activity yet" />
        ) : (
          <Table>
            <tbody>
              {recent.rows.slice(0, 12).map((r) => (
                <tr key={r.id}>
                  <Td className="w-40 text-ink-soft">{formatDate(r.createdAt)}</Td>
                  <Td>{r.firstName ? `${r.firstName} ${r.lastName}` : "System"}</Td>
                  <Td className="font-medium">{r.action}</Td>
                  <Td className="text-muted">
                    {r.entity} {r.entityId}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Panel>
    </>
  );
}
