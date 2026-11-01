import { AnnouncementManager } from "@/components/announcement-manager";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Announcements" };

export default async function Page() {
  const user = await requireRole("REGISTRAR");
  return <AnnouncementManager user={user} />;
}
