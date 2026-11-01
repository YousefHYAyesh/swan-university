import { eq } from "drizzle-orm";
import { db } from "@/db";
import { staff, users } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { DescList, PageHeader, Panel } from "./ui";
import { EmailPreference } from "./email-preference";
import { PasswordForm } from "./password-form";

export async function StaffProfile({ user }: { user: SessionUser }) {
  const [record, account] = await Promise.all([
    db.query.staff.findFirst({ where: eq(staff.userId, user.id), with: { department: true } }),
    db.query.users.findFirst({ where: eq(users.id, user.id), columns: { emailNotifications: true } }),
  ]);
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Staff record">
          <DescList
            items={[
              ["Name", `${record?.title ?? ""} ${user.firstName} ${user.lastName}`.trim()],
              ["Email", user.email],
              ["Employee no.", record?.employeeNo],
              ["Department", record?.department?.name],
              ["Office", record?.office],
              ["Phone", record?.phone],
            ]}
          />
        </Panel>
        <div className="space-y-6">
          <Panel title="Notifications">
            <EmailPreference enabled={account?.emailNotifications ?? true} />
          </Panel>
          <Panel title="Password">
            <PasswordForm />
          </Panel>
        </div>
      </div>
    </>
  );
}
