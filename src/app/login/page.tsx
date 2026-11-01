import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/server/settings";
import { LoginForm } from "./login-form";
import { SwanMark } from "@/components/brand";

export const metadata: Metadata = { title: "Sign in" };

const DEMO_ACCOUNTS = [
  { role: "Student", email: "student@swan.edu" },
  { role: "Professor", email: "professor@swan.edu" },
  { role: "Registrar", email: "registrar@swan.edu" },
  { role: "Admin", email: "admin@swan.edu" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const settings = await getSettings();
  const demo = process.env.DEMO_MODE === "true";
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_minmax(420px,520px)]">
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
          <SwanMark /> {settings.universityName}
        </Link>
        <div className="max-w-md">
          <p className="text-3xl font-semibold leading-snug">{settings.slogan}</p>
          <p className="mt-4 text-white/70">
            Registration, grades, transcripts and records for students and staff in one place.
          </p>
        </div>
        <Ripples />
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 flex items-center gap-2 font-semibold text-ink lg:hidden">
            <SwanMark className="text-lake" /> {settings.universityName}
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-ink-soft">Use your university email.</p>
          <LoginForm next={next} demoAccounts={demo ? DEMO_ACCOUNTS : []} />
        </div>
      </section>
    </main>
  );
}

function Ripples() {
  return (
    <svg className="pointer-events-none absolute -bottom-40 -right-40 h-[560px] w-[560px] text-lake" viewBox="0 0 400 400" aria-hidden>
      {[60, 100, 140, 180].map((r, i) => (
        <ellipse key={r} cx="200" cy="200" rx={r * 1.4} ry={r * 0.55} fill="none" stroke="currentColor" strokeOpacity={0.5 - i * 0.1} strokeWidth="1.5" />
      ))}
    </svg>
  );
}
