import { PageHeader, Panel } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { getSettings } from "@/server/settings";
import { SettingsForm } from "../admin-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" />
      <Panel>
        <SettingsForm values={settings} />
      </Panel>
    </>
  );
}
