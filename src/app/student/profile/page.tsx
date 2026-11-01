import { DescList, PageHeader, Panel } from "@/components/ui";
import { EmailPreference } from "@/components/email-preference";
import { PasswordForm } from "@/components/password-form";
import { requireRole } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";
import { getStudent } from "@/server/records";
import { ContactForm } from "./contact-form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireRole("STUDENT");
  const s = await getStudent(user.id);
  if (!s) throw new Error("Student record missing");
  return (
    <>
      <PageHeader title="Profile" description="Your records are kept by the registrar office. Contact them to correct anything you can't change here." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Student record">
          <DescList
            items={[
              ["Name", `${s.user.firstName} ${s.user.lastName}`],
              ["Student no.", s.studentNo],
              ["Email", s.user.email],
              ["Program", `${s.program.degree} ${s.program.name}`],
              ["Department", s.program.department.name],
              ["Entry year", s.entryYear],
              ["Date of birth", formatDate(s.dateOfBirth)],
              ["Advisor", s.advisor ? `${s.advisor.title} ${s.advisor.user.firstName} ${s.advisor.user.lastName}` : "Not assigned"],
              ["Guardian", s.guardianName ? `${s.guardianName} (${s.guardianPhone ?? "no phone"})` : null],
            ]}
          />
        </Panel>
        <div className="space-y-6">
          <Panel title="Contact details">
            <ContactForm phone={s.phone} address={s.address} />
          </Panel>
          <Panel title="Notifications">
            <EmailPreference enabled={s.user.emailNotifications} />
          </Panel>
          <Panel title="Password">
            <PasswordForm />
          </Panel>
        </div>
      </div>
    </>
  );
}
