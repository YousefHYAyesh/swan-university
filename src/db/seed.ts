import "dotenv/config";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { DEFAULT_SCALE, finalResult, type AssessmentType } from "../domain/grading";
import * as s from "./schema";

/*
 * Demo data for a fictional university. Everything here is made up.
 * Dates are generated relative to today, so the current term is always
 * in progress and course registration is open.
 */

export const DEMO_PASSWORD = "swan-demo";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: s });

// Small seeded PRNG so every run produces the same data.
let seed = 20251;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const normal = (mean: number, sd: number) => {
  const u = rand() || 1e-9;
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const longDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "long" });

const FIRST = {
  MALE: ["Emre", "Mert", "Can", "Burak", "Kerem", "Ahmet", "Omar", "Yusuf", "Deniz", "Arda", "Karim", "Daniel", "Eren", "Ali", "Hamza", "Leo"],
  FEMALE: ["Elif", "Zeynep", "Ayşe", "Selin", "Ece", "Nour", "Defne", "Melis", "Sara", "Lina", "İrem", "Hira", "Maya", "Buse", "Dilara", "Mina"],
};
const LAST = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Aydın", "Öztürk", "Arslan", "Doğan", "Koç", "Haddad", "Nasser", "Karaca", "Polat", "Erdem", "Aksoy", "Tekin", "Güneş", "Mansour", "Bulut"];

const slug = (str: string) =>
  str
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");

async function reset() {
  const tables = [
    "notifications", "audit_logs", "login_attempts", "contact_messages", "settings", "holds", "student_requests",
    "announcements", "attendance_records", "attendance_sessions", "scores", "enrollments",
    "assessments", "section_meetings", "sections", "course_prerequisites", "courses", "terms",
    "grade_scale", "program_requirements", "students", "staff", "programs", "departments", "faculties", "users",
  ];
  await db.execute(sql.raw(`TRUNCATE ${tables.join(", ")} RESTART IDENTITY CASCADE`));
}

