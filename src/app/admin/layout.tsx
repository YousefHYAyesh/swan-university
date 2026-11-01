import { AppShell } from "@/components/shell";
import { requireRole } from "@/lib/auth/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return <AppShell user={user}>{children}</AppShell>;
}
