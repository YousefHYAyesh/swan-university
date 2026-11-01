import Link from "next/link";
import { Badge, ButtonLink, Empty, Input, PageHeader, Pagination, Panel, Select, Table, Td, Th, buttonClass } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { searchUsers } from "@/server/admin";

export const metadata = { title: "Users" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; page?: string }> }) {
  await requireRole("ADMIN");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const { rows, total, pageCount } = await searchUsers({ q: sp.q?.trim(), role: sp.role, page });
  const href = (p: number) => `/admin/users?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(sp.role ? { role: sp.role } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader
        title="Users"
        description={`${total} account${total === 1 ? "" : "s"}. Student records are managed by the registrar office.`}
        actions={<ButtonLink href="/admin/users/new">Add staff account</ButtonLink>}
      />
      <Panel flush>
        <form className="flex flex-wrap gap-3 border-b border-line px-5 py-4">
          <Input name="q" defaultValue={sp.q} placeholder="Name or email" className="max-w-xs" />
          <Select name="role" defaultValue={sp.role ?? ""} className="max-w-[12rem]">
            <option value="">All roles</option>
            {Object.entries(ROLE_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <button className={buttonClass("secondary")}>Search</button>
        </form>
        {rows.length === 0 ? (
          <Empty title="No accounts match" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Last sign-in</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <Td>
                    <Link href={`/admin/users/${u.id}`} className="font-medium hover:text-lake">
                      {u.lastName}, {u.firstName}
                    </Link>
                    <div className="text-muted">{u.email}</div>
                  </Td>
                  <Td>{ROLE_LABEL[u.role]}</Td>
                  <Td className="text-ink-soft">{u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"}</Td>
                  <Td>{u.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}</Td>
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
