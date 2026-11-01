import { Empty, Input, PageHeader, Pagination, Panel, Table, Td, Th, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/labels";
import { auditPage } from "@/server/admin";

export const metadata = { title: "Audit log" };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; entity?: string; id?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageCount } = await auditPage({ action: sp.action?.trim(), entity: sp.entity, entityId: sp.id, page });
  const href = (p: number) =>
    `/admin/audit?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), ...(sp.entity ? { entity: sp.entity } : {}), ...(sp.id ? { id: sp.id } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Audit log" description={`${total} recorded actions. Every change to grades, records, holds and settings is logged here.`} />
      <Panel flush>
        <form className="flex flex-wrap gap-3 border-b border-line px-5 py-4">
          <Input name="action" defaultValue={sp.action} placeholder="Action, e.g. grades or login" className="max-w-xs" />
          {sp.entity && <input type="hidden" name="entity" value={sp.entity} />}
          {sp.id && <input type="hidden" name="id" value={sp.id} />}
          <button className={buttonClass("secondary")}>Filter</button>
          {(sp.entity || sp.action) && (
            <a href="/admin/audit" className="self-center text-sm text-lake hover:underline">
              Clear filters
            </a>
          )}
        </form>
        {rows.length === 0 ? (
          <Empty title="No matching activity" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>On</Th>
                <Th>Details</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {r.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Td>
                  <Td>
                    {r.firstName ? `${r.firstName} ${r.lastName}` : "System"}
                    {r.role && <div className="text-xs text-muted">{ROLE_LABEL[r.role]}</div>}
                  </Td>
                  <Td className="font-medium">{r.action}</Td>
                  <Td className="text-ink-soft">
                    {r.entity} {r.entityId}
                  </Td>
                  <Td className="max-w-xs truncate text-xs text-muted" title={r.details ? JSON.stringify(r.details) : undefined}>
                    {r.details ? JSON.stringify(r.details) : ""}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageCount={pageCount} hrefFor={href} />
      </Panel>
    </>
  );
}
