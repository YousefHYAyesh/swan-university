import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { departmentOptions } from "@/server/admin";
import { StaffForm } from "../../admin-forms";

export const metadata = { title: "Add staff account" };

export default async function NewStaff() {
  await requireRole("ADMIN");
  const departments = await departmentOptions();
  return (
    <>
      <PageHeader back={{ href: "/admin/users", label: "Users" }} title="Add staff account" description="A temporary password is generated after you save." />
      <Panel>
        <StaffForm departments={departments} />
      </Panel>
    </>
  );
}
