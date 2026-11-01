import Link from "next/link";
import { SwanMark } from "@/components/brand";
import { buttonClass } from "@/components/ui";
import { db } from "@/db";
import { getSession, homeFor } from "@/lib/auth/session";
import { formatDate, termLabel } from "@/lib/utils";
import { getCurrentTerm } from "@/server/academic";
import { getSettings } from "@/server/settings";
import { ContactForm } from "./contact-form";

export default async function Home() {
  const [settings, term, user, programs, faculties] = await Promise.all([
    getSettings(),
    getCurrentTerm(),
    getSession(),
    db.query.programs.findMany({ with: { department: true, requirements: true } }),
    db.query.faculties.findMany({ with: { departments: true } }),
  ]);

  return (
    <div className="min-h-screen bg-white">
      <header className="relative overflow-hidden bg-ink text-white">
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="flex items-center gap-2.5 text-lg font-semibold">
            <SwanMark className="text-[#8fd0e4]" /> {settings.universityName}
          </span>
          <Link href={user ? homeFor(user.role) : "/login"} className="rounded-[var(--radius-control)] border border-white/25 px-4 py-2 text-sm hover:bg-white/10">
            {user ? "Open your portal" : "Sign in"}
          </Link>
        </nav>
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-16 sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-6xl">{settings.slogan || settings.universityName}</h1>
          <p className="mt-6 max-w-xl text-lg text-white/75">
            Registration, grades, transcripts and records for every student and member of staff, in one place.
          </p>
          {term && (
            <p className="mt-10 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 border-l-2 border-[#8fd0e4] pl-4 text-sm text-white/80">
              <span className="font-medium text-white">{termLabel(term)}</span>
              <span>Add/drop closes {formatDate(term.registrationClosesOn)}</span>
            </p>
          )}
        </div>
        <svg className="pointer-events-none absolute -bottom-48 right-[-12rem] h-[640px] w-[640px] text-lake" viewBox="0 0 400 400" aria-hidden>
          {[50, 85, 120, 155, 190].map((r, i) => (
            <ellipse key={r} cx="200" cy="200" rx={r * 1.5} ry={r * 0.5} fill="none" stroke="currentColor" strokeOpacity={0.55 - i * 0.1} strokeWidth="1.5" />
          ))}
        </svg>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">About the university</h2>
            {settings.about.split("\n").filter(Boolean).map((p, i) => (
              <p key={i} className="mt-4 max-w-[62ch] leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Degree programs</h2>
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {programs.map((p) => (
                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 py-4">
                  <span>
                    <span className="font-medium">
                      {p.degree} {p.name}
                    </span>
                    <span className="block text-sm text-muted">{p.department.name}</span>
                  </span>
                  <span className="text-sm text-ink-soft">
                    {p.durationYears} years · {p.requiredCredits} credits · {p.requirements.length} core courses
                  </span>
                </li>
              ))}
            </ul>
            <h3 className="mt-10 font-semibold">Faculties</h3>
            <ul className="mt-2 space-y-2 text-sm text-ink-soft">
              {faculties.map((f) => (
                <li key={f.id}>
                  <span className="font-medium text-ink">{f.name}</span>: {f.departments.map((d) => d.name).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-paper">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Questions about studying here?</h2>
              <p className="mt-4 max-w-[52ch] text-ink-soft">
                Ask about admissions, programs, exchange semesters or campus life. Messages go straight to the admissions office.
              </p>
              <p className="mt-6 text-sm text-ink-soft">
                Already a student or staff member?{" "}
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  Sign in to your portal
                </Link>
              </p>
            </div>
            <div className="rounded-[var(--radius-panel)] border border-line bg-white p-6">
              <ContactForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-sm text-muted">
          <span>{settings.universityName} is a fictional university used to demo this student information system.</span>
          <a href="https://github.com/YousefHYAyesh" className="hover:text-lake">
            Built by Yousef Ayesh
          </a>
        </div>
      </footer>
    </div>
  );
}
