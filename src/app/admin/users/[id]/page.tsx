import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Badge, DescList, Notice, PageHeader, Panel } from "@/components/ui";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/auth/session";
import { ROLE_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { departmentOptions } from "@/server/admin";
import { AccountActions, StaffForm } from "../../admin-forms";

export default async function UserPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const me = await requireRole("ADMIN");
  const id = Number((await params).id);
  const { created } = await searchParams;
  const [u, departments] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, id), with: { staff: true, student: { with: { program: true } } } }),
    departmentOptions(),
  ]);
  if (!u) notFound();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/users", label: "Users" }}
        title={`${u.firstName} ${u.lastName}`}
        description={`${ROLE_LABEL[u.role]} · ${u.email}`}
        actions={u.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="danger">Deactivated</Badge>}
      />
      {created && (
        <div className="mb-6">
          <Notice tone="ok">
            Account created. Temporary password: <code className="font-semibold">{created}</code>. Share it securely; it won’t be shown again.
          </Notice>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Panel title={u.staff ? "Staff details" : "Student account"}>
          {u.staff ? (
            <StaffForm departments={departments} values={{ ...u.staff, userId: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role }} />
          ) : (
            <>
              <DescList
                items={[
                  ["Student no.", u.student?.studentNo],
                  ["Program", u.student?.program.name],
                  ["Status", u.student?.status.toLowerCase()],
                ]}
              />
              <p className="mt-4 text-sm text-ink-soft">
                Academic records are edited by the registrar office. As an admin you can still deactivate the account or reset its password.
              </p>
            </>
          )}
        </Panel>
        <Panel title="Account">
          <DescList
            items={[
              ["Created", formatDate(u.createdAt)],
              ["Last sign-in", u.lastLoginAt ? formatDate(u.lastLoginAt) : "Never"],
            ]}
          />
          {u.id !== me.id && (
            <div className="mt-5">
              <AccountActions userId={u.id} active={u.isActive} />
            </div>
          )}
          <Link href={`/admin/audit?entity=user&id=${u.id}`} className="mt-5 inline-block text-sm text-lake hover:underline">
            Activity for this account
          </Link>
        </Panel>
      </div>
    </>
  );
}
