import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
  Building2,
  Layers,
  Route,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";
import { logout } from "@/server/auth-actions";
import { getCurrentTerm, termWeek } from "@/server/academic";
import { getSettings } from "@/server/settings";
import { termLabel } from "@/lib/utils";
import { SwanMark } from "./brand";
import { NavLink } from "./nav-link";
import { NotificationBell } from "./notification-bell";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<Role, { group?: string; items: NavItem[] }[]> = {
  STUDENT: [
    {
      items: [
        { href: "/student", label: "Overview", icon: LayoutDashboard },
        { href: "/student/registration", label: "Course registration", icon: ListChecks },
        { href: "/student/schedule", label: "Weekly schedule", icon: CalendarDays },
        { href: "/student/grades", label: "Grades", icon: GraduationCap },
        { href: "/student/degree", label: "Degree progress", icon: Route },
        { href: "/student/transcript", label: "Transcript", icon: ScrollText },
        { href: "/student/requests", label: "Requests", icon: FileText },
        { href: "/student/profile", label: "Profile", icon: UserRound },
      ],
    },
  ],
  PROFESSOR: [
    {
      items: [
        { href: "/professor", label: "My sections", icon: BookOpen },
        { href: "/professor/advisees", label: "Advisees", icon: Users },
        { href: "/professor/announcements", label: "Announcements", icon: Megaphone },
        { href: "/professor/profile", label: "Profile", icon: UserRound },
      ],
    },
  ],
  REGISTRAR: [
    {
      items: [
        { href: "/registrar", label: "Overview", icon: LayoutDashboard },
        { href: "/registrar/students", label: "Students", icon: Users },
        { href: "/registrar/grades", label: "Grade approvals", icon: ClipboardCheck },
        { href: "/registrar/requests", label: "Requests", icon: Inbox },
        { href: "/registrar/announcements", label: "Announcements", icon: Megaphone },
        { href: "/registrar/profile", label: "Profile", icon: UserRound },
      ],
    },
  ],
  ADMIN: [
    {
      items: [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/users", label: "Users", icon: Users },
      ],
    },
    {
      group: "Academics",
      items: [
        { href: "/admin/structure", label: "Faculties & programs", icon: Building2 },
        { href: "/admin/courses", label: "Courses", icon: BookOpen },
        { href: "/admin/terms", label: "Terms", icon: CalendarDays },
        { href: "/admin/sections", label: "Sections", icon: Layers },
        { href: "/admin/grade-scale", label: "Grade scale", icon: SlidersHorizontal },
      ],
    },
    {
      group: "Operations",
      items: [
        { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
        { href: "/admin/messages", label: "Contact messages", icon: Inbox },
        { href: "/admin/audit", label: "Audit log", icon: ShieldCheck },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ],
};

const ROLE_NAME: Record<Role, string> = {
  ADMIN: "Administrator",
  REGISTRAR: "Registrar office",
  PROFESSOR: "Faculty",
  STUDENT: "Student",
};

export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [term, settings] = await Promise.all([getCurrentTerm(), getSettings()]);
  const week = term ? termWeek(term) : null;
  const nav = NAV[user.role];

  const navList = (
    <nav className="space-y-6">
      {nav.map((section, i) => (
        <div key={i}>
          {section.group && <div className="mb-2 px-3 text-xs font-medium text-white/45">{section.group}</div>}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} exact={item.href.split("/").length === 2}>
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print hidden bg-ink text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Link href="/" className="flex items-center gap-2.5 px-5 py-5 font-semibold">
          <SwanMark className="h-7 w-7 text-[#8fd0e4]" />
          {settings.universityName}
        </Link>
        <div className="flex-1 overflow-y-auto px-3 pb-6">{navList}</div>
        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <div className="truncate font-medium">
            {user.firstName} {user.lastName}
          </div>
          <div className="truncate text-white/55">{ROLE_NAME[user.role]}</div>
          <form action={logout} className="mt-3">
            <button className="text-[#8fd0e4] hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-10 border-b border-line bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-8">
            <details className="relative lg:hidden">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
                <SwanMark className="h-6 w-6 text-lake" /> Menu
              </summary>
              <div className="absolute left-0 top-10 z-20 w-64 rounded-[var(--radius-panel)] bg-ink p-3 text-white shadow-xl">
                {navList}
                <form action={logout} className="mt-4 border-t border-white/10 px-3 pt-3">
                  <button className="text-sm text-[#8fd0e4]">Sign out</button>
                </form>
              </div>
            </details>
            <div className="hidden text-sm text-ink-soft lg:block">
              {term ? (
                <>
                  <span className="font-medium text-ink">{termLabel(term)}</span>
                  {week && <span> · week {week}</span>}
                </>
              ) : (
                "No current term set"
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-ink-soft sm:inline">{user.email}</span>
              <NotificationBell user={user} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1240px] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