async function main() {
  // In Docker the seed runs on every start; only fill an empty database there.
  if (process.env.SEED_IF_EMPTY === "true") {
    const existing = await db.execute(sql`select count(*)::int as n from users`);
    if ((existing.rows[0] as { n: number }).n > 0) {
      console.log("Database already has data; skipping seed.");
      return;
    }
  }
  await reset();
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // ---------- Settings & grade scale ----------
  await db.insert(s.settings).values([
    { key: "university_name", value: "Swan University" },
    { key: "slogan", value: "Where knowledge takes flight." },
    {
      key: "about",
      value:
        "Swan University is a fictional university used to demo this system. It runs two engineering programs, a mathematics and physics department, and a language school.",
    },
    { key: "max_credits_per_term", value: 22 },
    { key: "probation_below", value: 2.0 },
  ]);
  await db.insert(s.gradeScale).values(DEFAULT_SCALE.map((g, i) => ({ ...g, position: i })));

  // ---------- Organisation ----------
  const [eng, sci] = await db
    .insert(s.faculties)
    .values([
      { code: "ENG", name: "Faculty of Engineering" },
      { code: "ART", name: "Faculty of Arts and Sciences" },
    ])
    .returning();

  const depts = await db
    .insert(s.departments)
    .values([
      { facultyId: eng.id, code: "SEN", name: "Software Engineering" },
      { facultyId: eng.id, code: "CEN", name: "Computer Engineering" },
      { facultyId: sci.id, code: "MAT", name: "Mathematics" },
      { facultyId: sci.id, code: "PHY", name: "Physics" },
      { facultyId: sci.id, code: "ELL", name: "English Language and Literature" },
    ])
    .returning();
  const dept = Object.fromEntries(depts.map((d) => [d.code, d.id]));

  const progs = await db
    .insert(s.programs)
    .values([
      { departmentId: dept.SEN, code: "BSEN", name: "Software Engineering", degree: "BSc", requiredCredits: 140, electiveCredits: 15 },
      { departmentId: dept.CEN, code: "BCEN", name: "Computer Engineering", degree: "BSc", requiredCredits: 140, electiveCredits: 15 },
    ])
    .returning();

  // ---------- Staff ----------
  const [admin] = await db
    .insert(s.users)
    .values({ email: "admin@swan.edu", passwordHash: hash, role: "ADMIN", firstName: "Aylin", lastName: "Kurt" })
    .returning();
  await db.insert(s.staff).values({ userId: admin.id, employeeNo: "E1000", title: "System Administrator" });

  const registrarPeople = [
    ["registrar@swan.edu", "Selim", "Ateş", "Head of Registrar"],
    ["registrar2@swan.edu", "Gizem", "Uçar", "Registrar Officer"],
  ] as const;
  for (const [i, [email, first, last, title]] of registrarPeople.entries()) {
    const [u] = await db
      .insert(s.users)
      .values({ email, passwordHash: hash, role: "REGISTRAR", firstName: first, lastName: last })
      .returning();
    await db.insert(s.staff).values({ userId: u.id, employeeNo: `E20${i}`, title, office: "A-012" });
  }

  const professorPeople = [
    ["professor@swan.edu", "Hakan", "Ergin", "SEN", "Prof. Dr."],
    ["n.barlas@swan.edu", "Nil", "Barlas", "SEN", "Assoc. Prof. Dr."],
    ["k.amin@swan.edu", "Khaled", "Amin", "SEN", "Asst. Prof. Dr."],
    ["o.tuna@swan.edu", "Oya", "Tuna", "CEN", "Prof. Dr."],
    ["r.sezer@swan.edu", "Rıza", "Sezer", "MAT", "Assoc. Prof. Dr."],
    ["d.ilhan@swan.edu", "Derya", "İlhan", "MAT", "Asst. Prof. Dr."],
    ["t.okan@swan.edu", "Tarık", "Okan", "PHY", "Asst. Prof. Dr."],
    ["s.white@swan.edu", "Sarah", "White", "ELL", "Lecturer"],
  ] as const;
  const profByDept: Record<string, number[]> = {};
  for (const [i, [email, first, last, d, title]] of professorPeople.entries()) {
    const [u] = await db
      .insert(s.users)
      .values({ email, passwordHash: hash, role: "PROFESSOR", firstName: first, lastName: last })
      .returning();
    await db.insert(s.staff).values({
      userId: u.id,
      employeeNo: `E3${String(i).padStart(2, "0")}`,
      departmentId: dept[d],
      title,
      office: `${d}-${100 + i * 7}`,
    });
    (profByDept[d] ??= []).push(u.id);
  }
  const advisors = [...profByDept.SEN, ...profByDept.CEN];

  // ---------- Courses ----------
  type C = [code: string, title: string, credits: number, ects: number, level: number, dept: string, prereqs: string[]];
  const catalog: C[] = [
    ["SEN102", "Introduction to Software Engineering", 3, 5, 100, "SEN", []],
    ["SEN121", "Computer Programming I", 4, 6, 100, "SEN", []],
    ["ENG101", "Academic English I", 2, 3, 100, "ELL", []],
    ["ENG102", "Academic English II", 2, 3, 100, "ELL", ["ENG101"]],
    ["MAT221", "Linear Algebra", 3, 5, 200, "MAT", ["MAT101"]],
    ["SEN254", "Object-Oriented Design", 3, 5, 200, "SEN", ["SEN122"]],
    ["CEN201", "Digital Logic Design", 3, 5, 200, "CEN", []],
    ["SEN322", "Mobile Application Development", 3, 6, 300, "SEN", ["SEN254"]],
    ["SEN122", "Computer Programming II", 4, 6, 100, "SEN", ["SEN121"]],
    ["MAT101", "Calculus I", 4, 6, 100, "MAT", []],
    ["MAT102", "Calculus II", 4, 6, 100, "MAT", ["MAT101"]],
    ["PHY103", "Physics I", 3, 5, 100, "PHY", []],
    ["PHY104", "Physics II", 3, 5, 100, "PHY", ["PHY103"]],
    ["SEN206", "Data Structures", 4, 6, 200, "SEN", ["SEN122"]],
    ["SEN244", "Database Systems", 3, 6, 200, "SEN", ["SEN206"]],
    ["MAT251", "Numerical Methods", 3, 5, 200, "MAT", ["MAT102"]],
    ["MAT253", "Probability and Statistics", 3, 5, 200, "MAT", ["MAT101"]],
    ["CEN215", "Operating Systems", 3, 6, 200, "CEN", ["SEN206"]],
    ["SEN302", "Software Engineering Principles", 3, 5, 300, "SEN", ["SEN206"]],
    ["SEN312", "Web Application Development", 3, 6, 300, "SEN", ["SEN244"]],
    ["SEN356", "Machine Learning", 3, 6, 300, "SEN", ["MAT253", "SEN206"]],
    ["SEN386", "Analysis and Design of Algorithms", 3, 6, 300, "SEN", ["SEN206", "MAT251"]],
    ["IGS304", "Occupational Health and Safety", 2, 3, 300, "SEN", []],
    ["SEN401", "Capstone Project", 4, 8, 400, "SEN", ["SEN302"]],
    ["ELL419", "English Literature", 2, 3, 400, "ELL", []],
  ];
  const courseRows = await db
    .insert(s.courses)
    .values(
      catalog.map(([code, title, credits, ects, level, d]) => ({
        code,
        title,
        credits,
        ects,
        level,
        departmentId: dept[d],
        description: `${title} for ${level / 100}${["st", "nd", "rd", "th"][Math.min(level / 100 - 1, 3)]}-year students.`,
      })),
    )
    .returning();
  const course = Object.fromEntries(courseRows.map((c) => [c.code, c]));
  await db.insert(s.coursePrerequisites).values(
    catalog.flatMap(([code, , , , , , pre]) =>
      pre.map((p) => ({ courseId: course[code].id, prerequisiteId: course[p].id })),
    ),
  );

  // ---------- Curricula ----------
  const curriculum: Record<string, [number, string[]][]> = {
    BSEN: [
      [1, ["SEN102", "SEN121", "MAT101", "PHY103", "ENG101"]],
      [2, ["SEN122", "MAT102", "PHY104", "ENG102", "MAT221"]],
      [3, ["SEN206", "SEN254", "MAT253"]],
      [4, ["SEN244", "SEN302", "MAT251"]],
      [5, ["SEN312", "SEN386", "SEN322"]],
      [7, ["SEN401"]],
    ],
    BCEN: [
      [1, ["SEN121", "MAT101", "PHY103", "ENG101"]],
      [2, ["SEN122", "MAT102", "PHY104", "ENG102", "MAT221"]],
      [3, ["SEN206", "CEN201", "MAT253"]],
      [4, ["CEN215", "SEN244", "MAT251"]],
      [5, ["SEN386", "SEN356"]],
      [7, ["SEN401"]],
    ],
  };
  for (const prog of progs) {
    await db.insert(s.programRequirements).values(
      curriculum[prog.code].flatMap(([semester, codes]) => codes.map((code) => ({ programId: prog.id, courseId: course[code].id, semester }))),
    );
  }

  // ---------- Terms ----------
  // Current term started ~7 weeks ago; add/drop is still open for two more weeks.
  const curStart = addDays(today, -49);
  const isFall = curStart.getUTCMonth() >= 7;
  const curYear = isFall ? curStart.getUTCFullYear() : curStart.getUTCFullYear() - 1;
  // Five terms of history, oldest first, alternating fall and spring.
  const termDefs = Array.from({ length: 5 }, (_, i) => {
    const back = 4 - i;
    const fallNow = isFall ? back % 2 === 0 : back % 2 === 1;
    const startYear = curYear - Math.floor((back + (isFall ? 1 : 0)) / 2);
    return { startYear, season: fallNow ? ("FALL" as const) : ("SPRING" as const), offset: -back * 182 };
  });
  const termRows = await db
    .insert(s.terms)
    .values(
      termDefs.map((t) => {
        const start = addDays(curStart, t.offset);
        const current = t.offset === 0;
        return {
          startYear: t.startYear,
          season: t.season,
          startsOn: iso(start),
          endsOn: iso(addDays(start, 112)),
          registrationOpensOn: iso(addDays(start, -14)),
          registrationClosesOn: current ? iso(addDays(today, 14)) : iso(addDays(start, 14)),
          gradeDeadline: iso(addDays(start, 126)),
          isCurrent: current,
        };
      }),
    )
    .returning();
  const termCur = termRows[termRows.length - 1];

  // ---------- Students ----------
  const studentIds: { id: number; cohort: number }[] = [];
  const usedEmails = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const gender = rand() < 0.5 ? "MALE" : "FEMALE";
    const first = pick(FIRST[gender]);
    const last = pick(LAST);
    // Cohort 0 = first years in the current term, 1 = second years, 2 = third years
    const cohort = i < 20 ? 0 : i < 42 ? 1 : 2;
    const entryYear = curYear - cohort;
    let email = `${slug(first)}.${slug(last)}@student.swan.edu`;
    for (let n = 2; usedEmails.has(email); n++) email = `${slug(first)}.${slug(last)}${n}@student.swan.edu`;
    usedEmails.add(email);
    if (i === 25) email = "student@swan.edu"; // easy-to-remember demo account
    const [u] = await db
      .insert(s.users)
      .values({ email, passwordHash: hash, role: "STUDENT", firstName: first, lastName: last })
      .returning();
    await db.insert(s.students).values({
      userId: u.id,
      studentNo: `${entryYear}${String(1000 + i).slice(1)}`,
      programId: i % 4 === 3 ? progs[1].id : progs[0].id,
      advisorId: advisors[i % advisors.length],
      entryYear,
      gender,
      dateOfBirth: iso(new Date(Date.UTC(entryYear - 18 - Math.floor(rand() * 2), Math.floor(rand() * 12), 1 + Math.floor(rand() * 27)))),
      phone: `+90 5${Math.floor(between(30, 59))} 000 ${String(Math.floor(between(1000, 9999)))}`,
      address: pick(["Kadıköy, İstanbul", "Beşiktaş, İstanbul", "Florya, İstanbul", "Bakırköy, İstanbul", "Üsküdar, İstanbul"]),
      guardianName: `${pick([...FIRST.MALE, ...FIRST.FEMALE])} ${last}`,
      guardianPhone: `+90 5${Math.floor(between(30, 59))} 000 ${String(Math.floor(between(1000, 9999)))}`,
    });
    studentIds.push({ id: u.id, cohort });
  }

  // ---------- Sections, enrollments, scores ----------
  const assessmentPlans: [string, AssessmentType, number, number][][] = [
    [["Quiz 1", "QUIZ", 10, 20], ["Midterm", "MIDTERM", 30, 100], ["Project", "PROJECT", 20, 50], ["Final", "FINAL", 40, 100]],
    [["Homework", "HOMEWORK", 15, 100], ["Lab work", "LAB", 15, 100], ["Midterm", "MIDTERM", 30, 100], ["Final", "FINAL", 40, 100]],
    [["Midterm", "MIDTERM", 40, 100], ["Final", "FINAL", 60, 100]],
  ];
  const slots = [
    [1, "09:00", "10:50"], [1, "11:00", "12:50"], [1, "14:00", "15:50"],
    [2, "09:00", "10:50"], [2, "11:00", "12:50"], [2, "14:00", "15:50"],
    [3, "09:00", "10:50"], [3, "11:00", "12:50"], [3, "14:00", "15:50"],
    [4, "09:00", "10:50"], [4, "11:00", "12:50"], [4, "14:00", "15:50"],
    [5, "09:00", "10:50"], [5, "11:00", "12:50"], [5, "14:00", "15:50"],
    [1, "16:00", "17:50"], [2, "16:00", "17:50"], [3, "16:00", "17:50"], [4, "16:00", "17:50"],
  ] as const;

  // Curriculum by year/semester, and which of the five terms each cohort was in.
  const Y1F = ["SEN121", "MAT101", "PHY103", "ENG101", "SEN102"];
  const Y1S = ["SEN122", "MAT102", "PHY104", "ENG102", "MAT221"];
  const Y2F = ["SEN206", "MAT253", "SEN254", "CEN201", "IGS304"];
  const Y2S = ["SEN244", "MAT251", "CEN215", "SEN302", "ELL419"];
  const Y3F = ["SEN312", "SEN386", "SEN356", "SEN322"];
  const plan: Record<number, string[][]> = {
    0: [[], [], [], [], Y1F],
    1: [[], [], Y1F, Y1S, Y2F],
    2: [Y1F, Y1S, Y2F, Y2S, Y3F],
  };

  const scale = DEFAULT_SCALE;
  const ability = new Map(studentIds.map((st) => [st.id, clamp(normal(74, 11), 35, 98)]));
  // The demo account is a solid student so its pages show a typical record.
  ability.set(studentIds[25].id, 84);
  const prereqs = Object.fromEntries(catalog.map(([code, , , , , , pre]) => [code, pre]));
  const passed = new Map<number, Set<string>>(studentIds.map((st) => [st.id, new Set<string>()]));
  const failed = new Map<number, string[]>(studentIds.map((st) => [st.id, []]));
  const DUE_DAY: Record<AssessmentType, number> = { QUIZ: 24, HOMEWORK: 31, LAB: 66, MIDTERM: 45, PROJECT: 95, FINAL: 108 };

  for (const [termIndex, term] of termRows.entries()) {
    const isCurrent = term.isCurrent;

    // Each student's load follows the same rules as real registration:
    // up to two retakes, prerequisites passed, and the credit limit.
    const load = new Map<string, typeof studentIds>();
    for (const st of studentIds) {
      const done = passed.get(st.id)!;
      const retakes = failed.get(st.id)!.filter((c) => !done.has(c)).slice(0, 2);
      const fresh = plan[st.cohort][termIndex].filter((c) => !done.has(c) && prereqs[c].every((x) => done.has(x)));
      let credits = 0;
      for (const code of [...new Set([...retakes, ...fresh])]) {
        if (credits + course[code].credits > 22) continue;
        credits += course[code].credits;
        load.set(code, [...(load.get(code) ?? []), st]);
      }
    }

    let slotIndex = 0;
    for (const [ci, [code, takers]] of [...load.entries()].entries()) {
      const c = course[code];
      const teachers = profByDept[catalog.find((x) => x[0] === code)![5]] ?? profByDept.SEN;
      const groups = takers.length > 28 ? [takers.slice(0, Math.ceil(takers.length / 2)), takers.slice(Math.ceil(takers.length / 2))] : [takers];
      for (const [gi, group] of groups.entries()) {
        const instructor = code === "SEN356" || code === "SEN244" || code === "SEN121" ? profByDept.SEN[0] : teachers[(ci + gi) % teachers.length];
        const [sec] = await db
          .insert(s.sections)
          .values({
            courseId: c.id,
            termId: term.id,
            code: String(gi + 1).padStart(2, "0"),
            instructorId: instructor,
            capacity: Math.max(30, group.length + 6),
            room: `${pick(["A", "B", "C"])}-${Math.floor(between(101, 340))}`,
            gradeStatus: isCurrent ? "DRAFT" : "APPROVED",
            gradesSubmittedAt: isCurrent ? null : addDays(new Date(term.endsOn), 3),
            gradesReviewedAt: isCurrent ? null : addDays(new Date(term.endsOn), 6),
          })
          .returning();
        const slot = slots[slotIndex++ % slots.length];
        await db.insert(s.sectionMeetings).values([
          { sectionId: sec.id, dayOfWeek: slot[0], startsAt: slot[1], endsAt: slot[2] },
        ]);

        const planIdx = (ci + gi) % assessmentPlans.length;
        const asRows = await db
          .insert(s.assessments)
          .values(
            assessmentPlans[planIdx].map(([name, type, weight, maxScore], position) => ({
              sectionId: sec.id,
              name,
              type,
              weight,
              maxScore,
              position,
              dueOn: iso(addDays(new Date(term.startsOn), DUE_DAY[type])),
            })),
          )
          .returning();

        const courseDifficulty = normal(0, 5);
        for (const st of group) {
          const [en] = await db
            .insert(s.enrollments)
            .values({ studentId: st.id, sectionId: sec.id, registeredAt: new Date(term.registrationOpensOn) })
            .returning();
          const base = ability.get(st.id)! + courseDifficulty;
          const scoreMap = new Map<number, number | null>();
          const missedFinal = !isCurrent && rand() < 0.02;
          for (const a of asRows) {
            // In the current term, only work due before today has been graded.
            if (isCurrent && a.dueOn && a.dueOn > iso(today)) continue;
            if (a.type === "FINAL" && missedFinal) continue;
            const pct = clamp(normal(base, 9), 0, 100);
            const score = Math.round((pct / 100) * a.maxScore * 2) / 2;
            scoreMap.set(a.id, score);
          }
          if (scoreMap.size) {
            await db.insert(s.scores).values(
              [...scoreMap].map(([assessmentId, score]) => ({
                enrollmentId: en.id,
                assessmentId,
                score,
                updatedBy: instructor,
              })),
            );
          }
          if (!isCurrent) {
            const result = finalResult(asRows, scoreMap, scale);
            await db
              .update(s.enrollments)
              .set({ finalPercent: result.percent, letterGrade: result.letter })
              .where(sql`${s.enrollments.id} = ${en.id}`);
            if (scale.find((g) => g.letter === result.letter)!.isPassing) passed.get(st.id)!.add(code);
            else failed.get(st.id)!.push(code);
          }
        }
      }
    }
  }

  // Reviewer for past grades is the head registrar.
  await db.execute(sql`UPDATE sections SET grades_reviewed_by = (SELECT id FROM users WHERE email = 'registrar@swan.edu') WHERE grade_status = 'APPROVED'`);

  // One current section with complete scores already submitted, so the registrar has something to review.
  const toSubmit = await db.query.sections.findFirst({
    where: (t, { and, eq }) => and(eq(t.termId, termCur.id), eq(t.courseId, course.IGS304.id)),
    with: { assessments: true, enrollments: { with: { scores: true } } },
  });
  if (toSubmit) {
    for (const en of toSubmit.enrollments) {
      const have = new Set(en.scores.map((x) => x.assessmentId));
      const missing = toSubmit.assessments.filter((a) => !have.has(a.id));
      if (!missing.length) continue;
      await db.insert(s.scores).values(
        missing.map((a) => ({
          enrollmentId: en.id,
          assessmentId: a.id,
          score: Math.round((clamp(normal(ability.get(en.studentId)!, 9), 0, 100) / 100) * a.maxScore * 2) / 2,
          updatedBy: toSubmit.instructorId,
        })),
      );
    }
    await db.update(s.sections).set({ gradeStatus: "SUBMITTED", gradesSubmittedAt: new Date() }).where(sql`${s.sections.id} = ${toSubmit.id}`);
  }

  // ---------- Attendance (current term, weekly) ----------
  const curSections = await db.query.sections.findMany({
    where: (t, { eq }) => eq(t.termId, termCur.id),
    with: { enrollments: true, meetings: true },
  });
  for (const sec of curSections) {
    for (let week = 0; week < 7; week++) {
      const heldOn = iso(addDays(new Date(termCur.startsOn), week * 7 + (sec.meetings[0]?.dayOfWeek ?? 1) - 1));
      if (heldOn >= iso(today)) break;
      const [session] = await db
        .insert(s.attendanceSessions)
        .values({ sectionId: sec.id, heldOn, topic: `Week ${week + 1}` })
        .returning();
      await db.insert(s.attendanceRecords).values(
        sec.enrollments.map((en) => {
          const r = rand();
          const reliability = ability.get(en.studentId)! / 100;
          const status = r < 0.82 * reliability + 0.12 ? "PRESENT" : r < 0.9 ? "LATE" : r < 0.97 ? "ABSENT" : "EXCUSED";
          return { sessionId: session.id, enrollmentId: en.id, status } as const;
        }),
      );
    }
  }

  // ---------- Announcements, requests, holds, messages ----------
  const registrar = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "registrar@swan.edu") });
  const prof = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "professor@swan.edu") });
  const profSection = curSections.find((x) => x.instructorId === prof!.id);
  await db.insert(s.announcements).values([
    {
      authorId: registrar!.id,
      audience: "STUDENTS",
      title: "Add/drop period closes soon",
      body: `Course registration and add/drop close on ${longDate(termCur.registrationClosesOn)}. Check your schedule and talk to your advisor before the deadline.`,
      pinned: true,
    },
    {
      authorId: admin.id,
      audience: "ALL",
      title: "Library hours extended for midterms",
      body: "The main library stays open until midnight for the next three weeks.",
    },
    {
      authorId: registrar!.id,
      audience: "STAFF",
      title: "Grade submission deadline",
      body: `Final grades for this term are due by ${longDate(termCur.gradeDeadline)}. Sections still in draft after that date will be flagged.`,
    },
    ...(profSection
      ? [
          {
            authorId: prof!.id,
            audience: "SECTION" as const,
            sectionId: profSection.id,
            title: "Project teams",
            body: "Form teams of three and send me your team list by Friday. Topics are on the course page.",
          },
        ]
      : []),
  ]);

  const demoStudent = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, "student@swan.edu") });
  await db.insert(s.studentRequests).values([
    { studentId: demoStudent!.id, type: "ENROLLMENT_CERTIFICATE", note: "Needed for my residence permit application." },
    { studentId: studentIds[3].id, type: "TRANSCRIPT", note: "Official transcript for an internship application." },
    { studentId: studentIds[47].id, type: "GRADE_APPEAL", note: "I think my midterm in SEN244 was graded out of the wrong total." },
    {
      studentId: studentIds[12].id,
      type: "ENROLLMENT_CERTIFICATE",
      status: "COMPLETED",
      handledBy: registrar!.id,
      response: "Certificate issued; you can collect it from the registrar office.",
    },
  ]);
  await db.insert(s.holds).values({
    studentId: studentIds[30].id,
    type: "REGISTRATION",
    reason: "Outstanding library fine",
    placedBy: registrar!.id,
  });

  await db.insert(s.contactMessages).values([
    { name: "Mehmet Kara", email: "mehmet.kara@example.com", body: "Do you offer campus tours for prospective students? I'd like to visit with my daughter." },
    { name: "Laura Becker", email: "laura.b@example.com", body: "I'm an exchange student from Germany. Which English-taught courses are available in the spring term?" },
    { name: "Ömer Faruk", email: "omer.f@example.com", body: "What are the dormitory options and prices for first-year students?", readAt: new Date() },
  ]);

  const count = await db.execute(sql`SELECT
    (SELECT count(*) FROM students) AS students,
    (SELECT count(*) FROM sections) AS sections,
    (SELECT count(*) FROM enrollments) AS enrollments,
    (SELECT count(*) FROM scores) AS scores`);
  console.log("Seeded:", count.rows[0]);
  console.log(`Demo password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
