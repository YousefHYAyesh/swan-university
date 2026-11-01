import { StaffProfile } from "@/components/staff-profile";
import { requireRole } from "@/lib/auth/session";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireRole("REGISTRAR");
  return <StaffProfile user={user} />;
}
